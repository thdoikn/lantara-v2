from django.contrib import admin

from .models import (
    FAQ,
    Bidang,
    DirectPermit,
    Direktorat,
    Holiday,
    KbliCode,
    Kedeputian,
    TenantCard,
)


@admin.register(Kedeputian)
class KedeputianAdmin(admin.ModelAdmin):
    list_display = ["name", "short_name", "order", "is_active"]
    list_filter = ["is_active"]
    prepopulated_fields = {"key": ("name",)}


@admin.register(Direktorat)
class DirektoratAdmin(admin.ModelAdmin):
    list_display = ["name", "kedeputian", "short_name", "order", "is_active"]
    list_filter = ["kedeputian", "is_active"]
    prepopulated_fields = {"key": ("name",)}


@admin.register(Bidang)
class BidangAdmin(admin.ModelAdmin):
    list_display = ["code", "name"]
    search_fields = ["code", "name"]


@admin.register(KbliCode)
class KbliCodeAdmin(admin.ModelAdmin):
    list_display = ["code", "title", "bidang", "pengampu"]
    list_filter = ["bidang"]
    search_fields = ["code", "title"]


@admin.register(Holiday)
class HolidayAdmin(admin.ModelAdmin):
    list_display = ["date", "name", "is_national"]
    list_filter = ["is_national"]


@admin.register(DirectPermit)
class DirectPermitAdmin(admin.ModelAdmin):
    list_display = ["title", "permit_type_key", "order", "is_active"]
    list_filter = ["is_active"]


@admin.register(FAQ)
class FAQAdmin(admin.ModelAdmin):
    list_display = ["question", "category", "order", "is_active"]
    list_filter = ["category", "is_active"]


@admin.register(TenantCard)
class TenantCardAdmin(admin.ModelAdmin):
    list_display = ["name", "order", "is_active"]
    list_filter = ["is_active"]
