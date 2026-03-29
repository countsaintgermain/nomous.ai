from fastapi import APIRouter
from fastapi.responses import StreamingResponse
import asyncio

router = APIRouter()

@router.get("/test-stream")
async def test_stream():
    async def event_generator():
        for i in range(10):
            yield f"data: chunk {i}\n\n"
            await asyncio.sleep(0.5)
    return StreamingResponse(event_generator(), media_type="text/event-stream")
