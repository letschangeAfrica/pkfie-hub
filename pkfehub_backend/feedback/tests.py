from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from users.models import User
from .models import FeedbackCategory, FeedbackSubmission, FeedbackResponse


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


def make_category(name='General Feedback', active=True):
    return FeedbackCategory.objects.create(name=name, is_active=active)


def make_submission(user, category, subject='Test Issue', fb_status='open', priority='medium'):
    return FeedbackSubmission.objects.create(
        user=user,
        category=category,
        subject=subject,
        message='Detailed description of the issue.',
        status=fb_status,
        priority=priority,
    )


# ── Model tests ────────────────────────────────────────────────────────────

class FeedbackCategoryModelTest(TestCase):

    def test_str_returns_name(self):
        cat = make_category('Technical Issues')
        self.assertEqual(str(cat), 'Technical Issues')

    def test_is_active_defaults_true(self):
        cat = make_category()
        self.assertTrue(cat.is_active)


class FeedbackSubmissionModelTest(TestCase):

    def setUp(self):
        self.user = make_user()
        self.cat = make_category()

    def test_str_contains_subject_and_email(self):
        sub = make_submission(self.user, self.cat, subject='Wi-Fi Problem')
        self.assertIn('Wi-Fi Problem', str(sub))
        self.assertIn(self.user.email, str(sub))

    def test_default_status_is_open(self):
        sub = make_submission(self.user, self.cat)
        self.assertEqual(sub.status, 'open')

    def test_default_priority_is_medium(self):
        sub = make_submission(self.user, self.cat)
        self.assertEqual(sub.priority, 'medium')


class FeedbackResponseModelTest(TestCase):

    def setUp(self):
        self.user = make_user()
        self.admin = make_admin()
        self.cat = make_category()
        self.sub = make_submission(self.user, self.cat)

    def test_str_shows_admin_flag(self):
        resp = FeedbackResponse.objects.create(
            feedback=self.sub, user=self.admin, admin=True, message='We are looking into this.'
        )
        self.assertIn('Admin', str(resp))

    def test_str_shows_user_flag_for_non_admin(self):
        resp = FeedbackResponse.objects.create(
            feedback=self.sub, user=self.user, admin=False, message='Any update?'
        )
        self.assertIn('User', str(resp))


# ── API tests ──────────────────────────────────────────────────────────────

class FeedbackCategoryAPITest(APITestCase):

    BASE = '/api/feedback/categories/'

    def setUp(self):
        make_category('Academics')
        make_category('Inactive Cat', active=False)

    def test_anyone_can_list_categories(self):
        res = self.client.get(self.BASE)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_only_active_categories_returned(self):
        res = self.client.get(self.BASE)
        names = [c['name'] for c in res.data]
        self.assertIn('Academics', names)
        self.assertNotIn('Inactive Cat', names)


