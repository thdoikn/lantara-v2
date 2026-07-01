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
    permit_type_key = serializers.SlugField(source="permit_type.key", read_only=True)

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
            "permit_type",
            "permit_type_key",
            "is_active",
            "order",
        ]


class InstansiSerializer(serializers.ModelSerializer):
    layanan = LayananSerializer(many=True, read_only=True)

    class Meta:
        model = Instansi
        fields = [
            "id",
            "key",
            "name",
            "short_name",
            "description",
            "direktorat",
            "order",
            "is_active",
            "layanan",
        ]


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


class TakeTicketSerializer(serializers.Serializer):
    """Online-virtual take-ticket payload (logged-in citizen picks a service)."""

    layanan = serializers.PrimaryKeyRelatedField(queryset=Layanan.objects.filter(is_active=True))
    is_priority = serializers.BooleanField(default=False)


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
