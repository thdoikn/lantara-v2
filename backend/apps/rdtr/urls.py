from django.urls import path

from .views import KBLICheckView, PointLookupView, ZoneDetailView, ZoneListView

urlpatterns = [
    path("zones/", ZoneListView.as_view(), name="rdtr-zones"),
    path("zones/<str:zone_code>/", ZoneDetailView.as_view(), name="rdtr-zone-detail"),
    path("lookup/", PointLookupView.as_view(), name="rdtr-lookup"),
    path("kbli-check/", KBLICheckView.as_view(), name="rdtr-kbli-check"),
]
