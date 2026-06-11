from django.urls import path

from .views import BySektorView, ExportExcelView, SLAView, SummaryView, TrendView

urlpatterns = [
    path("summary/", SummaryView.as_view(), name="analytics-summary"),
    path("by-sektor/", BySektorView.as_view(), name="analytics-by-sektor"),
    path("sla/", SLAView.as_view(), name="analytics-sla"),
    path("trend/", TrendView.as_view(), name="analytics-trend"),
    path("export/excel/", ExportExcelView.as_view(), name="analytics-export-excel"),
]
