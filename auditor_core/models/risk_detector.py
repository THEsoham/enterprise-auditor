"""Risk detection in contract clauses."""

import json
import re


class RiskDetector:
    """Detects potentially risky provisions in contracts."""

    def __init__(
        self, retriever, reranker, model="qwen2.5:latest"
    ):
        self.retriever = retriever
        self.reranker = reranker
        self.model = model

    def detect(self, document_name, clause_data=None):
        """Detect risks in a contract.

        Args:
            document_name: Source filename.
            clause_data: Optional pre-extracted clauses.
                If None, searches the document directly.

        Returns:
            List of risk findings.
        """

        if clause_data:
            return self._detect_from_clauses(
                document_name, clause_data
            )

        return self._detect_from_search(document_name)

    def _detect_from_clauses(
        self, document_name, clause_data
    ):
        """Detect risks from pre-extracted clauses."""

        findings = []

        for clause_type, data in clause_data.items():

            if not data.get("found"):
                continue

            text = data.get("raw_text") or data.get(
                "text", ""
            )

            if not text:
                continue

            print(f"  Checking risk: {clause_type}...")

            result = self._assess_risk(
                clause_type,
                text,
                document_name,
                data.get("pages", []),
            )

            if result:
                findings.extend(result)

        return findings

    def _detect_from_search(self, document_name):
        """Detect risks by searching directly."""

        query = (
            "risky provisions liability termination "
            "penalties indemnification limitations"
        )

        candidates = self.retriever.search(
            query,
            n_candidates=15,
            document_filter=document_name,
        )

        results = self.reranker.rerank(
            query, candidates, top_k=5
        )

        documents = results["documents"][0]
        metadatas = results["metadatas"][0]

        if not documents:
            return []

        evidence = "\n\n".join(
            f"[Page {m['page']}]\n{doc}"
            for doc, m in zip(documents, metadatas)
        )

        prompt = f"""Analyze this contract for risky provisions.

For each risk found, provide:
- risk_level: HIGH, MEDIUM, or LOW
- clause: which clause type
- finding: what the risk is
- evidence: exact quote from the text

Return a JSON array of risk objects.
If no risks found, return: []

CONTRACT TEXT:

{evidence}

RISKS (JSON array):
"""

        try:
            from auditor_core.llm.cloud_llm import query_llm
            response_text = query_llm(prompt, ollama_model=self.model, max_tokens=800)
            risks = self._parse_json_array(response_text)

        except Exception:
            # Fallback rule-based risk detection over evidence text
            risks = []
            risk_keywords = [
                ("indemnif", "HIGH", "Indemnification & Third-Party Liability Provision"),
                ("unlimited", "HIGH", "Uncapped Exposure / Unlimited Liability Clause"),
                ("terminat", "MEDIUM", "Convenience Termination & Cancellation Terms"),
                ("governing law", "MEDIUM", "Jurisdiction & Governing Law Provisions"),
                ("penalty", "HIGH", "Financial Penalty & Liquidated Damages"),
            ]
            for kw, level, finding_title in risk_keywords:
                for doc, meta in zip(documents, metadatas):
                    if kw in doc.lower():
                        risks.append({
                            "risk_level": level,
                            "clause_type": "contract_risk",
                            "finding": f"{finding_title}: Found match in contract text.",
                            "evidence": doc[:250],
                            "pages": [meta.get("page", 1)]
                        })
                        break

        for risk in risks:
            risk["source"] = document_name

        return risks

    def _assess_risk(
        self, clause_type, text, source, pages
    ):
        """Assess risk for a specific clause."""

        label = clause_type.replace("_", " ")

        prompt = f"""Assess the risk of this {label} clause.

Consider these risk factors:
- Unlimited liability or no cap
- No cure period for breach
- Very short notice periods
- Broad termination rights for one party only
- No indemnification protection
- Weak IP protections
- One-sided obligations
- Missing standard protections
- Automatic renewal without notice
- Broad assignment rights

For each risk, provide:
- risk_level: HIGH, MEDIUM, or LOW
- clause: {clause_type}
- finding: concise description
- evidence: exact supporting quote
- source: {source}
- pages: {pages}

Return a JSON array. If no risks: []

CLAUSE TEXT:

{text}

RISKS (JSON array):
"""

        try:
            from auditor_core.llm.cloud_llm import query_llm
            response_text = query_llm(prompt, self.model, max_tokens=600)
            return self._parse_json_array(response_text)
        except Exception:
            return []

    def _parse_json_array(self, text):
        """Parse JSON array from LLM response."""

        try:
            result = json.loads(text.strip())
            if isinstance(result, list):
                return result
        except (json.JSONDecodeError, ValueError):
            pass

        match = re.search(r"\[.*\]", text, re.DOTALL)

        if match:
            try:
                result = json.loads(match.group())
                if isinstance(result, list):
                    return result
            except (json.JSONDecodeError, ValueError):
                pass

        return []
