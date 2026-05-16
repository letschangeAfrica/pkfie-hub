from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from .models import User, UserProfile


# ── Helpers ────────────────────────────────────────────────────────────────

def make_user(email='student@pkfokam.edu', password='Pass1234!', role='student', **kw):
    return User.objects.create_user(
        email=email, password=password, role=role,
        first_name=kw.get('first_name', 'Alice'),
        last_name=kw.get('last_name', 'Ngo'),
    )


def make_admin(email='admin@pkfokam.edu', password='Admin1234!'):
    return User.objects.create_superuser(
        email=email, password=password,
        first_name='Admin', last_name='User',
    )


def auth_header(client, email, password):
    res = client.post('/api/auth/login/', {'email': email, 'password': password}, format='json')
    return {'HTTP_AUTHORIZATION': f'Bearer {res.data["access"]}'}


# ── Model tests ────────────────────────────────────────────────────────────

class UserModelTest(TestCase):

    def test_create_user_requires_email(self):
        with self.assertRaises(ValueError):
            User.objects.create_user(email='', password='Pass1234!')

    def test_email_is_normalised_on_create(self):
        # normalize_email lowercases the domain only, not the local part
        user = make_user(email='Student@PKFOKAM.EDU')
        self.assertEqual(user.email, 'Student@pkfokam.edu')

    def test_str_contains_name_and_email(self):
        user = make_user()
        self.assertIn('Alice', str(user))
        self.assertIn('student@pkfokam.edu', str(user))

    def test_default_role_is_student(self):
        user = make_user()
        self.assertEqual(user.role, 'student')

    def test_profile_auto_created_when_user_saved(self):
        user = make_user()
        self.assertTrue(UserProfile.objects.filter(user=user).exists())

    def test_create_superuser_assigns_admin_role(self):
        admin = make_admin()
        self.assertEqual(admin.role, 'admin')
        self.assertTrue(admin.is_staff)
        self.assertTrue(admin.is_superuser)

    def test_create_superuser_rejects_is_staff_false(self):
        with self.assertRaises(ValueError):
            User.objects.create_superuser(
                email='bad@pkfokam.edu', password='Pass1234!',
                first_name='X', last_name='Y', is_staff=False,
            )

    def test_create_superuser_rejects_is_superuser_false(self):
        with self.assertRaises(ValueError):
            User.objects.create_superuser(
                email='bad2@pkfokam.edu', password='Pass1234!',
                first_name='X', last_name='Y', is_superuser=False,
            )


# ── Register endpoint ──────────────────────────────────────────────────────

