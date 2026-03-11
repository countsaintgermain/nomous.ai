import sys
import traceback
from app.services.tasks import process_document_ocr_task

try:
    print("Testing Doc 3 OCR...")
    res = process_document_ocr_task(3)
    print("Result:", res)
except Exception as e:
    traceback.print_exc()
