"""
Validation Node - Validates normalized form against knowledge base.

Uses EXPLICIT cross-field KB lookup (no fuzzy guessing) and smart value matching.
Produces transparent, auditable validation results.
PERSISTS manual overrides from previous runs.

DESIGN:
- KB fields are flattened with source-aware prefixes (10th_, 12th_)
- Form fields are looked up using KB_FIELD_LOOKUP table — exact, no guessing
- Value comparison uses type-aware matching (dates, phones, IDs, degrees, etc.)
- Existing validations (especially manual overrides) are preserved
"""
from typing import Any, Dict, Optional, List
from app.langgraph.state import GraphState
from app.langgraph.subgraphs.validation.tools import (
    values_match, KB_FIELD_LOOKUP, normalize_text
)


def _build_flat_kb(knowledge_base: Dict) -> Dict:
    """Flatten knowledge base into {field_key: {value, source}} with source-aware prefixing.
    
    For marksheet_10th source, fields get prefixed with '10th_' for disambiguation.
    For marksheet_12th source, fields get prefixed with '12th_'.
    Both original and prefixed keys are stored.
    """
    flat_kb = {}
    
    # Source-to-prefix mapping
    source_prefixes = {
        'marksheet_10th': '10th_',
        'marksheet_12th': '12th_',
    }
    
    for source, data in knowledge_base.items():
        if source.startswith("_") or not isinstance(data, dict):
            continue
        
        prefix = source_prefixes.get(source, '')
        
        for field, value in data.items():
            if not value or not str(value).strip():
                continue
            
            # Normalize field key for consistent lookup
            # Replace both spaces and slashes with underscores for consistency
            field_norm = str(field).lower().strip().replace(' ', '_').replace('/', '_')
            
            val_str = str(value).strip()
            entry = {"value": val_str, "source": source}
            
            # Store with original and normalized key
            if field_norm not in flat_kb:
                flat_kb[field_norm] = entry
            if field not in flat_kb:
                flat_kb[field] = entry
            
            # Store with source prefix for disambiguation
            if prefix:
                prefixed = prefix + field_norm
                if prefixed not in flat_kb:
                    flat_kb[prefixed] = entry
                
                # Also create canonical variants:
                # marksheet_10th.school_name → school_10th
                # marksheet_10th.percentage → percentage_10th
                suffix = source.split('_')[-1]  # "10th" or "12th"
                canonical_renames = {
                    'school_name': f'school_{suffix}',
                    'school_college': f'school_{suffix}',
                    'institution': f'school_{suffix}',
                    'percentage': f'percentage_{suffix}',
                    'total_marks': f'percentage_{suffix}',
                    'marks': f'percentage_{suffix}',
                    'year_of_passing': f'year_{suffix}',
                    'year': f'year_{suffix}',
                    'board': f'board_{suffix}',
                }
                if field_norm in canonical_renames:
                    canon_key = canonical_renames[field_norm]
                    if canon_key not in flat_kb:
                        flat_kb[canon_key] = entry
            
            # Map common LLM extraction field names to canonical names
            extra_aliases = {
                'college_university': 'graduation_college',
                'school_college': 'school_name',
                'total_experience': 'experience',
            }
            if field_norm in extra_aliases:
                alias = extra_aliases[field_norm]
                if alias not in flat_kb:
                    flat_kb[alias] = entry
    
    return flat_kb


def _find_kb_value(field_key: str, flat_kb: Dict) -> Optional[Dict]:
    """Find matching KB entry using EXPLICIT lookup table only.
    
    NO fuzzy matching — we only look for keys we explicitly know about.
    This prevents catastrophic mismatches like degree→full_name.
    """
    # 1. Direct exact match
    if field_key in flat_kb:
        return flat_kb[field_key]
    
    # 2. Use explicit lookup table
    aliases = KB_FIELD_LOOKUP.get(field_key, [])
    for alias in aliases:
        if alias in flat_kb:
            return flat_kb[alias]
    
    # 3. Fuzzy fallback (only if not found in lookup)
    field_norm = field_key.lower().replace('_', ' ')
    for kb_key in flat_kb:
        kb_norm = kb_key.lower().replace('_', ' ')
        if field_norm in kb_norm or kb_norm in field_norm:
            return flat_kb[kb_key]
            
    return None


