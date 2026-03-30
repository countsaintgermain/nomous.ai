import logging
from langchain_core.tools import tool
from app.services.saos_service import SaosService
from app.core.database import SessionLocal
from app.models.saos import SavedJudgment, JudgmentSource
from typing import Optional

logger = logging.getLogger(__name__)
saos_service = SaosService()

@tool
async def search_saos_judgments(
    keywords: Optional[str] = None,
    court_type: Optional[str] = None,
    judgment_date_from: Optional[str] = None,
    judgment_date_to: Optional[str] = None
):
    """
    Wyszukuje orzeczenia w systemie SAOS na podstawie słów kluczowych i filtrów.
    Zwraca listę dopasowanych orzeczeń (skrócone dane).
    
    Args:
        keywords: Słowa kluczowe do wyszukiwania w treści orzeczeń.
        court_type: Typ sądu (COMMON, SUPREME, ADMINISTRATIVE, CONSTITUTIONAL_TRIBUNAL, STATE_TRIBUNAL).
        judgment_date_from: Data orzeczenia od (format YYYY-MM-DD).
        judgment_date_to: Data orzeczenia do (format YYYY-MM-DD).
    """
    try:
        results = await saos_service.search_judgments(
            keywords=keywords,
            court_type=court_type,
            judgment_date_from=judgment_date_from,
            judgment_date_to=judgment_date_to,
            page_size=5
        )
        return results
    except Exception as e:
        logger.error(f"Error in search_saos_judgments tool: {str(e)}")
        return f"Błąd podczas wyszukiwania w SAOS: {str(e)}"

@tool
async def get_saos_judgment_details(judgment_id: int, case_id: int):
    """
    Pobiera pełną treść orzeczenia z SAOS na podstawie jego ID. 
    Użyj tego narzędzia, gdy chcesz przeanalizować konkretne orzeczenie znalezione wcześniej.
    Pobranie szczegółów automatycznie zapisuje orzeczenie w aktach sprawy jako 'Pobrane przez AI'.
    
    Args:
        judgment_id: Identyfikator orzeczenia w systemie SAOS.
        case_id: Identyfikator bieżącej sprawy w systemie Nomous.
    """
    try:
        details = await saos_service.get_judgment_details(judgment_id)
        
        # Automatyczny zapis do bazy danych
        db = SessionLocal()
        try:
            # Sprawdź czy już zapisano
            existing = db.query(SavedJudgment).filter(
                SavedJudgment.saos_id == judgment_id,
                SavedJudgment.case_id == case_id
            ).first()
            
            if not existing:
                # Wyciągamy dane z odpowiedzi SAOS
                data = details.get("data", {})
                db_judgment = SavedJudgment(
                    saos_id=judgment_id,
                    case_id=case_id,
                    signature=data.get("courtCases", [{}])[0].get("caseNumber") if data.get("courtCases") else None,
                    judgment_date=data.get("judgmentDate"),
                    court_name=data.get("division", {}).get("court", {}).get("name") if data.get("division") else data.get("courtType"),
                    court_type=data.get("courtType"),
                    division_name=data.get("division", {}).get("name") if data.get("division") else None,
                    judges=data.get("judges"),
                    content=data.get("textContent"),
                    summary=data.get("summary"),
                    source=JudgmentSource.AI
                )
                db.add(db_judgment)
                db.commit()
                logger.info(f"Automatically saved SAOS judgment {judgment_id} for case {case_id} (Source: AI)")
        except Exception as save_error:
            logger.error(f"Error saving judgment automatically: {str(save_error)}")
            db.rollback()
        finally:
            db.close()
            
        return details
    except Exception as e:
        logger.error(f"Error in get_saos_judgment_details tool: {str(e)}")
        return f"Błąd podczas pobierania szczegółów orzeczenia SAOS: {str(e)}"
