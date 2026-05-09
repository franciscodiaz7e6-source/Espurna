# 08 – Dashboard Web EspVRna

## Descripció general

El dashboard web és la interfície principal del sistema Espvrna. Permet als operadors (Bombers de la Generalitat, gestors del Parc de Collserola) monitoritzar en temps real l'estat de tots els nodes sensor, visualitzar dades històriques i detectar riscos d'incendi.

**URL pública:** `https://f0929359-581e-4924-906b.353de71f3930.isard.nuvulet.itb.cat/Espvrna/`

**Tecnologies:** HTML5 · CSS3 · JavaScript vanilla · Leaflet.js · CesiumJS · Chart.js · Nginx (Docker)

---

## Rutes i endpoints

### Frontend (Nginx)

| Ruta | Descripció |
|------|-------------|
| `/Espvrna/` | Pàgina principal del dashboard |
| `/Espvrna/index.html` | HTML principal amb tots els panells |

### Proxy APIs (Nginx → Docker)

| Ruta | Servei destí | Descripció |
|------|---------------|-------------|
| `/influxdb/` | `influxdb:8086` | Proxy a InfluxDB v2. El frontend fa queries Flux directament |
| `/chirpstack-api/` | `chirpstack-rest-api:8090` | API REST de ChirpStack (estat gateway, nodes LoRaWAN) |
| `/secure/influx/` | `influxdb:8086` | Proxy amb token injectat pel servidor (sense exposar token al client) |
| `/secure/chirpstack/` | `chirpstack-rest-api:8090` | Proxy amb JWT injectat (sense exposar clau al client) |
| `/rpi-ping` | `100.89.52.39:5051` | Health check de la Raspberry Pi bridge |

---

## Fitxers del projecte

```text
mi-web-html-espurna/
├── index.html          # HTML principal, estructura dels panells
├── js/
│   ├── config.js       # Nodes LoRaWAN i MeshCore, constants globals
│   ├── data.js         # fetchNode, fetchAllNodes, queries InfluxDB
│   ├── ui.js           # renderGrid, selNode, dashboard, historial
│   ├── map.js          # Generat via envsubst des de map.js.template
│   ├── map.js.template # Leaflet + CesiumJS, markers, popups, coordsBar
│   ├── app.js          # Inicialització, arrencada de l'app
│   ├── poll.js         # Smart poll (10s normal, 2s fast window)
│   ├── helpers.js      # timeSince, isOnline, hexAlpha, colors
│   ├── canvas.js       # Animació packets LoRa al canvas
│   ├── rf_coverage.js  # Cobertura RF, zones de Fresnel, anàlisi LOS
│   ├── rf_buildings.js # Edificis per anàlisi RF
│   └── rf_multi.js     # Multi-node RSSI, ITU-R P.1411
├── css/
│   └── styles.css      # Estils neon/cyberpunk
└── nginx/
    ├── default.conf    # Configuració Nginx, proxy /rpi-ping
    └── entrypoint.sh   # Genera map.js via envsubst en arrencar
```

---

## Funcionalitats principals

### Mode LoRaWAN

- Visualització de 5 nodes RAK4631 al mapa Leaflet 2D / CesiumJS 3D
- Dades en temps real: temperatura, humitat aire, humitat sòl, bateria, RSSI/SNR
- Historial fins a 1 any amb gràfics Chart.js
- Estat del gateway RAK7289V2 via API ChirpStack
- Exportació CSV de dades històriques

### Mode MeshCore

- Visualització de 5 nodes (1 gateway, 2 repetidors, 2 sensors) al mapa
- Dades en temps real: temperatura aire, humitat aire, humitat sòl, temperatura sòl, bateria
- Gràfic combinat Hum.Sòl + T.Sòl amb doble eix Y
- Indicador de connectivitat Raspberry Pi bridge (ping live)
- Historial amb data, hora, i totes les mesures

### Anàlisi RF

- Cobertura de senyal amb zones de Fresnel
- Anàlisi Line of Sight (LOS) entre nodes
- Model ITU-R P.1411 per pèrdua de propagació

### Panell de risc

- Indicador automàtic: NORMAL / MODERAT / CRÍTIC
- Criteris:
  - temperatura > 35°C → MODERAT
  - temperatura > 40°C → CRÍTIC
  - humitat sòl < 15% → MODERAT (sòl sec = risc alt d'incendi)

---

## Variables d'entorn (`.env`)

| Variable | Descripció |
|----------|-------------|
| `INFLUX_TOKEN` | Token d'autenticació InfluxDB v2 |
| `CHIRPSTACK_KEY` | JWT per a l'API REST de ChirpStack |
| `MAPTILER_KEY` | Clau API MapTiler (mapes cartogràfics) |
| `CESIUM_TOKEN` | Token Cesium Ion (mapes 3D fotorealistes) |
| `MAPBOX_TOKEN` | Token Mapbox (capes addicionals) |

---

## Com regenerar `map.js`

El fitxer `map.js` conté tokens API i es genera automàticament en arrencar el contenidor. Per regenerar manualment:

```bash
cd /home/isard/ProjecteEspVRna_IOTs/backend-server

export $(grep -v '^#' .env | xargs)

envsubst '${INFLUX_TOKEN} ${CHIRPSTACK_KEY} ${MAPTILER_KEY} ${CESIUM_TOKEN} ${MAPBOX_TOKEN}' \
  < mi-web-html-espurna/js/map.js.template \
  > mi-web-html-espurna/js/map.js

docker exec nginx-espurna nginx -s reload
```

---

## Infraestructura de desplegament

```text
Internet
│
▼
IsardVDI Bastión (SNI routing)
│  TLS per UUID de domini
▼
Nginx Docker (nginx-espurna)
├── /Espvrna/          → fitxers estàtics
├── /influxdb/         → InfluxDB v2
├── /chirpstack-api/   → ChirpStack REST
└── /rpi-ping          → Raspberry Pi bridge
```

**Servidor:** IsardVDI Ubuntu VM · IP Tailscale: `100.78.64.53`  
**Contenidors Docker:** `nginx-espurna`, `influxdb`, `node-red`, `grafana`, `mqtt-broker`, `chirpstack`

