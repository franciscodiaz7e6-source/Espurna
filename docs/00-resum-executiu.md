# 00 – Resum Executiu

## EspVRna / FireSense
**Prototip de prevenció d'incendis forestals mitjançant sensors IoT a Collserola**

---

## Identificació del projecte

| Camp | Valor |
|------|-------|
| **Títol** | EspVRna / FireSense |
| **Centre** | Institut Tecnològic de Barcelona (ITB) |
| **Cicle** | CFGS Administració de Sistemes Informàtics en Xarxa (ASIX) — especialització Ciberseguretat |
| **Autors** | Alejandro Díaz Encalada · [Hamza Tayibi] |
| **Curs** | 2025–2026 |

---

## Objectiu

Dissenyar i desplegar un prototip funcional que demostri la viabilitat d'una xarxa de sensors IoT de baix cost per a la **detecció primerenca de condicions d'incendi forestal** a la serralada de Collserola. El sistema mesura temperatura, humitat i humitat del sòl i en fa visible les dades en temps real.

A més, el projecte realitza una **comparativa tècnica** entre dues aproximacions de xarxa LoRa de llarg abast:

- **MeshCore** (topologia en malla, part d'Alejandro)
- **LoRaWAN** (topologia estrella, part d'[Hamza Tayibi])

---

## Resum tècnic

El sistema s'estructura en tres grans blocs:

### 1. Capa de sensors i comunicació
Cada node sensor incorpora un microcontrolador **RAK4631** (nRF52840 + SX1262 LoRa) amb sensors **SHTC3** (temperatura i humitat) i **RAK12035** (humitat del sòl). Les dades es transmeten codificades en **CayenneLPP** a través de la xarxa sense fil.

- La via **MeshCore** usa una xarxa en malla LoRa amb un node pont **Heltec V4** (ESP32) que fa de passarel·la WiFi cap a Home Assistant.
- La via **LoRaWAN** usa un gateway **RAK WisGate** i el servidor de xarxa **ChirpStack v4**.

### 2. Backend compartit (servidor IsardVDI – ITB)
Tot el backend corre en contenidors Docker sobre una màquina virtual a IsardVDI:

| Servei | Funció |
|--------|--------|
| **Mosquitto MQTT** (TLS) | Bus de missatgeria central |
| **Node-RED** | Processament i transformació de dades |
| **InfluxDB v2** | Base de dades de sèries temporals |
| **Grafana** | Visualització i dashboards |
| **Home Assistant** | Passarel·la MeshCore → MQTT |
| **Nginx** | Proxy invers HTTPS unificat |

### 3. Capa de visualització
- **Grafana**: dashboards sobre dades historiques d'InfluxDB.
- **FireSense** (SPA): aplicació web pròpia amb mapa Leaflet, indicadors d'estat en temps real i suport de tema fosc/clar.

---

## Conclusions principals

- S'ha aconseguit un pipeline de dades complet i funcional des del sensor fins a la visualització.
- Ambdues tecnologies LoRa (MeshCore i LoRaWAN) han pogut integrar-se al mateix backend compartit.
- MeshCore ofereix redundància de xarxa gràcies a la topologia en malla; LoRaWAN simplifica la infraestructura però requereix cobertura de gateway.
- El cost de hardware per node és inferior a [TODO: cost aproximat €].
- El sistema és replicable per qualsevol centre o entitat amb coneixements bàsics de Docker.

---

## Paraules clau

IoT · LoRa · MeshCore · LoRaWAN · ChirpStack · Collserola · Prevenció d'incendis · Docker · MQTT · InfluxDB · Grafana · Node-RED · Home Assistant · CayenneLPP
