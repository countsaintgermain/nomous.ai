import os
import shutil
import logging
from app.core.database import SessionLocal
from app.models.case import Case, CaseEntity, CaseActivity, CaseHearing, CaseRelation
from app.models.document import Document, DocumentChunk

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def cleanup():
    db = SessionLocal()
    try:
        # 1. Usuwamy wszystkie DocumentChunk (ze względu na klucze obce)
        chunks_count = db.query(DocumentChunk).delete()
        logger.info(f"Deleted {chunks_count} document chunks.")

        # 2. Usuwamy wszystkie dokumenty PISP (te z tagiem PISP lub pisp_id)
        # d_count = db.query(Document).filter((Document.tag == "PISP") | (Document.pisp_id.isnot(None))).delete()
        # Dla pewności usuwamy wszystko co nie jest manualnie wgrane, jeśli taką mamy logikę, 
        # ale bezpieczniej po prostu wszystko co powiązane z PISP.
        docs = db.query(Document).all()
        doc_count = 0
        for doc in docs:
            db.delete(doc)
            doc_count += 1
        logger.info(f"Deleted {doc_count} documents.")

        # 3. Usuwamy powiązane dane spraw
        e_count = db.query(CaseEntity).delete()
        a_count = db.query(CaseActivity).delete()
        h_count = db.query(CaseHearing).delete()
        r_count = db.query(CaseRelation).delete()
        logger.info(f"Deleted: {e_count} entities, {a_count} activities, {h_count} hearings, {r_count} relations.")

        # 4. Resetujemy pola PISP w sprawach
        cases = db.query(Case).all()
        for case in cases:
            case.pisp_id = None
            case.court = None
            case.department = None
            case.status = "new"
            case.receipt_date = None
            case.conclusion_date = None
            case.publication_date = None
            case.case_subject = None
            case.referent = None
            case.claim_value = None
            case.resolution = None
            case.main_entities = None
        
        db.commit()
        logger.info(f"Reset {len(cases)} cases.")

        # 5. Usuwamy pliki fizyczne
        uploads_dir = "/app/uploads"
        if os.path.exists(uploads_dir):
            for item in os.listdir(uploads_dir):
                item_path = os.path.join(uploads_dir, item)
                try:
                    if os.path.isdir(item_path):
                        shutil.rmtree(item_path)
                        logger.info(f"Removed directory: {item_path}")
                    else:
                        os.remove(item_path)
                        logger.info(f"Removed file: {item_path}")
                except Exception as e:
                    logger.error(f"Failed to remove {item_path}: {e}")
        
        # Odtwórz strukturę jeśli potrzebna (choć rmtree usunie wszystko)
        os.makedirs(uploads_dir, exist_ok=True)

        logger.info("FULL PISP CLEANUP SUCCESSFUL.")

    except Exception as e:
        db.rollback()
        logger.error(f"Cleanup failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    cleanup()
