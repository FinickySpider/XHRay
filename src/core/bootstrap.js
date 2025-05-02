import { initDOMCapture } from '../core/telemetry/domCapture.js';
import { patchXHR, patchFetch } from '../core/telemetry/network.js';
import { patchWebSocket } from '../core/telemetry/websocket.js';
import { patchSendBeacon } from '../core/telemetry/beacon.js';
import { createPanel } from '../ui/panels/overlay.js';
import { loadRules, restoreLogsFromSession, getLogState } from '../storage/persistence.js';
import { renderLogs } from '../ui/panels/overlay.js';
import { applyTheme } from '../settings/theme.js';

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