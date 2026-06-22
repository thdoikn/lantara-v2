"""
OIDC authentication backend for OIKN SSO (Keycloak).

SSO creates/syncs OIKN staff accounts. Roles (admin/verifier) are
assigned separately by superadmin — they are not auto-derived from
Keycloak claims to keep role management inside Lantara.
"""
from mozilla_django_oidc.auth import OIDCAuthenticationBackend


def generate_username(email: str) -> str:
    return email.split("@")[0]


class JDIHOIDCBackend(OIDCAuthenticationBackend):
    """
    Keycloak → Lantara user bridge.
    - Matches by email (case-insensitive)
    - Creates staff user on first SSO login
    - Syncs full_name and direktorat on every login
    - Never auto-assigns Lantara roles (admin does that)
    """

    def filter_users_by_claims(self, claims):
        email = claims.get("email")
        if not email:
            return self.UserModel.objects.none()
        return self.UserModel.objects.filter(email__iexact=email)

    def _resolve_direktorat(self, claims):
        """
        Optionally resolve Direktorat from a Keycloak group claim.
        Keycloak group memberships arrive as claims['groups'] = ['/direktorat-key', ...].
        Returns the matching Direktorat instance or None.
        """
        from apps.reference.models import Direktorat

        groups = claims.get("groups", [])
        for group_path in groups:
            key = group_path.lstrip("/")
            direktorat = Direktorat.objects.filter(key=key, is_active=True).first()
            if direktorat:
                return direktorat
        return None

    def create_user(self, claims):
        email = claims.get("email", "")
        full_name = claims.get("name", "") or claims.get("given_name", "") or email.split("@")[0]

        user = self.UserModel.objects.create_user(
            email=email,
            full_name=full_name,
            is_staff=True,
            is_active=True,
            is_email_verified=True,
        )
        direktorat = self._resolve_direktorat(claims)
        if direktorat:
            user.direktorat = direktorat
            user.save(update_fields=["direktorat"])
        return user

    def update_user(self, user, claims):
        changed = []

        full_name = claims.get("name", "") or claims.get("given_name", "")
        if full_name and user.full_name != full_name:
            user.full_name = full_name
            changed.append("full_name")

        if not user.is_staff:
            user.is_staff = True
            changed.append("is_staff")

        if not user.is_email_verified:
            user.is_email_verified = True
            changed.append("is_email_verified")

        direktorat = self._resolve_direktorat(claims)
        if direktorat and user.direktorat_id != direktorat.pk:
            user.direktorat = direktorat
            changed.append("direktorat")

        if changed:
            user.save(update_fields=changed)
        return user
