"""Cliente asíncrono de InfluxDB con consultas pre-hechas y un formateador
que convierte los resultados en una tabla de texto compacta para pasarla al LLM."""
from __future__ import annotations

from typing import Any

from influxdb_client.client.influxdb_client_async import InfluxDBClientAsync

import config


class InfluxReader:
    """Context manager async. Uso:
        async with InfluxReader() as r:
            data = await r.range(hours=24)
    """

    def __init__(self) -> None:
        self._client: InfluxDBClientAsync | None = None

    async def __aenter__(self) -> "InfluxReader":
        self._client = InfluxDBClientAsync(
            url=config.INFLUX_URL,
            token=config.INFLUX_TOKEN,
            org=config.INFLUX_ORG,
            timeout=15_000,
        )
        return self

    async def __aexit__(self, *_: Any) -> None:
        if self._client is not None:
            await self._client.close()

    async def _query(self, flux: str) -> list[dict]:
        assert self._client is not None
        tables = await self._client.query_api().query(flux)
        rows: list[dict] = []
        for table in tables:
            for rec in table.records:
                row = {
                    "time": rec.get_time(),
                    "field": rec.get_field(),
                    "value": rec.get_value(),
                }
                if config.INFLUX_NODE_TAG:
                    row["node_id"] = rec.values.get(config.INFLUX_NODE_TAG, "")
                rows.append(row)
        return rows

    def _base_filter(self) -> str:
        return (
            f'|> filter(fn: (r) => r._measurement == "{config.INFLUX_MEASUREMENT}")\n'
            f'|> filter(fn: (r) => r._field == "{config.INFLUX_TEMP_FIELD}" '
            f'or r._field == "{config.INFLUX_HUMIDITY_FIELD}")'
        )

    async def latest(self) -> list[dict]:
        flux = f'''
from(bucket: "{config.INFLUX_BUCKET}")
  |> range(start: -3h)
  {self._base_filter()}
  |> last()
'''
        return await self._query(flux)

    async def range(self, hours: int = 24) -> list[dict]:
        flux = f'''
from(bucket: "{config.INFLUX_BUCKET}")
  |> range(start: -{hours}h)
  {self._base_filter()}
  |> sort(columns: ["_time"])
'''
        return await self._query(flux)

    async def aggregated(self, hours: int = 168, window: str = "1h") -> list[dict]:
        """Medias por ventana. Útil para rangos largos y reducir tokens."""
        flux = f'''
from(bucket: "{config.INFLUX_BUCKET}")
  |> range(start: -{hours}h)
  {self._base_filter()}
  |> aggregateWindow(every: {window}, fn: mean, createEmpty: false)
  |> sort(columns: ["_time"])
'''
        return await self._query(flux)

def format_readings(rows: list[dict], max_points: int = 50) -> str:
    """Pivota formato largo (una fila por campo) a tabla TSV con una fila por timestamp."""
    if not rows:
        return "(sin datos)"

    by_time: dict[str, dict] = {}
    for r in rows:
        t = r["time"].isoformat(timespec="minutes")
        bucket = by_time.setdefault(t, {})
        bucket[r["field"]] = r["value"]
        if "node_id" in r and r["node_id"]:
            bucket["node_id"] = r["node_id"]

    times = sorted(by_time.keys())
    # Submuestreo uniforme si nos pasamos
    if len(times) > max_points:
        step = max(1, len(times) // max_points)
        times = times[::step]

    def fmt(v: Any) -> str:
        if isinstance(v, (int, float)):
            return f"{v:.2f}"
        return str(v) if v is not None else ""

    header_cols = ["timestamp", "temp(°C)", "hum_suelo(%)"]
    if any("node_id" in by_time[t] for t in times):
        header_cols.append("nodo")
        include_node = True
    else:
        include_node = False

    lines = ["\t".join(header_cols)]
    for t in times:
        row = by_time[t]
        parts = [
            t,
            fmt(row.get(config.INFLUX_TEMP_FIELD)),
            fmt(row.get(config.INFLUX_HUMIDITY_FIELD)),
        ]
        if include_node:
            parts.append(str(row.get("node_id", "")))
        lines.append("\t".join(parts))

    return "\n".join(lines)
