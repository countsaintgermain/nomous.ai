import os
import re
import traceback
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
from typing import List

from app.core.database import get_db
from app.models.case import Case, CaseEntity, CaseActivity, CaseHearing, CaseRelation
from app.models.document import Document
from app.schemas.case import CaseCreate, CaseOut, CaseUpdate
from app.schemas.pisp import PispAiSyncRequest
from app.services.pisp_parser import parse_pisp_data_with_ai

router = APIRouter()

CURRENT_USER_ID = 1

def parse_pisp_date(date_str: str):
    """Pomocnicza funkcja do parsowania daty z PISP (ISO) na obiekt datetime."""
    if not date_str: return None
    try:
        # PISP zazwyczaj zwraca ISO format
        return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
    except:
        return None

@router.get("", response_model=List[CaseOut])
def read_cases(db: Session = Depends(get_db)):
    cases = db.query(Case).filter(Case.user_id == CURRENT_USER_ID).order_by(Case.created_date.desc()).all()
    
    for case in cases:
        case.activities.sort(key=lambda x: x.date if x.date else "", reverse=True)
        case.hearings.sort(key=lambda x: x.date if x.date else "", reverse=True)
        case.relations.sort(key=lambda x: x.id, reverse=True)
        # Sortowanie po document_date (merytoryczna), fallback na created_date
        case.documents.sort(key=lambda x: (x.document_date, x.id), reverse=True)
        
    return cases

@router.get("/{case_id}", response_model=CaseOut)
def read_case(case_id: int, db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.id == case_id, Case.user_id == CURRENT_USER_ID).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    case.activities.sort(key=lambda x: x.date if x.date else "", reverse=True)
    case.hearings.sort(key=lambda x: x.date if x.date else "", reverse=True)
    case.relations.sort(key=lambda x: x.id, reverse=True)
    case.documents.sort(key=lambda x: (x.document_date, x.id), reverse=True)
    
    return case

@router.post("", response_model=CaseOut, status_code=status.HTTP_201_CREATED)
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

