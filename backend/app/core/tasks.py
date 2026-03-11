import taskiq_fastapi
from taskiq import InMemoryBroker, AsyncBroker
from taskiq_redis import ListQueueBroker
from app.core.config import settings
import os

# W konfiguracji deweloperskiej/produkcyjnej puszczamy przez Redis.
# Jeśli nie ma REDIS_URL w środowisku, można użyć InMemoryBroker do testów.
redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
broker = ListQueueBroker(redis_url)

from app.services.scraper_service import scrape_url
from app.services.document_parser import parse_and_vectorize
from app.core.database import SessionLocal
from app.models.document import Document
import asyncio

@broker.task
async def process_document_task(doc_id: int):
    """Asynchroniczne zadanie przetwarzania dokumentu."""
    db = SessionLocal()
    try:
        # Wywołujemy istniejącą logikę (którą później rozbudujemy o OCR)
        # Na razie adaptujemy to co mamy
        parse_and_vectorize(db, doc_id)
    finally:
        db.close()

@broker.task
async def process_url_task(url: str, case_id: int):
    """Asynchroniczne zadanie scrapowania URL i zapisu jako dokument."""
    db = SessionLocal()
    try:
        content = await scrape_url(url)
        # Tworzymy wirtualny dokument w bazie
        doc = Document(
            filename=url[:50], # Skrócona nazwa
            file_type="url",
            case_id=case_id,
            status="indexed",
            content_extracted=content,
            tag="Inne"
        )
        db.add(doc)
        db.commit()
    except Exception as e:
        print(f"Error processing URL {url}: {e}")
    finally:
        db.close()
