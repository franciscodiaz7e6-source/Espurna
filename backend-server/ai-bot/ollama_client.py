"""Cliente del modelo (Ollama/OpenAI-compatible).

Usamos el SDK de OpenAI apuntado a tu endpoint de Ollama porque:
  1) Ollama expone /v1/chat/completions compatible con OpenAI.
  2) Cualquier proxy (OpenWebUI, LiteLLM, etc.) suele exponer lo mismo.
  3) Evitamos mantener un cliente HTTP artesanal.
"""
from openai import AsyncOpenAI

import config

_client = AsyncOpenAI(
    base_url=config.OLLAMA_BASE_URL,
    api_key=config.OLLAMA_API_KEY,
    timeout=120.0,
)


async def chat(system: str, user: str, *, temperature: float = 0.3) -> str:
    """Llamada simple system+user. Devuelve el texto de respuesta.

    gpt-oss-20b es un modelo de razonamiento: primero piensa en el campo
    `reasoning` y luego escribe la respuesta final en `content`. Necesita
    bastantes tokens para completar el razonamiento + respuesta.
    """
    resp = await _client.chat.completions.create(
        model=config.OLLAMA_MODEL,
        temperature=temperature,
        max_tokens=4096,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    )
    msg = resp.choices[0].message
    content = (msg.content or "").strip()

    # Si se truncó razonando sin llegar a escribir respuesta,
    # devolvemos el razonamiento como último recurso.
    if not content:
        reasoning = getattr(msg, "reasoning", None) or ""
        if reasoning:
            return (
                "⚠️ El modelo se quedó sin tokens antes de redactar la respuesta "
                "final. Este es su razonamiento interno:\n\n" + reasoning.strip()
            )
        return "⚠️ El modelo devolvió una respuesta vacía."

    return content
