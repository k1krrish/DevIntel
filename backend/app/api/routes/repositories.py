from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
import os
import shutil
import logging
from collections import Counter

logger = logging.getLogger(__name__)

from app.core.database import get_db
from app.models.repository import Repository, RepositoryStatus
from app.schemas.repository import (
    RepositoryCreate, RepositoryResponse, 
    ChatRequest, ChatResponse,
    GenerateCodeRequest, GenerateCodeResponse,
    ExplainCodeRequest, ExplainCodeResponse
)
from app.services.repository_service import create_repository_record, get_repository_by_id
from app.services.indexing_service import run_indexing_pipeline
from app.core.config import settings
from app.integrations.qdrant_client import get_qdrant_client, COLLECTION_NAME

from app.ai.llm import generate_chat_response
from app.ai.retrieval import search_repository_vectors
from app.ai.reranking import rerank_chunks
from app.services.parsing_service import discover_files, detect_language
from app.services.intelligence_service import (
    build_architecture_graph,
    get_git_insights,
    generate_code_grounded,
    explain_code_grounded
)

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

LANG_ALIASES = {
    "ts": "typescript", "typescript": "typescript", "tsx": "typescript",
    "js": "javascript", "javascript": "javascript", "jsx": "javascript",
    "py": "python", "python": "python",
    "rs": "rust", "rust": "rust",
    "cs": "csharp", "c_sharp": "csharp", "csharp": "csharp",
    "rb": "ruby", "ruby": "ruby",
    "sh": "bash", "bash": "bash", "zsh": "bash",
    "yml": "yaml", "yaml": "yaml",
    "htm": "html", "html": "html",
    "md": "markdown", "markdown": "markdown",
}

def normalize_lang(l: str) -> str:
    cleaned = l.lower().strip().lstrip(".")
    return LANG_ALIASES.get(cleaned, cleaned)

@router.get("/{repo_id}/search")
async def search_in_repository(
    repo_id: int, 
    q: str, 
    language: Optional[str] = Query(None, description="Filter by language"),
    symbol_type: Optional[str] = Query(None, description="Filter by symbol type"),
    db: AsyncSession = Depends(get_db)
):
    repo = await get_repository_by_id(db, repo_id)
    if repo.status != RepositoryStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Repository is not fully indexed yet.")
    
    try:
        # Retrieve extra chunks to allow for language/type filtering
        fetch_limit = 40 if (language or symbol_type) else 15
        results = search_repository_vectors(repo_id, q, top_k=fetch_limit)
        clean_results = []
        target_lang = normalize_lang(language) if language else None
        for r in results:
            r.pop("score", None)
            chunk_lang = normalize_lang(r.get("language", ""))
            if target_lang and chunk_lang != target_lang:
                continue
            if symbol_type and symbol_type.lower() not in r.get("symbol_type", "").lower():
                continue
            clean_results.append(r)
            if len(clean_results) >= 12:
                break
        return clean_results
    except Exception as e:
        logger.error(f"Search error for repo {repo_id}: {e}")
        return []

@router.post("/{repo_id}/generate", response_model=GenerateCodeResponse)
async def generate_code_endpoint(repo_id: int, request: GenerateCodeRequest, db: AsyncSession = Depends(get_db)):
    repo = await get_repository_by_id(db, repo_id)
    if repo.status != RepositoryStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Repository is not fully indexed yet.")
    
    try:
        result = generate_code_grounded(
            repo_id=repo_id,
            prompt=request.prompt,
            task_type=request.task_type or "custom",
            target_file=request.target_file
        )
        return result
    except Exception as e:
        logger.error(f"Code generation error for repo {repo_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{repo_id}/explain", response_model=ExplainCodeResponse)
async def explain_code_endpoint(repo_id: int, request: ExplainCodeRequest, db: AsyncSession = Depends(get_db)):
    repo = await get_repository_by_id(db, repo_id)
    repo_dir = os.path.join(settings.REPOS_DIR, str(repo_id))
    
    try:
        result = explain_code_grounded(
            repo_id=repo_id,
            repo_dir=repo_dir,
            file_path=request.file_path,
            snippet=request.code_snippet
        )
        return result
    except Exception as e:
        logger.error(f"Code explain error for repo {repo_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{repo_id}/graph")
