# ES3C50P: schermversie van de IJsberen-module

Dezelfde module als in de [hoofd-README](../README.md), maar op een **ES3C50P**: een ESP32-S3 met een 5"-touchscreen (800 × 480).
Naast het uitlezen van de DULCOPOOL Pro en het versturen naar de cloud toont het scherm:

| Tab | Inhoud |
|---|---|
| **Temperatuur** | Huidige watertemperatuur (groot), status van de meting, min/max van de laatste 24 uur en een grafiek met 1 punt per 5 minuten |
| **Info** | Wi-Fi (netwerk, IP-adres, signaal), cloud (minuten sinds de laatste verzending, HTTP-codes van ThingSpeak, Adafruit IO en Ubidots), Modbus-status, stroom op AI3/AI4, gekozen bron, uptime, tijd en firmware. Rechts staan de bediening: helderheid, cloud-verzending aan/uit, *Nu versturen* en *Herstarten* (lang indrukken). |

Na 5 minuten zonder aanraking dimt het scherm tot 10 %. Eén tik maakt het weer helder.

Modbus-instellingen, registers en cloudkanalen zijn **identiek** aan de NodeMCU-versie (hoofd-README §8 en §10).

> **Laat niet beide modules tegelijk versturen.** Dan krijgen ThingSpeak, Adafruit IO en Ubidots dubbele punten,
> en weigert ThingSpeak een tweede update binnen 15 s.
> Zet de NodeMCU uit of zet hier de schakelaar *Cloud* (tab Info) uit.

## 1. Bestanden

| Bestand | Wat | In git |
|---|---|---|
| [dulcopool-scherm.example.yaml](dulcopool-scherm.example.yaml) | ESPHome-configuratie (sjabloon) → kopieer naar `dulcopool-scherm.yaml` | ✓ |
| `dulcopool-scherm.yaml` | Jouw versie met `adafruit_username` ingevuld | ✗ |
| `secrets.yaml` | Symlink naar `../esphome/secrets.yaml`: dezelfde Wi-Fi en sleutels | ✗ |

## 2. Het bord

Gecontroleerd in de IO-tabel en het schema van LCDwiki:

| Functie | GPIO |
|---|---|
| RGB-scherm (16 bit) | R: 45, 48, 47, 21, 14 · G: 5, 6, 7, 15, 16, 4 · B: 8, 3, 46, 9, 1 · DE 40, VSYNC 41, HSYNC 39, PCLK 42 |
| Achtergrondlicht | IO2 (EN/PWM van de SY7200-driver) |
| Touch (GT911, I2C) | SDA 19, SCL 20, INT 18, RST 38 |
| microSD (SPI) | CS 10, MOSI 11, CLK 12, MISO 13 |
| Audio (NS4168) | BCLK 0, LRCLK 18, DATA 17 |
| USB-C | via **CH340C** naar UART0 (IO43/IO44): flashen en logs |

Het bord heeft dezelfde pinnen en timing als de Sunton ESP32-8048S050. ESPHome kent dat model (`mipi_rgb`, `model: ESP32-8048S050`).

**PSRAM:** de specificaties van LCDwiki noemen een module N16R8 (octal PSRAM), het bordschema een N8R2 (quad).
Lees de opdruk op het metalen kapje van de ESP32-S3-module en zet `psram_mode` in de YAML op `octal` (N…R8) of `quad` (N…R2).
Staat het verkeerd, dan blijft het scherm zwart en meldt de log een PSRAM-fout.

## 3. Aansluiten van de H28 (RS-485)

Gebruik header **P3** ("SPI interface") voor de data en **P5** voor de voeding. Beide zijn 1,25 mm-connectoren met 4 pinnen.

| H28 | ES3C50P | Header, pin |
|---|---|---|
| VCC | 3,3 V | P5 pin 2 |
| GND | GND | P5 pin 1 |
| RXD | IO11 (UART-TX) | P3 pin 2 |
| TXD | IO13 (UART-RX) | P3 pin 4 |

De Cat 6-kabel van de H28 naar de regelaar blijft zoals in hoofd-README §7.2.

