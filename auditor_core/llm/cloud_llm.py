"""Multi-Tier LLM Bridge with automatic fallback across OpenAI GPT-4o-mini, Gemini, and Ollama."""

import os
import requests

def _load_env_if_needed():
    """Ensure .env is loaded if API keys are not in os.environ."""
    if not os.environ.get("OPENAI_API_KEY") or not os.environ.get("GEMINI_API_KEY"):
        env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
        if os.path.exists(env_path):
            try:
                with open(env_path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            k, v = line.split("=", 1)
                            k, v = k.strip(), v.strip().strip("'\"")
                            if k and not os.environ.get(k):
                                os.environ[k] = v
            except Exception as e:
                print(f"Notice loading .env file: {e}")

_load_env_if_needed()

OPENAI_KEY = os.environ.get("OPENAI_API_KEY", "")
GEMINI_KEY = os.environ.get("GEMINI_API_KEY", "")


def query_llm(prompt: str, ollama_model: str = "qwen2.5:latest", max_tokens: int = 800) -> str:
    """Query OpenAI (gpt-4o-mini) -> Gemini (3.6-flash/2.0-flash) -> Local Ollama."""
    _load_env_if_needed()

    # Tier 1: OpenAI gpt-4o-mini (Primary Cloud Engine)
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

    # Tier 2: Gemini API
    gem_key = os.environ.get("GEMINI_API_KEY", GEMINI_KEY)
    if gem_key:
        for model_name in ["gemini-3.6-flash", "gemini-2.0-flash", "gemini-2.5-flash"]:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={gem_key}"
                resp = requests.post(
                    url,
                    json={
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {
                            "temperature": 0.2,
                            "maxOutputTokens": max_tokens
                        }
                    },
                    timeout=10
                )
                if resp.status_code == 200:
                    text = resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
                    if text:
                        return text
            except Exception as gem_err:
                print(f"Gemini {model_name} notice: {gem_err}")

    # Tier 3: Local Ollama (Fallback for offline/GPU local runs)
    try:
        import ollama
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
        print(f"Ollama local notice: {e}")

    return ""

