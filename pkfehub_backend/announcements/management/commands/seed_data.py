"""
Management command: seed_data
Usage: python manage.py seed_data

- Clears all announcements, events, notifications, and announcement/doc views.
- Keeps existing users and documents intact.
- Populates fresh announcements and events dated from 2025-2026.
- Creates one notification per user for the first announcement.
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
import datetime

from announcements.models import Announcement, AnnouncementView
from events.models import Event
from notifications.models import Notification
from users.models import User

try:
    from documents.models import DocumentView
    HAS_DOC_VIEWS = True
except ImportError:
    HAS_DOC_VIEWS = False


def dt(year, month, day, hour=8, minute=0):
    """Return an aware datetime in the local timezone."""
    return timezone.make_aware(datetime.datetime(year, month, day, hour, minute))


class Command(BaseCommand):
    help = "Clear outdated data and seed fresh announcements, events, and notifications."

    def add_arguments(self, parser):
        parser.add_argument(
            "--keep-users",
            action="store_true",
            default=True,
            help="Keep existing users (default: True).",
        )
        parser.add_argument(
            "--no-notify",
            action="store_true",
            default=False,
            help="Skip creating notifications.",
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING("\n=== PKFokam Hub — Data Seeder ===\n"))

        # ── 1. Clear old data ──────────────────────────────────────────────────
        self.stdout.write("  Clearing old announcements, events, and notifications...")
        AnnouncementView.objects.all().delete()
        Announcement.objects.all().delete()
        Event.objects.all().delete()
        Notification.objects.all().delete()
        if HAS_DOC_VIEWS:
            DocumentView.objects.all().delete()
        self.stdout.write(self.style.SUCCESS("  OK Old data cleared."))

        # ── 2. Get or create the admin author ──────────────────────────────────
        admin = User.objects.filter(is_superuser=True).first() or \
                User.objects.filter(role="admin").first() or \
                User.objects.first()

        if not admin:
            self.stdout.write(self.style.ERROR("  FAIL No users found. Create a superuser first."))
            return

        self.stdout.write(f"  Using author: {admin.email}")

        # ── 3. Seed announcements ──────────────────────────────────────────────
        self.stdout.write("\n  Seeding announcements...")

        announcements_data = [
            {
                "title": "Welcome to the 2025–2026 Academic Year",
                "content": (
                    "Dear PKFokam community, welcome to a new and exciting academic year! "
                    "Registration for all programmes is now open. Please ensure you complete "
                    "your academic profile and confirm your course selections before the deadline. "
                    "The academic office is available Monday–Friday, 8:00–17:00 for any queries."
                ),
                "priority": "high",
                "start_date": dt(2025, 9, 1),
                "end_date":   dt(2025, 9, 30),
            },
            {
                "title": "Tuition Fee Payment Deadline — First Semester",
                "content": (
                    "All students are reminded that the first-semester tuition fee payment deadline "
                    "is 30 September 2025. Students who have not settled their fees by this date will "
                    "be suspended from academic activities. Payment can be made via bank transfer or "
                    "at the bursary office. Contact bursary@pkfokam.edu for queries."
                ),
                "priority": "high",
                "start_date": dt(2025, 9, 5),
                "end_date":   dt(2025, 9, 30),
            },
            {
                "title": "Library Hours Extended for Exam Period",
                "content": (
                    "The PKFokam Institute library will extend its operating hours during the "
                    "December examination period (1–20 December 2025). New hours: Monday–Saturday "
                    "07:00–22:00, Sunday 09:00–18:00. Students are encouraged to book study rooms "
                    "via the student portal at least 24 hours in advance."
                ),
                "priority": "normal",
                "start_date": dt(2025, 11, 25),
                "end_date":   dt(2025, 12, 20),
            },
            {
                "title": "PKFIE Hackathon 2025 — Open for Registrations",
                "content": (
                    "The annual PKFIE Innovation Hackathon is back! This year's theme is "
                    "'Technology for African Education'. Teams of 2–4 students can register "
                    "through the Innovation Hub portal. Prizes include mentorship opportunities, "
                    "seed funding of up to 500,000 XAF, and certificates. Registration closes "
                    "15 October 2025."
                ),
                "priority": "normal",
                "start_date": dt(2025, 9, 15),
                "end_date":   dt(2025, 10, 15),
            },
            {
                "title": "New AI-Powered Learning Assistant Now Live",
                "content": (
                    "We are pleased to announce that the PKFIE-Hub AI assistant is now fully "
                    "operational. Students can access personalised academic support, course "
                    "guidance, and document search 24/7 via the Assistant tab. Your conversations "
                    "are private and securely stored. We welcome your feedback to help us improve."
                ),
                "priority": "normal",
                "start_date": dt(2025, 9, 10),
                "end_date":   None,
            },
            {
                "title": "Semester 2 Registration Opens January 2026",
                "content": (
                    "Registration for the second semester opens on 5 January 2026 and closes "
                    "20 January 2026. Students must confirm their course selections with their "
                    "academic advisor before the portal closes. Late registrations will incur a "
                    "penalty fee. Contact your faculty coordinator for more information."
                ),
                "priority": "high",
                "start_date": dt(2026, 1, 2),
                "end_date":   dt(2026, 1, 20),
            },
            {
                "title": "IT System Maintenance — 5 October 2025",
                "content": (
                    "The PKFIE-Hub platform will undergo scheduled maintenance on Sunday, "
                    "5 October 2025 from 02:00 to 06:00. During this window all services "
                    "including the student portal, email, and AI assistant will be unavailable. "
                    "We apologise for any inconvenience and appreciate your patience."
                ),
                "priority": "low",
                "start_date": dt(2025, 10, 3),
                "end_date":   dt(2025, 10, 6),
            },
            {
                "title": "Career Fair 2025 — Save the Date",
                "content": (
                    "PKFokam Institute's annual Career Fair will be held on 14 November 2025 "
                    "in the Main Auditorium. Over 30 leading companies from Cameroon and the "
                    "wider CEMAC region will be present. Students in their final year are "
                    "strongly encouraged to attend. CV workshops will run in the week before "
                    "the fair — see the events section for details."
                ),
                "priority": "normal",
                "start_date": dt(2025, 10, 20),
                "end_date":   dt(2025, 11, 14),
            },
            {
                "title": "Scholarship Applications Open — Academic Excellence Award",
                "content": (
                    "Applications for the PKFokam Academic Excellence Scholarship for the "
                    "2025–2026 academic year are now open. Eligible students must have a GPA "
                    "of 3.5 or above and demonstrate financial need. Applications must be "
                    "submitted via the student portal by 31 October 2025. Awarded students "
                    "will receive up to 50% tuition fee waiver."
                ),
                "priority": "high",
                "start_date": dt(2025, 9, 20),
                "end_date":   dt(2025, 10, 31),
            },
            {
                "title": "Campus Wi-Fi Upgrade Completed",
                "content": (
                    "We are pleased to inform the PKFokam community that the campus-wide Wi-Fi "
                    "upgrade has been completed successfully. All academic buildings, the library, "
                    "cafeteria, and student residence now have access to high-speed 500 Mbps "
                    "connectivity. Use your student or staff credentials to connect to the "
                    "'PKFIE-Campus' network."
                ),
                "priority": "low",
                "start_date": dt(2025, 9, 8),
                "end_date":   None,
            },
        ]

        created_announcements = []
        for a in announcements_data:
            obj = Announcement.objects.create(
                title=a["title"],
                content=a["content"],
                priority=a["priority"],
                start_date=a["start_date"],
                end_date=a.get("end_date"),
                author=admin,
                is_active=True,
            )
            created_announcements.append(obj)

        self.stdout.write(self.style.SUCCESS(f"  OK {len(created_announcements)} announcements created."))

        # ── 4. Seed events ──────────────────────────────────────────────────────
        self.stdout.write("\n  Seeding events...")

        events_data = [
            # ── September 2025 ──
            {
                "title": "Opening Ceremony 2025–2026 Academic Year",
                "description": (
                    "The formal opening ceremony for the 2025–2026 academic year. "
                    "All students, staff, and faculty are expected to attend. "
                    "Guest speakers include the Rector and representatives from industry partners."
                ),
                "event_type": "academic",
                "start_time": dt(2025, 9, 8, 9),
                "end_time":   dt(2025, 9, 8, 12),
                "location":   "Main Auditorium, PKFokam Campus",
                "organizer":  "Office of the Rector",
                "max_attendees": 600,
            },
            {
                "title": "Orientation Day — New Students",
                "description": (
                    "A full-day orientation programme for all first-year and transfer students. "
                    "Campus tour, introduction to PKFIE-Hub, library induction, and meetings "
                    "with faculty advisors. Breakfast and lunch provided."
                ),
                "event_type": "academic",
                "start_time": dt(2025, 9, 9, 8),
                "end_time":   dt(2025, 9, 9, 17),
                "location":   "Block A Lecture Halls & Campus Grounds",
                "organizer":  "Student Affairs Office",
                "max_attendees": 250,
            },
            {
                "title": "AI & Machine Learning Bootcamp",
                "description": (
                    "A 3-day intensive bootcamp on practical AI and machine learning. "
                    "Topics: Python for AI, supervised learning, neural networks, and "
                    "hands-on projects using real datasets from the African context. "
                    "Open to all students and staff. Bring your own laptop."
                ),
                "event_type": "workshop",
                "start_time": dt(2025, 9, 22, 9),
                "end_time":   dt(2025, 9, 24, 17),
                "location":   "Computer Science Lab, Building C",
                "organizer":  "Department of Technology",
                "max_attendees": 40,
            },
            {
                "title": "Sports Day & Campus Games 2025",
                "description": (
                    "Annual inter-faculty sports competition. Events include football, basketball, "
                    "volleyball, and athletics. All students and staff are welcome to participate "
                    "or cheer their faculty team. Refreshments and prizes for winning teams."
                ),
                "event_type": "social",
                "start_time": dt(2025, 9, 27, 8, 30),
                "end_time":   dt(2025, 9, 27, 18),
                "location":   "PKFokam Sports Grounds",
                "organizer":  "Student Affairs Office",
                "max_attendees": None,
            },
            # ── October 2025 ──
            {
                "title": "PKFIE Hackathon 2025 — Kick-off & Team Formation",
                "description": (
                    "Official kick-off for the 2025 PKFIE Hackathon. Teams register, receive "
                    "the challenge brief, and begin their 48-hour sprint. Theme: 'Technology "
                    "for African Education'. Final presentations on 18 October."
                ),
                "event_type": "competition",
                "start_time": dt(2025, 10, 16, 9),
                "end_time":   dt(2025, 10, 18, 17),
                "location":   "Innovation Hub, Ground Floor",
                "organizer":  "Innovation & Entrepreneurship Department",
                "max_attendees": 120,
            },
            {
                "title": "CV Writing & LinkedIn Workshop",
                "description": (
                    "Practical workshop run by the Careers Office. Learn how to write a "
                    "compelling CV, craft a professional LinkedIn profile, and prepare for "
                    "interviews. Especially useful for students attending the November Career Fair."
                ),
                "event_type": "career",
                "start_time": dt(2025, 10, 7, 14),
                "end_time":   dt(2025, 10, 7, 17),
                "location":   "Seminar Room 2, Block B",
                "organizer":  "Careers & Industry Partnerships Office",
                "max_attendees": 60,
            },
            {
                "title": "Guest Lecture: Entrepreneurship in the Digital Age",
                "description": (
                    "A guest lecture by a prominent Cameroonian tech entrepreneur. "
                    "Topics: starting a startup in Central Africa, funding landscape, "
                    "scaling from Cameroon to the continent. Q&A session included."
                ),
                "event_type": "academic",
                "start_time": dt(2025, 10, 14, 15),
                "end_time":   dt(2025, 10, 14, 17),
                "location":   "Amphitheatre B",
                "organizer":  "Business Faculty",
                "max_attendees": 200,
            },
            # ── November 2025 ──
            {
                "title": "PKFokam Career Fair 2025",
                "description": (
                    "Annual career fair bringing together leading employers and PKFokam students. "
                    "Over 30 companies recruiting across engineering, business, technology, and "
                    "health sciences. Dress professionally. Bring printed CVs and your student ID."
                ),
                "event_type": "career",
                "start_time": dt(2025, 11, 14, 9),
                "end_time":   dt(2025, 11, 14, 17),
                "location":   "Main Auditorium & Foyer, PKFokam Campus",
                "organizer":  "Careers & Industry Partnerships Office",
                "max_attendees": None,
            },
            {
                "title": "Research Symposium — Student Presentations",
                "description": (
                    "Annual research symposium where final-year and postgraduate students "
                    "present their research projects. Open to all PKFokam community members. "
                    "Best paper award presented in each faculty. Lunch included for presenters."
                ),
                "event_type": "academic",
                "start_time": dt(2025, 11, 20, 8, 30),
                "end_time":   dt(2025, 11, 21, 17),
                "location":   "Conference Centre, PKFokam Campus",
                "organizer":  "Research & Innovation Office",
                "max_attendees": 150,
            },
            {
                "title": "African Cultural Night 2025",
                "description": (
                    "A celebration of African culture featuring traditional music, dance, "
                    "food, and fashion from across the continent. Students are encouraged to "
                    "dress in traditional attire from their home country or region. "
                    "All are welcome — tickets available at the Student Affairs Office."
                ),
                "event_type": "social",
                "start_time": dt(2025, 11, 28, 18),
                "end_time":   dt(2025, 11, 28, 22),
                "location":   "Open-Air Amphitheatre, PKFokam Campus",
                "organizer":  "Student Union",
                "max_attendees": 400,
            },
            # ── December 2025 ──
            {
                "title": "First Semester Examinations",
                "description": (
                    "First semester written examinations for all programmes. "
                    "Students must consult their personal exam timetable on the student portal. "
                    "Ensure your student ID and approved stationery are ready. "
                    "No late entries permitted after the invigilator calls time."
                ),
                "event_type": "academic",
                "start_time": dt(2025, 12, 1, 7, 30),
                "end_time":   dt(2025, 12, 19, 17),
                "location":   "All Exam Venues, PKFokam Campus",
                "organizer":  "Academic Registrar",
                "max_attendees": None,
            },
            {
                "title": "End of Year Gala & Awards Ceremony",
                "description": (
                    "Celebrate the end of semester with the PKFokam Gala Night. "
                    "Awards will be given for academic excellence, innovation, community service, "
                    "and sporting achievement. Formal dress required. Tickets available via the "
                    "student portal — limited capacity."
                ),
                "event_type": "social",
                "start_time": dt(2025, 12, 20, 18, 30),
                "end_time":   dt(2025, 12, 20, 23),
                "location":   "Grand Hall, PKFokam Campus",
                "organizer":  "Office of the Rector",
                "max_attendees": 300,
            },
            # ── January–February 2026 ──
            {
                "title": "Semester 2 Registration & Enrolment",
                "description": (
                    "In-person and online registration for second-semester courses. "
                    "Students must have settled all outstanding fees before they can register. "
                    "Academic advisors will be available at their respective faculty offices "
                    "throughout the registration period."
                ),
                "event_type": "academic",
                "start_time": dt(2026, 1, 5, 8),
                "end_time":   dt(2026, 1, 20, 17),
                "location":   "Faculty Offices & Student Portal",
                "organizer":  "Academic Registrar",
                "max_attendees": None,
            },
            {
                "title": "Data Science & Analytics Workshop",
                "description": (
                    "Two-day workshop covering data analytics fundamentals, Python with pandas, "
                    "data visualisation, and a capstone case study using African economic data. "
                    "Certificate of participation issued. Limited spots — register early."
                ),
                "event_type": "workshop",
                "start_time": dt(2026, 2, 6, 9),
                "end_time":   dt(2026, 2, 7, 17),
                "location":   "Computer Science Lab, Building C",
                "organizer":  "Department of Technology",
                "max_attendees": 35,
            },
            {
                "title": "Webinar: Studying Abroad — Scholarships & Opportunities",
                "description": (
                    "Online webinar on international scholarship opportunities for PKFokam "
                    "students and graduates. Topics include Chevening, Mastercard Foundation, "
                    "DAAD, and French Government scholarships. How to write a winning application. "
                    "Link shared on the student portal one day before the event."
                ),
                "event_type": "webinar",
                "start_time": dt(2026, 2, 19, 16),
                "end_time":   dt(2026, 2, 19, 18),
                "location":   "Online (Zoom — link on portal)",
                "organizer":  "International Affairs Office",
                "max_attendees": 200,
            },
            # ── March–April 2026 ──
            {
                "title": "Tech Conference: Africa Innovates 2026",
                "description": (
                    "PKFokam hosts the annual Africa Innovates conference bringing together "
                    "technology leaders, academics, and entrepreneurs from across Central Africa. "
                    "Keynote speeches, panel discussions, and networking opportunities. "
                    "Student attendance highly encouraged."
                ),
                "event_type": "conference",
                "start_time": dt(2026, 3, 12, 8),
                "end_time":   dt(2026, 3, 13, 18),
                "location":   "Conference Centre, PKFokam Campus",
                "organizer":  "Office of the Rector & Innovation Department",
                "max_attendees": 500,
            },
            {
                "title": "Second Semester Examinations",
                "description": (
                    "Final examinations for the second semester. Refer to your individual "
                    "timetable on the student portal. Results will be published within 3 weeks "
                    "of the end of the examination period."
                ),
                "event_type": "academic",
                "start_time": dt(2026, 4, 27, 7, 30),
                "end_time":   dt(2026, 5, 15, 17),
                "location":   "All Exam Venues, PKFokam Campus",
                "organizer":  "Academic Registrar",
                "max_attendees": None,
            },
        ]

        for e in events_data:
            Event.objects.create(
                title=e["title"],
                description=e["description"],
                event_type=e["event_type"],
                start_time=e["start_time"],
                end_time=e["end_time"],
                location=e.get("location", ""),
                organizer=e.get("organizer", "PKFokam Institute"),
                max_attendees=e.get("max_attendees"),
                organizer_user=admin,
                is_active=True,
            )

        self.stdout.write(self.style.SUCCESS(f"  OK {len(events_data)} events created."))

        # ── 5. Seed notifications for all users ────────────────────────────────
        if not options["no_notify"]:
            self.stdout.write("\n  Creating notifications for all users...")
            users = User.objects.all()
            first_ann = created_announcements[0]
            notifs_created = 0
            for user in users:
                Notification.objects.create(
                    user=user,
                    text=f"New announcement: {first_ann.title}",
                    notif_type='info',
                    read=False,
                )
                notifs_created += 1
            self.stdout.write(self.style.SUCCESS(f"  OK {notifs_created} notifications created."))

        # ── Done ───────────────────────────────────────────────────────────────
        self.stdout.write(self.style.MIGRATE_HEADING(
            f"\n=== Seeding complete! ==="
            f"\n    Announcements : {len(created_announcements)}"
            f"\n    Events        : {len(events_data)}"
            f"\n    Database      : db.sqlite3"
            f"\n"
        ))
