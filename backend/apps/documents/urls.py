from django.urls import path
from .views import DocumentViewSet

router_list = DocumentViewSet.as_view({"get": "list", "post": "create"})
router_detail = DocumentViewSet.as_view({"get": "retrieve", "delete": "destroy"})

urlpatterns = [
    path("", router_list, name="document-list"),
    path("<uuid:pk>/", router_detail, name="document-detail"),
]
