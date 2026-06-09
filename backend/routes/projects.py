from fastapi import APIRouter, UploadFile, File
from fastapi.responses import Response
from database import projects_col as _py_projects, tasks_col as _py_tasks, \
    activity_col as _py_activity, usage_col as _py_usage, \
    files_col as _py_files, db
from db_mcp import MCPCollection
from datetime import datetime, timedelta
from pydantic import BaseModel
from typing import List, Optional
from bson import ObjectId
import base64

# Route all main CRUD through MongoDB MCP bridge (avoids Windows Python SSL issue)
projects_col  = MCPCollection("projects",     _py_projects)
tasks_col     = MCPCollection("tasks",        _py_tasks)
activity_col  = MCPCollection("activity_log", _py_activity)
usage_col     = MCPCollection("usage",        _py_usage)
files_col     = MCPCollection("files",        _py_files)

router = APIRouter()

class ProjectCreate(BaseModel):
    name: str
    description: str
    client: str
    deadline: str
    priority: str
    tech_stack: List[str]
    type: str = "personal"

class TaskCreate(BaseModel):
    project_name: str
    title: str
    priority: str
    estimated_hours: int
    tags: Optional[List[str]] = []

@router.get("/projects")
def get_projects():
    projects = list(projects_col.find(
        {"status": "active"},
        {"_id": 0}
    ))
    return {"projects": projects}

@router.get("/tasks")
def get_tasks():
    tasks = list(tasks_col.find(
        {"status": {"$in": ["pending", "in_progress"]}},
        {"_id": 0}
    ).sort("priority", -1))
    return {"tasks": tasks}

@router.get("/activity")
def get_activity():
    activity = list(activity_col.find(
        {},
        {"_id": 0}
    ).sort("timestamp", -1).limit(20))
    return {"activity": activity}

@router.get("/blocked")
def get_blocked():
    blocked = list(tasks_col.find(
        {"blocked_reason": {"$ne": None}},
        {"_id": 0}
    ))
    return {"blocked": blocked}

@router.post("/projects/add")
def add_project(project: ProjectCreate):
    new_project = {
        "name": project.name,
        "description": project.description,
        "status": "active",
        "deadline": project.deadline,
        "client": project.client,
        "tech_stack": project.tech_stack,
        "priority": project.priority,
        "type": project.type,
        "created_at": datetime.utcnow().isoformat()
    }
    projects_col.insert_one(new_project)
    return {"status": "project added successfully"}

@router.post("/tasks/add")
def add_task(task: TaskCreate):
    new_task = {
        "project_name": task.project_name,
        "title": task.title,
        "priority": task.priority,
        "status": "pending",
        "estimated_hours": task.estimated_hours,
        "blocked_reason": None,
        "created_at": datetime.utcnow().isoformat(),
        "completed_at": None,
        "tags": task.tags
    }
    tasks_col.insert_one(new_task)
    return {"status": "task added successfully"}

@router.get("/usage")
def get_usage():
    from datetime import timedelta
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=6)
    today_str = today_start.isoformat()
    week_str = week_start.isoformat()

    all_usage = list(usage_col.find({}, {"_id": 0}).sort("timestamp", -1))

    total_tokens = sum(u.get("total_tokens", 0) for u in all_usage)
    total_prompt = sum(u.get("prompt_tokens", 0) for u in all_usage)
    total_output = sum(u.get("output_tokens", 0) for u in all_usage)
    total_requests = len(all_usage)

    def _ts_str(u):
        ts = u.get("timestamp", "")
        if hasattr(ts, "isoformat"):
            return ts.isoformat()
        return str(ts)

    today_usage = [u for u in all_usage if _ts_str(u) >= today_str]
    today_tokens = sum(u.get("total_tokens", 0) for u in today_usage)

    # Daily breakdown for last 7 days
    daily = {}
    for i in range(7):
        day = (today_start - timedelta(days=i)).strftime("%b %d")
        daily[day] = 0
    for u in all_usage:
        ts = _ts_str(u)
        if ts >= week_str:
            try:
                day = datetime.fromisoformat(ts[:19]).strftime("%b %d")
                if day in daily:
                    daily[day] += u.get("total_tokens", 0)
            except Exception:
                pass
    daily_breakdown = [{"date": k, "tokens": v} for k, v in reversed(list(daily.items()))]

    recent = all_usage[:10]
    for r in recent:
        if "timestamp" in r:
            r["timestamp"] = _ts_str(r)

    return {
        "total_tokens": total_tokens,
        "total_prompt_tokens": total_prompt,
        "total_output_tokens": total_output,
        "total_requests": total_requests,
        "today_tokens": today_tokens,
        "daily_breakdown": daily_breakdown,
        "recent": recent,
    }

