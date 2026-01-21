# ProjecteEspVRna_IOTs

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![ESP32](https://img.shields.io/badge/Hardware-ESP32-blue.svg)](https://www.espressif.com/en/products/socs/esp32)
[![Meshtastic](https://img.shields.io/badge/Network-Meshtastic-green.svg)](https://meshtastic.org/)

Repositori dels prototips de sensors i nodes Meshtastic per al **Projecte EspVRna** - Sistema IoT de prevenció d'incendis forestals per al Parc Natural de Collserola.

## Descripció del Projecte

EspVRna és un sistema integral de detecció i prevenció d'incendis forestals que combina tecnologies IoT avançades per monitoritzar zones boscoses en temps real. El projecte utilitza una xarxa mesh de sensors distribuïts per detectar moviment, temperatura i altres indicadors d'incendis potencials.

### Objectius Principals

- Detecció primerenca d'incendis forestals
- Xarxa mesh descentralitzada per comunicació fiable
- Integració amb plataforma cloud per anàlisi de dades
- Dashboard en temps real per visualització de dades
- Solució autònoma amb energia solar

## Característiques Principals

- **Detecció de Moviment:** Sensors PIR per detectar presència humana o animal
- **Xarxa Mesh:** Comunicació LoRaWAN i Meshtastic per cobertura extensa
- **Monitorització Cloud:** Integració amb AWS IoT Core
- **Dashboard Web:** Visualització en temps real de l'estat dels sensors
- **Alimentació Solar:** Panells solars mini i bateries per autonomia energètica
- **Baix Consum:** Optimitzat per funcionar amb recursos limitats

## Tecnologies Utilitzades

### Hardware

- **Microcontrolador:** ESP32-WROOM-32
- **Sensors:** PIR HC-SR501 (detecció de moviment)
- **Comunicació:** Meshtastic (LoRa 868MHz)
- **Energia:** Mini panell solar + bateria LiPo

### Software

- **Firmware:** Arduino/PlatformIO (C++)
- **Protocol:** MQTT, LoRaWAN
- **Cloud:** AWS IoT Core, AWS Lambda
- **Frontend:** JavaScript, HTML5, CSS3
- **Base de Dades:** AWS DynamoDB

## Estructura del Repositori

```
ProjecteEspVRna_IOTs/
├── esp32-firmware/          # Codi per ESP32
│   ├── src/
│   ├── include/
│   └── platformio.ini
├── meshtastic-uplink/       # Configuració nodes Meshtastic
├── backend-server/          # API backend (Node.js/Python)
├── database/                # Scripts SQL i configuració DB
├── docs/                    # Documentació del projecte
├── lorawan-gateway/         # Configuració gateway LoRaWAN
└── assets/                  # Imatges, diagrames, esquemes
```

## Requisits Previs

### Hardware Necessari

- ESP32 DevKit v1
- Sensor PIR HC-SR501
- Mòdul Meshtastic (T-Beam o Heltec)
- Mini panell solar (5V, 1-2W)
- Bateria LiPo 3.7V (2000-3000mAh)
- Cables Dupont i resistències

### Software Necessari

- [Arduino IDE](https://www.arduino.cc/en/software) o [PlatformIO](https://platformio.org/)
- [Python 3.8+](https://www.python.org/)
- [Node.js 16+](https://nodejs.org/) (per al backend)
- [Git](https://git-scm.com/)

## Instal·lació

### 1. Clonar el Repositori

```bash
git clone https://github.com/franciscodiaz7e6-source/ProjecteEspVRna_IOTs.git
cd ProjecteEspVRna_IOTs
```

### 2. Configurar l'ESP32

```bash
cd esp32-firmware
# Si utilitzes PlatformIO
pio run -t upload

# Si utilitzes Arduino IDE
# Obre el fitxer .ino i puja'l des de l'IDE
```

### 3. Configurar el Backend

```bash
cd backend-server
npm install
cp .env.example .env
# Edita .env amb les teves credencials AWS
npm start
```

### 4. Configurar Meshtastic

Consulta la documentació a `docs/meshtastic-setup.md` per configurar els nodes mesh.

## Configuració

### Variables d'Entorn (.env)

```env
# AWS Configuration
AWS_REGION=eu-west-1
AWS_IOT_ENDPOINT=your-endpoint.iot.eu-west-1.amazonaws.com
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# Meshtastic
MESHTASTIC_CHANNEL=EspVRna_CH1
LORA_FREQUENCY=868.0

# Sensor Configuration
PIR_THRESHOLD=3
SLEEP_INTERVAL=300
```

### Configuració ESP32

Edita `esp32-firmware/include/config.h`:

```cpp
#define WIFI_SSID "your-ssid"
#define WIFI_PASSWORD "your-password"
#define MQTT_BROKER "your-mqtt-broker"
#define PIR_PIN 14
#define BATTERY_PIN 35
```

## Ús

### Desplegar un Node Sensor

1. Programa l'ESP32 amb el firmware
2. Connecta el sensor PIR al pin configurat
3. Connecta la bateria i el panell solar
4. Col·loca el node a la zona a monitoritzar
5. Verifica la connexió al dashboard

### Monitoritzar Dades

Accedeix al dashboard web:

```
http://your-server-ip:3000/dashboard
```

### Consultar Logs

```bash
# Logs del backend
npm run logs

# Monitor serial ESP32
pio device monitor
```

## Testing

```bash
# Tests unitaris ESP32
cd esp32-firmware
pio test

# Tests backend
cd backend-server
npm test
```

## Arquitectura del Sistema

```

(PENDIENTE)

```

## Contribució

Les contribucions són benvingudes! Si vols col·laborar:

1. Fes un Fork del projecte
2. Crea una branca per la teva feature (`git checkout -b feature/NovaFuncio`)
3. Commit dels canvis (`git commit -m 'Afegeix nova funcionalitat'`)
4. Push a la branca (`git push origin feature/NovaFuncio`)
5. Obre un Pull Request

## Documentació Addicional

- [Guia de Desplegament](docs/001-deployment.md)
- [Manual d'Usuari](docs/user-manual.md)
- [Troubleshooting](docs/troubleshooting.md)
- [API Reference](docs/api-reference.md)

## Problemes Coneguts

Consulta els [Issues](https://github.com/franciscodiaz7e6-source/ProjecteEspVRna_IOTs/issues) per veure problemes coneguts i planificats.

## Llicència

Aquest projecte està llicenciat sota la Llicència MIT - veure el fitxer [LICENSE](LICENSE) per més detalls.

## Autors

- **Francisco Díaz** - [@franciscodiaz7e6-source](https://github.com/franciscodiaz7e6-source)
- **Hamza Tayibi** - [@HamzaTayibiITB2425](https://github.com/HamzaTayibiITB2425)

### Agraïments

- Institut Tecnològic de Barcelona (ITB)
- Parc Natural de Collserola
- Comunitat Meshtastic

## Contacte

Per preguntes o sugerències sobre el projecte:

- Email: <projecte.espvrna@itb.cat>
- Web: Projecte EspVRna

---

**Projecte desenvolupat com a part del cicle formatiu ASIX (Administració de Sistemes Informàtics en Xarxa) a l'Institut Tecnològic de Barcelona - Curs 2025/2026**