Waarom deze pinnen:
- **IO11/IO13 zijn de SPI-lijnen van het microSD-slot.** Laat dat slot **leeg**. Met de chip select (IO10) hoog doet het slot niets.
- **IO17/IO18 op P5/P6 (UART1) gaan niet zonder solderen.** IO18 hangt via R16 (0 Ω) aan de interruptlijn van de touchcontroller. Die lijn en de TX-uitgang van de H28 zouden dan tegen elkaar in sturen.
- **UART0 (IO43/IO44) is bezet** door de CH340C van de USB-poort.

## 4. Voeding

Het bord heeft **geen VIN-pin**: 5 V komt alleen binnen via **USB-C**. Typisch verbruik: 290 mA bij 5 V. Met het scherm op volle helderheid kan dat meer zijn.

Met de 12 V van klem 17 van de regelaar (hoofd-README §7.3):

```
klem 17 (+12 V) ── PTC/zekering ── stepdown 12→5 V (min. 1 A) ── USB-C-pigtail (5 V + GND) ── ES3C50P
klem 18 (C)     ───────────────────────────── GND ──────────────────────────────────────┘
```

- Neem een stepdown van **1 A** (bv. Recom R-78E5.0-1.0). De R-78E5.0-0.5 van de NodeMCU-versie is te krap.
- Met een PTC: kies **400–500 mA** houdstroom in plaats van 200 mA. Op 12 V vraagt het bord ± 150 mA, en bij het inschakelen meer.
- Of gebruik gewoon een **USB-C-adapter van 5 V / 1 A** als er een stopcontact in de buurt is.
- Tijdens het flashen via USB de 12 V-voeding loskoppelen.

## 5. Flashen

Op de Mac, vanuit de hoofdmap van het project:

```bash
cd ES3C50P
```

```bash
cp dulcopool-scherm.example.yaml dulcopool-scherm.yaml
```

```bash
ln -s ../esphome/secrets.yaml secrets.yaml
```

Vul in `dulcopool-scherm.yaml` je `adafruit_username` in en controleer `psram_mode`. Verbind het bord met een USB-C-**data**kabel en flash:

```bash
esphome run dulcopool-scherm.yaml
```

Kies de seriële poort (`/dev/cu.usbserial-…` of `/dev/cu.wchusbserial…`). Lukt het niet, houd dan **BOOT** ingedrukt, druk kort op **RESET** en laat BOOT los.

Daarna gaan updates via Wi-Fi: `esphome run dulcopool-scherm.yaml --device dulcopool-scherm.local`.
De webpagina staat op `http://dulcopool-scherm.local` (gebruiker `admin`, wachtwoord `web_password` uit `secrets.yaml`).

## 6. Testen

1. **Zonder regelaar.**
   - Het scherm start met "Wachten op de regelaar...".
   - Op tab Info zie je Wi-Fi, het IP-adres en de tijd.
   - Modbus geeft "Nog geen antwoord".
   - In de log zie je Modbus-timeouts: dat is normaal.
2. **Met de regelaar.**
   - Binnen 30 s verschijnt de temperatuur in het groot en wordt de status groen.
   - De eerste punt staat meteen in de grafiek, daarna komt er elke 5 minuten een bij.
3. **Cloud.**
   - Druk op *Nu versturen*. Bij Cloud moeten na enkele seconden drie codes staan: `TS 200 / AIO 200 / Ubi 200`.

## 7. Bekende beperkingen

- **De grafiek staat alleen in het werkgeheugen.** Na een herstart begint ze leeg. De volledige historiek blijft op ThingSpeak staan.
- **De timing en kleuren van het scherm** komen van het Sunton-model.
  - Kleuren omgewisseld of geïnverteerd: zet `invert_colors: true` of `color_order: BGR` onder `display:`.
  - Flikkerend beeld: zet `pclk_frequency: 12MHz` onder `display:`.
- **ESPHome waarschuwt bij het valideren dat IO19/IO20 USB-pinnen zijn.** Op dit bord zijn het de touchlijnen, en de USB loopt via de CH340C. De waarschuwing mag je negeren.
- **Op de schermtekst staan geen accenten** (é, ë). Die zitten niet in het ingebouwde lettertype.
