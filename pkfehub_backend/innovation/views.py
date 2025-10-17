from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from users.permissions import IsNotParent  # Import your custom permission here
from .models import (
    InnovationProject,
    InnovationChallenge,
    InnovationResource,
    InnovationCommunityMember,
)
from .serializers import (
    InnovationProjectSerializer,
    InnovationChallengeSerializer,
    InnovationResourceSerializer,
    InnovationCommunityMemberSerializer,
)
from django.contrib.auth import get_user_model
from django.db.models import Count
from django.core.mail import send_mail  # For sending emails
from django.conf import settings  # For getting DEFAULT_FROM_EMAIL

User = get_user_model()


class InnovationProjectViewSet(viewsets.ModelViewSet):
    queryset = InnovationProject.objects.all().order_by("-created_at")
    serializer_class = InnovationProjectSerializer
    permission_classes = [IsAuthenticated, IsNotParent]

    def perform_create(self, serializer):
        serializer.save(
            submitted_by=(
                self.request.user if self.request.user.is_authenticated else None
            )
        )


class InnovationChallengeViewSet(viewsets.ModelViewSet):
    queryset = InnovationChallenge.objects.all().order_by("-deadline")
    serializer_class = InnovationChallengeSerializer
    # Only allow non-parent authenticated users to access this ViewSet
    permission_classes = [IsAuthenticated, IsNotParent]

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[IsAuthenticated, IsNotParent],
    )
    def participate(self, request, pk=None):
        challenge = self.get_object()
        challenge.participants.add(request.user)
        # --- Send participation email to the user if email exists ---
        if request.user.email:
            try:
                # Compose a friendly greeting name using first_name and last_name if available, otherwise fallback
                username = (
                    (
                        f"{getattr(request.user, 'first_name', '')} {getattr(request.user, 'last_name', '')}"
                    ).strip()
                    or getattr(request.user, "username", None)
                    or getattr(request.user, "email", None)
                    or "there"
                )
                send_mail(
                    subject=f"Thank you for joining '{challenge.title}'!",
                    message=(
                        f"Hi {username},\n\n"
                        f'Thank you for participating in the challenge: "{challenge.title}".\n\n'
                        f"Challenge Details:\n"
                        f"Title: {challenge.title}\n"
                        f"Description: {challenge.description}\n"
                        f"Deadline: {challenge.deadline}\n"
                        f"Prize: {challenge.prize}\n\n"
                        "Good luck and stay innovative!\n\n"
                        "Best regards,\nInnovation Hub Team"
                    ),
                    from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None),
                    recipient_list=[request.user.email],
                    fail_silently=True,
                )
            except Exception as e:
                # Optionally log the error
                print("EMAIL ERROR:", e)
        # -----------------------------------------------------------
        return Response({"status": "participated"}, status=status.HTTP_200_OK)


class InnovationResourceViewSet(viewsets.ModelViewSet):
    queryset = InnovationResource.objects.all()
    serializer_class = InnovationResourceSerializer
    # Only allow non-parent authenticated users to access this ViewSet
    permission_classes = [IsAuthenticated, IsNotParent]


@api_view(["GET"])
def community_stats(request):
    stats = {
        "active_projects": InnovationProject.objects.filter(
            status="in-progress"
        ).count(),
        "members": InnovationCommunityMember.objects.count(),
        "completed_solutions": InnovationProject.objects.filter(
            status="completed"
        ).count(),
    }
    return Response(stats)


@api_view(["POST"])
@permission_classes(
    [IsAuthenticated, IsNotParent]
)  # Only non-parent authenticated users can join
def join_community(request):
    obj, created = InnovationCommunityMember.objects.get_or_create(user=request.user)
    # --- Send join email to the user if email exists and it's their first join ---
    if created and request.user.email:
        username = (
            (
                f"{getattr(request.user, 'first_name', '')} {getattr(request.user, 'last_name', '')}"
            ).strip()
            or getattr(request.user, "username", None)
            or getattr(request.user, "email", None)
            or "there"
        )
        try:
            send_mail(
                subject="Welcome to the Innovation Community!",
                message=(
                    f"Hi {username},\n\n"
                    "You have successfully joined the Innovation Hub community! 🎉\n\n"
                    "We're excited to have you on board. Stay tuned for:\n"
                    "- Weekly innovation workshops\n"
                    "- Networking events with industry leaders\n"
                    "- Access to prototyping lab equipment\n"
                    "- Opportunities to showcase your work\n\n"
                    "Let's innovate together!\n\n"
                    "Best regards,\nInnovation Hub Team"
                ),
                from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None),
                recipient_list=[request.user.email],
                fail_silently=False,  # Set to False for debugging; True for production
            )
        except Exception as e:
            print("EMAIL ERROR:", e)
    return Response(
        {"status": "joined"},
        status=status.HTTP_200_OK,
    )
