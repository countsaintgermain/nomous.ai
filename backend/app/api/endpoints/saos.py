from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Any, Dict
import logging
import os
import json
from google import genai
from google.genai import types

from app.core.database import get_db
from app.services.saos_ai_client import saos_ai_client
from app.models.settings import AppSettings
from app.schemas.saos import (
    SavedJudgmentCreate, 
    SavedJudgmentOut,
    DetailsBySignaturesRequest,
    ExtractQuotesRequest
)
from app.models.saos import SavedJudgment, JudgmentSource
from app.models.case import Case

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/detailsBySignatures")
async def get_details_by_signatures(req: DetailsBySignaturesRequest):
    try:
        return await saos_ai_client.get_details_by_signatures(req.signatures)
    except Exception as e:
        logger.error(f"Error fetching details: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/extract_quotes")
async def extract_quotes(req: ExtractQuotesRequest, db: Session = Depends(get_db)):
    try:
        app_settings = db.query(AppSettings).first()
        analytical_model = app_settings.analytical_model if app_settings else "gemini-3.1-flash-lite-preview"
        api_key = app_settings.api_key if app_settings and app_settings.api_key else os.getenv("GOOGLE_API_KEY")
        use_vertex = app_settings.use_vertex if app_settings else True

        client = genai.Client(api_key=api_key, vertexai=use_vertex)
        
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
"""
        response = client.models.generate_content(
            model=analytical_model,
            contents=[prompt, f"Tekst orzeczenia:\n{req.text[:25000]}"],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.0
            )
        )
        
        clean_res = response.text.replace("```json", "").replace("```", "").strip()
        try:
            data = json.loads(clean_res)
            return {"quotes": data.get("quotes", [])}
        except:
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
