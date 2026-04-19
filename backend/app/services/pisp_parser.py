import os
import json
from typing import List, Dict, Any, TypedDict, Optional
from app.schemas.pisp import PispSyncData, PispActivity, PispHearing, PispDocument, PispEntity
from app.core.database import SessionLocal
from app.models.settings import AppSettings
from app.core.llm import get_llm
from langgraph.graph import StateGraph, END

# Definicja stanu dla LangGraph
class PispState(TypedDict):
    raw_texts: Dict[str, str]
    document_links: List[Dict]
    extracted_data: Optional[Dict[str, Any]]
    error: Optional[str]

def parse_pisp_data_with_ai(raw_texts: Dict[str, str], document_links: List[Dict]) -> PispSyncData:
    """
    Wykorzystuje LangGraph i LangChain do wieloetapowej (docelowo) analizy danych z PISP.
    """
    
    # 1. Definicja węzła parsującego
    def parse_node(state: PispState):
        full_text = "\n\n".join([f"Sekcja {k}:\n{v}" for k, v in state["raw_texts"].items()])
        
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
            with SessionLocal() as db:
                llm = get_llm(db, model_type="analytical", json_mode=True)
                print(f"Nomous.ia: LangGraph wywołuje LangChain (PISP)...")
                response = llm.invoke(prompt)
                
                content = response.content
                json_str = ""
                if isinstance(content, str):
                    json_str = content.strip()
                elif isinstance(content, list) and len(content) > 0:
                    item = content[0]
                    if isinstance(item, dict) and "text" in item:
                        json_str = item["text"].strip()

                if json_str:
                    data = json.loads(json_str)
                    return {"extracted_data": data}
                return {"error": "Błędny format odpowiedzi LLM"}
        except Exception as e:
            print(f"Nomous.ia LangGraph Node Error: {e}")
            return {"error": str(e)}

    # 2. Budowa Grafu
    workflow = StateGraph(PispState)
    workflow.add_node("parser", parse_node)
    workflow.set_entry_point("parser")
    workflow.add_edge("parser", END)
    
    # Kompilacja grafu
    app = workflow.compile()
    
    # 3. Wykonanie grafu
    initial_state = {
        "raw_texts": raw_texts,
        "document_links": document_links,
        "extracted_data": None,
        "error": None
    }
    
    final_output = app.invoke(initial_state)
    data = final_output.get("extracted_data")
    
    if not data or final_output.get("error"):
        print(f"Nomous.ia PISP Graph failed: {final_output.get('error')}")
        return PispSyncData(signature="Error")

    # 4. Mapowanie na obiekty Pydantic
    try:
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
        print(f"Nomous.ia Mapping Error after LangGraph: {e}")
        return PispSyncData(signature="Error")
