from google import genai
from google.genai import types
from database import projects_col, tasks_col, activity_col, usage_col
from dotenv import load_dotenv
from datetime import date, datetime
import os
import json

load_dotenv()

# MongoDB MCP Bridge — agent uses this when available, falls back to pymongo
try:
    from mcp_bridge import mcp_bridge
    _MCP_READY = True
except ImportError:
    mcp_bridge = None
    _MCP_READY = False

# Use Google AI Studio key if available (higher free-tier quota),
# otherwise fall back to Vertex AI
_gemini_api_key = os.getenv("GEMINI_API_KEY")
if _gemini_api_key:
    client = genai.Client(api_key=_gemini_api_key)
else:
    client = genai.Client(
        vertexai=True,
        project=os.getenv("GCP_PROJECT_ID", "devpulse-agent-2026"),
        location=os.getenv("GCP_LOCATION", "us-central1"),
    )

SYSTEM_PROMPT = """
You are DevPulse, a personal AI agent for a solo developer
managing multiple software projects simultaneously.

You have access to these tools:
- get_projects: Get all active projects
- get_tasks: Get all pending/in-progress tasks
- get_blocked_tasks: Get all blocked tasks
- get_recent_activity: Get recent activity log
- create_task: Create a single task in MongoDB
- create_multiple_tasks: Create multiple tasks at once
- complete_task: Mark a task as completed
- get_project_details: Get details of a specific project

IMPORTANT RULES:
- When asked to create tasks, ALWAYS use create_task or create_multiple_tasks tool
- When asked to plan the day, use get_tasks and get_projects first
- When asked about blockers, use get_blocked_tasks
- Always confirm what actions you took
- Be concise and actionable
- You are talking to Raj Ronald Shaw — a solo developer in Chennai
"""

# ── Tool Definitions ────────────────────────────────────
tools = types.Tool(function_declarations=[
    types.FunctionDeclaration(
        name="get_projects",
        description="Get all active projects from MongoDB",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={}
        )
    ),
    types.FunctionDeclaration(
        name="get_tasks",
        description="Get all pending and in-progress tasks",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={}
        )
    ),
    types.FunctionDeclaration(
        name="get_blocked_tasks",
        description="Get all blocked tasks",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={}
        )
    ),
    types.FunctionDeclaration(
        name="get_recent_activity",
        description="Get recent activity log",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={}
        )
    ),
    types.FunctionDeclaration(
        name="get_project_details",
        description="Get details of a specific project by name",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "project_name": types.Schema(
                    type=types.Type.STRING,
                    description="Name of the project"
                )
            },
            required=["project_name"]
        )
    ),
    types.FunctionDeclaration(
        name="create_task",
        description="Create a single task in MongoDB for a project",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "project_name": types.Schema(
                    type=types.Type.STRING,
                    description="Name of the project"
                ),
                "title": types.Schema(
                    type=types.Type.STRING,
                    description="Task title"
                ),
                "priority": types.Schema(
                    type=types.Type.STRING,
                    description="Priority: high, medium, or low"
                ),
                "estimated_hours": types.Schema(
                    type=types.Type.NUMBER,
                    description="Estimated hours to complete"
                ),
                "tags": types.Schema(
                    type=types.Type.STRING,
                    description="Comma separated tags e.g. backend,api"
                )
            },
            required=["project_name", "title", "priority", "estimated_hours"]
        )
    ),
    types.FunctionDeclaration(
        name="create_multiple_tasks",
        description="Create multiple tasks at once for a project",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "project_name": types.Schema(
                    type=types.Type.STRING,
                    description="Name of the project"
                ),
                "tasks": types.Schema(
                    type=types.Type.STRING,
                    description="""JSON string of tasks array. Example:
                    [{"title":"Task 1","priority":"high","estimated_hours":2,"tags":"backend"},
                    {"title":"Task 2","priority":"medium","estimated_hours":3,"tags":"frontend"}]"""
                )
            },
            required=["project_name", "tasks"]
        )
    ),
    types.FunctionDeclaration(
        name="complete_task",
        description="Mark a task as completed and log the activity",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "task_title": types.Schema(
                    type=types.Type.STRING,
                    description="Title of the task to complete"
                ),
                "note": types.Schema(
                    type=types.Type.STRING,
                    description="Completion note or summary"
                )
            },
            required=["task_title", "note"]
        )
    )
])

# ── Tool Execution ───────────────────────────────────────
# Routes through MongoDB MCP server when available; falls back to pymongo.

def _use_mcp() -> bool:
    """True when the MCP bridge is connected and ready."""
    return _MCP_READY and mcp_bridge is not None and mcp_bridge.available


