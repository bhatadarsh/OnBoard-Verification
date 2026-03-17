"""
LangGraph State - Shared state for the onboarding validation workflow.

This is the central state definition that flows through all nodes:
  input_guard → ingestion → extraction → normalization → validation → output_guard
"""
from typing import TypedDict, Optional, Dict, Any, List


class ValidationResult(TypedDict, total=False):
    """Validation result for a single field."""
    field: str
    status: str  # CORRECT, INCORRECT, AMBIGUOUS
    form_value: str
    doc_value: str
    reason: str


class GraphState(TypedDict, total=False):
    """Complete state passed through the LangGraph workflow.
    
    Flow:
    1. Input: documents (file paths) + form_data (from CSV)
    2. Ingestion: documents → document_texts (raw text via OCR/PDF/DOCX)
    3. Extraction: document_texts → knowledge_base (structured data via LLM)
    4. Normalization: form_data → normalized_form (canonical field names, filtered)
    5. Validation: knowledge_base + normalized_form → validations + scores
    """
    # ---- Input ----
    candidate_id: str
    documents: Dict[str, str]       # {doc_type: file_path}
    form_data: Dict[str, str]       # Raw onboarding form data (from CSV)
    
    # ---- Ingestion (Node 1) ----
    document_texts: Dict[str, str]  # {doc_type: extracted_text}
    
    # ---- Extraction (Node 2) ----
    # Per-source extraction results
    resume_data: Dict[str, str]
    hr_transcript_data: Dict[str, str]
    aadhar_data: Dict[str, str]
    pan_data: Dict[str, str]
    marksheet_10th_data: Dict[str, str]
    marksheet_12th_data: Dict[str, str]
    # Merged knowledge base from all sources
    knowledge_base: Dict[str, Any]
    
    # ---- Normalization (Node 3) ----
    normalized_form: Dict[str, str]  # Canonical field names, filtered
    
    # ---- Validation (Node 4) ----
    validations: List[ValidationResult]
    validation_score: int
    correct_count: int
    incorrect_count: int
    ambiguous_count: int
    
    # ---- Guards ----
    is_safe_input: bool
    is_safe_output: bool
    error: Optional[str]
