from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APITestCase
from rest_framework import status
from users.models import User
from .models import CalendarEvent, EventReminder


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


def make_event(user, title='Study Group', days_from_now=3, is_public=False, event_type='personal'):
    start = timezone.now() + timedelta(days=days_from_now)
    return CalendarEvent.objects.create(
        title=title,
        start_time=start,
        end_time=start + timedelta(hours=2),
        user=user,
        source='personal',
        event_type=event_type,
        is_public=is_public,
    )


# ── Model tests ────────────────────────────────────────────────────────────

class CalendarEventModelTest(TestCase):

    def test_str_contains_title_and_date(self):
        user = make_user()
        event = make_event(user, 'Exam Prep')
        self.assertIn('Exam Prep', str(event))

    def test_is_active_defaults_true(self):
        user = make_user()
        event = make_event(user)
        self.assertTrue(event.is_active)

    def test_personal_event_is_not_auto_generated(self):
        user = make_user()
        event = make_event(user)
        self.assertFalse(event.is_auto_generated)

    def test_events_app_source_is_auto_generated(self):
        user = make_user()
        start = timezone.now() + timedelta(days=1)
        event = CalendarEvent.objects.create(
            title='Institutional Event',
            start_time=start,
            end_time=start + timedelta(hours=1),
            user=user,
            source='events_app',
        )
        self.assertTrue(event.is_auto_generated)


class EventReminderModelTest(TestCase):

    def test_str_contains_event_title_and_time(self):
        user = make_user()
        event = make_event(user, 'Meeting')
        reminder = EventReminder.objects.create(
            event=event, user=user, reminder_time=30, reminder_unit='minutes'
        )
        self.assertIn('Meeting', str(reminder))
        self.assertIn('30', str(reminder))

    def test_calculate_reminder_time_minutes(self):
        user = make_user()
        event = make_event(user)
        reminder = EventReminder.objects.create(
            event=event, user=user, reminder_time=60, reminder_unit='minutes'
        )
        expected = event.start_time - timedelta(minutes=60)
        self.assertAlmostEqual(
            reminder.calculate_reminder_time().timestamp(),
            expected.timestamp(),
            delta=1,
        )


# ── API tests ──────────────────────────────────────────────────────────────

class CalendarEventAPITest(APITestCase):

    BASE = '/api/calendar/events/'

    def setUp(self):
        self.user = make_user()
        self.other = make_user(email='other@pkfokam.edu')
        self.event = make_event(self.user, 'My Event')
        self.public_event = make_event(self.other, 'Public Event', is_public=True)
        self.client.credentials(**auth_header(self.client, 'student@pkfokam.edu', 'Pass1234!'))

    # — Read —

    def test_authenticated_user_can_list_events(self):
        res = self.client.get(self.BASE)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_unauthenticated_cannot_list(self):
        self.client.credentials()
        res = self.client.get(self.BASE)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_user_sees_own_events(self):
        res = self.client.get(self.BASE)
        titles = [e['title'] for e in res.data]
        self.assertIn('My Event', titles)

    def test_user_sees_public_events_from_others(self):
        res = self.client.get(self.BASE)
        titles = [e['title'] for e in res.data]
        self.assertIn('Public Event', titles)

    def test_user_cannot_see_private_events_from_others(self):
        private = make_event(self.other, 'Private Other Event', is_public=False)
        res = self.client.get(self.BASE)
        titles = [e['title'] for e in res.data]
        self.assertNotIn('Private Other Event', titles)

    # — Create —

    def test_user_can_create_personal_event(self):
        start = (timezone.now() + timedelta(days=5)).isoformat()
        end = (timezone.now() + timedelta(days=5, hours=1)).isoformat()
        res = self.client.post(self.BASE, {
            'title': 'New Study Session',
            'start_time': start,
            'end_time': end,
            'event_type': 'academic',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(CalendarEvent.objects.filter(title='New Study Session').exists())

    def test_create_sets_source_to_personal(self):
        start = (timezone.now() + timedelta(days=5)).isoformat()
        end = (timezone.now() + timedelta(days=5, hours=1)).isoformat()
        self.client.post(self.BASE, {
            'title': 'Source Test',
            'start_time': start,
            'end_time': end,
        }, format='json')
        event = CalendarEvent.objects.get(title='Source Test')
        self.assertEqual(event.source, 'personal')

    # — Update / Delete —

    def test_update_event_title(self):
        start = self.event.start_time.isoformat()
        end = self.event.end_time.isoformat()
        res = self.client.patch(
            f'{self.BASE}{self.event.pk}/',
            {'title': 'Updated Event', 'start_time': start, 'end_time': end},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.event.refresh_from_db()
        self.assertEqual(self.event.title, 'Updated Event')

    def test_delete_own_event(self):
        res = self.client.delete(f'{self.BASE}{self.event.pk}/')
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(CalendarEvent.objects.filter(pk=self.event.pk).exists())

    # — Custom actions —

    def test_upcoming_action_returns_200(self):
        res = self.client.get(f'{self.BASE}upcoming/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_upcoming_includes_future_active_events(self):
        res = self.client.get(f'{self.BASE}upcoming/')
        titles = [e['title'] for e in res.data]
        self.assertIn('My Event', titles)

    def test_today_action_returns_200(self):
        res = self.client.get(f'{self.BASE}today/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_month_action_returns_200(self):
        res = self.client.get(f'{self.BASE}month/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_sources_action_returns_source_list(self):
        res = self.client.get(f'{self.BASE}sources/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        values = [s['value'] for s in res.data]
        self.assertIn('personal', values)
        self.assertIn('events_app', values)

    def test_sync_status_action(self):
        res = self.client.get(f'{self.BASE}sync_status/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('total_events', res.data)

    # — Filter by event_type —

    def test_filter_by_event_type(self):
        make_event(self.user, 'Workshop', event_type='workshop')
        res = self.client.get(f'{self.BASE}?event_type=workshop')
        titles = [e['title'] for e in res.data]
        self.assertIn('Workshop', titles)
        self.assertNotIn('My Event', titles)

    # — Search —

    def test_search_by_title(self):
        res = self.client.get(f'{self.BASE}?search=My+Event')
        titles = [e['title'] for e in res.data]
        self.assertIn('My Event', titles)
