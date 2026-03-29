import os
import shutil
import hashlib
import urllib.parse
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional, Any
from pydantic import BaseModel

from app.core.database import get_db
from app.models.document import Document
from app.models.case import Case

router = APIRouter()

UPLOAD_DIR = "/app/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

CURRENT_USER_ID = 1

class DocumentUpdate(BaseModel):
    document_date: Optional[datetime] = None

def compute_file_hash(file_bytes: bytes) -> str:
    return hashlib.sha256(file_bytes).hexdigest()

@router.post("/{case_id}/documents")
async def upload_document(
    case_id: int,
    file: UploadFile = File(...),
    tag: str = Form("Dokument"),
    pisp_id: Optional[int] = Form(None),
    db: Session = Depends(get_db)
):
    case = db.query(Case).filter(Case.id == case_id, Case.user_id == CURRENT_USER_ID).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found or unauthorized")

    case_dir = os.path.join(UPLOAD_DIR, str(case_id))
    os.makedirs(case_dir, exist_ok=True)

    file_bytes = await file.read()
    file_hash = compute_file_hash(file_bytes)
    
    clean_filename = file.filename.replace(".pdf.pdf", ".pdf")
    is_pdf = clean_filename.lower().endswith(".pdf")

    db_doc = None
    if pisp_id:
        db_doc = db.query(Document).filter(Document.case_id == case_id, Document.pisp_id == pisp_id).first()
    
    if not db_doc:
        db_doc = db.query(Document).filter(Document.case_id == case_id, Document.file_hash == file_hash).first()

    if not db_doc:
        db_doc = Document(
            filename=clean_filename,
            document_name=clean_filename, # OBOWIĄZKOWA NAZWA
            file_type=clean_filename.split(".")[-1] if "." in clean_filename else "",
            file_hash=file_hash,
            tag=tag,
            pisp_id=pisp_id,
            case_id=case_id,
            status="uploaded",
            document_date=datetime.now() # DOMYŚLNA DATA PRZY UPLOADZIE
        )
        db.add(db_doc)
        db.commit()
        db.refresh(db_doc)

    suffix = "pdf" if is_pdf else "src"
    file_path = os.path.join(case_dir, f"{db_doc.id}_{suffix}_{clean_filename}")
    with open(file_path, "wb") as buffer:
        buffer.write(file_bytes)
        
    if is_pdf:
        db_doc.s3_key_pdf = file_path
    else:
        db_doc.s3_key_source = file_path
    
    db_doc.s3_key = file_path 
    db_doc.status = "uploaded"
    db.commit()
    
    if is_pdf:
        try:
            from app.services.tasks import process_document_ocr_task
            await process_document_ocr_task.kiq(db_doc.id)
        except: pass
    
    return {"status": "ok", "document_id": db_doc.id}

@router.get("/{case_id}/documents")
def get_documents_by_case(case_id: int, db: Session = Depends(get_db)):
    docs = db.query(Document).filter(Document.case_id == case_id).order_by(Document.document_date.desc(), Document.id.desc()).all()
    return [{
        "id": d.id, 
        "filename": d.filename, 
        "document_name": d.document_name,
        "tag": d.tag, 
        "status": d.status, 
        "created_date": d.created_date,
        "document_date": d.document_date,
        "has_source": d.s3_key_source is not None,
        "has_pdf": d.s3_key_pdf is not None
    } for d in docs]

@router.get("/{case_id}/documents/{doc_id}")
def get_document_details(case_id: int, doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id, Document.case_id == case_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    return {
        "id": doc.id,
        "filename": doc.filename,
        "document_name": doc.document_name,
        "tag": doc.tag,
        "status": doc.status,
        "created_date": doc.created_date,
        "document_date": doc.document_date,
        "summary": doc.summary,
        "entities": doc.entities,
        "suggested_facts": doc.suggested_facts,
        "has_source": doc.s3_key_source is not None,
        "has_pdf": doc.s3_key_pdf is not None
    }

@router.patch("/{case_id}/documents/{doc_id}")
def update_document(case_id: int, doc_id: int, doc_in: DocumentUpdate, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id, Document.case_id == case_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Blokada edycji dla dokumentów PISP
    if doc.tag == "PISP":
        raise HTTPException(status_code=400, detail="Nie można edytować daty dla dokumentów z PISP")
    
    if doc_in.document_date:
        doc.document_date = doc_in.document_date
        
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc

@router.get("/{case_id}/documents/{doc_id}/download")
def download_document(case_id: int, doc_id: int, format: str = "source", db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id, Document.case_id == case_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    path = doc.s3_key_pdf if format == "pdf" else doc.s3_key_source
    if not path:
        path = doc.s3_key_pdf or doc.s3_key_source or doc.s3_key
        
    if not path or not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File missing on disk.")
    
    filename = os.path.basename(path).split('_', 2)[-1]
    is_pdf = path.lower().endswith(".pdf")
    encoded_filename = urllib.parse.quote(filename)
    disposition = "inline" if is_pdf and format == "pdf" else "attachment"
    
    return FileResponse(
        path=path,
        filename=filename,
        media_type="application/pdf" if is_pdf else "application/octet-stream",
        headers={"Content-Disposition": f"{disposition}; filename*=UTF-8''{encoded_filename}"}
    )

@router.delete("/{case_id}/documents/{doc_id}")
def delete_document(case_id: int, doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id, Document.case_id == case_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    for p in [doc.s3_key_source, doc.s3_key_pdf, doc.s3_key]:
        if p and os.path.exists(p):
            try: os.remove(p)
            except: pass

    db.delete(doc)
    db.commit()
    return {"status": "ok", "message": "Document removed."}

@router.post("/{case_id}/documents/{doc_id}/analyze")
async def analyze_document(case_id: int, doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id, Document.case_id == case_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    from app.services.tasks import process_document_ocr_task
    await process_document_ocr_task.kiq(doc.id)
    return {"status": "ok", "message": "Analysis started"}
