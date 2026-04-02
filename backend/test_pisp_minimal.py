import asyncio
import os
import json
from playwright.async_api import async_playwright
from dotenv import load_dotenv

async def switch_appeal_court(page, appeal_court_name: str):
    try:
        # Szukamy przycisku z konkretnym tekstem
        print("Wybieranie 'lubelska'...")
        trigger = page.get_by_text("Apelacja", exact=False).first
        await trigger.click()
        
        option = page.get_by_text(appeal_court_name, exact=False).first
        await option.click()
        # await page.wait_for_load_state("networkidle")
        await asyncio.sleep(1) # Czekamy na przeładowanie sesji
            
    except Exception as e:
        print(f"Błąd podczas nawigacji menu: {e}")
        await page.screenshot(path="/app/uploads/pisp_error_ui.png")

async def test_minimal():
    load_dotenv()
    username = os.getenv("PISP_USERNAME")
    password = os.getenv("PISP_PASSWD")
    
    if not username or not password:
        print("BŁĄD: Brak danych logowania w .env")
        return

    async with async_playwright() as p:
        print("Uruchamianie przeglądarki (1440x768)...")
        browser = await p.chromium.launch(headless=True, args=["--no-sandbox"])
        context = await browser.new_context(
            viewport={'width': 1440, 'height': 768},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()

        print(f"Logowanie do PISP...")
        await page.goto("https://portal.wroclaw.sa.gov.pl/", wait_until="networkidle")
        await page.fill('input[name="username"]', username)
        await page.fill('input[name="password"]', password)
        await page.locator('button:has-text("Zaloguj się"):visible').first.click()
        await page.wait_for_url(lambda url: "login" not in url, timeout=45000)
        print("Zalogowano pomyślnie.")
        await asyncio.sleep(5)

        # 1. KLIKNIĘCIE W APELACJĘ BIAŁOSTOCKĄ (Aby otworzyć popup)
        print("Otwieranie menu apelacji (klik w 'Apelacja białostocka')...")
        await switch_appeal_court(page, "lubelska")

        # Pobieramy token i sprawdzamy API
        token = await page.evaluate("localStorage.getItem('authentication_token')")
        auth_header = f"Bearer {token}" if token and not token.startswith("Bearer ") else token
        
        url_to_fetch = "https://portal.wroclaw.sa.gov.pl/doc/documents/web/29084724/download/pdf"
        print(f"Pobieranie pliku...")
        response = await context.request.get(url_to_fetch, headers={"Authorization": auth_header})
        print(f"Status HTTP API: {response.status}")
        print(await response.body())
        # await response.save_as("/app/uploads/test.pdf")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(test_minimal())
