import asyncio
import logging
from app.services.saos_service import SaosService

# Setup logging
logging.basicConfig(level=logging.INFO)

async def test_saos():
    service = SaosService()
    try:
        print("Testing SAOS search...")
        result = await service.search_judgments(keywords="umowa najmu")
        print("Result:", result)
    except Exception as e:
        print(f"Caught expected exception: {e}")

if __name__ == "__main__":
    asyncio.run(test_saos())
