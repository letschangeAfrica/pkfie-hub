# users/permissions.py
from rest_framework.permissions import BasePermission


class IsNotParent(BasePermission):
    def has_permission(self, request, view):
        print(
            "DEBUG: IsNotParent check for user:",
            request.user,
            "role:",
            getattr(request.user, "role", None),
        )
        return hasattr(request.user, "role") and request.user.role != "parent"
