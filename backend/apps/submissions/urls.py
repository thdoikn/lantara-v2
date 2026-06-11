from django.urls import path
from rest_framework.permissions import IsAuthenticated
from rest_framework.routers import DefaultRouter
from rest_framework.views import APIView

from apps.documents.views import DocumentViewSet

from .views import SubmissionViewSet

router = DefaultRouter()
router.register("", SubmissionViewSet, basename="submission")


class SubmissionDocumentView(APIView):
    """Nested: /submissions/{pk}/documents/"""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk=None):
        return DocumentViewSet().list(request, submission_pk=pk)

    def post(self, request, pk=None):
        return DocumentViewSet().create(request, submission_pk=pk)


urlpatterns = router.urls + [
    path("<uuid:pk>/documents/", SubmissionDocumentView.as_view(), name="submission-documents"),
]
