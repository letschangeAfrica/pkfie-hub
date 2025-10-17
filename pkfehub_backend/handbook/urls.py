from django.urls import path
from .views import HandbookSectionListView, HandbookSectionDetailView

urlpatterns = [
    path("", HandbookSectionListView.as_view(), name="handbook-list"),
    path("<str:key>/", HandbookSectionDetailView.as_view(), name="handbook-detail"),
]
