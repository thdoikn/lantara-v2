from django.contrib import admin

from .models import (
    CounterStaffAssignment,
    Instansi,
    Layanan,
    Loket,
    QueueParameter,
    Ticket,
    TicketEvent,
)


@admin.register(Instansi)
class InstansiAdmin(admin.ModelAdmin):
    list_display = ("name", "key", "owner_type", "direktorat", "order", "is_active")
    list_filter = ("owner_type", "is_active")
    search_fields = ("name", "key", "short_name")
    prepopulated_fields = {"key": ("name",)}


@admin.register(Layanan)
class LayananAdmin(admin.ModelAdmin):
    list_display = ("name", "instansi", "category", "avg_minutes", "daily_quota", "is_active")
    list_filter = ("category", "is_active", "instansi")
    search_fields = ("name", "key")


@admin.register(QueueParameter)
class QueueParameterAdmin(admin.ModelAdmin):
    list_display = ("key", "layanan", "value", "value_type")
    list_filter = ("value_type",)
    search_fields = ("key",)


@admin.register(Loket)
class LoketAdmin(admin.ModelAdmin):
    list_display = ("code", "instansi", "is_open", "current_operator")
    list_filter = ("is_open", "instansi")
    filter_horizontal = ("layanan",)


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ("number", "layanan", "service_date", "channel", "status", "is_priority")
    list_filter = ("status", "channel", "is_priority", "service_date")
    search_fields = ("number", "holder_name", "holder_phone")
    raw_id_fields = ("applicant", "served_by", "loket")


@admin.register(TicketEvent)
class TicketEventAdmin(admin.ModelAdmin):
    list_display = ("ticket", "action", "actor", "created_at")
    list_filter = ("action",)
    raw_id_fields = ("ticket", "actor", "loket")


@admin.register(CounterStaffAssignment)
class CounterStaffAssignmentAdmin(admin.ModelAdmin):
    list_display = ("user", "instansi", "loket", "role_scope", "is_active")
    list_filter = ("role_scope", "is_active", "instansi")
    raw_id_fields = ("user", "assigned_by")
