from django.urls import path

from .views import GenerateDraftView, PublicValidateView, PublishPermitView

urlpatterns = [
    # Query-param form accepts a UUID *or* a reference number (which contains slashes).
    path("validate/", PublicValidateView.as_view(), name="permit-validate-code"),
    path("validate/<uuid:uuid>/", PublicValidateView.as_view(), name="permit-validate"),
    path(
        "<uuid:submission_id>/generate-draft/", GenerateDraftView.as_view(), name="generate-draft"
    ),
    path("<uuid:submission_id>/publish/", PublishPermitView.as_view(), name="permit-publish"),
]
