from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from users.models import User
from .models import Program, PathfinderQuestion, PathfinderOption, PathfinderSession


# ── Helpers ────────────────────────────────────────────────────────────────

def make_user(email='student@pkfokam.edu', password='Pass1234!', role='student'):
    return User.objects.create_user(
        email=email, password=password, role=role,
        first_name='Alice', last_name='Ngo',
    )


def auth_header(client, email, password):
    res = client.post('/api/auth/login/', {'email': email, 'password': password}, format='json')
    return {'HTTP_AUTHORIZATION': f'Bearer {res.data["access"]}'}


def make_program(name='Computer Science', code='CS101', active=True):
    return Program.objects.create(
        name=name,
        code=code,
        description='A rigorous CS program.',
        duration_years=3,
        requirements='Baccalaureate + math.',
        tuition_fee='500000.00',
        is_active=active,
    )


def make_question(text='What is your strength?', order=1, active=True):
    return PathfinderQuestion.objects.create(
        question_text=text,
        question_type='multiple_choice',
        display_order=order,
        is_active=active,
    )


def make_option(question, text='Mathematics', value='math', order=1):
    return PathfinderOption.objects.create(
        question=question,
        option_text=text,
        option_value=value,
        program_weights={'CS101': 3},
        display_order=order,
    )


# ── Model tests ────────────────────────────────────────────────────────────

class ProgramModelTest(TestCase):

    def test_str_contains_code_and_name(self):
        prog = make_program()
        self.assertIn('CS101', str(prog))
        self.assertIn('Computer Science', str(prog))

    def test_is_active_defaults_true(self):
        prog = make_program()
        self.assertTrue(prog.is_active)


class PathfinderQuestionModelTest(TestCase):

    def test_str_contains_order_and_text(self):
        q = make_question(text='What do you enjoy most?', order=1)
        self.assertIn('Q1', str(q))


class PathfinderSessionModelTest(TestCase):

    def test_str_contains_session_id_and_email(self):
        user = make_user()
        session = PathfinderSession.objects.create(user=user)
        self.assertIn(user.email, str(session))

    def test_completed_defaults_false(self):
        user = make_user()
        session = PathfinderSession.objects.create(user=user)
        self.assertFalse(session.completed)


# ── API tests ──────────────────────────────────────────────────────────────

class ProgramAPITest(APITestCase):

    BASE = '/api/pathfinder/programs/'

    def setUp(self):
        self.user = make_user()
        self.prog = make_program('Business IT', 'BIT201')
        make_program('Inactive Program', 'INACT01', active=False)
        self.client.credentials(**auth_header(self.client, 'student@pkfokam.edu', 'Pass1234!'))

    def test_authenticated_user_can_list_programs(self):
        res = self.client.get(self.BASE)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_unauthenticated_cannot_list(self):
        self.client.credentials()
        res = self.client.get(self.BASE)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_only_active_programs_listed(self):
        res = self.client.get(self.BASE)
        codes = [p['code'] for p in res.data]
        self.assertIn('BIT201', codes)
        self.assertNotIn('INACT01', codes)

    def test_search_by_name(self):
        res = self.client.get(f'{self.BASE}?search=Business')
        codes = [p['code'] for p in res.data]
        self.assertIn('BIT201', codes)

    def test_retrieve_program(self):
        res = self.client.get(f'{self.BASE}{self.prog.pk}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['code'], 'BIT201')


class PathfinderQuestionAPITest(APITestCase):

    BASE = '/api/pathfinder/questions/'

    def setUp(self):
        self.user = make_user()
        self.q1 = make_question('What is your preferred subject?', order=1)
        self.q2 = make_question('Rate your programming skills.', order=2)
        make_question('Inactive Q', order=3, active=False)
        self.client.credentials(**auth_header(self.client, 'student@pkfokam.edu', 'Pass1234!'))

    def test_authenticated_user_can_list_questions(self):
        res = self.client.get(self.BASE)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_unauthenticated_cannot_list(self):
        self.client.credentials()
        res = self.client.get(self.BASE)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_only_active_questions_listed(self):
        res = self.client.get(self.BASE)
        texts = [q['question_text'] for q in res.data]
        self.assertIn('What is your preferred subject?', texts)
        self.assertNotIn('Inactive Q', texts)

    def test_questions_ordered_by_display_order(self):
        res = self.client.get(self.BASE)
        orders = [q['display_order'] for q in res.data]
        self.assertEqual(orders, sorted(orders))


class PathfinderSessionAPITest(APITestCase):

    BASE = '/api/pathfinder/sessions/'

    def setUp(self):
        self.user = make_user()
        self.prog = make_program()
        self.q = make_question()
        self.opt = make_option(self.q)
        self.client.credentials(**auth_header(self.client, 'student@pkfokam.edu', 'Pass1234!'))

    def test_authenticated_user_can_list_sessions(self):
        res = self.client.get(self.BASE)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_unauthenticated_cannot_list_sessions(self):
        self.client.credentials()
        res = self.client.get(self.BASE)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_session(self):
        res = self.client.post(self.BASE, {}, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(PathfinderSession.objects.filter(user=self.user).exists())

    def test_session_linked_to_request_user(self):
        self.client.post(self.BASE, {}, format='json')
        session = PathfinderSession.objects.get(user=self.user)
        self.assertEqual(session.user, self.user)

    def test_user_sees_only_own_sessions(self):
        other = make_user(email='other@pkfokam.edu')
        PathfinderSession.objects.create(user=other)
        self.client.post(self.BASE, {}, format='json')
        res = self.client.get(self.BASE)
        for s in res.data:
            self.assertNotIn('other@pkfokam.edu', str(s))

    def test_add_answers_and_get_results(self):
        session = PathfinderSession.objects.create(user=self.user)
        res = self.client.post(
            f'{self.BASE}{session.pk}/answers/',
            {
                'answers': [{
                    'question': self.q.pk,
                    'option': self.opt.pk,
                    'answer_value': self.opt.option_value,
                }]
            },
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertIn('results', res.data)
        self.assertIn('program_matches', res.data['results'])

    def test_add_answers_marks_session_completed(self):
        session = PathfinderSession.objects.create(user=self.user)
        self.client.post(
            f'{self.BASE}{session.pk}/answers/',
            {
                'answers': [{
                    'question': self.q.pk,
                    'option': self.opt.pk,
                    'answer_value': self.opt.option_value,
                }]
            },
            format='json',
        )
        session.refresh_from_db()
        self.assertTrue(session.completed)
