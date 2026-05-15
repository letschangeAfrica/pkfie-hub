from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from users.models import User
from .models import Notification


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


def make_notification(user, text='Server maintenance tonight', notif_type='info', read=False):
    return Notification.objects.create(
        user=user, text=text, notif_type=notif_type, read=read,
        title='Notice',
    )


# ── Model tests ────────────────────────────────────────────────────────────

class NotificationModelTest(TestCase):

    def test_read_defaults_to_false(self):
        user = make_user()
        notif = make_notification(user)
        self.assertFalse(notif.read)

    def test_default_type_is_info(self):
        user = make_user()
        notif = Notification.objects.create(user=user, text='Hello')
        self.assertEqual(notif.notif_type, 'info')


# ── API tests ──────────────────────────────────────────────────────────────

class NotificationAPITest(APITestCase):

    BASE = '/api/notifications/'

    def setUp(self):
        self.user = make_user()
        self.other = make_user(email='other@pkfokam.edu')
        self.notif = make_notification(self.user, text='Your assignment is due')
        self.read_notif = make_notification(self.user, text='Profile updated', read=True)
        make_notification(self.other, text='Other user notification')
        self.client.credentials(**auth_header(self.client, 'student@pkfokam.edu', 'Pass1234!'))

    # — List —

    def test_authenticated_user_can_list_notifications(self):
        res = self.client.get(self.BASE)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_unauthenticated_cannot_list(self):
        self.client.credentials()
        res = self.client.get(self.BASE)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_user_sees_only_own_notifications(self):
        res = self.client.get(self.BASE)
        texts = [n['text'] for n in res.data['results']]
        self.assertIn('Your assignment is due', texts)
        self.assertNotIn('Other user notification', texts)

    # — Filters —

    def test_unread_filter_returns_only_unread(self):
        res = self.client.get(f'{self.BASE}?unread=true')
        texts = [n['text'] for n in res.data['results']]
        self.assertIn('Your assignment is due', texts)
        self.assertNotIn('Profile updated', texts)

    def test_type_filter(self):
        make_notification(self.user, text='Warning msg', notif_type='warning')
        res = self.client.get(f'{self.BASE}?notif_type=warning')
        texts = [n['text'] for n in res.data['results']]
        self.assertIn('Warning msg', texts)
        self.assertNotIn('Your assignment is due', texts)

    # — Search —

    def test_search_by_text(self):
        res = self.client.get(f'{self.BASE}?search=assignment')
        texts = [n['text'] for n in res.data['results']]
        self.assertIn('Your assignment is due', texts)
        self.assertNotIn('Profile updated', texts)

    # — mark_all_read action —

    def test_mark_all_read_marks_all_unread(self):
        res = self.client.post(f'{self.BASE}mark_all_read/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('marked_read', res.data)
        self.assertEqual(res.data['marked_read'], 1)  # only 1 was unread
        self.notif.refresh_from_db()
        self.assertTrue(self.notif.read)

    def test_mark_all_read_does_not_affect_other_users(self):
        other_notif = Notification.objects.get(text='Other user notification')
        self.client.post(f'{self.BASE}mark_all_read/')
        other_notif.refresh_from_db()
        self.assertFalse(other_notif.read)

    # — Create / Delete —

    def test_create_notification(self):
        res = self.client.post(self.BASE, {
            'text': 'New alert',
            'notif_type': 'message',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_delete_notification(self):
        res = self.client.delete(f'{self.BASE}{self.notif.pk}/')
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Notification.objects.filter(pk=self.notif.pk).exists())
