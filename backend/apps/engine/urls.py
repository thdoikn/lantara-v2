from rest_framework.routers import DefaultRouter

from .views import PermitTypeViewSet, SektorViewSet

router = DefaultRouter()
router.register("sektor", SektorViewSet, basename="sektor")
router.register("permit-types", PermitTypeViewSet, basename="permit-type")

urlpatterns = router.urls
