# api/middleware.py
from django.http import JsonResponse
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.utils.deprecation import MiddlewareMixin


class JWTAuthenticationMiddleware(MiddlewareMixin):
    def process_request(self, request):
        # Skip authentication for these paths
        if request.path.startswith("/api/auth/") or request.path == "/":
            return None

        # Authenticate using JWT
        jwt_auth = JWTAuthentication()
        try:
            auth_result = jwt_auth.authenticate(request)
            if auth_result is not None:
                request.user, request.auth = auth_result
            else:
                return JsonResponse({"error": "Authentication required"}, status=401)
        except AuthenticationFailed as e:
            return JsonResponse({"error": str(e)}, status=401)

        return None
