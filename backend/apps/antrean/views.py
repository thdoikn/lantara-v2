"""
Antrean MPP API.

  Citizen  : take a number, check in, watch position, cancel.
  Operator : open/close loket, call-next, recall, serve, complete, no-show, re-triage.
  Supervisor: parameters, loket management, staff assignment, live monitor.
  Kiosk    : anonymous walk-in take + QR check-in station (on-site).
  Public   : display board (now-serving + next-up).
"""

from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from apps.common.permissions import IsAdminOrSuperAdmin

from .models import (
    CounterStaffAssignment,
    Instansi,
    Layanan,
    Loket,
    QueueParameter,
    Ticket,
)
from .permissions import (
    IsLoketOperator,
    IsTenantAdmin,
    tenant_admin_instansi_ids,
    user_can_administer_instansi,
    user_can_operate_loket,
    user_scoped_instansi_ids,
)
from .serializers import (
    CheckinScanSerializer,
    CounterStaffAssignmentSerializer,
    InstansiSerializer,
    LayananSerializer,
    LoketSerializer,
    QueueParameterSerializer,
    RetriageSerializer,
    TakeTicketSerializer,
    TicketDetailSerializer,
    TicketSerializer,
    WalkinTakeSerializer,
)
from .services import lifecycle, triage
from .services.checkin import check_in
from .services.errors import AntreanError


def _err(exc: AntreanError) -> Response:
    return Response({"detail": exc.message, "errors": {}}, status=exc.status_code)


class InstansiViewSet(viewsets.ReadOnlyModelViewSet):
    """Public catalog of MPP agencies + their services (for the kiosk/citizen)."""

    permission_classes = [AllowAny]
    serializer_class = InstansiSerializer
    lookup_field = "key"

    def get_queryset(self):
        return (
            Instansi.objects.filter(is_active=True)
            .prefetch_related("layanan")
            .order_by("order", "name")
        )

    def get_serializer_context(self):
        """Attach today's per-service waiting counts in a single grouped query so
        the nested LayananSerializer avoids N+1 when reporting queue length."""
        from django.db.models import Count

        ctx = super().get_serializer_context()
        today = timezone.localtime().date()
        rows = (
            Ticket.objects.filter(
                service_date=today,
                status__in=[Ticket.Status.RESERVED, Ticket.Status.IN_POOL],
            )
            .values("layanan_id")
            .annotate(n=Count("id"))
        )
        ctx["waiting_map"] = {r["layanan_id"]: r["n"] for r in rows}
        return ctx

    @action(detail=True, methods=["get"])
    def layanan(self, request, key=None):
        qs = Layanan.objects.filter(instansi__key=key, is_active=True)
        return Response(
            LayananSerializer(qs, many=True, context=self.get_serializer_context()).data
        )


