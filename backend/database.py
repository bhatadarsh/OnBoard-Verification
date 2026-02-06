import json
import os
from typing import Dict, List, Any

import os

# Ensure we use an absolute path for data.json relative to this file
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, "data.json")

class PersistentDB:
    def __init__(self):
        self.users: Dict[str, Any] = {}
        self.jds: Dict[str, Any] = {}
        self.resumes: List[Any] = []
        self.interviews: List[Any] = []
        self.user_id_counter = 1
        self.load()

    def load(self):
        if os.path.exists(DATA_FILE):
            try:
                with open(DATA_FILE, "r") as f:
                    data = json.load(f)
                    self.users = data.get("users", {})
                    self.jds = data.get("jds", {})
                    self.resumes = data.get("resumes", [])
                    self.interviews = data.get("interviews", [])
                    self.user_id_counter = data.get("user_id_counter", 1)
            except json.JSONDecodeError:
                pass

    def save(self):
        data = {
            "users": self.users,
            "jds": self.jds,
            "resumes": self.resumes,
            "interviews": self.interviews,
            "user_id_counter": self.user_id_counter
        }
        with open(DATA_FILE, "w") as f:
            json.dump(data, f, indent=2, default=str)

db = PersistentDB()

# Backward compatibility aliases
users_db = db.users
jd_db = db.jds
resume_db = db.resumes
user_id_counter = db.user_id_counter
