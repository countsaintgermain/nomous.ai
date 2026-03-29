import asyncio
from app.services.tasks import process_document_ocr_task

async def main():
    print("Nomous.ia: Zlecam zadania analizy...")
    for doc_id in [1, 2, 3]:
        try:
            await process_document_ocr_task.kiq(doc_id)
            print(f"Zlecono ID: {doc_id}")
        except Exception as e:
            print(f"Błąd dla ID {doc_id}: {e}")

if __name__ == "__main__":
    asyncio.run(main())
