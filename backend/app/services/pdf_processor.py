import re
from typing import List, Dict, Any
from pypdf import PdfReader

class PDFProcessor:
    @staticmethod
    def extract_text_from_pdf(file_path: str) -> List[Dict[str, Any]]:
        """
        Extract text from a PDF file, keeping track of page numbers.
        Returns a list of dicts: [{"page": 1, "text": "page content..."}]
        """
        pages_content = []
        reader = PdfReader(file_path)
        
        for i, page in enumerate(reader.pages):
            text = page.extract_text()
            if text:
                # Clean up some basic spacing issues
                text = re.sub(r'\s+', ' ', text).strip()
                pages_content.append({
                    "page": i + 1,
                    "text": text
                })
        return pages_content

    @staticmethod
    def chunk_text(pages_content: List[Dict[str, Any]], chunk_size: int = 800, overlap: int = 150) -> List[Dict[str, Any]]:
        """
        Split text into overlapping chunks while tracking which page the chunk originated from.
        """
        chunks = []
        
        for page_data in pages_content:
            page_num = page_data["page"]
            text = page_data["text"]
            
            if len(text) <= chunk_size:
                if len(text) > 20: # Skip very short/empty pages or lines
                    chunks.append({
                        "text": text,
                        "page": page_num
                    })
                continue
                
            start = 0
            while start < len(text):
                end = start + chunk_size
                # Try to adjust end to end of a sentence or space
                if end < len(text):
                    # Find a sentence ending or a space within the last 50 chars of the chunk
                    boundary = -1
                    for offset in range(0, 80):
                        idx = end - offset
                        if idx < len(text) and text[idx] in {'.', '!', '?', '\n', ' '}:
                            boundary = idx + 1
                            break
                    if boundary != -1:
                        end = boundary

                chunk_text = text[start:end].strip()
                if len(chunk_text) > 20:
                    chunks.append({
                        "text": chunk_text,
                        "page": page_num
                    })
                
                start = end - overlap
                if start >= len(text):
                    break
                    
        return chunks
