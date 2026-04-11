import httpx
import logging
from typing import List, Optional, Dict, Any
from app.core.config import settings

logger = logging.getLogger(__name__)

JUDGMENT_TYPE_MAP = {
    "SENTENCE": "Wyrok",
    "REASONS": "Uzasadnienie wyroku",
    "DECISION": "Postanowienie",
    "RESOLUTION": "Uchwała",
    "REGULATION": "Zarządzenie",
    "ORDER": "Zarządzenie",
    "UNKNOWN": "Nieznany"
}

def map_judgment_type(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    for item in items:
        # Obsługa obu formatów (snake_case z saos-ai i camelCase z publicznego SAOS)
        for key in ["judgment_type", "judgmentType"]:
            j_type = item.get(key)
            if j_type and j_type in JUDGMENT_TYPE_MAP:
                item[key] = JUDGMENT_TYPE_MAP[j_type]
        
        # Normalizacja sygnatur dla endpointu detailsBySignatures
        if "signatures" not in item or not item["signatures"]:
            court_cases = item.get("courtCases", [])
            if court_cases:
                item["signatures"] = [c.get("caseNumber") for c in court_cases if c.get("caseNumber")]
    return items

class SaosAiClient:
    def __init__(self):
        self.base_url = settings.SAOS_AI_URL.rstrip('/')
        self.api_key = settings.SAOS_AI_API_KEY
        self.timeout = 60.0

    def _get_headers(self, is_multipart: bool = False) -> Dict[str, str]:
        headers = {
            "X-API-Key": self.api_key
        }
        if not is_multipart:
            headers["Content-Type"] = "application/json"
        return headers

    async def encode_text(self, text: str) -> Optional[List[float]]:
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                payload = {"text": text, "metadata": {}}
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
        Wysyła tekst do endpointu /encode/text i zwraca pełną odpowiedź:
        główny wektor (document_vector) oraz listę wektorów dla chunków (chunks).
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                payload = {"text": text, "metadata": {}}
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

    async def search_with_rocchio(
        self, 
        query: str, 
        positive_vectors: List[List[float]], 
        negative_vectors: List[List[float]],
        limit: int = 10,
        use_rerank: bool = True
    ) -> List[Dict[str, Any]]:
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                payload = {
                    "query": query,
                    "limit": limit,
                    "use_rerank": use_rerank,
                    "rocchio": {
                        "positive_vectors": positive_vectors,
                        "negative_vectors": negative_vectors,
                        "alpha": 1.0,
                        "beta": 0.75,
                        "gamma": 0.15
                    }
                }
                response = await client.post(
                    f"{self.base_url}/search",
                    headers=self._get_headers(),
                    json=payload
                )
                response.raise_for_status()
                return map_judgment_type(response.json())
        except Exception as e:
            logger.error(f"Error searching with Rocchio on saos-ai: {e}")
            return []

    async def get_relevant_ids(self, query: str, limit: int = 5) -> List[int]:
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                payload = {
                    "query": query,
                    "limit": limit,
                    "use_rerank": True
                }
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