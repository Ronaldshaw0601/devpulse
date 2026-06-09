"""
Seed DevPulse demo data via the running backend API at localhost:8000.
Run this on Windows while the backend is running.
"""
import urllib.request
import json
from datetime import datetime, timedelta, timezone

BASE = "http://localhost:8000/api"

def post(path, data):
    body = json.dumps(data).encode()
    req = urllib.request.Request(
        f"{BASE}{path}", data=body,
        headers={"Content-Type": "application/json"}, method="POST"
    )
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read())

def get(path):
    with urllib.request.urlopen(f"{BASE}{path}", timeout=15) as r:
        return json.loads(r.read())

def today_plus(n):
    return (datetime.now(timezone.utc) + timedelta(days=n)).strftime("%Y-%m-%d")

def isodate(delta_days=0):
    return (datetime.now(timezone.utc) + timedelta(days=delta_days)).isoformat()

print("DevPulse Data Seeder")
print("=" * 40)

# --- Check existing data ---
try:
    existing_projects = get("/projects")
    existing_tasks = get("/tasks")
    print(f"Found {len(existing_projects)} existing projects, {len(existing_tasks)} existing tasks")
except Exception as e:
    print(f"Error checking existing data: {e}")
    print("Make sure the backend is running at localhost:8000")
    input("Press Enter to exit...")
    exit(1)

# --- PROJECTS (uses /projects/add with ProjectCreate schema) ---
# ProjectCreate: name, description, client, deadline (YYYY-MM-DD), priority, tech_stack, type
projects_to_add = [
    {"name": "DevPulse Agent", "description": "AI-powered project management agent for Google Cloud x MongoDB Hackathon 2026", "client": "Google Cloud Hackathon", "deadline": today_plus(4), "priority": "high", "tech_stack": ["FastAPI","React","MongoDB","Gemini"], "type": "hackathon"},
    {"name": "E-Commerce Redesign", "description": "Full UX/UI redesign of the Shopify storefront with mobile-first approach", "client": "TechMart Inc.", "deadline": today_plus(18), "priority": "medium", "tech_stack": ["Shopify","React","Figma"], "type": "client"},
    {"name": "Mobile Banking App", "description": "React Native app for fintech startup with real-time transaction tracking", "client": "NeoBank Ltd.", "deadline": today_plus(35), "priority": "high", "tech_stack": ["React Native","Node.js","PostgreSQL"], "type": "client"},
]

existing_proj_names = [p.get("name","") for p in existing_projects]
proj_names_added = list(existing_proj_names)

for proj in projects_to_add:
    if proj["name"] in existing_proj_names:
        print(f"  Skipping existing project: {proj['name']}")
        continue
    try:
        post("/projects/add", proj)
        proj_names_added.append(proj["name"])
        print(f"  Created project: {proj['name']}")
    except Exception as e:
        print(f"  Failed to create project {proj['name']}: {e}")

# --- TASKS (uses /tasks/add with TaskCreate schema) ---
# TaskCreate: project_name, title, priority, estimated_hours, tags
tasks_to_add = [
    {"project_name": "DevPulse Agent", "title": "Implement MongoDB MCP Bridge", "priority": "high", "estimated_hours": 4, "tags": ["backend","MCP"]},
    {"project_name": "DevPulse Agent", "title": "FastAPI Backend Setup", "priority": "high", "estimated_hours": 3, "tags": ["backend"]},
    {"project_name": "DevPulse Agent", "title": "Gemini 2.5 Flash Agent Integration", "priority": "high", "estimated_hours": 5, "tags": ["AI","Gemini"]},
    {"project_name": "DevPulse Agent", "title": "SSE Streaming Chat", "priority": "medium", "estimated_hours": 2, "tags": ["frontend","streaming"]},
    {"project_name": "DevPulse Agent", "title": "Deploy to Google Cloud Run", "priority": "high", "estimated_hours": 3, "tags": ["deployment","GCP"]},
    {"project_name": "DevPulse Agent", "title": "Record Demo Video", "priority": "high", "estimated_hours": 1, "tags": ["submission"]},
    {"project_name": "DevPulse Agent", "title": "Write Project README", "priority": "medium", "estimated_hours": 2, "tags": ["docs"]},
    {"project_name": "E-Commerce Redesign", "title": "Homepage Hero Redesign", "priority": "high", "estimated_hours": 6, "tags": ["design"]},
    {"project_name": "E-Commerce Redesign", "title": "Mobile Checkout Flow", "priority": "high", "estimated_hours": 8, "tags": ["mobile","UX"]},
    {"project_name": "E-Commerce Redesign", "title": "Product Filter Component", "priority": "medium", "estimated_hours": 5, "tags": ["frontend"]},
    {"project_name": "Mobile Banking App", "title": "Auth & Biometric Login", "priority": "high", "estimated_hours": 10, "tags": ["security","auth"]},
    {"project_name": "Mobile Banking App", "title": "Transaction History Screen", "priority": "medium", "estimated_hours": 7, "tags": ["mobile"]},
]

existing_task_titles = [t.get("title","") for t in existing_tasks]
created = 0
skipped = 0
for task in tasks_to_add:
    if task["title"] in existing_task_titles:
        skipped += 1
        continue
    try:
        post("/tasks/add", task)
        created += 1
    except Exception as e:
        print(f"  Failed to create task '{task['title']}': {e}")

print(f"  Created {created} tasks, skipped {skipped} existing")

# Mark some as completed via /tasks/complete
to_complete = [
    "Implement MongoDB MCP Bridge",
    "FastAPI Backend Setup",
    "Gemini 2.5 Flash Agent Integration",
    "SSE Streaming Chat",
    "Homepage Hero Redesign",
]
completed_count = 0
for title in to_complete:
    try:
        post("/tasks/complete", {"task_title": title, "note": "Completed"})
        completed_count += 1
    except Exception as e:
        pass  # May already be completed
print(f"  Marked {completed_count} tasks as completed")

# --- Verify ---
print("\nVerification:")
projects_final = get("/projects")
tasks_final = get("/tasks")
print(f"  Projects: {len(projects_final)}")
print(f"  Tasks: {len(tasks_final)}")

print("\n✅ Seed complete!")
# Write results to log so we can verify
import pathlib
log_path = pathlib.Path(__file__).parent / "seed_log.txt"
log_path.write_text(
    f"Seed ran at {datetime.now(timezone.utc).isoformat()}\n"
    f"Projects: {len(projects_final)}\n"
    f"Tasks: {len(tasks_final)}\n"
)
