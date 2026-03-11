from taskiq_redis import ListQueueBroker, RedisAsyncResultBackend
from app.core.config import settings

# Inicjalizacja brokera TaskIQ z użyciem Redis
redis_async_result = RedisAsyncResultBackend(
    redis_url=settings.REDIS_URL,
)

broker = ListQueueBroker(
    url=settings.REDIS_URL,
).with_result_backend(redis_async_result)

# Import zadań - potrzebne dla workerów by jezarejestrować
import app.services.tasks
