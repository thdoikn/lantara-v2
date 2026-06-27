# SSO Integration Guide — Keycloak + Django + React

This guide is written for a Claude Code agent to implement Keycloak SSO (Single Sign-On)
into an existing Django + React project from scratch.

Read this entire file before writing any code. Follow each section in order.

---

## Architecture Overview

```
Browser → React frontend
           ↓  click "Login with SSO"
           ↓  builds Keycloak authorization URL (client-side, no backend call)
           ↓  redirects browser to Keycloak login page

Keycloak → authenticates user
           ↓  redirects browser to: https://yourdomain.com/auth/callback?code=...&state=...

React /auth/callback page
           ↓  sends { code, redirect_uri } to POST /api/v1/auth/oidc/callback/

Django OIDCCallbackView
           ↓  exchanges code for tokens at Keycloak token endpoint (server-to-server)
           ↓  verifies id_token JWT signature using Keycloak's JWKS
           ↓  find-or-create User from claims
           ↓  issues own SimpleJWT tokens (access + refresh)
           ↓  returns { access, refresh, user }

React stores JWT tokens → user is logged in
```

Key design decisions:
- The frontend does NOT use `oidc-client-ts` or any OIDC library — it builds the URL manually.
- The backend handles the code exchange using `mozilla_django_oidc` as a utility library (not its session-based middleware flow).
- After SSO login, the app uses standard JWT tokens — identical to normal login flow.
- `prompt=login` is added to the authorization URL so Keycloak always shows the login form.
  This lets users switch accounts without needing to clear the Keycloak session on logout.
  Logout is simple: clear local tokens only. No Keycloak redirect needed.

---

## Part 1 — Backend (Django)

### 1.1 Install dependencies

```bash
pip install mozilla-django-oidc
```

Add to `requirements.txt`:
```
mozilla-django-oidc>=4.0.0
```

### 1.2 settings.py changes

#### Add to INSTALLED_APPS
```python
INSTALLED_APPS = [
    # ... existing apps ...
    'mozilla_django_oidc',
]
```

#### Authentication backends — add OIDC backend FIRST
```python
AUTHENTICATION_BACKENDS = [
    'apps.accounts.oidc.JDIHOIDCBackend',   # adjust path to where you put oidc.py
    'django.contrib.auth.backends.ModelBackend',
]
```

#### Middleware — CRITICAL ordering rule
`mozilla_django_oidc.middleware.SessionRefresh` MUST come AFTER
`django.contrib.auth.middleware.AuthenticationMiddleware`. Getting this wrong
causes AttributeError on every single HTTP request (500 on all endpoints).

```python
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',        # if using django-cors-headers
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',  # ← auth first
    'mozilla_django_oidc.middleware.SessionRefresh',             # ← OIDC after auth
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]
```

#### Proxy / HTTPS settings
If the app runs behind an SSL-terminating load balancer or reverse proxy, add:
```python
USE_X_FORWARDED_HOST = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
```
Without `SECURE_PROXY_SSL_HEADER`, Django builds callback URLs as `http://` instead
of `https://`, and Keycloak will reject them with "Invalid parameter: redirect_uri".

#### OIDC settings — read from environment variables
```python
# ── SSO / OpenID Connect (Keycloak) ──────────────────────────────────────────
OIDC_RP_CLIENT_ID     = config('OIDC_RP_CLIENT_ID',     default='')
OIDC_RP_CLIENT_SECRET = config('OIDC_RP_CLIENT_SECRET', default='')

OIDC_OP_AUTHORIZATION_ENDPOINT = config('OIDC_OP_AUTHORIZATION_ENDPOINT', default='')
OIDC_OP_TOKEN_ENDPOINT         = config('OIDC_OP_TOKEN_ENDPOINT',         default='')
OIDC_OP_USER_ENDPOINT          = config('OIDC_OP_USER_ENDPOINT',          default='')
OIDC_OP_JWKS_ENDPOINT          = config('OIDC_OP_JWKS_ENDPOINT',          default='')

OIDC_RP_SIGN_ALGO       = config('OIDC_RP_SIGN_ALGO', default='RS256')
OIDC_USE_PKCE           = False   # confidential client uses client_secret; no PKCE needed
OIDC_STORE_ACCESS_TOKEN = True
OIDC_USERNAME_ALGO      = 'apps.accounts.oidc.generate_username'  # adjust path

# Where mozilla_django_oidc redirects after its own session-based flow
OIDC_AUTHENTICATION_CALLBACK_URL = 'oidc-callback'  # must match the URL name below
```

