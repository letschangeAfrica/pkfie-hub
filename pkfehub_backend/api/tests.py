from rest_framework.test import APITestCase
from rest_framework import status
from users.models import User


# ── Helpers ────────────────────────────────────────────────────────────────

def make_user(email='student@pkfokam.edu', password='Pass1234!', role='student'):
    return User.objects.create_user(
        email=email, password=password, role=role,
        first_name='Alice', last_name='Ngo',
    )


def make_admin(email='admin@pkfokam.edu', password='Admin1234!'):
    return User.objects.create_superuser(
        email=email, password=password, first_name='Admin', last_name='User',
    )


def auth_header(client, email, password):
    res = client.post('/api/auth/login/', {'email': email, 'password': password}, format='json')
    return {'HTTP_AUTHORIZATION': f'Bearer {res.data["access"]}'}


# ── Dashboard data tests ───────────────────────────────────────────────────

class DashboardDataAPITest(APITestCase):

    URL = '/api/dashboard/'

    def setUp(self):
        self.admin = make_admin()
        self.student = make_user()

    def test_admin_can_access_dashboard(self):
        self.client.credentials(**auth_header(self.client, 'admin@pkfokam.edu', 'Admin1234!'))
        res = self.client.get(self.URL)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_student_cannot_access_dashboard(self):
        self.client.credentials(**auth_header(self.client, 'student@pkfokam.edu', 'Pass1234!'))
        res = self.client.get(self.URL)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_cannot_access_dashboard(self):
        res = self.client.get(self.URL)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_response_contains_stats_block(self):
        self.client.credentials(**auth_header(self.client, 'admin@pkfokam.edu', 'Admin1234!'))
        res = self.client.get(self.URL)
        self.assertIn('stats', res.data)

    def test_stats_block_has_required_keys(self):
        self.client.credentials(**auth_header(self.client, 'admin@pkfokam.edu', 'Admin1234!'))
        res = self.client.get(self.URL)
        stats = res.data['stats']
        for key in ('totalUsers', 'activeUsers', 'totalDocuments', 'totalConversations',
                    'pendingFeedback', 'upcomingEvents', 'totalAnnouncements'):
            self.assertIn(key, stats)

    def test_total_users_counts_correctly(self):
        self.client.credentials(**auth_header(self.client, 'admin@pkfokam.edu', 'Admin1234!'))
        res = self.client.get(self.URL)
        # admin + student created in setUp
        self.assertGreaterEqual(res.data['stats']['totalUsers'], 2)

    def test_response_contains_system_status(self):
        self.client.credentials(**auth_header(self.client, 'admin@pkfokam.edu', 'Admin1234!'))
        res = self.client.get(self.URL)
        self.assertIn('systemStatus', res.data)
        system = res.data['systemStatus']
        for key in ('database', 'api', 'aiService', 'storage'):
            self.assertIn(key, system)

    def test_database_status_is_online(self):
        self.client.credentials(**auth_header(self.client, 'admin@pkfokam.edu', 'Admin1234!'))
        res = self.client.get(self.URL)
        self.assertEqual(res.data['systemStatus']['database'], 'online')

    def test_response_contains_recent_activities(self):
        self.client.credentials(**auth_header(self.client, 'admin@pkfokam.edu', 'Admin1234!'))
        res = self.client.get(self.URL)
        self.assertIn('recentActivities', res.data)
        self.assertIsInstance(res.data['recentActivities'], list)


# ── Registrations per month tests ──────────────────────────────────────────

class RegistrationsPerMonthAPITest(APITestCase):

    URL = '/api/registrations-per-month/'

    def setUp(self):
        self.admin = make_admin()
        self.student = make_user()

    def test_admin_can_access_endpoint(self):
        self.client.credentials(**auth_header(self.client, 'admin@pkfokam.edu', 'Admin1234!'))
        res = self.client.get(self.URL)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_student_cannot_access_endpoint(self):
        self.client.credentials(**auth_header(self.client, 'student@pkfokam.edu', 'Pass1234!'))
        res = self.client.get(self.URL)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_response_has_labels_and_data(self):
        self.client.credentials(**auth_header(self.client, 'admin@pkfokam.edu', 'Admin1234!'))
        res = self.client.get(self.URL)
        self.assertIn('labels', res.data)
        self.assertIn('data', res.data)

    def test_returns_ten_months(self):
        self.client.credentials(**auth_header(self.client, 'admin@pkfokam.edu', 'Admin1234!'))
        res = self.client.get(self.URL)
        self.assertEqual(len(res.data['labels']), 10)
        self.assertEqual(len(res.data['data']), 10)

    def test_data_values_are_non_negative_integers(self):
        self.client.credentials(**auth_header(self.client, 'admin@pkfokam.edu', 'Admin1234!'))
        res = self.client.get(self.URL)
        for count in res.data['data']:
            self.assertGreaterEqual(count, 0)

    def test_current_month_has_at_least_two_registrations(self):
        self.client.credentials(**auth_header(self.client, 'admin@pkfokam.edu', 'Admin1234!'))
        res = self.client.get(self.URL)
        # The last entry in data is the current month; admin + student were just created
        self.assertGreaterEqual(res.data['data'][-1], 2)