class TicketViewSet(viewsets.GenericViewSet):
    """Citizen ticket lifecycle + operator actions on a ticket."""

    serializer_class = TicketSerializer

    _OPERATOR_ACTIONS = {"recall", "serve", "complete", "no_show", "retriage"}

    def get_permissions(self):
        if self.action in self._OPERATOR_ACTIONS:
            return [IsLoketOperator()]
        return [IsAuthenticated()]

    def get_queryset(self):
        return Ticket.objects.select_related("layanan__instansi", "loket")

    # ── Citizen (online-virtual) ─────────────────────────────────────────────
    def create(self, request):
        """Take an online-virtual number for a physical MPP visit (logged in)."""
        ser = TakeTicketSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data

        try:
            ticket = lifecycle.take_ticket(
                data["layanan"],
                Ticket.Channel.ONLINE,
                applicant=request.user,
                is_priority=data["is_priority"],
            )
        except AntreanError as exc:
            return _err(exc)

        # Render + email the ticket asynchronously; the QR is available live.
        from .tasks import generate_ticket_pdf

        generate_ticket_pdf.delay(str(ticket.id))
        return Response(self._detail(ticket, request), status=status.HTTP_201_CREATED)

    def _detail(self, ticket, request):
        return TicketDetailSerializer(ticket, context={"request": request}).data

    def retrieve(self, request, pk=None):
        return Response(self._detail(self.get_object(), request))

    def list(self, request):
        """The requester's active/today tickets."""
        today = timezone.localtime().date()
        qs = self.get_queryset().filter(applicant=request.user, service_date=today)
        return Response(TicketSerializer(qs, many=True).data)

    @action(detail=True, methods=["post"], url_path="check-in")
    def check_in(self, request, pk=None):
        ticket = self.get_object()
        if ticket.applicant_id != request.user.id:
            return Response({"detail": "Bukan nomor Anda."}, status=403)
        try:
            ticket = check_in(ticket, actor=request.user)
        except AntreanError as exc:
            return _err(exc)
        return Response(self._detail(ticket, request))

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        ticket = self.get_object()
        if ticket.applicant_id != request.user.id:
            return Response({"detail": "Bukan nomor Anda."}, status=403)
        try:
            ticket = lifecycle.cancel(ticket, actor=request.user)
        except AntreanError as exc:
            return _err(exc)
        return Response(self._detail(ticket, request))

    @action(detail=True, methods=["get"])
    def pdf(self, request, pk=None):
        """Download the ticket PDF — rendered on demand if not yet stored."""
        from django.http import HttpResponse

        from .pdf import render_ticket_pdf

        ticket = self.get_object()
        if ticket.applicant_id and ticket.applicant_id != request.user.id:
            return Response({"detail": "Bukan nomor Anda."}, status=403)
        pdf_bytes = render_ticket_pdf(ticket)
        resp = HttpResponse(pdf_bytes, content_type="application/pdf")
        resp["Content-Disposition"] = f'attachment; filename="tiket-{ticket.number}.pdf"'
        return resp

    @action(detail=True, methods=["post"])
    def email(self, request, pk=None):
        """Send / resend the ticket to its delivery email."""
        ticket = self.get_object()
        if ticket.applicant_id and ticket.applicant_id != request.user.id:
            return Response({"detail": "Bukan nomor Anda."}, status=403)
        from .tasks import generate_ticket_pdf

        generate_ticket_pdf.delay(str(ticket.id), send_email=True)
        target = ticket.delivery_email or "-"
        return Response({"detail": f"Tiket dikirim ke {target}."})

    # ── Operator ────────────────────────────────────────────────────────────
    @action(detail=True, methods=["post"])
    def recall(self, request, pk=None):
        return self._operator_op(request, lifecycle.recall)

    @action(detail=True, methods=["post"])
    def serve(self, request, pk=None):
        return self._operator_op(request, lifecycle.start_serving)

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        return self._operator_op(request, lifecycle.complete)

    @action(detail=True, methods=["post"], url_path="no-show")
    def no_show(self, request, pk=None):
        return self._operator_op(request, lifecycle.no_show)

    @action(detail=True, methods=["post"])
    def retriage(self, request, pk=None):
        ticket = self.get_object()
        ser = RetriageSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            ticket = triage.retriage(ticket, ser.validated_data["layanan"], actor=request.user)
        except AntreanError as exc:
            return _err(exc)
        return Response(TicketSerializer(ticket).data)

    def _operator_op(self, request, fn):
        ticket = self.get_object()
        if ticket.loket_id and not user_can_operate_loket(request.user, ticket.loket):
            return Response({"detail": "Tidak memiliki akses ke loket ini."}, status=403)
        try:
            ticket = fn(ticket, request.user)
        except AntreanError as exc:
            return _err(exc)
        return Response(TicketSerializer(ticket).data)


class LoketViewSet(viewsets.ModelViewSet):
    """Counters. Operators see the loket they may work; supervisors manage them."""

    serializer_class = LoketSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve", "call_next", "open", "close", "queue"):
            return [IsLoketOperator()]
        return [IsTenantAdmin()]

    def get_queryset(self):
        qs = Loket.objects.select_related("instansi", "current_operator")
        scoped = user_scoped_instansi_ids(self.request.user)
        if scoped is not None:
            qs = qs.filter(instansi_id__in=scoped)
        return qs

    def _assert_can_admin(self, instansi):
        from rest_framework.exceptions import PermissionDenied

        if not user_can_administer_instansi(self.request.user, instansi):
            raise PermissionDenied("Bukan tenant yang Anda kelola.")

    def perform_create(self, serializer):
        self._assert_can_admin(serializer.validated_data["instansi"])
        serializer.save()

    def perform_update(self, serializer):
        inst = serializer.validated_data.get("instansi", serializer.instance.instansi)
        self._assert_can_admin(inst)
        serializer.save()

    @action(detail=True, methods=["post"])
    def open(self, request, pk=None):
        loket = self.get_object()
        if not user_can_operate_loket(request.user, loket):
            return Response({"detail": "Tidak memiliki akses ke loket ini."}, status=403)
        loket.is_open = True
        loket.opened_at = timezone.now()
        loket.current_operator = request.user
        loket.save(update_fields=["is_open", "opened_at", "current_operator", "updated_at"])
        return Response(LoketSerializer(loket).data)

    @action(detail=True, methods=["post"])
    def close(self, request, pk=None):
        loket = self.get_object()
        loket.is_open = False
        loket.current_operator = None
        loket.save(update_fields=["is_open", "current_operator", "updated_at"])
        return Response(LoketSerializer(loket).data)

    @action(detail=True, methods=["get"])
    def queue(self, request, pk=None):
        """The waiting pool for this loket — next-up preview + count."""
        from .services.ordering import pool_for_loket

        loket = self.get_object()
        pool = sorted(pool_for_loket(loket, timezone.localtime().date()), key=lambda t: t.seq)
        pool.sort(key=lambda t: t.effective_time)
        return Response(
            {
                "waiting": len(pool),
                "next_up": TicketSerializer(pool[:8], many=True).data,
            }
        )

    @action(detail=True, methods=["post"], url_path="call-next")
    def call_next(self, request, pk=None):
        loket = self.get_object()
        if not user_can_operate_loket(request.user, loket):
            return Response({"detail": "Tidak memiliki akses ke loket ini."}, status=403)
        try:
            ticket = lifecycle.call_next(loket, request.user)
        except AntreanError as exc:
            return _err(exc)
        if ticket is None:
            return Response({"detail": "Tidak ada nomor dalam kolam panggil."}, status=204)
        return Response(TicketSerializer(ticket).data)


