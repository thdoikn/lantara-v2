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

from .models import (
    CounterStaffAssignment,
    Instansi,
    Layanan,
    Loket,
    QueueParameter,
    Ticket,
)
from .permissions import (
    IsMppOperator,
    IsMppSupervisor,
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

    @action(detail=True, methods=["get"])
    def layanan(self, request, key=None):
        qs = Layanan.objects.filter(instansi__key=key, is_active=True)
        return Response(LayananSerializer(qs, many=True).data)


class TicketViewSet(viewsets.GenericViewSet):
    """Citizen ticket lifecycle + operator actions on a ticket."""

    serializer_class = TicketSerializer

    _OPERATOR_ACTIONS = {"recall", "serve", "complete", "no_show", "retriage"}

    def get_permissions(self):
        if self.action in self._OPERATOR_ACTIONS:
            return [IsMppOperator()]
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
        if self.action in ("list", "retrieve", "call_next", "open", "close"):
            return [IsMppOperator()]
        return [IsMppSupervisor()]

    def get_queryset(self):
        qs = Loket.objects.select_related("instansi", "current_operator")
        scoped = user_scoped_instansi_ids(self.request.user)
        if scoped is not None:
            qs = qs.filter(instansi_id__in=scoped)
        return qs

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
    """Tenant CRUD (supervisor) — register OIKN directorates + external agencies."""

    permission_classes = [IsMppSupervisor]
    serializer_class = InstansiSerializer
    queryset = Instansi.objects.select_related("direktorat").prefetch_related("layanan")


class LayananViewSet(viewsets.ModelViewSet):
    """Service CRUD (supervisor/admin)."""

    permission_classes = [IsMppSupervisor]
    serializer_class = LayananSerializer
    queryset = Layanan.objects.select_related("instansi")


class QueueParameterViewSet(viewsets.ModelViewSet):
    """Tabel-8 knob CRUD (supervisor)."""

    permission_classes = [IsMppSupervisor]
    serializer_class = QueueParameterSerializer
    queryset = QueueParameter.objects.select_related("layanan")


class CounterStaffAssignmentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsMppSupervisor]
    serializer_class = CounterStaffAssignmentSerializer
    queryset = CounterStaffAssignment.objects.select_related("user", "instansi", "loket")

    def perform_create(self, serializer):
        serializer.save(assigned_by=self.request.user)


class MonitorView(APIView):
    """Supervisor live monitor — per-loket state + per-service queue depth."""

    permission_classes = [IsMppSupervisor]

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

    permission_classes = [IsMppOperator]

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
