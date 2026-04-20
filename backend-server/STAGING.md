# Entorno de Staging — ProjecteEspVRna IoT

Entorno de preproducción aislado para probar cambios antes de desplegarlos en producción.
Todos los servicios corren en puertos distintos y usan volúmenes separados.

---

## Inicio rápido

```bash
cd backend-server/

# 1. Configura las variables de entorno staging
cp .env.staging.example .env.staging   # si existe el ejemplo
# Edita .env.staging y cambia todos los valores CHANGE_ME

# 2. Genera la contraseña de basic auth (opcional, ya hay una por defecto)
htpasswd -c nginx/staging_htpasswd staging

# 3. Levanta el entorno
./staging.sh up
```

---

## Puertos y URLs (staging)

| Servicio | Puerto host | URL directa | Vía Nginx |
|---|---|---|---|
| **Nginx** (gateway) | `18080` | http://localhost:18080 | — |
| **Home Assistant** | `18123` | http://localhost:18123 | http://localhost:18080/ |
| **InfluxDB** | `18086` | http://localhost:18086 | http://localhost:18080/influxdb/ |
| **Node-RED** | `11880` | http://localhost:11880 | http://localhost:18080/nodered/ |
| **Grafana** | `13000` | http://localhost:13000 | http://localhost:18080/grafana/ |
| **MQTT** (TCP) | `18883` | mqtt://localhost:18883 | — |
| **FireSense web** | — | — | http://localhost:18080/FireSense/ |
| **EspVRna web** | — | — | http://localhost:18080/Espvrna/ |

> La red interna Docker de staging usa la subred `172.21.0.0/16` (vs `172.20.0.0/16` en producción).

---

## Acceso — Basic Auth

El Nginx de staging tiene autenticación básica activada para restringir el acceso.

| Usuario | Contraseña por defecto |
|---|---|
| `staging` | `staging123` |

**Cambia esta contraseña** antes de exponer el entorno fuera de localhost:

```bash
htpasswd -c backend-server/nginx/staging_htpasswd staging
# Luego reinicia nginx staging
./staging.sh shell nginx && nginx -s reload
# o
./staging.sh restart
```

---

## Comandos de gestión

```bash
./staging.sh up              # Levanta el entorno
./staging.sh down            # Para el entorno
./staging.sh restart         # Reinicia todos los servicios
./staging.sh logs            # Logs de todos los servicios
./staging.sh logs node-red   # Logs de un servicio concreto
./staging.sh build           # Rebuild completo (útil tras cambiar Dockerfile)
./staging.sh status          # Estado de contenedores, redes y volúmenes
./staging.sh db-reset        # Borra y reinicia InfluxDB staging (¡destructivo!)
./staging.sh shell grafana   # Abre shell en un contenedor
```

---

## Diferencias con producción

| Aspecto | Producción | Staging |
|---|---|---|
| Nginx | Puerto 80/443 (TLS) | Puerto 18080 (HTTP) |
| Home Assistant | Puerto 443 | Puerto 18123 |
| InfluxDB | Puerto 8086 | Puerto 18086 |
| Node-RED | Puerto 1880 | Puerto 11880 |
| Grafana | Puerto 3000 | Puerto 13000 |
| MQTT | Puerto 8883 (TLS) | Puerto 18883 |
| Red Docker | `172.20.0.0/16` (`iot-network`) | `172.21.0.0/16` (`staging-net`) |
| Volúmenes | `influxdb-data`, etc. | `influxdb-data-staging`, etc. |
| Org InfluxDB | `ProjecteEspVRna` | `ProjecteEspVRna_staging` |
| Bucket InfluxDB | `sensor_data` | `sensor_data_staging` |
| Log level Grafana | info | debug |
| Log level Node-RED | info | debug |
| Basic auth Nginx | No | Sí (usuario: staging) |
| TLS MQTT | Sí | Opcional (usa config de prod) |
| Dominio | `f5bd4ae6-...isard.nuvulet.itb.cat` | `staging.localhost` / `localhost` |

---

## Configuración — .env.staging

El archivo `.env.staging` **no se commitea** (está en `.gitignore`).  
Contiene las credenciales del entorno staging. Variables a configurar:

```bash
INFLUXDB_USER=admin_staging
INFLUXDB_PASSWORD=<cambia esto>
INFLUXDB_ORG=ProjecteEspVRna_staging
INFLUXDB_BUCKET=sensor_data_staging
INFLUXDB_ADMIN_TOKEN=<genera con: openssl rand -base64 64 | tr -d '\n'>
GRAFANA_USER=admin
GRAFANA_PASSWORD=<cambia esto>
```

---

## Archivos de staging

```
backend-server/
├── docker-compose.staging.yml   ✓ Commitado — definición del stack staging
├── .env.staging                 ✗ NO commitado — credenciales staging
├── staging.sh                   ✓ Commitado — script de gestión
├── nginx/
│   ├── staging.conf             ✓ Commitado — config nginx staging
│   └── staging_htpasswd         ✓ Commitado — basic auth (contraseña de ejemplo)
└── STAGING.md                   ✓ Commitado — esta documentación
```

---

## Troubleshooting

### El contenedor influxdb no arranca

```bash
./staging.sh logs influxdb
# Si el error es "already initialized":
./staging.sh db-reset
```

### Node-RED no conecta con InfluxDB

Node-RED staging usa `staging-influxdb` como hostname (red `staging-net`).  
Verifica en el editor de Node-RED (http://localhost:11880) que los nodos InfluxDB apunten a `staging-influxdb:8086`.

### Conflicto de puertos

Si algún puerto staging ya está en uso:

```bash
ss -tlnp | grep -E '18080|18086|11880|13000|18123|18883'
```

Cambia el puerto conflictivo en `docker-compose.staging.yml` (sección `ports`).

### Home Assistant no arranca

HA tarda hasta 2 minutos en el primer arranque. Comprueba:

```bash
./staging.sh logs homeassistant
```

### Basic auth no funciona en Nginx

Verifica que `nginx/staging_htpasswd` existe y es legible:

```bash
./staging.sh shell nginx
cat /etc/nginx/.htpasswd
```

---

## Notas de arquitectura

- El stack staging es **completamente independiente** de producción: red, volúmenes y contenedores tienen nombres distintos.
- Los datos de los sensores reales **no llegan** a staging (los ESP32 publican al MQTT de producción en el puerto 8883, no al 18883).
- Para simular datos en staging, usa el editor de Node-RED en http://localhost:11880 e inyecta mensajes MQTT manualmente o con nodos `inject`.
- El TLS de MQTT staging reutiliza los certificados de producción (`./mqtt/certs/`) si existen. Si no existen, ajusta `mosquitto.conf` para escuchar en plaintext.
