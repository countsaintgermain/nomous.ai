from playwright.async_api import async_playwright
import logging

logger = logging.getLogger(__name__)

async def scrape_url(url: str) -> str:
    """Pobiera tekstową treść strony internetowej za pomocą Playwright."""
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        try:
            page = await browser.new_page()
            await page.goto(url, wait_until="networkidle", timeout=60000)
            
            # Usuwamy niepotrzebne elementy przed wyciągnięciem tekstu
            await page.evaluate('''() => {
                const selectors = ['nav', 'footer', 'script', 'style', 'header', 'aside'];
                selectors.forEach(s => {
                    document.querySelectorAll(s).forEach(el => el.remove());
                });
            }''')
            
            # Pobieramy główny tekst
            text = await page.inner_text('body')
            return text.strip()
        except Exception as e:
            logger.error(f"{url}: {e}")
            raise e
        finally:
            await browser.close()
