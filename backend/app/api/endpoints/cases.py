from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.case import Case
from app.schemas.case import CaseCreate, CaseUpdate, CaseOut

router = APIRouter()

# Zakładamy dla MVP jednego użytkownika (lub pobieranie z Auth w przyszłości)
CURRENT_USER_ID = 1

@router.post("/", response_model=CaseOut, status_code=status.HTTP_201_CREATED)
def create_case(case_in: CaseCreate, db: Session = Depends(get_db)):
    db_case = Case(
        title=case_in.title,
        description=case_in.description,
        signature=case_in.signature,
        user_id=CURRENT_USER_ID,
        status="new"
    )
    db.add(db_case)
    db.commit()
    db.refresh(db_case)
    return db_case

@router.get("/", response_model=List[CaseOut])
def read_cases(db: Session = Depends(get_db)):
    cases = db.query(Case).filter(Case.user_id == CURRENT_USER_ID).order_by(Case.created_at.desc()).all()
    return cases

@router.get("/{case_id}", response_model=CaseOut)
def read_case(case_id: int, db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.id == case_id, Case.user_id == CURRENT_USER_ID).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case

@router.patch("/{case_id}", response_model=CaseOut)
def update_case(case_id: int, case_in: CaseUpdate, db: Session = Depends(get_db)):
    db_case = db.query(Case).filter(Case.id == case_id, Case.user_id == CURRENT_USER_ID).first()
    if not db_case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    update_data = case_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_case, field, value)
    
    db.add(db_case)
    db.commit()
    db.refresh(db_case)
    return db_case
