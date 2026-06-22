from django.contrib.auth import password_validation
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import ApplicantProfile, OTPCode, Role, User, VerifierPermitAssignment


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["email"] = user.email
        token["full_name"] = user.full_name
        token["is_staff"] = user.is_staff
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = UserMeSerializer(self.user).data
        return data


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ["email", "full_name", "phone", "password", "password_confirm"]

    def validate(self, data):
        if data["password"] != data.pop("password_confirm"):
            raise serializers.ValidationError({"password_confirm": "Password tidak cocok."})
        password_validation.validate_password(data["password"])
        return data

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class OTPVerifySerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(max_length=6)
    purpose = serializers.ChoiceField(choices=OTPCode.Purpose.choices)


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(max_length=6)
    new_password = serializers.CharField(min_length=8)


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField()
    new_password = serializers.CharField(min_length=8)

    def validate_new_password(self, value):
        password_validation.validate_password(value)
        return value


class ApplicantProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApplicantProfile
        exclude = ["id", "user", "created_at", "updated_at"]


class UserMeSerializer(serializers.ModelSerializer):
    profile = ApplicantProfileSerializer(read_only=True)
    roles = serializers.SerializerMethodField()
    direktorat_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id", "email", "full_name", "nik", "phone", "whatsapp_number",
            "avatar", "is_email_verified", "is_staff", "last_seen",
            "created_at", "profile", "roles", "direktorat_name",
        ]
        read_only_fields = ["id", "email", "is_email_verified", "is_staff", "last_seen", "created_at"]

    def get_roles(self, obj):
        return list(
            obj.user_roles.filter(is_active=True).values_list("role__key", flat=True)
        )

    def get_direktorat_name(self, obj):
        if obj.direktorat_id:
            return obj.direktorat.name
        return None


class UserListSerializer(serializers.ModelSerializer):
    roles = serializers.SerializerMethodField()
    direktorat_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id", "email", "full_name", "nik", "is_active", "is_staff",
            "is_email_verified", "created_at", "roles", "direktorat_name",
        ]

    def get_roles(self, obj):
        return list(
            obj.user_roles.filter(is_active=True).values_list("role__key", flat=True)
        )

    def get_direktorat_name(self, obj):
        if obj.direktorat_id:
            return obj.direktorat.name
        return None


class RoleSerializer(serializers.ModelSerializer):
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = Role
        fields = ["id", "key", "name", "description", "permissions"]

    def get_permissions(self, obj):
        return list(obj.permissions.values_list("permission_key", flat=True))


class VerifierPermitAssignmentSerializer(serializers.ModelSerializer):
    permit_type_key = serializers.CharField(source="permit_type.key", read_only=True)
    permit_type_name = serializers.CharField(source="permit_type.name", read_only=True)
    sektor_name = serializers.CharField(source="permit_type.sektor.name", read_only=True)
    assigned_by_name = serializers.CharField(source="assigned_by.full_name", read_only=True, default=None)
    permit_type_id = serializers.PrimaryKeyRelatedField(
        source="permit_type",
        write_only=True,
        queryset=__import__("apps.engine.models", fromlist=["PermitType"]).PermitType.objects.all(),
    )

    class Meta:
        model = VerifierPermitAssignment
        fields = [
            "id", "permit_type_id", "permit_type_key", "permit_type_name",
            "sektor_name", "is_active", "notes", "assigned_by_name", "created_at",
        ]
        read_only_fields = ["id", "created_at"]
