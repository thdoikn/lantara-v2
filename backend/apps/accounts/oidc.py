"""
OIDC authentication backend for OIKN SSO (Keycloak).

SSO creates/syncs OIKN staff accounts. Roles (admin/verifier) are
assigned separately by superadmin — they are not auto-derived from
Keycloak claims to keep role management inside Lantara.

Direktorat matching: Keycloak sends job-title strings like
"DIREKTUR DATA DAN KECERDASAN BUATAN" or "KEPALA BIRO SUMBER DAYA MANUSIA".
We normalise these and fuzzy-match (Jaccard on significant words) against
Direktorat.name in the DB — so the match works even without exact casing.
"""
import re
import unicodedata

from django.core.cache import cache
from mozilla_django_oidc.auth import OIDCAuthenticationBackend


def generate_username(email: str) -> str:
    return email.split("@")[0]


# ---------------------------------------------------------------------------
# Name normalisation
# ---------------------------------------------------------------------------

def _title_case(s: str) -> str:
    """Convert ALL-CAPS strings to Title Case; leave already-mixed strings alone."""
    if not s:
        return s
    return s.title() if s == s.upper() else s


def _extract_full_name(claims: dict) -> str:
    """
    Build a properly-cased full name from Keycloak claims.

    Keycloak may send any combination of name/given_name/family_name,
    often in ALL-CAPS. Strategy:
    - Prefer given_name + family_name if both present.
    - Otherwise split the 'name' claim at the last space if family_name
      is available as an anchor.
    - Fall back to title-casing 'name' as a single string.
    """
    given = _title_case((claims.get("given_name") or "").strip())
    family = _title_case((claims.get("family_name") or "").strip())

    if given and family:
        return f"{given} {family}".strip()

    full = (claims.get("name") or "").strip()
    if not full:
        return ""

    # If family is known, use it to split the full name
    if family and full.upper().endswith(" " + family.upper()):
        given = _title_case(full[: -(len(family) + 1)].strip())
        return f"{given} {family}".strip()

    # Last-resort: title-case the whole thing
    return _title_case(full)


# ---------------------------------------------------------------------------
# Direktorat fuzzy matching
# ---------------------------------------------------------------------------

# Keycloak job-title prefixes → corresponding org-unit prefix
_TITLE_SUBS = [
    (r"^DIREKTUR\b",              "DIREKTORAT"),
    (r"^KEPALA\s+DIREKTORAT\b",   "DIREKTORAT"),
    (r"^KEPALA\s+BIRO\b",         "BIRO"),
    (r"^KEPALA\s+BAGIAN\b",       "BAGIAN"),
    (r"^KEPALA\s+PUSAT\b",        "PUSAT"),
    # "SEKRETARIS OTORITA …" → "SEKRETARIAT"
    (r"^SEKRETARIS\s+OTORITA\b.*", "SEKRETARIAT"),
    (r"^SEKRETARIS\b",            "SEKRETARIAT"),
    # Generic "KEPALA …" — drop the personal prefix
    (r"^KEPALA\s+",               ""),
]


def _normalize(s: str) -> str:
    """Strip diacritics, uppercase, keep only letters/digits."""
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return s.upper().strip()


def _significant_words(s: str) -> set:
    """Return words ≥4 chars (filters out noise like DAN, DI, KE)."""
    return {w for w in re.findall(r"[A-Z]{4,}", s)}


def _preprocess_sso(raw: str) -> str:
    """Apply title-prefix substitutions so the string looks like an org-unit name."""
    s = _normalize(raw)
    for pattern, replacement in _TITLE_SUBS:
        s, count = re.subn(pattern, replacement, s, flags=re.IGNORECASE)
        if count:
            break
    return s.strip()


def _jaccard(a: set, b: set) -> float:
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def _match_direktorat(raw_value: str):
    """
    Fuzzy-match a raw Keycloak unit/jabatan string against all active Direktorat
    names using Jaccard similarity on significant words.

    Results are cached for 1 hour so repeated logins don't re-query.
    Returns the best-matching Direktorat or None.
    """
    if not raw_value:
        return None

    from apps.reference.models import Direktorat  # noqa: PLC0415 — lazy import

    all_direktorat = cache.get("oidc:direktorat_list")
    if all_direktorat is None:
        all_direktorat = list(Direktorat.objects.filter(is_active=True))
        cache.set("oidc:direktorat_list", all_direktorat, timeout=3600)

    processed = _preprocess_sso(raw_value)
    words_input = _significant_words(processed)

    best_obj = None
    best_score = 0.45  # minimum Jaccard threshold

    for obj in all_direktorat:
        words_db = _significant_words(_normalize(obj.name))
        score = _jaccard(words_input, words_db)
        if score > best_score:
            best_score = score
            best_obj = obj

    return best_obj


# ---------------------------------------------------------------------------
# OIDC backend
# ---------------------------------------------------------------------------

class JDIHOIDCBackend(OIDCAuthenticationBackend):
    """
    Keycloak → Lantara user bridge.

    Claim mapping expected from Keycloak:
      name / given_name / family_name  → full_name (title-cased)
      unit_kerja OR direktorat         → fuzzy-matched to Direktorat FK
      groups (path list)               → fallback for Direktorat (exact key match)

    Lantara roles (admin/verifier/superadmin) are NEVER auto-assigned from
    SSO claims. An admin assigns them manually after the first login.
    """

    def get_userinfo(self, access_token, id_token, payload):
        """Merge resource_access/realm_access from id_token if userinfo omits them."""
        userinfo = super().get_userinfo(access_token, id_token, payload)
        for key in ("resource_access", "realm_access"):
            if key not in userinfo and key in payload:
                userinfo[key] = payload[key]
        return userinfo

    def filter_users_by_claims(self, claims):
        email = claims.get("email")
        if not email:
            return self.UserModel.objects.none()
        return self.UserModel.objects.filter(email__iexact=email)

    def _resolve_direktorat(self, claims):
        """
        Two-stage Direktorat resolution:
        1. Fuzzy-match unit_kerja / direktorat claim (job-title string).
        2. Fall back to exact key-match against groups claim paths.
        """
        from apps.reference.models import Direktorat  # noqa: PLC0415

        # Stage 1 — fuzzy match on title string
        raw = claims.get("unit_kerja", "") or claims.get("direktorat", "")
        match = _match_direktorat(raw)
        if match:
            return match

        # Stage 2 — exact key from Keycloak group paths e.g. ["/direktorat-data-ai"]
        for group_path in claims.get("groups", []):
            key = group_path.lstrip("/")
            direktorat = Direktorat.objects.filter(key=key, is_active=True).first()
            if direktorat:
                return direktorat

        return None

    def create_user(self, claims):
        email = claims.get("email", "")
        full_name = _extract_full_name(claims) or email.split("@")[0]

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
        """Sync name and Direktorat on every SSO login."""
        changed = []

        full_name = _extract_full_name(claims)
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
        new_pk = direktorat.pk if direktorat else None
        if user.direktorat_id != new_pk:
            user.direktorat = direktorat
            changed.append("direktorat")

        if changed:
            user.save(update_fields=changed)
        return user
