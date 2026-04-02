from fastapi import APIRouter, HTTPException, Depends, Response
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.document import Document
from app.services.pisp_connector import PispConnector
import os
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/status")
async def pisp_status():
    connector = await PispConnector.get_instance()
    return {"connected": await connector.is_logged_in()}

import shutil
from app.models.case import Case

@router.get("/document/{pisp_id}/preview")
async def pisp_preview_document(pisp_id: int, db: Session = Depends(get_db)):
    """
    Serwuje podgląd dokumentu PISP z lokalnym keszowaniem.
    """
    doc = db.query(Document).filter(Document.pisp_id == pisp_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Dokument nie został znaleziony w bazie danych")
    
    case = db.query(Case).filter(Case.id == doc.case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Sprawa nie została znaleziona")

    # Ścieżka do kesza PISP
    UPLOAD_DIR = "/app/uploads"
    cache_dir = os.path.join(UPLOAD_DIR, str(case.id), "documents", "pisp")
    os.makedirs(cache_dir, exist_ok=True)
    
    cache_path = os.path.join(cache_dir, f"{pisp_id}.pdf")

    # Jeśli pliku nie ma w keszu, pobieramy go z PISP
    if not os.path.exists(cache_path):
        from app.core.config import settings
        connector = await PispConnector.get_instance()
        if not await connector.is_logged_in():
            if not settings.PISP_USERNAME or not settings.PISP_PASSWD:
                raise HTTPException(status_code=500, detail="Brak skonfigurowanych danych logowania PISP")
            success = await connector.login(settings.PISP_USERNAME, settings.PISP_PASSWD)
            if not success:
                raise HTTPException(status_code=500, detail="Błąd logowania do PISP")

        appellation = case.appellation
        if not appellation:
            raise HTTPException(status_code=400, detail="Brak określonej apelacji dla sprawy")
            
        if not case.signature:
            raise HTTPException(status_code=400, detail="Brak określonej sygnatury dla sprawy")

        download_url = f"{connector._get_base_url()}doc/documents/web/{pisp_id}/download/pdf"
        logger.info(f"Downloading PISP PDF to cache: {download_url}")
        content = await connector.fetch_binary(download_url, lawsuit_id=case.pisp_id, appellation=appellation)

        
        if not content:
            raise HTTPException(status_code=500, detail="Nie udało się pobrać pliku z PISP")
            
        with open(cache_path, "wb") as f:
            f.write(content)

    return FileResponse(cache_path, media_type="application/pdf")

@router.post("/document/{doc_id}/import")
async def pisp_import_document(doc_id: int, db: Session = Depends(get_db)):
    """
    Importuje dokument z PISP do aktówki (PDF + Source).
    """
    try:
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if not doc:
            raise HTTPException(status_code=404, detail="Dokument nie znaleziony")
        
        if not doc.pisp_id:
            raise HTTPException(status_code=400, detail="Dokument nie posiada pisp_id")

        case = db.query(Case).filter(Case.id == doc.case_id).first()
        if not case:
            raise HTTPException(status_code=404, detail="Sprawa nie znaleziona")

        from app.core.config import settings
        connector = await PispConnector.get_instance()
        if not await connector.is_logged_in():
            if not settings.PISP_USERNAME or not settings.PISP_PASSWD:
                raise HTTPException(status_code=500, detail="Brak skonfigurowanych danych logowania PISP")
            await connector.login(settings.PISP_USERNAME, settings.PISP_PASSWD)

        appellation = case.appellation
        if not appellation:
            raise HTTPException(status_code=400, detail="Brak określonej apelacji dla sprawy")
            
        if not case.signature:
            raise HTTPException(status_code=400, detail="Brak określonej sygnatury dla sprawy")

        UPLOAD_DIR = "/app/uploads"
        cache_dir = os.path.join(UPLOAD_DIR, str(case.id), "documents", "pisp")
        briefcase_dir = os.path.join(UPLOAD_DIR, str(case.id), "documents")
        os.makedirs(cache_dir, exist_ok=True)
        os.makedirs(briefcase_dir, exist_ok=True)

        pisp_id = doc.pisp_id
        pdf_cache_path = os.path.join(cache_dir, f"{pisp_id}.pdf")
        source_cache_path = os.path.join(cache_dir, f"{pisp_id}_source")

        # 1. Pobierz PDF do kesza (jeśli nie ma)
        if not os.path.exists(pdf_cache_path):
            download_url = f"{connector._get_base_url()}doc/documents/web/{pisp_id}/download/pdf"
            content = await connector.fetch_binary(download_url, lawsuit_id=case.pisp_id, appellation=appellation)

            if content:
                with open(pdf_cache_path, "wb") as f: f.write(content)
            else:
                raise HTTPException(status_code=500, detail="Nie udało się pobrać PDF z PISP")

        # 2. Pobierz Source do kesza (jeśli nie ma)
        if not os.path.exists(source_cache_path):
            source_url = f"{connector._get_base_url()}doc/documents/web/{pisp_id}/download"
            content = await connector.fetch_binary(source_url, lawsuit_id=case.pisp_id, appellation=appellation)
            if content:

                with open(source_cache_path, "wb") as f: f.write(content)

        # 3. Skopiuj do aktówki z ładnymi nazwami
        safe_filename = doc.filename or f"dokument_{pisp_id}.pdf"
        if not safe_filename.lower().endswith(".pdf"): safe_filename += ".pdf"
        
        pdf_briefcase_path = os.path.join(briefcase_dir, f"{doc.id}_pdf_{safe_filename}")
        shutil.copy2(pdf_cache_path, pdf_briefcase_path)
        doc.s3_key_pdf = pdf_briefcase_path
        doc.s3_key = pdf_briefcase_path

        if os.path.exists(source_cache_path):
            source_filename = safe_filename.replace(".pdf", ".source")
            source_briefcase_path = os.path.join(briefcase_dir, f"{doc.id}_source_{source_filename}")
            shutil.copy2(source_cache_path, source_briefcase_path)
            doc.s3_key_source = source_briefcase_path

        doc.status = "processing"
        db.commit()

        # Trigger OCR
        try:
            from app.services.tasks import process_document_ocr_task
            await process_document_ocr_task.kiq(doc.id)
        except Exception as e:
            logger.warning(f"OCR Task trigger failed: {e}")
            doc.status = "uploaded"
            db.commit()

        return {"status": "ok", "message": "Dokument zaimportowany do aktówki"}
    except Exception as e:
        logger.error(f"Import error: {e}")
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/activate-context/{case_id}")
async def pisp_activate_context(case_id: int, db: Session = Depends(get_db)):
    """
    Uruchamia sesję PISP i ustawia kontekst (apelację) dla danej sprawy.
    """
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        return {"status": "skipped", "message": "Case not found"}
        
    if not case.signature or not case.appellation:
        return {"status": "skipped", "message": "Case missing signature or appellation, cannot use PISP features"}

    from app.core.config import settings
    connector = await PispConnector.get_instance()
    
    # Zapewnij logowanie
    if not await connector.is_logged_in():
        if not settings.PISP_USERNAME or not settings.PISP_PASSWD:
            raise HTTPException(status_code=500, detail="PISP credentials not configured")
        await connector.login(settings.PISP_USERNAME, settings.PISP_PASSWD)
    
    # Ustaw apelację
    appellation = case.appellation
    if not appellation:
        return {"status": "error", "message": "Case has no appellation"}
    success = await connector.ensure_appellation(appellation)
    
    return {"status": "ok" if success else "error", "appellation": appellation}

from app.schemas.pisp import PispAiSyncRequest, PispSyncData, PispDocument, PispEntity, PispActivity, PispHearing, PispRelation
from app.api.endpoints.cases import sync_pisp_data as internal_sync_pisp_data

@router.post("/sync/{case_id}")
async def pisp_sync_case(case_id: int, db: Session = Depends(get_db)):
    """
    Synchronizacja backendowa danych sprawy z PISP.
    Pobiera listę dokumentów, podmiotów, czynności, posiedzeń i powiązań.
    """
    try:
        case = db.query(Case).filter(Case.id == case_id).first()
        if not case:
            raise HTTPException(status_code=400, detail="Case not found")

        from app.core.config import settings
        connector = await PispConnector.get_instance()
        if not await connector.is_logged_in():
            await connector.login(settings.PISP_USERNAME, settings.PISP_PASSWD)

        appellation = case.appellation
        if not appellation:
            raise HTTPException(status_code=400, detail="Brak określonej apelacji dla sprawy")
            
        if not case.signature:
            raise HTTPException(status_code=400, detail="Brak określonej sygnatury dla sprawy")

        # Jeśli sprawa nie ma pisp_id, spróbuj znaleźć ją na liście spraw w PISP
        if not case.pisp_id:
            logger.info(f"Attempting to auto-link case {case.id} using signature {case.signature} and appellation {appellation}")
            pisp_cases = await connector.fetch_cases(appellation)
            matched_pisp_case = next((c for c in pisp_cases if c["signature"].strip() == case.signature.strip()), None)
            if matched_pisp_case and matched_pisp_case.get("pisp_id"):
                case.pisp_id = matched_pisp_case["pisp_id"]
                db.commit()
                logger.info(f"Successfully auto-linked case {case.id} to PISP ID: {case.pisp_id}")
            else:
                raise HTTPException(status_code=400, detail="Case not linked to PISP and could not be found automatically")

        
        # 1. Pobierz dane z PISP API
        raw_docs = await connector.fetch_documents(case.pisp_id, appellation)
        raw_parties = await connector.fetch_parties(case.pisp_id, appellation)
        raw_activities = await connector.fetch_activities(case.pisp_id, appellation)
        raw_hearings = await connector.fetch_hearings(case.pisp_id, appellation)
        raw_relations = await connector.fetch_relations(case.pisp_id, appellation)

        # Mapowanie na schemat PispSyncData z zapewnieniem ID dla nowości
        sync_docs = []
        for i, d in enumerate(raw_docs):
            doc_id = d.get("id") or (1000000 + i)
            # Tworzymy kopię słownika, aby nie modyfikować oryginału i usuwamy 'id' jeśli tam jest
            # aby uniknąć "multiple values for keyword argument 'id'"
            doc_kwargs = d.copy()
            if "id" in doc_kwargs: del doc_kwargs["id"]
            
            sync_docs.append(PispDocument(
                **doc_kwargs, 
                id=doc_id, 
                downloadLink=f"{connector._get_base_url()}doc/documents/web/{doc_id}/download/pdf"
            ))
            
        sync_entities = []
        for i, p in enumerate(raw_parties):
            ent_id = p.get("id") or (2000000 + i)
            ent_kwargs = p.copy()
            if "id" in ent_kwargs: del ent_kwargs["id"]
            sync_entities.append(PispEntity(**ent_kwargs, id=ent_id))
            
        sync_activities = []
        for i, a in enumerate(raw_activities):
            act_id = a.get("id") or (3000000 + i)
            act_kwargs = a.copy()
            if "id" in act_kwargs: del act_kwargs["id"]
            sync_activities.append(PispActivity(**act_kwargs, id=act_id))
            
        sync_hearings = []
        for i, h in enumerate(raw_hearings):
            hr_id = h.get("id") or (4000000 + i)
            hr_kwargs = h.copy()
            if "id" in hr_kwargs: del hr_kwargs["id"]
            sync_hearings.append(PispHearing(**hr_kwargs, id=hr_id))
            
        sync_relations = []
        for i, r in enumerate(raw_relations):
            rel_id = r.get("id") or (5000000 + i)
            rel_kwargs = r.copy()
            if "id" in rel_kwargs: del rel_kwargs["id"]
            sync_relations.append(PispRelation(**rel_kwargs, id=rel_id))

        structured_data = PispSyncData(
            signature=case.signature or "Sygnatura",
            entities=sync_entities,
            documents=sync_docs,
            activities=sync_activities,
            hearings=sync_hearings,
            relations=sync_relations
        )

        # Wywołujemy logikę zapisu (internal sync)
        request_obj = PispAiSyncRequest(
            signature=case.signature or "Sygnatura",
            raw_texts={},
            document_links=sync_docs,
            structured_data=structured_data
        )
        
        updated_case = internal_sync_pisp_data(case_id, request_obj, db)
        return {"status": "ok", "message": "Zsynchronizowano dane z PISP (dokumenty, podmioty, czynności, posiedzenia, powiązania)"}

    except Exception as e:
        logger.error(f"Backend sync error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
