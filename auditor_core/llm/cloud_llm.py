"""
Cloud LLM bridge — separated responsibilities.

Answer generation:
    OpenAI GPT-4o-mini  (generate_answer)

Verification only:
    Google Gemini        (verify_with_gemini)

Optional local testing:
    Ollama               (disabled by default, never on Render)
"""

import json
import logging
import os
import re
from typing import Any, Dict, List, Optional

import requests


logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# URLs
# ---------------------------------------------------------------------------
OPENAI_URL = "https://api.openai.com/v1/chat/completions"
GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "{model}:generateContent"
)

# ---------------------------------------------------------------------------
# Configurable model names
# ---------------------------------------------------------------------------
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

ENABLE_OLLAMA_FALLBACK = (
    os.getenv("ENABLE_OLLAMA_FALLBACK", "false").lower() == "true"
)

# ---------------------------------------------------------------------------
# Request timeouts  (connect, read) in seconds
# ---------------------------------------------------------------------------
DEFAULT_TIMEOUT = (5, 60)


# ===================================================================
# Key helpers — never log key values
# ===================================================================

def _get_openai_key() -> str:
    return os.getenv("OPENAI_API_KEY", "").strip()


def _get_gemini_key() -> str:
    return os.getenv("GEMINI_API_KEY", "").strip()


# ===================================================================
# Response extractors
# ===================================================================

def _extract_openai_text(data: dict) -> str:
    """Safely extract text from an OpenAI chat-completions response."""
    choices = data.get("choices", [])
    if not choices:
        return ""
    message = choices[0].get("message", {})
    content = message.get("content", "")
    if isinstance(content, str):
        return content.strip()
    return ""


def _extract_gemini_text(data: dict) -> str:
    """Safely extract text from a Gemini generateContent response."""
    candidates = data.get("candidates", [])
    if not candidates:
        return ""
    candidate = candidates[0]
    content = candidate.get("content", {})
    parts = content.get("parts", [])
    text_parts = []
    for part in parts:
        text = part.get("text", "")
        if isinstance(text, str) and text.strip():
            text_parts.append(text.strip())
    return "\n".join(text_parts).strip()


# ===================================================================
# Provider-specific raw API calls
# ===================================================================

def _query_openai(prompt: str, max_tokens: int) -> str:
    """
    Call OpenAI chat-completions API.

    Returns the response text or raises on failure.
    """
    api_key = _get_openai_key()
    if not api_key:
        raise RuntimeError(
            "OpenAI API key is not configured. "
            "Set the OPENAI_API_KEY environment variable."
        )

    try:
        response = requests.post(
            OPENAI_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": OPENAI_MODEL,
                "messages": [
                    {
                        "role": "user",
                        "content": prompt,
                    }
                ],
                "temperature": 0.2,
                "max_tokens": max_tokens,
            },
            timeout=DEFAULT_TIMEOUT,
        )
    except requests.Timeout as error:
        raise RuntimeError(f"OpenAI request timed out: {error}") from error
    except requests.ConnectionError as error:
        raise RuntimeError(
            f"OpenAI connection failed: {error}"
        ) from error
    except requests.RequestException as error:
        raise RuntimeError(f"OpenAI request failed: {error}") from error

    if response.status_code != 200:
        detail = response.text[:500]
        raise RuntimeError(
            f"OpenAI returned HTTP {response.status_code}: {detail}"
        )

    try:
        data = response.json()
    except ValueError as error:
        raise RuntimeError(
            f"OpenAI returned invalid JSON: {error}"
        ) from error

    text = _extract_openai_text(data)
    if not text:
        raise RuntimeError("OpenAI returned an empty response.")

    logger.info("OpenAI [%s] responded successfully.", OPENAI_MODEL)
    return text


