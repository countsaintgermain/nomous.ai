import os
import shutil
import hashlib
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.document import Document
from app.models.case import Case

router = APIRouter()

UPLOAD_DIR = "/tmp/nomous_uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

CURRENT_USER_ID = 1

def compute_file_hash(file_bytes: bytes) -> str:
    return hashlib.sha256(file_bytes).hexdigest()

@router.post("/{case_id}/documents")
async def upload_document(
    case_id: int,
    file: UploadFile = File(...),
    tag: str = Form("Dokument"),
    db: Session = Depends(get_db)
):
    case = db.query(Case).filter(Case.id == case_id, Case.user_id == CURRENT_USER_ID).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found or unauthorized")

    file_bytes = await file.read()
    file_hash = compute_file_hash(file_bytes)
    
    # Deduplikacja
    existing_doc = db.query(Document).filter(Document.case_id == case_id, Document.file_hash == file_hash).first()
    if existing_doc:
         raise HTTPException(status_code=409, detail="Document already exists in this case")

    file_extension = file.filename.split(".")[-1] if "." in file.filename else ""
    if file_extension.lower() not in ["pdf", "jpg", "png", "odt", "docx"]:
        raise HTTPException(status_code=400, detail="Unsupported file format")
    
    db_doc = Document(
        filename=file.filename,
        file_type=file_extension,
        file_hash=file_hash,
        tag=tag,
        case_id=case_id,
        status="uploaded"
    )
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)
    
    file_path = os.path.join(UPLOAD_DIR, f"{db_doc.id}_{file.filename}")
    with open(file_path, "wb") as buffer:
        buffer.write(file_bytes)
        
    db_doc.s3_key = file_path
    db.commit()
    
    return {"status": "ok", "document_id": db_doc.id, "filename": db_doc.filename, "tag": tag}

@router.get("/{case_id}/documents")
def get_documents_by_case(case_id: int, db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.id == case_id, Case.user_id == CURRENT_USER_ID).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
        
    docs = db.query(Document).filter(Document.case_id == case_id).all()
    return [{"id": d.id, "filename": d.filename, "tag": d.tag, "status": d.status, "date": d.created_at} for d in docs]

@router.delete("/{case_id}/documents/{doc_id}")
def delete_document(case_id: int, doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id, Document.case_id == case_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Usuwanie wektorów z Pinecone
    if doc.pinecone_namespace:
        try:
            from pinecone import Pinecone
            pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
            index_name = os.getenv("PINECONE_INDEX_NAME", "nomous-dev-index")
            if index_name in [idx.name for idx in pc.list_indexes()]:
                index = pc.Index(index_name)
                # Pinecone wymaga wylistowania wektorów, lub mamy w API opcję delete all dla namespace. Delete all
                index.delete(delete_all=True, namespace=doc.pinecone_namespace)
        except Exception as e:
            print(f"Błąd usuwania wektorów z Pinecone: {e}")
            
    # Plik z dysku
    if doc.s3_key and os.path.exists(doc.s3_key):
        os.remove(doc.s3_key)

    # Kaskadowe usunięcie faktów dzięki ondelete="CASCADE" i samego dokumentu
    db.delete(doc)
    db.commit()
    return {"status": "ok", "message": "Document and associated facts completely removed."}

@router.post("/{case_id}/documents/{doc_id}/analyze")
async def analyze_document(case_id: int, doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id, Document.case_id == case_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if doc.status == "processing":
         raise HTTPException(status_code=400, detail="Document is already processing")

    from app.services.tasks import process_document_ocr_task
    # TaskIQ kicking off async task
    task = await process_document_ocr_task.kiq(doc.id)
    
    return {"status": "ok", "task_id": task.task_id, "message": "OCR and Vectorization process started"}

@router.get("/{case_id}/documents/{doc_id}")
def get_document_details(case_id: int, doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id, Document.case_id == case_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    return {
        "id": doc.id,
        "filename": doc.filename,
        "tag": doc.tag,
        "status": doc.status,
        "date": doc.created_at,
        "summary": doc.summary,
        "entities": doc.entities
    }

@router.get("/{case_id}/documents/{doc_id}/download")
def download_document(case_id: int, doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id, Document.case_id == case_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    if not doc.s3_key or not os.path.exists(doc.s3_key):
        raise HTTPException(status_code=404, detail="File is missing on the server disk.")
        
    return FileResponse(
        path=doc.s3_key,
        filename=doc.filename,
        media_type="application/pdf" if doc.file_type and doc.file_type.lower() == "pdf" else "application/octet-stream"
    )
