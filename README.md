# PKFIE-Hub — AI-Powered Student Information Portal

> An intelligent campus gateway for [PKFokam Institute of Excellence](https://pkfokam.edu.cm) that combines a role-based student portal, AI-powered chat assistant, and a full-featured admin panel — built with React 19 and Django 5.2.

---

## What it does

PKFIE-Hub replaces the fragmented, paper-based information flow at PKFokam with a single platform. Students, parents, and lecturers log in to one place to find documents, announcements, events, and career guidance. Administrators manage everything through a dedicated panel. An embedded AI assistant — powered by Anthropic Claude with an OpenAI fallback — answers campus-specific questions grounded in uploaded institutional documents.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        Browser                          │
│                                                         │
│  React 19 · React Router 7 · Tailwind CSS · Axios      │
│                                                         │
│  ┌─────────────────┐      ┌────────────────────────┐   │
│  │  Student Portal  │      │      Admin Panel       │   │
│  │  Dashboard       │      │  User Management       │   │
│  │  AI Assistant    │      │  Announcement/Events   │   │
│  │  Calendar        │      │  Feedback/Notifs       │   │
│  │  Pathfinder Quiz │      │  AI Model Config       │   │
│  │  Handbook        │      │  System Settings       │   │
│  │  Innovation      │      │  Analytics             │   │
│  └────────┬─────────┘      └──────────┬─────────────┘   │
└───────────┼──────────────────────────┼─────────────────┘
            │   JWT Bearer Token       │
            ▼                          ▼
┌─────────────────────────────────────────────────────────┐
│              Django REST Framework API                   │
│              (16 apps · IsAuthenticated default)        │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │  users   │  │  chat    │  │documents │             │
│  │  JWT auth│  │  AI msgs │  │  RAG     │             │
│  └──────────┘  └──────────┘  └──────────┘             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │announce- │  │ events   │  │pathfinder│             │
│  │ments     │  │ feedback │  │ handbook │             │
│  └──────────┘  └──────────┘  └──────────┘             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │innovation│  │ gallery  │  │  system  │             │
│  │analytics │  │calendar  │  │ai_training│            │
│  └──────────┘  └──────────┘  └──────────┘             │
└─────────────────────────┬───────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
     SQLite /          ChromaDB       Anthropic /
    PostgreSQL        (RAG vectors)   OpenAI API
```

---

## Feature overview

### Student / Parent / Lecturer portal

| Feature | Description |
|---|---|
| **AI Chat Assistant** | Ask campus-specific questions. Claude reads institutional documents via RAG to give grounded answers. |
| **Pathfinder Quiz** | Step-by-step career and program recommendation wizard based on interests and aptitudes. |
| **Announcements** | Live feed of campus announcements filterable by priority (low / normal / high / urgent). |
| **Calendar** | Unified view of personal and campus events. Day, week, and month views with a live "now" indicator. |
| **Handbook** | Structured student handbook with sections and content blocks. |
| **Innovation Hub** | Showcase of student innovation projects, challenges, and community members. |
| **Gallery** | Photo and video gallery organized by occasion. |
| **Feedback** | Submit feedback with file attachments and priority levels. |
| **Notifications** | Notification centre with type filtering and mark-all-read. |
| **Settings** | Update profile, preferences, and account details. |

### Admin panel

| Feature | Description |
|---|---|
| **User Management** | Create, search, filter, and manage all accounts across all roles. |
| **Announcement Management** | Full CRUD with priority, audience targeting, and viewer analytics. |
| **Event Management** | 7 event types (seminar, workshop, webinar, conference, hackathon, cultural, competition) with registration links and attendee tracking. |
| **Feedback Management** | View and respond to student feedback. Bulk actions, priority/category filters, attachment downloads. |
| **Notifications** | Send and manage platform notifications. Mark all read. Server-side search and type filtering. |
| **AI Model Management** | Configure Anthropic/OpenAI model parameters (temperature, max tokens, top-p, Claude variant). Live test prompt with latency display. |
| **Document Management** | Upload institutional documents that feed the AI assistant's RAG pipeline. |
| **System Settings** | Key/value settings grouped by category (General, AI, File, Email). Change tracking with unsaved-changes guard. |
| **Analytics** | Admin action logs, audit trails, and usage statistics. |

---

## Technology stack

### Frontend
- **React 19** with React Router 7
- **Tailwind CSS** (custom navy/gold PKFokam palette)
- **Axios** with JWT Bearer interceptor and automatic 401 logout
- **Chart.js / Recharts** for analytics dashboards
- **react-icons** (Feather set)

### Backend
- **Django 5.2** + **Django REST Framework 3.16**
- **SimpleJWT** — access/refresh token authentication
- **django-cors-headers** — CORS management
- **Anthropic SDK** (primary AI provider) + **OpenAI SDK** (fallback)
- **ChromaDB** — vector store for RAG document retrieval
- **PyPDF2 / python-docx** — document parsing pipeline
- **Celery** — async task queue
- **SQLite** (development) / **PostgreSQL** (production via `dj-database-url`)

---

## Authentication & access control

All API endpoints require a valid JWT Bearer token (`IsAuthenticated` is the default permission class). Role-based access is enforced server-side on individual endpoints — not just on the frontend:

| Role | Access |
|---|---|
| `student` | Student portal |
| `parent` | Student portal (read-heavy) |
| `lecturer` | Student portal + course-related write access |
| `admin` | Full admin panel + all write endpoints |

Key enforcement points:
- AI model config, system settings, and user management require `IsAdminUser` or `IsStaff`
- Feedback submissions are readable only by the submitter or an admin (`IsAdminUser` on the list endpoint)
- Conversations and notifications are scoped to the requesting user — users cannot read each other's data

---

## Security & Privacy

- **Credentials**: All secrets (API keys, SMTP password, `SECRET_KEY`) live in `pkfehub_backend/.env`, which is excluded from version control via `.gitignore`
- **JWT expiry**: Tokens expire server-side; the frontend clears auth state on any 401 response
- **Input validation**: All writes pass through DRF serializer validation. Client-side validation is additive
- **No `dangerouslySetInnerHTML`**: Rich content is rendered with `whitespace-pre-wrap`, never injected as raw HTML
- **CORS**: Restricted to `localhost:3000` in development — set `CORS_ALLOWED_ORIGINS` to your production domain before deploying
- **Student data isolation**: All querysets are filtered by `user=request.user` at the API level

> **Planned**: API rate limiting (Django Ratelimit or DRF throttling classes) on the AI chat and authentication endpoints.

---

## Getting started

### Prerequisites

- Python 3.10+
- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com/) — or an OpenAI key as fallback
- A Gmail [App Password](https://myaccount.google.com/apppasswords) for outgoing email (optional)

### 1. Clone the repo

```bash
git clone https://github.com/letschangeAfrica/pkfie-hub.git
cd pkfie-hub
```

### 2. Backend setup

```bash
cd pkfehub_backend

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create your environment file
cp .env.example .env            # then fill in real values
```

Edit `pkfehub_backend/.env`:

```env
SECRET_KEY=replace-with-a-long-random-string
DEBUG=True
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1

# AI — at least one key required for the chat assistant
ANTHROPIC_API_KEY=sk-ant-...
# OPENAI_API_KEY=sk-...

# Email (optional — for password reset and notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=you@gmail.com
EMAIL_HOST_PASSWORD=your-gmail-app-password
DEFAULT_FROM_EMAIL=PKFIE-Hub <you@gmail.com>
```

```bash
# Run migrations
python manage.py migrate

# Create an admin account
python manage.py createsuperuser

# (Optional) Seed Pathfinder quiz data
python manage.py seed_pathfinder

# Start the API server
python manage.py runserver
```

The API is now available at `http://localhost:8000/api/`.

### 3. Frontend setup

```bash
# From the repo root
npm install
npm start
```

The app opens at `http://localhost:3000`. Log in with the superuser credentials — the admin panel is at `/admin`.

### 4. Run both together

```bash
# From the repo root
npm run dev
```

---

## Project structure

```
pkfie-hub/
├── pkfehub_backend/          # Django backend
│   ├── users/                # Custom user model (email-based), JWT auth
│   ├── chat/                 # AI assistant, conversations, AIModel config
│   ├── documents/            # Document storage + RAG pipeline
│   ├── announcements/        # Campus announcements with viewer tracking
│   ├── events/               # Campus events with attendee management
│   ├── feedback/             # Feedback submissions, categories, responses
│   ├── notifications/        # Per-user notifications
│   ├── pathfinder/           # Career/program recommendation quiz engine
│   ├── handbook/             # Structured student handbook
│   ├── innovation/           # Innovation projects and challenges
│   ├── gallery/              # Media gallery by occasion
│   ├── calendar_app/         # Unified calendar events
│   ├── analytics/            # Audit logs, usage stats, admin action tracking
│   ├── ai_training/          # RAG training pipeline (ChromaDB)
│   ├── system/               # System-wide settings (key/value store)
│   └── pkfehub_backend/      # Django project settings and root URLs
│
└── src/                      # React frontend
    ├── pages/
    │   ├── admin/            # Admin panel (10 pages)
    │   └── main/             # Student/lecturer portal (13 pages)
    ├── components/           # Shared layout and UI components
    └── services/
        └── api.js            # Axios instance with JWT Bearer interceptor
```

---

## Environment variables reference

| Variable | Required | Description |
|---|---|---|
| `SECRET_KEY` | Yes | Django secret key — use a long random string in production |
| `DEBUG` | No | `True` for development; always `False` in production |
| `DJANGO_ALLOWED_HOSTS` | Yes | Comma-separated list of allowed hostnames |
| `ANTHROPIC_API_KEY` | Yes* | Powers the AI assistant (primary provider) |
| `OPENAI_API_KEY` | Yes* | AI fallback if Anthropic key is absent |
| `DATABASE_URL` | No | PostgreSQL connection URL; defaults to SQLite if absent |
| `EMAIL_HOST_USER` | No | Gmail address for outgoing email |
| `EMAIL_HOST_PASSWORD` | No | Gmail App Password (not your login password) |

\* At least one AI key is required for the chat assistant to function.

---

## Deployment

- Set `DEBUG=False` and update `DJANGO_ALLOWED_HOSTS` with your real domain
- Set `CORS_ALLOWED_ORIGINS` in `settings.py` to your frontend URL
- Run `python manage.py collectstatic` and serve `/staticfiles/` via nginx or a CDN
- Use PostgreSQL in production — set `DATABASE_URL` in your host's environment variables panel
- **Never commit `.env`** — use your platform's secret management (Railway, Vercel, Render env vars)

Recommended platforms: **Railway** (backend + PostgreSQL), **Vercel** (frontend)

---

## Contributing

1. Fork the repo and create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes and run tests: `python manage.py test`
3. Open a pull request against `main`

---

## License

MIT — see [LICENSE](LICENSE) for details.
