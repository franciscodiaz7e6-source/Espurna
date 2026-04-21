"""Carga y validación de variables de entorno."""
import os
from dotenv import load_dotenv

load_dotenv()


def _req(name: str) -> str:
    v = os.environ.get(name)
    if not v:
        raise RuntimeError(f"Falta la variable de entorno obligatoria: {name}")
    return v


# ---- Telegram ----
TELEGRAM_BOT_TOKEN = _req("TELEGRAM_BOT_TOKEN")
_allowed = os.getenv("TELEGRAM_ALLOWED_USERS", "").strip()
TELEGRAM_ALLOWED_USERS: set[int] | None = (
    {int(x) for x in _allowed.split(",") if x.strip()} if _allowed else None
)

# ---- InfluxDB ----
INFLUX_URL = _req("INFLUX_URL")
INFLUXDB_ADMIN_TOKEN = _req("INFLUXDB_ADMIN_TOKEN")
INFLUX_ORG = _req("INFLUX_ORG")
INFLUX_BUCKET = _req("INFLUX_BUCKET")

INFLUX_MEASUREMENT = os.getenv("INFLUX_MEASUREMENT", "sensor_data")
INFLUX_TEMP_FIELD = os.getenv("INFLUX_TEMP_FIELD", "temperature")
INFLUX_HUMIDITY_FIELD = os.getenv("INFLUX_HUMIDITY_FIELD", "soil_moisture")
INFLUX_NODE_TAG = os.getenv("INFLUX_NODE_TAG", "").strip() or None

# ---- Ollama (OpenAI-compatible) ----
OLLAMA_BASE_URL = _req("OLLAMA_BASE_URL")
OLLAMA_API_KEY = _req("OLLAMA_API_KEY")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gpt-oss:20b")