@router.post("/tasks/complete")
def complete_task(data: dict):
    task_title = data.get("task_title")
    note = data.get("note", "Task completed")
    
    tasks_col.update_one(
        {"title": task_title},
        {"$set": {
            "status": "completed",
            "completed_at": datetime.utcnow().isoformat()
        }}
    )
    activity_col.insert_one({
        "task_title": task_title,
        "action": "completed",
        "note": note,
        "timestamp": datetime.utcnow().isoformat()
    })
    return {"status": "task completed and logged"}


# ── Time Allocation ────────────────────────────────────────

@router.get("/time-allocation")
def get_time_allocation():
    from database import time_allocation_col as _py_ta
    from db_mcp import MCPCollection
    time_allocation_col = MCPCollection("time_allocation", _py_ta)
    today = datetime.utcnow().strftime("%Y-%m-%d")
    record = time_allocation_col.find_one({"date": today}, {"_id": 0})
    if record:
        return record
    return {"date": today, "deep_work": 0, "shallow_work": 0, "meetings": 0, "total": 0, "tasks": [], "generated": False}


@router.post("/time-allocation/generate")
def generate_time_allocation():
    import json, re
    from database import time_allocation_col as _py_ta
    from db_mcp import MCPCollection
    time_allocation_col = MCPCollection("time_allocation", _py_ta)
    from agent import generate_text

    today = datetime.utcnow().strftime("%Y-%m-%d")

    # Get today's tasks
    tasks = list(tasks_col.find(
        {"status": {"$in": ["pending", "in_progress"]}},
        {"_id": 0}
    ).sort("priority", -1).limit(10))

    if not tasks:
        result = {"date": today, "deep_work": 0, "shallow_work": 0, "meetings": 0, "total": 0, "tasks": [], "generated": True, "note": "No tasks available"}
        time_allocation_col.replace_one({"date": today}, {**result, "timestamp": datetime.utcnow().isoformat()}, upsert=True)
        return result

    task_list = "\n".join([f"- {t['title']} ({t['priority']} priority, {t.get('estimated_hours', 1)}h, project: {t['project_name']})" for t in tasks])
    total_task_hours = sum(t.get("estimated_hours", 1) for t in tasks)

    prompt = f"""Analyze these tasks and allocate time into Deep Work, Shallow Work, and Meetings categories.

Tasks:
{task_list}

Rules:
- Deep Work = focused coding, design, complex problem solving (high priority tasks)
- Shallow Work = reviews, documentation, simple fixes, communication (medium/low priority)
- Meetings = client calls, standups, reviews (tasks with 'meeting', 'review', 'client', 'call' in title)
- Total hours should equal {min(total_task_hours, 8)} hours

Return ONLY valid JSON in this exact format (no explanation):
{{"deep_work": 3.5, "shallow_work": 2.0, "meetings": 0.5, "task_categories": [{{"title": "task name", "category": "deep_work", "hours": 1.5}}]}}"""

    try:
        response = generate_text(prompt)

        # Extract JSON from response
        json_match = re.search(r'\{.*\}', response, re.DOTALL)
        if json_match:
            data = json.loads(json_match.group())
            deep = round(float(data.get("deep_work", 0)), 1)
            shallow = round(float(data.get("shallow_work", 0)), 1)
            meetings = round(float(data.get("meetings", 0)), 1)
            task_categories = data.get("task_categories", [])
        else:
            raise ValueError("No JSON found")

    except Exception:
        # Fallback: compute from task priorities
        deep = round(sum(t.get("estimated_hours", 1) for t in tasks if t.get("priority") == "high"), 1)
        shallow = round(sum(t.get("estimated_hours", 1) for t in tasks if t.get("priority") in ["medium", "low"]) * 0.7, 1)
        meetings = round(sum(t.get("estimated_hours", 1) for t in tasks if t.get("priority") in ["medium", "low"]) * 0.3, 1)
        task_categories = []

    total = round(deep + shallow + meetings, 1)

    result = {
        "date": today,
        "deep_work": deep,
        "shallow_work": shallow,
        "meetings": meetings,
        "total": total,
        "tasks": task_categories,
        "generated": True,
        "generated_at": datetime.utcnow().isoformat(),
    }

    time_allocation_col.replace_one(
        {"date": today},
        {**result, "timestamp": datetime.utcnow().isoformat()},
        upsert=True
    )

    return result


