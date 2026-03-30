import httpx
from typing import Dict, List, Any, Optional
import logging

logger = logging.getLogger(__name__)

class SaosService:
    BASE_URL = "https://www.saos.org.pl/api"

    async def search_judgments(
        self, 
        keywords: Optional[str] = None, 
        court_type: Optional[str] = None, 
        judgment_date_from: Optional[str] = None, 
        judgment_date_to: Optional[str] = None,
        page_number: int = 0,
        page_size: int = 20
    ) -> Dict[str, Any]:
        params = {
            "pageNumber": page_number,
            "pageSize": page_size,
        }
        if keywords:
            params["keywords"] = keywords
        if court_type:
            params["courtType"] = court_type
        if judgment_date_from:
            params["judgmentDateFrom"] = judgment_date_from
        if judgment_date_to:
            params["judgmentDateTo"] = judgment_date_to

        async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
            try:
                response = await client.get(f"{self.BASE_URL}/search/judgments", params=params)
                response.raise_for_status()
                
                # Check if the response is actually JSON
                content_type = response.headers.get("content-type", "")
                if "application/json" not in content_type:
                    logger.error(f"SAOS API returned non-JSON response: {content_type}")
                    if "text/html" in content_type and "Przerwa techniczna" in response.text:
                        raise Exception("SAOS API is currently down for maintenance (Przerwa techniczna)")
                    raise Exception(f"SAOS API returned unexpected content type: {content_type}")

                return response.json()
            except httpx.HTTPStatusError as e:
                logger.error(f"SAOS API search error: {e.response.status_code} - {e.response.text}")
                raise
            except Exception as e:
                logger.error(f"SAOS API search exception: {str(e)}")
                raise

    async def get_judgment_details(self, judgment_id: int) -> Dict[str, Any]:
        async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
            try:
                response = await client.get(f"{self.BASE_URL}/judgments/{judgment_id}")
                response.raise_for_status()
                
                # Check if the response is actually JSON
                content_type = response.headers.get("content-type", "")
                if "application/json" not in content_type:
                    logger.error(f"SAOS API returned non-JSON response for details: {content_type}")
                    if "text/html" in content_type and "Przerwa techniczna" in response.text:
                        raise Exception("SAOS API is currently down for maintenance (Przerwa techniczna)")
                    raise Exception(f"SAOS API returned unexpected content type: {content_type}")
                
                return response.json()
            except httpx.HTTPStatusError as e:
                logger.error(f"SAOS API details error: {e.response.status_code} - {e.response.text}")
                raise
            except Exception as e:
                logger.error(f"SAOS API details exception: {str(e)}")
                raise
