from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, VectorParams
from ..core.config import settings
import logging

logger = logging.getLogger(__name__)

COLLECTION_NAME = "devintel_code"
# Using gemini-embedding-001 which has 3072 dimensions
VECTOR_SIZE = 3072

_qdrant_client: QdrantClient | None = None

def get_qdrant_client() -> QdrantClient:
    global _qdrant_client
    if _qdrant_client is not None:
        return _qdrant_client
        
    if settings.QDRANT_URL:
        _qdrant_client = QdrantClient(
            url=settings.QDRANT_URL,
            api_key=settings.QDRANT_API_KEY
        )
    else:
        # Fallback to local memory/disk if Docker is not available
        import os
        os.makedirs(settings.QDRANT_LOCAL_DIR, exist_ok=True)
        _qdrant_client = QdrantClient(path=settings.QDRANT_LOCAL_DIR)
        
    return _qdrant_client

def init_qdrant():
    client = get_qdrant_client()
    try:
        collections = client.get_collections().collections
        exists = any(c.name == COLLECTION_NAME for c in collections)
        if exists:
            info = client.get_collection(COLLECTION_NAME)
            current_size = getattr(info.config.params.vectors, 'size', None)
            if current_size != VECTOR_SIZE:
                logger.info(f"Recreating Qdrant collection {COLLECTION_NAME} (old size: {current_size}, new size: {VECTOR_SIZE})")
                client.delete_collection(COLLECTION_NAME)
                exists = False
        if not exists:
            logger.info(f"Creating Qdrant collection: {COLLECTION_NAME} with vector size {VECTOR_SIZE}")
            client.create_collection(
                collection_name=COLLECTION_NAME,
                vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
            )
        else:
            logger.info(f"Qdrant collection {COLLECTION_NAME} already exists.")
    except Exception as e:
        logger.error(f"Failed to initialize Qdrant: {e}")

# Run this synchronously on app start if needed
