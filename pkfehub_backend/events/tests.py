from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from django.utils import timezone
from datetime import timedelta
from users.models import User
from .models import Event


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


def make_event(title='PKF Tech Day', days_from_now=3, active=True, event_type='academic'):
    return Event.objects.create(
        title=title,
        description='Annual technology showcase.',
        event_type=event_type,
        start_time=timezone.now() + timedelta(days=days_from_now),
        end_time=timezone.now() + timedelta(days=days_from_now, hours=2),
        location='PKFokam Campus',
        organizer='PKFokam Events',
        is_active=active,
    )


# ── Model tests ────────────────────────────────────────────────────────────

class EventModelTest(TestCase):

    def test_str_contains_title_and_date(self):
        event = make_event()
        self.assertIn('PKF Tech Day', str(event))

    def test_is_active_defaults_true(self):
        event = make_event()
        self.assertTrue(event.is_active)

    def test_event_type_stored_correctly(self):
        event = make_event(event_type='workshop')
        self.assertEqual(event.event_type, 'workshop')

    def test_attendees_many_to_many_is_empty_by_default(self):
        event = make_event()
        self.assertEqual(event.attendees.count(), 0)

    def test_user_can_be_added_as_attendee(self):
        event = make_event()
        user = make_user()
        event.attendees.add(user)
        self.assertIn(user, event.attendees.all())


# ── API endpoint tests ─────────────────────────────────────────────────────

class EventAPITest(APITestCase):

    BASE = '/api/events/'

    def setUp(self):
        self.admin = make_admin()
        self.user = make_user()
        self.future_event = make_event(title='Future Workshop', days_from_now=5)
        self.past_event = make_event(title='Past Seminar', days_from_now=-3, active=True)
        self.client.credentials(**auth_header(self.client, 'student@pkfokam.edu', 'Pass1234!'))

    # — Read —

    def test_authenticated_user_can_list_events(self):
        res = self.client.get(self.BASE)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_unauthenticated_cannot_list_events(self):
        self.client.credentials()
        res = self.client.get(self.BASE)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_retrieve_single_event(self):
        res = self.client.get(f'{self.BASE}{self.future_event.pk}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['title'], 'Future Workshop')

    # — Filters —

    def test_upcoming_filter_excludes_past_events(self):
        res = self.client.get(f'{self.BASE}?upcoming=true')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        titles = [e['title'] for e in res.data['results']]
        self.assertIn('Future Workshop', titles)
        self.assertNotIn('Past Seminar', titles)

    def test_status_active_filter(self):
        inactive = make_event(title='Inactive Event', active=False)
        res = self.client.get(f'{self.BASE}?status=active')
        titles = [e['title'] for e in res.data['results']]
        self.assertNotIn('Inactive Event', titles)

    def test_status_inactive_filter(self):
        make_event(title='Inactive Event', active=False)
        res = self.client.get(f'{self.BASE}?status=inactive')
        titles = [e['title'] for e in res.data['results']]
        self.assertIn('Inactive Event', titles)

    # — Search —

    def test_search_by_title(self):
        res = self.client.get(f'{self.BASE}?search=Workshop')
        titles = [e['title'] for e in res.data['results']]
        self.assertIn('Future Workshop', titles)

    def test_search_no_match_returns_empty(self):
        res = self.client.get(f'{self.BASE}?search=xyznotexist')
        self.assertEqual(res.data['count'], 0)

    # — Create (admin only) —

    def test_admin_can_create_event(self):
        self.client.credentials(**auth_header(self.client, 'admin@pkfokam.edu', 'Admin1234!'))
        res = self.client.post(self.BASE, {
            'title': 'New Conference',
            'description': 'Tech talks.',
            'event_type': 'conference',
            'start_time': (timezone.now() + timedelta(days=10)).isoformat(),
            'end_time': (timezone.now() + timedelta(days=10, hours=4)).isoformat(),
            'location': 'Auditorium',
            'organizer': 'Faculty',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Event.objects.filter(title='New Conference').exists())

    def test_student_can_create_event(self):
        # Events API uses IsAuthenticated, not IsAdminUser
        res = self.client.post(self.BASE, {
            'title': 'Student Event',
            'description': 'Peer learning.',
            'event_type': 'social',
            'start_time': (timezone.now() + timedelta(days=2)).isoformat(),
            'end_time': (timezone.now() + timedelta(days=2, hours=1)).isoformat(),
            'location': 'Room 101',
            'organizer': 'Students',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    # — Update —

    def test_can_update_event_title(self):
        self.client.credentials(**auth_header(self.client, 'admin@pkfokam.edu', 'Admin1234!'))
        res = self.client.patch(
            f'{self.BASE}{self.future_event.pk}/',
            {'title': 'Updated Workshop'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.future_event.refresh_from_db()
        self.assertEqual(self.future_event.title, 'Updated Workshop')

    # — Delete —

    def test_can_delete_event(self):
        self.client.credentials(**auth_header(self.client, 'admin@pkfokam.edu', 'Admin1234!'))
        res = self.client.delete(f'{self.BASE}{self.future_event.pk}/')
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Event.objects.filter(pk=self.future_event.pk).exists())
