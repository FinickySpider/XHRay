# 🛰️ XHRay – Telemetry Correlator

[![Version](https://img.shields.io/github/v/tag/FinickySpider/XHRay?label=version&style=flat-square)](https://github.com/FinickySpider/XHRay/releases)
[![Build](https://github.com/FinickySpider/XHRay/actions/workflows/build.yml/badge.svg)](https://github.com/FinickySpider/XHRay/actions)
[![Release](https://github.com/FinickySpider/XHRay/actions/workflows/release.yml/badge.svg)](https://github.com/FinickySpider/XHRay/releases)
[![License](https://img.shields.io/github/license/FinickySpider/XHRay?style=flat-square)](LICENSE)
[![Userscript Installs](https://img.shields.io/badge/userscript-install-green?style=flat-square)](https://github.com/FinickySpider/XHRay/raw/main/dist/xhray.user.js)

---

> Replace `FinickySpider` in the URLs above with your GitHub username before publishing

# 🛰️ XHRay – Telemetry Correlator

**XHRay** is a modular, extensible Tampermonkey userscript for correlating DOM events and network telemetry (XHR, fetch, WebSocket, sendBeacon) with rule-based matching and a live UI panel.

---

## 📁 Project Structure

```
src/
├── main.js                # Entrypoint
├── header.meta.js         # Tampermonkey metadata block
├── bootstrap.js           # Master loader and initializer
│
├── core/
│   └── telemetry/
│       ├── domCapture.js  # DOM event tracking (click, input, etc.)
│       ├── network.js     # XHR and fetch patching
│       ├── websocket.js   # WebSocket patching
│       └── beacon.js      # navigator.sendBeacon patching
│
├── matchers/
│   └── rules.js           # Rule engine for DOM selectors and URL patterns
│
├── settings/
│   ├── theme.js           # Applies light/dark styling
│   └── menu.js            # Tampermonkey menu and settings panel
│
├── storage/
│   └── persistence.js     # Rolling logs, rule loading, session restore
│
├── ui/
│   └── panels/
│       ├── overlay.js     # Floating telemetry panel with logs & controls
│       └── ruleEditor.js  # Embedded JSON rule editor UI
│
└── utils/
    ├── csspath.js         # Generates simple CSS selector paths
    ├── exporter.js        # Export logs to JSON via GM_download
    └── logger.js          # UUID & truncate helpers
```

---

## 🧠 Key Features

- DOM event tracking (`click`, `submit`, `input`, etc.)
- XHR and Fetch network monitoring
- WebSocket send/receive logging
- Beacon request capture
- Live JSON rule editing panel
- Configurable log retention and theme
- Panel drag, auto-scroll, export, and persistence

---

## 🚀 Entry Flow

1. `main.js` → calls `bootstrap()`
2. `bootstrap.js`:
   - Loads settings and rules
   - Sets up all telemetry layers
   - Registers menu command to launch settings panel
   - Initializes floating UI

---

## 🧩 How to Extend

- Add new rule types in `matchers/rules.js`
- Add visualizations in `ui/panels/overlay.js`
- Add storage strategies in `storage/persistence.js`
- Add future capture layers in `core/telemetry/`

---

## 🔨 Build System (Optional)

Use Vite or a bundler to compile `src/main.js`, inject `header.meta.js`, and output to:

```
dist/xhray.user.js
```

You can then install that file directly into Tampermonkey.

---

## 👨‍💻 Author Notes

This structure is designed for **clarity, maintainability, and modular scale**. Every system is isolated for testing and expansion. Features like GraphQL inspection, timeline replay, or visual correlation views can be added with minimal friction.

---

**Built for developers. Powered by telemetry.**