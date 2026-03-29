import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Nomous.ia API",
    description="Backend services for Nomous MVP",
    version="1.0.0",
    redirect_slashes=False
)

# Konfiguracja CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api.endpoints import cases, documents, chat, facts, test_stream

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Nomous.ia API is running on Python 3.13"}

app.include_router(cases.router, prefix="/api/cases", tags=["cases"])
app.include_router(documents.router, prefix="/api/cases", tags=["documents"])
app.include_router(facts.router, prefix="/api/cases", tags=["facts"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(test_stream.router, prefix="/api/test", tags=["test"])
