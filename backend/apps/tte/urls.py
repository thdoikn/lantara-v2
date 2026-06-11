from django.urls import path

from .views import TTESignView, TTEStatusView

urlpatterns = [
    path("<uuid:permit_id>/sign/", TTESignView.as_view(), name="tte-sign"),
    path("<uuid:permit_id>/status/", TTEStatusView.as_view(), name="tte-status"),
]
