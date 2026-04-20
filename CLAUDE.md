# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ProjecteEspVRna** is an IoT forest fire early-detection system for the Parc Natural de Collserola. ESP32 sensor nodes communicate via LoRa mesh (Meshtastic protocol), publishing environmental data (temperature, humidity, pressure, air quality) over MQTT to a Docker-based backend stack.

## Backend Services

All backend services live in `backend-server/` and are managed with Docker Compose.

```bash
# Start all services
cd backend-server && docker compose up -d

# Optional LoRaWAN gateway (ChirpStack)
cd backend-server && docker compose -f docker-compose.lorawan.yml up -d

# View logs for a specific service
docker compose logs -f node-red

# Restart a single service
docker compose restart grafana
```

Services and their ports:
| Service | Port(s) |
|---|---|
| Mosquitto (MQTT) | 1883, 8883 (TLS) |
| InfluxDB | 8086 |
| Node-RED | 1880 (proxied at `/nodered/`) |
| Grafana | 3000 |
| Home Assistant | 8123 |
| Nginx | 80, 443, 8443 |
| Web dashboard | Nginx root (`/`) |

Configuration is in `backend-server/.env` (not committed — contains credentials).

## Data Flow

```
ESP32 sensors → LoRa mesh (Meshtastic) → Gateway (Home Assistant TCP/WiFi)
  → MQTT (Mosquitto) → Node-RED (validation & transformation)
  → InfluxDB (bucket: sensor_data, org: ProjecteEspVRna)
  → Grafana dashboards + HTML web dashboard (FireSense)
```

Node-RED flows are in `backend-server/node-red/flows.json`. The flows subscribe to MQTT topics, parse Meshtastic payloads, validate sensor readings, and write to InfluxDB.

## ESP32 Firmware

Hardware: Heltec V4 (ESP32-S3) with BME280/BME690 + PIR sensors. Firmware is built with PlatformIO.

```bash
cd esp32-firmware

# Build
pio run

# Upload to device
pio run --target upload

# Monitor serial output
pio device monitor
```

Key source files:
- `esp32-firmware/src/` — main firmware logic
- `esp32-firmware/lib/BME690/` — sensor library

The firmware runs Meshtastic and attaches sensor readings to mesh packets, which the gateway picks up and forwards to MQTT.

## Architecture Notes

- **MQTT topics**: Meshtastic gateway publishes to `msh/<region>/2/json/...` topics. Node-RED subscribes and routes.
- **InfluxDB schema**: Tags include `node_id` and `location`; fields are the sensor measurements.
- **Nginx** acts as a reverse proxy for Node-RED (`/nodered/`) and serves the static HTML dashboard from `backend-server/mi-web-html/`.
- **Home Assistant** integrates the Meshtastic mesh via TCP connection and acts as the MQTT bridge for mesh data.
- **TLS**: MQTT TLS certs live in `backend-server/mqtt/certs/` (not committed).
- **LoRaWAN** (via `docker-compose.lorawan.yml`) is an optional alternative path using ChirpStack, separate from the primary Meshtastic path.
