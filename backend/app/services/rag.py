from typing import List, Dict, Any
from app.services.gemini import gemini_service
from app.db.vector_store import vector_store

class RAGOrchestrator:
    @staticmethod
    def answer_question(document_id: str, query: str, history: List[Dict[str, str]] = None) -> Dict[str, Any]:
        """
        Embed query, fetch relevant context, construct prompt with context and history,
        and get answer from Gemini.
        """
        # 1. Embed query
        query_embeddings = gemini_service.get_embeddings([query])
        if not query_embeddings:
            raise RuntimeError("Failed to generate embedding for the search query.")
            
        # 2. Search nearest neighbors in vector DB
        # Fetch top 5 chunks
        context_chunks = vector_store.search(document_id, query_embeddings[0], k=5)
        
        # 3. Format context
        context_text = ""
        sources = []
        for i, chunk in enumerate(context_chunks):
            context_text += f"[Source {i+1} - Page {chunk.get('page')}]: {chunk.get('text')}\n\n"
            sources.append({
                "text": chunk.get('text'),
                "page": chunk.get('page'),
                "score": chunk.get('score')
            })
            
        system_instruction = (
            "You are a helpful and precise AI Study Assistant. You assist students in understanding study materials.\n"
            "Your task is to answer the user's question based strictly on the provided Context text. "
            "For every assertion or fact you state, you MUST cite the source from the context using bracketed numbers, e.g. [1], [2], corresponding to the source index provided in the Context headings.\n"
            "If the Context does not contain the information needed to answer the question, clearly state that the context does not contain this information, and answer using general knowledge while explicitly stating what is not in the text.\n"
            "Ensure the citations are placed immediately after the relevant sentence or claim.\n\n"
            f"--- Context ---\n{context_text}"
        )
        
        # Build message history if provided
        # The new SDK client.models.generate_content can handle a single contents string or list of content.
        # But we can also format the prompt manually to include history.
        # History is: [{"role": "user"|"model", "text": "..."}]
        prompt_with_history = ""
        if history:
            for turn in history:
                role = "Student" if turn.get("role") == "user" else "Assistant"
                prompt_with_history += f"{role}: {turn.get('text')}\n"
        
        prompt_with_history += f"Student: {query}\nAssistant:"
        
        # 5. Generate content
        answer_text = gemini_service.generate_text(
            prompt=prompt_with_history,
            system_instruction=system_instruction
        )
        
        return {
            "answer": answer_text,
            "sources": sources
        }

    @staticmethod
    def answer_question_stream(document_id: str, query: str, history: List[Dict[str, str]] = None):
        """
        Stream RAG answer token-by-token.
        First yields context metadata sources, then yields text tokens.
        Each yielded item is a JSON-line followed by a newline.
        """
        import json
        # 1. Embed query
        query_embeddings = gemini_service.get_embeddings([query])
        if not query_embeddings:
            raise RuntimeError("Failed to generate embedding for the search query.")
            
        # 2. Search nearest neighbors in vector DB
        context_chunks = vector_store.search(document_id, query_embeddings[0], k=5)
        
        # 3. Format context
        context_text = ""
        sources = []
        for i, chunk in enumerate(context_chunks):
            context_text += f"[Source {i+1} - Page {chunk.get('page')}]: {chunk.get('text')}\n\n"
            sources.append({
                "text": chunk.get('text'),
                "page": chunk.get('page'),
                "score": chunk.get('score')
            })
            
        # 4. Construct System Instruction / Prompt
        system_instruction = (
            "You are a helpful and precise AI Study Assistant. You assist students in understanding study materials.\n"
            "Your task is to answer the user's question based strictly on the provided Context text. "
            "For every assertion or fact you state, you MUST cite the source from the context using bracketed numbers, e.g. [1], [2], corresponding to the source index provided in the Context headings.\n"
            "If the Context does not contain the information needed to answer the question, clearly state that the context does not contain this information, and answer using general knowledge while explicitly stating what is not in the text.\n"
            "Ensure the citations are placed immediately after the relevant sentence or claim.\n\n"
            f"--- Context ---\n{context_text}"
        )
        
        prompt_with_history = ""
        if history:
            for turn in history:
                role = "Student" if turn.get("role") == "user" else "Assistant"
                prompt_with_history += f"{role}: {turn.get('text')}\n"
        
        prompt_with_history += f"Student: {query}\nAssistant:"
        
        # 5. First yield the sources JSON event
        yield json.dumps({"type": "sources", "sources": sources}) + "\n"
        
        # 6. Stream content tokens
        try:
            for token in gemini_service.generate_text_stream(prompt_with_history, system_instruction):
                if token:
                    yield json.dumps({"type": "content", "content": token}) + "\n"
        except Exception as e:
            yield json.dumps({"type": "error", "message": str(e)}) + "\n"

rag_orchestrator = RAGOrchestrator()
