import asyncio
import json
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from agent import chat_with_agent
from database import tasks_col as _py_tasks, activity_col as _py_activity
from db_mcp import MCPCollection
tasks_col    = MCPCollection("tasks",        _py_tasks)
activity_col = MCPCollection("activity_log", _py_activity)
from datetime import datetime

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    history: list = []

class LogRequest(BaseModel):
    task_title: str
    note: str
    action: str = "completed"

@router.post("/chat")
def chat(req: ChatRequest):
    response = chat_with_agent(req.message, req.history)
    return {"response": response}

@router.post("/chat/stream")
async def chat_stream(req: ChatRequest):
    """Stream the agent response word-by-word using SSE."""

    async def generate():
        try:
            # Run the agentic loop in a thread pool (it's synchronous + does MongoDB + Gemini calls)
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None, chat_with_agent, req.message, req.history
            )

            # Stream word by word for live token effect
            words = response.split(" ")
            for i, word in enumerate(words):
                token = word + (" " if i < len(words) - 1 else "")
                yield f"data: {json.dumps({'token': token})}\n\n"
                await asyncio.sleep(0.025)  # ~40 words/sec

            yield "data: [DONE]\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )

@router.post("/log")
def log_activity(req: LogRequest):
    activity_col.insert_one({
        "action": req.action,
        "task_title": req.task_title,
        "note": req.note,
        "timestamp": datetime.utcnow()
    })

    if req.action == "completed":
        tasks_col.update_one(
            {"title": req.task_title},
            {"$set": {
                "status": "completed",
                "completed_at": datetime.utcnow()
            }}
        )

    return {"status": "logged successfully"}
