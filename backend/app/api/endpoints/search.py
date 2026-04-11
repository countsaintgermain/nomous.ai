from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import logging

from app.core.database import get_db
from app.models.feedback import RelevanceFeedback
from app.models.case import Case
from app.schemas.feedback import RelevanceFeedbackCreate, RelevanceFeedbackOut
from app.services.saos_ai_client import saos_ai_client
from app.models.document import Document
from app.models.embedding import Embedding
from app.models.saos import SavedJudgment
from app.core.worker import broker

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/feedback", response_model=Optional[RelevanceFeedbackOut])
async def give_feedback(feedback_in: RelevanceFeedbackCreate, db: Session = Depends(get_db)):
    # 1. Sprawdź czy sprawa istnieje
    case = db.query(Case).filter(Case.id == feedback_in.case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    # 2. Usuń stare feedbacki dla tego obiektu w tej sprawie
    query = db.query(RelevanceFeedback).filter(RelevanceFeedback.case_id == feedback_in.case_id)
    if feedback_in.document_id:
        query = query.filter(RelevanceFeedback.document_id == feedback_in.document_id)
    elif feedback_in.saos_id:
        query = query.filter(RelevanceFeedback.saos_id == feedback_in.saos_id)
    else:
        raise HTTPException(status_code=400, detail="Either document_id or saos_id must be provided")
    
    query.delete()
    
    if feedback_in.vote == "none":
        db.commit()
        return None

    # 3. Dodaj nowy feedback
    is_positive = feedback_in.vote == "up"
    new_feedback = RelevanceFeedback(
        case_id=feedback_in.case_id,
        document_id=feedback_in.document_id,
        saos_id=feedback_in.saos_id,
        is_positive=is_positive
    )
    db.add(new_feedback)
    db.commit()
    db.refresh(new_feedback)

    # 4. Trigger wyciągania wektora jeśli go nie ma (Worker)
    if feedback_in.document_id:
        # Sprawdź czy dokument ma już wektory
        emb = db.query(Embedding).filter(
            Embedding.entity_type == 'document',
            Embedding.entity_id == feedback_in.document_id
        ).first()
        if not emb:
            from app.services.tasks import process_document_embedding_task
            await process_document_embedding_task.kiq(feedback_in.document_id)
    
    if feedback_in.saos_id:
        # Sprawdź czy mamy to orzeczenie z embeddingiem
        judgment = db.query(SavedJudgment).filter(
            SavedJudgment.saos_id == feedback_in.saos_id,
            SavedJudgment.case_id == feedback_in.case_id
        ).first()
        if not judgment or judgment.embedding is None:
            from app.services.tasks import process_judgment_embedding_task
            # Przekazujemy saos_id i case_id
            await process_judgment_embedding_task.kiq(feedback_in.saos_id, feedback_in.case_id)

    return new_feedback

@router.post("/semantic")
async def semantic_search(case_id: int, query: str, top_k: int = 10, include_context: bool = True, db: Session = Depends(get_db)):
    # 1. Pobierz feedback (łapki) dla tej sprawy
    feedback_items = db.query(RelevanceFeedback).filter(RelevanceFeedback.case_id == case_id).all()
    
    positive_vectors = []
    negative_vectors = []

    for fb in feedback_items:
        vector = None
        if fb.document_id:
            # Uwzględniamy wektory dokumentów tylko jeśli include_context jest włączony i łapka jest w górę
            if not include_context or not fb.is_positive:
                continue
                
            doc = db.query(Document).filter(Document.id == fb.document_id).first()
            if doc and doc.embedding:
                vector = doc.embedding
        elif fb.saos_id:
            judgment = db.query(SavedJudgment).filter(
                SavedJudgment.saos_id == fb.saos_id,
                SavedJudgment.case_id == case_id
            ).first()
            if judgment and judgment.embedding:
                vector = judgment.embedding
        
        if vector:
            if fb.is_positive:
                positive_vectors.append(vector)
            else:
                negative_vectors.append(vector)

    # 2. Wykonaj wyszukiwanie z Rocchio bezpośrednio na serwerze saos-ai
    results = await saos_ai_client.search_with_rocchio(
        query=query,
        positive_vectors=positive_vectors,
        negative_vectors=negative_vectors,
        limit=top_k
    )

    # 3. Wyniki z saos-ai API v5.0 są już listą orzeczeń z saos_id i metadanymi.
    return results
