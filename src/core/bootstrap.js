import { initDOMCapture } from '../core/telemetry/domCapture.js';
import { patchXHR, patchFetch } from '../core/telemetry/network.js';
import { patchWebSocket } from '../core/telemetry/websocket.js';
import { patchSendBeacon } from '../core/telemetry/beacon.js';
import { createPanel, respawnPanel } from '../ui/panels/overlay.js';
import { loadRules, restoreLogsFromSession, getLogState } from '../storage/persistence.js';
import { renderLogs } from '../ui/panels/overlay.js';
import { applyTheme } from '../settings/theme.js';

export function bootstrap() {
    const { persistLogs, wsLogging, beaconLogging, panelHidden } = getLogState();

    if (persistLogs) {
        restoreLogsFromSession();
    }
    loadRules();
    
    // Patch telemetry APIs immediately
    initDOMCapture();
    patchXHR();
    patchFetch();
    if (wsLogging) patchWebSocket();
    if (beaconLogging) patchSendBeacon();
    
    // Wait for DOM to be ready before creating panel
    if (document.body) {
        createPanel();
    } else {
        // If body doesn't exist yet, wait for DOMContentLoaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', createPanel);
        } else {
            // DOM already loaded but body somehow missing, try with delay
            setTimeout(createPanel, 100);
        }
    }

    setInterval(() => {
        if (!panelHidden) renderLogs();
    }, 1000);
    
    // Register Tampermonkey menu command for respawning panel
    GM_registerMenuCommand('🔄 Respawn XHRay Panel', respawnPanel);
}