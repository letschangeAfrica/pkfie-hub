from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from users.permissions import IsNotParent
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
from django.core.mail import EmailMultiAlternatives
from django.conf import settings

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
        if request.user.email:
            _send_challenge_email(request.user, challenge)
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


def _display_name(user):
    """Return the friendliest available name for email greetings."""
    full = f"{getattr(user, 'first_name', '')} {getattr(user, 'last_name', '')}".strip()
    return full or getattr(user, "username", None) or getattr(user, "email", None) or "there"


def _send_community_welcome_email(user):
    name = _display_name(user)
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", None)
    subject = "Congratulations! You've joined the PKFokam Innovation Community"

    text_body = (
        f"Hi {name},\n\n"
        "Congratulations! You have successfully joined the PKFokam Innovation Hub Community.\n\n"
        "We're thrilled to have you with us. As a member you now have access to:\n"
        "  - Weekly innovation workshops\n"
        "  - Networking events with industry leaders\n"
        "  - Access to prototyping lab equipment\n"
        "  - Opportunities to showcase your projects at innovation fairs\n\n"
        "Head back to the Innovation Hub on PKFokam Hub to explore ongoing challenges,\n"
        "submit your projects, and connect with fellow innovators.\n\n"
        "Let's build the future together!\n\n"
        "Best regards,\n"
        "The PKFokam Innovation Hub Team"
    )

    html_body = f"""
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
          style="background:#ffffff;border-radius:16px;overflow:hidden;
                 box-shadow:0 4px 24px rgba(0,0,0,.08);max-width:600px;width:100%;">

          <!-- Gold header bar -->
          <tr>
            <td style="height:6px;background:linear-gradient(90deg,#FFD700,#FFEE55,#FFD700);"></td>
          </tr>

          <!-- Header -->
          <tr>
            <td align="center"
              style="background:linear-gradient(135deg,#000D2E 0%,#001F5B 60%,#001840 100%);
                     padding:48px 40px 40px;">
              <div style="width:72px;height:72px;background:rgba(255,215,0,.15);
                          border:1px solid rgba(255,215,0,.3);border-radius:20px;
                          display:inline-flex;align-items:center;justify-content:center;
                          margin-bottom:20px;font-size:32px;">
                &#9889;
              </div>
              <h1 style="margin:0 0 8px;font-size:26px;font-weight:900;color:#ffffff;
                         line-height:1.2;">Congratulations, {name}!</h1>
              <p style="margin:0;font-size:15px;color:rgba(255,255,255,.65);line-height:1.6;">
                You are now an official member of the<br/>
                <strong style="color:#FFD700;">PKFokam Innovation Hub Community</strong>
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.7;">
                Welcome aboard! We're excited to have you join a growing community of
                innovators, builders, and change-makers at PKFokam. Here's what's waiting
                for you:
              </p>

              <!-- Benefits list -->
              <table width="100%" cellpadding="0" cellspacing="0">
                {"".join(f'''
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:28px;vertical-align:top;padding-top:2px;">
                          <div style="width:20px;height:20px;background:#FFD700;border-radius:50%;
                                      display:inline-flex;align-items:center;justify-content:center;
                                      font-size:11px;font-weight:900;color:#001F5B;">✓</div>
                        </td>
                        <td style="font-size:14px;color:#334155;line-height:1.6;padding-left:10px;">
                          {b}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>''' for b in [
                    "Weekly innovation workshops and hands-on sessions",
                    "Networking events with industry leaders and alumni",
                    "Access to prototyping lab equipment and resources",
                    "Opportunities to showcase your projects at innovation fairs",
                    "Collaboration with talented peers across all programs",
                ])}
              </table>

              <p style="margin:28px 0 0;font-size:14px;color:#64748b;line-height:1.7;">
                Head back to the <strong style="color:#001F5B;">PKFokam Hub</strong> to
                explore ongoing challenges, submit your projects, and connect with fellow
                innovators in the community tab.
              </p>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td align="center" style="padding:0 40px 40px;">
              <a href="#" style="display:inline-block;padding:14px 36px;
                background:linear-gradient(135deg,#FFD700,#FFEE55,#FFD700);
                color:#001F5B;font-weight:900;font-size:14px;border-radius:12px;
                text-decoration:none;letter-spacing:.3px;">
                Go to Innovation Hub &rarr;
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:24px 40px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;text-align:center;">
                This email was sent to <strong>{user.email}</strong> because you joined the
                PKFokam Innovation Hub Community.<br/>
                &copy; {__import__('datetime').date.today().year} PKFokam Institute of Technology &amp; Innovation
              </p>
            </td>
          </tr>

          <!-- Bottom gold bar -->
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,#FFD700,#FFEE55,#FFD700);"></td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""

    try:
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_body,
            from_email=from_email,
            to=[user.email],
        )
        msg.attach_alternative(html_body, "text/html")
        msg.send(fail_silently=False)
    except Exception as e:
        print(f"[Innovation] Welcome email failed for {user.email}: {e}")


def _send_challenge_email(user, challenge):
    name = _display_name(user)
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", None)
    subject = f"You're in! '{challenge.title}' — PKFokam Innovation Hub"

    text_body = (
        f"Hi {name},\n\n"
        f'You have successfully registered for the challenge: "{challenge.title}".\n\n'
        f"Details:\n"
        f"  Description: {challenge.description}\n"
        f"  Deadline: {challenge.deadline}\n"
        f"  Prize: {challenge.prize}\n\n"
        "Good luck and stay innovative!\n\n"
        "Best regards,\nThe PKFokam Innovation Hub Team"
    )

    html_body = f"""
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
        style="background:#fff;border-radius:16px;overflow:hidden;
               box-shadow:0 4px 24px rgba(0,0,0,.08);max-width:600px;width:100%;">
        <tr><td style="height:6px;background:linear-gradient(90deg,#FFD700,#FFEE55,#FFD700);"></td></tr>
        <tr>
          <td align="center"
            style="background:linear-gradient(135deg,#000D2E 0%,#001F5B 60%,#001840 100%);
                   padding:40px 40px 36px;">
            <h1 style="margin:0 0 8px;font-size:24px;font-weight:900;color:#FFD700;">
              You're registered, {name}!
            </h1>
            <p style="margin:0;font-size:14px;color:rgba(255,255,255,.7);">
              Challenge: <strong style="color:#fff;">{challenge.title}</strong>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            <table width="100%" cellpadding="0" cellspacing="0"
              style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;padding:20px;margin-bottom:24px;">
              <tr>
                <td style="font-size:13px;color:#64748b;padding-bottom:10px;font-weight:700;
                           text-transform:uppercase;letter-spacing:.8px;">Challenge Details</td>
              </tr>
              <tr>
                <td style="font-size:14px;color:#334155;line-height:1.7;">
                  <strong>Description:</strong> {challenge.description}<br/>
                  <strong>Deadline:</strong> {challenge.deadline}<br/>
                  <strong>Prize:</strong> <span style="color:#D97706;font-weight:900;">{challenge.prize}</span>
                </td>
              </tr>
            </table>
            <p style="margin:0;font-size:14px;color:#64748b;line-height:1.7;">
              Prepare your best solution and submit it before the deadline. Good luck!
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
              &copy; {__import__('datetime').date.today().year} PKFokam Institute of Technology &amp; Innovation
            </p>
          </td>
        </tr>
        <tr><td style="height:4px;background:linear-gradient(90deg,#FFD700,#FFEE55,#FFD700);"></td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
"""

    try:
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_body,
            from_email=from_email,
            to=[user.email],
        )
        msg.attach_alternative(html_body, "text/html")
        msg.send(fail_silently=False)
    except Exception as e:
        print(f"[Innovation] Challenge email failed for {user.email}: {e}")


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsNotParent])
def join_community(request):
    obj, created = InnovationCommunityMember.objects.get_or_create(user=request.user)

    if not created:
        return Response(
            {"status": "already_member", "already_member": True},
            status=status.HTTP_200_OK,
        )

    if request.user.email:
        _send_community_welcome_email(request.user)

    return Response(
        {"status": "joined", "already_member": False},
        status=status.HTTP_200_OK,
    )