class FeedbackSubmissionAPITest(APITestCase):

    def setUp(self):
        self.admin = make_admin()
        self.user = make_user()
        self.cat = make_category()
        self.sub = make_submission(self.user, self.cat, subject='Login Bug')
        self.client.credentials(**auth_header(self.client, 'student@pkfokam.edu', 'Pass1234!'))

    # — Create —

    def test_authenticated_user_can_submit_feedback(self):
        res = self.client.post('/api/feedback/', {
            'category_id': self.cat.pk,
            'subject': 'New Issue',
            'message': 'Something is broken.',
            'priority': 'high',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(FeedbackSubmission.objects.filter(subject='New Issue').exists())

    def test_create_sets_user_to_request_user(self):
        self.client.post('/api/feedback/', {
            'category_id': self.cat.pk,
            'subject': 'My Report',
            'message': 'Details here.',
        }, format='json')
        sub = FeedbackSubmission.objects.get(subject='My Report')
        self.assertEqual(sub.user, self.user)

    def test_unauthenticated_cannot_submit(self):
        self.client.credentials()
        res = self.client.post('/api/feedback/', {
            'category': self.cat.pk,
            'subject': 'Anon Issue',
            'message': 'X',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    # — Retrieve / Update —

    def test_authenticated_can_retrieve_submission(self):
        res = self.client.get(f'/api/feedback/{self.sub.pk}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['subject'], 'Login Bug')

    def test_can_update_own_submission(self):
        res = self.client.patch(
            f'/api/feedback/{self.sub.pk}/',
            {'subject': 'Updated Subject'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    # — Admin list —

    def test_admin_can_list_all_submissions(self):
        self.client.credentials(**auth_header(self.client, 'admin@pkfokam.edu', 'Admin1234!'))
        res = self.client.get('/api/feedback/all/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_student_cannot_access_admin_list(self):
        res = self.client.get('/api/feedback/all/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_list_filter_by_status(self):
        make_submission(self.user, self.cat, subject='Resolved Issue', fb_status='resolved')
        self.client.credentials(**auth_header(self.client, 'admin@pkfokam.edu', 'Admin1234!'))
        res = self.client.get('/api/feedback/all/?status=open')
        subjects = [s['subject'] for s in res.data['results']]
        self.assertIn('Login Bug', subjects)
        self.assertNotIn('Resolved Issue', subjects)

    def test_admin_list_filter_by_priority(self):
        make_submission(self.user, self.cat, subject='Urgent Issue', priority='urgent')
        self.client.credentials(**auth_header(self.client, 'admin@pkfokam.edu', 'Admin1234!'))
        res = self.client.get('/api/feedback/all/?priority=urgent')
        subjects = [s['subject'] for s in res.data['results']]
        self.assertIn('Urgent Issue', subjects)
        self.assertNotIn('Login Bug', subjects)


class FeedbackBulkActionAPITest(APITestCase):

    BASE = '/api/feedback/bulk/'

    def setUp(self):
        self.user = make_user()
        self.cat = make_category()
        self.sub1 = make_submission(self.user, self.cat, subject='Issue A')
        self.sub2 = make_submission(self.user, self.cat, subject='Issue B')
        self.client.credentials(**auth_header(self.client, 'student@pkfokam.edu', 'Pass1234!'))

    def test_bulk_status_update(self):
        res = self.client.post(self.BASE, {
            'ids': [self.sub1.pk, self.sub2.pk],
            'action': 'status',
            'status': 'resolved',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.sub1.refresh_from_db()
        self.assertEqual(self.sub1.status, 'resolved')

    def test_bulk_delete(self):
        res = self.client.post(self.BASE, {
            'ids': [self.sub1.pk],
            'action': 'delete',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertFalse(FeedbackSubmission.objects.filter(pk=self.sub1.pk).exists())

    def test_bulk_missing_action_returns_400(self):
        res = self.client.post(self.BASE, {'ids': [self.sub1.pk]}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_bulk_invalid_action_returns_400(self):
        res = self.client.post(self.BASE, {
            'ids': [self.sub1.pk], 'action': 'unknown',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


class FeedbackResponseAPITest(APITestCase):

    def setUp(self):
        self.admin = make_admin()
        self.user = make_user()
        self.cat = make_category()
        self.sub = make_submission(self.user, self.cat)
        self.BASE = f'/api/feedback/{self.sub.pk}/responses/'
        self.client.credentials(**auth_header(self.client, 'student@pkfokam.edu', 'Pass1234!'))

    def test_user_can_list_responses(self):
        res = self.client.get(self.BASE)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_user_can_add_response(self):
        res = self.client.post(self.BASE, {'message': 'Any update?'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(FeedbackResponse.objects.filter(feedback=self.sub).count(), 1)

    def test_admin_response_sets_admin_flag(self):
        self.client.credentials(**auth_header(self.client, 'admin@pkfokam.edu', 'Admin1234!'))
        self.client.post(self.BASE, {'message': 'We are investigating.'}, format='json')
        resp = FeedbackResponse.objects.get(feedback=self.sub)
        self.assertTrue(resp.admin)
