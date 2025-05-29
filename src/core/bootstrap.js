// Bootstrapping logic for the userscript.  This module wires up all pieces of
// XHRay and starts the periodic log rendering.  It is imported by the entry
// point in `main.js`.

import { initDOMCapture } from '../core/telemetry/domCapture.js';
import { patchXHR, patchFetch } from '../core/telemetry/network.js';
import { patchWebSocket } from '../core/telemetry/websocket.js';
import { patchSendBeacon } from '../core/telemetry/beacon.js';
import { createPanel } from '../ui/panels/overlay.js';
import { loadRules, restoreLogsFromSession, getLogState } from '../storage/persistence.js';
import { renderLogs } from '../ui/panels/overlay.js';
import { applyTheme } from '../settings/theme.js';

// Initialize the telemetry system and start UI rendering. This pulls persisted
// settings, attaches all telemetry patches and sets up the panel refresh loop.
export function bootstrap() {
    const { persistLogs, wsLogging, beaconLogging, panelHidden } = getLogState();

    if (persistLogs) {
        restoreLogsFromSession();
    }
    loadRules();
    initDOMCapture();
    patchXHR();
    patchFetch();
    if (wsLogging) patchWebSocket();
    if (beaconLogging) patchSendBeacon();
    createPanel();

    setInterval(() => {
        if (!panelHidden) renderLogs();
    }, 1000);
}