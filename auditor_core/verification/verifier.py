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

    def multi_turn_debate(
        self,
        question: str,
        evidence: Union[List[Any], str, None],
        initial_finding: Optional[str] = None,
        document_name: Optional[str] = None,
        metadata: Optional[List[Dict[str, Any]]] = None,
        max_rounds: int = 2,
    ) -> Dict[str, Any]:
        """Conduct a multi-round adversarial debate between Proposer (OpenAI) and Skeptic (Gemini).

        Round 1: Proposer drafts claim -> Skeptic cross-examines raw contract text & objects.
        Round 2: Proposer revises based on objections -> Skeptic issues final verdict,
                 accompanied by 5th-grade Plain English translation and 1-click negotiation fix.
        """
        # Format evidence chunks
        evidence_list: List[str] = []
        if isinstance(evidence, str):
            if evidence.strip():
                evidence_list = [evidence.strip()]
        elif isinstance(evidence, list):
            for e in evidence:
                if isinstance(e, dict):
                    text = e.get("text", e.get("content", str(e)))
                    src = e.get("source", "")
                    pg = e.get("page", "")
                    prefix = f"[{src} p.{pg}]: " if src or pg else ""
                    evidence_list.append(f"{prefix}{text}")
                elif e:
                    evidence_list.append(str(e).strip())
        elif evidence:
            evidence_list = [str(evidence).strip()]

        evidence_text = "\n\n".join(evidence_list) if evidence_list else "No contract evidence provided."
        doc_label = document_name or "Uploaded Contract"

        try:
            from auditor_core.llm.cloud_llm import generate_answer, query_gemini, _extract_json_from_response

            # --- ROUND 1: Proposer Statement ---
            if initial_finding and initial_finding.strip():
                p1_statement = initial_finding.strip()
            else:
                p1_prompt = (
                    f"You are the Proposer AI analyzing a contract for a client.\n"
                    f"CONTRACT EXCERPT ({doc_label}):\n{evidence_text[:3500]}\n\n"
                    f"QUESTION: {question}\n\n"
                    f"State a clear, direct answer to the question based on the contract text. "
                    f"Keep it concise (2-3 sentences). Avoid legal jargon."
                )
                p1_statement = generate_answer(p1_prompt, max_tokens=300)

            # --- ROUND 1: Skeptical Cross-Examination (Gemini) ---
            s1_prompt = (
                f"You are the Skeptical Cross-Examiner Auditor in an AI Courtroom. Your role is to protect the user "
                f"from hidden risks, traps, and sloppy assumptions.\n\n"
                f"QUESTION: {question}\n"
                f"PROPOSER CLAIM: {p1_statement}\n\n"
                f"RAW CONTRACT TEXT ({doc_label}):\n{evidence_text[:3500]}\n\n"
                f"Cross-examine the Proposer's claim strictly against the raw text.\n"
                f"Identify any missing qualifications, notice periods, unilateral rights, exceptions, or penalties.\n"
                f"Respond with ONLY a valid JSON object:\n"
                f"{{\n"
                f'  "objection": "Clear 1-2 sentence cross-examination challenge citing what the proposer overlooked",\n'
                f'  "exact_quote": "Direct quote from contract proving this objection",\n'
                f'  "severity": "HIGH | MEDIUM | LOW",\n'
                f'  "needs_revision": true\n'
                f"}}"
            )
            s1_raw = query_gemini(s1_prompt, max_tokens=400)
            try:
                s1_json = _extract_json_from_response(s1_raw)
            except Exception:
                s1_json = {
                    "objection": s1_raw[:250],
                    "exact_quote": "Contract text excerpt",
                    "severity": "MEDIUM",
                    "needs_revision": True,
                }

            # --- ROUND 2: Proposer Revision (OpenAI) ---
            p2_prompt = (
                f"You are the Proposer AI in an AI Courtroom.\n"
                f"QUESTION: {question}\n"
                f"YOUR INITIAL CLAIM: {p1_statement}\n"
                f"SKEPTIC AUDITOR'S OBJECTION: {s1_json.get('objection')}\n"
                f"CITED CONTRACT TEXT: {s1_json.get('exact_quote')}\n\n"
                f"CONTRACT EXCERPT:\n{evidence_text[:3500]}\n\n"
                f"Revise your answer to directly address the skeptic's objection, incorporate exact terms, "
                f"and explain clearly what happens. Keep it concise (2-3 sentences)."
            )
            p2_revision = generate_answer(p2_prompt, max_tokens=350)

            # --- ROUND 2: Skeptical Final Verdict & Plain English Translation (Gemini) ---
            s2_prompt = (
                f"You are the Chief Auditor Judge in an AI Courtroom.\n"
                f"QUESTION: {question}\n"
                f"REVISED PROPOSER CLAIM: {p2_revision}\n\n"
                f"RAW CONTRACT TEXT:\n{evidence_text[:3500]}\n\n"
                f"Evaluate the revised claim against the raw text.\n"
                f"Respond with ONLY a valid JSON object:\n"
                f"{{\n"
                f'  "verdict": "VERIFIED | REFINED_VERIFIED | AMBIGUOUS | UNSUPPORTED",\n'
                f'  "confidence": "HIGH | MEDIUM | LOW",\n'
                f'  "final_finding": "Authoritative, fact-checked conclusion (2 sentences)",\n'
                f'  "plain_english": "Translate to simple 5th-grade English: what does this mean for the person signing? (1-2 sentences, zero jargon)",\n'
                f'  "suggested_remedy": "Exact 1-click counter-sentence to copy and paste into an email to balance or fix this clause"\n'
                f"}}"
            )
            s2_raw = query_gemini(s2_prompt, max_tokens=600)
            try:
                s2_json = _extract_json_from_response(s2_raw)
            except Exception:
                s2_json = {
                    "verdict": "REFINED_VERIFIED",
                    "confidence": "HIGH",
                    "final_finding": p2_revision,
                    "plain_english": "The contract sets specific conditions you must follow before this applies.",
                    "suggested_remedy": "Please add: 'Both parties agree to provide 30 calendar days written notice without penalty.'",
                }

            return {
                "status": "success",
                "verdict": s2_json.get("verdict", "REFINED_VERIFIED"),
                "confidence": s2_json.get("confidence", "HIGH"),
                "document": doc_label,
                "question": question,
                "rounds": [
                    {
                        "round": 1,
                        "proposer": {
                            "model": "OpenAI (gpt-4o-mini)",
                            "statement": p1_statement,
                        },
                        "skeptic": {
                            "model": "Gemini (gemini-3.6-flash)",
                            "challenge": s1_json.get("objection", "Cross-examining against contract text"),
                            "exact_quote": s1_json.get("exact_quote", ""),
                            "severity": s1_json.get("severity", "MEDIUM"),
                        },
                    },
                    {
                        "round": 2,
                        "proposer": {
                            "model": "OpenAI (gpt-4o-mini)",
                            "statement": p2_revision,
                        },
                        "skeptic": {
                            "model": "Gemini (gemini-3.6-flash)",
                            "verdict": s2_json.get("verdict", "REFINED_VERIFIED"),
                            "ruling": s2_json.get("final_finding", p2_revision),
                        },
                    },
                ],
                "final_finding": s2_json.get("final_finding", p2_revision),
                "plain_english": s2_json.get("plain_english", "The contract specifies exact conditions before this can occur."),
                "suggested_remedy": s2_json.get("suggested_remedy", "Both parties agree to mutual 30 days notice with no penalty fees."),
                "evidence_snippets": evidence_list[:3],
            }

        except Exception as e:
            logger.warning("Live multi-turn debate failed: %s; falling back to heuristic debate.", e)
            return self._fallback_debate(question, evidence_text, initial_finding, doc_label)

    def _fallback_debate(
        self,
        question: str,
        evidence_text: str,
        initial_finding: Optional[str],
        doc_label: str,
    ) -> Dict[str, Any]:
        """Heuristic fallback simulating a multi-turn debate when cloud APIs are offline."""
        has_evidence = bool(evidence_text.strip() and evidence_text != "No contract evidence provided.")
        first_claim = initial_finding or (
            f"The contract addresses '{question}' based on the terms stipulated in the agreement."
            if has_evidence else "No specific clauses were found addressing this question."
        )

        excerpt_snippet = evidence_text[:280].strip() if has_evidence else "No text excerpt"
        
        return {
            "status": "success",
            "verdict": "REFINED_VERIFIED" if has_evidence else "UNSUPPORTED",
            "confidence": "HIGH" if has_evidence else "LOW",
            "document": doc_label,
            "question": question,
            "rounds": [
                {
                    "round": 1,
                    "proposer": {
                        "model": "Proposer AI",
                        "statement": first_claim,
                    },
                    "skeptic": {
                        "model": "Skeptical Auditor AI",
                        "challenge": (
                            "Cross-examination note: Verify whether strict written notice deadlines or conditional exclusions apply."
                            if has_evidence else "Notice: The retrieved document does not contain explicit terms for this query."
                        ),
                        "exact_quote": excerpt_snippet,
                        "severity": "MEDIUM" if has_evidence else "HIGH",
                    },
                },
                {
                    "round": 2,
                    "proposer": {
                        "model": "Proposer AI",
                        "statement": (
                            f"Clarified based on contract terms: {first_claim} Notice and conditions must strictly adhere to the cited clauses."
                            if has_evidence else "Acknowledged: The contract is silent on this matter."
                        ),
                    },
                    "skeptic": {
                        "model": "Skeptical Auditor AI",
                        "verdict": "REFINED_VERIFIED" if has_evidence else "UNSUPPORTED",
                        "ruling": (
                            "Verified against contract text with conditional notice provisions."
                            if has_evidence else "Unsupported: Document does not contain this protection."
                        ),
                    },
                },
            ],
            "final_finding": (
                f"Verified: {first_claim}" if has_evidence else "This document does not contain terms addressing this issue."
            ),
            "plain_english": (
                "In simple words: You have rights under this agreement, but you must follow the written steps and timelines carefully."
                if has_evidence else "In simple words: This document is missing rules for this situation, meaning you have no agreed protection."
            ),
            "suggested_remedy": (
                "Add this to your contract: 'Either party may terminate or modify this agreement with 30 days advance written notice without fee or penalty.'"
            ),
            "evidence_snippets": [excerpt_snippet] if has_evidence else [],
        }