#### Environment variables to add to .env / .env.prod
```env
OIDC_OP_AUTHORIZATION_ENDPOINT=https://<keycloak-host>/realms/<REALM>/protocol/openid-connect/auth
OIDC_OP_TOKEN_ENDPOINT=https://<keycloak-host>/realms/<REALM>/protocol/openid-connect/token
OIDC_OP_USER_ENDPOINT=https://<keycloak-host>/realms/<REALM>/protocol/openid-connect/userinfo
OIDC_OP_JWKS_ENDPOINT=https://<keycloak-host>/realms/<REALM>/protocol/openid-connect/certs
OIDC_RP_CLIENT_ID=<your-client-id>
OIDC_RP_CLIENT_SECRET=<your-client-secret>
```

Replace `<keycloak-host>` and `<REALM>` with actual values.
The client ID and secret come from Keycloak Admin → Clients → your client → Credentials tab.

---

### 1.3 Create the OIDC backend — apps/accounts/oidc.py

Create this file. Adjust `_map_role` and `_map_unit` to match your app's
User model fields and Keycloak role names.

```python
from mozilla_django_oidc.auth import OIDCAuthenticationBackend
from django.contrib.auth import get_user_model

User = get_user_model()


def generate_username(email):
    """Generate a unique username from the email prefix."""
    base = email.split('@')[0]
    username = base
    n = 1
    while User.objects.filter(username=username).exists():
        username = f'{base}{n}'
        n += 1
    return username


class JDIHOIDCBackend(OIDCAuthenticationBackend):
    """
    Custom OIDC backend.
    - Finds existing users by email
    - Creates new users from Keycloak claims
    - Keeps role/unit in sync on every SSO login
    """

    def filter_users_by_claims(self, claims):
        email = claims.get('email')
        if not email:
            return self.UserModel.objects.none()
        return self.UserModel.objects.filter(email__iexact=email)

    def _map_role(self, claims):
        """
        Map Keycloak roles to your app's role values.

        Keycloak sends roles in two places:
          - claims['realm_access']['roles']        → realm-level roles
          - claims['resource_access'][client_id]['roles'] → client-level roles

        Adjust the role string comparisons below to match what your
        Keycloak realm actually sends.
        """
        from django.conf import settings as django_settings
        realm_roles  = claims.get('realm_access', {}).get('roles', [])
        client_id    = getattr(django_settings, 'OIDC_RP_CLIENT_ID', '')
        client_roles = (
            claims.get('resource_access', {})
                  .get(client_id, {})
                  .get('roles', [])
        )
        all_roles = set(realm_roles) | set(client_roles)

        # ── Adjust these strings to match your Keycloak role names ──
        if 'app-superadmin' in all_roles:
            return 'superadmin'
        if 'app-admin' in all_roles:
            return 'admin'
        # Default role for all SSO users
        return 'staff'

    def create_user(self, claims):
        email    = claims.get('email', '')
        name     = claims.get('name', '') or claims.get('given_name', '')
        username = generate_username(email)

        user = self.UserModel.objects.create_user(
            username     = username,
            email        = email,
            # Add any other fields your User model has:
            # nama_lengkap = name,
            role         = self._map_role(claims),
            is_verified  = True,   # SSO = confirmed real employee
        )
        return user

    def update_user(self, user, claims):
        """Keep user fields in sync on every SSO login."""
        changed = []

        name = claims.get('name', '') or claims.get('given_name', '')
        if name and getattr(user, 'nama_lengkap', None) != name:
            user.nama_lengkap = name
            changed.append('nama_lengkap')

        new_role = self._map_role(claims)
        if getattr(user, 'role', None) != new_role:
            user.role = new_role
            changed.append('role')

        if not user.is_verified:
            user.is_verified = True
            changed.append('is_verified')

        if changed:
            user.save(update_fields=changed)
        return user
```

---

### 1.4 Create the OIDC callback view — apps/accounts/views.py (add this class)

This view receives `{ code, redirect_uri }` from the frontend, exchanges the code
with Keycloak server-to-server, and returns standard JWT tokens.