# ── File Attachments ───────────────────────────────────────

@router.post("/tasks/{task_title}/upload")
async def upload_file(task_title: str, file: UploadFile = File(...)):
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        return {"error": "File too large (max 10MB)"}

    file_doc = {
        "task_title": task_title,
        "filename": file.filename,
        "mimetype": file.content_type or "application/octet-stream",
        "size": len(content),
        "data": base64.b64encode(content).decode(),
        "uploaded_at": datetime.utcnow().isoformat(),
    }
    result = files_col.insert_one(file_doc)

    activity_col.insert_one({
        "task_title": task_title,
        "action": "updated",
        "note": f"File '{file.filename}' attached",
        "timestamp": datetime.utcnow().isoformat(),
    })

    return {
        "status": "uploaded",
        "file_id": str(result.inserted_id),
        "filename": file.filename,
        "size": len(content),
    }


@router.get("/tasks/{task_title}/files")
def get_task_files(task_title: str):
    files = list(files_col.find({"task_title": task_title}, {"data": 0}))
    for f in files:
        if "_id" in f:
            f["_id"] = str(f["_id"])
        if "uploaded_at" in f and hasattr(f["uploaded_at"], "isoformat"):
            f["uploaded_at"] = f["uploaded_at"].isoformat()
    return {"files": files}


@router.get("/files/{file_id}")
def download_file(file_id: str):
    try:
        f = files_col.find_one({"_id": ObjectId(file_id)})
    except Exception:
        return Response(status_code=404)
    if not f:
        return Response(status_code=404)
    content = base64.b64decode(f["data"])
    return Response(
        content=content,
        media_type=f.get("mimetype", "application/octet-stream"),
        headers={"Content-Disposition": f'attachment; filename="{f["filename"]}"'},
    )


@router.delete("/files/{file_id}")
def delete_file(file_id: str):
    try:
        result = files_col.delete_one({"_id": ObjectId(file_id)})
        return {"deleted": result.deleted_count > 0}
    except Exception as e:
        return {"error": str(e)}


# ── AI Daily Briefing ──────────────────────────────────────

def _ist_now():
    """Current datetime in IST (UTC+5:30)."""
    from datetime import timedelta
    return datetime.utcnow() + timedelta(hours=5, minutes=30)

def _time_period(hour: int) -> str:
    if 5 <= hour < 12:  return "morning"
    if 12 <= hour < 17: return "afternoon"
    if 17 <= hour < 21: return "evening"
    return "night"

