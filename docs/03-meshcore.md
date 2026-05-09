# 03 – Part MeshCore (Hamza Tayibi)

📄 **Documentació tècnica completa amb imatges i captures reals:**

[RAK4631 MeshCore Sensor — Guia de Rèplica Pas a Pas](./RAK4631_MeshCore_Documentacio.pdf)

> **Autor:** Hamza Tayibi | **Cicle:** ASIX | **Institut:** ITB | **Curs:** 2025-2026 | **Data:** Abril 2026

---

## Resum executiu

El document PDF conté la guia completa pas a pas per replicar el node sensor MeshCore del projecte EspVRna/FireSense, incloent:

- **Pas 1** — Hardware necessari (RAK4631, RAK19007, SHTC3, RAK12035, Heltec V4)
- **Pas 2** — Software i prerequisits (PlatformIO, adafruit-nrfutil, minicom)
- **Pas 3** — Clonar el repositori MeshCore
- **Pas 4** — Configuració del `platformio.ini` (secció `[env:RAK_4631_sensor]`)
- **Pas 5** — Patches al codi font (bug I2C nRF52840)
- **Pas 6** — Calibració del sensor de sòl RAK12035 (Dry/Wet)
- **Pas 7** — Compilació del firmware amb PlatformIO
- **Pas 8** — Flasheig via adafruit-nrfutil (Windows i Linux/SPICE)
- **Pas 9** — Verificació per port sèrie (minicom)
- **Pas 10** — Configuració de l'app MeshCore (iOS/Android)
- **Pas 11** — Flux de dades complet del sistema
- **Annex** — Troubleshooting: 6 problemes coneguts i solucions
- **Simplificació** — Com reduir el repositori MeshCore al mínim funcional
