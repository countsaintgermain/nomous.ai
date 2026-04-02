import asyncio
from playwright.async_api import async_playwright

async def test_pisp_ui():
    async with async_playwright() as p:
        browser = await p.chromium.launch(args=["--no-sandbox"])
        page = await browser.new_page()
        url = "http://frontend:3000"
        print(f"Navigating to {url}...")
        
        try:
            await page.goto(url, wait_until="domcontentloaded")
            await page.wait_for_timeout(3000) # Czekaj na JS
            
            # Wypisz wszystkie przyciski dla debugowania
            buttons = await page.locator("button").all_text_contents()
            print(f"Found buttons: {buttons}")
            
            # Kliknij w selektor spraw (szukamy tekstu zawierającego 'spraw')
            await page.click("button:has-text('spraw')")
            print("Dropdown clicked.")
            await page.wait_for_timeout(1000)
            
            # Wybierz sprawę
            await page.click("span:has-text('II K 716/25')")
            print("Case II K 716/25 selected.")
            await page.wait_for_timeout(2000)
            
            # Sprawdź Sidebar
            sidebar_text = await page.locator("nav").all_text_contents()
            print(f"Sidebar content: {sidebar_text}")
            
            if any("Portal PISP" in t for t in sidebar_text):
                print("PISP section is VISIBLE in sidebar.")
                await page.click("button:has-text('Portal PISP')")
                
                # Dokumenty
                await page.click("button:has-text('Dokumenty')")
                print("In Documents tab.")
                await page.wait_for_timeout(2000)
                
                # Sprawdź przyciski akcji
                actions = await page.locator("button").all_text_contents()
                has_preview = any("Podgląd" in a for a in actions)
                has_import = any("Umieść w aktówce" in a for a in actions)
                
                if has_preview and has_import:
                    print("SUCCESS: Both 'Podgląd' and 'Umieść w aktówce' buttons found!")
                else:
                    print(f"FAILURE: Buttons not found. Found buttons: {actions}")
            else:
                print("FAILURE: PISP section NOT FOUND in sidebar.")
                
            await page.screenshot(path="final_test_check.png")
            
        except Exception as e:
            print(f"Error during test: {e}")
            await page.screenshot(path="error_test_check.png")
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(test_pisp_ui())
