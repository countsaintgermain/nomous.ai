import asyncio
from playwright.async_api import async_playwright

async def inspect():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        url = "https://portal.wroclaw.sa.gov.pl/login"
        print(f"Navigating to {url}...")
        await page.goto(url, wait_until="networkidle")
        
        await page.screenshot(path="wroclaw_login.png")
        
        # Wyciągnij wszystkie inputy
        inputs = await page.locator("input").all()
        print(f"Found {len(inputs)} input fields:")
        for i in inputs:
            name = await i.get_attribute("name")
            id_attr = await i.get_attribute("id")
            type_attr = await i.get_attribute("type")
            print(f"- Type: {type_attr}, Name: {name}, ID: {id_attr}")
            
        # Wyciągnij przyciski
        buttons = await page.locator("button, input[type='submit']").all()
        print(f"\nFound {len(buttons)} buttons:")
        for b in buttons:
            text = await b.inner_text()
            name = await b.get_attribute("name")
            print(f"- Text: '{text.strip()}', Name: {name}")
            
        await browser.close()

if __name__ == "__main__":
    asyncio.run(inspect())
