from rest_framework import serializers

from .models import (
    CounterStaffAssignment,
    Instansi,
    Layanan,
    Loket,
    QueueParameter,
    Ticket,
    TicketEvent,
)


class LayananSerializer(serializers.ModelSerializer):
    instansi_key = serializers.SlugField(source="instansi.key", read_only=True)
    instansi_name = serializers.CharField(source="instansi.name", read_only=True)
    # Live number of people waiting today (reserved + in the calling pool), so the
    # catalog can show how busy each service is. Fed via serializer context in one
    # query (see InstansiViewSet.get_serializer_context); 0 when absent.
    waiting = serializers.SerializerMethodField()

    class Meta:
        model = Layanan
        fields = [
            "id",
            "key",
            "name",
            "category",
            "avg_minutes",
            "online_ratio",
            "priority_ratio_n",
            "daily_quota",
            "recall_max",
            "instansi",
            "instansi_key",
            "instansi_name",
            "is_active",
            "order",
            "waiting",
        ]

    def get_waiting(self, obj) -> int:
        return self.context.get("waiting_map", {}).get(obj.id, 0)


class InstansiSerializer(serializers.ModelSerializer):
    layanan = LayananSerializer(many=True, read_only=True)
    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = Instansi
        fields = [
            "id",
            "key",
            "name",
            "short_name",
            "description",
            "owner_type",
            "logo",
            "logo_url",
            "direktorat",
            "operating_open",
            "operating_close",
            "break_start",
            "break_end",
            "order",
            "is_active",
            "layanan",
        ]

    def get_logo_url(self, obj):
        if not obj.logo:
            return None
        url = obj.logo.url
        request = self.context.get("request")
        return request.build_absolute_uri(url) if request else url


class LoketSerializer(serializers.ModelSerializer):
    instansi_key = serializers.SlugField(source="instansi.key", read_only=True)
    operator_name = serializers.CharField(source="current_operator.full_name", read_only=True)

    class Meta:
        model = Loket
        fields = [
            "id",
            "code",
            "name",
            "instansi",
            "instansi_key",
            "layanan",
            "is_open",
            "current_operator",
            "operator_name",
            "opened_at",
        ]


class TicketEventSerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source="actor.full_name", read_only=True)

    class Meta:
        model = TicketEvent
        fields = ["id", "action", "actor_name", "from_status", "to_status", "notes", "created_at"]


class TicketSerializer(serializers.ModelSerializer):
    layanan_name = serializers.CharField(source="layanan.name", read_only=True)
    instansi_name = serializers.CharField(source="layanan.instansi.name", read_only=True)
    loket_code = serializers.CharField(source="loket.code", read_only=True)
    ahead = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = [
            "id",
            "number",
            "seq",
            "channel",
            "status",
            "is_priority",
            "is_demoted",
            "layanan",
            "layanan_name",
            "instansi_name",
            "service_date",
            "taken_at",
            "estimated_call_at",
            "checkin_at",
            "checkin_deadline",
            "called_at",
            "recall_count",
            "served_at",
            "loket",
            "loket_code",
            "holder_name",
            "holder_phone",
            "ahead",
        ]
        read_only_fields = fields

    def get_ahead(self, obj):
        if obj.status != Ticket.Status.IN_POOL:
            return None
        from .services.ordering import position_ahead

        return position_ahead(obj)


class TicketDetailSerializer(TicketSerializer):
    """Single-ticket view — adds the on-screen QR + PDF link (heavier to compute,
    so kept off the list serializer)."""

    qr_data_url = serializers.SerializerMethodField()
    pdf_url = serializers.SerializerMethodField()
    # Skip pressure for un-checked-in online tickets (drives the "segera check-in"
    # warning): how many later numbers were called ahead, and the limit at which
    # the number is voided.
    skipped = serializers.SerializerMethodField()
    skip_limit = serializers.SerializerMethodField()

    class Meta(TicketSerializer.Meta):
        fields = TicketSerializer.Meta.fields + [
            "holder_email",
            "qr_data_url",
            "pdf_url",
            "skipped",
            "skip_limit",
        ]

    def get_skipped(self, obj) -> int:
        if obj.status != Ticket.Status.RESERVED:
            return 0
        from .services.ordering import skipped_count

        return skipped_count(obj)

    def get_skip_limit(self, obj) -> int:
        from .services.params import get_param

        return get_param("max_skip_before_expire", obj.layanan)

    def get_qr_data_url(self, obj):
        from .pdf import qr_data_url

        return qr_data_url(obj)

    def get_pdf_url(self, obj):
        if not obj.pdf_file:
            return None
        url = obj.pdf_file.url
        request = self.context.get("request")
        return request.build_absolute_uri(url) if request else url


class TakeTicketSerializer(serializers.Serializer):
    """Online-virtual take-ticket payload (logged-in citizen picks a service)."""

    layanan = serializers.PrimaryKeyRelatedField(queryset=Layanan.objects.filter(is_active=True))
    is_priority = serializers.BooleanField(default=False)


class WalkinTakeSerializer(serializers.Serializer):
    """Anonymous walk-in take at the on-site e-kiosk. Email is optional (the
    number + QR are also shown on-screen to photograph)."""

    layanan = serializers.PrimaryKeyRelatedField(queryset=Layanan.objects.filter(is_active=True))
    is_priority = serializers.BooleanField(default=False)
    holder_name = serializers.CharField(required=False, allow_blank=True, default="")
    holder_email = serializers.EmailField(required=False, allow_blank=True, default="")


class CheckinScanSerializer(serializers.Serializer):
    """Kiosk check-in station scans a ticket QR (its UUID)."""

    ticket = serializers.UUIDField()


class RetriageSerializer(serializers.Serializer):
    layanan = serializers.PrimaryKeyRelatedField(queryset=Layanan.objects.filter(is_active=True))


class QueueParameterSerializer(serializers.ModelSerializer):
    class Meta:
        model = QueueParameter
        fields = ["id", "layanan", "key", "value", "value_type"]


class CounterStaffAssignmentSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.full_name", read_only=True)

    class Meta:
        model = CounterStaffAssignment
        fields = [
            "id",
            "user",
            "user_name",
            "instansi",
            "loket",
            "role_scope",
            "is_active",
            "notes",
        ]
