"""
Management command: seed_pathfinder
Usage: python manage.py seed_pathfinder

Clears all existing Pathfinder questions/options and seeds 20 high-quality,
career-aligned questions with program weights for all 8 PKFokam programs:

  SE  — Software Engineering
  CS  — Computer Science
  BA  — Business Administration
  EE  — Electrical Engineering
  ME  — Mechanical Engineering
  MT  — Mechatronics Engineering
  IT  — Information Technology
  DS  — Data Science
"""

from django.core.management.base import BaseCommand
from pathfinder.models import PathfinderQuestion, PathfinderOption, PathfinderSession, PathfinderAnswer


# ---------------------------------------------------------------------------
# Question data
# Each question has:
#   text        — the question shown to the student
#   order       — display order (1–20)
#   options     — list of dicts:
#       text    — option label
#       value   — short key
#       weights — dict of program_code -> weight (0-25)
#                 Unmentioned programs get 0.
# ---------------------------------------------------------------------------
QUESTIONS = [
    # ── 1. Core passion ────────────────────────────────────────────────────
    {
        "text": "What kind of challenge excites you the most?",
        "order": 1,
        "options": [
            {
                "text": "Building software applications that millions of people use every day",
                "value": "build_software",
                "weights": {"SE": 25, "CS": 20, "IT": 18, "DS": 10, "BA": 5, "EE": 3, "ME": 2, "MT": 3},
            },
            {
                "text": "Uncovering hidden patterns in large datasets to drive decisions",
                "value": "analyze_data",
                "weights": {"DS": 25, "CS": 20, "SE": 10, "BA": 12, "IT": 8, "EE": 5, "ME": 3, "MT": 3},
            },
            {
                "text": "Designing machines, robots, or electrical systems that work in the real world",
                "value": "build_machines",
                "weights": {"ME": 25, "MT": 23, "EE": 22, "CS": 5, "SE": 3, "IT": 2, "DS": 3, "BA": 2},
            },
            {
                "text": "Growing businesses, leading teams, and creating economic value",
                "value": "grow_business",
                "weights": {"BA": 25, "IT": 15, "DS": 10, "SE": 8, "CS": 5, "EE": 3, "ME": 3, "MT": 3},
            },
        ],
    },
    # ── 2. Mathematics comfort ─────────────────────────────────────────────
    {
        "text": "How do you feel about advanced mathematics?",
        "order": 2,
        "options": [
            {
                "text": "I love it — calculus, linear algebra, proofs, and discrete math are fascinating",
                "value": "love_math",
                "weights": {"CS": 25, "DS": 22, "EE": 20, "SE": 14, "MT": 15, "ME": 12, "IT": 10, "BA": 5},
            },
            {
                "text": "I'm comfortable with applied math and statistics used in analysis",
                "value": "applied_math",
                "weights": {"DS": 22, "SE": 18, "IT": 15, "BA": 14, "CS": 18, "EE": 12, "ME": 10, "MT": 10},
            },
            {
                "text": "I prefer math when it applies to physical systems — mechanics, circuits, thermodynamics",
                "value": "physics_math",
                "weights": {"EE": 25, "ME": 25, "MT": 22, "CS": 10, "DS": 8, "SE": 5, "IT": 5, "BA": 3},
            },
            {
                "text": "I prefer to keep math minimal and focus on business, communication, and strategy",
                "value": "low_math",
                "weights": {"BA": 25, "IT": 18, "DS": 8, "SE": 8, "CS": 5, "EE": 3, "ME": 3, "MT": 3},
            },
        ],
    },
    # ── 3. Subject preference ──────────────────────────────────────────────
    {
        "text": "Which school subject did you enjoy the most?",
        "order": 3,
        "options": [
            {
                "text": "Computer Science or Programming — writing code felt natural and fun",
                "value": "enjoy_cs",
                "weights": {"SE": 25, "CS": 25, "IT": 22, "DS": 18, "BA": 5, "EE": 8, "ME": 3, "MT": 8},
            },
            {
                "text": "Physics or Mechanics — understanding forces, energy, and how things move",
                "value": "enjoy_physics",
                "weights": {"ME": 25, "EE": 22, "MT": 24, "CS": 10, "DS": 8, "SE": 5, "IT": 5, "BA": 3},
            },
            {
                "text": "Mathematics or Statistics — I loved the precision and problem-solving",
                "value": "enjoy_math",
                "weights": {"DS": 25, "CS": 22, "EE": 18, "SE": 15, "MT": 12, "ME": 10, "IT": 10, "BA": 8},
            },
            {
                "text": "Economics, Business Studies, or Accounting — markets and management fascinated me",
                "value": "enjoy_business",
                "weights": {"BA": 25, "IT": 15, "DS": 12, "SE": 8, "CS": 5, "EE": 3, "ME": 3, "MT": 3},
            },
        ],
    },
    # ── 4. Career vision ──────────────────────────────────────────────────
    {
        "text": "Where do you see yourself working in 10 years?",
        "order": 4,
        "options": [
            {
                "text": "At a leading tech company as a software engineer, architect, or CTO",
                "value": "career_tech",
                "weights": {"SE": 25, "CS": 20, "IT": 22, "DS": 12, "BA": 8, "EE": 5, "ME": 3, "MT": 5},
            },
            {
                "text": "As a data scientist or AI/ML researcher at a research lab or company",
                "value": "career_ai",
                "weights": {"DS": 25, "CS": 25, "SE": 15, "IT": 10, "EE": 10, "ME": 5, "MT": 8, "BA": 5},
            },
            {
                "text": "As a project manager, entrepreneur, or business executive",
                "value": "career_biz",
                "weights": {"BA": 25, "IT": 20, "SE": 12, "DS": 10, "CS": 5, "EE": 5, "ME": 5, "MT": 5},
            },
            {
                "text": "As an electrical, mechanical, or automation engineer designing systems",
                "value": "career_eng",
                "weights": {"EE": 25, "ME": 25, "MT": 25, "CS": 8, "SE": 5, "IT": 5, "DS": 5, "BA": 3},
            },
        ],
    },
    # ── 5. Preferred tools ────────────────────────────────────────────────
    {
        "text": "Which set of tools sounds most appealing to work with?",
        "order": 5,
        "options": [
            {
                "text": "Python, JavaScript, Git, cloud platforms — building and deploying software",
                "value": "tools_software",
                "weights": {"SE": 25, "CS": 20, "IT": 22, "DS": 15, "BA": 5, "EE": 5, "ME": 3, "MT": 5},
            },
            {
                "text": "Oscilloscopes, circuit simulators, PLC controllers — designing electronics",
                "value": "tools_electronics",
                "weights": {"EE": 25, "MT": 20, "ME": 12, "CS": 8, "SE": 3, "IT": 5, "DS": 3, "BA": 2},
            },
            {
                "text": "CAD software, 3D printers, CNC machines — engineering physical products",
                "value": "tools_cad",
                "weights": {"ME": 25, "MT": 22, "EE": 12, "CS": 5, "SE": 3, "IT": 3, "DS": 2, "BA": 2},
            },
            {
                "text": "Excel, Power BI, CRM systems, business strategy frameworks",
                "value": "tools_business",
                "weights": {"BA": 25, "IT": 18, "DS": 14, "SE": 5, "CS": 5, "EE": 3, "ME": 3, "MT": 3},
            },
        ],
    },
    # ── 6. Problem-solving style ──────────────────────────────────────────
    {
        "text": "When faced with a complex problem, what is your natural first instinct?",
        "order": 6,
        "options": [
            {
                "text": "Break it into smaller parts and write an algorithm or code to solve it",
                "value": "solve_code",
                "weights": {"SE": 25, "CS": 25, "IT": 18, "DS": 15, "EE": 8, "ME": 5, "MT": 8, "BA": 5},
            },
            {
                "text": "Collect data, run experiments, and analyze the results statistically",
                "value": "solve_data",
                "weights": {"DS": 25, "CS": 20, "EE": 15, "SE": 12, "ME": 10, "MT": 10, "BA": 12, "IT": 8},
            },
            {
                "text": "Sketch the mechanism, build a prototype, and test it physically",
                "value": "solve_prototype",
                "weights": {"ME": 25, "MT": 25, "EE": 20, "CS": 8, "SE": 5, "IT": 5, "DS": 5, "BA": 3},
            },
            {
                "text": "Research stakeholders, map workflows, and develop a strategic plan",
                "value": "solve_strategy",
                "weights": {"BA": 25, "IT": 22, "DS": 12, "SE": 8, "CS": 5, "EE": 5, "ME": 5, "MT": 5},
            },
        ],
    },
    # ── 7. Dream project ──────────────────────────────────────────────────
    {
        "text": "Which project would you be most excited to work on?",
        "order": 7,
        "options": [
            {
                "text": "A mobile app or SaaS platform used by thousands of people",
                "value": "project_app",
                "weights": {"SE": 25, "IT": 22, "CS": 18, "DS": 10, "BA": 10, "EE": 3, "ME": 2, "MT": 3},
            },
            {
                "text": "An autonomous robot or smart manufacturing system",
                "value": "project_robot",
                "weights": {"MT": 25, "EE": 22, "ME": 20, "CS": 15, "SE": 8, "DS": 8, "IT": 5, "BA": 3},
            },
            {
                "text": "A machine learning model that predicts disease outcomes or market trends",
                "value": "project_ml",
                "weights": {"DS": 25, "CS": 25, "SE": 15, "EE": 8, "IT": 10, "ME": 3, "MT": 5, "BA": 8},
            },
            {
                "text": "Launching a startup or consulting firm that solves a real business problem",
                "value": "project_startup",
                "weights": {"BA": 25, "IT": 20, "SE": 12, "DS": 10, "CS": 5, "EE": 5, "ME": 5, "MT": 5},
            },
        ],
    },
    # ── 8. Industry preference ────────────────────────────────────────────
    {
        "text": "Which industry would you most like to build a career in?",
        "order": 8,
        "options": [
            {
                "text": "Technology — software, cybersecurity, cloud computing, or fintech",
                "value": "industry_tech",
                "weights": {"SE": 25, "IT": 25, "CS": 22, "DS": 18, "BA": 8, "EE": 8, "ME": 3, "MT": 5},
            },
            {
                "text": "Energy, robotics, aerospace, or advanced manufacturing",
                "value": "industry_eng",
                "weights": {"EE": 25, "ME": 25, "MT": 25, "CS": 8, "SE": 5, "IT": 5, "DS": 5, "BA": 3},
            },
            {
                "text": "Finance, banking, consulting, or management",
                "value": "industry_finance",
                "weights": {"BA": 25, "DS": 20, "IT": 18, "CS": 8, "SE": 8, "EE": 3, "ME": 3, "MT": 3},
            },
            {
                "text": "Healthcare, biomedical research, or scientific innovation",
                "value": "industry_science",
                "weights": {"DS": 22, "CS": 18, "ME": 18, "EE": 15, "MT": 12, "SE": 10, "BA": 8, "IT": 8},
            },
        ],
    },
    # ── 9. Programming relationship ───────────────────────────────────────
    {
        "text": "How would you describe your relationship with programming?",
        "order": 9,
        "options": [
            {
                "text": "I love coding — it's my main skill and I build things with code daily",
                "value": "prog_love",
                "weights": {"SE": 25, "CS": 22, "IT": 20, "DS": 15, "EE": 5, "ME": 3, "MT": 8, "BA": 3},
            },
            {
                "text": "I use it occasionally for simulations, data analysis, or automation scripts",
                "value": "prog_occasional",
                "weights": {"EE": 18, "DS": 20, "ME": 12, "MT": 15, "CS": 15, "SE": 12, "IT": 12, "BA": 8},
            },
            {
                "text": "I can follow along but hardware design and physical systems interest me far more",
                "value": "prog_hardware",
                "weights": {"ME": 22, "MT": 22, "EE": 25, "CS": 8, "SE": 3, "IT": 3, "DS": 3, "BA": 2},
            },
            {
                "text": "I prefer business tools — dashboards, spreadsheets, and productivity software",
                "value": "prog_business",
                "weights": {"BA": 25, "IT": 18, "DS": 12, "SE": 5, "CS": 5, "EE": 3, "ME": 3, "MT": 3},
            },
        ],
    },
    # ── 10. Greatest achievement aspiration ───────────────────────────────
    {
        "text": "Which achievement would make you most proud?",
        "order": 10,
        "options": [
            {
                "text": "Launching a product used by millions — like a popular app or platform",
                "value": "proud_product",
                "weights": {"SE": 25, "IT": 22, "CS": 18, "DS": 10, "BA": 12, "EE": 3, "ME": 3, "MT": 3},
            },
            {
                "text": "Designing a component used in real satellites, cars, or industrial systems",
                "value": "proud_engineering",
                "weights": {"ME": 25, "EE": 25, "MT": 25, "CS": 8, "SE": 5, "IT": 3, "DS": 5, "BA": 3},
            },
            {
                "text": "Publishing a breakthrough research paper in AI, machine learning, or algorithms",
                "value": "proud_research",
                "weights": {"DS": 25, "CS": 25, "SE": 12, "EE": 10, "ME": 8, "MT": 8, "IT": 8, "BA": 5},
            },
            {
                "text": "Growing a company to FCFA 1 billion in revenue or leading a major organization",
                "value": "proud_business",
                "weights": {"BA": 25, "IT": 20, "SE": 12, "DS": 10, "CS": 5, "EE": 5, "ME": 5, "MT": 5},
            },
        ],
    },
    # ── 11. Daily work preference ─────────────────────────────────────────
    {
        "text": "Which of these best describes your ideal workday?",
        "order": 11,
        "options": [
            {
                "text": "Writing and reviewing code, shipping features, and solving bugs",
                "value": "day_coding",
                "weights": {"SE": 25, "CS": 20, "IT": 22, "DS": 12, "EE": 5, "ME": 3, "MT": 5, "BA": 3},
            },
            {
                "text": "Running simulations, lab testing, soldering circuits, or calibrating hardware",
                "value": "day_lab",
                "weights": {"EE": 25, "ME": 25, "MT": 22, "CS": 8, "SE": 5, "IT": 3, "DS": 5, "BA": 2},
            },
            {
                "text": "Exploring datasets, training models, and visualizing insights",
                "value": "day_data",
                "weights": {"DS": 25, "CS": 20, "SE": 12, "BA": 12, "IT": 10, "EE": 8, "ME": 5, "MT": 5},
            },
            {
                "text": "Attending meetings, building strategies, managing stakeholders, and presenting",
                "value": "day_meetings",
                "weights": {"BA": 25, "IT": 22, "DS": 8, "SE": 8, "CS": 5, "EE": 5, "ME": 5, "MT": 5},
            },
        ],
    },
    # ── 12. Elective course ───────────────────────────────────────────────
    {
        "text": "If you could add one course to your studies, which would you pick?",
        "order": 12,
        "options": [
            {
                "text": "Artificial Intelligence and Deep Learning",
                "value": "elective_ai",
                "weights": {"DS": 25, "CS": 25, "SE": 18, "IT": 12, "EE": 10, "MT": 8, "ME": 5, "BA": 5},
            },
            {
                "text": "Robotics and Mechatronic Systems Design",
                "value": "elective_robotics",
                "weights": {"MT": 25, "EE": 22, "ME": 20, "CS": 12, "SE": 8, "IT": 5, "DS": 8, "BA": 3},
            },
            {
                "text": "Entrepreneurship and Business Strategy",
                "value": "elective_business",
                "weights": {"BA": 25, "IT": 20, "SE": 12, "DS": 10, "CS": 5, "EE": 5, "ME": 5, "MT": 5},
            },
            {
                "text": "Computer Networks and Cybersecurity",
                "value": "elective_security",
                "weights": {"IT": 25, "SE": 18, "CS": 20, "EE": 10, "DS": 8, "ME": 3, "MT": 5, "BA": 5},
            },
        ],
    },
    # ── 13. Team role preference ──────────────────────────────────────────
    {
        "text": "In a group project, which role suits you best?",
        "order": 13,
        "options": [
            {
                "text": "The developer — I write the code and make sure everything actually works",
                "value": "role_dev",
                "weights": {"SE": 25, "CS": 20, "IT": 20, "DS": 12, "EE": 5, "ME": 3, "MT": 8, "BA": 3},
            },
            {
                "text": "The engineer — I design the physical or electrical components and systems",
                "value": "role_engineer",
                "weights": {"EE": 25, "ME": 25, "MT": 25, "CS": 8, "SE": 5, "IT": 3, "DS": 3, "BA": 3},
            },
            {
                "text": "The analyst — I dig into the data and tell the team what it means",
                "value": "role_analyst",
                "weights": {"DS": 25, "CS": 18, "BA": 18, "SE": 10, "IT": 12, "EE": 8, "ME": 5, "MT": 5},
            },
            {
                "text": "The strategist or project lead — I keep everyone aligned and moving forward",
                "value": "role_lead",
                "weights": {"BA": 25, "IT": 22, "SE": 12, "DS": 8, "CS": 5, "EE": 5, "ME": 5, "MT": 5},
            },
        ],
    },
    # ── 14. Theoretical vs. applied ───────────────────────────────────────
    {
        "text": "Which statement resonates most with you?",
        "order": 14,
        "options": [
            {
                "text": "I want to deeply understand the theory behind computation and algorithms",
                "value": "resonates_theory",
                "weights": {"CS": 25, "DS": 20, "SE": 15, "EE": 12, "IT": 10, "ME": 8, "MT": 8, "BA": 5},
            },
            {
                "text": "I want to apply engineering principles to build reliable physical systems",
                "value": "resonates_applied_eng",
                "weights": {"EE": 25, "ME": 25, "MT": 25, "CS": 8, "SE": 5, "IT": 5, "DS": 5, "BA": 3},
            },
            {
                "text": "I want to turn business problems into data-driven solutions",
                "value": "resonates_data_biz",
                "weights": {"DS": 25, "BA": 20, "CS": 15, "IT": 15, "SE": 10, "EE": 5, "ME": 5, "MT": 5},
            },
            {
                "text": "I want to build practical software systems that solve real user problems",
                "value": "resonates_practical_sw",
                "weights": {"SE": 25, "IT": 22, "CS": 18, "DS": 10, "BA": 8, "EE": 5, "ME": 3, "MT": 5},
            },
        ],
    },
    # ── 15. Impact motivation ─────────────────────────────────────────────
    {
        "text": "What kind of impact motivates you most?",
        "order": 15,
        "options": [
            {
                "text": "Improving everyday life through software, apps, and digital services",
                "value": "impact_digital",
                "weights": {"SE": 25, "IT": 22, "CS": 18, "DS": 12, "BA": 10, "EE": 5, "ME": 3, "MT": 5},
            },
            {
                "text": "Advancing science and engineering to push the boundaries of what's possible",
                "value": "impact_science",
                "weights": {"CS": 22, "DS": 20, "EE": 22, "ME": 20, "MT": 22, "SE": 12, "IT": 5, "BA": 5},
            },
            {
                "text": "Creating economic value — jobs, companies, and sustainable growth",
                "value": "impact_economic",
                "weights": {"BA": 25, "IT": 18, "DS": 12, "SE": 10, "CS": 5, "EE": 5, "ME": 5, "MT": 5},
            },
            {
                "text": "Using AI and data to help people make better decisions in healthcare, finance, etc.",
                "value": "impact_ai",
                "weights": {"DS": 25, "CS": 22, "SE": 15, "IT": 12, "BA": 12, "EE": 8, "ME": 5, "MT": 5},
            },
        ],
    },
    # ── 16. Challenge preference ──────────────────────────────────────────
    {
        "text": "Which of these real-world challenges would you most want to tackle?",
        "order": 16,
        "options": [
            {
                "text": "Building a distributed payment system that handles millions of transactions per second",
                "value": "challenge_payments",
                "weights": {"SE": 25, "CS": 22, "IT": 20, "DS": 10, "BA": 8, "EE": 3, "ME": 2, "MT": 3},
            },
            {
                "text": "Designing a solar-powered robotic arm that can work in a factory",
                "value": "challenge_robot",
                "weights": {"MT": 25, "EE": 25, "ME": 22, "CS": 10, "SE": 5, "DS": 5, "IT": 3, "BA": 3},
            },
            {
                "text": "Using neural networks to predict and prevent hospital readmissions",
                "value": "challenge_health_ai",
                "weights": {"DS": 25, "CS": 22, "SE": 15, "IT": 10, "EE": 8, "ME": 5, "MT": 5, "BA": 8},
            },
            {
                "text": "Building a financial model that helps a Cameroonian SME double its revenue",
                "value": "challenge_sme",
                "weights": {"BA": 25, "DS": 18, "IT": 18, "SE": 8, "CS": 5, "EE": 3, "ME": 3, "MT": 3},
            },
        ],
    },
    # ── 17. Learning style ────────────────────────────────────────────────
    {
        "text": "How do you learn best?",
        "order": 17,
        "options": [
            {
                "text": "By writing code and seeing it run — hands-on experimentation with software",
                "value": "learn_code",
                "weights": {"SE": 25, "CS": 22, "IT": 20, "DS": 15, "EE": 5, "ME": 3, "MT": 5, "BA": 3},
            },
            {
                "text": "By taking things apart, building prototypes, and testing in the lab",
                "value": "learn_prototype",
                "weights": {"ME": 25, "MT": 25, "EE": 22, "CS": 8, "SE": 5, "IT": 3, "DS": 5, "BA": 2},
            },
            {
                "text": "By reading research papers and studying algorithms and mathematical models",
                "value": "learn_theory",
                "weights": {"CS": 25, "DS": 22, "SE": 15, "EE": 15, "MT": 10, "ME": 10, "IT": 8, "BA": 5},
            },
            {
                "text": "By working through business case studies and real-world management scenarios",
                "value": "learn_cases",
                "weights": {"BA": 25, "IT": 20, "DS": 12, "SE": 8, "CS": 5, "EE": 5, "ME": 5, "MT": 5},
            },
        ],
    },
    # ── 18. Relationship with AI ──────────────────────────────────────────
    {
        "text": "How would you like to interact with Artificial Intelligence in your career?",
        "order": 18,
        "options": [
            {
                "text": "I want to build and train AI/ML models — understanding them at a mathematical level",
                "value": "ai_build",
                "weights": {"DS": 25, "CS": 25, "SE": 15, "IT": 10, "EE": 10, "MT": 8, "ME": 5, "BA": 5},
            },
            {
                "text": "I want to use AI tools to make smarter engineering systems (robots, sensors, control)",
                "value": "ai_eng",
                "weights": {"MT": 25, "EE": 22, "ME": 18, "CS": 15, "SE": 10, "DS": 12, "IT": 8, "BA": 3},
            },
            {
                "text": "I want to integrate AI into software products to improve user experience",
                "value": "ai_product",
                "weights": {"SE": 25, "IT": 22, "CS": 18, "DS": 15, "BA": 8, "EE": 5, "ME": 3, "MT": 5},
            },
            {
                "text": "I want to use AI-powered analytics to improve business decisions and strategy",
                "value": "ai_business",
                "weights": {"BA": 25, "DS": 20, "IT": 18, "CS": 10, "SE": 8, "EE": 5, "ME": 3, "MT": 3},
            },
        ],
    },
    # ── 19. Collaboration style ───────────────────────────────────────────
    {
        "text": "Which work environment suits you best?",
        "order": 19,
        "options": [
            {
                "text": "A small engineering team focused on shipping high-quality software",
                "value": "env_startup",
                "weights": {"SE": 25, "IT": 20, "CS": 18, "DS": 12, "BA": 8, "EE": 5, "ME": 3, "MT": 5},
            },
            {
                "text": "A research lab or engineering workshop with hands-on technical projects",
                "value": "env_lab",
                "weights": {"CS": 20, "DS": 20, "EE": 25, "ME": 25, "MT": 22, "SE": 8, "IT": 5, "BA": 3},
            },
            {
                "text": "A cross-functional corporate team solving business and market problems",
                "value": "env_corporate",
                "weights": {"BA": 25, "IT": 22, "DS": 15, "SE": 10, "CS": 5, "EE": 5, "ME": 5, "MT": 5},
            },
            {
                "text": "Deep solo focus — studying algorithms, writing papers, or architecting systems",
                "value": "env_solo",
                "weights": {"CS": 25, "DS": 22, "SE": 18, "EE": 12, "ME": 10, "MT": 10, "IT": 10, "BA": 5},
            },
        ],
    },
    # ── 20. PKFokam-specific vision ───────────────────────────────────────
    {
        "text": "What role do you want to play in Cameroon's development?",
        "order": 20,
        "options": [
            {
                "text": "Build the digital infrastructure — apps, platforms, and software for Cameroon",
                "value": "cm_digital",
                "weights": {"SE": 25, "IT": 25, "CS": 18, "DS": 12, "BA": 8, "EE": 5, "ME": 3, "MT": 5},
            },
            {
                "text": "Power the industrial revolution — renewable energy, smart factories, automation",
                "value": "cm_industrial",
                "weights": {"EE": 25, "ME": 25, "MT": 25, "CS": 8, "SE": 5, "IT": 5, "DS": 5, "BA": 3},
            },
            {
                "text": "Lead business transformation — new industries, jobs, and economic growth",
                "value": "cm_business",
                "weights": {"BA": 25, "IT": 18, "DS": 12, "SE": 10, "CS": 5, "EE": 5, "ME": 5, "MT": 5},
            },
            {
                "text": "Drive data and AI innovation — turning raw data into national insights",
                "value": "cm_data",
                "weights": {"DS": 25, "CS": 22, "SE": 15, "IT": 15, "BA": 12, "EE": 8, "ME": 5, "MT": 5},
            },
        ],
    },
]


