# 06 – Guia d'Instal·lació

## Requisits previs

Abans de començar, necessites:

| Requisit | Versió mínima | Comprovació |
|---------|--------------|-------------|
| Docker Engine | 24.x | `docker --version` |
| Docker Compose | 2.x (plugin) | `docker compose version` |
| Git | qualsevol | `git --version` |
| OpenSSL | qualsevol | `openssl version` |
| Mosquitto (eines client) | qualsevol | `mosquitto_passwd -h` |
| Accés SSH al servidor | — | Prova de connexió |

> Els certificats TLS del servidor (HTTPS, Let's Encrypt) s'assumeixen ja instal·lats a `/home/isard/certs/`. Si no, consulta la secció [Certificats del servidor](#certificats-del-servidor).

---

## Pas 1 – Clonar el repositori

```bash
git clone <URL-del-repositori> EspVRna-clean
cd EspVRna-clean
```

---

## Pas 2 – Crear la xarxa Docker compartida

Aquesta xarxa és el pont entre el stack principal i el stack LoRaWAN. S'ha de crear **una sola vegada** manualment:

```bash
docker network create shared-net
```

Verificació:
```bash
docker network ls | grep shared-net
# Ha d'aparèixer: shared-net  bridge  local
```

---

## Pas 3 – Configurar les variables d'entorn

```bash
cp .env.example .env
```

Edita `.env` i substitueix tots els `CHANGE_ME` per valors reals:

```env
# InfluxDB
INFLUXDB_USER=admin
INFLUXDB_PASSWORD=una_contrasenya_segura
INFLUXDB_ORG=EspVRna
INFLUXDB_BUCKET=sensor_data
INFLUXDB_ADMIN_TOKEN=un_token_llarg_i_aleatori_min_32_caracters
INFLUXDB_RETENTION=30d

# Grafana
GRAFANA_USER=admin
GRAFANA_PASSWORD=una_altra_contrasenya_segura
```

> **Generació del token InfluxDB:** `openssl rand -hex 32`

---

## Pas 4 – Generar certificats TLS per a MQTT

El broker Mosquitto requereix la seva pròpia CA i certificat de servidor. Executa:

```bash
cd mqtt
bash scripts-certificados-mqtt.sh
cd ..
```

Això crea a `mqtt/certs/`:
```
mqtt/certs/
├── ca.crt       ← CA del projecte (distribuir als clients)
├── ca.key       ← Clau privada CA (guardar de forma segura)
├── server.crt   ← Certificat del broker (signat per la CA)
├── server.csr   ← CSR (es pot eliminar)
└── server.key   ← Clau privada del broker
```

> **Important:** El certificat del servidor usa `CN=mqtt-broker` i SAN `DNS:mqtt-broker`, que coincideix amb el hostname Docker del contenidor. Si canvies el nom del contenidor, has de regenerar els certificats.

**Còpia del CA per a Node-RED:**
```bash
cp mqtt/certs/ca.crt node-red/ca.crt
```

---

## Pas 5 – Crear els usuaris MQTT

```bash
cd mqtt
bash scripts-contraseñas.sh
cd ..
```

Això crea `mqtt/passwd` amb els usuaris:

| Usuari | Contrasenya per defecte | Ús |
|--------|------------------------|----|
| `meshtastic_user` | `pirineus` | Dispositius i Home Assistant |
| `node_red_user` | `pirineus` | Node-RED |
| `monitor_user` | `pirineus` | Health check Docker |

> **Producció:** Canvia les contrasenyes editant el script o executant manualment:
> ```bash
> mosquitto_passwd -b mqtt/passwd meshtastic_user nova_contrasenya
> ```

---

## Pas 6 – (Opcional) Configurar Grafana automàticament

El script `setupgrafana.sh` crea els directoris de provisioning de Grafana:

```bash
bash setupgrafana.sh
```

Si ja tens el fitxer `grafana/provisioning/datasources/influxdb.yml` (inclòs al repositori), aquest pas no és necessari.

---

## Pas 7 – Certificats del servidor (HTTPS)

Nginx necessita els certificats TLS per servir HTTPS. Han d'estar a:
```
/home/isard/certs/fullchain.pem
/home/isard/certs/privkey.pem
```

**Opció A – Let's Encrypt (recomanat per a producció):**
```bash
sudo apt install certbot
sudo certbot certonly --standalone -d el-teu-domini.example.com
sudo cp /etc/letsencrypt/live/el-teu-domini/fullchain.pem /home/isard/certs/
sudo cp /etc/letsencrypt/live/el-teu-domini/privkey.pem /home/isard/certs/
chmod 644 /home/isard/certs/*.pem
```

**Opció B – Certificat autosignat (per a proves):**
```bash
mkdir -p /home/isard/certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /home/isard/certs/privkey.pem \
  -out /home/isard/certs/fullchain.pem \
  -subj "/CN=localhost"
```

---

## Pas 8 – Adaptar el domini a Nginx i Grafana

Substitueix el domini d'exemple per el teu domini real:

**`nginx/default.conf`** (línies 3 i 9):
```nginx
server_name el-teu-domini.example.com;
```

**`docker-compose.yml`** (servei grafana):
```yaml
- GF_SERVER_DOMAIN=el-teu-domini.example.com
- GF_SERVER_ROOT_URL=%(protocol)s://%(domain)s/grafana/
```

---

## Pas 9 – Arrencar el stack principal

```bash
docker compose up -d
```

Comprova que tots els contenidors estan en marxa i sans:

```bash
docker compose ps
```

Sortida esperada (tots `healthy` o `running`):
```
NAME             STATUS
mqtt-broker      running (healthy)
homeassistant    running (healthy)
influxdb         running (healthy)
node-red         running (healthy)
grafana          running (healthy)
nginx-proxy      running
```

Si algun contenidor falla, revisa els logs:
```bash
docker compose logs -f <nom-contenidor>
```

---

## Pas 10 – Arrencar el stack LoRaWAN (opcional)

Si vols desplegar la part LoRaWAN amb ChirpStack:

```bash
# Crear volums externs requerits pel stack LoRaWAN
docker volume create lorawan-gateway_postgres-data
docker volume create lorawan-gateway_redis-data

# Arrencar el stack
docker compose -f lorawan-gateway/docker-compose.lorawan.yml up -d
```

Comprova:
```bash
docker compose -f lorawan-gateway/docker-compose.lorawan.yml ps
```

Sortida esperada:
```
NAME                  STATUS
chirpstack-mqtt       running
chirpstack-postgres   running
chirpstack-redis      running
chirpstack            running
chirpstack-rest-api   running
```

---

## Pas 11 – Verificació dels serveis

Obre un navegador i comprova cada servei:

| Servei | URL | Credencials |
|--------|-----|-------------|
| **Home Assistant** | `https://domini/` | Configuració inicial HA |
| **Node-RED** | `https://domini/nodered/` | `admin` / [contrasenya de settings.js] |
| **Grafana** | `https://domini/grafana/` | Les de `.env` |
| **ChirpStack** | `https://domini/chirpstack/` | `admin` / `admin` (canviar!) |
| **FireSense** | `https://domini/FireSense/` | Sense autenticació |

---

## Pas 12 – Configurar Home Assistant per a MeshCore

> Requisit: Heltec V4 configurat amb el firmware MeshCore companion i connectat a la mateixa WiFi que el servidor.

1. Accedeix a Home Assistant: `https://domini/`
2. Completa l'assistent de configuració inicial.
3. Instal·la la integració `meshcore-ha` via HACS o manualment.
4. Configura la integració amb la IP i port del Heltec V4.
5. Copia els certificats MQTT per a HA (ja muntats via Docker):
   ```
   /config/certs/ca.crt    ← montat des de mqtt/certs/ca.crt
   /config/certs/server.crt
   /config/certs/server.key
   ```
6. Configura la integració MQTT d'HA:
   - Broker: `mqtt-broker`
   - Port: `8883`
   - TLS: activat, CA cert: `/config/certs/ca.crt`
   - Usuari: `meshtastic_user` / Contrasenya: la configurada

---

## Pas 13 – Importar flows a Node-RED

La primera vegada, Node-RED carrega els flows des del volum persistent. Si el volum és nou (buit), cal importar-los manualment:

1. Accedeix a `https://domini/nodered/`.
2. Login amb `admin` i la contrasenya del `settings.js`.
3. Menú → Import → Clipboard.
4. Enganxa el contingut de `node-red/flows.json`.
5. Fes clic a **Deploy**.

Comprova que el node MQTT mostra estat `connected` (punt verd).

---

## Pas 14 – Configurar dashboards a Grafana

La font de dades InfluxDB es provisiona automàticament via `grafana/provisioning/datasources/influxdb.yml`.

Per crear el primer dashboard:
1. Accedeix a `https://domini/grafana/`.
2. Login amb les credencials del `.env`.
3. Menú → Dashboards → New Dashboard.
4. Afegeix un panel amb la query Flux:
   ```flux
   from(bucket: "sensor_data")
     |> range(start: -1h)
     |> filter(fn: (r) => r._measurement == "collserola_sensors")
     |> filter(fn: (r) => r._field == "temperature")
   ```

---

## Resum de l'ordre d'execució

```bash
# 1. Prerequisits instal·lats

# 2. Preparació
git clone <repo> && cd EspVRna-clean
docker network create shared-net
cp .env.example .env && nano .env  # edita credencials

# 3. Certificats
cd mqtt && bash scripts-certificados-mqtt.sh && bash scripts-contraseñas.sh && cd ..
cp mqtt/certs/ca.crt node-red/ca.crt

# 4. Certs servidor HTTPS (adaptar domini)
# [veure Pas 7]

# 5. Adaptació de domini
# [editar nginx/default.conf i docker-compose.yml]

# 6. Arrencar
docker compose up -d
docker compose -f lorawan-gateway/docker-compose.lorawan.yml up -d  # opcional

# 7. Verificació
docker compose ps
```

---

## Solució de problemes freqüents

### `shared-net` no existeix

```
Error: network shared-net declared as external, but could not be found
```
**Solució:** `docker network create shared-net`

### Nginx no arrenca (certs no trobats)

```
nginx: [emerg] cannot load certificate "/etc/nginx/ssl/fullchain.pem"
```
**Solució:** Verificar que `/home/isard/certs/fullchain.pem` i `privkey.pem` existeixen i tenen permisos de lectura.

### Node-RED no es connecta al MQTT broker

Revisa:
1. `mqtt/certs/ca.crt` existeix i és el cert de la CA correcta.
2. `node-red/ca.crt` és còpia del ca.crt anterior.
3. El node MQTT de Node-RED té `servername = mqtt-broker`.

### InfluxDB no inicialitza (token buit)

El token `CHANGE_ME` al `.env` ha de tenir almenys 32 caràcters. Genera'n un de vàlid:
```bash
openssl rand -hex 32
```

### ChirpStack no arrenca (volums no existeixen)

```
Error: volume "lorawan-gateway_postgres-data" declared as external, but could not be found
```
**Solució:**
```bash
docker volume create lorawan-gateway_postgres-data
docker volume create lorawan-gateway_redis-data
```
