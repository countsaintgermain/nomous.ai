from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from app.core.database import get_db
from app.models.case_fact import CaseFact
from app.models.case import Case

router = APIRouter()

CURRENT_USER_ID = 1

@router.get("/{case_id}/facts")
def get_case_facts(case_id: int, db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.id == case_id, Case.user_id == CURRENT_USER_ID).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
        
    facts = db.query(CaseFact).filter(CaseFact.case_id == case_id).order_by(CaseFact.created_at.desc()).all()
    
    return [
        {
            "id": f.id,
            "content": f.content,
            "metadata_json": f.metadata_json,
            "source_doc_id": f.source_doc_id,
            "created_at": f.created_at
        } 
        for f in facts
    ]

class CaseFactCreate(BaseModel):
    content: str
    source_doc_id: Optional[int] = None
    metadata_json: Optional[dict] = None

@router.post("/{case_id}/facts")
def create_case_fact(case_id: int, fact_in: CaseFactCreate, db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.id == case_id, Case.user_id == CURRENT_USER_ID).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
        
    new_fact = CaseFact(
        case_id=case_id,
        content=fact_in.content,
        source_doc_id=fact_in.source_doc_id,
        metadata_json=fact_in.metadata_json
    )
    db.add(new_fact)
    db.commit()
    db.refresh(new_fact)
    
    return {"status": "ok", "fact_id": new_fact.id}

@router.delete("/{case_id}/facts/{fact_id}")
def delete_case_fact(case_id: int, fact_id: int, db: Session = Depends(get_db)):
    fact = db.query(CaseFact).filter(CaseFact.id == fact_id, CaseFact.case_id == case_id).first()
    if not fact:
        raise HTTPException(status_code=404, detail="Fact not found")
        
    db.delete(fact)
    db.commit()
    return {"status": "ok"}