class Command(BaseCommand):
    help = "Seed 20 career-aligned Pathfinder questions with program weights."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            default=False,
            help="Delete ALL existing questions, options, sessions, and answers before seeding.",
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING("\n=== Pathfinder Question Seeder ===\n"))


        if options["reset"]:
            self.stdout.write("  Deleting existing pathfinder data...")
            PathfinderAnswer.objects.all().delete()
            PathfinderSession.objects.all().delete()
            PathfinderOption.objects.all().delete()
            PathfinderQuestion.objects.all().delete()
            self.stdout.write(self.style.SUCCESS("  [OK] Cleared.\n"))
        else:
            existing = PathfinderQuestion.objects.count()
            if existing:
                self.stdout.write(
                    self.style.WARNING(
                        f"  [!] {existing} questions already exist. "
                        "Run with --reset to replace them.\n"
                    )
                )
                return

        self.stdout.write(f"  Seeding {len(QUESTIONS)} questions...\n")

        for q_data in QUESTIONS:
            question = PathfinderQuestion.objects.create(
                question_text=q_data["text"],
                question_type="multiple_choice",
                display_order=q_data["order"],
                is_active=True,
            )

            for i, opt in enumerate(q_data["options"], start=1):
                PathfinderOption.objects.create(
                    question=question,
                    option_text=opt["text"],
                    option_value=opt["value"],
                    program_weights=opt["weights"],
                    display_order=i,
                )

            self.stdout.write(
                self.style.SUCCESS(f"  [OK] Q{q_data['order']:02d}") +
                f" -- {q_data['text'][:65]}"
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"\n  Done. {PathfinderQuestion.objects.count()} questions, "
                f"{PathfinderOption.objects.count()} options seeded.\n"
            )
        )
