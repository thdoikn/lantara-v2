from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import ApplicantProfile, OTPCode, Role, RolePermission, User, UserRole


class UserRoleInline(admin.TabularInline):
    model = UserRole
    fk_name = "user"
    extra = 0
    fields = ("role", "is_active", "assigned_by")
    readonly_fields = ("assigned_by",)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("email", "full_name", "nik", "is_active", "is_staff", "is_email_verified")
    list_filter = ("is_active", "is_staff", "is_email_verified", "is_deleted")
    search_fields = ("email", "full_name", "nik")
    ordering = ("-created_at",)
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Info", {"fields": ("full_name", "nik", "phone", "whatsapp_number", "avatar")}),
        ("Status", {"fields": ("is_active", "is_staff", "is_superuser", "is_email_verified", "is_deleted")}),
    )
    add_fieldsets = (
        (None, {"classes": ("wide",), "fields": ("email", "full_name", "password1", "password2")}),
    )
    readonly_fields = ("created_at", "updated_at", "last_seen")
    inlines = [UserRoleInline]


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ("key", "name")
    search_fields = ("key", "name")


@admin.register(RolePermission)
class RolePermissionAdmin(admin.ModelAdmin):
    list_display = ("role", "permission_key")
    list_filter = ("role",)
    search_fields = ("permission_key",)


@admin.register(OTPCode)
class OTPCodeAdmin(admin.ModelAdmin):
    list_display = ("user", "purpose", "is_used", "expires_at", "created_at")
    list_filter = ("purpose", "is_used")
    readonly_fields = ("code", "created_at")
