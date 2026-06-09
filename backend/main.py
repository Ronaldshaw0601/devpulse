import os
import logging
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.chat import router as chat_router
from routes.projects import router as projects_router

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start the MongoDB MCP server bridge in the background on app startup."""
    import threading

    def _start_mcp():
        try:
            from mcp_bridge import mcp_bridge
            # Prefer direct URI (no DNS SRV lookup) to fix Node.js querySrv ECONNREFUSED
            uri = os.getenv("MONGODB_DIRECT_URI") or os.getenv("MONGODB_URI", "")
            if uri:
                logger.info(f"Starting MongoDB MCP server bridge (uri type: {'direct' if 'DIRECT' in uri or 'DIRECT' in os.getenv('MONGODB_DIRECT_URI','') else 'srv'})…")
                ok = mcp_bridge.start(uri, db_name="devpulse")
                if ok:
                    logger.info("✅ MongoDB MCP server is connected.")
                else:
                    logger.warning("⚠️  MongoDB MCP bridge unavailable — agent falls back to pymongo.")
            else:
                logger.warning("MONGODB_URI not set — skipping MCP bridge startup.")
        except Exception as e:
            logger.error(f"MCP bridge startup error: {e} — continuing without MCP.")

    t = threading.Thread(target=_start_mcp, daemon=True, name="mcp-startup")
    t.start()

    yield  # App runs here (MCP bridge connects in background)

    # Shutdown — the MCP server subprocess is a daemon thread and exits automatically


app = FastAPI(title="DevPulse Agent API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router, prefix="/api")
app.include_router(projects_router, prefix="/api")



@app.get("/health")
def health():
    try:
        from mcp_bridge import mcp_bridge
        mcp_status = "connected" if mcp_bridge.available else "fallback (pymongo)"
    except Exception:
        mcp_status = "unavailable"

    return {
        "status": "ok",
        "message": "DevPulse API is running",
        "mongodb_mcp": mcp_status,
    }