def execute_tool(tool_name: str, tool_args: dict) -> str:
    try:
        # ── READ tools — prefer MCP ──────────────────────
        if tool_name == "get_projects":
            if _use_mcp():
                docs = mcp_bridge.find("projects", filter={"status": "active"})
                # strip _id for clean output
                for d in docs:
                    d.pop("_id", None)
                return json.dumps(docs, default=str)
            # pymongo fallback
            projects = list(projects_col.find({"status": "active"}, {"_id": 0}))
            return json.dumps(projects, default=str)

        elif tool_name == "get_tasks":
            if _use_mcp():
                docs = mcp_bridge.find(
                    "tasks",
                    filter={"status": {"$in": ["pending", "in_progress"]}},
                    sort={"priority": -1},
                    limit=20,
                )
                for d in docs:
                    d.pop("_id", None)
                return json.dumps(docs, default=str)
            tasks = list(tasks_col.find(
                {"status": {"$in": ["pending", "in_progress"]}}, {"_id": 0}
            ).sort("priority", -1).limit(20))
            return json.dumps(tasks, default=str)

        elif tool_name == "get_blocked_tasks":
            if _use_mcp():
                docs = mcp_bridge.find(
                    "tasks",
                    filter={"blocked_reason": {"$ne": None}},
                )
                for d in docs:
                    d.pop("_id", None)
                return json.dumps(docs, default=str)
            blocked = list(tasks_col.find(
                {"blocked_reason": {"$ne": None}}, {"_id": 0}
            ))
            return json.dumps(blocked, default=str)

        elif tool_name == "get_recent_activity":
            if _use_mcp():
                docs = mcp_bridge.find(
                    "activity_log",
                    sort={"timestamp": -1},
                    limit=10,
                )
                for d in docs:
                    d.pop("_id", None)
                return json.dumps(docs, default=str)
            activity = list(activity_col.find(
                {}, {"_id": 0}
            ).sort("timestamp", -1).limit(10))
            return json.dumps(activity, default=str)

        elif tool_name == "get_project_details":
            pname = tool_args["project_name"]
            if _use_mcp():
                projects = mcp_bridge.find(
                    "projects",
                    filter={"name": {"$regex": pname, "$options": "i"}},
                    limit=1,
                )
                if not projects:
                    return json.dumps({"error": "Project not found"})
                project = projects[0]
                project.pop("_id", None)
                tasks = mcp_bridge.find(
                    "tasks",
                    filter={"project_name": project["name"]},
                )
                for t in tasks:
                    t.pop("_id", None)
                return json.dumps({"project": project, "tasks": tasks}, default=str)
            # pymongo fallback
            project = projects_col.find_one(
                {"name": {"$regex": pname, "$options": "i"}}, {"_id": 0}
            )
            if not project:
                return json.dumps({"error": "Project not found"})
            tasks = list(tasks_col.find({"project_name": project["name"]}, {"_id": 0}))
            return json.dumps({"project": project, "tasks": tasks}, default=str)

        # ── WRITE tools — prefer MCP ─────────────────────
        elif tool_name == "create_task":
            tags = [t.strip() for t in
                    tool_args.get("tags", "").split(",") if t.strip()]
            now_str = datetime.utcnow().isoformat()
            new_task = {
                "project_name": tool_args["project_name"],
                "title": tool_args["title"],
                "priority": tool_args.get("priority", "medium"),
                "status": "pending",
                "estimated_hours": tool_args.get("estimated_hours", 2),
                "blocked_reason": None,
                "created_at": now_str,
                "completed_at": None,
                "tags": tags,
            }
            if _use_mcp():
                mcp_bridge.insert_one("tasks", new_task)
            else:
                new_task["created_at"] = datetime.utcnow()
                tasks_col.insert_one(new_task)
            return json.dumps({
                "success": True,
                "message": f"Task '{tool_args['title']}' created in {tool_args['project_name']}",
                "via": "mongodb-mcp-server" if _use_mcp() else "pymongo",
            })

        elif tool_name == "create_multiple_tasks":
            tasks_data = json.loads(tool_args["tasks"])
            created = []
            now_str = datetime.utcnow().isoformat()
            for t in tasks_data:
                tags = [x.strip() for x in
                        t.get("tags", "").split(",") if x.strip()]
                new_task = {
                    "project_name": tool_args["project_name"],
                    "title": t["title"],
                    "priority": t.get("priority", "medium"),
                    "status": "pending",
                    "estimated_hours": t.get("estimated_hours", 2),
                    "blocked_reason": None,
                    "created_at": now_str,
                    "completed_at": None,
                    "tags": tags,
                }
                if _use_mcp():
                    mcp_bridge.insert_one("tasks", new_task)
                else:
                    new_task["created_at"] = datetime.utcnow()
                    tasks_col.insert_one(new_task)
                created.append(t["title"])
            return json.dumps({
                "success": True,
                "created_count": len(created),
                "tasks_created": created,
                "via": "mongodb-mcp-server" if _use_mcp() else "pymongo",
            })

        elif tool_name == "complete_task":
            task_title = tool_args["task_title"]
            note = tool_args.get("note", "Task completed")
            now_str = datetime.utcnow().isoformat()
            if _use_mcp():
                mcp_bridge.update_one(
                    "tasks",
                    filter={"title": {"$regex": task_title, "$options": "i"}},
                    update={"$set": {"status": "completed", "completed_at": now_str}},
                )
                mcp_bridge.insert_one("activity_log", {
                    "task_title": task_title,
                    "action": "completed",
                    "note": note,
                    "timestamp": now_str,
                })
            else:
                tasks_col.update_one(
                    {"title": {"$regex": task_title, "$options": "i"}},
                    {"$set": {"status": "completed", "completed_at": datetime.utcnow()}},
                )
                activity_col.insert_one({
                    "task_title": task_title,
                    "action": "completed",
                    "note": note,
                    "timestamp": datetime.utcnow(),
                })
            return json.dumps({
                "success": True,
                "message": f"Task '{task_title}' marked complete",
                "via": "mongodb-mcp-server" if _use_mcp() else "pymongo",
            })

        else:
            return json.dumps({"error": f"Unknown tool: {tool_name}"})

    except Exception as e:
        return json.dumps({"error": str(e)})


