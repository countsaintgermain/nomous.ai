from app.services.tasks import process_document_ocr_task
print("Running task 3...")
try:
    res = process_document_ocr_task(3)
    print("Result:", res)
except Exception as e:
    import traceback
    traceback.print_exc()
