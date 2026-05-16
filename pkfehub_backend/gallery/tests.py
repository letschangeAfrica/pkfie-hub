import datetime
from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APITestCase
from rest_framework import status
from users.models import User
from .models import Occasion, Media, Like


# ── Helpers ────────────────────────────────────────────────────────────────

def make_user(email='student@pkfokam.edu', password='Pass1234!', role='student'):
    return User.objects.create_user(
        email=email, password=password, role=role,
        first_name='Alice', last_name='Ngo', is_verified=True,
    )


def auth_header(client, email, password):
    res = client.post('/api/auth/login/', {'email': email, 'password': password}, format='json')
    return {'HTTP_AUTHORIZATION': f'Bearer {res.data["access"]}'}


def make_occasion(name='Graduation 2024'):
    return Occasion.objects.create(name=name, color='#FFD700')


def make_media(occasion, title='Ceremony Photo', media_type='photo'):
    fake_file = SimpleUploadedFile('photo.jpg', b'\xFF\xD8\xFF', content_type='image/jpeg')
    return Media.objects.create(
        title=title,
        media_type=media_type,
        date=datetime.date.today(),
        occasion=occasion,
        file=fake_file,
    )


# ── Model tests ────────────────────────────────────────────────────────────

class OccasionModelTest(TestCase):

    def test_str_returns_name(self):
        occ = make_occasion('Innovation Fair')
        self.assertEqual(str(occ), 'Innovation Fair')

    def test_default_color(self):
        occ = Occasion.objects.create(name='Sports Day')
        self.assertEqual(occ.color, '#ffd700')


class MediaModelTest(TestCase):

    def test_str_returns_title_or_caption(self):
        occ = make_occasion()
        media = make_media(occ, title='PKFokam Ceremony')
        self.assertEqual(str(media), 'PKFokam Ceremony')

    def test_likes_default_zero(self):
        occ = make_occasion()
        media = make_media(occ)
        self.assertEqual(media.likes, 0)


# ── API tests ──────────────────────────────────────────────────────────────

class OccasionAPITest(APITestCase):

    BASE = '/api/gallery/occasions/'

    def setUp(self):
        self.occ = make_occasion('Annual Day')

    def test_anyone_can_list_occasions(self):
        res = self.client.get(self.BASE)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_list_returns_existing_occasion(self):
        res = self.client.get(self.BASE)
        names = [o['name'] for o in res.data]
        self.assertIn('Annual Day', names)

    def test_retrieve_occasion(self):
        res = self.client.get(f'{self.BASE}{self.occ.pk}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['name'], 'Annual Day')

    def test_create_occasion(self):
        res = self.client.post(self.BASE, {'name': 'Science Fair', 'color': '#009E60'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Occasion.objects.filter(name='Science Fair').exists())


class MediaAPITest(APITestCase):

    BASE = '/api/gallery/media/'

    def setUp(self):
        self.occ = make_occasion()
        self.media = make_media(self.occ, title='Welcome Event')
        self.user = make_user()

    def test_anyone_can_list_media(self):
        res = self.client.get(self.BASE)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_list_returns_existing_media(self):
        res = self.client.get(self.BASE)
        titles = [m['title'] for m in res.data]
        self.assertIn('Welcome Event', titles)

    def test_retrieve_media(self):
        res = self.client.get(f'{self.BASE}{self.media.pk}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)


class LikeAPITest(APITestCase):

    BASE = '/api/gallery/likes/'

    def setUp(self):
        self.occ = make_occasion()
        self.media = make_media(self.occ)
        self.user = make_user()
        self.client.credentials(**auth_header(self.client, 'student@pkfokam.edu', 'Pass1234!'))

    def test_authenticated_user_can_create_like(self):
        res = self.client.post(self.BASE, {'media': self.media.pk}, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Like.objects.filter(media=self.media).exists())

    def test_unauthenticated_can_list_likes(self):
        self.client.credentials()
        res = self.client.get(self.BASE)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
