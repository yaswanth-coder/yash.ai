from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.core.deps import get_current_user
from app.services.rag import get_rag_engine

router = APIRouter(prefix="/rag", tags=["Semantic RAG & Vector Engine"])


class IndexDocumentRequest(BaseModel):
    doc_id: str
    title: str
    content: str
    metadata: Optional[Dict[str, Any]] = {}


class SearchQueryRequest(BaseModel):
    query: str
    top_k: Optional[int] = 3


class SearchResultItem(BaseModel):
    doc_id: str
    doc_title: str
    score: float
    text: str
    metadata: Dict[str, Any]


@router.post("/index")
async def index_document(
    req: IndexDocumentRequest,
    current_user: dict = Depends(get_current_user),
):
    if not req.content.strip():
        raise HTTPException(status_code=400, detail="Document content cannot be empty.")

    engine = get_rag_engine()
    engine.index_document(
        doc_id=req.doc_id,
        title=req.title,
        content=req.content,
        metadata={**req.metadata, "user_id": current_user["_id"]},
    )
    return {"message": f"Successfully indexed '{req.title}' into semantic vector engine."}


@router.post("/search", response_model=List[SearchResultItem])
async def semantic_search(
    req: SearchQueryRequest,
    current_user: dict = Depends(get_current_user),
):
    if not req.query.strip():
        return []

    engine = get_rag_engine()
    results = engine.search(query=req.query, top_k=req.top_k or 3)
    return [
        SearchResultItem(
            doc_id=r["doc_id"],
            doc_title=r["doc_title"],
            score=r["score"],
            text=r["text"],
            metadata=r["metadata"],
        )
        for r in results
    ]