```python
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework_simplejwt.tokens import RefreshToken
from django.conf import settings


class OIDCCallbackView(APIView):
    """
    POST /auth/oidc/callback/
    Body: { code, redirect_uri }

    Exchanges the Keycloak authorization code for tokens,
    finds/creates the User from claims, and returns our own
    SimpleJWT tokens: { access, refresh, user }.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        code         = request.data.get('code')
        redirect_uri = request.data.get('redirect_uri')

        if not code:
            return Response({'error': 'code is required'}, status=status.HTTP_400_BAD_REQUEST)
        if not redirect_uri:
            return Response({'error': 'redirect_uri is required'}, status=status.HTTP_400_BAD_REQUEST)

        from .oidc import JDIHOIDCBackend

        backend = JDIHOIDCBackend()
        try:
            # Exchange authorization code for tokens at Keycloak token endpoint
            token_info = backend.get_token({
                'client_id':     settings.OIDC_RP_CLIENT_ID,
                'client_secret': settings.OIDC_RP_CLIENT_SECRET,
                'grant_type':    'authorization_code',
                'code':          code,
                'redirect_uri':  redirect_uri,
            })
            access_token = token_info.get('access_token')
            id_token     = token_info.get('id_token')

            if not id_token:
                return Response(
                    {'error': 'id_token not received from SSO'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Verify ID token signature using Keycloak's JWKS and extract claims
            payload = backend.verify_token(id_token, nonce=None)

            # Find or create the user from claims
            user = backend.get_or_create_user(access_token, id_token, payload)

        except Exception as exc:
            return Response(
                {'error': f'SSO failed: {exc}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if user is None:
            return Response({'error': 'User not found'}, status=status.HTTP_403_FORBIDDEN)
        if not user.is_active:
            return Response({'error': 'Account is inactive'}, status=status.HTTP_403_FORBIDDEN)

        # Issue our own SimpleJWT tokens — same shape as normal login response
        refresh = RefreshToken.for_user(user)
        return Response({
            'access':  str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id':          user.id,
                'email':       user.email,
                'username':    user.username,
                # Add any other user fields the frontend needs:
                # 'nama_lengkap': user.nama_lengkap,
                'role':        getattr(user, 'role', None),
                'is_verified': getattr(user, 'is_verified', True),
            },
        })
```

---

### 1.5 Register the URLs

#### In apps/accounts/urls.py — add this line:
```python
from django.urls import path
from . import views

urlpatterns = [
    # ... your existing auth URLs ...
    path('oidc/callback/', views.OIDCCallbackView.as_view(), name='oidc-callback'),
]
```

#### In config/urls.py — add the mozilla_django_oidc URLs:
```python
from django.urls import path, include

urlpatterns = [
    # ... existing ...
    path('oidc/', include('mozilla_django_oidc.urls')),   # needed internally
    path('api/v1/', include('api.v1.urls')),
]
```

The `oidc/` prefix mounts mozilla_django_oidc's session-based endpoints.
They are used internally by the middleware. The actual callback used by
the frontend flow is `/api/v1/auth/oidc/callback/`.

---

## Part 2 — Frontend (React + Vite)

### 2.1 Environment variables

Add to `.env` (and `.env.production` if separate):
```env
VITE_OIDC_AUTHORITY=https://<keycloak-host>/realms/<REALM>/protocol/openid-connect/auth
VITE_OIDC_CLIENT_ID=<your-client-id>
```

These are baked into the build at compile time by Vite.

---

### 2.2 Create OIDC utility — src/utils/oidc.js

```js
const AUTHORITY = import.meta.env.VITE_OIDC_AUTHORITY || ''
const CLIENT_ID = import.meta.env.VITE_OIDC_CLIENT_ID || ''
const SCOPE     = 'openid profile email'

/**
 * The redirect_uri sent to Keycloak — must match what is registered
 * in Keycloak's Valid Redirect URIs.
 * Always derived from window.location.origin so it works on any domain.
 */
export function getOidcRedirectUri() {
  return window.location.origin + '/auth/callback'
}

/**
 * Builds the full Keycloak authorization URL.
 * Call this when the user clicks "Login with SSO".
 *
 * prompt=login forces Keycloak to always show the login form, even if the
 * user has an active Keycloak session. This lets users switch accounts after
 * logging out of the app without needing to clear the Keycloak session cookie.
 * DO NOT remove prompt=login — without it, SSO silently re-authenticates the
 * previous user and logout appears broken.
 */
export function buildAuthorizationUrl() {
  const state = crypto.randomUUID()
  sessionStorage.setItem('oidc_state', state)

  const params = new URLSearchParams({
    response_type: 'code',
    client_id:     CLIENT_ID,
    redirect_uri:  getOidcRedirectUri(),
    scope:         SCOPE,
    state,
    prompt:        'login',
  })

  return `${AUTHORITY}?${params.toString()}`
}

/**
 * Returns true only when both env vars are set.
 * Use this to conditionally show/hide the SSO button.
 */
export function isSsoEnabled() {
  return Boolean(AUTHORITY && CLIENT_ID)
}
```

