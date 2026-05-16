from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from users.models import User
from .models import HandbookSection, HandbookContentBlock


# ── Helpers ────────────────────────────────────────────────────────────────

def make_user(email='student@pkfokam.edu', password='Pass1234!', role='student'):
    return User.objects.create_user(
        email=email, password=password, role=role,
        first_name='Alice', last_name='Ngo', is_verified=True,
    )


def auth_header(client, email, password):
    res = client.post('/api/auth/login/', {'email': email, 'password': password}, format='json')
    return {'HTTP_AUTHORIZATION': f'Bearer {res.data["access"]}'}


# ── Model tests ────────────────────────────────────────────────────────────

class HandbookSectionModelTest(TestCase):

    def test_str_returns_title(self):
        sec = HandbookSection.objects.create(key='admissions', title='Admissions & Enrollment')
        self.assertEqual(str(sec), 'Admissions & Enrollment')

    def test_ordering_by_order_field(self):
        HandbookSection.objects.create(key='fees', title='Tuition & Fees', order=2)
        HandbookSection.objects.create(key='admissions', title='Admissions', order=1)
        sections = list(HandbookSection.objects.order_by('order'))
        self.assertEqual(sections[0].key, 'admissions')

    def test_content_block_linked_to_section(self):
        sec = HandbookSection.objects.create(key='campus', title='Campus Life')
        block = HandbookContentBlock.objects.create(
            section=sec, title='Facilities', body='We have a great campus.'
        )
        self.assertEqual(block.section, sec)
        self.assertIn(block, sec.blocks.all())


# ── API tests ──────────────────────────────────────────────────────────────

class HandbookAPITest(APITestCase):

    def setUp(self):
        self.user = make_user()
        self.sec = HandbookSection.objects.create(
            key='academics', title='Academic Programs', order=1
        )
        HandbookSection.objects.create(key='fees', title='Tuition & Fees', order=2)
        self.client.credentials(**auth_header(self.client, 'student@pkfokam.edu', 'Pass1234!'))

    def test_authenticated_user_can_list_sections(self):
        res = self.client.get('/api/handbook/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_unauthenticated_cannot_list(self):
        self.client.credentials()
        res = self.client.get('/api/handbook/')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_returns_all_sections(self):
        res = self.client.get('/api/handbook/')
        keys = [s['key'] for s in res.data]
        self.assertIn('academics', keys)
        self.assertIn('fees', keys)

    def test_list_is_ordered_by_order_field(self):
        res = self.client.get('/api/handbook/')
        orders = [s['order'] for s in res.data]
        self.assertEqual(orders, sorted(orders))

    def test_retrieve_section_by_key(self):
        res = self.client.get('/api/handbook/academics/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['title'], 'Academic Programs')

    def test_retrieve_unknown_key_returns_404(self):
        res = self.client.get('/api/handbook/nonexistent/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
