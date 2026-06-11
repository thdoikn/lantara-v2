"""
Security headers middleware — Phase 4 hardening.
Applied on every response. nginx also sets these, but defence-in-depth.
"""


class SecurityHeadersMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Prevent MIME-type sniffing
        response.setdefault("X-Content-Type-Options", "nosniff")
        # Block framing (also set by XFrameOptionsMiddleware, belt-and-suspenders)
        response.setdefault("X-Frame-Options", "DENY")
        # Referrer policy
        response.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        # Permissions policy — disable unused browser features
        response.setdefault(
            "Permissions-Policy",
            "camera=(), microphone=(), geolocation=(self), payment=()",
        )

        return response