---

### 2.3 Update the Auth Store — src/store/authStore.js

No SSO-specific fields needed. The auth store is identical to a normal
JWT login store — `prompt=login` handles session switching on the Keycloak side.

```js
import { create } from 'zustand'

const useAuthStore = create((set, get) => ({
  user:         null,
  accessToken:  localStorage.getItem('access_token')  || null,
  refreshToken: localStorage.getItem('refresh_token') || null,
  isLoading:    false,

  setAuth: ({ user, access, refresh }) => {
    localStorage.setItem('access_token',  access)
    localStorage.setItem('refresh_token', refresh)
    set({ user, accessToken: access, refreshToken: refresh })
  },

  setUser: (user) => set({ user }),

  logout: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    set({ user: null, accessToken: null, refreshToken: null })
  },

  setLoading: (isLoading) => set({ isLoading }),
}))

export default useAuthStore
```

---

### 2.4 Add oidcCallback to auth service — src/services/auth.service.js

Add this method to your existing auth service:

```js
// Inside your authService object:
oidcCallback: (code, redirectUri) =>
  api.post('/auth/oidc/callback/', { code, redirect_uri: redirectUri }).then(r => r.data),
```

Assumes your Axios instance (`api`) has `baseURL: '/api/v1'`.

---

### 2.5 Create the OidcCallback page — src/pages/public/OidcCallback/index.jsx

Keycloak redirects the browser to `/auth/callback?code=...&state=...`.
This page handles that redirect.

```jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '@/services/auth.service'
import useAuthStore from '@/store/authStore'
import { getOidcRedirectUri } from '@/utils/oidc'

export default function OidcCallbackPage() {
  const navigate = useNavigate()
  const setAuth  = useAuthStore(s => s.setAuth)
  const [error, setError] = useState(null)

  useEffect(() => {
    const params     = new URLSearchParams(window.location.search)
    const code       = params.get('code')
    const state      = params.get('state')
    const savedState = sessionStorage.getItem('oidc_state')

    // CSRF protection: validate state parameter
    if (savedState && state && savedState !== state) {
      setError('State mismatch — possible CSRF attack. Please try again.')
      return
    }

    if (!code) {
      setError('No authorization code received from SSO.')
      return
    }

    authService.oidcCallback(code, getOidcRedirectUri())
      .then(data => {
        sessionStorage.removeItem('oidc_state')
        setAuth({ user: data.user, access: data.access, refresh: data.refresh })

        // Use window.location.replace, not navigate(), for reliable post-auth redirect.
        // navigate() from inside a .then() can race with React Router's state updates.
        window.location.replace('/')
      })
      .catch(err => {
        const msg = err.response?.data?.error || 'SSO login failed. Please try again.'
        setError(msg)
      })
  }, [])

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', minHeight: '100vh', padding: '2rem' }}>
        <h2>SSO Login Failed</h2>
        <p style={{ color: 'red' }}>{error}</p>
        <button onClick={() => window.location.replace('/login')}>
          Back to Login
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
                  minHeight: '100vh' }}>
      <p>Processing SSO login…</p>
    </div>
  )
}
```

---

### 2.6 Add SSO button to Login page

In your Login page component, add the SSO button:

```jsx
import { buildAuthorizationUrl, isSsoEnabled } from '@/utils/oidc'

// Inside the component:
const handleSsoLogin = () => {
  window.location.href = buildAuthorizationUrl()
}

// In the JSX:
{isSsoEnabled() && (
  <button onClick={handleSsoLogin} type="button">
    Login with SSO
  </button>
)}
```

`isSsoEnabled()` returns false when the env vars are not set, so the button
is hidden automatically in environments without SSO configured.

---

### 2.7 Logout handlers — local logout only

Because `prompt=login` forces Keycloak to show the login form every time,
there is no need to redirect to Keycloak's end_session endpoint on logout.
Just clear local tokens and navigate home. This works for both SSO and
normal login users identically.