class AdminInstansiViewSet(viewsets.ModelViewSet):
    """Tenant management. OIKN admins create/delete tenants (Phase 7); tenant
    admins edit their own tenant's settings (hours, break, branding)."""

    serializer_class = InstansiSerializer

    def get_permissions(self):
        # Only a global OIKN admin may register or remove a tenant.
        if self.action in ("create", "destroy"):
            return [IsAdminOrSuperAdmin()]
        return [IsTenantAdmin()]

    def get_queryset(self):
        qs = Instansi.objects.select_related("direktorat").prefetch_related("layanan")
        scoped = tenant_admin_instansi_ids(self.request.user)
        if scoped is not None:
            qs = qs.filter(id__in=scoped)
        return qs


class LayananViewSet(viewsets.ModelViewSet):
    """Service CRUD incl. max-queue (daily_quota) — tenant admin, own tenant only."""

    permission_classes = [IsTenantAdmin]
    serializer_class = LayananSerializer

    def get_queryset(self):
        qs = Layanan.objects.select_related("instansi")
        scoped = tenant_admin_instansi_ids(self.request.user)
        if scoped is not None:
            qs = qs.filter(instansi_id__in=scoped)
        return qs

    def _assert_can_admin(self, instansi):
        from rest_framework.exceptions import PermissionDenied

        if not user_can_administer_instansi(self.request.user, instansi):
            raise PermissionDenied("Bukan tenant yang Anda kelola.")

    def perform_create(self, serializer):
        self._assert_can_admin(serializer.validated_data["instansi"])
        serializer.save()

    def perform_update(self, serializer):
        inst = serializer.validated_data.get("instansi", serializer.instance.instansi)
        self._assert_can_admin(inst)
        serializer.save()


class QueueParameterViewSet(viewsets.ModelViewSet):
    """Tabel-8 knob CRUD (tenant admin)."""

    permission_classes = [IsTenantAdmin]
    serializer_class = QueueParameterSerializer
    queryset = QueueParameter.objects.select_related("layanan")


class CounterStaffAssignmentViewSet(viewsets.ModelViewSet):
    """Staff scoping. A tenant admin assigns loket operators within their tenant;
    only a global admin may grant the tenant_admin scope."""

    permission_classes = [IsTenantAdmin]
    serializer_class = CounterStaffAssignmentSerializer

    def get_queryset(self):
        qs = CounterStaffAssignment.objects.select_related("user", "instansi", "loket")
        scoped = tenant_admin_instansi_ids(self.request.user)
        if scoped is not None:
            qs = qs.filter(instansi_id__in=scoped)
        return qs

    def perform_create(self, serializer):
        from rest_framework.exceptions import PermissionDenied

        data = serializer.validated_data
        instansi = data["instansi"]
        scope = data.get("role_scope", CounterStaffAssignment.Scope.LOKET_OPERATOR)
        user = self.request.user
        is_global = user.has_any_role("superadmin", "admin")
        if scope == CounterStaffAssignment.Scope.TENANT_ADMIN and not is_global:
            raise PermissionDenied("Penetapan Admin Tenant hanya oleh admin OIKN.")
        if not is_global and not user_can_administer_instansi(user, instansi):
            raise PermissionDenied("Bukan tenant yang Anda kelola.")
        serializer.save(assigned_by=user)


