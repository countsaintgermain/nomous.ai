import asyncio
import json
import os
from typing import List, Dict, Any
from mcp.server.fastmcp import FastMCP
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.case import Case
from app.models.document import Document
from app.services.saos_ai_client import saos_ai_client

# Inicjalizacja serwera MCP
mcp = FastMCP("NomousAI")

@mcp.tool()
async def get_case_briefcase(case_id: int) -> str:
    """
    Pobiera pełną zawartość 'aktówki' dla danej sprawy: listę dokumentów, 
    ich streszczenia OCR, wyekstrahowane fakty, daty i kwoty.
    Użyj tego, aby zrozumieć stan faktyczny sprawy przed pisaniem pism.
    """
    db: Session = SessionLocal()
    try:
        case = db.query(Case).filter(Case.id == case_id).first()
        if not case:
            return f"Błąd: Nie znaleziono sprawy o ID {case_id}."

        documents = db.query(Document).filter(Document.case_id == case_id).all()
        
        briefcase = {
            "case_title": case.title,
            "case_description": case.description,
            "document_count": len(documents),
            "documents": []
        }

        for doc in documents:
            doc_info = {
                "id": doc.id,
                "filename": doc.filename,
                "status": doc.status,
                "ocr_summary": doc.summary,
                "entities": doc.entities, # Zawiera osoby, daty, kwoty, przepisy
                "suggested_facts": doc.suggested_facts,
                "document_date": str(doc.document_date) if doc.document_date else None
            }
            briefcase["documents"].append(doc_info)

        return json.dumps(briefcase, indent=2, ensure_ascii=False)
    except Exception as e:
        return f"Błąd bazy danych: {str(e)}"
    finally:
        db.close()

@mcp.tool()
async def search_saos_judgments(query: str, case_id: int, limit: int = 10) -> str:
    """
    Przeszukuje bazę orzeczeń SAOS-AI przy użyciu wyszukiwania semantycznego.
    Automatycznie uwzględnia wektory dokumentów z aktówki (Rocchio), 
    aby znaleźć wyroki o najbardziej zbliżonym stanie faktycznym.
    """
    # Wyszukiwanie wymaga endpointu API, bo tam jest logika LangChain/Rocchio.
    # Wywołamy bezpośrednio saos_ai_client dla czystego wyszukiwania, 
    # lub w przyszłości pełny endpoint /semantic.
    try:
        results = await saos_ai_client.search(query=query, limit=limit)
        # Normalizacja wyników dla czytelności agenta
        simplified = []
        for r in results:
            simplified.append({
                "saos_id": r.get("saos_id"),
                "date": r.get("judgment_date"),
                "court": r.get("court_name"),
                "signature": r.get("signatures", ["Brak"])[0],
                "summary": r.get("summary") or r.get("chunk_text")[:500] + "..."
            })
        return json.dumps(simplified, indent=2, ensure_ascii=False)
    except Exception as e:
        return f"Błąd wyszukiwania SAOS: {str(e)}"

@mcp.tool()
async def get_judgment_full_text(saos_id: int) -> str:
    """
    Pobiera pełną treść uzasadnienia orzeczenia o podanym ID.
    Użyj tego, aby wyciągnąć precyzyjne cytaty do argumentacji prawnej.
    """
    try:
        batch = await saos_ai_client.get_judgments_batch([saos_id])
        if not batch:
            return f"Nie znaleziono orzeczenia o ID {saos_id}."
        
        j = batch[0]
        content = j.get("text_content") or j.get("content") or "Brak treści."
        
        full_info = {
            "signature": j.get("signatures", ["Brak"])[0],
            "date": j.get("judgment_date"),
            "court": j.get("court_name"),
            "content": content
        }
        return json.dumps(full_info, indent=2, ensure_ascii=False)
    except Exception as e:
        return f"Błąd pobierania szczegółów: {str(e)}"

if __name__ == "__main__":
    mcp.run()
