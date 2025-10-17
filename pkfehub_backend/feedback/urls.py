from django.urls import path
from . import views

urlpatterns = [
    path(
        "categories/",
        views.FeedbackCategoryListView.as_view(),
        name="feedback-categories",
    ),
    path("", views.FeedbackSubmissionCreateView.as_view(), name="feedback-submit"),
    path("all/", views.FeedbackSubmissionListView.as_view(), name="feedback-list"),
    path("bulk/", views.FeedbackBulkActionView.as_view(), name="feedback-bulk"),
    path(
        "<int:feedback_id>/responses/",
        views.FeedbackResponseListCreateView.as_view(),
        name="feedback-responses",
    ),
    path(
        "<int:pk>/",
        views.FeedbackSubmissionDetailView.as_view(),
        name="feedback-detail",
    ),
]
