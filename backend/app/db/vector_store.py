import os
import json
import numpy as np
import faiss
from typing import List, Dict, Any, Tuple
from app.core.config import settings

class FAISSVectorStore:
    def __init__(self, dimension: int = 768):
        self.dimension = dimension

    def _get_paths(self, document_id: str) -> Tuple[str, str]:
        """Get paths for index and chunk metadata files."""
        base_path = os.path.join(settings.VECTOR_INDEX_DIR, document_id)
        index_path = f"{base_path}.index"
        meta_path = f"{base_path}.json"
        return index_path, meta_path

    def create_index(self, document_id: str, chunks: List[Dict[str, Any]], embeddings: List[List[float]]) -> bool:
        """
        Create a FAISS index and store chunks metadata for a document.
        """
        try:
            if not embeddings:
                return False
                
            index_path, meta_path = self._get_paths(document_id)
            
            # Initialize FAISS index
            # IndexFlatIP uses Inner Product (Cosine Similarity if normalized)
            dimension = len(embeddings[0])
            index = faiss.IndexFlatIP(dimension)
            
            # Convert embeddings to float32 numpy array and normalize
            vectors = np.array(embeddings, dtype=np.float32)
            faiss.normalize_L2(vectors)
            
            # Add vectors to index
            index.add(vectors)
            
            # Write files
            faiss.write_index(index, index_path)
            
            with open(meta_path, "w", encoding="utf-8") as f:
                json.dump(chunks, f, ensure_ascii=False, indent=2)
                
            return True
        except Exception as e:
            # Clean up partial files if error occurs
            self.delete_index(document_id)
            raise RuntimeError(f"Failed to create FAISS index: {str(e)}")

    def search(self, document_id: str, query_embedding: List[float], k: int = 4) -> List[Dict[str, Any]]:
        """
        Search the FAISS index for the most similar chunks.
        """
        index_path, meta_path = self._get_paths(document_id)
        
        if not os.path.exists(index_path) or not os.path.exists(meta_path):
            return []
            
        try:
            # Read index
            index = faiss.read_index(index_path)
            
            # Read metadata
            with open(meta_path, "r", encoding="utf-8") as f:
                chunks = json.load(f)
                
            # Perform search
            query_vector = np.array([query_embedding], dtype=np.float32)
            faiss.normalize_L2(query_vector)
            
            distances, indices = index.search(query_vector, k)
            
            results = []
            # indices[0] contains the indices of the matched items
            # distances[0] contains similarity scores (since normalized, 1.0 is max similarity)
            for idx, dist in zip(indices[0], distances[0]):
                if idx == -1 or idx >= len(chunks):
                    continue
                chunk_info = chunks[idx].copy()
                chunk_info["score"] = float(dist)
                results.append(chunk_info)
                
            return results
        except Exception as e:
            raise RuntimeError(f"Error during vector search: {str(e)}")

    def delete_index(self, document_id: str) -> bool:
        """Delete files associated with a document's vector store index."""
        index_path, meta_path = self._get_paths(document_id)
        deleted = False
        if os.path.exists(index_path):
            os.remove(index_path)
            deleted = True
        if os.path.exists(meta_path):
            os.remove(meta_path)
            deleted = True
        return deleted

    def get_all_chunks(self, document_id: str) -> List[Dict[str, Any]]:
        """Retrieve all text chunks for a document."""
        _, meta_path = self._get_paths(document_id)
        if not os.path.exists(meta_path):
            return []
        try:
            with open(meta_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []

vector_store = FAISSVectorStore()