def _query_gemini(prompt: str, max_tokens: int) -> str:
    """
    Call Google Gemini generateContent API.

    Returns the response text or raises on failure.
    """
    api_key = _get_gemini_key()
    if not api_key:
        raise RuntimeError(
            "Gemini API key is not configured. "
            "Set the GEMINI_API_KEY environment variable."
        )

    url = GEMINI_URL.format(model=GEMINI_MODEL)

    try:
        response = requests.post(
            url,
            params={"key": api_key},
            headers={
                "Content-Type": "application/json",
            },
            json={
                "contents": [
                    {
                        "role": "user",
                        "parts": [
                            {
                                "text": prompt,
                            }
                        ],
                    }
                ],
                "generationConfig": {
                    "temperature": 0.1,
                    "maxOutputTokens": max_tokens,
                },
            },
            timeout=DEFAULT_TIMEOUT,
        )
    except requests.Timeout as error:
        raise RuntimeError(f"Gemini request timed out: {error}") from error
    except requests.ConnectionError as error:
        raise RuntimeError(
            f"Gemini connection failed: {error}"
        ) from error
    except requests.RequestException as error:
        raise RuntimeError(f"Gemini request failed: {error}") from error

    if response.status_code != 200:
        detail = response.text[:500]
        raise RuntimeError(
            f"Gemini [{GEMINI_MODEL}] returned HTTP "
            f"{response.status_code}: {detail}"
        )

    try:
        data = response.json()
    except ValueError as error:
        raise RuntimeError(
            f"Gemini returned invalid JSON: {error}"
        ) from error

    text = _extract_gemini_text(data)
    if not text:
        raise RuntimeError(
            f"Gemini [{GEMINI_MODEL}] returned an empty response."
        )

    logger.info("Gemini [%s] responded successfully.", GEMINI_MODEL)
    return text


def _query_ollama(
    prompt: str,
    ollama_model: str,
    max_tokens: int,
) -> str:
    """
    Call a local Ollama instance (lazy-imported, disabled by default).

    Returns the response text or raises on failure.
    """
    if not ENABLE_OLLAMA_FALLBACK:
        raise RuntimeError("Ollama fallback is disabled.")

    try:
        import ollama  # noqa: lazy import
    except ImportError as error:
        raise RuntimeError(
            "Ollama package is not installed."
        ) from error

    try:
        response = ollama.chat(
            model=ollama_model,
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            options={
                "temperature": 0.1,
                "num_predict": max_tokens,
            },
        )
    except Exception as error:
        raise RuntimeError(f"Ollama call failed: {error}") from error

    message = response.get("message", {})
    content = message.get("content", "")

    if isinstance(content, str) and content.strip():
        logger.info("Ollama [%s] responded successfully.", ollama_model)
        return content.strip()

    raise RuntimeError(f"Ollama [{ollama_model}] returned an empty response.")


# ===================================================================
# JSON extraction helper for Gemini verification responses
# ===================================================================

def _extract_json_from_response(text: str) -> dict:
    """
    Extract JSON from a response that may be wrapped in markdown fences.

    Handles:
        ```json { ... } ```
        ``` { ... } ```
        raw JSON
    """
    # Try to find JSON inside markdown code fences
    fence_pattern = r"```(?:json)?\s*\n?(.*?)\n?\s*```"
    match = re.search(fence_pattern, text, re.DOTALL)

    if match:
        json_str = match.group(1).strip()
    else:
        # Try raw JSON — find the first { ... } block
        brace_match = re.search(r"\{.*\}", text, re.DOTALL)
        if brace_match:
            json_str = brace_match.group(0)
        else:
            raise ValueError(
                "No JSON object found in Gemini verification response."
            )

    try:
        return json.loads(json_str)
    except json.JSONDecodeError as error:
        raise ValueError(
            f"Malformed JSON in Gemini verification response: {error}"
        ) from error


# ===================================================================
# Public API — Answer generation (OpenAI only)
# ===================================================================

