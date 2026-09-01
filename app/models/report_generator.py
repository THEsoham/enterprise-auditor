"""Executive Audit Memo & Due Diligence Report Generator."""

import time
from datetime import datetime
from typing import Dict, Any


class ReportGenerator:
    """Generates structured due diligence audit reports for contracts."""

    def __init__(self, qa_engine, clause_extractor, clause_analyzer, risk_detector, missing_detector):
        self.qa = qa_engine
        self.extractor = clause_extractor
        self.analyzer = clause_analyzer
        self.risk_detector = risk_detector
        self.missing_detector = missing_detector

    def generate_memo(self, document_name: str) -> Dict[str, Any]:
        """Generate a complete comprehensive legal audit memo.

        Args:
            document_name: Target PDF contract filename.

        Returns:
            Dict containing markdown report, metadata, risk score, and structured summary.
        """
        start_time = time.time()

        # 1. Extract and analyze clauses
        clauses = self.extractor.extract(document_name)
        structured = self.analyzer.analyze(clauses)

        # 2. Risk Detection
        risks = self.risk_detector.detect(document_name)

        # 3. Missing Clauses Audit
        missing_audit = {}
        for ctype in ["governing_law", "indemnification", "limitation_of_liability", "confidentiality", "force_majeure"]:
            chk = self.missing_detector.check(document_name, ctype)
            missing_audit[ctype] = chk.get("status", "NOT_FOUND")

        # 4. Compute Health Score
        found_clauses = sum(1 for c in clauses.values() if c.get("found"))
        high_risks = sum(1 for r in risks if (r.get("risk_level") or "").upper() == "HIGH")
        med_risks = sum(1 for r in risks if (r.get("risk_level") or "").upper() in ["MEDIUM", "MED"])

        # Health score out of 100
        base_score = int((found_clauses / 9) * 60)
        risk_penalty = (high_risks * 15) + (med_risks * 5)
        missing_penalty = sum(8 for s in missing_audit.values() if s == "NOT_FOUND")
        final_score = max(10, min(100, 100 - risk_penalty - missing_penalty + base_score // 3))

        # 5. Build Markdown Audit Memo
        date_str = datetime.now().strftime("%B %d, %Y")
        clean_name = document_name.replace(".pdf", "").replace(".PDF", "")

        memo = f"""# 🏛️ EXECUTIVE LEGAL AUDIT MEMORANDUM

**TO:** Investment Committee & General Counsel  
**FROM:** Enterprise Auditor AI Core  
**DATE:** {date_str}  
**SUBJECT:** Due Diligence Audit & Risk Assessment: `{clean_name}`  
**OVERALL CONTRACT COMPLIANCE SCORE:** **{final_score} / 100** ({'SATISFACTORY' if final_score >= 75 else 'ACTION REQUIRED' if final_score >= 50 else 'HIGH RISK'})

---

## 1. EXECUTIVE SUMMARY
A comprehensive semantic and regulatory audit was executed over `{document_name}` across **9 core commercial covenants**, **risk exposures**, and **market standard protections**.

* **Standard Provisions Identified:** {found_clauses} of 9 core categories
* **Identified Legal Risk Flags:** {len(risks)} findings ({high_risks} High Severity, {med_risks} Medium)
* **Essential Protective Safeguards:** {sum(1 for s in missing_audit.values() if s == 'FOUND')} / {len(missing_audit)} present

---

## 2. KEY COVENANTS & PARAMETER DECOMPOSITION
| Provision Category | Status | Key Extracted Terms / Excerpt |
| :--- | :---: | :--- |
"""
        for ctype, cdata in clauses.items():
            st_badge = "✓ FOUND" if cdata.get("found") else "✗ NOT FOUND"
            excerpt = (cdata.get("text", "")[:120] + "...").replace("\n", " ") if cdata.get("found") else "Provision not explicitly stated."
            memo += f"| **{ctype.replace('_', ' ').title()}** | `{st_badge}` | {excerpt} |\n"

        memo += f"""
---

## 3. IDENTIFIED LEGAL RISK EXPOSURES
"""
        if not risks:
            memo += "✓ **No critical legal anomalies or unilateral exposure flags detected.**\n"
        else:
            for i, r in enumerate(risks, 1):
                lvl = (r.get("risk_level") or "LOW").upper()
                memo += f"### Risk #{i}: [{lvl}] {r.get('clause', 'General').title()}\n"
                memo += f"- **Finding:** {r.get('finding', '')}\n"
                if r.get("evidence"):
                    memo += f"- **Quoted Contract Language:** *\"{r.get('evidence')}\"*\n"

        memo += f"""
---

## 4. MISSING PROTECTIVE CLAUSES AUDIT
| Standard Protection | Safeguard Status | Risk Assessment |
| :--- | :---: | :--- |
"""
        for ctype, status in missing_audit.items():
            rec = "Adequate protection identified." if status == "FOUND" else "⚠️ Recommended to insert standard market safeguard."
            memo += f"| **{ctype.replace('_', ' ').title()}** | `{status}` | {rec} |\n"

        memo += f"""
---

## 5. AUDITOR RECOMMENDATIONS & ACTION ITEMS
1. **Cure & Dispute Management**: Review notice periods and ensure operational capability to meet cure timelines.
2. **Liability Cap Scrutiny**: Ensure liability limitations are mutual and clearly bounded.
3. **Regulatory & Jurisdiction**: Confirm venue and governing law align with corporate policy.

*Audit Generated in {round(time.time() - start_time, 2)}s by Enterprise Auditor Platform.*
"""

        return {
            "document": document_name,
            "compliance_score": final_score,
            "markdown_memo": memo,
            "found_clauses_count": found_clauses,
            "risk_count": len(risks),
            "high_risk_count": high_risks,
            "latency_seconds": round(time.time() - start_time, 2)
        }
