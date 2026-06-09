"""
MCP-backed MongoDB collection wrapper
─────────────────────────────────────
Routes all CRUD through MongoDB MCP bridge (Node.js, works on Windows).
Falls back to pymongo if MCP is unavailable.

Usage:
    from db_mcp import MCPCollection
    import database as _db

    projects_col = MCPCollection("projects", _db.projects_col)
    tasks_col    = MCPCollection("tasks",    _db.tasks_col)
"""

from __future__ import annotations
from typing import Any, Dict, List, Optional
import logging

logger = logging.getLogger(__name__)


# ── Minimal cursor so .sort().limit() chains still work ──────────────────────

class _Cursor:
    def __init__(self, docs: list):
        self._docs = list(docs)

    def sort(self, key, direction=1):
        reverse = direction < 0
        try:
            def _key(x):
                v = x.get(key)
                if v is None:
                    return ("", 0)
                if isinstance(v, (int, float)):
                    return (0, v)
                return (1, str(v))
            self._docs.sort(key=_key, reverse=reverse)
        except Exception:
            pass
        return self

    def limit(self, n: int):
        if n > 0:
            self._docs = self._docs[:n]
        return self

    def __iter__(self):
        return iter(self._docs)

    def __len__(self):
        return len(self._docs)


# ── Collection wrapper ────────────────────────────────────────────────────────

class MCPCollection:
    """
    Subset of pymongo Collection API backed by MongoDB MCP bridge.
    Any method not implemented here falls through to the pymongo collection.
    """

    def __init__(self, name: str, pymongo_col=None):
        self._name = name
        self._col  = pymongo_col  # pymongo fallback

    # ── internal helpers ──────────────────────────────────────────────────────

    def _bridge(self):
        try:
            from mcp_bridge import mcp_bridge
            return mcp_bridge if mcp_bridge.available else None
        except ImportError:
            return None

    @staticmethod
    def _project(docs: list, projection: Optional[dict]) -> list:
        if not projection:
            return docs
        exclude = {k for k, v in projection.items() if v == 0}
        include = {k for k, v in projection.items() if v != 0} - {"_id"}
        result = []
        for doc in docs:
            d = dict(doc)
            if exclude:
                for k in exclude:
                    d.pop(k, None)
            elif include:
                d = {k: d[k] for k in include if k in d}
            result.append(d)
        return result

    # ── public API ────────────────────────────────────────────────────────────

    def find(self, filter=None, projection=None) -> _Cursor:
        # Try MCP bridge first (Node.js OpenSSL avoids Python SSL issues)
        bridge = self._bridge()
        if bridge:
            try:
                docs = bridge.find(self._name, filter=filter or {}, limit=200)
                if docs is not None:
                    docs = self._project(docs, projection)
                    logger.info(f"MCPCollection.find({self._name}): MCP returned {len(docs)} docs")
                    return _Cursor(docs)
            except Exception as e:
                logger.warning(f"MCPCollection.find({self._name}): MCP failed ({e}), trying pymongo")
        # Fallback: pymongo — eagerly evaluate cursor so SSL errors are caught here
        if self._col is not None:
            try:
                docs = list(self._col.find(filter or {}, projection or {}))
                logger.info(f"MCPCollection.find({self._name}): pymongo returned {len(docs)} docs")
                return _Cursor(docs)
            except Exception as e:
                logger.warning(f"MCPCollection.find({self._name}): pymongo failed ({e})")
        return _Cursor([])

    def find_one(self, filter=None, projection=None):
        # Try MCP bridge first
        bridge = self._bridge()
        if bridge:
            try:
                docs = bridge.find(self._name, filter=filter or {}, limit=1)
                if docs:
                    return self._project(docs, projection)[0]
            except Exception:
                pass
        # Fallback: pymongo
        if self._col is not None:
            try:
                return self._col.find_one(filter or {}, projection or {})
            except Exception:
                pass
        return None

    def insert_one(self, document):
        bridge = self._bridge()
        if bridge:
            try:
                result = bridge.insert_one(self._name, document)

                class _R:
                    inserted_id = result.get("insertedId", "")
                return _R()
            except Exception:
                pass
        if self._col is not None:
            return self._col.insert_one(document)
        raise RuntimeError("No database connection available")

    def update_one(self, filter, update, upsert=False):
        bridge = self._bridge()
        if bridge:
            try:
                return bridge.update_one(
                    self._name, filter, update, upsert=upsert
                )
            except Exception:
                pass
        if self._col is not None:
            return self._col.update_one(filter, update, upsert=upsert)
        raise RuntimeError("No database connection available")

    def replace_one(self, filter, replacement, upsert=False):
        # MCP has no replaceOne; emulate with updateOne $set
        bridge = self._bridge()
        if bridge:
            try:
                return bridge.update_one(
                    self._name, filter, {"$set": replacement}, upsert=upsert
                )
            except Exception:
                pass
        if self._col is not None:
            return self._col.replace_one(filter, replacement, upsert=upsert)
        raise RuntimeError("No database connection available")

    def delete_one(self, filter):
        bridge = self._bridge()
        if bridge:
            try:
                raw = bridge.call_tool("deleteOne", {
                    "collection": self._name,
                    "database": "devpulse",
                    "filter": filter,
                })

                class _R:
                    deleted_count = 1
                return _R()
            except Exception:
                pass
        if self._col is not None:
            return self._col.delete_one(filter)
        raise RuntimeError("No database connection available")

    def count_documents(self, filter=None):
        # Use find() which already handles MCP-first + eager pymongo fallback
        docs = self.find(filter or {})
        return len(docs) if isinstance(docs, _Cursor) else sum(1 for _ in docs)

    # ── passthrough for anything not implemented ───────────────────────────────

    def __getattr__(self, name):
        if self._col is not None:
            return getattr(self._col, name)
        raise AttributeError(f"MCPCollection has no attribute '{name}'")
