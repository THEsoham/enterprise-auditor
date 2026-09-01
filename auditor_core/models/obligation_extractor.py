"""Obligation & Compliance Deadline Timeline Extractor."""

import re
from typing import Dict, List, Any


class ObligationExtractor:
    """Extracts contractual obligations, deadlines, and notice triggers into a timeline."""

    def __init__(self, qa_engine):
        self.qa = qa_engine

    def extract_obligations(self, document_name: str) -> Dict[str, Any]:
        """Extract post-execution covenants, deadlines, and recurring duties.

        Args:
            document_name: Contract PDF filename.

        Returns:
            Dict containing timeline items and categorized duties.
        """
        # Audit queries targeting operational timelines
        queries = [
            ("notice_periods", "What are all the notice periods, days required for notices, and termination deadlines in this contract?"),
            ("payment_schedule", "What are the payment dates, invoicing frequency, payment grace periods, and late fee terms?"),
            ("reporting_duties", "What reporting obligations, delivery milestones, audit rights, and post-termination duties exist?")
        ]

        timeline_items = []
        raw_findings = {}

        for key, q in queries:
            res = self.qa.ask_document(q, document_name, top_k=3)
            raw_findings[key] = res.get("answer", "")
            
            # Simple heuristic regex for numbers of days/months/years
            text = res.get("answer", "")
            matches = re.findall(r'(\d+|\b(?:thirty|sixty|ninety|ten|fifteen|twenty|forty-five|twelve)\b)\s*(?:business\s*|calendar\s*)?(days?|months?|years?|weeks?|hours?)', text, re.IGNORECASE)
            
            for m in matches:
                qty, unit = m
                timeline_items.append({
                    "category": key.replace("_", " ").title(),
                    "timeframe": f"{qty} {unit}".lower(),
                    "context": text[:180] + "...",
                    "source": document_name
                })

        return {
            "document": document_name,
            "timeline_items": timeline_items[:8],
            "raw_findings": raw_findings
        }
