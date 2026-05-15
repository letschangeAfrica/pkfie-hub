import datetime
from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from users.models import User
from .models import InnovationProject, InnovationChallenge, InnovationResource, InnovationCommunityMember


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


def make_project(user, title='Smart Campus', status='in-progress'):
    return InnovationProject.objects.create(
        title=title,
        description='An IoT campus monitoring system.',
        category='IoT',
        team='Team Alpha',
        status=status,
        submitted_by=user,
    )


def make_challenge(title='Hack the Future', days_ahead=30):
    return InnovationChallenge.objects.create(
        title=title,
        description='Build a solution for urban mobility.',
        deadline=datetime.date.today() + datetime.timedelta(days=days_ahead),
        prize='1,000,000 FCFA',
    )


# ── Model tests ────────────────────────────────────────────────────────────

class InnovationProjectModelTest(TestCase):

    def test_str_returns_title(self):
        user = make_user()
        project = make_project(user, 'AgriTech App')
        self.assertEqual(str(project), 'AgriTech App')

    def test_is_featured_defaults_false(self):
        user = make_user()
        project = make_project(user)
        self.assertFalse(project.is_featured)


class InnovationChallengeModelTest(TestCase):

    def test_str_returns_title(self):
        challenge = make_challenge('Climate Hack')
        self.assertEqual(str(challenge), 'Climate Hack')

    def test_participants_empty_by_default(self):
        challenge = make_challenge()
        self.assertEqual(challenge.participants.count(), 0)


# ── API tests ──────────────────────────────────────────────────────────────

class InnovationProjectAPITest(APITestCase):

    BASE = '/api/innovation/projects/'

    def setUp(self):
        self.user = make_user()
        self.project = make_project(self.user, 'Existing Project')
        self.client.credentials(**auth_header(self.client, 'student@pkfokam.edu', 'Pass1234!'))

    def test_authenticated_student_can_list_projects(self):
        res = self.client.get(self.BASE)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_unauthenticated_cannot_list(self):
        self.client.credentials()
        res = self.client.get(self.BASE)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_student_can_create_project(self):
        res = self.client.post(self.BASE, {
            'title': 'New App',
            'description': 'An app for students.',
            'category': 'Mobile',
            'team': 'Team B',
            'status': 'planning',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(InnovationProject.objects.filter(title='New App').exists())

    def test_create_sets_submitted_by_to_request_user(self):
        self.client.post(self.BASE, {
            'title': 'My Project',
            'description': 'Details.',
            'category': 'Web',
            'team': 'Solo',
            'status': 'planning',
        }, format='json')
        proj = InnovationProject.objects.get(title='My Project')
        self.assertEqual(proj.submitted_by, self.user)

    def test_retrieve_project(self):
        res = self.client.get(f'{self.BASE}{self.project.pk}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['title'], 'Existing Project')

    def test_update_project_status(self):
        res = self.client.patch(
            f'{self.BASE}{self.project.pk}/',
            {'status': 'completed'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.project.refresh_from_db()
        self.assertEqual(self.project.status, 'completed')


class InnovationChallengeAPITest(APITestCase):

    BASE = '/api/innovation/challenges/'

    def setUp(self):
        self.user = make_user()
        self.challenge = make_challenge('AI for Good')
        self.client.credentials(**auth_header(self.client, 'student@pkfokam.edu', 'Pass1234!'))

    def test_student_can_list_challenges(self):
        res = self.client.get(self.BASE)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_participate_in_challenge(self):
        res = self.client.post(f'{self.BASE}{self.challenge.pk}/participate/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn(self.user, self.challenge.participants.all())

    def test_participate_returns_status_participated(self):
        res = self.client.post(f'{self.BASE}{self.challenge.pk}/participate/')
        self.assertEqual(res.data['status'], 'participated')


class CommunityAPITest(APITestCase):

    def setUp(self):
        self.user = make_user()
        self.client.credentials(**auth_header(self.client, 'student@pkfokam.edu', 'Pass1234!'))

    def test_community_stats_accessible(self):
        res = self.client.get('/api/innovation/community/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_community_stats_has_expected_keys(self):
        res = self.client.get('/api/innovation/community/')
        for key in ('active_projects', 'members', 'completed_solutions'):
            self.assertIn(key, res.data)

    def test_join_community(self):
        res = self.client.post('/api/innovation/community/join/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(InnovationCommunityMember.objects.filter(user=self.user).exists())

    def test_join_community_twice_returns_already_member(self):
        self.client.post('/api/innovation/community/join/')
        res = self.client.post('/api/innovation/community/join/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['status'], 'already_member')
