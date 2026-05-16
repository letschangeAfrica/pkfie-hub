from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from django.utils import timezone
from datetime import timedelta
from users.models import User
from .models import Announcement, AnnouncementView


# ── Helpers ────────────────────────────────────────────────────────────────

def make_user(email='user@pkfokam.edu', password='Pass1234!', role='student'):
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


def make_announcement(author, title='Test Notice', priority='normal', active=True, days_ahead=7):
    return Announcement.objects.create(
        title=title,
        content='This is a test announcement body.',
        author=author,
        priority=priority,
        start_date=timezone.now(),
        end_date=timezone.now() + timedelta(days=days_ahead),
        is_active=active,
    )


# ── Model tests ────────────────────────────────────────────────────────────

class AnnouncementModelTest(TestCase):

    def setUp(self):
        self.user = make_user()

    def test_str_returns_title(self):
        ann = make_announcement(self.user, title='Exam Schedule')
        self.assertEqual(str(ann), 'Exam Schedule')

    def test_default_priority_is_normal(self):
        ann = make_announcement(self.user)
        self.assertEqual(ann.priority, 'normal')

    def test_is_active_defaults_true(self):
        ann = make_announcement(self.user)
        self.assertTrue(ann.is_active)

    def test_announcement_view_str(self):
        ann = make_announcement(self.user)
        view = AnnouncementView.objects.create(announcement=ann, user=self.user)
        self.assertIn(self.user.email, str(view))
        self.assertIn(ann.title, str(view))


# ── API endpoint tests ─────────────────────────────────────────────────────

class AnnouncementAPITest(APITestCase):

    BASE = '/api/announcements/'

    def setUp(self):
        self.admin = make_admin()
        self.user = make_user()
        self.ann = make_announcement(self.admin, title='Welcome to PKFokam')
        self.client.credentials(**auth_header(self.client, 'user@pkfokam.edu', 'Pass1234!'))

    # — Read —

    def test_authenticated_user_can_list_announcements(self):
        res = self.client.get(self.BASE)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_unauthenticated_cannot_list(self):
        self.client.credentials()
        res = self.client.get(self.BASE)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_returns_existing_announcement(self):
        res = self.client.get(self.BASE)
        titles = [a['title'] for a in res.data['results']]
        self.assertIn('Welcome to PKFokam', titles)

    def test_retrieve_single_announcement(self):
        res = self.client.get(f'{self.BASE}{self.ann.pk}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['title'], 'Welcome to PKFokam')

    # — Search —

    def test_search_by_title(self):
        make_announcement(self.admin, title='Holiday Notice')
        res = self.client.get(f'{self.BASE}?search=Holiday')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        titles = [a['title'] for a in res.data['results']]
        self.assertIn('Holiday Notice', titles)
        self.assertNotIn('Welcome to PKFokam', titles)

    def test_search_no_results_returns_empty_list(self):
        res = self.client.get(f'{self.BASE}?search=xyznotfound')
        self.assertEqual(res.data['count'], 0)

    # — Status filter —

    def test_status_active_filter(self):
        make_announcement(self.admin, title='Expired', active=False)
        res = self.client.get(f'{self.BASE}?status=active')
        titles = [a['title'] for a in res.data['results']]
        self.assertIn('Welcome to PKFokam', titles)
        self.assertNotIn('Expired', titles)

    # — Create (admin only) —

    def test_admin_can_create_announcement(self):
        self.client.credentials(**auth_header(self.client, 'admin@pkfokam.edu', 'Admin1234!'))
        res = self.client.post(self.BASE, {
            'title': 'New Notice',
            'content': 'Details here.',
            'priority': 'high',
            'start_date': timezone.now().isoformat(),
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Announcement.objects.filter(title='New Notice').exists())

    def test_created_announcement_author_set_to_request_user(self):
        self.client.credentials(**auth_header(self.client, 'admin@pkfokam.edu', 'Admin1234!'))
        self.client.post(self.BASE, {
            'title': 'Author Test',
            'content': 'Content.',
            'priority': 'normal',
            'start_date': timezone.now().isoformat(),
        }, format='json')
        ann = Announcement.objects.get(title='Author Test')
        self.assertEqual(ann.author, self.admin)

    # — Update —

    def test_admin_can_update_priority(self):
        self.client.credentials(**auth_header(self.client, 'admin@pkfokam.edu', 'Admin1234!'))
        res = self.client.patch(
            f'{self.BASE}{self.ann.pk}/', {'priority': 'urgent'}, format='json'
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.ann.refresh_from_db()
        self.assertEqual(self.ann.priority, 'urgent')

    def test_admin_partial_update_sets_is_active(self):
        self.client.credentials(**auth_header(self.client, 'admin@pkfokam.edu', 'Admin1234!'))
        res = self.client.patch(
            f'{self.BASE}{self.ann.pk}/', {'status': 'inactive'}, format='json'
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.ann.refresh_from_db()
        self.assertFalse(self.ann.is_active)

    # — Delete —

    def test_admin_can_delete_announcement(self):
        self.client.credentials(**auth_header(self.client, 'admin@pkfokam.edu', 'Admin1234!'))
        res = self.client.delete(f'{self.BASE}{self.ann.pk}/')
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Announcement.objects.filter(pk=self.ann.pk).exists())

    # — Priority choices —

    def test_urgent_priority_announcement_returned_in_list(self):
        make_announcement(self.admin, title='Urgent Alert', priority='urgent')
        res = self.client.get(self.BASE)
        priorities = [a['priority'] for a in res.data['results']]
        self.assertIn('urgent', priorities)
