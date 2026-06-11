from django.urls import path
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import FAQ, DirectPermit, TenantCard


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
]
