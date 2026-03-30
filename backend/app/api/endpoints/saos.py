from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Any
import logging

from app.core.database import get_db
from app.services.saos_service import SaosService
from app.schemas.saos import SaosSearchParams, SavedJudgmentCreate, SavedJudgmentOut
from app.models.saos import SavedJudgment, JudgmentSource
from app.models.case import Case

router = APIRouter()
logger = logging.getLogger(__name__)
saos_service = SaosService()

@router.get("/search")
async def search_saos(params: SaosSearchParams = Depends()):
    try:
        return await saos_service.search_judgments(
            keywords=params.keywords,
            court_type=params.court_type,
            judgment_date_from=params.judgment_date_from,
            judgment_date_to=params.judgment_date_to,
            page_number=params.page_number,
            page_size=params.page_size
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/judgment/{judgment_id}")
async def get_saos_judgment(judgment_id: int):
    try:
        return await saos_service.get_judgment_details(judgment_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