@router.get("/briefing")
def get_briefing():
    from agent import generate_text
    from database import db as mongo_db

    briefings_col = MCPCollection("briefings", mongo_db["briefings"])
    now_ist   = _ist_now()
    today     = now_ist.strftime("%Y-%m-%d")
    hour      = now_ist.hour
    period    = _time_period(hour)
    time_str  = now_ist.strftime("%I:%M %p")  # e.g. "02:30 PM"

    # Cache per day+period so greeting refreshes morning → afternoon → evening
    cache_key = f"{today}-{period}"
    cached = briefings_col.find_one({"cache_key": cache_key}, {"_id": 0})
    if cached:
        return cached

    projects = list(projects_col.find({"status": "active"}, {"_id": 0}))
    tasks    = list(tasks_col.find({"status": {"$in": ["pending", "in_progress"]}}, {"_id": 0}).sort("priority", -1).limit(15))
    blocked  = list(tasks_col.find({"blocked_reason": {"$ne": None}}, {"_id": 0}))

    urgent = []
    for p in projects:
        try:
            deadline = datetime.strptime(str(p.get("deadline", ""))[:10], "%Y-%m-%d")
            days = (deadline - now_ist).days
            if days <= 5:
                urgent.append({"name": p["name"], "days": days})
        except Exception:
            pass

    task_summary = "\n".join([
        f"- {t['title']} ({t.get('priority','?')} priority, {t.get('project_name','')})"
        for t in tasks[:8]
    ])
    urgent_str  = ", ".join([f"{u['name']} ({u['days']}d)" for u in urgent]) or "None"
    blocked_str = f"{len(blocked)} blocked task(s)"

    greeting_guide = {
        "morning":   "Start with 'Good morning' — be energetic and set the tone for the day.",
        "afternoon": "Start with 'Good afternoon' — focus on progress made and what's left.",
        "evening":   "Start with 'Good evening' — reflect on the day's work and any final pushes needed.",
        "night":     "Start with 'Good night' — encourage wrapping up and planning for tomorrow.",
    }[period]

    prompt = f"""Generate a concise, motivational briefing for Raj Ronald Shaw, a solo developer in Chennai.

Current time: {time_str} IST ({period})
Today's date: {today}

Stats:
- Active projects: {len(projects)}
- Pending/in-progress tasks: {len(tasks)}
- Blocked tasks: {blocked_str}
- Urgent deadlines (≤5 days): {urgent_str}
- Top tasks:
{task_summary}

Instructions: {greeting_guide}
Write 2-3 sentences max. Be specific and mention the most critical thing to focus on right now given the time of day.
Do NOT use bullet points. Natural, direct tone."""

    try:
        from agent import generate_text
        text = generate_text(prompt, temperature=0.7)
    except Exception:
        greet = {"morning": "Good morning", "afternoon": "Good afternoon",
                 "evening": "Good evening", "night": "Good night"}[period]
        text = f"{greet}, Raj! You have {len(tasks)} tasks across {len(projects)} projects. Stay focused!"

    result = {
        "date": today,
        "cache_key": cache_key,
        "period": period,
        "time": time_str,
        "text": text,
        "stats": {
            "projects": len(projects),
            "tasks": len(tasks),
            "blocked": len(blocked),
            "urgent": len(urgent),
        },
        "generated_at": now_ist.isoformat(),
    }
    briefings_col.insert_one({**result})
    return result


# ── Project Health Scores ──────────────────────────────────

