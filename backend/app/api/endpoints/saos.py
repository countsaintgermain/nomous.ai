from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Any, Dict
import logging
import os
import json
from app.core.llm import get_llm

from app.core.database import get_db
from app.services.saos_ai_client import saos_ai_client
from app.models.settings import AppSettings
from app.core.tasks import auto_search_saos_task, redis_client
from app.schemas.saos import (
    SavedJudgmentCreate, 
    SavedJudgmentOut,
    DetailsBySignaturesRequest,
    ExtractQuotesRequest,
    AutoSaosSearchRequest,
    AutoSaosSearchResponse,
    AutoSaosTaskStatus,
    FullDocSearchRequest
)
from app.models.saos import SavedJudgment, JudgmentSource
from app.models.case import Case
from app.services.chat_service import get_session_history
import asyncio
from datetime import datetime

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/task-status/{task_id}", response_model=AutoSaosTaskStatus)
async def get_task_status(task_id: str):
    """Sprawdza status zadania w Redisie."""
    status_key = f"task_status:{task_id}"
    data = redis_client.get(status_key)
    if not data:
        raise HTTPException(status_code=404, detail="Task not found or expired")
    return json.loads(data)

@router.post("/detailsBySignatures")
async def get_details_by_signatures(req: DetailsBySignaturesRequest):
    try:
        return await saos_ai_client.get_details_by_signatures(req.signatures)
    except Exception as e:
        logger.error(f"Error fetching details: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/fulldocsearch")
async def full_document_search(req: FullDocSearchRequest):
    """Przeszukuje pełne dokumenty w SAOS-AI (v5.1)."""
    try:
        return await saos_ai_client.full_document_search(
            query=req.query,
            limit=req.limit,
            use_rerank=req.use_rerank
        )
    except Exception as e:
        logger.error(f"Error in full document search: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/extract_quotes")
async def extract_quotes(req: ExtractQuotesRequest, db: Session = Depends(get_db)):
    try:
        llm = get_llm(db, model_type="analytical", json_mode=True)
        
        prompt = f"""Masz za zadanie wyekstrahować z podanego tekstu orzeczenia najistotniejsze cytaty (fragmenty), które najlepiej odpowiadają na zadane pytanie użytkownika.
Zwróć 2-4 najbardziej relewantne cytaty, w oryginalnym brzmieniu (dokładnie jak w tekście, aby można je było podświetlić). Nie skracaj ani nie zmieniaj słów.

Pytanie: "{req.query}"

Zwróć odpowiedź w czystym formacie JSON:
{{
    "quotes": [
        "dokładny fragment tekstu nr 1",
        "dokładny fragment tekstu nr 2"
    ]
}}

Tekst orzeczenia:
{req.text[:25000]}
"""
        response = llm.invoke(prompt)
        content = response.content
        
        json_str = ""
        if isinstance(content, str):
            json_str = content.strip()
        elif isinstance(content, list) and len(content) > 0:
            item = content[0]
            if isinstance(item, dict) and "text" in item:
                json_str = item["text"].strip()

        if json_str:
            try:
                data = json.loads(json_str)
                return {"quotes": data.get("quotes", [])}
            except json.JSONDecodeError:
                logger.error(f"Quote extraction JSON error. Raw: {json_str[:100]}")
        
        return {"quotes": []}
            
    except Exception as e:
        logger.error(f"Gemini quote extraction error: {e}")
        return {"quotes": []}

