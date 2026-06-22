const AUTHORITY = import.meta.env.VITE_OIDC_AUTHORITY || "";
const CLIENT_ID = import.meta.env.VITE_OIDC_CLIENT_ID || "";
const SCOPE = "openid profile email";

/** Absolute redirect URI sent to Keycloak — must match Valid Redirect URIs in Keycloak console. */
export function getOidcRedirectUri(): string {
  return `${window.location.origin}/auth/callback`;
}

/**
 * Builds the Keycloak authorization URL and stores a CSRF state token.
 * prompt=login forces Keycloak to show the login form even when a session exists —
 * this makes logout work without hitting the Keycloak end_session endpoint.
 */
export function buildAuthorizationUrl(): string {
  const state = crypto.randomUUID();
  sessionStorage.setItem("oidc_state", state);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: getOidcRedirectUri(),
    scope: SCOPE,
    state,
    prompt: "login",
  });

  return `${AUTHORITY}?${params.toString()}`;
}

/** Returns true only when both OIDC env vars are set (controls SSO button visibility). */
export function isSsoEnabled(): boolean {
  return Boolean(AUTHORITY && CLIENT_ID);
}
