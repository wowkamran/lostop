import re
import sqlite3
from datetime import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = "incidents.db"


def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS incidents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            reason TEXT NOT NULL,
            snippet_masked TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()


def mask_text(text, visible_chars=6):
    if len(text) <= visible_chars:
        return "*" * len(text)
    return text[:visible_chars] + "*" * (len(text) - visible_chars)


def save_incident(reason, text):
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        "INSERT INTO incidents (timestamp, reason, snippet_masked) VALUES (?, ?, ?)",
        (datetime.now().isoformat(), reason, mask_text(text))
    )
    conn.commit()
    conn.close()


init_db()


class ScanRequest(BaseModel):
    text: str


PATTERNS = [
    (r"sk-[A-Za-z0-9]{20,48}", "OpenAI API key detected"),
    (r"AKIA[0-9A-Z]{16}", "AWS Access Key detected"),
    (r"ghp_[A-Za-z0-9]{36}", "GitHub Personal Access Token detected"),
    (r"eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+", "JWT token detected"),
    (r"-----BEGIN (RSA |EC |)PRIVATE KEY-----", "Private key (PEM) detected"),
    (r"\b(?:\d[ -]*?){13,16}\b", "Possible card number detected"),
]


@app.post("/scan")
def scan_text(request: ScanRequest):
    text = request.text

    for pattern, reason in PATTERNS:
        if re.search(pattern, text):
            save_incident(reason, text)
            return {"is_blocked": True, "reason": reason}

    return {"is_blocked": False}


@app.get("/incidents")
def get_incidents():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        "SELECT * FROM incidents ORDER BY timestamp DESC"
    ).fetchall()
    conn.close()
    return [dict(row) for row in rows]
