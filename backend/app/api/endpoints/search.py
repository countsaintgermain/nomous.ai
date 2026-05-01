from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import logging
import json
import os
import asyncio
from app.core.llm import get_llm

from app.core.database import get_db
from app.models.feedback import RelevanceFeedback
from app.models.case import Case
from app.schemas.feedback import RelevanceFeedbackCreate, RelevanceFeedbackOut
from app.services.saos_ai_client import saos_ai_client
from app.models.document import Document
from app.models.embedding import Embedding
from app.models.saos import SavedJudgment
from app.models.settings import AppSettings
from app.core.worker import broker

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/feedback", response_model=Optional[RelevanceFeedbackOut])
async def give_feedback(feedback_in: RelevanceFeedbackCreate, db: Session = Depends(get_db)):
    # 1. Sprawdź czy sprawa istnieje
    case = db.query(Case).filter(Case.id == feedback_in.case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    # 2. Usuń stare feedbacki dla tego obiektu w tej sprawie
    query = db.query(RelevanceFeedback).filter(RelevanceFeedback.case_id == feedback_in.case_id)
    if feedback_in.document_id:
        query = query.filter(RelevanceFeedback.document_id == feedback_in.document_id)
    elif feedback_in.saos_id:
        query = query.filter(RelevanceFeedback.saos_id == feedback_in.saos_id)
    else:
        raise HTTPException(status_code=400, detail="Either document_id or saos_id must be provided")
    
    query.delete()
    
    if feedback_in.vote == "none":
        db.commit()
        return None

    # 3. Dodaj nowy feedback
    is_positive = feedback_in.vote == "up"
    new_feedback = RelevanceFeedback(
        case_id=feedback_in.case_id,
        document_id=feedback_in.document_id,
        saos_id=feedback_in.saos_id,
        is_positive=is_positive
    )
    db.add(new_feedback)
    db.commit()
    db.refresh(new_feedback)

    # 4. Trigger wyciągania wektora jeśli go nie ma (Worker)
    if feedback_in.document_id:
        # Sprawdź czy dokument ma już wektory
        emb = db.query(Embedding).filter(
            Embedding.entity_type == 'document',
            Embedding.entity_id == feedback_in.document_id
        ).first()
        if not emb:
            from app.services.tasks import process_document_embedding_task
            await process_document_embedding_task.kiq(feedback_in.document_id)
    
    if feedback_in.saos_id:
        # Sprawdź czy mamy to orzeczenie z embeddingiem
        judgment = db.query(SavedJudgment).filter(
            SavedJudgment.saos_id == feedback_in.saos_id,
            SavedJudgment.case_id == feedback_in.case_id
        ).first()
        if not judgment or judgment.embedding is None:
            from app.services.tasks import process_judgment_embedding_task
            # Przekazujemy saos_id i case_id
            await process_judgment_embedding_task.kiq(feedback_in.saos_id, feedback_in.case_id)

    return new_feedback

@router.post("/semantic")
async def semantic_search(
    case_id: int, 
    query: str, 
    top_k: int = 20, 
    use_rocchio: bool = True, 
    use_summaries: bool = True, 
    generate_queries: bool = True, 
    use_agent: bool = False,
    use_pro: bool = False,
    db: Session = Depends(get_db)
):
    logger.info(f"Nomous.ia: START semantic_search (rocchio={use_rocchio}, agent={use_agent}, pro={use_pro}) dla query='{query}'")
    
    # 0. Wybór modelu (Analytical vs Pro)
    model_type = "main" if use_pro else "analytical"
    # 1. Pobierz sprawę i dokumenty
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    # Pobieramy wszystkie dokumenty sprawy które są przetworzone
    all_docs = db.query(Document).filter(Document.case_id == case_id, Document.status == "ready").all()
    logger.info(f"Nomous.ia: Znaleziono {len(all_docs)} gotowych dokumentów.")
    
    positive_vectors = []
    negative_vectors = []
    extracted_regulations = set()
    document_contexts = []

    # 2. Zbieranie kontekstu z dokumentów (Wektory + Przepisy + Podsumowania)
    for doc in all_docs:
        if use_rocchio and doc.embedding is not None:
            positive_vectors.append([float(x) for x in doc.embedding])
        
        if use_summaries:
            if doc.entities:
                try:
                    entities = doc.entities if isinstance(doc.entities, dict) else json.loads(doc.entities)
                    for key in ['przepisy', 'legal_acts', 'articles', 'relevant_provisions']:
                        vals = entities.get(key, [])
                        if isinstance(vals, list):
                            for v in vals: extracted_regulations.add(str(v))
                        elif isinstance(vals, str):
                            extracted_regulations.add(vals)
                except: pass
            
            if doc.summary:
                document_contexts.append(doc.summary[:500])

    # 3. Dodaj manualny feedback (łapki)
    feedback_items = db.query(RelevanceFeedback).filter(RelevanceFeedback.case_id == case_id).all()
    logger.info(f"Nomous.ia: Pobrano {len(feedback_items)} elementów feedbacku.")
    for fb in feedback_items:
        vector = None
        if fb.document_id:
            doc = db.query(Document).filter(Document.id == fb.document_id).first()
            if doc and doc.embedding is not None: vector = doc.embedding
        elif fb.saos_id:
            judgment = db.query(SavedJudgment).filter(SavedJudgment.saos_id == fb.saos_id, SavedJudgment.case_id == case_id).first()
            if judgment and judgment.embedding is not None: vector = judgment.embedding
        
        if vector:
            v_list = [float(x) for x in vector]
            if fb.is_positive:
                positive_vectors.append(v_list)
            else:
                negative_vectors.append(v_list)

    # 4. Generowanie 5 promptów przez Gemini
    generated_prompts = []
    if generate_queries:
        logger.info("Nomous.ia: Wywołuję LangChain Gemini dla wzmocnienia zapytania...")
        max_retries = 3
        
        for attempt in range(max_retries):
            try:
                llm = get_llm(db, model_type=model_type, json_mode=True)
                
                prompt_instr = f"""Jesteś ekspertem prawnym. Na podstawie zapytania użytkownika oraz kontekstu sprawy, wygeneruj 5 zróżnicowanych, technicznych zapytań (promptów) do wyszukiwarki orzeczeń.
                
Zapytanie użytkownika: "{query}"
Przepisy ze sprawy: {", ".join(list(extracted_regulations)[:20])}
Kontekst dokumentów: {" | ".join(document_contexts[:3])}

Zwróć odpowiedź w formacie JSON jako tablicę 5 stringów. Każdy string powinien być gęstym, prawniczym opisem zagadnienia (semantic search friendly).
"""
                response = llm.invoke(prompt_instr)
                content = response.content
                
                # Obsługa różnych formatów contentu z LangChain
                json_str = ""
                if isinstance(content, str):
                    json_str = content.strip()
                elif isinstance(content, list) and len(content) > 0:
                    # Nowsze SDK Google czasem zwraca listę słowników
                    item = content[0]
                    if isinstance(item, dict) and "text" in item:
                        json_str = item["text"].strip()
                
                if json_str:
                    try:
                        generated_prompts = json.loads(json_str)
                        if isinstance(generated_prompts, list):
                            logger.info(f"Nomous.ia: LangChain wygenerował {len(generated_prompts)} promptów.")
                            break
                    except json.JSONDecodeError:
                        logger.error(f"Nomous.ia: Błąd parsowania JSON z LLM. Raw json_str: {json_str[:200]}")
                
                logger.warning(f"Nomous.ia: Gemini zwróciło nieoczekiwany format. Raw content type: {type(content)}")
            except Exception as e:
                logger.warning(f"Nomous.ia: Błąd LangChain (próba {attempt+1}/{max_retries}): {e}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(5)
                else:
                    logger.error("Nomous.ia: LangChain poddał się.")
                    break

    # 5. Budowa MEGA-ZAPYTANIA
    mega_query_parts = [f"ZAPYTANIE BAZOWE: {query}"]
    if extracted_regulations:
        mega_query_parts.append(f"PRZEPISY I PODSTAWY: {', '.join(list(extracted_regulations)[:15])}")
    if generated_prompts:
        mega_query_parts.append(f"KONTEKST SEMANTYCZNY: {' | '.join(generated_prompts)}")
    else:
        logger.info("Nomous.ia: Kontynuuję wyszukiwanie bez dodatkowych promptów (Gemini unavailable).")
    
    mega_query = "\n\n".join(mega_query_parts)
    logger.info(f"Nomous.ia: Mega-query zbudowane. Długość: {len(mega_query)}")
    
    # 6. Wykonaj wyszukiwanie z Rocchio
    logger.info(f"Nomous.ia: Wysyłam zapytanie do SAOS-AI (Rocchio: {len(positive_vectors)} pos, {len(negative_vectors)} neg)")
    try:
        results = await saos_ai_client.search_with_rocchio(
            query=mega_query,
            positive_vectors=positive_vectors[:15],
            negative_vectors=negative_vectors[:5],
            limit=top_k
        )
        logger.info(f"Nomous.ia: Otrzymano {len(results)} wyników z SAOS-AI.")

        # 7. RESEARCH AGENT (Ewaluacja + Autonomiczna Ekspansja)
        if use_agent and results:
            logger.info(f"Nomous.ia: Research Agent (model={model_type}) ocenia {len(results)} wyników...")
            case_context_str = " | ".join(document_contexts[:5])
            
            async def evaluate_one(j, is_expansion=False):
                try:
                    # Używamy wybranego modelu (Pro lub Analytical)
                    llm = get_llm(db, model_type=model_type, json_mode=True)
                    text_to_eval = j.get("summary") or j.get("chunk_text") or ""
                    eval_prompt = f"""Jesteś ekspertem prawnym. Oceń przydatność orzeczenia do sprawy.
                    KONTEKST SPRAWY: {case_context_str[:1500]}
                    ZAPYTANIE UŻYTKOWNIKA: {query}
                    ORZECZENIE: {text_to_eval[:2500]}

                    Oceń w skali 0-100. Wyciągnij też 2-3 najciekawsze cytaty pasujące do sprawy.
                    Zwróć WYŁĄCZNIE JSON: {{"score": int, "reason": "jedno zdanie", "snippets": ["fragment 1", "fragment 2"]}}
                    """
                    resp = await llm.ainvoke(eval_prompt)
                    # Parsowanie (obsługa formatów)
                    content = resp.content
                    json_str = ""
                    if isinstance(content, str): json_str = content.strip()
                    elif isinstance(content, list) and content:
                        item = content[0]
                        if isinstance(item, dict): json_str = item.get("text", "").strip()

                    eval_data = json.loads(json_str)
                    j["ai_score"] = eval_data.get("score", 0)
                    j["ai_reason"] = eval_data.get("reason", "")
                    j["ai_snippets"] = eval_data.get("snippets", [])

                    
                    # Logika ekspansji: jeśli wyrok jest genialny, szukamy podobnych (tylko w pierwszej turze)
                    if not is_expansion and j["ai_score"] > 85:
                        logger.info(f"Nomous.ia: Agent znalazł kluczowy wyrok ({j.get('saos_id')}). Szukam podobnych...")
                        # Generujemy hyper-query na podstawie tego wyroku
                        hyper_prompt = f"Na podstawie tego wyroku wygeneruj 1 ultra-precyzyjne zapytanie semantyczne do bazy orzeczeń, aby znaleźć identyczne stany faktyczne: {j['ai_reason']}. Wyrok: {text_to_eval[:500]}"
                        hyper_resp = await llm.ainvoke(hyper_prompt)
                        # To zapytanie wrzucimy do dodatkowego wyszukiwania niżej
                        return j, hyper_resp.content
                except Exception as e:
                    logger.warning(f"Agent evaluation error: {e}")
                    j["ai_score"] = 0
                return j, None

            # Faza 1: Pierwsza ocena i zbieranie pomysłów na ekspansję
            eval_results = await asyncio.gather(*[evaluate_one(j) for j in results])
            
            final_results = []
            expansion_queries = []
            for r, h_q in eval_results:
                final_results.append(r)
                if h_q: expansion_queries.append(h_q)
            
            # Faza 2: Autonomiczna Ekspansja (szukanie rodzeństwa najlepszych wyroków)
            if expansion_queries:
                logger.info(f"Nomous.ia: Agent wykonuje {len(expansion_queries)} dodatkowych skoków do SAOS...")
                extra_judgments = []
                seen_ids = {j.get("saos_id") for j in final_results}
                
                for eq in expansion_queries[:3]: # Limitujemy skoki do 3 najlepszych
                    try:
                        ex_res = await saos_ai_client.search(query=eq, limit=5)
                        for ej in ex_res:
                            if ej.get("saos_id") not in seen_ids:
                                ej["ai_reason"] = "Znalezione przez Agenta jako podobne do kluczowego wyroku."
                                extra_judgments.append(ej)
                                seen_ids.add(ej.get("saos_id"))
                    except: pass
                
                if extra_judgments:
                    # Ewaluacja nowo znalezionych wyroków
                    logger.info(f"Nomous.ia: Ewaluacja {len(extra_judgments)} wyroków z ekspansji...")
                    ex_eval_results = await asyncio.gather(*[evaluate_one(ej, is_expansion=True) for ej in extra_judgments])
                    for r, _ in ex_eval_results:
                        final_results.append(r)

            # Ostateczne sortowanie
            results = sorted(final_results, key=lambda x: x.get("ai_score", 0), reverse=True)

        return results
    except Exception as e:
        logger.error(f"Nomous.ia: Błąd SAOS-AI: {e}")
        raise HTTPException(status_code=500, detail=f"Błąd silnika wyszukiwania: {str(e)}")
