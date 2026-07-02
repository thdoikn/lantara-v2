"""
Antrean service-layer tests — the riskiest logic:
  quota 60/40 (no cross-fill), hybrid ordering + demotion, 1:N priority
  interleave, re-triage (same vs different instansi), working-hours gate, ticket
  delivery (PDF/QR/email), and that the queue is standalone (no izin coupling).

Run with:  pytest apps/antrean/test_services.py -v
"""

from datetime import date, time, timedelta

import pytest
from django.utils import timezone

from apps.antrean.models import Instansi, Layanan, Loket, QueueParameter, Ticket
from apps.antrean.services import lifecycle, ordering, quota, triage
from apps.antrean.services.errors import DuplicateActiveTicketError, QuotaExhaustedError

# ── Fixtures ──────────────────────────────────────────────────────────────────


@pytest.fixture
def instansi(db):
    return Instansi.objects.create(key="perizinan", name="Perizinan OIKN")


@pytest.fixture
def other_instansi(db):
    return Instansi.objects.create(key="dukcapil", name="Dukcapil")


@pytest.fixture
def layanan(instansi):
    return Layanan.objects.create(
        instansi=instansi, key="ambil-izin", name="Ambil Izin", daily_quota=10, avg_minutes=8
    )


@pytest.fixture
def wide_hours(db):
    """Open the operating window all day so take_ticket isn't gated by clock."""
    for key, value, vt in [
        ("operating_open", "00:00", "time"),
        ("operating_close", "23:59", "time"),
        ("cutoff_min", "0", "int"),
    ]:
        QueueParameter.objects.create(layanan=None, key=key, value=value, value_type=vt)


def _ticket(layanan, *, seq, channel="online", status="in_pool", taken_at=None, **kw):
    now = timezone.now()
    return Ticket.objects.create(
        layanan=layanan,
        service_date=timezone.localtime(now).date(),
        channel=channel,
        number=f"X-{seq:03d}",
        seq=seq,
        status=status,
        taken_at=taken_at or now,
        **kw,
    )


# ── Quota: rigid 60/40, no cross-fill ─────────────────────────────────────────


def test_quota_60_40_split(layanan):
    online_cap, walkin_cap = quota.channel_caps(layanan)
    assert (online_cap, walkin_cap) == (6, 4)  # floor(10*0.6)=6, 10-6=4


def test_online_exhaustion_does_not_steal_walkin(layanan):
    today = timezone.localtime().date()
    for i in range(6):  # fill the online cap
        _ticket(layanan, seq=i + 1, channel="online")

    with pytest.raises(QuotaExhaustedError):
        quota.assert_quota_available(layanan, today, "online")

    # Walk-in share is untouched and still available.
    quota.assert_quota_available(layanan, today, "walkin")


def test_unlimited_when_no_daily_quota(instansi):
    lyn = Layanan.objects.create(instansi=instansi, key="free", name="Free", daily_quota=None)
    quota.assert_quota_available(lyn, timezone.localtime().date(), "online")  # no raise


# ── Hybrid ordering + demotion ────────────────────────────────────────────────


def test_demoted_ticket_loses_its_slot(layanan, instansi):
    loket = Loket.objects.create(instansi=instansi, code="L1", is_open=True)
    loket.layanan.add(layanan)
    now = timezone.now()

    # A taken earlier but demoted (checked in late) → effective = late checkin.
    a = _ticket(layanan, seq=1, taken_at=now - timedelta(minutes=30))
    a.is_demoted = True
    a.checkin_at = now  # later than B's taken_at
    a.save()
    # B taken later, on time → effective = taken_at (earlier than A's checkin).
    _ticket(layanan, seq=2, taken_at=now - timedelta(minutes=10))

    nxt = ordering.pick_next(loket, timezone.localtime().date())
    assert nxt.seq == 2  # B jumps ahead of the demoted A


# ── Priority 1:N interleave ───────────────────────────────────────────────────


def test_priority_waits_until_ratio_then_jumps(instansi):
    lyn = Layanan.objects.create(
        instansi=instansi, key="kk", name="KK", daily_quota=None, priority_ratio_n=3
    )
    loket = Loket.objects.create(instansi=instansi, code="L2", is_open=True)
    loket.layanan.add(lyn)
    now = timezone.now()

    _ticket(lyn, seq=1, taken_at=now - timedelta(minutes=9))  # regular
    _ticket(lyn, seq=2, is_priority=True, taken_at=now - timedelta(minutes=8))

    today = timezone.localtime().date()
    # No history yet → regular goes first (priority not starved-in too early).
    assert ordering.pick_next(loket, today).seq == 1

    # Simulate 3 regulars already called → next pick is the priority head.
    for s in range(10, 13):
        _ticket(lyn, seq=s, status="served", taken_at=now, called_at=now, is_priority=False)
    assert ordering.pick_next(loket, today).is_priority is True


# ── Re-triage: Opsi A ─────────────────────────────────────────────────────────


def test_retriage_same_instansi_keeps_take_time(layanan, instansi):
    target = Layanan.objects.create(instansi=instansi, key="lain", name="Lain", daily_quota=None)
    t = _ticket(layanan, seq=1, status="reserved", taken_at=timezone.now() - timedelta(hours=1))
    original = t.taken_at
    triage.retriage(t, target)
    t.refresh_from_db()
    assert t.layanan_id == target.id
    assert t.taken_at == original  # slot preserved


