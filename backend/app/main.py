import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Nomous.ia API",
    description="Backend services for Nomous MVP",
    version="1.0.0"
)

# Konfiguracja CORS pod Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api.endpoints import cases, documents, chat, facts

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Nomous.ia API is running"}

app.include_router(cases.router, prefix="/api/cases", tags=["cases"])
app.include_router(documents.router, prefix="/api/cases", tags=["documents"])
app.include_router(facts.router, prefix="/api/cases", tags=["facts"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
