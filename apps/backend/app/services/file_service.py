import os
from typing import Optional
from pypdf import PdfReader

def extract_text_from_pdf(file_path: str) -> str:
    """Extract text from a PDF file."""
    try:
        reader = PdfReader(file_path)
        extracted_text = ""
        for page in reader.pages:
            text = page.extract_text()
            if text:
                extracted_text += text + "\n"
        return extracted_text.strip()
    except Exception as e:
        print(f"Error reading PDF {file_path}: {e}")
        return ""

def process_file_content(file_path: str) -> Optional[dict]:
    """
    Process an uploaded file and return context payload for Gemini.
    For PDFs: return text content.
    For images: return file path and mime type for multimodal input.
    """
    if not os.path.exists(file_path):
        return None
    
    ext = os.path.splitext(file_path)[1].lower()
    
    if ext == ".pdf":
        text = extract_text_from_pdf(file_path)
        return {
            "type": "text",
            "content": f"\n[Attached Document Context from {os.path.basename(file_path)}]:\n{text}\n" if text else ""
        }
    elif ext in [".png", ".jpg", ".jpeg", ".webp"]:
        mime_types = {
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".webp": "image/webp"
        }
        return {
            "type": "image",
            "path": file_path,
            "mime_type": mime_types.get(ext, "image/jpeg")
        }
    return None
