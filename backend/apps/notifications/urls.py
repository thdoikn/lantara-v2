from django.urls import path

from .views import NotificationListView, NotificationMarkReadView, NotificationUnreadCountView

urlpatterns = [
    path("", NotificationListView.as_view(), name="notifications"),
    path("mark-read/", NotificationMarkReadView.as_view(), name="notifications-mark-read"),
    path("unread-count/", NotificationUnreadCountView.as_view(), name="notifications-unread"),
]