def generate_answer(
    prompt: str,
    ollama_model: str = "qwen2.5:latest",
    max_tokens: int = 800,
) -> str:
    """
    Generate an answer using OpenAI as the primary provider.

    Fallback chain:
        1. OpenAI  (always attempted)
        2. Ollama  (only if ENABLE_OLLAMA_FALLBACK=true)

    Gemini is NEVER used here — it is reserved for verification.

    Raises:
        ValueError:   if prompt is empty.
        RuntimeError:  if all configured providers fail.
    """
    if not isinstance(prompt, str) or not prompt.strip():
        raise ValueError("Prompt must be a non-empty string.")

    prompt = prompt.strip()

    # ---- Tier 1: OpenAI ----
    try:
        text = _query_openai(prompt, max_tokens)
        return text
    except RuntimeError as error:
        logger.warning("OpenAI generation failed: %s", error)

    # ---- Tier 2: Optional Ollama (local testing only) ----
    if ENABLE_OLLAMA_FALLBACK:
        try:
            text = _query_ollama(
                prompt=prompt,
                ollama_model=ollama_model,
                max_tokens=max_tokens,
            )
            return text
        except RuntimeError as error:
            logger.warning("Ollama fallback failed: %s", error)

    raise RuntimeError(
        "Answer generation failed. OpenAI did not return a response. "
        "Check OPENAI_API_KEY, model availability, and network access."
    )


# ===================================================================
# Public API — Verification with Gemini
# ===================================================================

_VERIFICATION_PROMPT_TEMPLATE = """\
You are a strict, skeptical verification assistant.

Your ONLY job is to verify whether an AI-generated answer is supported
by the provided document evidence.

RULES:
1. Only use the evidence provided below.  Do NOT use outside knowledge.
2. Do NOT regenerate or rewrite the answer.
3. Check each claim in the answer against the evidence.
4. If the evidence is insufficient to verify a claim, say so.
5. Never invent document content.

QUESTION:
{question}

AI-GENERATED ANSWER TO VERIFY:
{answer}

DOCUMENT EVIDENCE:
{evidence}

METADATA:
{metadata}

Respond with ONLY a valid JSON object (no markdown fences, no extra text)
using this exact structure:

{{
  "verdict": "SUPPORTED | PARTIALLY_SUPPORTED | NOT_SUPPORTED",
  "confidence": "HIGH | MEDIUM | LOW",
  "supported_claims": ["claim that is backed by evidence", ...],
  "unsupported_claims": ["claim not found in evidence", ...],
  "contradictions": ["claim that contradicts evidence", ...],
  "missing_information": ["important condition or exception missing", ...],
  "correction": "corrected answer only if needed, otherwise empty string",
  "explanation": "brief explanation of the verification reasoning"
}}
"""


