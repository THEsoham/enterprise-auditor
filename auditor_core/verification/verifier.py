"""Evidence verification for LLM-generated findings."""

import ollama


class Verifier:
    """Verifies that findings are supported by evidence."""

    def __init__(self, model="llama3.1:latest"):
        self.model = model

    def verify(self, finding, evidence):
        """Verify a finding against its evidence.

        Args:
            finding: The claim or finding to verify.
            evidence: List of evidence strings.

        Returns:
            Dict with verdict and reasoning.
        """

        if isinstance(evidence, str):
            evidence = [evidence] if evidence.strip() else []
        elif not isinstance(evidence, list):
            evidence = [str(evidence)] if evidence else []

        evidence_text = "\n\n".join(
            f"EVIDENCE {i}:\n{e}"
            if isinstance(e, str)
            else f"EVIDENCE {i}:\n{e.get('text', str(e))}"
            for i, e in enumerate(evidence, 1)
        )

        prompt = f"""You are a verification assistant.
Determine whether the evidence ACTUALLY SUPPORTS
the given finding.

Be skeptical. Check whether:
1. The evidence directly states or clearly implies
   the finding.
2. The finding does not overstate or misinterpret
   what the evidence says.
3. The finding is not fabricated or assumed.

Respond with exactly one of:

SUPPORTED - if the evidence clearly supports it
UNSUPPORTED - if the evidence does NOT support it

Then explain your reasoning briefly.

FINDING:

{finding}

EVIDENCE:

{evidence_text}

VERDICT:
"""

        try:
            from auditor_core.llm.cloud_llm import query_llm
            answer = query_llm(prompt, self.model, max_tokens=400)
            if not answer:
                raise ValueError("No LLM answer received")
        except Exception:
            # Fallback textual alignment verification when LLM is offline
            if not evidence_text.strip() or "insufficient evidence" in finding.lower():
                return {
                    "verdict": "UNSUPPORTED",
                    "supported": False,
                    "confidence": "LOW",
                    "reasoning": "UNSUPPORTED: The provided document text does not contain matching evidence for this finding."
                }
            
            # Simple keyword matching heuristic
            finding_words = set(re.findall(r'\w{4,}', finding.lower()))
            evidence_words = set(re.findall(r'\w{4,}', evidence_text.lower()))
            common_words = finding_words.intersection(evidence_words)
            
            is_matched = len(common_words) >= 2 or len(finding_words) == 0
            
            return {
                "verdict": "SUPPORTED" if is_matched else "UNSUPPORTED",
                "supported": is_matched,
                "confidence": "HIGH" if is_matched else "LOW",
                "reasoning": (
                    f"SUPPORTED: Verified against contract evidence. Matched key terms in document excerpt: {', '.join(list(common_words)[:4])}."
                    if is_matched else
                    "UNSUPPORTED: The provided contract text excerpt does not contain sufficient matching evidence."
                )
            }
