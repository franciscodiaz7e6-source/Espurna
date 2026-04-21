# 04 – Part LoRaWAN ([Hamza Tayibi])

> **Nota per a l'autor:** Aquest document té l'estructura preparada. Les seccions marcades amb `[TODO]` s'han d'omplir amb la informació real del teu desplegament. Les parts que provenen del codi del repositori ja estan documentades.

---

## Introducció a LoRaWAN

**LoRaWAN** (*Long Range Wide Area Network*) és un protocol de xarxa de capa MAC dissenyat per a comunicacions IoT de llarg abast i baix consum. A diferència de MeshCore (topologia malla), LoRaWAN usa una **topologia estrella**: els nodes sensor transmeten directament a un gateway central que reenvía les dades a un servidor de xarxa.

### Per què LoRaWAN per a prevenció d'incendis?

| Avantatge | Detall |
|-----------|--------|
| **Estandarditzat** | Protocol obert, compatible amb milers de dispositius |
| **Servidor de xarxa** | ChirpStack gestiona ADR, deduplicació, sessions |
| **Decodificadors** | Payload descodificat al servidor, no al dispositiu |
| **Escalabilitat** | Un gateway pot cobrir centenars de nodes |

---

## Stack tecnològic LoRaWAN del projecte

El stack LoRaWAN corre en un **segon docker-compose** (`lorawan-gateway/docker-compose.lorawan.yml`) que s'uneix al backend compartit via les xarxes Docker `shared-net` i `backend-server_iot-network`.

```mermaid
graph TD
    subgraph CAMP["Zona forestal"]
        NODE["Node LoRaWAN\n[TODO: hardware]"]
    end

    subgraph GATEWAY["Gateway"]
        RAK["RAK WisGate\n10.0.0.28"]
    end

    subgraph LORAWAN_STACK["Stack LoRaWAN (lorawan-gateway/)"]
        CS_MQTT["chirpstack-mqtt\nMosquitto :1884\n(anònim)"]
        CS["ChirpStack v4\n:8080"]
        CS_API["chirpstack-rest-api\n:8090"]
        PG["PostgreSQL 14\nBBDD persistent"]
        REDIS["Redis 7\nCache sessions"]
    end

    subgraph SHARED["Backend compartit"]
        MQTT["Mosquitto MQTT\nTLS :8883"]
        NR["Node-RED"]
        INFLUX["InfluxDB"]
    end

    NODE -->|LoRa EU868| RAK
    RAK -->|UDP/TCP Semtech| CS_MQTT
    CS_MQTT <-->|MQTT intern| CS
    CS --- PG
    CS --- REDIS
    CS --> CS_API
    CS -->|integració MQTT| MQTT
    MQTT -->|subscriu| NR
    NR -->|escriu| INFLUX
```

---

## ChirpStack v4

**ChirpStack** és el servidor de xarxa LoRaWAN de codi obert. La versió 4 és un binari únic que integra servidor de xarxa, servidor d'aplicació i join server.

### Configuració (`lorawan-gateway/chirpstack/chirpstack.toml`)

```toml
[logging]
  level = "info"

[postgresql]
  dsn = "postgres://chirpstack:chirpstack_espurna@postgres/chirpstack?sslmode=disable"

[redis]
  servers = ["redis://redis/"]

[network]
  net_id = "000000"
  enabled_regions = ["eu868"]

[[regions]]
  id = "eu868"
  description = "EU868"
  common_name = "EU868"

  [regions.gateway.backend]
    enabled = "mqtt"
    [regions.gateway.backend.mqtt]
      server = "tcp://chirpstack-mqtt:1883"
      topic_prefix = "eu868"

[integration]
  enabled = ["mqtt"]
  [integration.mqtt]
    server = "tcp://chirpstack-mqtt:1883"

[api]
  bind = "0.0.0.0:8080"
  secret = "${CHIRPSTACK_SECRET}"
```

### Aspectes clau de la configuració

- **Regió EU868**: banda de 868 MHz, obligatòria a Europa. Configura 8 canals (867,1–868,5 MHz).
- **MQTT intern**: ChirpStack es comunica amb el seu propi broker Mosquitto (anònim, sense TLS) per simplicitat interna. El broker extern (TLS) s'usa per a la integració cap a Node-RED.
- **PostgreSQL**: emmagatzema dispositius, aplicacions, gateways i dades de sessions.
- **Redis**: cache de sessions LoRaWAN actives (OTAA/ABP).
- **Secret API**: `espurna_collserola_secret_2026` — **canviar en producció**.

