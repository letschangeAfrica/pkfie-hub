from unittest.mock import patch
from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from users.models import User
from .models import Conversation, Message, AIModel


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


def make_conversation(user, title='Test Conversation'):
    return Conversation.objects.create(user=user, title=title)


def make_message(conversation, user, text='Hello', msg_type='user'):
    return Message.objects.create(
        conversation=conversation,
        user=user,
        message_text=text,
        message_type=msg_type,
    )


# ── Model tests ────────────────────────────────────────────────────────────

class ConversationModelTest(TestCase):

    def test_str_contains_id_and_email(self):
        user = make_user()
        conv = make_conversation(user)
        self.assertIn(user.email, str(conv))

    def test_is_active_defaults_true(self):
        user = make_user()
        conv = make_conversation(user)
        self.assertTrue(conv.is_active)


class MessageModelTest(TestCase):

    def setUp(self):
        self.user = make_user()
        self.conv = make_conversation(self.user)

    def test_str_contains_type_and_email(self):
        msg = make_message(self.conv, self.user, msg_type='user')
        self.assertIn('user', str(msg))
        self.assertIn(self.user.email, str(msg))

    def test_message_linked_to_conversation(self):
        msg = make_message(self.conv, self.user)
        self.assertEqual(msg.conversation, self.conv)


class AIModelModelTest(TestCase):

    def test_str_contains_provider_name_version(self):
        ai = AIModel.objects.create(name='claude-haiku', version='4.5', provider='Anthropic')
        self.assertIn('Anthropic', str(ai))
        self.assertIn('claude-haiku', str(ai))

    def test_is_active_defaults_true(self):
        ai = AIModel.objects.create(name='gpt-3.5', version='1', provider='OpenAI')
        self.assertTrue(ai.is_active)


# ── Conversation API tests ─────────────────────────────────────────────────

class ConversationAPITest(APITestCase):

    BASE = '/api/conversations/'

    def setUp(self):
        self.user = make_user()
        self.conv = make_conversation(self.user, title='My Chat')
        self.client.credentials(**auth_header(self.client, 'student@pkfokam.edu', 'Pass1234!'))

    def test_authenticated_user_can_list_conversations(self):
        res = self.client.get(self.BASE)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_unauthenticated_cannot_list(self):
        self.client.credentials()
        res = self.client.get(self.BASE)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_returns_own_conversations_only(self):
        other_user = make_user(email='other@pkfokam.edu')
        make_conversation(other_user, title='Other Chat')
        res = self.client.get(self.BASE)
        titles = [c['title'] for c in res.data]
        self.assertIn('My Chat', titles)
        self.assertNotIn('Other Chat', titles)

    def test_create_conversation(self):
        res = self.client.post(self.BASE, {'title': 'New Thread'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Conversation.objects.filter(title='New Thread').exists())

    def test_archive_action_sets_is_active_false(self):
        res = self.client.post(f'{self.BASE}{self.conv.pk}/archive/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.conv.refresh_from_db()
        self.assertFalse(self.conv.is_active)

    def test_archived_conversation_excluded_from_list(self):
        self.conv.is_active = False
        self.conv.save()
        res = self.client.get(self.BASE)
        titles = [c['title'] for c in res.data]
        self.assertNotIn('My Chat', titles)


# ── Message API tests ──────────────────────────────────────────────────────

class MessageAPITest(APITestCase):

    BASE = '/api/messages/'

    def setUp(self):
        self.user = make_user()
        self.conv = make_conversation(self.user)
        self.msg = make_message(self.conv, self.user, text='What is the deadline?')
        self.client.credentials(**auth_header(self.client, 'student@pkfokam.edu', 'Pass1234!'))

    def test_list_messages_for_conversation(self):
        res = self.client.get(f'{self.BASE}?conversation={self.conv.pk}')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        texts = [m['message_text'] for m in res.data]
        self.assertIn('What is the deadline?', texts)

    def test_messages_filtered_to_own_user(self):
        other = make_user(email='other@pkfokam.edu')
        other_conv = make_conversation(other)
        make_message(other_conv, other, text='Other person message')
        res = self.client.get(self.BASE)
        texts = [m['message_text'] for m in res.data]
        self.assertNotIn('Other person message', texts)


# ── AI Chat API tests ──────────────────────────────────────────────────────

class AIChatAPITest(APITestCase):

    URL = '/api/chat/ai/'

    def setUp(self):
        self.user = make_user()
        self.client.credentials(**auth_header(self.client, 'student@pkfokam.edu', 'Pass1234!'))

    @patch('chat.views._call_ai', return_value='Here is your answer.')
    def test_valid_message_returns_200_with_ai_response(self, mock_ai):
        res = self.client.post(self.URL, {'message': 'What are the exam dates?'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('ai_message', res.data)
        self.assertEqual(res.data['ai_message']['message_text'], 'Here is your answer.')

    @patch('chat.views._call_ai', return_value='Reply text.')
    def test_creates_new_conversation_when_none_provided(self, mock_ai):
        res = self.client.post(self.URL, {'message': 'Hello AI'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('conversation_id', res.data)
        self.assertTrue(Conversation.objects.filter(pk=res.data['conversation_id']).exists())

    @patch('chat.views._call_ai', return_value='Continuing.')
    def test_continues_existing_conversation(self, mock_ai):
        conv = make_conversation(self.user, title='Existing')
        res = self.client.post(self.URL, {
            'message': 'Follow-up question.',
            'conversation_id': conv.pk,
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['conversation_id'], conv.pk)

    def test_empty_message_returns_400(self):
        res = self.client.post(self.URL, {'message': ''}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unauthenticated_returns_401(self):
        self.client.credentials()
        res = self.client.post(self.URL, {'message': 'Hello'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    @patch('chat.views._call_ai', side_effect=RuntimeError('No API key configured.'))
    def test_missing_api_key_returns_503(self, mock_ai):
        res = self.client.post(self.URL, {'message': 'Will this work?'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertIn('setup_required', res.data)

    @patch('chat.views._call_ai', return_value='Model response.')
    def test_saves_both_user_and_assistant_messages(self, mock_ai):
        res = self.client.post(self.URL, {'message': 'Test message'}, format='json')
        conv_id = res.data['conversation_id']
        self.assertEqual(Message.objects.filter(conversation_id=conv_id).count(), 2)
        types = list(Message.objects.filter(conversation_id=conv_id).values_list('message_type', flat=True))
        self.assertIn('user', types)
        self.assertIn('assistant', types)


# ── Chat Stats API tests ───────────────────────────────────────────────────

class ChatStatsAPITest(APITestCase):

    URL = '/api/chat/stats/'

    def setUp(self):
        self.user = make_user()
        self.client.credentials(**auth_header(self.client, 'student@pkfokam.edu', 'Pass1234!'))

    def test_authenticated_user_can_get_stats(self):
        res = self.client.get(self.URL)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('stats', res.data)

    def test_stats_contains_required_keys(self):
        res = self.client.get(self.URL)
        stats = res.data['stats']
        for key in ('total_messages', 'total_conversations', 'ai_provider'):
            self.assertIn(key, stats)

    def test_unauthenticated_cannot_get_stats(self):
        self.client.credentials()
        res = self.client.get(self.URL)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
