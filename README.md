# DevPulse — AI-Powered Developer Project Manager

> **Google Cloud x MongoDB Hackathon 2026**

DevPulse is a personal AI agent for solo developers managing multiple software projects. It connects your MongoDB Atlas data to Google's Gemini 2.5 Flash via the **MongoDB MCP Server**, enabling a conversational AI agent that can read your projects, create tasks, find blockers, and generate intelligent daily plans — all in real time.

---

## Demo

> _[Add your demo video link here]_

---

## Features

### AI Agent (Gemini 2.5 Flash)
- **Streaming chat** — real-time token-by-token responses via SSE
- **Tool use** — agent reads/writes MongoDB directly: get projects, create tasks, complete tasks, find blockers
- **MongoDB MCP Bridge** — agent connects to Atlas via `@mongodb-js/mongodb-mcp-server` (stdio MCP protocol)

### Dashboard
- **AI Daily Briefing** — time-aware (morning/afternoon/evening) summary of your workload, cached per period
- **Deadline Warnings** — projects within 7 days of deadline surface automatically
- **Daily Standup Generator** — one click generates a Slack-ready standup from yesterday's completions
- **Weekly AI Report** — full week summary: what shipped, in progress, next week's priorities
- **Today's AI Plan** — time-blocked schedule starting from current IST time

### Projects
- Real progress % calculated from completed vs total tasks per project
- Per-project health scores (0–100) based on tasks, deadline proximity, and blockers
- Priority badges, tech stack tags, days remaining

### Tasks
- Full CRUD — create, view, filter by status/priority, mark complete
- File attachments per task (uploaded and stored in MongoDB)
- Completion triggers activity log entries (used for standup/weekly report)

### Search
- Full-text search across tasks, projects, and tags (`Cmd+K` / `Ctrl+K`)
- "Ask AI about this" forwards search query directly to the agent

### Analytics
- Daily task completion chart (last 7 days)
- Priority breakdown, status distribution
- Project velocity, total pending hours

### Additional Pages
- **Planner** — calendar-style task planner
- **Clients** — group projects by client, AI-generate client status updates
- **Activity Log** — chronological log of all completed tasks
- **Time Allocation** — AI-generated deep/shallow/meeting work breakdown
- **Settings** — light/dark theme, token usage tracking

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  React Frontend                      │
│         (Vite + Tailwind CSS v4)                     │
│              localhost:5173                          │
└──────────────────────┬──────────────────────────────┘
                       │ REST + SSE
┌──────────────────────▼──────────────────────────────┐
│              FastAPI Backend (Python 3.12)           │
│                 localhost:8000                       │
│                                                     │
│  ┌────────────────┐    ┌──────────────────────────┐ │
│  │   agent.py     │    │   routes/projects.py     │ │
│  │                │    │                          │ │
│  │ chat_with_     │    │  /api/briefing           │ │
│  │ agent()        │    │  /api/plan/generate      │ │
│  │ (agentic loop) │    │  /api/standup            │ │
│  │                │    │  /api/weekly-report      │ │
│  │ generate_text()│    │  /api/search             │ │
│  │ (bare Gemini)  │    │  /api/projects/progress  │ │
│  └───────┬────────┘    └──────────────────────────┘ │
│          │                                           │
│  ┌───────▼────────────────────────────────────────┐ │
│  │           MCPCollection (db_mcp.py)            │ │
│  │   MCP bridge first → pymongo fallback          │ │
│  └───────┬──────────────────────┬─────────────────┘ │
└──────────┼──────────────────────┼───────────────────┘
           │ stdio MCP protocol   │ pymongo (fallback)
┌──────────▼──────────┐  ┌───────▼───────────────────┐
│  MongoDB MCP Server │  │     MongoDB Atlas          │
│  (Node.js process)  │  │  devpulse database         │
│  @mongodb-js/       │  │  Collections:              │
│  mongodb-mcp-server │  │  - projects                │
└─────────────────────┘  │  - tasks                   │
           │              │  - activity_log            │
           └──────────────│  - usage                   │
                          │  - files                   │
                          └───────────────────────────┘
```

### Key Design Decision — MongoDB MCP Bridge

The AI agent communicates with MongoDB via the official `@mongodb-js/mongodb-mcp-server` (stdio MCP protocol), not direct pymongo calls. This means:

1. `main.py` spawns the MCP server as a Node.js subprocess on startup
2. `mcp_bridge.py` speaks the MCP stdio protocol to the subprocess
3. `MCPCollection` in `db_mcp.py` wraps every collection — tries MCP first, falls back to pymongo if unavailable
4. The agent's tools (`get_projects`, `create_task`, etc.) route through `execute_tool()` which prefers MCP

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, Tailwind CSS v4 |
| Backend | FastAPI, Python 3.12, Uvicorn |
| Database | MongoDB Atlas (M0 free tier) |
| AI Model | Gemini 2.5 Flash (Google AI Studio) |
| MCP Server | `@mongodb-js/mongodb-mcp-server` |
| AI SDK | Google GenAI Python SDK (`google-genai`) |

---

## Getting Started

### Prerequisites

- Python 3.12+
- Node.js 18+
- MongoDB Atlas account (free M0 cluster works)
- Google AI Studio API key (free at [aistudio.google.com](https://aistudio.google.com))

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/devpulse.git
cd devpulse
```

