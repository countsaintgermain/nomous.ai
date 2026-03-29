from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.case_fact import CaseFact
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

class CaseFactCreate(BaseModel):
    content: str
    source_doc_id: int | None = None

class CaseFactOut(BaseModel):
    id: int
    content: str
    case_id: int
    source_doc_id: int | None = None
    created_date: datetime

    class Config:
        from_attributes = True

@router.get("/{case_id}/facts", response_model=List[CaseFactOut])
def get_facts(case_id: int, db: Session = Depends(get_db)):
    facts = db.query(CaseFact).filter(CaseFact.case_id == case_id).order_by(CaseFact.created_date.desc()).all()
    return facts

@router.post("/{case_id}/facts", response_model=CaseFactOut)
def create_fact(case_id: int, fact_in: CaseFactCreate, db: Session = Depends(get_db)):
    db_fact = CaseFact(
        content=fact_in.content,
        case_id=case_id,
        source_doc_id=fact_in.source_doc_id
    )
    db.add(db_fact)
    db.commit()
    db.refresh(db_fact)
    return db_fact

@router.delete("/{case_id}/facts/{fact_id}")
def delete_fact(case_id: int, fact_id: int, db: Session = Depends(get_db)):
    fact = db.query(CaseFact).filter(CaseFact.id == fact_id, CaseFact.case_id == case_id).first()
    if not fact:
        raise HTTPException(status_code=404, detail="Fact not found")
    db.delete(fact)
    db.commit()
    return {"status": "ok"}
