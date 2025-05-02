# 🚀 XHRay – Setup & Usage Guide

Welcome to **XHRay – Telemetry Correlator**, a Tampermonkey script built for DOM + network event tracing and correlation.

---

## 📦 Installation

### 1. **Install Tampermonkey**
- Chrome/Firefox: [https://www.tampermonkey.net](https://www.tampermonkey.net)

### 2. **Build the Script (via Vite)**
```bash
npm install
npm run build
```

This will produce:
```
dist/xhray.user.js
```

### 3. **Install to Tampermonkey**
- Open Tampermonkey dashboard → Create new script → Paste built output
- Or drag `xhray.user.js` into the dashboard

---

## 🧠 Features

- DOM event capture (click, submit, input, etc.)
- XHR & fetch request logging
- WebSocket send/receive logs
- Beacon ping tracking
- Rule-based correlation
- Floating telemetry panel with live updates
- Live rule editor
- Settings UI (via GM menu)
- Log export/download
- Theme toggle

---

## ⚙️ Settings Panel

Access it via the Tampermonkey menu:
```
⚙️ Open Settings Panel
```

Options include:
- Enable WebSocket logging
- Enable sendBeacon logging
- Persist logs across reloads
- Dark/light theme toggle
- Adjustable log size

---

## 🧪 Development Workflow

### Run Post-Setup
```bash
./post-setup.bat
```

### Start Dev Container (VS Code)
- Open in VS Code
- Reopen in Container via Command Palette
- Tools auto-installed:
  - Node, Git
  - auto-changelog
  - Vite

---

## 🌐 Publishing Workflow

1. Run the release script:
```bash
./release-tag.bat
```

2. Select version bump (e.g. patch, minor, pre-release)
3. Auto-tags and commits via Git
4. Generates:
   - `CHANGELOG.md` entry
   - `release-notes.txt`
5. Optional GitHub Release creation via API

---

## 📘 Documentation

View all documentation at:
```
/docs/index.html
```

- Changelog: `/docs/changelog.html`
- Release Notes: `/docs/release-notes.txt`
- Guide: `/docs/guide.md`

---

## 🙌 Contributing

Pull requests are welcome. Run `./scripts/seed-labels.sh` to sync labels with the repo.

For issues and ideas, use the `feature`, `bug`, and `chore` tags in commits and PRs.

---