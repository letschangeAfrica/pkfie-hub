from rest_framework.test import APITestCase
from rest_framework import status
from users.models import User
from .models import AdminAction, AuditLog, SystemSetting


# ── Helpers ────────────────────────────────────────────────────────────────

def make_user(email='student@pkfokam.edu', password='Pass1234!', role='student'):
    return User.objects.create_user(
        email=email, password=password, role=role,
        first_name='Alice', last_name='Ngo', is_verified=True,
    )


def make_admin(email='admin@pkfokam.edu', password='Admin1234!'):
    return User.objects.create_superuser(
        email=email, password=password, first_name='Admin', last_name='User',
    )


def auth_header(client, email, password):
    res = client.post('/api/auth/login/', {'email': email, 'password': password}, format='json')
    return {'HTTP_AUTHORIZATION': f'Bearer {res.data["access"]}'}


# ── Model tests ────────────────────────────────────────────────────────────

class AdminActionModelTest(APITestCase):

    def test_str_contains_email_and_action(self):
        admin = make_admin()
        action = AdminAction.objects.create(admin=admin, action_type='deleted_user')
        self.assertIn(admin.email, str(action))
        self.assertIn('deleted_user', str(action))


class AuditLogModelTest(APITestCase):

    def test_str_contains_action_and_resource(self):
        log = AuditLog.objects.create(action='update', resource_type='Document')
        self.assertIn('update', str(log))
        self.assertIn('Document', str(log))


class SystemSettingModelTest(APITestCase):

    def test_str_returns_key(self):
        setting = SystemSetting.objects.create(
            setting_key='max_file_size', setting_value='10'
        )
        self.assertEqual(str(setting), 'max_file_size')


# ── Analytics API tests ────────────────────────────────────────────────────

class AnalyticsDashboardSummaryTest(APITestCase):

    URL = '/api/analytics/summary/'

    def setUp(self):
        self.admin = make_admin()
        self.student = make_user()

    def test_admin_can_access_summary(self):
        self.client.credentials(**auth_header(self.client, 'admin@pkfokam.edu', 'Admin1234!'))
        res = self.client.get(self.URL)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_student_cannot_access_summary(self):
        self.client.credentials(**auth_header(self.client, 'student@pkfokam.edu', 'Pass1234!'))
        res = self.client.get(self.URL)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_cannot_access_summary(self):
        res = self.client.get(self.URL)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_response_has_expected_keys(self):
        self.client.credentials(**auth_header(self.client, 'admin@pkfokam.edu', 'Admin1234!'))
        res = self.client.get(self.URL)
        for key in ('date', 'total_users', 'active_users', 'total_messages', 'recent_actions'):
            self.assertIn(key, res.data)

    def test_recent_actions_is_list(self):
        self.client.credentials(**auth_header(self.client, 'admin@pkfokam.edu', 'Admin1234!'))
        res = self.client.get(self.URL)
        self.assertIsInstance(res.data['recent_actions'], list)