async def get_repository_graph(repo_id: int, db: AsyncSession = Depends(get_db)):
    repo = await get_repository_by_id(db, repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
        
    repo_dir = os.path.join(settings.REPOS_DIR, str(repo_id))
    return build_architecture_graph(repo_id, repo_dir)

@router.get("/{repo_id}/git-insights")
async def get_repository_git_insights(repo_id: int, db: AsyncSession = Depends(get_db)):
    repo = await get_repository_by_id(db, repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
        
    repo_dir = os.path.join(settings.REPOS_DIR, str(repo_id))
    return get_git_insights(repo_dir)

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
        
    files = discover_files(repo_dir)
    rel_files = [os.path.relpath(f, repo_dir).replace("\\", "/") for f in files]
    return sorted(rel_files)

@router.get("/{repo_id}/file-content")
async def get_file_content(repo_id: int, path: str, db: AsyncSession = Depends(get_db)):
    repo = await get_repository_by_id(db, repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
        
    repo_dir = os.path.join(settings.REPOS_DIR, str(repo_id))
    safe_path = os.path.normpath(path).lstrip("/\\")
    full_path = os.path.join(repo_dir, safe_path)
    if not os.path.abspath(full_path).startswith(os.path.abspath(repo_dir)):
        raise HTTPException(status_code=400, detail="Invalid file path")
        
    if not os.path.exists(full_path) or not os.path.isfile(full_path):
        raise HTTPException(status_code=404, detail="File not found")
        
    try:
        with open(full_path, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()
        return {
            "path": safe_path.replace("\\", "/"),
            "content": content,
            "lines": len(content.splitlines()),
            "language": detect_language(full_path)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read file: {e}")

@router.get("/{repo_id}/overview")
async def get_repository_overview(repo_id: int, db: AsyncSession = Depends(get_db)):
    repo = await get_repository_by_id(db, repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
        
    repo_dir = os.path.join(settings.REPOS_DIR, str(repo_id))
    if not os.path.exists(repo_dir):
        return {"total_files": 0, "languages": {}, "status": repo.status}
        
    files = discover_files(repo_dir)
    
    lang_counter = Counter()
    for f in files:
        lang = detect_language(f)
        lang_counter[lang] += 1
            
    qdrant = get_qdrant_client()
    from qdrant_client.http.models import Filter, FieldCondition, MatchValue
    try:
        res = qdrant.count(
            collection_name=COLLECTION_NAME,
            count_filter=Filter(
                must=[FieldCondition(key="repository_id", match=MatchValue(value=repo_id))]
            )
        )
        total_chunks = res.count
    except Exception:
        total_chunks = len(files) * 3

    return {
        "repository_id": repo.id,
        "name": repo.name,
        "owner": repo.owner,
        "branch": repo.branch,
        "status": repo.status,
        "total_files": len(files),
        "total_chunks": total_chunks,
        "languages": dict(lang_counter.most_common(12))
    }

@router.post("/{repo_id}/audit")
async def run_repository_audit(repo_id: int, db: AsyncSession = Depends(get_db)):
    repo = await get_repository_by_id(db, repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    if repo.status != RepositoryStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Repository is not fully indexed yet.")
        
    audit_queries = [
        "authentication authorization password token secret jwt session", 
        "database query connection sql injection sanitization orm", 
        "error handling exception catch try validation input error",
        "api route controller endpoint request response cors middleware"
    ]
    all_chunks = []
    for q in audit_queries:
        all_chunks.extend(search_repository_vectors(repo_id, q, top_k=4))
        
    seen = set()
    unique_chunks = []
    for c in all_chunks:
        cid = f"{c.get('file_path')}:{c.get('start_line')}"
        if cid not in seen:
            seen.add(cid)
            unique_chunks.append(c)
            
    context_str = ""
    for chunk in unique_chunks[:12]:
        context_str += f"File: {chunk['file_path']} (Lines {chunk['start_line']}-{chunk['end_line']})\nSymbol: {chunk['symbol_name']}\nCode:\n{chunk['source_code']}\n\n"
        
    answer = generate_chat_response(
        "Conduct a comprehensive, production-grade security, architecture, performance, and code quality audit of this repository. "
        "Highlight high-risk security flaws, architectural bottlenecks, error-handling gaps, and concrete recommendations.",
        context_str
    )
    return {
        "repository": f"{repo.owner}/{repo.name}",
        "report": answer,
        "chunks_analyzed": len(unique_chunks[:12])
    }
