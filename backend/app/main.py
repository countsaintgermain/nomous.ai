import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.api.endpoints import cases, documents, chat, facts, test_stream, saos, pisp, settings
from app.core.database import engine, Base

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Nomous.ia API")

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(cases.router, prefix="/api/cases", tags=["cases"])
app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(facts.router, prefix="/api/facts", tags=["facts"])
app.include_router(saos.router, prefix="/api/saos", tags=["saos"])
app.include_router(pisp.router, prefix="/api/pisp", tags=["pisp"])
app.include_router(settings.router, prefix="/api/settings", tags=["settings"])
app.include_router(test_stream.router, prefix="/api/test-stream", tags=["test"])

# Static files for uploads
os.makedirs("/app/uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="/app/uploads"), name="uploads")

@app.get("/")
async def root():
    return {"message": "Nomous.ia API is running"}