@router.get("/projects/health-scores")
def get_health_scores():
    projects = list(projects_col.find({"status": "active"}, {"_id": 0}))
    scores = []

    for p in projects:
        project_tasks = list(tasks_col.find({"project_name": p["name"]}, {"_id": 0}))
        total = len(project_tasks)
        completed = len([t for t in project_tasks if t.get("status") == "completed"])
        blocked = len([t for t in project_tasks if t.get("blocked_reason")])
        pending = len([t for t in project_tasks if t.get("status") in ["pending", "in_progress"]])

        # Completion rate score (0–40 pts)
        completion_score = (completed / total * 40) if total > 0 else 20

        # Deadline score (0–40 pts)
        try:
            deadline = datetime.strptime(str(p.get("deadline", ""))[:10], "%Y-%m-%d")
            days_left = (deadline - datetime.utcnow()).days
            if days_left < 0:
                deadline_score = 0
            elif days_left <= 3:
                deadline_score = 10
            elif days_left <= 7:
                deadline_score = 20
            elif days_left <= 14:
                deadline_score = 30
            else:
                deadline_score = 40
        except Exception:
            deadline_score = 30

        # Blocker penalty (0–20 pts, starting at 20)
        blocker_score = max(0, 20 - blocked * 8)

        raw = completion_score + deadline_score + blocker_score
        score = max(0, min(100, round(raw)))

        if score >= 75:
            label, color = "Healthy", "#22c55e"
        elif score >= 55:
            label, color = "At Risk", "#f59e0b"
        elif score >= 35:
            label, color = "Warning", "#f97316"
        else:
            label, color = "Critical", "#ef4444"

        scores.append({
            "project_name": p["name"],
            "score": score,
            "label": label,
            "color": color,
            "stats": {
                "total_tasks": total,
                "completed": completed,
                "blocked": blocked,
                "pending": pending,
            },
        })

    return {"scores": scores}


# ── Deadline Warnings ──────────────────────────────────────

@router.get("/warnings")
def get_warnings():
    projects = list(projects_col.find({"status": "active"}, {"_id": 0}))
    warnings = []

    for p in projects:
        try:
            deadline = datetime.strptime(str(p.get("deadline", ""))[:10], "%Y-%m-%d")
            days = (deadline - datetime.utcnow()).days
            if days <= 5:
                pending_count = tasks_col.count_documents({
                    "project_name": p["name"],
                    "status": {"$in": ["pending", "in_progress"]},
                })
                if pending_count > 0:
                    warnings.append({
                        "project_name": p["name"],
                        "days_left": days,
                        "pending_tasks": pending_count,
                        "overdue": days < 0,
                    })
        except Exception:
            pass

    warnings.sort(key=lambda w: w["days_left"])
    return {"warnings": warnings}


# ── AI Daily Plan ─────────────────────────────────────────────

@router.get("/plan/today")
def get_today_plan():
    from database import plans_col as _py_plans
    plans = MCPCollection("daily_plans", _py_plans)
    today = datetime.utcnow().strftime("%Y-%m-%d")
    plan = plans.find_one({"date": today}, {"_id": 0})
    if plan:
        return plan
    return {"date": today, "generated": False, "scheduled_tasks": []}


