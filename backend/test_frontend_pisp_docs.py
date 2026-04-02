import asyncio
from playwright.async_api import async_playwright

async def test_pisp_docs():
    async with async_playwright() as p:
        browser = await p.chromium.launch(args=["--no-sandbox"])
        page = await browser.new_page()
        url = "http://frontend:3000"
        try:
            await page.goto(url, wait_until="networkidle")
            
            # Zakładamy że sprawa z pisp_id jest już aktywna (domyślnie pierwsza na liście)
            # Klikamy Portal PISP
            await page.click("button:has-text('Portal PISP')")
            print("Clicked Portal PISP")
            
            # Klikamy Dokumenty
            await page.click("button:has-text('Dokumenty')")
            print("Clicked Documents tab")
            await page.wait_for_timeout(2000)
            
            # Pobierz przyciski w kontenerze tabeli
            buttons = await page.locator("td button").all_text_contents()
            print(f"Action buttons found: {buttons}")
            
            if "Podgląd" in "".join(buttons) and "Umieść w aktówce" in "".join(buttons):
                print("SUCCESS: Preview and Import buttons are present in the table.")
            else:
                print("FAILURE: Table buttons not found as expected.")
                
            await page.screenshot(path="final_docs_check.png")
        except Exception as e:
            print(f"Error: {e}")
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(test_pisp_docs())
