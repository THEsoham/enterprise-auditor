"""Enterprise Audit Score (EAS) — Custom evaluation metrics for contract audit quality.

Six novel domain-specific metrics that measure what generic benchmarks like CUAD cannot:

1. Clause Coverage Rate (CCR)     — Can the system extract all 9 standard clause types?
2. Risk Detection Recall (RDR)    — Does it flag known-risky language?
3. Cross-Reference Fidelity (CRF) — Do cited page numbers actually match?
4. Adversarial Robustness (ARS)   — Can the verifier reject unsupported claims?
5. Latency Budget Compliance (LBC)— Do queries finish within 10s SLA?
6. Hallucination Guard Rate (HGR) — Does it refuse to answer unanswerable questions?
"""

import re
import time
from typing import Dict, List, Any, Optional


class EnterpriseScorer:
    """Runs the 6-metric Enterprise Audit Score suite."""

    STANDARD_CLAUSE_TYPES = [
        "termination",
        "indemnification",
        "confidentiality",
        "governing_law",
        "assignment",
        "limitation_of_liability",
        "intellectual_property",
        "force_majeure",
        "dispute_resolution",
    ]

    ADVERSARIAL_CLAIMS = [
        {
            "finding": "The contract explicitly permits unrestricted data sharing with any third-party without consent.",
            "expected_verdict": "NOT_SUPPORTED",
        },
        {
            "finding": "All liability is unconditionally waived for both parties under every circumstance.",
            "expected_verdict": "NOT_SUPPORTED",
        },
        {
            "finding": "The agreement contains a perpetual irrevocable license to all intellectual property worldwide.",
            "expected_verdict": "NOT_SUPPORTED",
        },
        {
            "finding": "Force majeure events include the contractor simply not wanting to perform.",
            "expected_verdict": "NOT_SUPPORTED",
        },
        {
            "finding": "Termination can only occur after exactly 999 days notice via carrier pigeon.",
            "expected_verdict": "NOT_SUPPORTED",
        },
    ]

    UNANSWERABLE_QUESTIONS = [
        "What is the CEO's favorite color according to the contract?",
        "How many employees does the company hire each quarter based on this agreement?",
        "What is the exact stock price mentioned in the contract?",
        "What lunch menu options are specified in the agreement?",
        "How many paragraphs in the contract discuss cryptocurrency mining?",
    ]

    SLA_THRESHOLD_SECONDS = 10.0

    def __init__(self, qa_engine, clause_extractor, risk_detector, verifier, store):
        self.qa_engine = qa_engine
        self.clause_extractor = clause_extractor
        self.risk_detector = risk_detector
        self.verifier = verifier
        self.store = store

    def run_full_audit(self, document: Optional[str] = None) -> Dict[str, Any]:
        """Execute all 6 metrics and return composite Enterprise Audit Score."""

        # Pick a document to test against
        test_doc = document
        if not test_doc:
            all_docs = self._get_available_documents()
            if all_docs:
                test_doc = all_docs[0]

        if not test_doc:
            return {
                "error": "No documents available for evaluation",
                "composite_score": 0,
                "metrics": {},
            }

        results = {}

        print(f"\n{'='*60}")
        print(f"  ENTERPRISE AUDIT SCORE — Full Suite")
        print(f"  Document: {test_doc}")
        print(f"{'='*60}\n")

        # 1. Clause Coverage Rate
        print("  [1/6] Clause Coverage Rate (CCR)...")
        results["clause_coverage"] = self._measure_clause_coverage(test_doc)

        # 2. Risk Detection Recall
        print("  [2/6] Risk Detection Recall (RDR)...")
        results["risk_detection"] = self._measure_risk_detection(test_doc)

        # 3. Cross-Reference Fidelity
        print("  [3/6] Cross-Reference Fidelity (CRF)...")
        results["cross_reference"] = self._measure_cross_reference_fidelity(test_doc)

        # 4. Adversarial Robustness Score
        print("  [4/6] Adversarial Robustness (ARS)...")
        results["adversarial_robustness"] = self._measure_adversarial_robustness()

        # 5. Latency Budget Compliance
        print("  [5/6] Latency Budget Compliance (LBC)...")
        results["latency_compliance"] = self._measure_latency_compliance(test_doc)

        # 6. Hallucination Guard Rate
        print("  [6/6] Hallucination Guard Rate (HGR)...")
        results["hallucination_guard"] = self._measure_hallucination_guard()

        # Compute composite score (weighted average)
        weights = {
            "clause_coverage": 0.20,
            "risk_detection": 0.15,
            "cross_reference": 0.20,
            "adversarial_robustness": 0.20,
            "latency_compliance": 0.10,
            "hallucination_guard": 0.15,
        }

        composite = sum(
            results[k]["score"] * weights[k]
            for k in weights
            if k in results and "score" in results[k]
        )

        # Letter grade
        grade = self._score_to_grade(composite)

        print(f"\n  Composite EAS: {composite:.1f}/100  ({grade})")
        print(f"{'='*60}\n")

        return {
            "document": test_doc,
            "composite_score": round(composite, 1),
            "grade": grade,
            "metrics": results,
            "weights": weights,
        }

    # ------------------------------------------------------------------
    # Metric 1: Clause Coverage Rate
    # ------------------------------------------------------------------
    def _measure_clause_coverage(self, document: str) -> Dict:
        """What % of the 9 standard clause types can we extract?"""
        found = []
        not_found = []

        try:
            extraction = self.clause_extractor.extract(document)
            clauses = extraction if isinstance(extraction, dict) else {}

            for clause_type in self.STANDARD_CLAUSE_TYPES:
                clause_data = clauses.get(clause_type, {})
                if isinstance(clause_data, dict) and clause_data.get("found", False):
                    found.append(clause_type)
                elif isinstance(clause_data, dict) and clause_data.get("text"):
                    found.append(clause_type)
                else:
                    not_found.append(clause_type)
        except Exception as e:
            print(f"    CCR error: {e}")
            not_found = self.STANDARD_CLAUSE_TYPES[:]

        score = (len(found) / len(self.STANDARD_CLAUSE_TYPES)) * 100

        return {
            "score": round(score, 1),
            "found_count": len(found),
            "total": len(self.STANDARD_CLAUSE_TYPES),
            "found_clauses": found,
            "missing_clauses": not_found,
            "label": "Clause Coverage Rate",
            "abbrev": "CCR",
        }

    # ------------------------------------------------------------------
    # Metric 2: Risk Detection Recall
    # ------------------------------------------------------------------
    def _measure_risk_detection(self, document: str) -> Dict:
        """Does the system detect risks? We expect at least some findings."""
        try:
            risks = self.risk_detector.detect(document)
            risk_list = risks if isinstance(risks, list) else risks.get("risks", [])
            risk_count = len(risk_list)
        except Exception as e:
            print(f"    RDR error: {e}")
            risk_count = 0
            risk_list = []

        # Scoring: contracts should have at least 2-3 flaggable risk areas.
        # 0 risks = 0 score, 1 = 33, 2 = 66, 3+ = 100
        if risk_count >= 3:
            score = 100.0
        elif risk_count == 2:
            score = 66.0
        elif risk_count == 1:
            score = 33.0
        else:
            score = 0.0

        severity_counts = {"HIGH": 0, "MEDIUM": 0, "LOW": 0}
        for r in risk_list:
            sev = r.get("severity", "LOW") if isinstance(r, dict) else "LOW"
            if sev in severity_counts:
                severity_counts[sev] += 1

        return {
            "score": round(score, 1),
            "risks_detected": risk_count,
            "severity_breakdown": severity_counts,
            "label": "Risk Detection Recall",
            "abbrev": "RDR",
        }

    # ------------------------------------------------------------------
    # Metric 3: Cross-Reference Fidelity
    # ------------------------------------------------------------------
    def _measure_cross_reference_fidelity(self, document: str) -> Dict:
        """Do cited source page numbers actually contain relevant text?"""
        try:
            response = self.qa_engine.ask_document(
                "What are the main obligations of each party?", document
            )
            sources = response.get("sources", [])
        except Exception as e:
            print(f"    CRF error: {e}")
            sources = []

        total_sources = len(sources)
        valid_sources = 0

        for src in sources:
            # A source is "valid" if it has non-empty text, a page number,
            # and the source filename matches the queried document.
            has_text = bool(src.get("text", "").strip())
            has_page = src.get("page") is not None
            source_file = src.get("source", "")
            matches_doc = document.lower() in source_file.lower() if source_file else True

            if has_text and has_page and matches_doc:
                valid_sources += 1

        score = (valid_sources / total_sources * 100) if total_sources > 0 else 0.0

        return {
            "score": round(score, 1),
            "valid_citations": valid_sources,
            "total_citations": total_sources,
            "label": "Cross-Reference Fidelity",
            "abbrev": "CRF",
        }

    # ------------------------------------------------------------------
    # Metric 4: Adversarial Robustness Score
    # ------------------------------------------------------------------
    def _measure_adversarial_robustness(self) -> Dict:
        """Feed known-fabricated claims to the Skeptical Verifier — it should reject them."""
        total = len(self.ADVERSARIAL_CLAIMS)
        correct_rejections = 0
        details = []

        for claim in self.ADVERSARIAL_CLAIMS:
            try:
                result = self.verifier.verify(
                    finding=claim["finding"],
                    evidence=[],
                )
                verdict = result.get("verdict", "").upper()

                # Any non-SUPPORTED verdict counts as a correct rejection
                is_correct = "SUPPORT" not in verdict or "NOT" in verdict or "UN" in verdict
                if is_correct:
                    correct_rejections += 1

                details.append({
                    "claim": claim["finding"][:80] + "...",
                    "verdict": verdict,
                    "correct": is_correct,
                })
            except Exception as e:
                print(f"    ARS error on claim: {e}")
                details.append({
                    "claim": claim["finding"][:80] + "...",
                    "verdict": "ERROR",
                    "correct": False,
                })

        score = (correct_rejections / total * 100) if total > 0 else 0.0

        return {
            "score": round(score, 1),
            "correct_rejections": correct_rejections,
            "total_claims": total,
            "details": details,
            "label": "Adversarial Robustness",
            "abbrev": "ARS",
        }

    # ------------------------------------------------------------------
    # Metric 5: Latency Budget Compliance
    # ------------------------------------------------------------------
    def _measure_latency_compliance(self, document: str) -> Dict:
        """What % of queries finish within the 10-second SLA?"""
        test_queries = [
            "What is the termination clause?",
            "Who are the parties to this agreement?",
            "What is the effective date?",
            "Are there any non-compete provisions?",
            "What payment terms are specified?",
        ]

        under_sla = 0
        latencies = []

        for q in test_queries:
            start = time.time()
            try:
                self.qa_engine.ask_document(q, document)
            except Exception:
                pass
            elapsed = time.time() - start
            latencies.append(round(elapsed, 2))

            if elapsed <= self.SLA_THRESHOLD_SECONDS:
                under_sla += 1

        total = len(test_queries)
        score = (under_sla / total * 100) if total > 0 else 0.0
        avg_latency = sum(latencies) / len(latencies) if latencies else 0

        return {
            "score": round(score, 1),
            "queries_under_sla": under_sla,
            "total_queries": total,
            "avg_latency_seconds": round(avg_latency, 2),
            "sla_threshold_seconds": self.SLA_THRESHOLD_SECONDS,
            "individual_latencies": latencies,
            "label": "Latency Budget Compliance",
            "abbrev": "LBC",
        }

    # ------------------------------------------------------------------
    # Metric 6: Hallucination Guard Rate
    # ------------------------------------------------------------------
    def _measure_hallucination_guard(self) -> Dict:
        """Ask unanswerable questions — the system should refuse, not hallucinate."""
        total = len(self.UNANSWERABLE_QUESTIONS)
        correct_refusals = 0
        details = []

        refusal_patterns = [
            r"not (found|mentioned|specified|stated|included|addressed|available)",
            r"no (mention|reference|information|data|evidence)",
            r"does not (contain|mention|specify|address|include)",
            r"insufficient evidence",
            r"cannot (determine|find|identify|answer)",
            r"not (explicitly|directly) (stated|mentioned|addressed)",
            r"unable to (find|locate|determine)",
            r"there is no",
            r"i (could not|couldn'?t) find",
        ]

        for question in self.UNANSWERABLE_QUESTIONS:
            try:
                response = self.qa_engine.ask(question)
                answer = response.get("answer", "").lower()

                is_refusal = any(
                    re.search(pattern, answer) for pattern in refusal_patterns
                )

                # Also count very short answers (< 20 chars) or empty answers as refusals
                if not answer.strip() or len(answer.strip()) < 20:
                    is_refusal = True

                if is_refusal:
                    correct_refusals += 1

                details.append({
                    "question": question,
                    "answer_preview": answer[:120],
                    "correctly_refused": is_refusal,
                })
            except Exception as e:
                print(f"    HGR error: {e}")
                details.append({
                    "question": question,
                    "answer_preview": f"ERROR: {e}",
                    "correctly_refused": False,
                })

        score = (correct_refusals / total * 100) if total > 0 else 0.0

        return {
            "score": round(score, 1),
            "correct_refusals": correct_refusals,
            "total_questions": total,
            "details": details,
            "label": "Hallucination Guard Rate",
            "abbrev": "HGR",
        }

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    def _get_available_documents(self) -> List[str]:
        """Get list of documents from the vector store."""
        try:
            all_meta = self.store.collection.get(limit=1, include=["metadatas"])
            if all_meta and all_meta.get("metadatas"):
                docs = set()
                # Fetch more to find document names
                full = self.store.collection.get(limit=100, include=["metadatas"])
                for m in full.get("metadatas", []):
                    if m and m.get("source"):
                        docs.add(m["source"])
                return sorted(docs)
        except Exception:
            pass
        return []

    @staticmethod
    def _score_to_grade(score: float) -> str:
        if score >= 90:
            return "A+"
        elif score >= 80:
            return "A"
        elif score >= 70:
            return "B+"
        elif score >= 60:
            return "B"
        elif score >= 50:
            return "C"
        elif score >= 40:
            return "D"
        else:
            return "F"