@router.post("/plan/generate")
def generate_today_plan():
    import json, re, math
    from database import plans_col as _py_plans
    from agent import generate_text

    plans    = MCPCollection("daily_plans", _py_plans)
    now_ist  = _ist_now()
    today    = now_ist.strftime("%Y-%m-%d")
    hour_now = now_ist.hour + now_ist.minute / 60.0
    time_str = now_ist.strftime("%I:%M %p")
    period   = _time_period(now_ist.hour)

    # Round up to next half-hour as the start slot
    start_hour = math.ceil(hour_now * 2) / 2  # e.g. 14.3 → 14.5
    if start_hour < 9:   start_hour = 9.0
    if start_hour >= 21: start_hour = 21.0    # end of schedulable day

    def _fmt_time(h: float) -> str:
        hh = int(h) % 12 or 12
        mm = int((h % 1) * 60)
        ampm = "AM" if int(h) < 12 else "PM"
        return f"{hh:02d}:{mm:02d} {ampm}"

    raw_tasks = list(tasks_col.find(
        {"status": {"$in": ["pending", "in_progress"]}},
        {"_id": 0}
    ).sort("priority", -1))

    if not raw_tasks or start_hour >= 21:
        note = "No pending tasks." if not raw_tasks else f"It's {time_str} IST — the work day is over. Great job today!"
        result = {
            "date": today, "generated": True, "scheduled_tasks": [],
            "note": note, "generated_at": now_ist.isoformat(),
        }
        plans.replace_one({"date": today}, result, upsert=True)
        return result

    task_list = "\n".join([
        f"{i+1}. [{t.get('priority','medium').upper()}] {t['title']} "
        f"— {t.get('estimated_hours', 1)}h — project: {t.get('project_name','?')} "
        f"— status: {t.get('status','pending')}"
        f"{' — BLOCKED: ' + t['blocked_reason'] if t.get('blocked_reason') else ''}"
        for i, t in enumerate(raw_tasks[:8])
    ])

    prompt = f"""You are a smart daily planner for a solo developer in Chennai.
Current time: {time_str} IST ({period}) — Date: {today}
Available work window: {_fmt_time(start_hour)} to 09:00 PM IST

Pending tasks:
{task_list}

Create an optimized schedule for the REMAINING work window today. Rules:
- First slot starts at {_fmt_time(start_hour)} (current time, rounded up)
- Schedule high-priority tasks first
- Allow 15-min breaks between tasks (factor into end times)
- Assign a confidence score (50–99): higher for high-priority clear tasks, lower for blocked/vague ones
- Give a short one-line reason for each scheduling decision
- Skip tasks marked BLOCKED entirely
- Do not schedule past 9:00 PM
- Max 6 tasks

Return ONLY a valid JSON array, no explanation, no markdown fences:
[
  {{
    "title": "exact task title",
    "project_name": "project name",
    "priority": "high|medium|low",
    "estimated_hours": 2,
    "start_time": "{_fmt_time(start_hour)}",
    "end_time": "{_fmt_time(start_hour + 2)}",
    "confidence": 92,
    "reason": "High priority, tackled while energy is still high"
  }}
]"""

    try:
        response = generate_text(prompt)
        cleaned = re.sub(r"```(?:json)?\s*", "", response).strip().rstrip("```").strip()
        arr_match = re.search(r'\[[\s\S]*\]', cleaned)
        if arr_match:
            scheduled = json.loads(arr_match.group())
        else:
            raise ValueError("No JSON array in response")
    except Exception:
        # Fallback: build schedule from current time
        scheduled = []
        h = start_hour
        for t in raw_tasks[:6]:
            if t.get("blocked_reason") or h >= 21:
                continue
            est = t.get("estimated_hours", 1)
            end_h = min(h + est, 21)
            scheduled.append({
                "title": t["title"],
                "project_name": t.get("project_name", ""),
                "priority": t.get("priority", "medium"),
                "estimated_hours": est,
                "start_time": _fmt_time(h),
                "end_time": _fmt_time(end_h),
                "confidence": 80 if t.get("priority") == "high" else 70,
                "reason": "Auto-scheduled by priority",
            })
            h += est + 0.25  # 15-min break

    result = {
        "date": today,
        "generated": True,
        "period": period,
        "current_time": time_str,
        "scheduled_tasks": scheduled,
        "total_tasks": len(raw_tasks),
        "generated_at": now_ist.isoformat(),
    }
    plans.replace_one({"date": today}, result, upsert=True)
    return result


# ── Productivity Analytics ─────────────────────────────────

