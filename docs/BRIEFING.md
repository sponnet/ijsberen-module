# Zwembad Temperatuur Monitoring – ProMinent DULCOPOOL Pro naar IoT Cloud (ESP32 & ESPHome)

## 1. Projectdoel & Samenvatting
Dit project leest elke 30 seconden de actuele zwembadtemperatuur uit een **ProMinent DULCOPOOL Pro** zwembadcontroller via het **Modbus RTU (RS-485)** protocol. De uitlezing gebeurt met een **ESP32 microcontroller** voorzien van **ESPHome** firmware.

Vervolgens verstuurt de ESP32 de gemeten temperatuurwaarde automatisch **elke 15 minuten** via HTTPS (REST API) naar drie externe IoT-dataplatforms tegelijk voor langdurige opslag, grafieken en monitoring:
1. **ThingSpeak** (onbeperkte historische data-opslag op gratis account)
2. **Adafruit IO** (dashboarding & 30 dagen historie)
3. **Ubidots STEM** (visuele widgets & 30 dagen historie)

---

## 2. Benodigde Hardware (Stuklijst)

Alle benodigde elektronica is geselecteerd op **3.3V compatibiliteit** om de I/O-pinnen van de ESP32 te beschermen:

| Onderdeel | Specificatie / Artikel | Leverancier & Link |
| :--- | :--- | :--- |
| **Microcontroller** | NodeMCU ESP32 Wroom WiFi & Bluetooth (USB-C, CH340C, 3.3V logic) – Art. `N53` | [Ben's Electronics - NodeMCU ESP32](https://www.benselectronics.nl/products/nodemcu-esp32-wroom-wifi-en-bluetooth-usb-c?Title=Default+Title) |
| **RS-485 Module** | UART TTL to RS485 Converter (3.3V/5V compatibel, auto-direction) – Art. `H28` | [Ben's Electronics - UART TTL to RS485 (H28)](https://www.benselectronics.nl/products/uart-ttl-to-rs485-converter) |
| **RS-485 Datakabel** | CAT 6 Patchkabel S/FTP (PiMF), dubbel afgeschermd (3m `N32` of 10m `N31`) | [Ben's Electronics - Netwerkkabels](https://www.benselectronics.nl/collections/netwerk-kabels) |
| **Interne bedrading** | Dupont Female-to-Female jumper kabels (voor ESP32 ↔ H28 module) | Ben's Electronics / standaard prototyping |
| **Voeding** | 5V USB-C voedingsadapter + USB-C datakabel | Standaard 5V (min. 1A) |

> **Let op:** Gebruik **niet** de goedkopere 5V-only `MAX485` module (Art. `Y26`), omdat deze 5V op de RX-pin van de ESP32 zet en het bordje kan beschadigen. Gebruik uitsluitend de **H28** module die op **3.3V** werkt.

---

## 3. Documentatie & Bronnen
* **Controller Productpagina:** [ProMinent DULCOPOOL Pro](https://www.prominent.com/en/Products/Products/Measuring-Control-and-Sensor-Technology/Controllers/p-dulcopool-pro.html)
* **Handleiding & Modbus Registertabel:** [ProMinent DULCOPOOL Pro Operating Instructions (PDF)](https://www.prominent.it/resources/OperatingInstructions/English/30667/990354-BA-DM-238-05-23-EN-DULCOPOOL-PRO-EN.pdf) *(Zie Hoofdstuk 7.6 voor Modbus RTU/TCP specificaties)*
* **ESPHome Firmware Flasher:** [ESPHome Web Installer](https://web.esphome.io)
* **Visueel Aansluitschema:** Zie bijgeleverd bestand `aansluitschema_dulcopool_esp32.svg`

---

## 4. Aansluitschema (Bedrading)

### A. ESP32 ↔ RS-485 Module (H28)
Verbind de pinnen met Dupont Female-Female kabeltjes:

| H28 RS-485 Module | NodeMCU ESP32 Pin | Functie |
| :--- | :--- | :--- |
| **VCC** | `3V3` | 3.3V voeding |
| **GND** | `GND` | Massa |
| **TXD** | `GPIO16` (RX2) | Data van RS-485 naar ESP32 |
| **RXD** | `GPIO17` (TX2) | Data van ESP32 naar RS-485 |

*(Omdat de H28-module automatische richtingscontrole heeft, hoeven er geen DE/RE flow-control pinnen aangesloten te worden).*

### B. RS-485 Module (H28) ↔ DULCOPOOL Pro
1. Knip de RJ45-stekkers van de **S/FTP Cat 6 kabel** af en strip de buitenmantel.
2. Kies één getwist aderpaar (bijv. **Oranje** en **Oranje/Wit**).
3. Sluit aan:
   * **A+** (H28 module) ↔ **RS-485 A (D+)** op de DULCOPOOL Pro
   * **B-** (H28 module) ↔ **RS-485 B (D-)** op de DULCOPOOL Pro
4. **Afscherming (Shield):** Draai de gevlochten metalen mantel van de kabel samen en sluit deze **slechts aan één zijde** (bij de DULCOPOOL Pro op de aardings-/shieldklem) aan om aardlussen te voorkomen.
5. Houd de datakabel uit de buurt van 230V/400V pomp- en doseerkabels.

---

## 5. Configuratie op de DULCOPOOL Pro

Controleer op het touchscreen van de DULCOPOOL Pro onder **Instellingen → Interfaces → Modbus RTU** de volgende parameters (deze moeten exact overeenkomen met de ESPHome YAML):
* **Modbus RTU:** Ingeschakeld (Active)
* **Slave ID / Adres:** `1` (`0x01`)
* **Baudrate:** `19200` *(indien ingesteld op `9600`, pas dit dan ook aan in de YAML)*
* **Pariteit:** `Even` *(indien `None`, pas `parity: NONE` aan in de YAML)*
* **Stopbits:** `1`

### Modbus Register Overzicht (Temperatuur)
De DULCOPOOL Pro slaat meetwaarden op als **32-bit Floating Point (`REAL` / `FP32`)** over 2 opeenvolgende Holding Registers (Functiecode `03`) in *Little-Endian word order* (LSW-MSW / CDAB).

Controleer op het hoofdscherm van de DULCOPOOL Pro aan welk meetkanaal (**E1 t/m E8**) de temperatuursensor is gekoppeld:

| Kanaal | 1-based Register | 0-based Adres (ESPHome) | Datatype |
| :--- | :--- | :--- | :--- |
| **E1** *(standaard)* | `41203` | `1202` | `FP32` (2 registers) |
| **E2** | `41253` | `1252` | `FP32` (2 registers) |
| **E3** | `41303` | `1302` | `FP32` (2 registers) |
| **E4** | `41353` | `1352` | `FP32` (2 registers) |
| **E5** | `41403` | `1402` | `FP32` (2 registers) |
| **E6** | `41453` | `1452` | `FP32` (2 registers) |
| **E7** | `41503` | `1502` | `FP32` (2 registers) |
| **E8** | `41553` | `1552` | `FP32` (2 registers) |

---

## 6. Cloud API's Voorbereiden (Eenmalig)

Maak gratis accounts aan en verzamel de volgende API-sleutels om in de YAML in te vullen:
1. **[ThingSpeak](https://thingspeak.mathworks.com):** Maak een *New Channel* aan, vink **Field 1** aan (*Temperatuur*) en kopieer de **Write API Key**.
2. **[Adafruit IO](https://io.adafruit.com):** Maak een feed aan genaamd `zwembad-temperatuur` en kopieer je **Username** en **Active Key** (gele sleutel-icoon rechtsboven).
3. **[Ubidots STEM](https://ubidots.com/stem):** Kopieer je **Default Token** (rechtsboven onder profiel → *API Credentials*). Het device `dulcopool-pro` en de variabele `temperatuur` worden bij de eerste verzending automatisch aangemaakt.

---

## 7. ESPHome Configuratie (`dulcopool-temperatuur.yaml`)

Vul bovenaan onder `substitutions:` de juiste WiFi-gegevens en API-sleutels in en flash de configuratie via USB-C op de ESP32:

```yaml
substitutions:
  # WiFi Instellingen
  wifi_ssid: "JOUW_WIFI_NAAM"
  wifi_password: "JOUW_WIFI_WACHTWOORD"

  # 1. ThingSpeak gegevens
  thingspeak_api_key: "JOUW_THINGSPEAK_WRITE_KEY"

  # 2. Adafruit IO gegevens
  adafruit_username: "JOUW_ADAFRUIT_GEBRUIKERSNAAM"
  adafruit_feed_key: "zwembad-temperatuur"
  adafruit_aio_key: "JOUW_ADAFRUIT_AIO_KEY"

  # 3. Ubidots STEM gegevens
  ubidots_device_label: "dulcopool-pro"
  ubidots_token: "JOUW_UBIDOTS_STEM_TOKEN"

esphome:
  name: dulcopool-temperatuur

esp32:
  board: esp32dev
  framework:
    type: arduino

wifi:
  ssid: "${wifi_ssid}"
  password: "${wifi_password}"

# Seriële logging voor debugging via USB
logger:

# HTTP Request component voor verzending naar externe API's
http_request:
  useragent: esphome/dulcopool
  timeout: 10s

# UART bus voor 3.3V RS-485 module (H28)
uart:
  id: mod_bus_uart
  tx_pin: GPIO17
  rx_pin: GPIO16
  baud_rate: 19200
  stop_bits: 1
  parity: EVEN

# Modbus protocol koppeling
modbus:
  id: modbus_dulcopool
  uart_id: mod_bus_uart

# DULCOPOOL Pro Modbus Slave
modbus_controller:
  - id: dulcopool_pro
    address: 0x01
    modbus_id: modbus_dulcopool
    update_interval: 30s

# Temperatuursensor uitlezen
sensor:
  - platform: modbus_controller
    modbus_controller_id: dulcopool_pro
    name: "Zwembad Temperatuur"
    id: zwembad_temperatuur
    register_type: holding
    address: 1202               # 0-based adres voor Kanaal E1 (pas aan indien op E2-E8)
    value_type: FP32
    byte_order: little_endian
    unit_of_measurement: "°C"
    accuracy_decimals: 1

# Elke 15 minuten posten naar alle 3 de platforms
interval:
  - interval: 15min
    then:
      - if:
          condition:
            lambda: 'return !isnan(id(zwembad_temperatuur).state);'
          then:
            # --- 1. POST naar ThingSpeak ---
            - http_request.get:
                url: !lambda |-
                  char buf[160];
                  snprintf(buf, sizeof(buf), "https://api.thingspeak.com/update?api_key=${thingspeak_api_key}&field1=%.2f", id(zwembad_temperatuur).state);
                  return std::string(buf);

            - delay: 2s

            # --- 2. POST naar Adafruit IO ---
            - http_request.post:
                url: "https://io.adafruit.com/api/v2/${adafruit_username}/feeds/${adafruit_feed_key}/data"
                headers:
                  Content-Type: "application/json"
                  X-AIO-Key: "${adafruit_aio_key}"
                json: |-
                  root["value"] = id(zwembad_temperatuur).state;

            - delay: 2s

            # --- 3. POST naar Ubidots STEM ---
            - http_request.post:
                url: "https://industrial.api.ubidots.com/api/v1.6/devices/${ubidots_device_label}"
                headers:
                  Content-Type: "application/json"
                  X-Auth-Token: "${ubidots_token}"
                json: |-
                  root["temperatuur"] = id(zwembad_temperatuur).state;
```

---

## 8. Troubleshooting bij Installatie
* **Geen Modbus-data / Timeout in logs:**
  * Draai **A+** en **B-** op de H28 RS-485 module om.
  * Controleer of `baud_rate` (`19200` vs `9600`) en `parity` (`EVEN` vs `NONE`) op de DULCOPOOL Pro overeenkomen met de YAML.
* **Onlogische temperatuurwaarde (bijv. `-3.4e38` of `0.0`):**
  * Verander `byte_order: little_endian` naar `byte_order: big_endian` in de YAML.
  * Controleer in het menu van de DULCOPOOL Pro of de temperatuur wel op kanaal **E1** (`1202`) zit en niet op **E2** (`1252`) of **E3** (`1302`).
* **Geen data in de cloud-dashboards:**
  * De eerste verzending vindt pas **15 minuten na opstarten** plaats. Controleer via de USB-log van ESPHome of de sensor lokaal al wel elke 30 seconden een geldige `°C`-waarde logt.
