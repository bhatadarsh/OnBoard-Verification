from typing import Dict, Any, Tuple
# In a real scenario, we might use guardrails-ai library.
# Here we implement heuristic/regex based guards for robustness.

class SecurityGuard:
    @staticmethod
    def validate_input(text: str) -> Tuple[bool, str]:
        """
        Check for PII leaks or Prompt Injection attempts.
        Returns: (is_safe, reason)
        """
        if not text:
            return False, "Empty input"
            
        # Example: Simple keyword check for potential injection
        # Real system would use a classifier or PII analyzer (e.g., Presidio)
        unsafe_keywords = ["ignore previous instructions", "system prompt", "drop table"]
        if any(k in text.lower() for k in unsafe_keywords):
            return False, "Potential Prompt Injection detected"
            
        return True, "Safe"

    @staticmethod
    def validate_output(data: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Check if the output structure is valid and contains no hallucinated PII.
        """
        if not isinstance(data, dict):
            return False, "Output must be a dictionary"
            
        # Example check
        if "validation_score" in data:
            score = data["validation_score"]
            if not (0 <= score <= 100):
                return False, "Validation score out of range"
                
        return True, "Safe"
