# 07 – Conclusions, Limitacions i Treball Futur

## Conclusions

### 1. Viabilitat tècnica demostrada

El projecte EspVRna/FireSense ha demostrat que és **tècnicament viable** construir un sistema de monitoratge ambiental per a prevenció d'incendis forestals basat en tecnologies de codi obert i hardware de baix cost. El pipeline complet —des del sensor al dashboard— funciona de forma integrada:

```
RAK4631 → LoRa → [MeshCore | LoRaWAN] → MQTT → Node-RED → InfluxDB → Grafana
```

### 2. Comparativa de tecnologies LoRa

Ambdues tecnologies avaluades han superat les proves bàsiques de connectivitat i transmissió de dades:

- **MeshCore** ha destacat per la seva **facilitat de desplegament** i la **resiliència** inherent a la topologia en malla. Configurar un node nou és tan senzill com engegar-lo amb la mateixa sync word.

- **LoRaWAN** ha destacat per la seva **eficiència energètica**, l'**ecosistema madur** de dispositius i la **seguretat estandarditzada** (AES-128). ChirpStack v4 ha resultat ser una plataforma robusta i ben documentada.

- La conclusió principal és que **no hi ha una millor tecnologia absoluta**: l'elecció depèn del cas d'ús concret. [TODO: afegir conclusions quantitatives basades en els resultats reals de cobertura i consum]

### 3. Arquitectura de backend compartit

La decisió de compartir el backend entre les dues tecnologies ha estat encertada:
- Redueix la complexitat total del sistema.
- Facilita la comparativa directa (mateixa BBDD, mateixos dashboards).
- Docker Compose ha permès gestionar 11 contenidors de forma ordenada.

### 4. Ciberseguretat aplicada

El projecte integra diverses mesures de seguretat reals:
- **TLS mutu** al broker MQTT (CA pròpia, certificats de servidor).
- **Autenticació** a tots els serveis (Node-RED, Grafana, InfluxDB amb tokens).
- **Proxy invers** (Nginx) que oculta la topologia interna i centralitza el TLS.
- **Sync word privada** a MeshCore per aïllar la xarxa del projecte.
- Variables d'entorn per a totes les credencials (`.env` mai comitejat).

Aquests aspectes de seguretat connecten directament amb l'especialització en **ciberseguretat** del cicle ASIX.

### 5. Assoliment dels objectius

| Objectiu | Estat |
|---------|-------|
| Firmware RAK4631 funcional amb SHTC3 + RAK12035 | ✅ |
| Pipeline MeshCore → MQTT → InfluxDB | ✅ |
| Stack ChirpStack v4 operatiu | ✅ |
| Backend Docker compartit | ✅ |
| Visualització Grafana | ✅ |
| Frontend FireSense (SPA) | ✅ |
| Comparativa quantitativa MeshCore vs LoRaWAN | [TODO: completar] |
| Desplegament físic a Collserola | [TODO: realitzat / parcialment / laboratori] |

---

## Limitacions

### Limitacions tècniques

**1. Escala del prototip**
El sistema s'ha provat amb un nombre limitat de nodes sensor [TODO: especificar quants]. Un desplegament real a Collserola requeriria desenes o centenars de nodes, cosa que podria revelar colis de coll no identificats (límit de connexions MQTT, rendiment de Node-RED, capacitat de InfluxDB).

**2. Cobertura ràdio no verificada a escala**
Les proves de cobertura s'han fet en [TODO: laboratori / camp puntual]. La propagació real a Collserola, amb orografia irregular, vegetació densa i edificis, pot diferir significativament dels valors teòrics.

**3. Alimentació dels nodes**
El prototip usa alimentació per cable o bateries convencionals. Per a un desplegament permanent, caldria integrar **panells solars i gestió de bateries**, cosa que afecta el disseny del firmware (duty cycle, deep-sleep agressiu).

**4. Companion WiFi dependent de xarxa**
El Heltec V4 de MeshCore necessita WiFi. En zones forestals aïllades sense cobertura WiFi, caldria un altre mecanisme de backhaul (4G/5G, satellite, LoRaWAN com a backhaul).