def verify_with_gemini(
    question: str,
    answer: str,
    evidence: List[Any],
    metadata: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """
    Verify an OpenAI-generated answer against retrieved evidence using Gemini.

    This function is used exclusively by the "Verify with AI" feature.
    Gemini checks the answer against the supplied evidence only —
    it does NOT use outside knowledge and does NOT regenerate the answer.

    Args:
        question:  The original user question.
        answer:    The answer generated by OpenAI.
        evidence:  The exact document chunks used to generate the answer.
        metadata:  Optional list of dicts with page, section, clause_id, etc.

    Returns:
        Dict with verdict, confidence, supported_claims, unsupported_claims,
        contradictions, missing_information, correction, and explanation.
    """
    # Format evidence
    evidence_parts = []
    for i, chunk in enumerate(evidence, 1):
        if isinstance(chunk, dict):
            text = chunk.get("text", chunk.get("content", str(chunk)))
            source = chunk.get("source", "")
            page = chunk.get("page", "")
            prefix = f"[Source: {source}, Page: {page}]" if source else ""
            evidence_parts.append(f"EVIDENCE {i} {prefix}:\n{text}")
        elif isinstance(chunk, str):
            evidence_parts.append(f"EVIDENCE {i}:\n{chunk}")
        elif chunk is not None:
            evidence_parts.append(f"EVIDENCE {i}:\n{str(chunk)}")

    evidence_text = "\n\n".join(evidence_parts) if evidence_parts else (
        "No document evidence was provided."
    )

    # Format metadata
    if metadata:
        metadata_text = json.dumps(metadata, indent=2, default=str)
    else:
        metadata_text = "No additional metadata available."

    prompt = _VERIFICATION_PROMPT_TEMPLATE.format(
        question=question,
        answer=answer,
        evidence=evidence_text,
        metadata=metadata_text,
    )

    # Default result for error cases
    _empty_result: Dict[str, Any] = {
        "verdict": "NOT_SUPPORTED",
        "confidence": "LOW",
        "supported_claims": [],
        "unsupported_claims": [],
        "contradictions": [],
        "missing_information": [],
        "correction": "",
        "explanation": "",
    }

    try:
        raw_text = _query_gemini(prompt, max_tokens=1200)
    except RuntimeError as error:
        logger.error("Gemini verification failed: %s", error)
        _empty_result["explanation"] = (
            f"Gemini verification unavailable: {error}"
        )
        return _empty_result

    try:
        parsed = _extract_json_from_response(raw_text)
    except ValueError as error:
        logger.warning(
            "Gemini returned non-JSON verification response: %s", error
        )
        # Attempt graceful degradation — use raw text as explanation
        _empty_result["explanation"] = raw_text[:2000]
        # Try to infer verdict from raw text
        upper = raw_text.upper()
        if "SUPPORTED" in upper and "NOT_SUPPORTED" not in upper:
            _empty_result["verdict"] = "SUPPORTED"
            _empty_result["confidence"] = "MEDIUM"
        elif "PARTIALLY" in upper:
            _empty_result["verdict"] = "PARTIALLY_SUPPORTED"
            _empty_result["confidence"] = "MEDIUM"
        return _empty_result

    # Normalize and validate parsed fields
    result: Dict[str, Any] = {
        "verdict": parsed.get("verdict", "NOT_SUPPORTED"),
        "confidence": parsed.get("confidence", "LOW"),
        "supported_claims": parsed.get("supported_claims", []),
        "unsupported_claims": parsed.get("unsupported_claims", []),
        "contradictions": parsed.get("contradictions", []),
        "missing_information": parsed.get("missing_information", []),
        "correction": parsed.get("correction", ""),
        "explanation": parsed.get("explanation", ""),
    }

    # Ensure verdict is one of the expected values
    valid_verdicts = {"SUPPORTED", "PARTIALLY_SUPPORTED", "NOT_SUPPORTED"}
    if result["verdict"] not in valid_verdicts:
        result["verdict"] = "PARTIALLY_SUPPORTED"

    valid_confidence = {"HIGH", "MEDIUM", "LOW"}
    if result["confidence"] not in valid_confidence:
        result["confidence"] = "MEDIUM"

    # Ensure list fields are actually lists
    for key in (
        "supported_claims",
        "unsupported_claims",
        "contradictions",
        "missing_information",
    ):
        if not isinstance(result[key], list):
            result[key] = [str(result[key])] if result[key] else []

    logger.info(
        "Gemini verification complete: verdict=%s, confidence=%s",
        result["verdict"],
        result["confidence"],
    )

    return result


# ===================================================================
# Backward-compatible alias
# ===================================================================

def query_llm(
    prompt: str,
    ollama_model: str = "qwen2.5:latest",
    max_tokens: int = 800,
) -> str:
    """
    Backward-compatible wrapper for generate_answer().

    All existing callers (qa_engine, clause_extractor, risk_detector,
    clause_analyzer, missing_clause, comparator, reranker) continue
    to work unchanged through this alias.

    Routes to OpenAI only.  Gemini is never used for generation.
    """
    return generate_answer(
        prompt=prompt,
        ollama_model=ollama_model,
        max_tokens=max_tokens,
    )