@router.get("/analytics")
def get_analytics():
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=6)

    week_str = week_start.isoformat()

    # Fetch all activity once, filter in Python (avoids datetime-in-filter serialization issue)
    all_activity = list(activity_col.find({}, {"_id": 0}))

    def _ts(doc):
        ts = doc.get("timestamp", "")
        return ts.isoformat() if hasattr(ts, "isoformat") else str(ts)

    # Tasks completed per day (last 7 days)
    daily_completed = []
    for i in range(6, -1, -1):
        day_start = today_start - timedelta(days=i)
        day_end = day_start + timedelta(days=1)
        ds, de = day_start.isoformat(), day_end.isoformat()
        count = sum(
            1 for a in all_activity
            if a.get("action") == "completed" and ds <= _ts(a) < de
        )
        daily_completed.append({
            "date": day_start.strftime("%b %d"),
            "day": day_start.strftime("%a"),
            "count": count,
        })

    # Task distribution by priority
    priority_breakdown = []
    for priority in ["high", "medium", "low"]:
        count = tasks_col.count_documents({"priority": priority})
        priority_breakdown.append({"priority": priority, "count": count})

    # Total tasks by status
    all_tasks = list(tasks_col.find({}, {"_id": 0, "status": 1, "priority": 1, "project_name": 1, "estimated_hours": 1}))
    status_counts = {
        "pending":     len([t for t in all_tasks if t.get("status") == "pending"]),
        "in_progress": len([t for t in all_tasks if t.get("status") == "in_progress"]),
        "completed":   len([t for t in all_tasks if t.get("status") == "completed"]),
    }

    # Project velocity (tasks completed per project this week)
    projects = list(projects_col.find({"status": "active"}, {"_id": 0, "name": 1}))
    project_velocity = []
    for p in projects[:6]:
        proj_task_titles = {t["title"] for t in tasks_col.find({"project_name": p["name"]}, {"_id": 0, "title": 1})}
        completed = sum(
            1 for a in all_activity
            if a.get("action") == "completed"
            and a.get("task_title") in proj_task_titles
            and _ts(a) >= week_str
        )
        total = tasks_col.count_documents({"project_name": p["name"]})
        project_velocity.append({
            "name": p["name"][:20],
            "completed_this_week": completed,
            "total_tasks": total,
        })

    total_pending_hours = sum(
        t.get("estimated_hours", 0) for t in all_tasks
        if t.get("status") in ["pending", "in_progress"]
    )
    activity_this_week = sum(1 for a in all_activity if _ts(a) >= week_str)
    tasks_completed_this_week = sum(
        1 for a in all_activity if a.get("action") == "completed" and _ts(a) >= week_str
    )

    return {
        "daily_completed": daily_completed,
        "priority_breakdown": priority_breakdown,
        "status_counts": status_counts,
        "project_velocity": project_velocity,
        "total_pending_hours": total_pending_hours,
        "activity_this_week": activity_this_week,
        "tasks_completed_this_week": tasks_completed_this_week,
        "total_tasks": len(all_tasks),
    }

# ── Real Progress per Project ──────────────────────────────

@router.get("/projects/progress")
def get_project_progress():
    """Return completed / total task counts per project for real progress %."""
    projects = list(projects_col.find({"status": "active"}, {"_id": 0, "name": 1}))
    result = []
    for p in projects:
        name = p["name"]
        total     = tasks_col.count_documents({"project_name": name})
        completed = tasks_col.count_documents({"project_name": name, "status": "completed"})
        pct = round((completed / total * 100) if total > 0 else 0)
        result.append({"project_name": name, "total": total, "completed": completed, "progress": pct})
    return {"progress": result}


# ── Task Search ────────────────────────────────────────────

@router.get("/search")
def search_tasks(q: str = ""):
    """Full-text search over tasks and projects using regex (no Atlas text index required)."""
    if not q.strip():
        return {"tasks": [], "projects": []}
    pattern = {"$regex": q.strip(), "$options": "i"}
    tasks = list(tasks_col.find(
        {"$or": [{"title": pattern}, {"project_name": pattern}, {"tags": pattern}]},
        {"_id": 0}
    ).limit(20))
    projects = list(projects_col.find(
        {"$or": [{"name": pattern}, {"description": pattern}, {"client": pattern}]},
        {"_id": 0}
    ).limit(10))
    return {"tasks": tasks, "projects": projects}


# ── Daily Standup Generator ────────────────────────────────

