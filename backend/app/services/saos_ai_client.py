import httpx
import logging
from typing import List, Optional, Dict, Any
from app.core.config import settings

logger = logging.getLogger(__name__)

def map_judgment_type(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Normalizuje wyniki z SAOS-AI, zapewniając obecność pola 'signatures'.
    W v5.1 pole to powinno być już obecne jako lista stringów.
    """
    for item in items:
        if "signatures" not in item or not item["signatures"]:
            court_cases = item.get("courtCases", [])
            if court_cases:
                item["signatures"] = [c.get("caseNumber") for c in court_cases if c.get("caseNumber")]
    return items

class SaosAiClient:
    def __init__(self):
        self.base_url = settings.SAOS_AI_URL.rstrip('/')
        self.api_key = settings.SAOS_AI_API_KEY
        self.timeout = 180.0  # 3 minuty dla cięższych operacji (Rerank/Rocchio)

    def _get_headers(self) -> Dict[str, str]:
        return {
            "X-API-Key": self.api_key,
            "Content-Type": "application/json"
        }

    async def encode_text(self, text: str) -> Optional[List[float]]:
        """
        Endpoint: POST /v1/encode/text
        Zwraca główny wektor dokumentu.
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                payload = {"text": text}
                response = await client.post(
                    f"{self.base_url}/encode/text",
                    headers=self._get_headers(),
                    json=payload
                )
                response.raise_for_status()
                data = response.json()
                return data.get("document_vector") or data.get("vector")
        except Exception as e:
            logger.error(f"Error encoding text with saos-ai: {e}")
            return None

    async def encode_document_full(self, text: str) -> Optional[Dict[str, Any]]:
        """
        Endpoint: POST /v1/encode/text
        Zwraca pełną odpowiedź: status, document_vector, chunks, chunk_count.
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                payload = {"text": text}
                response = await client.post(
                    f"{self.base_url}/encode/text",
                    headers=self._get_headers(),
                    json=payload
                )
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"Error encoding document full with saos-ai: {e}")
            return None

    async def search(
        self,
        query: str,
        limit: int = 10,
        use_rerank: bool = True,
        rocchio: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Endpoint: POST /v1/search (Hybrid Search)
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                payload = {
                    "query": query,
                    "limit": limit,
                    "use_rerank": use_rerank
                }
                if rocchio:
                    payload["rocchio"] = rocchio

                response = await client.post(
                    f"{self.base_url}/search",
                    headers=self._get_headers(),
                    json=payload
                )
                response.raise_for_status()
                return map_judgment_type(response.json())
        except Exception as e:
            logger.error(f"Error in hybrid search on saos-ai: {e}")
            return []

    async def full_document_search(
        self,
        query: str,
        limit: int = 10,
        use_rerank: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Endpoint: POST /v1/fulldocsearch (Full Document Search)
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                payload = {
                    "query": query,
                    "limit": limit,
                    "use_rerank": use_rerank
                }
                response = await client.post(
                    f"{self.base_url}/fulldocsearch",
                    headers=self._get_headers(),
                    json=payload
                )
                response.raise_for_status()
                return map_judgment_type(response.json())
        except Exception as e:
            logger.error(f"Error in full document search on saos-ai: {e}")
            return []

    async def search_with_rocchio(
        self, 
        query: str, 
        positive_vectors: List[List[float]], 
        negative_vectors: List[List[float]],
        limit: int = 10,
        use_rerank: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Helper dla wyszukiwania z Rocchio (wykorzystuje metodę search).
        """
        rocchio_payload = {
            "positive_vectors": positive_vectors,
            "negative_vectors": negative_vectors,
            "alpha": 1.0,
            "beta": 0.75,
            "gamma": 0.15
        }
        return await self.search(
            query=query,
            limit=limit,
            use_rerank=use_rerank,
            rocchio=rocchio_payload
        )

    async def get_relevant_ids(self, query: str, limit: int = 5) -> List[int]:
        """
        Endpoint: POST /chat
        Pobiera ID istotnych orzeczeń dla zapytania typu chat.
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                payload = {
                    "query": query,
                    "limit": limit
                }
                # /chat jest poza /v1
                chat_url = self.base_url.replace('/v1', '') + "/chat"
                response = await client.post(
                    chat_url,
                    headers=self._get_headers(),
                    json=payload
                )
                response.raise_for_status()
                data = response.json()
                return data.get("relevant_ids", [])
        except Exception as e:
            logger.error(f"Error getting relevant IDs from saos-ai: {e}")
            return []

    async def get_judgments_batch(self, saos_ids: List[int]) -> List[Dict[str, Any]]:
        """
        Endpoint: POST /v1/judgments/batch
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                payload = {"saos_ids": saos_ids}
                response = await client.post(
                    f"{self.base_url}/judgments/batch",
                    headers=self._get_headers(),
                    json=payload
                )
                response.raise_for_status()
                return map_judgment_type(response.json())
        except Exception as e:
            logger.error(f"Error getting judgments batch from saos-ai: {e}")
            return []

    async def get_details_by_signatures(self, signatures: List[str]) -> List[Dict[str, Any]]:
        """
        Endpoint: POST /v1/judgments/detailsBySignatures
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                payload = {"signatures": signatures}
                response = await client.post(
                    f"{self.base_url}/judgments/detailsBySignatures",
                    headers=self._get_headers(),
                    json=payload
                )
                response.raise_for_status()
                return map_judgment_type(response.json())
        except Exception as e:
            logger.error(f"Error getting details by signatures from saos-ai: {e}")
            return []

saos_ai_client = SaosAiClient()