### Canals EU868 configurats (`regions/eu868.toml`)

| Canal | Freqüència | DR min | DR max |
|-------|-----------|--------|--------|
| 1 | 868,1 MHz | DR0 (SF12) | DR5 (SF7) |
| 2 | 868,3 MHz | DR0 | DR5 |
| 3 | 868,5 MHz | DR0 | DR5 |
| 4 | 867,1 MHz | DR0 | DR5 |
| 5 | 867,3 MHz | DR0 | DR5 |
| 6 | 867,5 MHz | DR0 | DR5 |
| 7 | 867,7 MHz | DR0 | DR5 |
| 8 | 867,9 MHz | DR0 | DR5 |

---

## MQTT intern de ChirpStack

El contenidor `chirpstack-mqtt` és un Mosquitto mínim exclusivament per a la comunicació interna entre el gateway RAK i ChirpStack:

```
listener 1883
allow_anonymous true
```

> **Atenció:** Accés anònim acceptable perquè el broker és intern a la xarxa Docker `lorawan-net`. No s'exposa a l'exterior.

### Tòpics MQTT interns de ChirpStack

| Tòpic | Sentit | Contingut |
|-------|--------|-----------|
| `eu868/gateway/{EUI}/event/up` | Gateway → CS | Uplink del sensor |
| `eu868/gateway/{EUI}/command/down` | CS → Gateway | Downlink cap al sensor |
| `application/{id}/device/{EUI}/event/up` | CS → Integració | Payload descodificat |

---

## Gateway RAK WisGate

### Identificació

| Paràmetre | Valor |
|-----------|-------|
| Model | RAK WisGate [TODO: model exacte] |
| IP local | 10.0.0.28 |
| Accés web | `https://10.0.0.28` (proxiat via `/rak/`) |
| Canals LoRa | EU868 |

> L'accés al panell web del RAK WisGate s'exposa via Nginx al path `/rak/` del servidor central, amb proxy SSL que ignora el certificat autosignat del gateway (`proxy_ssl_verify off`).

### Configuració del packet forwarder

[TODO: Documentar la configuració del Semtech UDP Packet Forwarder al RAK WisGate]

```json
{
  "gateway_conf": {
    "server_address": "[TODO: IP del servidor ChirpStack]",
    "serv_port_up": 1700,
    "serv_port_down": 1700
  }
}
```

### Posicionament físic

