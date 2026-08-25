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

@app.post("/scan")
def scan_text(request: ScanRequest):
    text = request.text
    if "sk-" in text or "AKIA" in text:
        return {"is_blocked": True, "reason": "Похоже на секретный ключ"}
    return {"is_blocked": False}
