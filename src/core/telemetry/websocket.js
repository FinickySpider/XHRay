// WebSocket patch used to log both sent and received messages.  This allows
// correlation with captured DOM events when real-time protocols are used.

import { generateUUID, truncate } from '../../utils/logger.js';
import { requestsLog, pushToRolling } from '../../storage/persistence.js';
import { renderLogs } from '../../ui/panels/overlay.js';
import { getLogState } from '../../storage/persistence.js';

// Replace the global WebSocket constructor with a wrapper that records
// messages and forwards calls to the original implementation.
export function patchWebSocket() {
  // Respect user settings and avoid double patching
  if (!getLogState().wsLogging) return;
  if (window._tm_ws_patched) return;
  window._tm_ws_patched = true;
  const OrigWS = window.WebSocket;
  window.WebSocket = function(url, protocols) {
    const ws = protocols ? new OrigWS(url, protocols) : new OrigWS(url);
    // Track messages coming from the server
    ws.addEventListener('message', event => {
      // Record inbound WebSocket messages
      pushToRolling(requestsLog, {
        id: generateUUID(),
        method: 'WS:recv',
        url,
        status: 'message',
        body: '',
        response: truncate(event.data, 1024),
        timestamp: performance.now(),
        duration: 0,
        rulesMatched: []
      });
      // Update the UI if the panel is visible
      if (!getLogState().panelHidden) renderLogs();
    });
    const origSend = ws.send;
    // Wrap `send` to log outbound messages
    ws.send = function(data) {
      // Record outbound WebSocket messages
      pushToRolling(requestsLog, {
        id: generateUUID(),
        method: 'WS:send',
        url,
        status: 'send',
        body: truncate(data, 200),
        response: '',
        timestamp: performance.now(),
        duration: 0,
        rulesMatched: []
      });
      // Update the UI if the panel is visible
      if (!getLogState().panelHidden) renderLogs();
      return origSend.call(this, data);
    };
    return ws;
  };
  window.WebSocket.prototype = OrigWS.prototype;
}