[TODO: Descriure la ubicació del gateway (laboratori ITB / Collserola), alçada de l'antena, guany, cobertura estimada]

---

## Nodes LoRaWAN

### Hardware dels nodes

[TODO: Documentar el hardware dels nodes LoRaWAN]

| Component | Model | Funció |
|-----------|-------|--------|
| MCU + LoRa | [TODO] | Microcontrolador + ràdio |
| Sensor temperatura/humitat | [TODO] | Mesura ambiental |
| Sensor humitat sòl | [TODO] | Mesura substrat |
| Alimentació | [TODO] | Bateria / solar |

### Paràmetres LoRaWAN dels nodes

[TODO: Omplir amb els valors reals del desplegament]

| Paràmetre | Valor |
|-----------|-------|
| **Tipus d'activació** | OTAA / ABP [TODO] |
| **DevEUI** | [TODO: exemple] |
| **AppEUI / JoinEUI** | [TODO] |
| **AppKey** | [TODO: no posar la clau real, posar XXXX] |
| **Spreading Factor** | SF[TODO] |
| **Bandwidth** | 125 kHz |
| **Potència TX** | [TODO] dBm |

### Cicle de transmissió

[TODO: Descriure la freqüència d'enviament de dades]

```
Cada [TODO] minuts:
  1. Despertar del deep-sleep
  2. Llegir sensors
  3. Construir payload [TODO: format, ex. CayenneLPP / JSON]
  4. Transmetre per LoRaWAN (OTAA join si cal)
  5. Tornar a deep-sleep
```

---

## Firmware dels nodes LoRaWAN

[TODO: Documentar el firmware dels nodes LoRaWAN]

### Plataforma de desenvolupament

[TODO: Arduino IDE / PlatformIO / Zephyr / ...]

### Llibreries principals

[TODO: Ex. LMIC, RadioLib, STM32duino LoRaWAN, ...]

```cpp
// [TODO: Fragment de codi del firmware: inicialització LoRaWAN]
```

### Codificació del payload

[TODO: Descriure el format del payload (CayenneLPP, JSON, binari custom, ...)]

```cpp
// [TODO: Fragment de codi: construcció del payload]
```

---

## Decodificadors de payload a ChirpStack

ChirpStack permet definir **funcions JavaScript** que descodifiquen el payload binari dels nodes i el converteixen en JSON llegible.

### Decodificador configurat

[TODO: Enganxar el codi JavaScript del decodificador configurat a ChirpStack]

```javascript
// [TODO: Codi del codec JavaScript a ChirpStack]
// Exemple per a CayenneLPP:
function decodeUplink(input) {
    // input.bytes = array de bytes del payload
    // Retorna { data: { temperature: ..., humidity: ... } }
    return {
        data: {
            // [TODO]
        }
    };
}
```

### Resultat JSON descodificat (exemple)

```json
{
  "temperature": 27.3,
  "humidity": 45.0,
  "soil_moisture": 18.5
}
```

---

## Integració ChirpStack → MQTT → InfluxDB

ChirpStack publica les dades descodificades al broker MQTT intern. La integració cap al backend compartit segueix el camí:

```mermaid
sequenceDiagram
    participant CS as ChirpStack
    participant CS_MQTT as chirpstack-mqtt<br/>(:1884)
    participant MQTT as Mosquitto TLS<br/>(:8883)
    participant NR as Node-RED
    participant INFLUX as InfluxDB

    CS->>CS_MQTT: Publica payload descodificat
    Note over CS_MQTT,MQTT: [TODO: Pont MQTT o Node-RED<br/>subscrit a chirpstack-mqtt?]
    CS_MQTT->>MQTT: [TODO: mecanisme de pont]
    MQTT->>NR: Event MQTT
    NR->>NR: Valida i transforma
    NR->>INFLUX: Escriu measurement
```

> **[TODO]:** Documentar com les dades passen del broker intern de ChirpStack (`chirpstack-mqtt:1884`) al broker compartit (`mosquitto:8883`). Pot ser via un bridge Mosquitto, un flow separat de Node-RED subscrit directament a `chirpstack-mqtt`, o una altra integració.

---

## API REST de ChirpStack

ChirpStack exposa una API REST completa via `chirpstack-rest-api` (port 8090), accessible des de:

```
https://f5bd4ae6-64ea-466d-990b.372acb14d1b3.isard.nuvulet.itb.cat/chirpstack-api/
```

Nginx afegeix headers CORS oberts (`Access-Control-Allow-Origin: *`) per permetre consultes des del frontend FireSense.

### Exemples d'endpoints útils

[TODO: Documentar els endpoints de l'API que s'usen al projecte]

```bash
# Llistar gateways
GET /chirpstack-api/api/gateways

# Llistar dispositius d'una aplicació
GET /chirpstack-api/api/applications/{id}/devices

# Últim uplink d'un dispositiu
GET /chirpstack-api/api/devices/{devEUI}/events
```

---

## Captures de pantalla de la UI ChirpStack

[TODO: Afegir captures de pantalla de la interfície web de ChirpStack mostrant:
- Dashboard principal
- Llistat de gateways (amb el RAK WisGate registrat)
- Llistat de dispositius
- Detall d'un uplink (amb payload descodificat)
- Configuració del codec/decodificador]

---

## Troubleshooting comú

### El gateway RAK no apareix a ChirpStack

1. Verificar que el packet forwarder del RAK apunta a la IP del servidor i port 1700.
2. Comprovar que `chirpstack-mqtt` i `chirpstack` estan en marxa: `docker-compose -f lorawan-gateway/docker-compose.lorawan.yml ps`
3. Revisar logs: `docker-compose logs -f chirpstack`

### Els nodes no fan join OTAA

1. Verificar que el DevEUI, AppEUI i AppKey del node coincideixen amb els registrats a ChirpStack.
2. Comprovar que la regió EU868 coincideix entre node i servidor.
3. [TODO: altres passos de diagnosi específics del teu hardware]

### Les dades no arriben a InfluxDB

[TODO: Documentar el procés de diagnosi específic de la via LoRaWAN]
