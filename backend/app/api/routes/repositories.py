from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
import traceback
import os
import logging

logger = logging.getLogger(__name__)

from app.core.database import get_db
from app.models.repository import Repository, RepositoryStatus
from app.schemas.repository import RepositoryCreate, RepositoryResponse, ChatRequest, ChatResponse
from app.services.repository_service import create_repository_record, get_repository_by_id
from app.services.indexing_service import run_indexing_pipeline
from app.core.config import settings
from app.integrations.qdrant_client import get_qdrant_client, COLLECTION_NAME

from app.ai.llm import generate_chat_response
from app.ai.retrieval import search_repository_vectors
from app.ai.reranking import rerank_chunks

router = APIRouter(prefix="/repositories", tags=["Repositories"])

@router.post("", response_model=RepositoryResponse)
async def create_repository(
    repo_in: RepositoryCreate, 
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    try:
        # 1. Create Repository Record
        repo = await create_repository_record(db, repo_in)
        
        # 2. Trigger Background Indexing
        if repo.status in [RepositoryStatus.PENDING, RepositoryStatus.FAILED]:
            background_tasks.add_task(run_indexing_pipeline, repo.id, str(repo.github_url))
        
        return repo
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("", response_model=List[RepositoryResponse])
async def list_repositories(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Repository).order_by(Repository.created_at.desc()))
    return result.scalars().all()

@router.get("/{repo_id}", response_model=RepositoryResponse)
async def get_repository(repo_id: int, db: AsyncSession = Depends(get_db)):
    return await get_repository_by_id(db, repo_id)

@router.post("/{repo_id}/chat", response_model=ChatResponse)
async def chat_with_repository(repo_id: int, request: ChatRequest, db: AsyncSession = Depends(get_db)):
    repo = await get_repository_by_id(db, repo_id)
    if repo.status != RepositoryStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Repository is not fully indexed yet.")
    
    try:
        # 1. Retrieve
        raw_chunks = search_repository_vectors(repo_id, request.question, top_k=15)
        
        # 2. Rerank
        reranked_chunks = rerank_chunks(request.question, raw_chunks, top_k=5)
        
        # 3. Construct Context
        context_str = ""
        sources = []
        for chunk in reranked_chunks:
            context_str += f"File: {chunk['file_path']} (Lines {chunk['start_line']}-{chunk['end_line']})\n"
            context_str += f"Symbol: {chunk['symbol_name']}\nCode:\n{chunk['source_code']}\n\n"
            sources.append({
                "file": chunk["file_path"],
                "start_line": chunk["start_line"],
                "end_line": chunk["end_line"],
                "symbol": chunk["symbol_name"]
            })
            
        # 4. Generate Answer
        answer = generate_chat_response(request.question, context_str)
        return {"answer": answer, "sources": sources}
    except Exception as e:
        logger.error(f"Chat error for repo {repo_id}: {e}")
        return {
            "answer": f"I ran into an issue retrieving or generating the response: {str(e)}",
            "sources": []
        }

@router.get("/{repo_id}/search")
async def search_in_repository(repo_id: int, q: str, db: AsyncSession = Depends(get_db)):
    repo = await get_repository_by_id(db, repo_id)
    if repo.status != RepositoryStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Repository is not fully indexed yet.")
    
    try:
        results = search_repository_vectors(repo_id, q, top_k=10)
        clean_results = []
        for r in results:
            r.pop("score", None)
            clean_results.append(r)
        return clean_results
    except Exception as e:
        logger.error(f"Search error for repo {repo_id}: {e}")
        return []

@router.delete("/{repo_id}")
async def delete_repository(repo_id: int, db: AsyncSession = Depends(get_db)):
    repo = await get_repository_by_id(db, repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
        
    # Delete from Qdrant
    try:
        qdrant = get_qdrant_client()
        from qdrant_client.http.models import Filter, FieldCondition, MatchValue
        qdrant.delete(
            collection_name=COLLECTION_NAME,
            points_selector=Filter(
                must=[FieldCondition(key="repository_id", match=MatchValue(value=repo_id))]
            )
        )
    except Exception as e:
        logger.warning(f"Failed to delete Qdrant points for repo {repo_id}: {e}")

    # Delete cloned folder
    import shutil
    repo_dir = os.path.join(settings.REPOS_DIR, str(repo_id))
    if os.path.exists(repo_dir):
        try:
            shutil.rmtree(repo_dir, ignore_errors=True)
        except Exception as e:
            logger.warning(f"Failed to remove directory {repo_dir}: {e}")
            
    # Delete from DB
    await db.delete(repo)
    await db.commit()
    return {"status": "deleted", "id": repo_id}

@router.get("/{repo_id}/files")
async def get_repository_files(repo_id: int, db: AsyncSession = Depends(get_db)):
    repo = await get_repository_by_id(db, repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
        
    repo_dir = os.path.join(settings.REPOS_DIR, str(repo_id))
    if not os.path.exists(repo_dir):
        return []
        
    from app.services.parsing_service import discover_files
    files = discover_files(repo_dir)
    rel_files = [os.path.relpath(f, repo_dir).replace("\\", "/") for f in files]
    return sorted(rel_files)
