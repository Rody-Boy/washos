# Samsung Wash OS — LED Wall Presentation

Animated HTML/CSS/JS presentation for the Samsung Wash OS product launch, designed for a 3-section LED wall played through Resolume Arena.

## LED Wall Specs

| | Resolution | Pixels |
|---|---|---|
| **Full Canvas** | 4224 x 896 | — |
| Left Panel | 1536 x 896 | 0 – 1535 |
| Center Panel | 1152 x 896 | 1536 – 2687 |
| Right Panel | 1536 x 896 | 2688 – 4223 |

## Two Versions

### Morning — With Voiceover
**Folder:** `led-wall-resolume/`
**Duration:** 4:08 (248 seconds)
**Start:** Click overlay to begin

Includes narrated voiceover synced to each of the 12 slides. Audio plays automatically after the initial click.

### Afternoon — No Voiceover
**Folder:** `led-wall-resolume-no-vo/`
**Duration:** 4:23 (263 seconds)
**Start:** Auto-plays on load

Same animations and transitions, different timing, no audio. Designed for live speaker accompaniment or ambient display.

## Preview

Open in Chrome:
- **Morning:** `led-wall-resolume/samsung_washos_keynote.html`
- **Afternoon:** `led-wall-resolume-no-vo/samsung_washos_keynote.html`

Or via GitHub Pages:
- [Morning (with VO)](https://rody-boy.github.io/washos/led-wall-resolume/samsung_washos_keynote.html)
- [Afternoon (no VO)](https://rody-boy.github.io/washos/led-wall-resolume-no-vo/samsung_washos_keynote.html)

## Slides

| # | Title | Morning | Afternoon |
|---|---|---|---|
| 1 | Opening Impact | 30s | 32s |
| 2 | Universal Truth | 10s | 20s |
| 3 | Industry Gap | 20s | 18s |
| 4 | The Opportunity | 20s | 20s |
| 5 | WASH OS Reveal | 10s | 25s |
| 6 | The Ecosystem | 18s | 15s |
| 7 | Customer Experience | 35s | 25s |
| 8 | Shop Operations | 24s | 27s |
| 9 | Smart Machines | 18s | 23s |
| 10 | Industry Transformation | 16s | 18s |
| 11 | Closing Ecosystem | 18s | 18s |
| 12 | Platform + Outro | 29s | 22s |

## Documentation

| File | Audience | Contents |
|---|---|---|
| `TECHNICAL_SETUP_GUIDE.txt` | Tech team | Resolume setup, panel mapping, audio routing, troubleshooting |
| `PRESENTATION_GUIDE.txt` | Everyone | Preview instructions, slide descriptions, VO script, FAQ |
| `led-wall-resolume/instructions.txt` | Tech team | Quick setup reference for the VO version |

## Key Features

- **Offline-ready** — fonts embedded as base64, all assets local, no internet needed
- **Responsive** — adapts to 4224x896 ultra-wide via CSS media queries
- **Auto-advancing** — slides transition automatically with configurable timing
- **Voiceover sync** — audio clips play per-slide, triggered on any navigation method
- **Loop** — presentation loops after the final slide
- **Manual control** — arrow keys to skip forward/back (auto-advance continues)
- **Debug guides** — press G to show LED panel boundary lines

## Video Export (Optional)

Requires Node.js:

```bash
npm install
node led-wall-resolume/convert-to-mp4.js        # Morning
node led-wall-resolume-no-vo/convert-to-mp4.js   # Afternoon
```

Outputs 4224x896 MP4, H.264 High@5.1, CRF 12, 30fps. Captured at 2x with Lanczos downscale.

## Tech Stack

- HTML / CSS / JavaScript (single-file, no framework)
- CSS keyframe animations + JS setTimeout scheduling
- Web Audio API for voiceover playback
- Puppeteer + CDP virtual time for video export
- FFmpeg for MP4 encoding

## Folder Structure

```
washos/
├── README.md
├── TECHNICAL_SETUP_GUIDE.txt
├── PRESENTATION_GUIDE.txt
├── package.json
├── led-wall-resolume/                  # Morning (with VO)
│   ├── samsung_washos_keynote.html
│   ├── instructions.txt
│   ├── convert-to-mp4.js
│   ├── *.png (7 assets)
│   └── voice_over/
│       ├── vo_slide01-11.mp3
│       ├── vo_full_timed.mp3
│       └── VO.mp3 (original)
└── led-wall-resolume-no-vo/            # Afternoon (no VO)
    ├── samsung_washos_keynote.html
    ├── convert-to-mp4.js
    └── *.png (7 assets)
```

---

Built by GoodApps, Inc. for Samsung Product Launch Event, 2026.
