import re
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

class ScanRequest(BaseModel):
    text: str

# Each pattern paired with a human-readable reason
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
            return {"is_blocked": True, "reason": reason}

    return {"is_blocked": False}
