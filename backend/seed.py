from pymongo import MongoClient
from dotenv import load_dotenv
from datetime import datetime
import os

load_dotenv()

client = MongoClient(os.getenv("MONGODB_URI"))
db = client["devpulse"]

# Clear existing data
db.projects.drop()
db.tasks.drop()
db.activity_log.drop()
db.daily_plans.drop()

print("Cleared existing data...")

# ── Projects ──────────────────────────────────────────
projects = [
    {
        "name": "ASC Platform",
        "description": "Hospital OR scheduling and management system",
        "status": "active",
        "deadline": datetime(2026, 7, 1),
        "client": "Apollo Hospitals",
        "tech_stack": ["FastAPI", "MongoDB", "React", "Flutter"],
        "priority": "high",
        "type": "client"
    },
    {
        "name": "Xophysio",
        "description": "Physiotherapy clinic management system",
        "status": "active",
        "deadline": datetime(2026, 6, 20),
        "client": "Xophysio Clinic",
        "tech_stack": ["FastAPI", "MongoDB", "Flutter"],
        "priority": "high",
        "type": "client"
    },
    {
        "name": "XO Wear",
        "description": "Smart wearable device companion app with BLE",
        "status": "active",
        "deadline": datetime(2026, 8, 1),
        "client": "Internal",
        "tech_stack": ["Flutter", "MongoDB", "BLE"],
        "priority": "medium",
        "type": "client"
    },
    {
        "name": "DevLinks",
        "description": "Personal portfolio and link-in-bio tool",
        "status": "active",
        "deadline": datetime(2026, 6, 30),
        "client": "Personal",
        "tech_stack": ["React", "FastAPI", "MongoDB"],
        "priority": "medium",
        "type": "personal"
    },
    {
        "name": "SpendTrack",
        "description": "Personal expense tracker with monthly reports",
        "status": "active",
        "deadline": datetime(2026, 7, 15),
        "client": "Personal",
        "tech_stack": ["Flutter", "MongoDB"],
        "priority": "low",
        "type": "personal"
    },
    {
        "name": "AutoPost",
        "description": "Social media scheduler for Instagram and Twitter",
        "status": "active",
        "deadline": datetime(2026, 7, 30),
        "client": "Personal",
        "tech_stack": ["FastAPI", "MongoDB", "React"],
        "priority": "medium",
        "type": "personal"
    }
]

result = db.projects.insert_many(projects)
project_ids = result.inserted_ids
print(f"Inserted {len(project_ids)} projects ✓")