```jsx
import useAuthStore from '@/store/authStore'

// Inside the component:
const logout = useAuthStore(s => s.logout)

const handleLogout = () => {
  logout()       // clears localStorage tokens
  navigate('/')
}
```

> **Why not redirect to Keycloak's logout endpoint?**
> Keycloak's logout endpoint behavior differs significantly across versions:
> - Pre-v18: uses `redirect_uri` parameter
> - v18+: uses `post_logout_redirect_uri` + `id_token_hint`
> - Some versions require `id_token_hint`, others don't
>
> Implementing this cross-version reliably is complex and fragile.
> `prompt=login` achieves the same UX goal (user must re-authenticate on
> next SSO) without touching Keycloak's logout endpoint at all.

---

### 2.8 Register the /auth/callback route

In your router file (e.g., `src/router/index.jsx`):

```jsx
import OidcCallbackPage from '@/pages/public/OidcCallback'

// Inside your routes:
{ path: 'auth/callback', element: <OidcCallbackPage /> }
```

This route must be **public** (no ProtectedRoute wrapper).

---

## Part 3 — Nginx Configuration

If the app runs behind nginx, the `/oidc/` path (mozilla_django_oidc's session
endpoints) must be proxied to the backend, not the frontend:

```nginx
location /oidc/ {
    proxy_pass http://backend;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $http_x_forwarded_proto;
}
```

