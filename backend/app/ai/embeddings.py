from google import genai
from ..core.config import settings
import logging
from typing import List

logger = logging.getLogger(__name__)

def get_gemini_client():
    if settings.GEMINI_API_KEY:
        return genai.Client(api_key=settings.GEMINI_API_KEY)
    return None

import time

def generate_embeddings(texts: List[str]) -> List[List[float]]:
    client = get_gemini_client()
    if not client:
        logger.error("Cannot generate embeddings, no API key.")
        return [[0.0] * 3072 for _ in texts]
    
    max_retries = 3
    backoff = 2.0
    for attempt in range(max_retries):
        try:
            response = client.models.embed_content(
                model='gemini-embedding-001',
                contents=texts
            )
            return [emb.values for emb in response.embeddings]
        except Exception as e:
            if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                logger.warning(f"Embedding rate limit hit, backing off {backoff}s (attempt {attempt + 1}/{max_retries})...")
                time.sleep(backoff)
                backoff *= 2
            else:
                logger.error(f"Error generating embeddings: {e}")
                break
                
    return [[0.0] * 3072 for _ in texts]
