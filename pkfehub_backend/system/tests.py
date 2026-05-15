from rest_framework.test import APITestCase
from rest_framework import status
from users.models import User
from .models import SystemSetting


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


# ── Model tests ────────────────────────────────────────────────────────────

class SystemSettingModelTest(APITestCase):

    def test_str_returns_key_and_category(self):
        setting = SystemSetting.objects.create(key='ai_enabled', value='true', category='ai')
        self.assertIn('ai_enabled', str(setting))
        self.assertIn('ai', str(setting))

    def test_default_category_is_general(self):
        setting = SystemSetting.objects.create(key='site_name', value='PKFIE')
        self.assertEqual(setting.category, 'general')


# ── API tests ──────────────────────────────────────────────────────────────

class SystemSettingAPITest(APITestCase):

    BASE = '/api/settings/'

    def setUp(self):
        self.admin = make_admin()
        self.student = make_user()
        self.setting = SystemSetting.objects.create(
            key='maintenance_mode', value='false', category='general'
        )
        self.client.credentials(**auth_header(self.client, 'admin@pkfokam.edu', 'Admin1234!'))

    # — Access control —

    def test_staff_can_list_settings(self):
        res = self.client.get(self.BASE)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_student_cannot_list_settings(self):
        self.client.credentials(**auth_header(self.client, 'student@pkfokam.edu', 'Pass1234!'))
        res = self.client.get(self.BASE)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_cannot_list_settings(self):
        self.client.credentials()
        res = self.client.get(self.BASE)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    # — CRUD —

    def test_retrieve_setting_by_key(self):
        res = self.client.get(f'{self.BASE}maintenance_mode/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['value'], 'false')

    def test_create_setting(self):
        res = self.client.post(self.BASE, {
            'key': 'new_setting',
            'value': '42',
            'category': 'general',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(SystemSetting.objects.filter(key='new_setting').exists())

    def test_update_setting_value(self):
        res = self.client.patch(
            f'{self.BASE}maintenance_mode/',
            {'value': 'true'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.setting.refresh_from_db()
        self.assertEqual(self.setting.value, 'true')

    def test_delete_setting(self):
        res = self.client.delete(f'{self.BASE}maintenance_mode/')
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(SystemSetting.objects.filter(key='maintenance_mode').exists())

    # — Filter by category —

    def test_filter_by_category(self):
        SystemSetting.objects.create(key='ai_enabled', value='true', category='ai')
        res = self.client.get(f'{self.BASE}?category=ai')
        keys = [s['key'] for s in res.data]
        self.assertIn('ai_enabled', keys)
        self.assertNotIn('maintenance_mode', keys)

    # — create_defaults action —

    def test_create_defaults_action(self):
        res = self.client.post(f'{self.BASE}create_defaults/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('created', res.data)
        self.assertIn('total', res.data)
        self.assertTrue(SystemSetting.objects.filter(key='site_name').exists())
