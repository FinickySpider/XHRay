import { generateUUID, truncate } from '../../utils/logger.js';
import { requestsLog, pushToRolling } from '../../storage/persistence.js';
import { renderLogs } from '../../ui/panels/overlay.js';
import { getLogState } from '../../storage/persistence.js';

export function patchWebSocket() {
  if (!getLogState().wsLogging) return;
  if (window._tm_ws_patched) return;
  window._tm_ws_patched = true;
  const OrigWS = window.WebSocket;
  window.WebSocket = function(url, protocols) {
    const ws = protocols ? new OrigWS(url, protocols) : new OrigWS(url);
    ws.addEventListener('message', event => {
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
      if (!getLogState().panelHidden) renderLogs();
    });
    const origSend = ws.send;
    ws.send = function(data) {
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
      if (!getLogState().panelHidden) renderLogs();
      return origSend.call(this, data);
    };
    return ws;
  };
  window.WebSocket.prototype = OrigWS.prototype;
}