import { generateUUID, truncate } from '../../utils/logger.js';
import { requestsLog, pushToRolling, eventsLog } from '../../storage/persistence.js';
import { renderLogs } from '../../ui/panels/overlay.js';
import { getLogState } from '../../storage/persistence.js';
import { matchRulesForRequest } from '../../matchers/rules.js';

// Track recent events for correlation (last 2 seconds)
function getRecentEventId() {
  const now = performance.now();
  const recentEvents = eventsLog.filter(e => now - e.timestamp < 2000);
  return recentEvents.length > 0 ? recentEvents[recentEvents.length - 1].id : null;
}

export function patchWebSocket() {
  if (!getLogState().wsLogging) return;
  if (window._tm_ws_patched) return;
  window._tm_ws_patched = true;
  const OrigWS = window.WebSocket;
  window.WebSocket = function(url, protocols) {
    const ws = protocols ? new OrigWS(url, protocols) : new OrigWS(url);
    ws.addEventListener('message', event => {
      const entry = {
        id: generateUUID(),
        method: 'WS:recv',
        url,
        status: 'message',
        body: '',
        response: truncate(event.data, 1024),
        timestamp: performance.now(),
        duration: 0,
        rulesMatched: [],
        eventId: getRecentEventId()
      };
      matchRulesForRequest(entry);
      pushToRolling(requestsLog, entry);
      if (!getLogState().panelHidden) renderLogs();
    });
    const origSend = ws.send;
    ws.send = function(data) {
      const entry = {
        id: generateUUID(),
        method: 'WS:send',
        url,
        status: 'send',
        body: truncate(data, 200),
        response: '',
        timestamp: performance.now(),
        duration: 0,
        rulesMatched: [],
        eventId: getRecentEventId()
      };
      matchRulesForRequest(entry);
      pushToRolling(requestsLog, entry);
      if (!getLogState().panelHidden) renderLogs();
      return origSend.call(this, data);
    };
    return ws;
  };
  window.WebSocket.prototype = OrigWS.prototype;
}