def test_retriage_other_instansi_recomputes(layanan, other_instansi):
    target = Layanan.objects.create(
        instansi=other_instansi, key="ktp", name="KTP", daily_quota=None
    )
    t = _ticket(layanan, seq=1, status="reserved", taken_at=timezone.now() - timedelta(hours=1))
    old = t.taken_at
    triage.retriage(t, target)
    t.refresh_from_db()
    assert t.layanan_id == target.id
    assert t.taken_at > old  # treated as a fresh check-in


# ── Working hours ─────────────────────────────────────────────────────────────


def test_tenant_break_blocks_take_and_call(instansi, layanan):
    from apps.antrean.services.working_hours import calling_open, in_break, take_number_open

    # Break covering the whole day → issuing and calling are both paused now.
    instansi.operating_open = time(0, 0)
    instansi.operating_close = time(23, 59)
    instansi.break_start = time(0, 0)
    instansi.break_end = time(23, 59)
    instansi.save()
    now = timezone.now()
    assert in_break(now, layanan) is True
    assert take_number_open(now, layanan) is False
    assert calling_open(now, layanan) is False


def test_is_operating_day_skips_weekend_and_holiday(db):
    from apps.antrean.services.working_hours import is_operating_day
    from apps.reference.models import Holiday

    assert is_operating_day(date(2026, 6, 27)) is False  # Saturday
    Holiday.objects.create(date=date(2026, 6, 29), name="Hari Demo")
    assert is_operating_day(date(2026, 6, 29)) is False  # Monday but holiday


# ── One-active-per-day + take/lifecycle ───────────────────────────────────────


def test_one_active_ticket_per_service_per_day(layanan, wide_hours, django_user_model):
    user = django_user_model.objects.create_user(email="w@x.id", password="p", full_name="W")
    lifecycle.take_ticket(layanan, "online", applicant=user)
    with pytest.raises(DuplicateActiveTicketError):
        lifecycle.take_ticket(layanan, "online", applicant=user)


# ── Ticket delivery (PDF + QR + email routing) ────────────────────────────────


def test_ticket_pdf_and_qr_render(layanan):
    from apps.antrean.pdf import qr_data_url, render_ticket_pdf

    t = _ticket(layanan, seq=1, status="reserved")
    assert qr_data_url(t).startswith("data:image/png;base64,")
    assert render_ticket_pdf(t)[:4] == b"%PDF"


def test_delivery_email_prefers_applicant_then_holder(layanan, django_user_model):
    user = django_user_model.objects.create_user(email="me@demo.id", password="p", full_name="Me")
    online = _ticket(layanan, seq=1, applicant=user)
    assert online.delivery_email == "me@demo.id"

    walkin = _ticket(layanan, seq=2, channel="walkin", holder_email="tamu@demo.id")
    assert walkin.delivery_email == "tamu@demo.id"


# ── Walk-in (anonymous kiosk) + kiosk check-in ────────────────────────────────


def test_serializers_have_valid_fields(layanan):
    """Guard against fields referencing removed model attributes (e.g. the old
    permit_type/submission seam)."""
    from apps.antrean.serializers import InstansiSerializer, LayananSerializer

    assert LayananSerializer(layanan).data["key"] == "ambil-izin"
    # Serializing the tenant nests the layanan serializer — exercises both.
    assert "owner_type" in InstansiSerializer(layanan.instansi).data


def test_anonymous_walkin_take(layanan, wide_hours):
    t = lifecycle.take_ticket(layanan, "walkin", holder_name="Tamu", holder_email="t@d.id")
    assert t.applicant_id is None  # anonymous
    assert t.holder_email == "t@d.id"
    assert t.status == "in_pool"  # walk-in auto-checked-in


def test_skipped_ticket_expires(layanan, wide_hours, django_user_model):
    """An un-checked-in online ticket that gets passed by >= max_skip later
    numbers is voided by the sweep."""
    from apps.antrean.services.ordering import skipped_count
    from apps.antrean.tasks import sweep_checkin_expiry

    user = django_user_model.objects.create_user(email="s@d.id", password="p", full_name="S")
    reserved = lifecycle.take_ticket(layanan, "online", applicant=user)  # seq 1, reserved
    assert reserved.status == "reserved"

    now = timezone.now()
    for s in range(2, 7):  # 5 later numbers already called
        _ticket(layanan, seq=s, status="served", called_at=now)

    assert skipped_count(reserved) == 5  # default max_skip_before_expire
    sweep_checkin_expiry()
    reserved.refresh_from_db()
    assert reserved.status == "expired"


def test_kiosk_scan_checks_in_online_ticket(layanan, wide_hours, django_user_model):
    from apps.antrean.services.checkin import check_in

    user = django_user_model.objects.create_user(email="c@d.id", password="p", full_name="C")
    t = lifecycle.take_ticket(layanan, "online", applicant=user)
    assert t.status == "reserved"
    t = check_in(t)  # same service the kiosk station calls after scanning the QR
    assert t.status == "in_pool"


def test_full_service_flow_has_no_submission_side_effect(
    layanan, wide_hours, instansi, django_user_model
):
    """The queue is standalone: serving a ticket touches no izin submission."""
    user = django_user_model.objects.create_user(email="a@b.id", password="p", full_name="A")
    loket = Loket.objects.create(instansi=instansi, code="L9", is_open=True)
    loket.layanan.add(layanan)

    ticket = lifecycle.take_ticket(layanan, "walkin", applicant=user)
    lifecycle.call_next(loket, user)
    ticket.refresh_from_db()
    lifecycle.start_serving(ticket, user)
    lifecycle.complete(ticket, user)

    ticket.refresh_from_db()
    assert ticket.status == "served"
    # No FK to submissions exists anymore.
    assert not hasattr(ticket, "submission")
