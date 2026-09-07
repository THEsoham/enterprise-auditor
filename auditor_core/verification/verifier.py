"""Evidence verification for LLM-generated findings."""

import ollama


class Verifier:
    """Verifies that findings are supported by evidence."""

    def __init__(self, model="llama3.1:8b"):
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

            response = ollama.chat(
                model=self.model,
                messages=[
                    {"role": "user", "content": prompt}
                ],
                think=False,
                options={
                    "temperature": 0,
                    "num_predict": 300,
                },
            )

            answer = response["message"].get(
                "content", ""
            ).strip()

        except Exception as e:
            return {
                "verdict": "ERROR",
                "reasoning": f"Verification failed: {e}",
            }

        supported = answer.upper().startswith("SUPPORTED")

        return {
            "verdict": (
                "SUPPORTED" if supported
                else "UNSUPPORTED"
            ),
            "supported": supported,
            "confidence": "HIGH" if supported else "LOW",
            "reasoning": answer,
        }