@router.post("/save", response_model=SavedJudgmentOut)
def save_judgment(judgment_in: SavedJudgmentCreate, db: Session = Depends(get_db)):
    # Sprawdź czy sprawa istnieje
    case = db.query(Case).filter(Case.id == judgment_in.case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    # Sprawdź czy już zapisano to orzeczenie w tej sprawie
    existing = db.query(SavedJudgment).filter(
        SavedJudgment.saos_id == judgment_in.saos_id,
        SavedJudgment.case_id == judgment_in.case_id
    ).first()
    
    if existing:
        return existing

    db_judgment = SavedJudgment(**judgment_in.dict())
    db.add(db_judgment)
    db.commit()
    db.refresh(db_judgment)
    return db_judgment

@router.get("/case/{case_id}", response_model=List[SavedJudgmentOut])
def get_case_saved_judgments(case_id: int, db: Session = Depends(get_db)):
    return db.query(SavedJudgment).filter(SavedJudgment.case_id == case_id).all()

@router.delete("/{judgment_id}")
def delete_saved_judgment(judgment_id: int, db: Session = Depends(get_db)):
    db_judgment = db.query(SavedJudgment).filter(SavedJudgment.id == judgment_id).first()
    if not db_judgment:
        raise HTTPException(status_code=404, detail="Judgment not found")
    
    db.delete(db_judgment)
    db.commit()
    return {"status": "ok", "message": "Judgment deleted"}

@router.post("/{case_id}/auto-search", response_model=AutoSaosSearchResponse)
async def auto_search_saos(
    case_id: int, 
    request: AutoSaosSearchRequest, 
    db: Session = Depends(get_db)
):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    logger.info(f"Auto search for case {case_id}. User remarks: {request.remarks}")

    # 1. Zbieranie kontekstu
    document_summaries = []
    positive_vectors = []
    
    # Sortujemy dokumenty od najnowszych i bierzemy max 3 do Rocchio, by uniknąć szumu
    sorted_docs = sorted(case.documents, key=lambda x: x.created_date if x.created_date else datetime.min, reverse=True)
    
    for doc in sorted_docs:
        if doc.summary:
            document_summaries.append(f"Plik: {doc.filename}\nOpracowanie:\n{doc.summary}")
        if doc.embedding is not None and len(positive_vectors) < 3:
            # Konwersja na standardowe floaty jest NIEZBĘDNA przed wysłaniem JSONa (błąd serializacji lokalnej)
            positive_vectors.append([float(x) for x in doc.embedding])

    # Historia czatu
    chat_history_str = ""
    try:
        history = get_session_history(f"case_{case_id}")
        messages = []
        # Bierzemy ostatnie 6 wiadomości dla lepszej jakości
        for msg in history.messages[-6:]:
            role = "Użytkownik" if msg.type == "human" else "Asystent"
            content = msg.content
            if isinstance(content, list):
                content = " ".join([b.get("text", "") for b in content if isinstance(b, dict) and b.get("type") == "text"])
            elif isinstance(content, str):
                pass
            else:
                content = str(content)
            messages.append(f"{role}: {content}")
        chat_history_str = "\n".join(messages)
    except Exception as e:
        logger.error(f"Error fetching chat history: {e}")

    # 2. Generowanie promptów (jeśli nie zostały przesłane)
    if not request.prompts:
        llm = get_llm(db, model_type="analytical", json_mode=True)
        
        prompt = f"""Jesteś wybitnym asystentem prawnym. Twoim zadaniem jest wygenerowanie 5 precyzyjnych i rozbudowanych zapytań do wyszukiwarki orzeczeń sądowych (SAOS), zoptymalizowanych pod wyszukiwanie wektorowe (semantic search).

UWAGI UŻYTKOWNIKA (Wytyczne):
{"-"*20}
{request.remarks if request.remarks else "Brak dodatkowych uwag."}
{"-"*20}

KONTEKST SPRAWY (Opracowania dokumentów):
{"-"*20}
{chr(10).join(document_summaries) if document_summaries else "Brak"}
{"-"*20}

OSTATNIA ROZMOWA:
{"-"*20}
{chat_history_str if chat_history_str else "Brak"}
{"-"*20}

INSTRUKCJA:
- Wygeneruj DOKŁADNIE 5 zróżnicowanych zapytań w formie gęstych, merytorycznych opisów.
- Każde zapytanie musi zawierać esencję konkretnego aspektu problemu: techniczne terminy prawne, akty prawne, artykuły oraz kluczowe elementy stanu faktycznego.
- **KAŻDE z 5 zapytań musi uwzględniać "UWAGI UŻYTKOWNIKA", wplatając je w techniczny, prawniczy opis zagadnienia.**
- Zapytania mają być "paczkami informacyjnymi" nasyconymi słowami kluczowymi, bez gramatycznych wypełniaczy typu "Szukam...", "Sąd stwierdził...".
- Nie używaj sygnatur spraw.
- Każde zapytanie zostanie zamienione na wektor, więc im więcej merytorycznej treści w nim zawrzesz, tym lepsze będą wyniki.

Zwróć odpowiedź w formacie czystego JSON, jako tablicę 5 stringów:
["gęsty opis semantyczny 1", "gęsty opis semantyczny 2", "gęsty opis semantyczny 3", "gęsty opis semantyczny 4", "gęsty opis semantyczny 5"]
"""
        # Mechanizm RETRY dla Gemini LangChain
        max_retries = 3
        retry_delay = 5
        generated_prompts = []

        for attempt in range(max_retries):
            try:
                response = llm.invoke(prompt)
                content = response.content
                
                json_str = ""
                if isinstance(content, str):
                    json_str = content.strip()
                elif isinstance(content, list) and len(content) > 0:
                    item = content[0]
                    if isinstance(item, dict) and "text" in item:
                        json_str = item["text"].strip()
                
                if json_str:
                    try:
                        parsed = json.loads(json_str)
                        if isinstance(parsed, list):
                            generated_prompts = parsed[:5]
                            break
                    except json.JSONDecodeError:
                        logger.error(f"Nomous.ia: Błąd parsowania JSON auto-search. Raw: {json_str[:100]}")
            except Exception as e:
                logger.warning(f"Nomous.ia: Błąd LangChain w saos.py (próba {attempt+1}/{max_retries}): {e}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(retry_delay)

        # FAIL-SAFE: Jeśli Gemini zawiodło, używamy uwag użytkownika jako promptu
        if not generated_prompts:
            logger.info("Nomous.ia: Kontynuuję auto-search z uwagami użytkownika jako jedynym promptem.")
            generated_prompts = [request.remarks] if request.remarks else ["szukaj orzeczeń dla tej sprawy"]
        
        # Zwracamy tylko prompty, bez wyników
        return AutoSaosSearchResponse(
            prompts=generated_prompts,
            results=[]
        )

    # 3. Wyszukiwanie SAOS i Agenta Ewaluacji (ASYNCHRONICZNE przez Taskiq)
    generated_prompts = request.prompts
    logger.info(f"Initiating async Research Agent search for case {case_id} with prompts: {generated_prompts}")
    
    # Budujemy pełny kontekst dla Agenta Ewaluacji
    case_context_str = chr(10).join(document_summaries) if document_summaries else "Brak dokumentów."
    
    task = await auto_search_saos_task.kiq(
        case_id=case_id, 
        prompts=generated_prompts, 
        positive_vectors=positive_vectors,
        user_remarks=request.remarks or "",
        case_context=case_context_str
    )
    
    return AutoSaosSearchResponse(
        prompts=generated_prompts,
        results=[],
        task_id=task.task_id
    )
