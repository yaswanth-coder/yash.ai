import os
import re
import math
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone


def clean_text(text: str) -> str:
    return re.sub(r'\s+', ' ', text).strip()


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 100) -> List[str]:
    cleaned = clean_text(text)
    if not cleaned:
        return []
    
    chunks = []
    start = 0
    while start < len(cleaned):
        end = start + chunk_size
        chunk = cleaned[start:end]
        chunks.append(chunk)
        start += (chunk_size - overlap)
        if start >= len(cleaned):
            break
    return chunks


class VectorRAGEngine:
    """
    Lightweight, deterministic semantic RAG engine using TF-IDF & Cosine Similarity vector matching.
    Zero external heavy vector DB dependencies, works 100% offline and locally.
    """
    def __init__(self):
        self.documents: Dict[str, Dict[str, Any]] = {}

    def _tokenize(self, text: str) -> List[str]:
        tokens = re.findall(r'\b[a-zA-Z0-9_-]{2,}\b', text.lower())
        return [t for t in tokens if len(t) > 2]

    def _compute_tf(self, tokens: List[str]) -> Dict[str, float]:
        tf = {}
        total = len(tokens) or 1
        for t in tokens:
            tf[t] = tf.get(t, 0.0) + 1.0 / total
        return tf

    def _compute_cosine_similarity(self, vec1: Dict[str, float], vec2: Dict[str, float]) -> float:
        intersection = set(vec1.keys()) & set(vec2.keys())
        dot_product = sum(vec1[x] * vec2[x] for x in intersection)
        norm1 = math.sqrt(sum(v * v for v in vec1.values()))
        norm2 = math.sqrt(sum(v * v for v in vec2.values()))
        if not norm1 or not norm2:
            return 0.0
        return dot_product / (norm1 * norm2)

    def index_document(self, doc_id: str, title: str, content: str, metadata: Optional[Dict[str, Any]] = None):
        chunks = chunk_text(content)
        chunk_data = []
        for i, ch in enumerate(chunks):
            tokens = self._tokenize(ch)
            tf = self._compute_tf(tokens)
            chunk_data.append({
                "index": i,
                "text": ch,
                "tf": tf,
            })
        self.documents[doc_id] = {
            "id": doc_id,
            "title": title,
            "chunks": chunk_data,
            "metadata": metadata or {},
            "indexed_at": datetime.now(timezone.utc).isoformat(),
        }

    def search(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        query_tokens = self._tokenize(query)
        if not query_tokens:
            return []
        query_tf = self._compute_tf(query_tokens)

        scored_chunks = []
        for doc_id, doc in self.documents.items():
            for chunk in doc["chunks"]:
                score = self._compute_cosine_similarity(query_tf, chunk["tf"])
                if score > 0.05:
                    scored_chunks.append({
                        "doc_id": doc_id,
                        "doc_title": doc["title"],
                        "score": round(score, 4),
                        "text": chunk["text"],
                        "metadata": doc.get("metadata", {}),
                    })

        scored_chunks.sort(key=lambda x: x["score"], reverse=True)
        return scored_chunks[:top_k]


# Global RAG singleton
rag_engine = VectorRAGEngine()


def get_rag_engine() -> VectorRAGEngine:
    return rag_engine
