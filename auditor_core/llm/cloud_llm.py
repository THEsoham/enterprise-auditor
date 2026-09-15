"""Multi-Tier LLM Bridge with automatic fallback across Ollama, OpenAI GPT-4o-mini, and Gemini 3.6 Flash."""

import os
import requests
import ollama

# Read keys strictly from environment variables or .env
OPENAI_KEY = os.environ.get("OPENAI_API_KEY", "")
GEMINI_KEY = os.environ.get("GEMINI_API_KEY", "")


def query_llm(prompt: str, ollama_model: str = "qwen2.5:latest", max_tokens: int = 800) -> str:
    """Query Ollama -> OpenAI (gpt-4o-mini) -> Gemini (3.6-flash)."""

    # Tier 1: Local Ollama
    try:
        res = ollama.chat(
            model=ollama_model,
            messages=[{"role": "user", "content": prompt}],
            think=False,
            options={"temperature": 0.1, "num_predict": max_tokens}
        )
        content = res["message"].get("content", "").strip()
        if content:
            return content
    except Exception as e:
        print(f"Ollama local notice: {e}, attempting OpenAI fallback...")

    # Tier 2: OpenAI gpt-4o-mini
    oai_key = os.environ.get("OPENAI_API_KEY", OPENAI_KEY)
    if oai_key:
        try:
            resp = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {oai_key}"},
                json={
                    "model": "gpt-4o-mini",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.2,
                    "max_tokens": max_tokens
                },
                timeout=12
            )
            if resp.status_code == 200:
                text = resp.json()["choices"][0]["message"]["content"].strip()
                if text:
                    return text
            else:
                print(f"OpenAI API status {resp.status_code}, attempting Gemini fallback...")
        except Exception as oai_err:
            print(f"OpenAI API fallback notice: {oai_err}")

    # Tier 3: Gemini 3.6 Flash
    gem_key = os.environ.get("GEMINI_API_KEY", GEMINI_KEY)
    if gem_key:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key={gem_key}"
            resp = requests.post(
                url,
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {
                        "temperature": 0.2,
                        "maxOutputTokens": max_tokens
                    }
                },
                timeout=12
            )
            if resp.status_code == 200:
                text = resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
                if text:
                    return text
        except Exception as gem_err:
            print(f"Gemini API fallback notice: {gem_err}")

    return ""
