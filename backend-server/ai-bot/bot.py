"""FireSense AI Bot — Telegram.

Comandos:
  /start, /help              Ayuda
  /status                    Última lectura cruda
  /risk                      Análisis de riesgo de incendio (últimas 24h)
  /anomalies                 Detección de anomalías (últimas 24h)
  /report [horas]            Informe resumido (por defecto 24h, máx 720h = 30d)
  /ask <pregunta>            Consulta libre (contexto: últimos 7 días agregados)
"""
from __future__ import annotations

import logging
from functools import wraps

from telegram import Update
from telegram.constants import ChatAction, ParseMode
from telegram.ext import Application, CommandHandler, ContextTypes

import config
import prompts
from influx_client import InfluxReader, format_readings
from ollama_client import chat

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s - %(message)s",
)
log = logging.getLogger("firesense-bot")

TELEGRAM_MAX_LEN = 4000  # margen sobre los 4096 oficiales


# ---------- Helpers ----------

def allowed_only(handler):
    """Decorador: si TELEGRAM_ALLOWED_USERS está definido, solo esos IDs pasan."""
    @wraps(handler)
    async def wrapper(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
        if config.TELEGRAM_ALLOWED_USERS is not None:
            uid = update.effective_user.id if update.effective_user else None
            if uid not in config.TELEGRAM_ALLOWED_USERS:
                log.warning("Usuario no autorizado: %s", uid)
                if update.message:
                    await update.message.reply_text("⛔ Acceso no autorizado.")
                return
        return await handler(update, ctx)
    return wrapper


async def _typing(update: Update) -> None:
    if update.message:
        await update.message.chat.send_action(ChatAction.TYPING)


async def _reply(update: Update, text: str) -> None:
    """Envía el texto intentando Markdown; si falla, cae a texto plano. Trocea si es largo."""
    if not update.message:
        return
    for chunk in (text[i:i + TELEGRAM_MAX_LEN] for i in range(0, len(text), TELEGRAM_MAX_LEN)):
        try:
            await update.message.reply_text(chunk, parse_mode=ParseMode.MARKDOWN)
        except Exception:
            await update.message.reply_text(chunk)


async def _ask_model(update: Update, system: str, user_msg: str, temperature: float = 0.3) -> str | None:
    await _typing(update)
    try:
        return await chat(system, user_msg, temperature=temperature)
    except Exception as e:
        log.exception("Error en el modelo")
        await _reply(update, f"❌ Error consultando al modelo: `{e}`")
        return None


# ---------- Handlers ----------

@allowed_only
async def cmd_start(update: Update, _: ContextTypes.DEFAULT_TYPE):
    await _reply(
        update,
        "🔥 *FireSense AI Bot*\n\n"
        "Comandos:\n"
        "• /status — última lectura\n"
        "• /risk — análisis de riesgo de incendio\n"
        "• /anomalies — anomalías de las últimas 24h\n"
        "• /report [horas] — informe (def: 24, máx: 720)\n"
        "• /ask <pregunta> — consulta libre en lenguaje natural\n",
    )


@allowed_only
async def cmd_status(update: Update, _: ContextTypes.DEFAULT_TYPE):
    await _typing(update)
    async with InfluxReader() as r:
        data = await r.latest()
    if not data:
        await _reply(update, "⚠️ No hay lecturas recientes (últimas 3h vacías).")
        return
    await _reply(update, f"📡 *Última lectura:*\n```\n{format_readings(data)}\n```")


@allowed_only
async def cmd_risk(update: Update, _: ContextTypes.DEFAULT_TYPE):
    await _typing(update)
    async with InfluxReader() as r:
        data = await r.range(hours=24)
    if not data:
        await _reply(update, "⚠️ Sin datos en las últimas 24h.")
        return
    user_msg = (
        f"Lecturas de las últimas 24h (TSV):\n{format_readings(data)}\n\n"
        "Evalúa el riesgo de incendio según el formato indicado."
    )
    reply = await _ask_model(update, prompts.RISK_SYSTEM, user_msg)
    if reply:
        await _reply(update, reply)


@allowed_only
async def cmd_anomalies(update: Update, _: ContextTypes.DEFAULT_TYPE):
    await _typing(update)
    async with InfluxReader() as r:
        data = await r.range(hours=24)
    if not data:
        await _reply(update, "⚠️ Sin datos en las últimas 24h.")
        return
    user_msg = (
        f"Serie temporal últimas 24h (TSV):\n{format_readings(data)}\n\n"
        "Identifica anomalías siguiendo el formato indicado."
    )
    reply = await _ask_model(update, prompts.ANOMALY_SYSTEM, user_msg, temperature=0.2)
    if reply:
        await _reply(update, reply)


@allowed_only
async def cmd_report(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    await _typing(update)
    hours = 24
    if ctx.args:
        try:
            hours = max(1, min(720, int(ctx.args[0])))
        except ValueError:
            pass
    async with InfluxReader() as r:
        # rangos largos → agregamos a 1h para no saturar tokens
        data = await (r.aggregated(hours=hours, window="1h") if hours > 48 else r.range(hours=hours))
    if not data:
        await _reply(update, "⚠️ Sin datos en el periodo solicitado.")
        return
    user_msg = (
        f"Periodo: últimas {hours} horas.\n"
        f"Lecturas{' (medias horarias)' if hours > 48 else ''}:\n"
        f"{format_readings(data)}\n\n"
        "Genera el informe según el formato indicado."
    )
    reply = await _ask_model(update, prompts.SUMMARY_SYSTEM, user_msg, temperature=0.2)
    if reply:
        await _reply(update, reply)


@allowed_only
async def cmd_ask(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    question = " ".join(ctx.args).strip() if ctx.args else ""
    if not question:
        await _reply(
            update,
            "Uso: `/ask <pregunta>`\n"
            "Ej: `/ask ¿cuál ha sido la humedad más baja esta semana?`",
        )
        return
    await _typing(update)
    async with InfluxReader() as r:
        data = await r.aggregated(hours=168, window="1h")
    user_msg = (
        f"Datos disponibles (últimos 7 días, medias horarias, TSV):\n"
        f"{format_readings(data)}\n\nPregunta: {question}"
    )
    reply = await _ask_model(update, prompts.QA_SYSTEM, user_msg, temperature=0.2)
    if reply:
        await _reply(update, reply)


# ---------- Main ----------

def main() -> None:
    app = (
        Application.builder()
        .token(config.TELEGRAM_BOT_TOKEN)
        .connect_timeout(30.0)
        .read_timeout(30.0)
        .write_timeout(30.0)
        .pool_timeout(30.0)
        .get_updates_connect_timeout(30.0)
        .get_updates_read_timeout(40.0)
        .build()
    )
    app.add_handler(CommandHandler(["start", "help"], cmd_start))
    app.add_handler(CommandHandler("status", cmd_status))
    app.add_handler(CommandHandler("risk", cmd_risk))
    app.add_handler(CommandHandler("anomalies", cmd_anomalies))
    app.add_handler(CommandHandler("report", cmd_report))
    app.add_handler(CommandHandler("ask", cmd_ask))
    log.info("FireSense AI Bot arrancando (modelo=%s)", config.OLLAMA_MODEL)
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
