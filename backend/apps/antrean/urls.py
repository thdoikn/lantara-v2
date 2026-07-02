from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    AdminInstansiViewSet,
    AntreanAnalyticsView,
    CheckinScanView,
    CounterStaffAssignmentViewSet,
    DisplayBoardView,
    InstansiViewSet,
    KioskTakeView,
    LayananViewSet,
    LoketViewSet,
    MonitorView,
    QueueParameterViewSet,
    StaffUserSearchView,
    TicketViewSet,
)

router = DefaultRouter()
router.register("instansi", InstansiViewSet, basename="antrean-instansi")
router.register("tickets", TicketViewSet, basename="antrean-ticket")
router.register("loket", LoketViewSet, basename="antrean-loket")
router.register("layanan", LayananViewSet, basename="antrean-layanan")
router.register("parameters", QueueParameterViewSet, basename="antrean-parameter")
router.register("staff", CounterStaffAssignmentViewSet, basename="antrean-staff")
router.register("admin/instansi", AdminInstansiViewSet, basename="antrean-admin-instansi")

urlpatterns = router.urls + [
    path("monitor/", MonitorView.as_view(), name="antrean-monitor"),
    path("analytics/", AntreanAnalyticsView.as_view(), name="antrean-analytics"),
    path("staff-users/", StaffUserSearchView.as_view(), name="antrean-staff-users"),
    path("kiosk/take/", KioskTakeView.as_view(), name="antrean-kiosk-take"),
    path("checkin/", CheckinScanView.as_view(), name="antrean-checkin-scan"),
    path(
        "display-board/<slug:instansi_key>/",
        DisplayBoardView.as_view(),
        name="antrean-display-board",
    ),
]
