"""
MongoDB MCP Bridge
──────────────────
Maintains a persistent connection to the official MongoDB MCP server
(github.com/mongodb-js/mongodb-mcp-server) in a background async thread.

The agent calls call_tool() synchronously; this bridge handles all the
async MCP protocol communication behind the scenes.

Architecture:
  Agent (sync) ──► mcp_bridge.call_tool() ──► MongoDB MCP Server (Node.js)
                                                        │
                                                   MongoDB Atlas
"""

import asyncio
import json
import os
import threading
import logging
from typing import Optional

logger = logging.getLogger(__name__)

try:
    from mcp import ClientSession, StdioServerParameters
    from mcp.client.stdio import stdio_client
    MCP_AVAILABLE = True
except ImportError:
    MCP_AVAILABLE = False
    logger.warning("mcp package not installed — run: pip install mcp")


class MongoDBMCPBridge:
    """
    Persistent async connection to the MongoDB MCP server.
    Runs the MCP session in a dedicated background thread / event loop
    so synchronous code (FastAPI routes, agent.py) can call it safely.
    """

    def __init__(self):
        self._loop: Optional[asyncio.AbstractEventLoop] = None
        self._session = None  # ClientSession when connected
        self._thread: Optional[threading.Thread] = None
        self._started = threading.Event()
        self._error: Optional[Exception] = None
        self.available = False
        self._uri = ""
        self._db_name = "devpulse"

    # ── Public API ─────────────────────────────────────────

    def start(self, uri: str, db_name: str = "devpulse") -> bool:
        """
        Launch the MongoDB MCP server subprocess and connect to it.
        Returns True if successful, False if MCP is unavailable.
        Call once at app startup.
        """
        if not MCP_AVAILABLE:
            logger.warning("Skipping MCP bridge — mcp package missing.")
            return False

        self._uri = uri
        self._db_name = db_name
        self._thread = threading.Thread(target=self._run_loop, daemon=True, name="mcp-bridge")
        self._thread.start()

        # Wait up to 45 seconds for npx to download & start the server
        if not self._started.wait(timeout=45):
            logger.error("MongoDB MCP server timed out during startup.")
            return False

        if self._error:
            logger.error(f"MongoDB MCP server error: {self._error}")
            return False

        self.available = True
        logger.info("✅ MongoDB MCP server connected successfully.")
        return True

    def call_tool(self, tool_name: str, arguments: dict) -> str:
        """
        Synchronously call a MongoDB MCP tool and return the result as a string.
        Raises RuntimeError if the bridge is not running.
        """
        if not self.available or not self._session or not self._loop:
            raise RuntimeError("MongoDB MCP bridge is not running")

        future = asyncio.run_coroutine_threadsafe(
            self._call_tool_async(tool_name, arguments),
            self._loop,
        )
        return future.result(timeout=30)

    def list_tools(self) -> list:
        """Return the list of tools exposed by the MongoDB MCP server."""
        if not self.available or not self._session or not self._loop:
            return []
        future = asyncio.run_coroutine_threadsafe(
            self._list_tools_async(),
            self._loop,
        )
        return future.result(timeout=10)

    # ── Convenience helpers (map our domain ops → MCP calls) ──

    def find(self, collection: str, filter: dict = None, projection: dict = None,
             sort: dict = None, limit: int = 50) -> list:
        args = {
            "collection": collection,
            "database": self._db_name,
        }
        if filter:   args["filter"] = filter
        if projection: args["projection"] = projection
        if sort:     args["sort"] = sort
        if limit:    args["limit"] = limit
        raw = self.call_tool("find", args)
        # If response looks like a connection error (not JSON data), raise so caller falls back
        _err_keywords = ("ECONNREFUSED", "ENOTFOUND", "querySrv", "connect ETIMEDOUT",
                         "Authentication failed", "MongoServerError", "SSL", "TLS", "handshake")
        if any(k in raw for k in _err_keywords):
            raise RuntimeError(f"MCP find connection error: {raw[:200]}")
        return self._parse_list(raw)

    def insert_one(self, collection: str, document: dict) -> dict:
        raw = self.call_tool("insertOne", {
            "collection": collection,
            "database": self._db_name,
            "document": document,
        })
        return self._parse_one(raw)

    def update_one(self, collection: str, filter: dict, update: dict, upsert: bool = False) -> dict:
        raw = self.call_tool("updateOne", {
            "collection": collection,
            "database": self._db_name,
            "filter": filter,
            "update": update,
            "upsert": upsert,
        })
        return self._parse_one(raw)

    def aggregate(self, collection: str, pipeline: list) -> list:
        raw = self.call_tool("aggregate", {
            "collection": collection,
            "database": self._db_name,
            "pipeline": pipeline,
        })
        return self._parse_list(raw)

    # ── Internal ───────────────────────────────────────────

    def _run_loop(self):
        self._loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self._loop)
        try:
            self._loop.run_until_complete(self._connect_and_serve())
        except Exception as e:
            self._error = e
            self._started.set()

    async def _connect_and_serve(self):
        server_params = StdioServerParameters(
            command="npx",
            args=["-y", "@mongodb-js/mongodb-mcp-server"],
            env={
                **os.environ,
                "MDB_MCP_CONNECTION_STRING": self._uri,
            },
        )
        async with stdio_client(server_params) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()
                self._session = session
                self._started.set()
                logger.info("MongoDB MCP server session initialised.")
                # Keep the session alive until the process ends
                await asyncio.Future()

    async def _call_tool_async(self, tool_name: str, arguments: dict) -> str:
        result = await self._session.call_tool(tool_name, arguments)
        parts = []
        for content in result.content:
            if hasattr(content, "text"):
                parts.append(content.text)
            else:
                parts.append(str(content))
        raw = "\n".join(parts)
        # Log every tool call so we can diagnose failures
        if getattr(result, "isError", False):
            logger.error(f"MCP tool '{tool_name}' returned error: {raw}")
            raise RuntimeError(f"MCP tool error ({tool_name}): {raw}")
        logger.info(f"MCP tool '{tool_name}' raw response: {raw[:400]}")
        return raw

    async def _list_tools_async(self) -> list:
        result = await self._session.list_tools()
        return result.tools

    @staticmethod
    def _parse_list(raw: str) -> list:
        if not raw or not raw.strip():
            return []
        # Try direct parse first
        try:
            data = json.loads(raw)
            if isinstance(data, list):
                return data
            if isinstance(data, dict) and "documents" in data:
                return data["documents"]
            if isinstance(data, dict):
                return [data]
        except Exception:
            pass

        # MCP server may return "Found N documents:\n[...]" — extract JSON array/object
        import re
        # Try to find a JSON array [...] anywhere in the text
        arr_match = re.search(r'\[[\s\S]*\]', raw)
        if arr_match:
            try:
                data = json.loads(arr_match.group())
                if isinstance(data, list):
                    return data
            except Exception:
                pass

        # Try to find a JSON object {...}
        obj_match = re.search(r'\{[\s\S]*\}', raw)
        if obj_match:
            try:
                data = json.loads(obj_match.group())
                if isinstance(data, dict) and "documents" in data:
                    return data["documents"]
                if isinstance(data, list):
                    return data
            except Exception:
                pass

        # Last resort: try parsing each line as a separate JSON document
        docs = []
        for line in raw.splitlines():
            line = line.strip()
            if line.startswith('{'):
                try:
                    docs.append(json.loads(line))
                except Exception:
                    pass
        return docs

    @staticmethod
    def _parse_one(raw: str) -> dict:
        try:
            return json.loads(raw)
        except Exception:
            pass
        import re
        # Extract first JSON object from response text
        obj_match = re.search(r'\{[\s\S]*\}', raw)
        if obj_match:
            try:
                return json.loads(obj_match.group())
            except Exception:
                pass
        return {"raw": raw}


# ── Singleton ──────────────────────────────────────────────
mcp_bridge = MongoDBMCPBridge()
