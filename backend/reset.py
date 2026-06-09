"""
DevPulse — Reset Script
Clears all MongoDB collections. Run with: python reset.py
Add --seed flag to also reseed with fresh sample data: python reset.py --seed
"""
import sys
from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

client = MongoClient(os.getenv("MONGODB_URI"))
db = client["devpulse"]

COLLECTIONS = ["projects", "tasks", "activity_log", "daily_plans", "usage"]

print("🗑️  Clearing all DevPulse collections...")
for col in COLLECTIONS:
    result = db[col].delete_many({})
    print(f"   ✓ {col}: {result.deleted_count} documents removed")

print("\n✅ All data cleared.\n")

if "--seed" in sys.argv:
    print("🌱 Reseeding with fresh data...")
    import seed
    print("✅ Seed complete.")

client.close()