@router.post("/{case_id}/pisp-sync", response_model=CaseOut)
def sync_pisp_data(case_id: int, request: PispAiSyncRequest, db: Session = Depends(get_db)):
    try:
        if request.structured_data:
            sync_data = request.structured_data
            print(f"PISP Sync: Received structured_data with keys: {sync_data.dict().keys()}")
            if hasattr(sync_data, 'relations'):
                print(f"PISP Sync: Relations count in payload: {len(sync_data.relations)}")
        else:
            sync_data = parse_pisp_data_with_ai(request.raw_texts, [d.dict() for d in request.document_links])

        db_case = db.query(Case).filter(Case.id == case_id).first()
        if not db_case:
            raise HTTPException(status_code=404, detail="Case not found")

        if sync_data.court: db_case.court = sync_data.court
        if sync_data.department: db_case.department = sync_data.department
        if sync_data.status: db_case.status = sync_data.status
        if sync_data.receiptDate: db_case.receipt_date = sync_data.receiptDate
        if sync_data.conclusionDate: db_case.conclusion_date = sync_data.conclusionDate
        if sync_data.publicationDate: db_case.publication_date = sync_data.publicationDate
        if sync_data.caseSubject: db_case.case_subject = sync_data.caseSubject
        if sync_data.referent: db_case.referent = sync_data.referent
        if sync_data.claimValue: db_case.claim_value = sync_data.claimValue
        if sync_data.resolution: db_case.resolution = sync_data.resolution
        if sync_data.mainEntities: db_case.main_entities = sync_data.mainEntities
        if sync_data.signature and sync_data.signature != "Error": db_case.signature = sync_data.signature
        db.flush()

        # Sync Podmioty
        existing_entities = db.query(CaseEntity).filter(CaseEntity.case_id == case_id).all()
        existing_e_ids = {e.pisp_id for e in existing_entities if e.pisp_id is not None}
        for e in sync_data.entities:
            if e.id and e.id not in existing_e_ids:
                db_e = CaseEntity(
                    case_id=case_id, pisp_id=e.id, role=e.role, name=e.name, address=e.address,
                    type=e.type, priority=e.priority, parent_id=e.parentId, status=e.status,
                    date_from=e.dateFrom, date_to=e.dateTo, gained_access_date=e.gainedAccessDate,
                    created_date=e.createdDate, modification_date=e.modificationDate,
                    has_access=str(e.hasAccess) if e.hasAccess is not None else None,
                    representatives=e.representatives
                )
                db.add(db_e)
                existing_e_ids.add(e.id)

        # Sync Czynności
        existing_activities = db.query(CaseActivity).filter(CaseActivity.case_id == case_id).all()
        existing_act_ids = {a.pisp_id for a in existing_activities if a.pisp_id is not None}
        for act in sync_data.activities:
            if act.id and act.id not in existing_act_ids:
                db_act = CaseActivity(
                    case_id=case_id, pisp_id=act.id, pisp_case_id=act.caseId, document_id=act.documentId,
                    date=act.date, signature=act.signature or db_case.signature, court_name=act.courtName,
                    name=act.name, sender=act.sender, receiver=act.receiver, comment=act.comment,
                    judge=act.judge, party=act.party, subject=act.subject, full_document_name=act.fullDocumentName,
                    document_name=act.documentName, activity=act.activity or act.name, 
                    submitted_by=act.submitted_by or act.sender
                )
                db.add(db_act)
                existing_act_ids.add(act.id)

        # Sync Posiedzenia
        existing_hearings = db.query(CaseHearing).filter(CaseHearing.case_id == case_id).all()
        existing_h_ids = {h.pisp_id for h in existing_hearings if h.pisp_id is not None}
        for h in sync_data.hearings:
            if h.id and h.id not in existing_h_ids:
                db_h = CaseHearing(
                    case_id=case_id, pisp_id=h.id, signature=h.signature or db_case.signature,
                    court=h.court, date=h.date, room=h.room, procedure=h.procedure, judge=h.judge,
                    subject=h.subject, value=h.value, eprotocol=str(h.eprotocol) if h.eprotocol is not None else None,
                    eprotocol_id=h.eprotocolId, eprotocol_video_path=h.eprotocolVideoPath, result=h.result,
                    video_archivization_date=h.videoArchivizationDate,
                    transcription_files_present=str(h.transcriptionFilesPresent) if h.transcriptionFilesPresent is not None else None,
                    created_date=h.createdDate, modification_date=h.modificationDate
                )
                db.add(db_h)
                existing_h_ids.add(h.id)

        # Sync Dokumenty
        existing_docs = db.query(Document).filter(Document.case_id == case_id).all()
        existing_d_ids = {d.pisp_id for d in existing_docs if d.pisp_id is not None}
        all_docs = sync_data.documents if sync_data.documents else request.document_links
        for d in all_docs:
            if d.id and d.id not in existing_d_ids:
                # Oczyszczanie nazwy dokumentu z daty (mamy ją w osobnym polu)
                clean_name = d.documentName or d.fileName or "Dokument"
                clean_name = re.sub(r'\s*\(utworzono\s+\d{2}\.\d{2}\.\d{4}\)', '', clean_name, flags=re.IGNORECASE)
                
                db_doc = Document(
                    case_id=case_id, pisp_id=d.id, filename=d.fileName or d.documentName or "Dokument",
                    document_date=parse_pisp_date(d.publicationDate or d.createDate) or datetime.now(),
                    publication_date=d.publicationDate, 
                    document_name=clean_name, document_type=str(d.documentType),
                    downloaded=str(d.downloaded) if d.downloaded is not None else None,
                    document_checksum=d.documentChecksum,
                    modification_date=d.modificationDate, writing_id=d.writingId,
                    writing_attachment_type=d.writingAttachmentType, docs_count=d.docsCount,
                    download_link=d.downloadLink, 
                    source_download_link=getattr(d, 'sourceDownloadLink', None),
                    tag="PISP", status="uploaded"
                )
                db.add(db_doc)
                existing_d_ids.add(d.id)

        # Sync Powiązania
        if hasattr(sync_data, 'relations') and sync_data.relations:
            existing_relations = db.query(CaseRelation).filter(CaseRelation.case_id == case_id).all()
            existing_r_ids = {r.pisp_id for r in existing_relations if r.pisp_id is not None}
            synced_count = 0
            for r in sync_data.relations:
                if r.id and r.id not in existing_r_ids:
                    db_r = CaseRelation(
                        case_id=case_id, pisp_id=r.id, signature=r.signature,
                        relation_type=r.relationType, authority=r.authority,
                        judge=r.judge, receipt_date=r.receiptDate,
                        decission_date=r.decissionDate, result=r.result,
                        external_id=r.externalId
                    )
                    db.add(db_r)
                    existing_r_ids.add(r.id)
                    synced_count += 1
            print(f"PISP Sync: Synced {synced_count} new relations for case {case_id}")

        db.commit()
        db.refresh(db_case)
        return db_case
    except Exception as e:
        db.rollback()
        print(f"Nomous.ia Sync Error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

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
