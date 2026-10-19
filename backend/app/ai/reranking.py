from typing import List, Dict, Any

def rerank_chunks(query: str, chunks: List[Dict[str, Any]], top_k: int = 5) -> List[Dict[str, Any]]:
    """
    Lightweight reranking logic.
    For V1, we combine Qdrant's vector similarity score with basic keyword overlap
    on the file path and symbol name to boost exact matches.
    """
    query_lower = query.lower()
    query_words = set(query_lower.split())
    
    for chunk in chunks:
        # Base score from vector similarity (usually 0 to 1)
        score = chunk.get("score", 0.0)
        
        # Boost if file path contains query words
        file_path = str(chunk.get("file_path", "")).lower()
        if any(word in file_path for word in query_words):
            score += 0.1
            
        # Boost if symbol name matches
        symbol_name = str(chunk.get("symbol_name", "")).lower()
        if any(word in symbol_name for word in query_words):
            score += 0.2
            
        chunk["reranked_score"] = score
        
    # Sort by reranked score descending
    reranked = sorted(chunks, key=lambda x: x.get("reranked_score", 0.0), reverse=True)
    
    return reranked[:top_k]