class AntreanAnalyticsView(APIView):
    """Queue analytics — KPIs, channel mix, by-hour histogram, per-loket
    throughput, and a daily trend, scoped by role and an optional date range.
    ?from=YYYY-MM-DD&to=YYYY-MM-DD&instansi=<id>&loket=<id>&format=csv"""

    permission_classes = [IsLoketOperator]

    def get(self, request):
        import csv
        from datetime import date, timedelta

        from django.db.models import Avg, Count, F, Q
        from django.db.models.functions import ExtractHour, TruncDate
        from django.http import HttpResponse

        today = timezone.localtime().date()
        try:
            d_from = (
                date.fromisoformat(request.query_params["from"])
                if request.query_params.get("from")
                else today - timedelta(days=29)
            )
            d_to = (
                date.fromisoformat(request.query_params["to"])
                if request.query_params.get("to")
                else today
            )
        except ValueError:
            return Response({"detail": "Format tanggal tidak valid."}, status=400)

        qs = Ticket.objects.filter(service_date__gte=d_from, service_date__lte=d_to)

        # Role scoping: global admin → all; tenant admin → their tenants; else the
        # operator's tenants. Optional instansi/loket params narrow further.
        scoped = user_scoped_instansi_ids(request.user)
        if scoped is not None:
            qs = qs.filter(layanan__instansi_id__in=scoped)
        if request.query_params.get("instansi"):
            qs = qs.filter(layanan__instansi_id=request.query_params["instansi"])
        if request.query_params.get("loket"):
            qs = qs.filter(loket_id=request.query_params["loket"])

        def _minutes(delta):
            return round(delta.total_seconds() / 60, 1) if delta else None

        by_status = {r["status"]: r["n"] for r in qs.values("status").annotate(n=Count("id"))}
        issued = sum(by_status.values())
        served = by_status.get("served", 0)
        no_show = by_status.get("no_show", 0) + by_status.get("expired", 0)
        durations = qs.filter(status="served").aggregate(
            wait=Avg(F("called_at") - F("checkin_at")),
            service=Avg(F("served_at") - F("serving_at")),
        )
        channel = {r["channel"]: r["n"] for r in qs.values("channel").annotate(n=Count("id"))}

        by_hour = [{"hour": h, "issued": 0} for h in range(24)]
        for row in qs.annotate(h=ExtractHour("taken_at")).values("h").annotate(n=Count("id")):
            if row["h"] is not None:
                by_hour[row["h"]]["issued"] = row["n"]

        by_loket = list(
            qs.filter(loket__isnull=False)
            .values("loket__code")
            .annotate(
                served=Count("id", filter=Q(status="served")),
                avg_service=Avg(F("served_at") - F("serving_at"), filter=Q(status="served")),
            )
            .order_by("-served")
        )
        for r in by_loket:
            r["loket"] = r.pop("loket__code")
            r["avg_service"] = _minutes(r["avg_service"])

        trend = list(
            qs.annotate(d=TruncDate("service_date"))
            .values("d")
            .annotate(
                issued=Count("id"),
                served=Count("id", filter=Q(status="served")),
                no_show=Count("id", filter=Q(status__in=["no_show", "expired"])),
            )
            .order_by("d")
        )
        trend = [
            {
                "date": str(r["d"]),
                "issued": r["issued"],
                "served": r["served"],
                "no_show": r["no_show"],
            }
            for r in trend
        ]

        if request.query_params.get("export") == "csv":
            resp = HttpResponse(content_type="text/csv")
            resp["Content-Disposition"] = f'attachment; filename="antrean-{d_from}-{d_to}.csv"'
            w = csv.writer(resp)
            w.writerow(["Tanggal", "Diterbitkan", "Dilayani", "Tidak Hadir"])
            for r in trend:
                w.writerow([r["date"], r["issued"], r["served"], r["no_show"]])
            return resp

        return Response(
            {
                "range": {"from": str(d_from), "to": str(d_to)},
                "kpi": {
                    "issued": issued,
                    "served": served,
                    "no_show": no_show,
                    "no_show_rate": round(no_show / issued * 100, 1) if issued else 0,
                    "cancelled": by_status.get("cancelled", 0),
                    "avg_wait_min": _minutes(durations["wait"]),
                    "avg_service_min": _minutes(durations["service"]),
                    "demoted": qs.filter(is_demoted=True).count(),
                },
                "channel": {"online": channel.get("online", 0), "walkin": channel.get("walkin", 0)},
                "by_status": by_status,
                "by_hour": by_hour,
                "by_loket": by_loket,
                "trend": trend,
            }
        )


