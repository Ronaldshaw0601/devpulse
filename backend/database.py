from pymongo import MongoClient
from dotenv import load_dotenv
import os
import ssl
import logging

load_dotenv()
logger = logging.getLogger(__name__)

# Build an SSL context that disables all verification and session tickets
# (session tickets can cause TLSV1_ALERT_INTERNAL_ERROR with some proxies)
_ssl_ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
_ssl_ctx.check_hostname = False
_ssl_ctx.verify_mode = ssl.CERT_NONE
_ssl_ctx.options |= ssl.OP_NO_TICKET          # disable TLS session tickets
_ssl_ctx.options |= ssl.OP_NO_SSLv2
_ssl_ctx.options |= ssl.OP_NO_SSLv3

# Prefer direct URI (no DNS SRV lookup, avoids Node.js querySrv ECONNREFUSED)
# and avoids Python ssl's potential SRV TLS issues
_uri = os.getenv("MONGODB_DIRECT_URI") or os.getenv("MONGODB_URI", "")

_mongo_kwargs = {
    "serverSelectionTimeoutMS": 10000,
    "connectTimeoutMS": 10000,
    "socketTimeoutMS": 10000,
    "tls": True,
    "tlsAllowInvalidCertificates": True,
    "tlsAllowInvalidHostnames": True,
}

try:
    client = MongoClient(_uri, **_mongo_kwargs)
    logger.info("MongoDB client created (lazy connection — will verify on first use).")
except Exception as e:
    logger.error(f"MongoClient creation failed: {e}")
    client = None

db = client["devpulse"] if client else None

# Collections
projects_col = db["projects"] if db is not None else None
tasks_col = db["tasks"] if db is not None else None
activity_col = db["activity_log"] if db is not None else None
plans_col = db["daily_plans"] if db is not None else None
usage_col = db["usage"] if db is not None else None
time_allocation_col = db["time_allocation"] if db is not None else None
files_col = db["files"] if db is not None else None

def get_db():
    return db