**5. Seguretat LoRa de MeshCore**
La sync word ofereix aïllament però no xifratge. Les dades transmeses per ràdio poden ser capturades per qualsevol receptor LoRa. Per a dades de qualitat operacional, caldria activar el xifratge d'aplicació de MeshCore.

**6. Certificats TLS amb caducitat d'1 any**
Els certificats MQTT generats amb `scripts-certificados-mqtt.sh` caduquen als 365 dies. Cal implementar un procés de renovació.

### Limitacions del projecte (abast CFGS)

- **Temps limitat**: El cicle lectiu no ha permès realitzar proves de camp de llarga durada (estacionals).
- **Recursos econòmics**: El pressupost limitat ha condicionat la quantitat de hardware desplegat.
- **Integració operacional**: No s'ha pogut integrar amb els sistemes reals de Bombers o Protecció Civil de Catalunya.

---

## Treball futur

### Millores de curt termini (1–6 mesos)

- [ ] **Alimentació solar**: Integrar panell solar (5W) + bateria LiPo als nodes de camp.
- [ ] **Xifratge MeshCore**: Activar el xifratge AES a nivell d'aplicació MeshCore.
- [ ] **Renovació automàtica de certificats**: Script de cron per renovar els certificats MQTT.
- [ ] **Alertes Grafana**: Configurar alertes automàtiques (temperatura > 40°C, humitat sòl < 20%) via email o Telegram.
- [ ] **Dashboard FireSense complet**: Integrar dades reals d'InfluxDB a la SPA FireSense (actualment usa dades simulades).
- [ ] **Decodificador LoRaWAN**: Completar el codec JavaScript a ChirpStack per descodificar CayenneLPP.

### Millores de mig termini (6–18 mesos)

- [ ] **Desplegament permanent a Collserola**: Col·locar nodes en ubicacions estratègiques amb acord del Consorci del Parc de Collserola.
- [ ] **Índex de risc d'incendi**: Calcular un índex agregat (temperatura + humitat + humitat sòl + vent) i visualitzar-lo al mapa.
- [ ] **Camera d'imatge tèrmica**: Afegir un mòdul de detecció d'anomalies tèrmiques als nodes de major risc.
- [ ] **Gateway 4G**: Substituir el companion WiFi per un mòdul 4G per a ubicacions sense WiFi.
- [ ] **Redundància del backend**: Migrar a un cluster Docker Swarm o Kubernetes per a alta disponibilitat.

### Investigació i extensions

- [ ] **ML per a detecció d'incendis**: Entrenar un model de Machine Learning sobre les sèries temporals per detectar patrons previs a un incendi (no només llindars estàtics).
- [ ] **Integració amb dades meteorològiques**: Fusionar les dades dels sensors amb dades de l'AEMET/SMC per millorar la predicció de risc.
- [ ] **Protocol LoRa Mesh estàndard**: Avaluar futurs estàndards de mesh sobre LoRa (ex. LoRa Basics Modem + Semtech LoRa Edge) quan madurin.
- [ ] **Interoperabilitat**: Publicar les dades del projecte a plataformes obertes de dades ambientals (ex. OpenSenseMap, Sensor.Community).

---

## Reflexió final

El projecte EspVRna/FireSense ha anat molt més enllà d'un exercici acadèmic típic. Ha requerit integrar coneixements de **xarxes sense fil** (LoRa, MQTT), **sistemes operatius** (Linux, Docker), **bases de dades** (InfluxDB, PostgreSQL), **ciberseguretat** (TLS, autenticació, certificats) i **programació** (firmware, JavaScript, Flux), tots ells competències del cicle ASIX.

Especialment rellevant per a l'especialització en **ciberseguretat** ha estat la implementació de la cadena de confiança TLS: des de generar una CA pròpia, signar certificats amb SANs correctes, fins a configurar la verificació mútua entre clients i servidor. Estos conceptes, aplicats en un sistema real, consoliden l'aprenentatge molt millor que qualsevol exercici teòric.

La prevenció d'incendis forestals és un problema real i urgent al Mediterrani. Si aquest prototip pot inspirar o servir de base per a un sistema operacional, el projecte haurà assolit el seu objectiu més ambiciós.
