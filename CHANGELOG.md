# 📦 XHRay – Change Log

All notable changes to this project will be documented in this file.

---

## [0.4.0] - Initial Modular Release

### Added
- Full telemetry pipeline for:
  - DOM Events
  - XHR
  - fetch()
  - WebSocket
  - sendBeacon
- Modular architecture using Vite-ready structure
- Live rule editor in panel
- Drag-and-drop floating telemetry panel
- Settings panel with GM_* persistence
- Export/clear/hide controls
- Auto-scroll with toggle
- Tampermonkey-compatible metadata via `header.meta.js`

### Refactored
- Split original monolith into:
  - `core/telemetry/`
  - `settings/`
  - `matchers/`
  - `storage/`
  - `ui/panels/`
  - `utils/`