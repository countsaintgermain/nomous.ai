import taskiq_fastapi
from taskiq import InMemoryBroker, AsyncBroker
from taskiq_redis import ListQueueBroker
from app.core.config import settings
import os

from app.core.worker import broker
from app.services.scraper_service import scrape_url
from app.services.document_parser import parse_and_vectorize
from app.core.database import SessionLocal
from app.models.document import Document
import asyncio
import os

from app.services.saos_ai_client import saos_ai_client
import redis
import json

# Połączenie do Redisa dla statusu zadań
redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
redis_client = redis.from_url(redis_url)

from taskiq import Context, TaskiqDepends

from app.core.llm import get_llm

@broker.task
async def auto_search_saos_task(
    case_id: int, 
    prompts: list, 
    positive_vectors: list,
    user_remarks: str = "",
    case_context: str = "",
    context: Context = TaskiqDepends()
):
    """Zadanie asynchronicznego wyszukiwania i ewaluacji przez Agenta AI."""
    task_id = context.message.task_id
    status_key = f"task_status:{task_id}"
    redis_client.set(status_key, json.dumps({"status": "PENDING", "progress": 0, "results": []}))
    
    all_judgments = []
    seen_ids = set()
    total_prompts = len(prompts)
    
    # 1. Wyszukiwanie hybrydowe (Rocchio + Prompty)
    for i, q in enumerate(prompts):
        progress = int((i / (total_prompts + 1)) * 100) # Rezerwujemy miejsce na ewaluację
        redis_client.set(status_key, json.dumps({
            "status": "SEARCHING", 
            "progress": progress, 
            "current_query": q,
            "results": all_judgments 
        }))
        
        res = []
        try:
            res = await saos_ai_client.search_with_rocchio(
                query=q,
                positive_vectors=positive_vectors,
                negative_vectors=[],
                limit=10,
                use_rerank=True 
            )
        except Exception:
            try:
                res = await saos_ai_client.search_with_rocchio(query=q, positive_vectors=[], negative_vectors=[], limit=10)
            except Exception: pass
                
        if res:
            for j in res:
                sid = j.get("saos_id")
                if sid and sid not in seen_ids:
                    seen_ids.add(sid)
                    all_judgments.append(j)

    # 2. Agentowa Ewaluacja (Research Agent)
    if all_judgments:
        redis_client.set(status_key, json.dumps({
            "status": "EVALUATING", 
            "progress": 90, 
            "current_query": "Agent AI analizuje trafność orzeczeń...",
            "results": all_judgments 
        }))
        
        # Bierzemy top 15 do ewaluacji (by nie spowalniać procesu)
        to_evaluate = all_judgments[:15]
        evaluated_results = []
        
        async def evaluate_judgment(j):
            try:
                db = SessionLocal()
                llm = get_llm(db, model_type="analytical", json_mode=True)
                db.close()
                
                summary = j.get("summary") or j.get("chunk_text") or "Brak treści do oceny."
                eval_prompt = f"""Jesteś ekspertem prawnym. Oceń przydatność poniższego orzeczenia do argumentacji w sprawie użytkownika.
                
KONTEKST SPRAWY:
{case_context[:2000]}

WYTYCZNE UŻYTKOWNIKA:
{user_remarks}

ORZECZENIE (Streszczenie/Fragment):
{summary[:3000]}

Zadanie: 
1. Oceń w skali 0-100 jak bardzo to orzeczenie wspiera linię obrony/argumentację zgodną z wytycznymi.
2. Wyciągnij DOKŁADNIE 2-3 najistotniejsze cytaty (fragmenty) z tekstu orzeczenia, które potwierdzają Twoją ocenę.

Zwróć WYŁĄCZNIE czysty JSON: {{"score": int, "reason": "jedno zdanie uzasadnienia", "snippets": ["cytat 1", "cytat 2"]}}
"""
                resp = await llm.ainvoke(eval_prompt)
                content = resp.content
                
                # Wyciąganie JSON
                json_str = ""
                if isinstance(content, str): json_str = content.strip()
                elif isinstance(content, list) and content:
                    item = content[0]
                    if isinstance(item, dict): json_str = item.get("text", "").strip()
                
                eval_data = json.loads(json_str)
                j["ai_score"] = eval_data.get("score", 0)
                j["ai_reason"] = eval_data.get("reason", "")
                j["ai_snippets"] = eval_data.get("snippets", [])
                return j
            except Exception as e:
                print(f"Evaluation error: {e}")
                j["ai_score"] = j.get("score", 0) * 10 # Fallback
                return j

        # Równoległa ewaluacja
        evaluated_results = await asyncio.gather(*[evaluate_judgment(j) for j in to_evaluate])
        
        # Sortowanie po ocenie AI
        evaluated_results.sort(key=lambda x: x.get("ai_score", 0), reverse=True)
        final_results = evaluated_results[:8] # Zostawiamy top 8 "perełek"
    else:
        final_results = []
    
    redis_client.set(status_key, json.dumps({
        "status": "SUCCESS", 
        "progress": 100, 
        "results": final_results
    }), ex=3600)

@broker.task
async def process_document_task(doc_id: int):
    """Asynchroniczne zadanie przetwarzania dokumentu."""
    db = SessionLocal()
    try:
        # Wywołujemy istniejącą logikę (którą później rozbudujemy o OCR)
        # Na razie adaptujemy to co mamy
        parse_and_vectorize(db, doc_id)
    finally:
        db.close()

@broker.task
async def process_url_task(url: str, case_id: int):
    """Asynchroniczne zadanie scrapowania URL i zapisu jako dokument."""
    db = SessionLocal()
    try:
        content = await scrape_url(url)
        # Tworzymy wirtualny dokument w bazie
        doc = Document(
            filename=url[:50], # Skrócona nazwa
            file_type="url",
            case_id=case_id,
            status="indexed",
            content_extracted=content,
            tag="Inne"
        )
        db.add(doc)
        db.commit()
    except Exception as e:
        print(f"Error processing URL {url}: {e}")
    finally:
        db.close()
