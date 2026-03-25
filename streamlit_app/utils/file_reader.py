from docx import Document

def read_docx(file) -> str:
    doc = Document(file)
    return "\n".join(p.text for p in doc.paragraphs)