# ── Tasks ──────────────────────────────────────────────
tasks = [
    # ASC Platform tasks
    {
        "project_name": "ASC Platform",
        "title": "Build OR Board realtime sync",
        "priority": "high",
        "status": "in_progress",
        "estimated_hours": 6,
        "blocked_reason": None,
        "created_at": datetime(2026, 5, 20),
        "completed_at": None,
        "tags": ["backend", "websocket"]
    },
    {
        "project_name": "ASC Platform",
        "title": "Discharge module UI",
        "priority": "high",
        "status": "pending",
        "estimated_hours": 4,
        "blocked_reason": None,
        "created_at": datetime(2026, 5, 22),
        "completed_at": None,
        "tags": ["frontend", "react"]
    },
    {
        "project_name": "ASC Platform",
        "title": "Patient transfer API",
        "priority": "medium",
        "status": "pending",
        "estimated_hours": 3,
        "blocked_reason": "Waiting for API spec from client",
        "created_at": datetime(2026, 5, 18),
        "completed_at": None,
        "tags": ["backend", "api"]
    },

    # Xophysio tasks
    {
        "project_name": "Xophysio",
        "title": "Appointment booking flow",
        "priority": "high",
        "status": "in_progress",
        "estimated_hours": 5,
        "blocked_reason": None,
        "created_at": datetime(2026, 5, 21),
        "completed_at": None,
        "tags": ["flutter", "ui"]
    },
    {
        "project_name": "Xophysio",
        "title": "Client demo preparation",
        "priority": "high",
        "status": "pending",
        "estimated_hours": 2,
        "blocked_reason": None,
        "created_at": datetime(2026, 5, 28),
        "completed_at": None,
        "tags": ["demo"]
    },

    # XO Wear tasks
    {
        "project_name": "XO Wear",
        "title": "BLE device sync module",
        "priority": "medium",
        "status": "in_progress",
        "estimated_hours": 8,
        "blocked_reason": "BLE library compatibility issue with Flutter 3.x",
        "created_at": datetime(2026, 5, 15),
        "completed_at": None,
        "tags": ["flutter", "ble"]
    },
    {
        "project_name": "XO Wear",
        "title": "Device pairing UI",
        "priority": "low",
        "status": "pending",
        "estimated_hours": 3,
        "blocked_reason": None,
        "created_at": datetime(2026, 5, 25),
        "completed_at": None,
        "tags": ["flutter", "ui"]
    },

    # DevLinks tasks
    {
        "project_name": "DevLinks",
        "title": "Landing page design",
        "priority": "high",
        "status": "in_progress",
        "estimated_hours": 4,
        "blocked_reason": None,
        "created_at": datetime(2026, 5, 24),
        "completed_at": None,
        "tags": ["react", "ui"]
    },
    {
        "project_name": "DevLinks",
        "title": "Custom link management dashboard",
        "priority": "medium",
        "status": "pending",
        "estimated_hours": 5,
        "blocked_reason": None,
        "created_at": datetime(2026, 5, 25),
        "completed_at": None,
        "tags": ["react", "backend"]
    },
    {
        "project_name": "DevLinks",
        "title": "Analytics — track link clicks",
        "priority": "low",
        "status": "pending",
        "estimated_hours": 4,
        "blocked_reason": "Need to decide between self-hosted vs third party analytics",
        "created_at": datetime(2026, 5, 26),
        "completed_at": None,
        "tags": ["backend", "analytics"]
    },

    # SpendTrack tasks
    {
        "project_name": "SpendTrack",
        "title": "Expense input screen",
        "priority": "medium",
        "status": "in_progress",
        "estimated_hours": 3,
        "blocked_reason": None,
        "created_at": datetime(2026, 5, 23),
        "completed_at": None,
        "tags": ["flutter", "ui"]
    },
    {
        "project_name": "SpendTrack",
        "title": "Monthly report chart",
        "priority": "medium",
        "status": "pending",
        "estimated_hours": 4,
        "blocked_reason": None,
        "created_at": datetime(2026, 5, 26),
        "completed_at": None,
        "tags": ["flutter", "charts"]
    },
    {
        "project_name": "SpendTrack",
        "title": "Category tagging system",
        "priority": "low",
        "status": "pending",
        "estimated_hours": 2,
        "blocked_reason": "Finalizing category list first",
        "created_at": datetime(2026, 5, 27),
        "completed_at": None,
        "tags": ["flutter", "backend"]
    },

    # AutoPost tasks
    {
        "project_name": "AutoPost",
        "title": "Instagram API integration",
        "priority": "high",
        "status": "in_progress",
        "estimated_hours": 6,
        "blocked_reason": "Instagram API review taking longer than expected",
        "created_at": datetime(2026, 5, 19),
        "completed_at": None,
        "tags": ["backend", "api"]
    },
    {
        "project_name": "AutoPost",
        "title": "Post scheduler UI",
        "priority": "medium",
        "status": "pending",
        "estimated_hours": 5,
        "blocked_reason": None,
        "created_at": datetime(2026, 5, 24),
        "completed_at": None,
        "tags": ["react", "ui"]
    },
    {
        "project_name": "AutoPost",
        "title": "Twitter/X OAuth setup",
        "priority": "medium",
        "status": "pending",
        "estimated_hours": 3,
        "blocked_reason": None,
        "created_at": datetime(2026, 5, 27),
        "completed_at": None,
        "tags": ["backend", "auth"]
    }
]

db.tasks.insert_many(tasks)
print(f"Inserted {len(tasks)} tasks ✓")

# ── Activity Log ───────────────────────────────────────
activity = [
    {
        "project_name": "ASC Platform",
        "task_title": "Login authentication",
        "action": "completed",
        "note": "JWT auth with refresh tokens done",
        "timestamp": datetime(2026, 5, 27, 10, 30)
    },
    {
        "project_name": "Xophysio",
        "task_title": "Database schema design",
        "action": "completed",
        "note": "Finalized patient and appointment schema",
        "timestamp": datetime(2026, 5, 26, 14, 0)
    },
    {
        "project_name": "XO Wear",
        "task_title": "BLE device sync module",
        "action": "updated",
        "note": "Researching flutter_blue_plus as alternative",
        "timestamp": datetime(2026, 5, 25, 16, 45)
    },
    {
        "project_name": "DevLinks",
        "task_title": "Project setup and repo init",
        "action": "completed",
        "note": "Vite + React setup done with Tailwind configured",
        "timestamp": datetime(2026, 5, 24, 9, 0)
    },
    {
        "project_name": "SpendTrack",
        "task_title": "MongoDB schema design",
        "action": "completed",
        "note": "Expense and category collections designed",
        "timestamp": datetime(2026, 5, 23, 11, 30)
    },
    {
        "project_name": "AutoPost",
        "task_title": "Instagram API integration",
        "action": "updated",
        "note": "Submitted app for Instagram API review",
        "timestamp": datetime(2026, 5, 22, 15, 0)
    }
]

db.activity_log.insert_many(activity)
print(f"Inserted {len(activity)} activity logs ✓")

print("\n✅ Database seeded successfully!")
print("Projects : 6 (3 client + 3 personal)")
print("Tasks    : 16")
print("Activity : 6 logs")

client.close()