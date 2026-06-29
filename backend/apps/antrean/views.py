"""
Antrean MPP API.

  Citizen  : take a number, check in, watch position, cancel.
  Operator : open/close loket, call-next, recall, serve, complete, no-show, re-triage.
  Supervisor: parameters, loket management, staff assignment, live monitor.
  Public   : display board (now-serving + next-up).
"""

from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
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
    CounterStaffAssignmentSerializer,
    InstansiSerializer,
    LayananSerializer,
    LoketSerializer,
    QueueParameterSerializer,
    RetriageSerializer,
    TakeTicketSerializer,
    TicketSerializer,
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

    # ── Citizen ──────────────────────────────────────────────────────────────
    def create(self, request):
        """Take a number. Links to an izin pickup when `submission` is given."""
        ser = TakeTicketSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data

        submission = None
        layanan = data.get("layanan")
        sub_id = data.get("submission")
        if sub_id:
            from apps.submissions.models import Submission

            submission = Submission.objects.filter(id=sub_id).first()
            if submission is None or submission.applicant_id != request.user.id:
                return Response({"detail": "Pengajuan tidak ditemukan."}, status=404)
            if submission.status != Submission.Status.COLLECTION:
                return Response({"detail": "Pengajuan ini belum siap diambil."}, status=409)
            # Resolve the service from the izin when the client didn't name one.
            if layanan is None:
                layanan = Layanan.objects.filter(
                    permit_type_id=submission.permit_type_id, is_active=True
                ).first()

        if layanan is None:
            return Response({"detail": "Layanan wajib dipilih."}, status=400)

        try:
            ticket = lifecycle.take_ticket(
                layanan,
                data["channel"],
                applicant=request.user,
                submission=submission,
                is_priority=data["is_priority"],
                holder_name=data["holder_name"],
                holder_phone=data["holder_phone"],
            )
        except AntreanError as exc:
            return _err(exc)
        return Response(TicketSerializer(ticket).data, status=status.HTTP_201_CREATED)

    def retrieve(self, request, pk=None):
        ticket = self.get_object()
        return Response(TicketSerializer(ticket).data)

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
        return Response(TicketSerializer(ticket).data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        ticket = self.get_object()
        if ticket.applicant_id != request.user.id:
            return Response({"detail": "Bukan nomor Anda."}, status=403)
        try:
            ticket = lifecycle.cancel(ticket, actor=request.user)
        except AntreanError as exc:
            return _err(exc)
        return Response(TicketSerializer(ticket).data)

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


class LayananViewSet(viewsets.ModelViewSet):
    """Service CRUD (supervisor/admin)."""

    permission_classes = [IsMppSupervisor]
    serializer_class = LayananSerializer
    queryset = Layanan.objects.select_related("instansi", "permit_type")


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