class StaffUserSearchView(APIView):
    """Candidate MPP staff for the assignment pickers — users who already hold a
    given role. ?role=loket_operator (tenant admin's operator picker, default) or
    ?role=tenant_admin (OIKN admin's tenant-admin picker). The OIKN admin grants
    the role; the assignment then scopes them to a tenant/loket."""

    permission_classes = [IsTenantAdmin]

    def get(self, request):
        from django.contrib.auth import get_user_model

        from .serializers import StaffUserSerializer

        role = request.query_params.get("role", "loket_operator")
        if role not in ("loket_operator", "tenant_admin"):
            role = "loket_operator"
        q = request.query_params.get("q", "").strip()
        user_model = get_user_model()
        qs = user_model.objects.filter(
            is_deleted=False,
            user_roles__role__key=role,
            user_roles__is_active=True,
        ).distinct()
        if q:
            from django.db.models import Q

            qs = qs.filter(Q(email__icontains=q) | Q(full_name__icontains=q))
        return Response(StaffUserSerializer(qs[:20], many=True).data)


class MonitorView(APIView):
    """Supervisor live monitor — per-loket state + per-service queue depth."""

    permission_classes = [IsTenantAdmin]

    def get(self, request):
        today = timezone.localtime().date()
        scoped = user_scoped_instansi_ids(request.user, supervisor=True)
        loket_qs = Loket.objects.select_related("instansi", "current_operator")
        layanan_qs = Layanan.objects.select_related("instansi").filter(is_active=True)
        if scoped is not None:
            loket_qs = loket_qs.filter(instansi_id__in=scoped)
            layanan_qs = layanan_qs.filter(instansi_id__in=scoped)

        services = []
        for lyn in layanan_qs:
            counts = {
                s: Ticket.objects.filter(layanan=lyn, service_date=today, status=s).count()
                for s in ["reserved", "in_pool", "called", "serving", "served", "no_show"]
            }
            services.append({"layanan": lyn.id, "name": lyn.name, "counts": counts})

        return Response(
            {
                "loket": LoketSerializer(loket_qs, many=True).data,
                "services": services,
            }
        )


class DisplayBoardView(APIView):
    """Public 'now serving' board for an instansi (REST fallback to the WS feed)."""

    permission_classes = [AllowAny]

    def get(self, request, instansi_key=None):
        today = timezone.localtime().date()
        instansi = Instansi.objects.filter(key=instansi_key, is_active=True).first()
        if instansi is None:
            return Response({"detail": "Instansi tidak ditemukan."}, status=404)

        loket_rows = []
        for loket in instansi.loket.filter(is_open=True):
            current = (
                Ticket.objects.filter(
                    loket=loket,
                    service_date=today,
                    status__in=[Ticket.Status.CALLED, Ticket.Status.SERVING],
                )
                .order_by("-called_at")
                .first()
            )
            loket_rows.append(
                {
                    "loket": loket.code,
                    "now_serving": current.number if current else None,
                    "status": current.status if current else "idle",
                }
            )
        return Response({"instansi": instansi.name, "loket": loket_rows})


class KioskTakeView(APIView):
    """Anonymous walk-in take-number at the on-site e-kiosk (auto checked-in)."""

    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]

    def post(self, request):
        ser = WalkinTakeSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        try:
            ticket = lifecycle.take_ticket(
                data["layanan"],
                Ticket.Channel.WALKIN,
                is_priority=data["is_priority"],
                holder_name=data["holder_name"],
                holder_email=data["holder_email"],
            )
        except AntreanError as exc:
            return _err(exc)
        # Optional email receipt for walk-in; the QR is shown on-screen regardless.
        if ticket.holder_email:
            from .tasks import generate_ticket_pdf

            generate_ticket_pdf.delay(str(ticket.id))
        return Response(
            TicketDetailSerializer(ticket, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class CheckinScanView(APIView):
    """Staffed anjungan check-in station — scans an online ticket's QR (UUID)."""

    permission_classes = [IsLoketOperator]

    def post(self, request):
        ser = CheckinScanSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        ticket = Ticket.objects.filter(id=ser.validated_data["ticket"]).first()
        if ticket is None:
            return Response({"detail": "Tiket tidak ditemukan."}, status=404)
        try:
            ticket = check_in(ticket, actor=request.user)
        except AntreanError as exc:
            return _err(exc)
        return Response(TicketSerializer(ticket).data)