class RegisterViewTest(APITestCase):

    URL = '/api/auth/register/'

    def test_valid_registration_returns_201_and_tokens(self):
        res = self.client.post(self.URL, {
            'email': 'new@pkfokam.edu', 'password': 'StrongP@ss1', 'password2': 'StrongP@ss1',
            'first_name': 'Bob', 'last_name': 'Mbella', 'role': 'student',
            'student_id': 'PKF2024001',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertIn('access', res.data)
        self.assertNotIn('refresh', res.data)  # refresh is in the httpOnly cookie
        self.assertIn('refresh_token', self.client.cookies)

    def test_duplicate_email_returns_400(self):
        make_user()
        res = self.client.post(self.URL, {
            'email': 'student@pkfokam.edu', 'password': 'StrongP@ss1',
            'first_name': 'Dup', 'last_name': 'User',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_missing_email_returns_400(self):
        res = self.client.post(self.URL, {
            'password': 'StrongP@ss1', 'first_name': 'X', 'last_name': 'Y',
        }, format='json')
        self.assertNotEqual(res.status_code, status.HTTP_201_CREATED)


# ── Login endpoint ─────────────────────────────────────────────────────────

class LoginViewTest(APITestCase):

    URL = '/api/auth/login/'

    def setUp(self):
        self.user = make_user()

    def test_correct_credentials_return_tokens(self):
        res = self.client.post(self.URL, {
            'email': 'student@pkfokam.edu', 'password': 'Pass1234!',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('access', res.data)
        self.assertNotIn('refresh', res.data)  # refresh is in the httpOnly cookie
        self.assertIn('refresh_token', self.client.cookies)

    def test_wrong_password_returns_401(self):
        res = self.client.post(self.URL, {
            'email': 'student@pkfokam.edu', 'password': 'wrongpass',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_missing_password_returns_400(self):
        res = self.client.post(self.URL, {'email': 'student@pkfokam.edu'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_inactive_user_returns_401(self):
        self.user.is_active = False
        self.user.save()
        res = self.client.post(self.URL, {
            'email': 'student@pkfokam.edu', 'password': 'Pass1234!',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_response_includes_role(self):
        res = self.client.post(self.URL, {
            'email': 'student@pkfokam.edu', 'password': 'Pass1234!',
        }, format='json')
        self.assertEqual(res.data['user']['role'], 'student')


# ── Profile endpoint ───────────────────────────────────────────────────────

class ProfileViewTest(APITestCase):

    URL = '/api/auth/profile/'

    def setUp(self):
        self.user = make_user()
        self.client.credentials(**auth_header(self.client, 'student@pkfokam.edu', 'Pass1234!'))

    def test_get_own_profile_returns_200(self):
        res = self.client.get(self.URL)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['email'], 'student@pkfokam.edu')

    def test_unauthenticated_get_returns_401(self):
        self.client.credentials()
        res = self.client.get(self.URL)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_update_first_name(self):
        res = self.client.put(self.URL, {'first_name': 'Updated'}, format='multipart')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['user']['first_name'], 'Updated')


# ── Change password endpoint ───────────────────────────────────────────────

class ChangePasswordViewTest(APITestCase):

    URL = '/api/auth/change-password/'

    def setUp(self):
        make_user()
        self.client.credentials(**auth_header(self.client, 'student@pkfokam.edu', 'Pass1234!'))

    def test_correct_current_password_changes_password(self):
        res = self.client.post(self.URL, {
            'current_password': 'Pass1234!',
            'new_password': 'NewStr0ng!Pass',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_wrong_current_password_returns_400(self):
        res = self.client.post(self.URL, {
            'current_password': 'wrongone',
            'new_password': 'NewStr0ng!Pass',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


# ── Admin user management endpoints ───────────────────────────────────────

class UserAdminEndpointTest(APITestCase):

    def setUp(self):
        self.admin = make_admin()
        self.student = make_user()
        self.client.credentials(**auth_header(self.client, 'admin@pkfokam.edu', 'Admin1234!'))

    def test_admin_can_list_all_users(self):
        res = self.client.get('/api/users/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_student_cannot_list_users(self):
        self.client.credentials(**auth_header(self.client, 'student@pkfokam.edu', 'Pass1234!'))
        res = self.client.get('/api/users/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_retrieve_specific_user(self):
        res = self.client.get(f'/api/users/{self.student.pk}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['email'], 'student@pkfokam.edu')

    def test_admin_can_deactivate_user(self):
        res = self.client.patch(
            f'/api/users/{self.student.pk}/', {'is_active': False}, format='json'
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.student.refresh_from_db()
        self.assertFalse(self.student.is_active)

    def test_admin_can_delete_user(self):
        res = self.client.delete(f'/api/users/{self.student.pk}/')
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(User.objects.filter(pk=self.student.pk).exists())

    def test_search_by_first_name(self):
        res = self.client.get('/api/users/?search=Alice')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # Alice is the student's first name created in setUp
        emails = [u['email'] for u in res.data]
        self.assertIn('student@pkfokam.edu', emails)

    def test_unauthenticated_cannot_access_user_list(self):
        self.client.credentials()
        res = self.client.get('/api/users/')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
