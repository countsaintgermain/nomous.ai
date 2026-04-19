from langchain_google_genai import ChatGoogleGenerativeAI
from app.models.settings import AppSettings
from sqlalchemy.orm import Session
import os
import logging

logger = logging.getLogger(__name__)

def get_llm(db: Session, model_type: str = "analytical", json_mode: bool = False):
    """
    Fabryka zwracająca skonfigurowaną instancję ChatGoogleGenerativeAI.
    model_type: "analytical" (domyślny dla zadań ekstrakcji) lub "main" (dla czatu)
    """
    settings = db.query(AppSettings).first()
    
    # Priorytet: Baza danych -> Środowisko
    api_key = settings.api_key if settings and settings.api_key else os.getenv("GOOGLE_API_KEY")
    
    if model_type == "analytical":
        model_name = settings.analytical_model if settings else "gemini-1.5-flash"
    else:
        model_name = settings.main_model if settings else "gemini-1.5-pro"
        
    logger.info(f"Inicjalizacja LangChain LLM: {model_name} (json={json_mode})")
    
    kwargs = {
        "model": model_name,
        "google_api_key": api_key,
        "temperature": 0.4,
    }
    
    if json_mode:
        # W nowszych wersjach przekazujemy to bezpośrednio do konstruktora, 
        # jeśli klasa to wspiera, lub przez model_kwargs bez wywoływania ostrzeżeń
        kwargs["model_kwargs"] = {"response_mime_type": "application/json"}
        
    return ChatGoogleGenerativeAI(**kwargs)
