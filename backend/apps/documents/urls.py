from django.urls import path, include
from rest_framework_nested import routers as nested_routers
from rest_framework.routers import DefaultRouter

# These are nested under /submissions/{submission_pk}/documents/
# The parent submission router registers them in submissions/urls.py
# For direct access, just expose an empty list here
urlpatterns: list = []
