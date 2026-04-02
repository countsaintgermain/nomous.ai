from app.core.database import SessionLocal
from app.models.case import Case, CaseEntity, CaseActivity, CaseHearing, CaseRelation
from app.models.document import Document

db = SessionLocal()
try:
    case = db.query(Case).filter(Case.signature == 'II K 716/25').first()
    if case:
        case_id = case.id
        print(f"Cleaning ALL data for case ID: {case_id} (Signature: {case.signature})")
        
        # Usuwanie powiązanych danych
        e_count = db.query(CaseEntity).filter(CaseEntity.case_id == case_id).delete()
        a_count = db.query(CaseActivity).filter(CaseActivity.case_id == case_id).delete()
        h_count = db.query(CaseHearing).filter(CaseHearing.case_id == case_id).delete()
        r_count = db.query(CaseRelation).filter(CaseRelation.case_id == case_id).delete()
        
        # Usuwanie dokumentów (Aktówki)
        d_count = db.query(Document).filter(Document.case_id == case_id).delete()
        
        # Czyszczenie pól PISP na samym obiekcie Case
        case.pisp_id = None
        case.appellation = None
        
        db.commit()
        print(f"Cleanup successful.")
        print(f"Deleted: {e_count} entities, {a_count} activities, {h_count} hearings, {r_count} relations, {d_count} documents.")
    else:
        print("Case 'II K 716/25' not found in database.")
finally:
    db.close()
