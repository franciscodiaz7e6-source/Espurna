"""Tester interactivo del bot, sin Telegram.

Usa los mismos módulos que el bot (config, influx_client, ollama_client, prompts),
así que si funciona aquí, funciona en el bot.

Uso (dentro del contenedor):
    docker exec -it firesense-ai-bot python test_ai.py ping
    docker exec -it firesense-ai-bot python test_ai.py status
    docker exec -it firesense-ai-bot python test_ai.py risk
    docker exec -it firesense-ai-bot python test_ai.py anomalies
    docker exec -it firesense-ai-bot python test_ai.py report 48
    docker exec -it firesense-ai-bot python test_ai.py ask "¿cuál ha sido la humedad mínima?"
    docker exec -it firesense-ai-bot python test_ai.py raw "Responde solo: pong"
"""
import asyncio
import sys

import config
import prompts
from influx_client import InfluxReader, format_readings
from ollama_client import chat


async def ping() -> None:
    print(f"🔌 Endpoint: {config.OLLAMA_BASE_URL}")
    print(f"🤖 Modelo:   {config.OLLAMA_MODEL}")
    reply = await chat("Eres un asistente breve.", "Responde solo: pong", temperature=0)
    print(f"📨 Respuesta: {reply!r}")


async def status() -> None:
    async with InfluxReader() as r:
        data = await r.latest()
    print(format_readings(data) if data else "(sin datos)")


async def _with_data(hours: int, system: str, instruction: str) -> None:
    async with InfluxReader() as r:
        data = await (r.aggregated(hours=hours, window="1h") if hours > 48 else r.range(hours=hours))
    if not data:
        print("⚠️  Sin datos.")
        return
    table = format_readings(data)
    print(f"📊 Datos ({hours}h, {len(table.splitlines())-1} filas):")
    print(table)
    print("\n" + "─" * 60 + "\n")
    print("🤖 Enviando al modelo...\n")
    reply = await chat(system, f"{instruction}\n\n{table}")
    print(reply)


async def risk() -> None:
    await _with_data(24, prompts.RISK_SYSTEM, "Evalúa el riesgo de incendio con estos datos de las últimas 24h:")


async def anomalies() -> None:
    await _with_data(24, prompts.ANOMALY_SYSTEM, "Identifica anomalías en esta serie de 24h:")


async def report(hours: int = 24) -> None:
    await _with_data(hours, prompts.SUMMARY_SYSTEM, f"Resume estas lecturas de las últimas {hours}h:")


async def ask(question: str) -> None:
    async with InfluxReader() as r:
        data = await r.aggregated(hours=168, window="1h")
    table = format_readings(data)
    user_msg = f"Datos disponibles (7 días, medias horarias):\n{table}\n\nPregunta: {question}"
    reply = await chat(prompts.QA_SYSTEM, user_msg)
    print(reply)


async def raw(prompt_text: str) -> None:
    """Envía un prompt directo al modelo, sin contexto de InfluxDB."""
    reply = await chat("Eres un asistente útil.", prompt_text)
    print(reply)


async def main() -> None:
    if len(sys.argv) < 2:
        print(__doc__)
        return
    cmd = sys.argv[1]
    try:
        if cmd == "ping":
            await ping()
        elif cmd == "status":
            await status()
        elif cmd == "risk":
            await risk()
        elif cmd == "anomalies":
            await anomalies()
        elif cmd == "report":
            await report(int(sys.argv[2]) if len(sys.argv) > 2 else 24)
        elif cmd == "ask":
            await ask(" ".join(sys.argv[2:]) or "¿hay algo que destacar?")
        elif cmd == "raw":
            await raw(" ".join(sys.argv[2:]) or "Hola")
        else:
            print(f"Comando desconocido: {cmd}")
            print(__doc__)
    except Exception as e:
        print(f"❌ {type(e).__name__}: {e}")
        raise


if __name__ == "__main__":
    asyncio.run(main())