import asyncio
import logging
import json
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional

from app.core.llm import get_llm
from app.services.saos_ai_client import saos_ai_client
from app.models.case import Case
from app.models.document import Document
from app.models.embedding import Embedding

logger = logging.getLogger(__name__)

async def perform_autonomous_research(
    db: Session,
    case_id: int,
    user_goal: str,
    limit: int = 5
) -> Dict[str, Any]:
    """
    Wykonuje zaawansowany, merytoryczny research prawny.
    """
    logger.info(f"Nomous.ia: Rozpoczynam MERYTORYCZNY research dla case_id={case_id}")
    
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        return {"error": "Case not found"}

    # 1. Głębokie zbieranie kontekstu
    document_summaries = []
    positive_vectors = []
    
    # Bierzemy więcej fragmentów z bazy wektorowej
    embeddings = db.query(Embedding).filter(Embedding.case_id == case_id).limit(10).all()
    for e in embeddings:
        if e.embedding is not None:
            positive_vectors.append([float(x) for x in e.embedding])
    
    # Bierzemy pod uwagę wszystkie kluczowe dokumenty (szczególnie wyroki)
    for doc in case.documents:
        if doc.summary:
            document_summaries.append(f"Dokument: {doc.filename}\nTreść: {doc.summary}")

    full_context = "\n---\n".join(document_summaries)

    # 2. ANALIZA STRATEGICZNA (LLM wyznacza kierunki researchu)
    llm = get_llm(db, model_type="main", json_mode=True) # Używamy Pro do analizy celów!
    
    analysis_prompt = f"""Jesteś wybitnym adwokatem. Przeanalizuj akta sprawy i cel użytkownika.
CEL UŻYTKOWNIKA: "{user_goal}"
AKTA SPRAWY:
{full_context[:4000]}

ZADANIE:
Zidentyfikuj 3 merytoryczne problemy prawne (nie proceduralne!), które są kluczowe dla sukcesu w tej sprawie. 
Dla każdego problemu sformułuj precyzyjne zapytanie semantyczne do bazy orzeczeń SAOS.

ZAKAZY:
- Nie używaj słów: "apelacja", "wyrok", "skarżony", "wnosi", "pismo", "sąd".
- Nie szukaj regułek o tym jak składać apelację.
- SZUKAJ merytorycznych podstaw do uniewinnienia lub umorzenia (np. specyfika ADHD w kks, priorytet wynagrodzeń netto, brak uporczywości przy spłacie).

Zwróć odpowiedź w JSON:
{{
  "legal_problems": ["opis 1", "opis 2", "opis 3"],
  "queries": ["zapytanie semantyczne 1", "zapytanie semantyczne 2", "zapytanie semantyczne 3"]
}}
"""
    try:
        resp = await llm.ainvoke(analysis_prompt)
        analysis_data = json.loads(resp.content) if isinstance(resp.content, str) else resp.content
        prompts = analysis_data.get("queries", [user_goal])
        problems = analysis_data.get("legal_problems", [])
    except Exception as e:
        logger.error(f"Error in strategic analysis: {e}")
        prompts = [user_goal]
        problems = []

    # 3. WYSZUKIWANIE I FILTRACJA (RESEARCH AGENT LOOP)
    all_judgments = []
    seen_ids = set()
    
    # Wykorzystujemy szybki model do ewaluacji
    eval_llm = get_llm(db, model_type="analytical", json_mode=True)
    
    for q in prompts:
        try:
            res = await saos_ai_client.search_with_rocchio(
                query=q,
                positive_vectors=positive_vectors[:10],
                negative_vectors=[],
                limit=10
            )
            for j in res:
                sid = j.get("saos_id")
                if sid and sid not in seen_ids:
                    seen_ids.add(sid)
                    all_judgments.append(j)
        except Exception: pass

    if not all_judgments:
        return {"status": "empty", "message": "Nie znaleziono merytorycznych orzeczeń."}

    # 4. EWALUACJA I EKSTRAKCJA PEREŁEK (Snippets)
    async def evaluate_and_extract(j):
        try:
            summary = j.get("summary") or j.get("chunk_text") or ""
            eval_prompt = f"""Ekspertyza orzeczenia pod kątem problemów prawnych sprawy.
PROBLEMY DO ROZWIĄZANIA: {", ".join(problems)}
ORZECZENIE DO OCENY: {summary[:3000]}

ZADANIE:
1. Oceń przydatność (0-100) dla strategii obrony.
2. Wyciągnij 2-3 konkretne fragmenty (cytaty), które stanowią MERYTORYCZNY argument (np. uzasadnienie braku uporczywości). 
IGNORUJ fragmenty proceduralne typu "wniesiono apelację".

Zwróć JSON: {{"score": int, "reason": "uzasadnienie merytoryczne", "snippets": ["cytat 1", "cytat 2"]}}
"""
            resp = await eval_llm.ainvoke(eval_prompt)
            content = resp.content
            eval_data = json.loads(content) if isinstance(content, str) else content
            j["ai_score"] = eval_data.get("score", 0)
            j["ai_reason"] = eval_data.get("reason", "")
            j["ai_snippets"] = eval_data.get("snippets", [])
            return j
        except: return j

    evaluated = await asyncio.gather(*[evaluate_and_extract(j) for j in all_judgments[:15]])
    evaluated.sort(key=lambda x: x.get("ai_score", 0), reverse=True)
    
    # Zostawiamy tylko te, które faktycznie coś wnoszą
    top_results = [res for res in evaluated if res.get("ai_score", 0) > 60][:limit]
    
    return {
        "status": "success",
        "results": top_results,
        "problems_analyzed": problems,
        "summary": f"Przeprowadziłem merytoryczną analizę pod kątem: {', '.join(problems)}. Znalazłem {len(top_results)} wyroków z konkretną argumentacją."
    }