### 2. Backend setup

```bash
cd backend
pip install -r requirements.txt
```

Create `backend/.env`:

```env
GEMINI_API_KEY=your_google_ai_studio_api_key

# Standard MongoDB Atlas URI
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/devpulse?retryWrites=true&w=majority

# Direct URI (explicit hostnames — fixes Node.js DNS SRV issues)
MONGODB_DIRECT_URI=mongodb://USERNAME:PASSWORD@shard-00-00.cluster.mongodb.net:27017,shard-00-01.cluster.mongodb.net:27017,shard-00-02.cluster.mongodb.net:27017/devpulse?tls=true&authSource=admin&tlsAllowInvalidCertificates=true&retryWrites=true&w=majority
```

> **MongoDB Atlas setup:** Create a free M0 cluster, add a database user, whitelist `0.0.0.0/0` in Network Access, and copy the connection string.

Start the backend:

```bash
uvicorn main:app --reload --port 8000
```

### 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

App is live at `http://localhost:5173`

### 4. Seed sample data (optional)

```bash
cd backend
python seed.py
```

---

## Project Structure

```
devpulse/
├── backend/
│   ├── main.py              # FastAPI app, MCP bridge lifecycle
│   ├── agent.py             # Gemini agent — chat_with_agent() + generate_text()
│   ├── mcp_bridge.py        # MCP stdio protocol client
│   ├── db_mcp.py            # MCPCollection wrapper (MCP → pymongo fallback)
│   ├── database.py          # MongoDB Atlas connection (pymongo)
│   ├── routes/
│   │   ├── projects.py      # All REST endpoints (projects, tasks, AI features)
│   │   └── chat.py          # SSE streaming chat endpoint
│   └── .env                 # Environment variables (not committed)
│
└── frontend/
    └── src/
        ├── App.jsx
        └── components/
            ├── Dashboard.jsx        # Main dashboard
            ├── AgentChat.jsx        # Streaming AI chat
            ├── ProjectsPage.jsx     # Projects with real progress %
            ├── TasksPage.jsx        # Tasks with file uploads
            ├── AnalyticsPage.jsx    # Charts and metrics
            ├── SearchModal.jsx      # Cmd+K search
            └── ...
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | API health + MCP bridge status |
| GET | `/api/projects` | All active projects |
| GET | `/api/projects/progress` | Real progress % per project |
| GET | `/api/projects/health-scores` | AI health score per project |
| GET | `/api/tasks` | All pending/in-progress tasks |
| POST | `/api/tasks/complete` | Mark task complete + log activity |
| GET | `/api/briefing` | AI daily briefing (IST time-aware) |
| GET | `/api/plan/today` | Fetch today's AI plan |
| POST | `/api/plan/generate` | Generate new AI time-blocked plan |
| GET | `/api/standup` | Generate daily standup text |
| GET | `/api/weekly-report` | Generate weekly AI report |
| GET | `/api/search?q=` | Full-text search tasks + projects |
| GET | `/api/warnings` | Deadline warning alerts |
| GET | `/api/analytics` | Analytics data (charts, stats) |
| POST | `/api/chat/stream` | SSE streaming agent chat |

---

## How the AI Agent Works

The agent uses two distinct Gemini call modes:

**`chat_with_agent()`** — Full agentic loop for interactive chat
- Has a DevPulse system prompt
- Bound to 8 tools that read/write MongoDB via the MCP bridge
- Iterates up to 5 rounds until no more tool calls are needed
- Streams tokens back to the frontend via SSE

**`generate_text()`** — Bare Gemini call for content generation
- No system prompt, no tools
- Used for briefing, standup, weekly report, and plan generation
- Avoids the agent persona interfering with pure generation tasks

### Agent Tools

| Tool | Description |
|---|---|
| `get_projects` | Fetch all active projects |
| `get_tasks` | Fetch pending/in-progress tasks |
| `get_blocked_tasks` | Fetch tasks with a blocked reason |
| `get_recent_activity` | Last 10 activity log entries |
| `get_project_details` | Full details for a specific project |
| `create_task` | Create a single task in MongoDB |
| `create_multiple_tasks` | Bulk create tasks |
| `complete_task` | Mark task done + write to activity log |

---

## Time Zone

All time-aware features (briefing, plan generation, standup) use IST (UTC+5:30).

---

## License

MIT
