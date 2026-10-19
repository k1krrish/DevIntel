from qdrant_client.http.models import Filter, FieldCondition, MatchValue
from typing import List, Dict, Any
from .embeddings import generate_embeddings
from ..integrations.qdrant_client import get_qdrant_client, COLLECTION_NAME

def search_repository_vectors(repo_id: int, query: str, top_k: int = 10) -> List[Dict[str, Any]]:
    """Perform vector search in Qdrant for a specific repository."""
    
    # 1. Embed query
    query_vector = generate_embeddings([query])[0]
    
    # 2. Search Qdrant
    qdrant_client = get_qdrant_client()
    
    # Filter by repo_id
    search_filter = Filter(
        must=[
            FieldCondition(
                key="repository_id",
                match=MatchValue(value=repo_id)
            )
        ]
    )
    
    if hasattr(qdrant_client, "query_points"):
        response = qdrant_client.query_points(
            collection_name=COLLECTION_NAME,
            query=query_vector,
            query_filter=search_filter,
            limit=top_k,
            with_payload=True
        )
        hits = response.points
    else:
        hits = qdrant_client.search(
            collection_name=COLLECTION_NAME,
            query_vector=query_vector,
            query_filter=search_filter,
            limit=top_k,
            with_payload=True
        )
    
    # Extract payload
    chunks = []
    for hit in hits:
        payload = dict(hit.payload or {})
        payload["score"] = hit.score
        chunks.append(payload)
        
    return chunks
