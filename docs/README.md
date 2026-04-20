# EspVRna / FireSense

**Prototip de prevenció d'incendis forestals mitjançant sensors IoT a Collserola**

---

## Sobre el projecte

EspVRna/FireSense és un sistema IoT de monitoratge ambiental per a la detecció primerenca de condicions d'incendi forestal. Combina sensors de temperatura, humitat i humitat del sòl desplegats a la serra de Collserola amb un backend de visualització en temps real.

El projecte és el treball de fi de cicle del **CFGS ASIX (especialització Ciberseguretat)** de l'**Institut Tecnològic de Barcelona (ITB)**, curs 2025–2026.

**Autors:**
- **Alejandro Díaz Encalada** — Part MeshCore: firmware RAK4631, Heltec V4 companion, pipeline MQTT→Node-RED→InfluxDB
- **[Hamza Tayibi]** — Part LoRaWAN: ChirpStack v4, gateway RAK WisGate, nodes LoRaWAN

---

## Arquitectura ràpida

```
Sensors (RAK4631 + SHTC3 + RAK12035)
    │
    ├── Via MeshCore (malla LoRa) → Heltec V4 → Home Assistant
    └── Via LoRaWAN (estrella) → RAK WisGate → ChirpStack v4
                                                    │
                               Mosquitto MQTT (TLS :8883)
                                        │
                                    Node-RED
                                        │
                                  InfluxDB v2
                                        │
                              Grafana + FireSense SPA
                                (via Nginx HTTPS)
```

---

## Inici ràpid

```bash
# 1. Xarxa Docker compartida (una vegada)
docker network create shared-net

# 2. Credencials
cp .env.example .env && nano .env

# 3. Certificats MQTT
cd mqtt && bash scripts-certificados-mqtt.sh && bash scripts-contraseñas.sh && cd ..
cp mqtt/certs/ca.crt node-red/ca.crt

# 4. Arrencar
docker compose up -d

# 5. Stack LoRaWAN (opcional)
docker volume create lorawan-gateway_postgres-data
docker volume create lorawan-gateway_redis-data
docker compose -f lorawan-gateway/docker-compose.lorawan.yml up -d
```

Per a instruccions completes, consulta [`docs/06-guia-installacio.md`](docs/06-guia-installacio.md).

---

## Serveis accessibles

Una vegada en marxa, tots els serveis s'accedeixen via HTTPS al domini del servidor:

| Servei | Ruta |
|--------|------|
| Home Assistant | `/` |
| Node-RED | `/nodered/` |
| Grafana | `/grafana/` |
| ChirpStack | `/chirpstack/` |
| FireSense | `/FireSense/` |
| InfluxDB API | `/influxdb/` |

---

## Documentació

| Document | Contingut |
|----------|-----------|
| [`docs/00-resum-executiu.md`](docs/00-resum-executiu.md) | Resum del projecte per a qualsevol lector |
| [`docs/01-introduccio.md`](docs/01-introduccio.md) | Context, motivació i abast |
| [`docs/02-arquitectura-general.md`](docs/02-arquitectura-general.md) | Stack Docker, xarxes, TLS, servidor IsardVDI |
| [`docs/03-meshcore.md`](docs/03-meshcore.md) | Firmware RAK4631, Heltec V4, Node-RED, pipeline MeshCore |
| [`docs/04-lorawan.md`](docs/04-lorawan.md) | ChirpStack, gateway RAK, nodes LoRaWAN |
| [`docs/05-comparativa.md`](docs/05-comparativa.md) | Taula comparativa MeshCore vs LoRaWAN |
| [`docs/06-guia-installacio.md`](docs/06-guia-installacio.md) | Pas a pas per replicar el sistema |
| [`docs/07-conclusions.md`](docs/07-conclusions.md) | Conclusions, limitacions i treball futur |

---

## Tecnologies principals

`Docker` · `Mosquitto MQTT` · `Node-RED` · `InfluxDB v2` · `Grafana` · `Home Assistant` · `ChirpStack v4` · `Nginx` · `RAK4631` · `nRF52840` · `SX1262` · `LoRa 868 MHz` · `MeshCore` · `LoRaWAN EU868` · `CayenneLPP` · `TLS/OpenSSL` · `Flux`
