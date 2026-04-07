import os
import json
from google import genai
from typing import List, Dict, Any
from app.schemas.pisp import PispSyncData, PispActivity, PispHearing, PispDocument, PispEntity
from app.core.database import SessionLocal
from app.models.settings import AppSettings

def parse_pisp_data_with_ai(raw_texts: Dict[str, str], document_links: List[Dict]) -> PispSyncData:
    """
    Wykorzystuje najnowsze SDK google-genai do analizy danych strukturalnych.
    """
    # Pobranie modelu z ustawień
    with SessionLocal() as db:
        app_settings = db.query(AppSettings).first()
        analytical_model = app_settings.analytical_model if app_settings else "gemini-3.1-flash-lite-preview"
        api_key = app_settings.api_key if app_settings and app_settings.api_key else os.getenv("GOOGLE_API_KEY")
        use_vertex = app_settings.use_vertex if app_settings else True

    print(f"Nomous.ia: Inicjalizacja Gemini Client (PISP). Model: {analytical_model}, Vertex: {use_vertex}")
    client = genai.Client(api_key=api_key, vertexai=use_vertex)
    
    full_text = "\n\n".join([f"Sekcja {k}:\n{v}" for k, v in raw_texts.items()])
    
    prompt = f"""
    Jesteś asystentem prawnym. Przeanalizuj poniższy tekst z Portalu Informacyjnego Sądu (PISP) i wyodrębnij dane strukturalne.
    Zwróć WYŁĄCZNIE czysty JSON zgodny z poniższym schematem.

    TEKST:
    {full_text[:40000]}

    SCHEMAT JSON:
    {{
        "signature": "sygnatura sprawy",
        "court": "nazwa sądu",
        "department": "wydział",
        "status": "status sprawy",
        "receiptDate": "data wpływu",
        "conclusionDate": "data zakończenia",
        "publicationDate": "data publikacji",
        "caseSubject": "przedmiot sprawy",
        "referent": "referent/sędzia",
        "claimValue": "wartość sporu",
        "resolution": "rozstrzygnięcie",
        "mainEntities": "główne podmioty",
        "entities": [{{ "role": "rola", "name": "nazwa", "status": "status" }}],
        "activities": [{{ "date": "data", "activity": "opis", "submitted_by": "kto", "signature": "sygnatura" }}],
        "hearings": [{{ "date": "data", "room": "sala", "judge": "sędzia", "result": "wynik" }}]
    }}
    """

    try:
        print(f"Nomous.ia: WYWOŁANIE MODELU (PISP): {analytical_model}...")
        response = client.models.generate_content(
            model=analytical_model,
            contents=prompt
        )
        print(f"Nomous.ia: ODPOWIEDŹ OTRZYMANA z modelu (PISP) {analytical_model}")
        
        # Nowy SDK zwraca tekst w response.text
        json_str = response.text.replace('```json', '').replace('```', '').strip()
        data = json.loads(json_str)
        
        # Mapowanie na obiekty Pydantic
        activities = [PispActivity(**a) for a in data.get('activities', [])]
        hearings = [PispHearing(**h) for h in data.get('hearings', [])]
        entities = [PispEntity(**e) for e in data.get('entities', [])]
        documents = [PispDocument(**d) for d in document_links]

        return PispSyncData(
            signature=data.get('signature', 'Error'),
            court=data.get('court'),
            department=data.get('department'),
            status=data.get('status'),
            receiptDate=data.get('receiptDate'),
            conclusionDate=data.get('conclusionDate'),
            publicationDate=data.get('publicationDate'),
            caseSubject=data.get('caseSubject'),
            referent=data.get('referent'),
            claimValue=data.get('claimValue'),
            resolution=data.get('resolution'),
            main_entities=data.get('mainEntities'),
            entities=entities,
            activities=activities,
            hearings=hearings,
            documents=documents
        )
    except Exception as e:
        print(f"Nomous.ia New SDK Parse Error: {e}")
        return PispSyncData(signature="Error")
