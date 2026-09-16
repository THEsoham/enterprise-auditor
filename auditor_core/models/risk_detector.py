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
- severity: HIGH, MEDIUM, or LOW
- risk_type: which clause or provision type
- description: concise description of what the legal or commercial risk is
- evidence: exact quote from the contract text
- recommendation: actionable advice to mitigate or renegotiate this risk

Return a JSON array of risk objects using this format:
[
  {{
    "severity": "HIGH",
    "risk_type": "Indemnification",
    "description": "Broad indemnification obligation without financial cap.",
    "evidence": "exact quote here",
    "recommendation": "Negotiate a mutual indemnity and cap liability at contract value."
  }}
]

If no risks found, return: []

CONTRACT TEXT:

{evidence}

RISKS (JSON array):
"""

        try:
            from auditor_core.llm.cloud_llm import query_llm
            response_text = query_llm(prompt, ollama_model=self.model, max_tokens=800)
            raw_risks = self._parse_json_array(response_text)
        except Exception:
            raw_risks = []

        if not raw_risks:
            # Fallback rule-based risk detection over evidence text
            raw_risks = []
            risk_keywords = [
                ("indemnif", "HIGH", "Indemnification & Third-Party Liability Provision", "Introduce mutual indemnity and express monetary cap."),
                ("unlimited", "HIGH", "Uncapped Exposure / Unlimited Liability Clause", "Cap maximum aggregate exposure to fees paid in prior 12 months."),
                ("terminat", "MEDIUM", "Convenience Termination & Cancellation Terms", "Require minimum 30 days written notice and reimbursement for unrecouped costs."),
                ("governing law", "MEDIUM", "Jurisdiction & Governing Law Provisions", "Standardize venue to neutral jurisdiction or mutual dispute resolution."),
                ("penalty", "HIGH", "Financial Penalty & Liquidated Damages", "Convert liquidated damages to actual direct damages with reasonable cap."),
            ]
            for kw, level, finding_title, mitigation in risk_keywords:
                for doc, meta in zip(documents, metadatas):
                    if kw in doc.lower():
                        raw_risks.append({
                            "severity": level,
                            "risk_level": level,
                            "risk_type": finding_title,
                            "clause": "contract_risk",
                            "clause_type": "contract_risk",
                            "description": f"{finding_title}: Identified in contract text.",
                            "finding": f"{finding_title}: Identified in contract text.",
                            "evidence": doc[:250],
                            "recommendation": mitigation,
                            "pages": [meta.get("page", 1)],
                        })
                        break

        normalized = []
        for r in raw_risks:
            if not isinstance(r, dict):
                continue
            lvl = str(r.get("severity") or r.get("risk_level") or "MEDIUM").upper()
            if lvl not in ("HIGH", "MEDIUM", "LOW"):
                lvl = "HIGH" if "HIGH" in lvl else ("LOW" if "LOW" in lvl else "MEDIUM")

            c_type = r.get("risk_type") or r.get("clause") or r.get("clause_type") or "Commercial Risk"
            desc = r.get("description") or r.get("finding") or "Contractual liability detected."
            ev = r.get("evidence") or ""
            rec = r.get("recommendation") or f"Review {c_type} language and request customary mutual protections."

            normalized.append({
                "severity": lvl,
                "risk_level": lvl,
                "risk_type": c_type,
                "clause": c_type,
                "clause_type": c_type,
                "description": desc,
                "finding": desc,
                "evidence": ev,
                "recommendation": rec,
                "document": document_name,
                "source": document_name,
                "pages": r.get("pages", []),
            })

        return normalized

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
            raw = self._parse_json_array(response_text)
            normalized = []
            for r in raw:
                if not isinstance(r, dict):
                    continue
                lvl = str(r.get("severity") or r.get("risk_level") or "MEDIUM").upper()
                if lvl not in ("HIGH", "MEDIUM", "LOW"):
                    lvl = "HIGH" if "HIGH" in lvl else ("LOW" if "LOW" in lvl else "MEDIUM")
                desc = r.get("description") or r.get("finding") or "Risk identified."
                ev = r.get("evidence") or ""
                rec = r.get("recommendation") or f"Standardize {label} terms with mutual safeguards."
                normalized.append({
                    "severity": lvl,
                    "risk_level": lvl,
                    "risk_type": label.title(),
                    "clause": clause_type,
                    "clause_type": clause_type,
                    "description": desc,
                    "finding": desc,
                    "evidence": ev,
                    "recommendation": rec,
                    "document": source,
                    "source": source,
                    "pages": pages,
                })
            return normalized
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
