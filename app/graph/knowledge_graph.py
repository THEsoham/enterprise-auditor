"""Interactive Knowledge Graph for Contract Intelligence."""

import json
from typing import Dict, List, Any


class KnowledgeGraph:
    """Rich graph representation of contracts, parties, clauses, risks, and properties."""

    def __init__(self):
        self.graph = {}
        self.nodes = []
        self.edges = []

    def build(self, document_name: str, structured_clauses: dict, risks: list = None) -> dict:
        """Build graph nodes and edges for one contract.

        Args:
            document_name: Source filename.
            structured_clauses: Dict from ClauseAnalyzer.analyze().
            risks: Optional list of detected risks.

        Returns:
            Dict with nodes and edges suitable for visualization.
        """
        contract_id = f"doc_{document_name}"
        
        contract_node = {
            "type": "contract",
            "source": document_name,
            "clauses": {},
        }

        # Reset lists for document
        nodes_map = {}
        edges = []

        # 1. Main Contract Node
        nodes_map[contract_id] = {
            "id": contract_id,
            "label": document_name.replace(".pdf", "").replace(".PDF", "")[:28] + "...",
            "full_name": document_name,
            "type": "contract",
            "group": "contract",
            "color": "#3b82f6",
            "size": 26,
        }

        # 2. Add Clause Nodes & Property Nodes
        for clause_type, data in structured_clauses.items():
            if not data.get("found"):
                continue

            clause_id = f"{contract_id}_{clause_type}"
            clause_label = clause_type.replace("_", " ").title()

            nodes_map[clause_id] = {
                "id": clause_id,
                "label": clause_label,
                "type": "clause",
                "group": "clause",
                "color": "#8b5cf6",
                "size": 18,
                "pages": data.get("pages", []),
            }

            edges.append({
                "from": contract_id,
                "to": clause_id,
                "label": "HAS_CLAUSE",
                "color": "#6366f1"
            })

            # Add key property nodes (jurisdictions, notice periods, liability caps)
            for prop_key, prop_val in data.items():
                if prop_key in {"found", "clause_type", "source", "pages", "raw_text", "type"}:
                    continue
                if prop_val is None or prop_val == "" or prop_val == "null":
                    continue

                val_str = str(prop_val)
                if len(val_str) > 40:
                    val_str = val_str[:38] + "..."

                prop_id = f"{clause_id}_{prop_key}"
                nodes_map[prop_id] = {
                    "id": prop_id,
                    "label": f"{prop_key.replace('_', ' ')}: {val_str}",
                    "type": "property",
                    "group": "property",
                    "color": "#06b6d4",
                    "size": 12
                }

                edges.append({
                    "from": clause_id,
                    "to": prop_id,
                    "label": prop_key.replace("_", " ").upper(),
                    "color": "#0ea5e9"
                })

            contract_node["clauses"][clause_type] = data

        # 3. Add Risk Nodes
        if risks:
            for i, r in enumerate(risks):
                risk_id = f"{contract_id}_risk_{i}"
                risk_lvl = (r.get("risk_level") or "MEDIUM").upper()
                r_color = "#ef4444" if risk_lvl == "HIGH" else "#f59e0b"

                nodes_map[risk_id] = {
                    "id": risk_id,
                    "label": f"[{risk_lvl}] {r.get('clause', 'Risk').title()}",
                    "type": "risk",
                    "group": "risk",
                    "color": r_color,
                    "size": 16,
                    "finding": r.get("finding", "")
                }

                edges.append({
                    "from": contract_id,
                    "to": risk_id,
                    "label": "IMPOSES_RISK",
                    "color": r_color
                })

        self.graph[document_name] = contract_node
        graph_data = {
            "document": document_name,
            "nodes": list(nodes_map.values()),
            "edges": edges,
            "stats": {
                "total_nodes": len(nodes_map),
                "total_edges": len(edges),
                "clause_count": len([n for n in nodes_map.values() if n["type"] == "clause"]),
                "risk_count": len([n for n in nodes_map.values() if n["type"] == "risk"])
            }
        }
        return graph_data

    def query(self, document_name: str = None) -> str:
        """Print tree representation of the graph."""
        if document_name:
            if document_name not in self.graph:
                return f"No graph data for: {document_name}"
            return self._format_contract(document_name, self.graph[document_name])

        parts = [self._format_contract(name, data) for name, data in self.graph.items()]
        return "\n\n".join(parts) if parts else "Graph is empty."

    def _format_contract(self, name: str, data: dict) -> str:
        """Format a contract node as a text tree."""
        lines = [f"Contract: {name}"]
        clauses = data.get("clauses", {})
        clause_items = list(clauses.items())

        for i, (ctype, cdata) in enumerate(clause_items):
            is_last = (i == len(clause_items) - 1)
            prefix = " └── " if is_last else " ├── "
            child_pfx = "     " if is_last else " │   "

            lines.append(f"{prefix}has_clause → {ctype}")
            skip = {"type", "clause_type", "pages", "found", "raw_text"}
            props = {k: v for k, v in cdata.items() if k not in skip and v is not None}
            prop_items = list(props.items())

            for j, (key, value) in enumerate(prop_items):
                is_last_p = (j == len(prop_items) - 1)
                p_pfx = " └── " if is_last_p else " ├── "
                val = str(value)
                if len(val) > 60:
                    val = val[:57] + "..."
                lines.append(f"{child_pfx}{p_pfx}{key} → {val}")

        return "\n".join(lines)

    def to_dot(self, graph_data: dict) -> str:
        """Generate a Graphviz DOT representation of the graph."""
        nodes = graph_data.get("nodes", [])
        edges = graph_data.get("edges", [])

        dot_lines = [
            'digraph KnowledgeGraph {',
            '  rankdir=LR;',
            '  bgcolor="#0b0f17";',
            '  node [shape=box, style="filled,rounded", fontname="Helvetica", fontsize=11, fontcolor="#ffffff", penwidth=1.5];',
            '  edge [fontname="Helvetica", fontsize=9, fontcolor="#94a3b8", color="#475569", penwidth=1.2];'
        ]

        for n in nodes:
            nid = n["id"].replace("-", "_").replace(".", "_").replace(" ", "_").replace(":", "_")
            label = n["label"].replace('"', '\\"').replace("\n", " ")
            ntype = n.get("type", "node")

            if ntype == "contract":
                dot_lines.append(f'  "{nid}" [label="{label}", fillcolor="#1e3a8a", color="#3b82f6", fontsize=13, fontcolor="#ffffff"];')
            elif ntype == "clause":
                dot_lines.append(f'  "{nid}" [label="{label}", fillcolor="#4c1d95", color="#8b5cf6"];')
            elif ntype == "risk":
                dot_lines.append(f'  "{nid}" [label="{label}", fillcolor="#7f1d1d", color="#ef4444"];')
            else:
                dot_lines.append(f'  "{nid}" [label="{label}", fillcolor="#083344", color="#06b6d4", fontsize=9];')

        for e in edges:
            from_id = e["from"].replace("-", "_").replace(".", "_").replace(" ", "_").replace(":", "_")
            to_id = e["to"].replace("-", "_").replace(".", "_").replace(" ", "_").replace(":", "_")
            lbl = e.get("label", "")
            color = e.get("color", "#64748b")
            dot_lines.append(f'  "{from_id}" -> "{to_id}" [label="{lbl}", color="{color}"];')

        dot_lines.append('}')
        return '\n'.join(dot_lines)