# ── Simple generation (no system prompt, no tools) ───────
def generate_text(prompt: str, temperature: float = 0.4) -> str:
    """
    Direct Gemini call with no system prompt and no tool bindings.
    Use for diagram/code generation where the agent persona gets in the way.
    """
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[types.Content(role="user", parts=[types.Part(text=prompt)])],
            config=types.GenerateContentConfig(temperature=temperature),
        )
        return response.candidates[0].content.parts[0].text
    except Exception as e:
        return f"Error: {e}"


# ── Main Chat Function ───────────────────────────────────
def chat_with_agent(message: str, history: list) -> str:
    try:
        # Build conversation history
        gemini_history = []
        for h in history[-10:]:  # Last 10 messages only
            role = "model" if h["role"] == "assistant" else "user"
            gemini_history.append(
                types.Content(
                    role=role,
                    parts=[types.Part(text=h["content"])]
                )
            )

        # Add current message
        gemini_history.append(
            types.Content(
                role="user",
                parts=[types.Part(text=f"Today is {date.today().isoformat()}. {message}")]
            )
        )

        # Agentic loop — keep going until no more tool calls
        max_iterations = 5
        iteration = 0

        while iteration < max_iterations:
            iteration += 1

            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=gemini_history,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    tools=[tools],
                    temperature=0.7,
                )
            )

            candidate = response.candidates[0]
            tool_calls = []
            text_parts = []

            for part in candidate.content.parts:
                if hasattr(part, "function_call") and part.function_call:
                    tool_calls.append(part.function_call)
                elif hasattr(part, "text") and part.text:
                    text_parts.append(part.text)

            # Track token usage
            try:
                usage = response.usage_metadata
                if usage:
                    usage_col.insert_one({
                        "timestamp": datetime.utcnow().isoformat(),
                        "prompt_tokens": getattr(usage, "prompt_token_count", 0) or 0,
                        "output_tokens": getattr(usage, "candidates_token_count", 0) or 0,
                        "total_tokens": getattr(usage, "total_token_count", 0) or 0,
                        "model": "gemini-2.5-flash",
                        "iteration": iteration,
                    })
            except Exception:
                pass

            # No tool calls — return final text response
            if not tool_calls:
                return "".join(text_parts) if text_parts else "Done!"

            # Execute all tool calls
            tool_results = []
            for tool_call in tool_calls:
                result = execute_tool(
                    tool_call.name,
                    dict(tool_call.args)
                )
                tool_results.append(
                    types.Part(
                        function_response=types.FunctionResponse(
                            name=tool_call.name,
                            response={"result": result}
                        )
                    )
                )

            # Add model response + tool results to history
            gemini_history.append(candidate.content)
            gemini_history.append(
                types.Content(
                    role="user",
                    parts=tool_results
                )
            )

        return "Completed the requested actions."

    except Exception as e:
        return f"Agent error: {str(e)}"