@router.get("/standup")
def get_standup():
    """Generate a daily standup from yesterday's completions + today's pending tasks."""
    from agent import generate_text
    from datetime import timedelta

    now_ist = _ist_now()
    today_str     = now_ist.strftime("%Y-%m-%d")
    yesterday_str = (now_ist - timedelta(days=1)).strftime("%Y-%m-%d")

    # Activity from the last 24 hours
    all_activity = list(activity_col.find({"action": "completed"}, {"_id": 0}).sort("timestamp", -1).limit(50))
    yesterday_done = [
        a["task_title"] for a in all_activity
        if a.get("timestamp", "")[:10] in (today_str, yesterday_str)
    ]

    # Today's pending / in-progress tasks
    pending = list(tasks_col.find(
        {"status": {"$in": ["pending", "in_progress"]}}, {"_id": 0}
    ).sort("priority", -1).limit(10))

    # Blocked tasks
    blocked = list(tasks_col.find({"blocked_reason": {"$ne": None}}, {"_id": 0}))

    done_str    = "\n".join(f"- {t}" for t in yesterday_done) or "- Nothing logged yet"
    today_str_t = "\n".join(f"- {t['title']} ({t['project_name']}, {t['priority']} priority)" for t in pending) or "- Nothing pending"
    blocked_str = "\n".join(f"- {t['title']}: {t['blocked_reason']}" for t in blocked) or "- None"

    prompt = f"""Generate a concise daily standup update for a solo developer.
Today is {_ist_now().strftime('%A, %B %d %Y')}.

Yesterday completed:
{done_str}

Today's plan:
{today_str_t}

Blockers:
{blocked_str}

Format the standup exactly as:
**Yesterday:** [one sentence summary]
**Today:** [one sentence summary]
**Blockers:** [one sentence or "None"]

Keep it brief, professional, and ready to paste into Slack or email."""

    text = generate_text(prompt, temperature=0.3)
    return {"standup": text, "generated_at": _ist_now().isoformat()}


# ── Weekly AI Report ───────────────────────────────────────

_weekly_cache: dict = {}

@router.get("/weekly-report")
def get_weekly_report(force: bool = False):
    """Generate an AI weekly summary from the last 7 days of activity."""
    from agent import generate_text
    from datetime import timedelta

    now_ist   = _ist_now()
    week_key  = now_ist.strftime("%Y-W%W")
    cache_key = f"weekly_{week_key}"

    if not force and cache_key in _weekly_cache:
        return _weekly_cache[cache_key]

    seven_days_ago = (now_ist - timedelta(days=7)).strftime("%Y-%m-%d")

    all_activity = list(activity_col.find({"action": "completed"}, {"_id": 0}).sort("timestamp", -1).limit(100))
    week_done = [a for a in all_activity if a.get("timestamp", "")[:10] >= seven_days_ago]

    projects  = list(projects_col.find({"status": "active"}, {"_id": 0}))
    all_tasks = list(tasks_col.find({}, {"_id": 0, "status": 1, "priority": 1, "project_name": 1, "estimated_hours": 1}))

    completed_count = len(week_done)
    pending_count   = len([t for t in all_tasks if t.get("status") in ["pending", "in_progress"]])
    blocked_count   = tasks_col.count_documents({"blocked_reason": {"$ne": None}})
    high_prio_pending = len([t for t in all_tasks if t.get("status") in ["pending", "in_progress"] and t.get("priority") == "high"])

    done_lines = "\n".join(f"- {a['task_title']}" for a in week_done[:20]) or "- Nothing completed"

    prompt = f"""Write a professional weekly developer report for the week ending {now_ist.strftime('%B %d, %Y')}.

Completed this week ({completed_count} tasks):
{done_lines}

Current status:
- Active projects: {len(projects)}
- Pending/in-progress tasks: {pending_count}
- High priority pending: {high_prio_pending}
- Blocked tasks: {blocked_count}

Write a concise weekly report with these sections:
## Week of {now_ist.strftime('%B %d, %Y')}
**Summary:** [2-3 sentence overview of the week]
**Shipped:** [bullet list of key completions]
**In Progress:** [what's actively being worked on]
**Next Week:** [top 3 priorities based on pending tasks]
**Watch out:** [any blockers or risks]

Keep it professional but readable. This is for a solo developer managing multiple client projects."""

    text = generate_text(prompt, temperature=0.4)
    result = {
        "report": text,
        "stats": {
            "completed_this_week": completed_count,
            "pending": pending_count,
            "blocked": blocked_count,
            "active_projects": len(projects),
        },
        "generated_at": now_ist.isoformat(),
        "week": week_key,
    }
    _weekly_cache[cache_key] = result
    return result
