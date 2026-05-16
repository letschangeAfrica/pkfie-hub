from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APITestCase
from rest_framework import status
from users.models import User
from .models import DocumentCategory, Document


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


def make_category(name='General', active=True):
    return DocumentCategory.objects.create(name=name, is_active=active)


def make_document(category, uploader, title='Policy v1', status='Draft'):
    fake_file = SimpleUploadedFile('policy.pdf', b'%PDF-1.4 content', content_type='application/pdf')
    return Document.objects.create(
        title=title,
        file=fake_file,
        file_name='policy.pdf',
        file_size=16,
        file_type='pdf',
        category=category,
        uploaded_by=uploader,
        status=status,
    )


# ── Model tests ────────────────────────────────────────────────────────────

class DocumentCategoryModelTest(TestCase):

    def test_str_returns_name(self):
        cat = make_category('Policies')
        self.assertEqual(str(cat), 'Policies')

    def test_is_active_defaults_true(self):
        cat = make_category()
        self.assertTrue(cat.is_active)

    def test_subcategory_relationship(self):
        parent = make_category('Academic')
        child = DocumentCategory.objects.create(name='Syllabi', parent_category=parent)
        self.assertEqual(child.parent_category, parent)
        self.assertIn(child, parent.subcategories.all())


class DocumentModelTest(TestCase):

    def setUp(self):
        self.user = make_user()
        self.cat = make_category()

    def test_str_returns_title(self):
        doc = make_document(self.cat, self.user, title='Student Handbook')
        self.assertEqual(str(doc), 'Student Handbook')

    def test_status_defaults_to_draft(self):
        doc = make_document(self.cat, self.user)
        self.assertEqual(doc.status, 'Draft')

    def test_is_active_defaults_true(self):
        doc = make_document(self.cat, self.user)
        self.assertTrue(doc.is_active)

    def test_uploaded_by_linked_to_user(self):
        doc = make_document(self.cat, self.user)
        self.assertEqual(doc.uploaded_by, self.user)


# ── Document Category API tests ────────────────────────────────────────────

class DocumentCategoryAPITest(APITestCase):

    BASE = '/api/document-categories/'

    def setUp(self):
        self.user = make_user()
        self.cat = make_category('Rules')
        make_category('Archived', active=False)
        self.client.credentials(**auth_header(self.client, 'student@pkfokam.edu', 'Pass1234!'))

    def test_authenticated_user_can_list_categories(self):
        res = self.client.get(self.BASE)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_unauthenticated_cannot_list(self):
        self.client.credentials()
        res = self.client.get(self.BASE)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_excludes_inactive_categories(self):
        res = self.client.get(self.BASE)
        names = [c['name'] for c in res.data]
        self.assertIn('Rules', names)
        self.assertNotIn('Archived', names)

    def test_retrieve_single_category(self):
        res = self.client.get(f'{self.BASE}{self.cat.pk}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['name'], 'Rules')


# ── Document API tests ─────────────────────────────────────────────────────

class DocumentAPITest(APITestCase):

    BASE = '/api/documents/'

    def setUp(self):
        self.admin = make_admin()
        self.user = make_user()
        self.cat = make_category()
        self.doc = make_document(self.cat, self.admin, title='Existing Doc')
        self.client.credentials(**auth_header(self.client, 'student@pkfokam.edu', 'Pass1234!'))

    # — Read —

    def test_authenticated_user_can_list_documents(self):
        res = self.client.get(self.BASE)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_unauthenticated_cannot_list(self):
        self.client.credentials()
        res = self.client.get(self.BASE)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_retrieve_single_document(self):
        res = self.client.get(f'{self.BASE}{self.doc.pk}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['title'], 'Existing Doc')

    # — Filters —

    def test_filter_by_status_draft(self):
        make_document(self.cat, self.admin, title='Published Doc', status='Published')
        res = self.client.get(f'{self.BASE}?status=Draft')
        titles = [d['title'] for d in res.data]
        self.assertIn('Existing Doc', titles)
        self.assertNotIn('Published Doc', titles)

    def test_filter_by_category_name(self):
        other_cat = make_category('Other')
        make_document(other_cat, self.admin, title='Other Doc')
        res = self.client.get(f'{self.BASE}?category=General')
        titles = [d['title'] for d in res.data]
        self.assertIn('Existing Doc', titles)
        self.assertNotIn('Other Doc', titles)

    # — Create —

    def test_authenticated_user_can_upload_document(self):
        fake_file = SimpleUploadedFile('new.pdf', b'PDF content', content_type='application/pdf')
        res = self.client.post(self.BASE, {
            'title': 'New Upload',
            'file': fake_file,
            'category_id': self.cat.pk,
        }, format='multipart')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Document.objects.filter(title='New Upload').exists())

    def test_upload_sets_uploaded_by_to_request_user(self):
        fake_file = SimpleUploadedFile('mine.pdf', b'PDF', content_type='application/pdf')
        self.client.post(self.BASE, {
            'title': 'My Doc',
            'file': fake_file,
            'category_id': self.cat.pk,
        }, format='multipart')
        doc = Document.objects.get(title='My Doc')
        self.assertEqual(doc.uploaded_by, self.user)

    # — set_status action —

    def test_set_status_to_published(self):
        res = self.client.patch(
            f'{self.BASE}{self.doc.pk}/set_status/',
            {'status': 'Published'},
            format='multipart',
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.doc.refresh_from_db()
        self.assertEqual(self.doc.status, 'Published')

    def test_set_status_invalid_value_returns_400(self):
        res = self.client.patch(
            f'{self.BASE}{self.doc.pk}/set_status/',
            {'status': 'InvalidStatus'},
            format='multipart',
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    # — Delete —

    def test_can_delete_document(self):
        res = self.client.delete(f'{self.BASE}{self.doc.pk}/')
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Document.objects.filter(pk=self.doc.pk).exists())