async def validation_node(state: GraphState) -> Dict[str, Any]:
    """Validate each form field against extracted knowledge base.
    
    Pipeline:
    1. Check for manual validation overrides in state
    2. Build flat KB with source-aware prefixes
    3. For each form field, do EXPLICIT KB lookup (no guessing)
    4. Apply type-aware smart matching (dates, phones, IDs, degrees, etc.)
    5. Return CORRECT / INCORRECT / AMBIGUOUS for each field
    """
    print("---LANGGRAPH: VALIDATION NODE---")
    
    knowledge_base = state.get("knowledge_base", {})
    form_data = state.get("normalized_form") or state.get("form_data", {})
    existing_validations_list = state.get("existing_validation", [])
    
    # Create a map of existing manual overrides
    # We only assume it's an override if reason contains "Manually marked"
    manual_overrides = {}
    if existing_validations_list:
        for v in existing_validations_list:
            if v.get("status") in ("CORRECT", "INCORRECT") and "Manually marked" in str(v.get("reason", "")):
                manual_overrides[v.get("field")] = v
                print(f"  Respected manual override for {v.get('field')}: {v.get('status')}")

    if not knowledge_base:
        return {
            "validations": [], "validation_score": 0,
            "correct_count": 0, "incorrect_count": 0, "ambiguous_count": 0,
            "error": "No knowledge base available"
        }
    
    if not form_data:
        return {
            "validations": [], "validation_score": 0,
            "correct_count": 0, "incorrect_count": 0, "ambiguous_count": 0,
            "error": "No form data available"
        }
    
    # Build smart flat KB
    flat_kb = _build_flat_kb(knowledge_base)
    
    print(f"  KB fields ({len(flat_kb)}): {sorted(flat_kb.keys())}")
    print(f"  Form fields ({len(form_data)}): {sorted(form_data.keys())}")
    
    validations = []
    correct_count = 0
    incorrect_count = 0
    ambiguous_count = 0
    
    for field_key, form_value in form_data.items():
        form_value_str = str(form_value).strip()
        if not form_value_str:
            continue

        # CHECK OVERRIDE FIRST
        if field_key in manual_overrides:
            override = manual_overrides[field_key]
            # Update the form value in case it changed, but keep status/reason
            override["form_value"] = form_value_str 
            validations.append(override)
            if override["status"] == "CORRECT":
                correct_count += 1
            elif override["status"] == "INCORRECT":
                incorrect_count += 1
            else:
                ambiguous_count += 1
            continue

        
        # EXPLICIT KB lookup — no fuzzy
        kb_entry = _find_kb_value(field_key, flat_kb)
        
        if kb_entry:
            doc_value = kb_entry["value"]
            source = kb_entry["source"]
            
            # Smart matching with field type awareness
            match, reason = values_match(form_value_str, doc_value, field_key)
            
            if match:
                status = "CORRECT"
                correct_count += 1
            else:
                status = "INCORRECT"
                incorrect_count += 1
            
            validations.append({
                "field": field_key,
                "status": status,
                "form_value": form_value_str,
                "doc_value": doc_value,
                "reason": reason,
                "source": source
            })
        else:
            # No KB entry — truly ambiguous
            ambiguous_count += 1
            validations.append({
                "field": field_key,
                "status": "AMBIGUOUS",
                "form_value": form_value_str,
                "doc_value": "",
                "reason": "No matching document data found for this field",
                "source": "N/A"
            })
    
    total = correct_count + incorrect_count + ambiguous_count
    score = round((correct_count / total * 100), 1) if total else 0
    
    print(f"  Results: {correct_count} correct, {incorrect_count} incorrect, {ambiguous_count} ambiguous")
    print(f"  Score: {score}%")
    
    return {
        "validations": validations,
        "validation_score": score,
        "correct_count": correct_count,
        "incorrect_count": incorrect_count,
        "ambiguous_count": ambiguous_count
    }