**Important:** Use `$http_x_forwarded_proto` (pass through the upstream load
balancer's value), NOT `$scheme`. If you use `$scheme`, nginx rewrites it to
`http` (its own connection from the load balancer), and Django builds `http://`
callback URLs that Keycloak rejects.

Full recommended nginx location blocks for a Django + React setup:

```nginx
# Backend API
location /api/ {
    proxy_pass http://backend;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $http_x_forwarded_proto;
}

# Django admin
location /admin/ {
    proxy_pass http://backend;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $http_x_forwarded_proto;
}

# OIDC session endpoints (mozilla_django_oidc)
location /oidc/ {
    proxy_pass http://backend;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $http_x_forwarded_proto;
}

# React frontend (catch-all)
location / {
    proxy_pass http://frontend;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $http_x_forwarded_proto;
}
```

---

## Part 4 — Keycloak Configuration

### 4.1 Create the client

In Keycloak Admin → Clients → Create:

| Field | Value |
|---|---|
| Client ID | `<your-client-id>` (e.g. `myapp`) |
| Client Protocol | `openid-connect` |
| Access Type | `confidential` |
| Standard Flow Enabled | ON |
| Direct Access Grants | OFF (unless you need it) |

### 4.2 Configure client URLs

After creating, in the Settings tab:

| Field | Value |
|---|---|
| Root URL | `https://yourdomain.com` |
| Valid Redirect URIs | `https://yourdomain.com/auth/callback` |
| Web Origins | `https://yourdomain.com` |
| Backchannel Logout URL | (leave empty) |
| Backchannel Logout Session Required | OFF |
| Front Channel Logout | OFF |

Only one redirect URI needed — `/auth/callback`. No logout redirect URI
required because we use local-only logout (see section 2.7).

### 4.3 Get the client secret

Clients → your client → Credentials tab → copy the Secret value.
This goes into `OIDC_RP_CLIENT_SECRET` in your `.env`.

### 4.4 Map user roles (optional)

If your app uses roles, create matching roles in Keycloak:
- Clients → your client → Roles → Add Role

Then assign those roles to users under:
- Users → select user → Role Mappings → Client Roles → your client

The backend `_map_role()` method reads `claims['resource_access'][client_id]['roles']`
to map Keycloak role names to your app's role values.

---

## Part 5 — Gotchas and Common Errors

### "Invalid parameter: redirect_uri" from Keycloak
The `redirect_uri` sent by the frontend doesn't match what's registered in
Keycloak. Check:
1. `getOidcRedirectUri()` returns `window.location.origin + '/auth/callback'`
2. That exact URL is in Keycloak's Valid Redirect URIs (no trailing slash difference)
3. The scheme matches — must be `https://` in production, not `http://`

### 500 on all API endpoints after adding OIDC middleware
`SessionRefresh` is placed before `AuthenticationMiddleware` in MIDDLEWARE list.
Fix: move `SessionRefresh` to after `AuthenticationMiddleware`. See section 1.2.

### Django builds `http://` callback URLs instead of `https://`
Missing `SECURE_PROXY_SSL_HEADER` setting. Add to settings.py:
```python
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
```
Also ensure nginx passes `X-Forwarded-Proto $http_x_forwarded_proto` (not `$scheme`).

### User must manually refresh after SSO login
Using `navigate()` from React Router inside a `.then()` can race with component
lifecycle. Use `window.location.replace('/')` instead in OidcCallbackPage.

### After logout, SSO immediately re-authenticates the same user (auto-login)
Keycloak has an active session cookie in the browser. The app's `logout()` only
clears local JWT tokens, not the Keycloak session.
Fix: add `prompt=login` to `buildAuthorizationUrl()`. This forces Keycloak to
always show the login form regardless of whether a session exists. Users can
then choose any account or enter new credentials. DO NOT try to fix this by
redirecting to Keycloak's logout endpoint — that approach breaks across Keycloak
versions (see below).

### Keycloak logout endpoint errors ("Missing parameters: id_token_hint" / "Invalid redirect uri")
These errors come from trying to call Keycloak's end_session endpoint on logout.
The logout endpoint behavior changed between Keycloak versions:
- Pre-v18 uses `redirect_uri` parameter
- v18+ uses `post_logout_redirect_uri` + `id_token_hint` (OIDC RP-Initiated Logout spec)
- Some versions require `id_token_hint`, others accept `client_id` only
- "Post Logout Redirect URIs" field in Keycloak UI only exists in v18+

The correct fix is NOT to implement version-specific logout URLs.
Use `prompt=login` instead (see above) and keep logout local-only.

### SSO button doesn't appear
`isSsoEnabled()` returns false — `VITE_OIDC_AUTHORITY` or `VITE_OIDC_CLIENT_ID`
env vars are not set. Vite bakes these at build time — set them before building
the production image.

### "id_token not received from SSO"
The backend's `OIDCCallbackView` didn't receive an `id_token` from Keycloak.
Check that `openid` is included in the scope and that the client in Keycloak
has Standard Flow enabled.

### Keycloak roles not mapping correctly
Add `print(claims)` temporarily in `_map_role()` to see what Keycloak is
actually sending. Role names in `claims['realm_access']['roles']` vs
`claims['resource_access'][client_id]['roles']` depend on whether roles are
assigned at realm level or client level.

---

## Part 6 — Quick Checklist

### Backend
- [ ] `mozilla-django-oidc` in requirements.txt
- [ ] `mozilla_django_oidc` in INSTALLED_APPS
- [ ] `JDIHOIDCBackend` in AUTHENTICATION_BACKENDS (before ModelBackend)
- [ ] `SessionRefresh` middleware is AFTER `AuthenticationMiddleware`
- [ ] `SECURE_PROXY_SSL_HEADER` set (if behind reverse proxy)
- [ ] All 6 OIDC env vars set in .env
- [ ] `oidc.py` created with custom backend class
- [ ] `OIDCCallbackView` created in views.py
- [ ] `oidc/callback/` URL registered with name `oidc-callback`
- [ ] `path('oidc/', include('mozilla_django_oidc.urls'))` in config/urls.py

### Frontend
- [ ] `VITE_OIDC_AUTHORITY` and `VITE_OIDC_CLIENT_ID` in .env
- [ ] `src/utils/oidc.js` created with `prompt=login` in `buildAuthorizationUrl()`
- [ ] `oidcCallback` service method added
- [ ] `OidcCallback` page created at `src/pages/public/OidcCallback/index.jsx`
- [ ] OidcCallback uses `window.location.replace('/')` not `navigate()`
- [ ] `/auth/callback` route registered (public, no auth guard)
- [ ] SSO button on Login page calling `buildAuthorizationUrl()`
- [ ] Logout handlers call `logout()` + `navigate('/')` — no Keycloak redirect

### Keycloak
- [ ] Client created with Access Type: confidential
- [ ] `https://yourdomain.com/auth/callback` in Valid Redirect URIs
- [ ] `https://yourdomain.com` in Web Origins
- [ ] Backchannel Logout URL empty
- [ ] Backchannel Logout Session Required: OFF
- [ ] Client secret copied to `OIDC_RP_CLIENT_SECRET` in .env

### Nginx
- [ ] `/oidc/` location proxied to backend (not frontend)
- [ ] All proxy locations use `X-Forwarded-Proto $http_x_forwarded_proto`
