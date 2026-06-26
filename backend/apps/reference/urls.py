from django.urls import path
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import FAQ, DirectPermit, Direktorat, TenantCard


class DirektoratListView(APIView):
    """All active Direktorat (with kedeputian) — feeds the admin sektor picker."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = (
            Direktorat.objects.filter(is_active=True)
            .select_related("kedeputian")
            .order_by("kedeputian__order", "order", "name")
        )
        data = [
            {
                "id": str(d.id),
                "key": d.key,
                "name": d.name,
                "kedeputian_name": d.kedeputian.name if d.kedeputian_id else None,
            }
            for d in qs
        ]
        return Response(data)


class FAQListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        faqs = FAQ.objects.filter(is_active=True).values(
            "id", "question", "answer", "category", "order"
        )
        return Response(list(faqs))


class TenantCardListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        cards = TenantCard.objects.filter(is_active=True).values(
            "id", "name", "description", "website_url", "order"
        )
        return Response(list(cards))


class DirectPermitListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        permits = DirectPermit.objects.filter(is_active=True).values(
            "id", "title", "description", "icon", "permit_type_key", "external_url", "order"
        )
        return Response(list(permits))


urlpatterns = [
    path("faqs/", FAQListView.as_view(), name="faqs"),
    path("tenants/", TenantCardListView.as_view(), name="tenants"),
    path("direct-permits/", DirectPermitListView.as_view(), name="direct-permits"),
    path("direktorat/", DirektoratListView.as_view(), name="direktorat-list"),
]
