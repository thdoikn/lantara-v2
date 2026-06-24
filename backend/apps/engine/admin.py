from django.contrib import admin

from .models import (
    DocumentRequirement,
    FormField,
    PermitType,
    PermitTypeVersion,
    Sektor,
    WorkflowStage,
)


class WorkflowStageInline(admin.TabularInline):
    model = WorkflowStage
    extra = 0
    fields = (
        "order",
        "key",
        "name",
        "stage_type",
        "sla_hours",
        "requires_site_visit",
        "allowed_actions",
    )


class FormFieldInline(admin.TabularInline):
    model = FormField
    extra = 0
    fields = ("order", "key", "label", "field_type", "section", "required", "prefill_from_profile")


class DocumentRequirementInline(admin.TabularInline):
    model = DocumentRequirement
    extra = 0
    fields = ("order", "key", "title", "allowed_types", "max_bytes", "required")


@admin.register(Sektor)
class SektorAdmin(admin.ModelAdmin):
    list_display = ("key", "name", "order", "is_active", "is_catchall")
    list_editable = ("order", "is_active")
    search_fields = ("key", "name")
    prepopulated_fields = {"key": ("name",)}


@admin.register(PermitType)
class PermitTypeAdmin(admin.ModelAdmin):
    list_display = ("key", "sektor", "name", "sla_days", "is_published", "schema_version")
    list_filter = ("sektor", "is_published", "is_berusaha", "oss_covered")
    search_fields = ("key", "name")
    prepopulated_fields = {"key": ("name",)}
    inlines = [WorkflowStageInline, FormFieldInline, DocumentRequirementInline]
    readonly_fields = ("schema_version",)


@admin.register(PermitTypeVersion)
class PermitTypeVersionAdmin(admin.ModelAdmin):
    list_display = ("permit_type", "version", "created_at")
    list_filter = ("permit_type",)
    readonly_fields = ("permit_type", "version", "snapshot", "created_at")
