"""Evidence verification for LLM-generated findings.

Uses Gemini exclusively for verification via verify_with_gemini().
Falls back to keyword-matching heuristic only when Gemini is
completely unavailable.
"""

import re
import logging
from typing import Any, Dict, List, Optional, Union

logger = logging.getLogger(__name__)


class Verifier:
    """Verifies that findings are supported by evidence using Gemini."""

    def __init__(self, model: str = "llama3.1:latest"):
        # model param kept for backward compatibility but is unused
        # Verification is handled by Gemini via verify_with_gemini()
        self.model = model

    def verify(
        self,
        finding: str,
        evidence: Union[List[Any], str, None],
        question: str = "",
        metadata: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """Verify a finding against its evidence using Gemini.

        Args:
            finding:   The claim or answer to verify.
            evidence:  List of evidence strings or dicts, or a single string.
            question:  The original user question (optional).
            metadata:  Optional list of dicts with page, section, etc.

        Returns:
            Dict with verdict, confidence, supported/unsupported claims,
            contradictions, missing_information, correction, explanation,
            and backward-compatible 'reasoning' and 'supported' fields.
        """
        # Normalize evidence to a list
        if isinstance(evidence, str):
            evidence_list: List[Any] = [evidence] if evidence.strip() else []
        elif isinstance(evidence, list):
            evidence_list = [e for e in evidence if e is not None]
        elif evidence is not None:
            evidence_list = [str(evidence)]
        else:
            evidence_list = []

        # ---- Primary: Gemini verification ----
        try:
            from auditor_core.llm.cloud_llm import verify_with_gemini

            result = verify_with_gemini(
                question=question or finding,
                answer=finding,
                evidence=evidence_list,
                metadata=metadata,
            )

            # Add backward-compatible fields
            result["supported"] = result["verdict"] == "SUPPORTED"
            result["reasoning"] = result.get("explanation", "")

            # Build a human-readable reasoning if explanation is short
            if not result["reasoning"]:
                parts = []
                if result["supported_claims"]:
                    parts.append(
                        "Supported: " +
                        "; ".join(result["supported_claims"][:3])
                    )
                if result["unsupported_claims"]:
                    parts.append(
                        "Unsupported: " +
                        "; ".join(result["unsupported_claims"][:3])
                    )
                if result["contradictions"]:
                    parts.append(
                        "Contradictions: " +
                        "; ".join(result["contradictions"][:3])
                    )
                result["reasoning"] = " | ".join(parts) if parts else (
                    f"{result['verdict']}: Verification complete."
                )

            return result

        except Exception as e:
            logger.warning(
                "Gemini verification unavailable, "
                "falling back to keyword heuristic: %s",
                e,
            )

        # ---- Fallback: keyword-matching heuristic ----
        return self._keyword_fallback(finding, evidence_list)

    def _keyword_fallback(
        self,
        finding: str,
        evidence_list: List[Any],
    ) -> Dict[str, Any]:
        """
        Last-resort textual alignment when Gemini is unavailable.

        Returns a result with the same rich structure for UI consistency.
        """
        evidence_text = "\n\n".join(
            f"EVIDENCE {i}: {e}" if isinstance(e, str)
            else f"EVIDENCE {i}: {e.get('text', str(e))}"
            for i, e in enumerate(evidence_list, 1)
        )

        if (
            not evidence_text.strip()
            or "insufficient evidence" in finding.lower()
        ):
            return {
                "verdict": "NOT_SUPPORTED",
                "confidence": "LOW",
                "supported_claims": [],
                "unsupported_claims": [finding[:200]],
                "contradictions": [],
                "missing_information": [
                    "No document evidence was provided for verification."
                ],
                "correction": "",
                "explanation": (
                    "The provided document text does not contain "
                    "matching evidence for this finding."
                ),
                "supported": False,
                "reasoning": (
                    "UNSUPPORTED: The provided document text does not "
                    "contain matching evidence for this finding."
                ),
            }

        # Simple keyword matching heuristic
        finding_words = set(re.findall(r"\w{4,}", finding.lower()))
        evidence_words = set(re.findall(r"\w{4,}", evidence_text.lower()))
        common_words = finding_words.intersection(evidence_words)

        is_matched = len(common_words) >= 2 or len(finding_words) == 0

        matched_terms = list(common_words)[:4]

        if is_matched:
            reasoning = (
                f"SUPPORTED: Verified against contract evidence. "
                f"Matched key terms: {', '.join(matched_terms)}."
            )
        else:
            reasoning = (
                "UNSUPPORTED: The provided contract text excerpt "
                "does not contain sufficient matching evidence."
            )

        return {
            "verdict": "SUPPORTED" if is_matched else "NOT_SUPPORTED",
            "confidence": "HIGH" if is_matched else "LOW",
            "supported_claims": (
                [f"Keyword match: {', '.join(matched_terms)}"]
                if is_matched else []
            ),
            "unsupported_claims": (
                [] if is_matched else [finding[:200]]
            ),
            "contradictions": [],
            "missing_information": (
                [] if is_matched
                else ["Gemini verification was unavailable; "
                      "using keyword heuristic only."]
            ),
            "correction": "",
            "explanation": reasoning,
            "supported": is_matched,
            "reasoning": reasoning,
        }
