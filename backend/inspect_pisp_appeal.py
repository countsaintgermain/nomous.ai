import asyncio
from playwright.async_api import async_playwright

async def inspect():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=["--no-sandbox"])
        context = await browser.new_context()
        page = await context.new_page()
        
        # Zakładamy, że jesteśmy już zalogowani w PoC (użyjemy sesji jeśli by była, 
        # ale tutaj po prostu wejdziemy na stronę, żeby zobaczyć strukturę menu)
        url = "https://portal.wroclaw.sa.gov.pl/"
        print(f"Navigating to {url}...")
        await page.goto(url, wait_until="networkidle")
        
        # Znajdź przycisk apelacji
        appeal_btn = page.locator("app-appeal-context button")
        if await appeal_btn.count() > 0:
            print(f"Found appeal button with text: '{await appeal_btn.inner_text()}'")
            await appeal_btn.click()
            await page.wait_for_timeout(1000) # Czekaj na menu
            
            # Wyciągnij elementy menu
            menu_items = await page.locator(".mat-mdc-menu-item, .mat-menu-item").all()
            print(f"Found {len(menu_items)} menu items:")
            for item in menu_items:
                print(f"- '{await item.inner_text()}'")
        else:
            print("Appeal button not found (not logged in?)")
            
        await browser.close()

if __name__ == "__main__":
    asyncio.run(inspect())
