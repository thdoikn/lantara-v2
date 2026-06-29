"""
Antrean service-layer tests — the riskiest logic:
  quota 60/40 (no cross-fill), hybrid ordering + demotion, 1:N priority
  interleave, re-triage (same vs different instansi), working-hours gate, and the
  collection-stage seam (complete → submission collected).

Run with:  pytest apps/antrean/test_services.py -v
"""

from datetime import date, timedelta

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


def test_is_operating_day_skips_weekend_and_holiday(db):
    from apps.antrean.services.working_hours import is_operating_day
    from apps.reference.models import Holiday

    assert is_operating_day(date(2026, 6, 27)) is False  # Saturday
    Holiday.objects.create(date=date(2026, 6, 29), name="Hari Demo")
    assert is_operating_day(date(2026, 6, 29)) is False  # Monday but holiday


# ── One-active-per-day + take/lifecycle + seam ────────────────────────────────


def test_one_active_ticket_per_service_per_day(layanan, wide_hours, django_user_model):
    user = django_user_model.objects.create_user(email="w@x.id", password="p", full_name="W")
    lifecycle.take_ticket(layanan, "online", applicant=user)
    with pytest.raises(DuplicateActiveTicketError):
        lifecycle.take_ticket(layanan, "online", applicant=user)


def test_complete_marks_linked_submission_collected(
    layanan, wide_hours, instansi, django_user_model
):
    from apps.engine.models import PermitType, Sektor, WorkflowStage
    from apps.submissions.models import Submission

    sektor = Sektor.objects.create(key="kesehatan", name="Kesehatan")
    pt = PermitType.objects.create(sektor=sektor, key="izin-x", name="Izin X", sla_days=5)
    WorkflowStage.objects.create(
        permit_type=pt, key="penyerahan", name="Penyerahan", order=1, stage_type="collection"
    )
    user = django_user_model.objects.create_user(email="a@b.id", password="p", full_name="A")
    sub = Submission.objects.create(
        applicant=user, permit_type=pt, status=Submission.Status.COLLECTION
    )

    loket = Loket.objects.create(instansi=instansi, code="L9", is_open=True)
    loket.layanan.add(layanan)
    ticket = lifecycle.take_ticket(layanan, "walkin", applicant=user, submission=sub)
    lifecycle.call_next(loket, user)
    ticket.refresh_from_db()
    lifecycle.start_serving(ticket, user)
    lifecycle.complete(ticket, user)

    sub.refresh_from_db()
    assert sub.status == Submission.Status.COLLECTED
