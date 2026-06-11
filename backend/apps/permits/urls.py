from django.urls import path
from .views import GenerateDraftView, PublicValidateView

urlpatterns = [
    path("validate/<uuid:uuid>/", PublicValidateView.as_view(), name="permit-validate"),
    path("<uuid:submission_id>/generate-draft/", GenerateDraftView.as_view(), name="generate-draft"),
]
