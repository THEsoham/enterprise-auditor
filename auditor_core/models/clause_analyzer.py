"""Structured analysis of extracted clauses."""

import json
import re

import ollama


class ClauseAnalyzer:
    """Produces structured fields from raw clause text."""

    def __init__(self, model="qwen2.5:latest"):
        self.model = model

    def analyze(self, clause_data):
        """Analyze all extracted clauses for a document.

        Args:
            clause_data: Dict from ClauseExtractor.extract().

        Returns:
            Dict mapping clause type to structured fields.
        """

        results = {}

        for clause_type, data in clause_data.items():

            if not data["found"]:
                results[clause_type] = {
                    "found": False,
                    "source": data["source"],
                }
                continue

            print(f"  Analyzing: {clause_type}...")

            results[clause_type] = self._analyze_clause(
                clause_type, data
            )

        return results

    def analyze_single(self, clause_type, clause_data):
        """Analyze a single extracted clause."""

        if not clause_data["found"]:
            return {
                "found": False,
                "source": clause_data["source"],
            }

        return self._analyze_clause(
            clause_type, clause_data
        )

    def _analyze_clause(self, clause_type, data):
        """Extract structured fields from clause text."""

        label = clause_type.replace("_", " ")

        prompt = f"""Analyze this {label} clause and extract
structured information.

Return ONLY a JSON object with relevant fields.
Use null for fields that cannot be determined.

For termination: trigger, notice_period, cure_period,
  termination_type
For payment: amount, schedule, currency, late_penalty
For confidentiality: duration, scope, exceptions,
  surviving_termination
For indemnification: indemnifying_party,
  indemnified_party, scope, cap
For liability: limitation, cap, exclusions
For governing law: jurisdiction, dispute_resolution,
  venue
For other clauses: extract the most relevant fields.

Always include: source, pages

CLAUSE TEXT:

{data['text']}

Source: {data['source']}
Pages: {data['pages']}

STRUCTURED JSON:
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
                    "num_predict": 400,
                },
            )

            response_text = response["message"].get(
                "content", ""
            )

            structured = self._parse_json(response_text)

        except Exception:
            structured = {}

        structured["found"] = True
        structured["clause_type"] = clause_type
        structured["source"] = data["source"]
        structured["pages"] = data["pages"]
        structured["raw_text"] = data["text"]

        return structured

    def _parse_json(self, text):
        """Parse JSON from LLM response with fallback."""

        try:
            return json.loads(text.strip())
        except (json.JSONDecodeError, ValueError):
            pass

        match = re.search(r"\{[^{}]*\}", text, re.DOTALL)

        if match:
            try:
                return json.loads(match.group())
            except (json.JSONDecodeError, ValueError):
                pass

        return {}
