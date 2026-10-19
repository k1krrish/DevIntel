from app.ai.reranking import rerank_chunks

def test_reranking_keyword_overlap():
    chunks = [
        {
            "chunk_id": "1",
            "file_path": "src/utils/helpers.py",
            "symbol_name": "format_date",
            "source_code": "def format_date(): pass",
            "score": 0.7
        },
        {
            "chunk_id": "2",
            "file_path": "src/auth/service.py",
            "symbol_name": "authenticate_user",
            "source_code": "def authenticate_user(): pass",
            "score": 0.65
        }
    ]

    reranked = rerank_chunks("authenticate user password", chunks, top_k=2)
    # The second chunk should receive boost because 'authenticate' and 'user' match symbol and path
    assert reranked[0]["chunk_id"] == "2"
    assert reranked[0]["reranked_score"] > reranked[1]["reranked_score"]
