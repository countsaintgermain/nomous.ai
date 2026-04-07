import logging
import asyncio
import random
from playwright.async_api import async_playwright, Browser, BrowserContext, Page
from playwright_stealth import Stealth
from typing import Optional, List, Dict, Any

logger = logging.getLogger(__name__)

APPELLATION_MAP = {
    "lublin": "lubelska",
    "wroclaw": "wrocławska",
    "bialystok": "białostocka",
    "gdansk": "gdańska",
    "katowice": "katowicka",
    "krakow": "krakowska",
    "lodz": "łódzka",
    "poznan": "poznańska",
    "rzeszow": "rzeszowska",
    "szczecin": "szczecińska",
    "warszawa": "warszawska"
}

class PispConnector:
    _instance: Optional['PispConnector'] = None
    
    def __init__(self):
        self.pw = None
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None
        self._auth_header: Optional[str] = None
        self._last_credentials: Optional[Dict] = None
        self._login_lock = asyncio.Lock()
        self._keep_alive_task: Optional[asyncio.Task] = None
        self._current_appellation: Optional[str] = None
        self._current_appellation_path: Optional[str] = None
        self._appellation_lock = asyncio.Lock()

    @classmethod
    async def get_instance(cls):
        if cls._instance is None:
            cls._instance = PispConnector()
        return cls._instance

    async def start(self):
        if not self.pw:
            logger.info("Starting Playwright for PISP...")
            self.pw = await async_playwright().start()
            self.browser = await self.pw.chromium.launch(
                headless=True,
                args=["--no-sandbox", "--disable-setuid-sandbox"]
            )
            self.context = await self.browser.new_context(
                viewport={'width': 1440, 'height': 768},
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            )
        
        if not self.page or self.page.is_closed():
            self.page = await self.context.new_page()
            stealth = Stealth()
            await stealth.apply(self.page)
            self.page.on("request", self._handle_request)
            
            # Start keep-alive loop
            if not self._keep_alive_task or self._keep_alive_task.done():
                self._keep_alive_task = asyncio.create_task(self._keep_alive())

    async def _handle_request(self, request):
        if "/api/" in request.url:
            auth = request.headers.get("authorization")
            if auth and auth.startswith("Bearer "):
                self._auth_header = auth

    async def is_logged_in(self) -> bool:
        if self.page is None or self.page.is_closed() or self._auth_header is None:
            return False
        try:
            # Prawdziwym wyznacznikiem bycia zalogowanym jest token w localStorage
            token = await self.page.evaluate("localStorage.getItem('authentication_token')")
            if not token:
                return False
                
            # Sprawdzamy czy na stronie jest element z tekstem "Apelacja"
            # Szukamy dowolnego elementu (najlepiej przycisku lub linku) z tekstem Apelacja
            return await self.page.get_by_text("Apelacja", exact=False).first.is_visible(timeout=3000)
        except Exception:
            return False

    async def stop(self):
        if self._keep_alive_task:
            self._keep_alive_task.cancel()
        if self.browser: await self.browser.close()
        if self.pw: await self.pw.stop()
        self.pw = self.browser = self.context = self.page = self._auth_header = None
        self._current_appellation = None

    async def login(self, username: str, password: str, court_url: str = None):
        async with self._login_lock:
            self._last_credentials = {"username": username, "password": password, "court_url": court_url}
            await self.start()
            base_url = self._get_base_url()
            
            try:
                logger.info(f"Navigating to PISP: {base_url}")
                await self.page.goto(base_url, wait_until="networkidle", timeout=60000)
                
                # Sprawdzenie czy jesteśmy już zalogowani (np. sesja przetrwała)
                if not await self.page.query_selector('input[name="username"]'):
                    # Może już jesteśmy w dashboardzie
                    token = await self.page.evaluate("localStorage.getItem('authentication_token')")
                    if token:
                        logger.info("PISP session already active.")
                        self._auth_header = f"Bearer {token}" if not token.startswith("Bearer ") else token
                        return True
                logger.info("PISP Login required...")
                await self.page.fill('input[name="username"]', username)
                await self.page.fill('input[name="password"]', password)
                
                # Próbujemy Enter
                await self.page.keyboard.press("Enter")
                
                # # Próbujemy kliknąć, jeśli Enter nie wystarczył (używając force=True by ominąć błąd widoczności)
                # try:
                #     await self.page.locator('button:has-text("Zaloguj się")').first.click(force=True, timeout=5000)
                #     logger.info("PISP Login clicked (forced).")
                # except Exception as click_err:
                #     logger.info(f"Forced click failed or not needed (Enter might have worked): {click_err}")

                # await asyncio.sleep(1)
                
                await self.page.wait_for_url(lambda url: "login" not in url, timeout=45000)
                logger.info("PISP Login successful.")
                
                # Poczekaj chwilę na tokeny API
                await asyncio.sleep(2)
                token = await self.page.evaluate("localStorage.getItem('authentication_token')")
                if token:
                    self._auth_header = f"Bearer {token}" if not token.startswith("Bearer ") else token
                
                return await self.is_logged_in()
            except Exception as e:
                logger.error(f"PISP Login failed: {e}")
                return False

    async def ensure_appellation(self, name_or_path: str):
        """Wymusza przełączenie kontekstu pracy na daną apelację."""
        async with self._appellation_lock:
            if not await self.is_logged_in(): 
                if self._last_credentials:
                    await self.login(**self._last_credentials)
                else:
                    return False
            
            # Mapowanie ścieżki (np. 'lublin') na nazwę wyświetlaną (np. 'lubelska')
            mapped_name = APPELLATION_MAP.get(name_or_path.lower(), name_or_path.lower())
            
            if self._current_appellation == mapped_name:
                return True
                
            try:
                
                # 0. Sprawdzamy, czy aktualna apelacja jest taka, jakiej oczekujemy
                logger.info(f"Checking if PISP appellation is set to: {mapped_name}")
                trigger = self.page.get_by_text("Apelacja ", exact=False).first
                current_apellation_str = await trigger.inner_text()
                
                if (mapped_name.lower() not in current_apellation_str.lower()):
                    # 1. Klikamy w aktualną apelację w nagłówku (żeby otworzyć menu)
                    logger.info(f"Switching PISP appellation from {current_apellation_str} to: {mapped_name}")
                    await trigger.click()
                    # Czekamy na pojawienie się opcji w menu
                    await asyncio.sleep(.5)
                    option = self.page.get_by_text(mapped_name, exact=False).first
                    await option.click()
                
                    # 3. Czekamy na przeładowanie sesji
                    await self.page.wait_for_load_state("networkidle")
                    
                    trigger = self.page.get_by_text("Apelacja ", exact=False).first
                    curr_apellation_str = await trigger.inner_text()
                    logger.info(f"PISP appellation switched to: {curr_apellation_str}")
                    
                    self._current_appellation = mapped_name
                    self._current_appellation_path = name_or_path.lower()
                return True
            except Exception as e:
                logger.error(f"Failed to switch appellation to {mapped_name}: {e}")
                # Próba odświeżenia strony i ponownego logowania w razie błędu UI
                self._current_appellation = None
                return False

    async def _keep_alive(self):
        """Pętla utrzymująca sesję PISP przy życiu."""
        logger.info("PISP Keep-alive loop started.")
        while True:
            try:
                await asyncio.sleep(60) # Co 1 minutę
                if await self.is_logged_in() and not self.page.is_closed():
                    # Losowy "click" lub refresh dashboardu
                    logger.info("Keeping PISP session alive...")
                    
                    # Sprawdzamy czy nadal jesteśmy zalogowani przez token
                    token = await self.page.evaluate("localStorage.getItem('authentication_token')")
                    if not token:
                        logger.warning("PISP session lost (no token). Re-logging...")
                        if self._last_credentials:
                            await self.login(**self._last_credentials)
                        continue

                    # Kliknij w Logo lub odśwież dashboard
                    try:
                        await self.page.locator('.logo:visible, .brand:visible, a[href="/"]:visible').first.click()
                        await asyncio.sleep(2)
                    except:
                        # Fallback: przejdź na główną
                        await self.page.goto(self._get_base_url(), wait_until="networkidle")
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in PISP keep-alive: {e}")

    async def fetch_api(self, url: str) -> Any:
        if not await self.is_logged_in(): 
            logger.warning(f"PISP API call attempted while not logged in: {url}")
            return None
        try:
            auth = self._auth_header
            logger.info(f"PISP API REQUEST: GET {url}")
            response = await self.context.request.get(url, headers={
                "Authorization": auth,
                "Accept": "application/json, text/plain, */*"
            })
            
            status = response.status
            logger.info(f"PISP API RESPONSE STATUS: {status} for {url}")
            
            if response.ok:
                data = await response.json()
                # Logujemy fragment danych dla debugowania (nie za dużo, żeby nie zapchać logów)
                data_str = str(data)[:1000]
                logger.info(f"PISP API DATA RECEIVED (truncated): {data_str}")
                return data
            
            if status == 401:
                logger.warning("PISP API 401 Unauthorized. Retrying with new login...")
                if self._last_credentials:
                    await self.login(**self._last_credentials)
                    return await self.fetch_api(url) # Ponów raz
            
            error_body = await response.text()
            logger.error(f"PISP API ERROR BODY: {error_body}")
            return None
        except Exception as e:
            logger.error(f"PISP API Exception during {url}: {e}")
            return None

    async def fetch_binary(self, url: str, lawsuit_id: int = None, appellation: str = None) -> Optional[bytes]:
        """Pobiera plik binarny z wymuszonym odświeżeniem tokena przed strzałem."""
        logger.info(f"PISP BINARY REQUEST: {url} (lawsuit_id={lawsuit_id}, appellation={appellation})")
        
        async def perform_request():
            if not await self.is_logged_in(): 
                if self._last_credentials:
                    await self.login(**self._last_credentials)
                else:
                    return None
            
            # Upewnij się, że mamy dobrą apelację
            if appellation:
                await self.ensure_appellation(appellation)

            # Pobierz świeży token bezpośrednio z przeglądarki
            token = await self.page.evaluate("localStorage.getItem('authentication_token')")
            if not token:
                # Fallback do złapanego nagłówka
                auth_header = self._auth_header
            else:
                auth_header = f"Bearer {token}" if not token.startswith("Bearer ") else token

            if not auth_header:
                logger.error("No auth header available for binary request")
                return None

            response = await self.context.request.get(url, headers={
                "Authorization": auth_header,
                "Referer": self._get_base_url()
            })
            
            if response.status == 401:
                error_text = await response.text()
                if "Blacklisted" in error_text or "expired" in error_text:
                    logger.warning(f"PISP Binary 401: {error_text}. Triggering full re-login...")
                    return "RELOGIN"
                return None
                
            if response.ok:
                return await response.body()
            
            logger.error(f"PISP Binary Error Status {response.status}: {await response.text()}")
            return None

        # Pierwsza próba
        result = await perform_request()
        
        # Jeśli wymagany re-login
        if result == "RELOGIN":
            if self._last_credentials:
                # Wymuszamy zatrzymanie i start nowej sesji, by mieć świeże ciastka i tokeny
                await self.stop()
                await self.login(**self._last_credentials)
                result = await perform_request()
            else:
                return None
        
        if isinstance(result, bytes):
            logger.info(f"PISP BINARY RECEIVED: {len(result)} bytes")
            return result
            
        return None

    def _get_base_url(self) -> str:
        base_url = "https://portal.wroclaw.sa.gov.pl/"
        if self._last_credentials and self._last_credentials.get('court_url'):
            base_url = self._last_credentials.get('court_url')
        return base_url if base_url.endswith("/") else base_url + "/"

    async def fetch_cases(self, appellation_path: str) -> List[Dict]:
        await self.ensure_appellation(appellation_path)
        data = await self.fetch_api(f"{self._get_base_url()}{appellation_path}/api/dashboard/lawsuits")
        return [{"signature": c.get("signature", ""), "pisp_id": c.get("id")} for c in data] if data else []

    async def fetch_documents(self, lawsuit_id: int, appellation_path: str) -> List[Dict]:
        await self.ensure_appellation(appellation_path)
        url = f"{self._get_base_url()}{appellation_path}/api/v3/documents?page=0&size=100&sort=publicationDate,desc&lawsuitId.equals={lawsuit_id}"
        return await self.fetch_api(url) or []

    async def fetch_parties(self, lawsuit_id: int, appellation_path: str) -> List[Dict]:
        await self.ensure_appellation(appellation_path)
        url = f"{self._get_base_url()}{appellation_path}/api/v2/parties/lawsuit?page=0&size=50&lawsuitId.equals={lawsuit_id}"
        return await self.fetch_api(url) or []

    async def fetch_hearings(self, lawsuit_id: int, appellation_path: str) -> List[Dict]:
        await self.ensure_appellation(appellation_path)
        # Poprawny URL z sample_api_urls.md
        url = f"{self._get_base_url()}{appellation_path}/api/court-sessions/lawsuit?page=0&size=50&sort=dateFrom,desc&lawsuitId.equals={lawsuit_id}"
        return await self.fetch_api(url) or []

    async def fetch_activities(self, lawsuit_id: int, appellation_path: str) -> List[Dict]:
        await self.ensure_appellation(appellation_path)
        # Poprawny URL z sample_api_urls.md (używa caseId.equals zamiast lawsuitId.equals)
        url = f"{self._get_base_url()}{appellation_path}/api/proceeding-views?page=0&size=100&sort=date,desc&caseId.equals={lawsuit_id}"
        return await self.fetch_api(url) or []

    async def fetch_relations(self, lawsuit_id: int, appellation_path: str) -> List[Dict]:
        await self.ensure_appellation(appellation_path)
        # Poprawny URL z sample_api_urls.md
        url = f"{self._get_base_url()}{appellation_path}/api/relations?page=0&size=50&sort=id,asc&lawsuitId.equals={lawsuit_id}"
        return await self.fetch_api(url) or []
