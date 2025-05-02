import { generateUUID, truncate } from '../../utils/logger.js';
import { requestsLog, pushToRolling } from '../../storage/persistence.js';
import { matchRulesForRequest } from '../../matchers/rules.js';
import { renderLogs } from '../../ui/panels/overlay.js';
import { getLogState } from '../../storage/persistence.js';

function logRequest(req) {
  matchRulesForRequest(req);
  pushToRolling(requestsLog, req);
}

export function patchXHR() {
  const o = XMLHttpRequest.prototype.open;
  const s = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function(method, url) {
    this._meta = {method, url};
    return o.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function(body) {
    const start = performance.now();
    this.addEventListener('loadend', () => {
      const duration = performance.now() - start;
      let rawResp = '';
      try { rawResp = this.responseText; } catch {}
      const req = {
        id: generateUUID(),
        method: this._meta.method,
        url: this._meta.url,
        status: this.status,
        body: truncate(body, 200),
        response: truncate(rawResp, 1024),
        timestamp: start,
        duration
      };
      logRequest(req);
      if (!getLogState().panelHidden) renderLogs();
    });
    return s.apply(this, arguments);
  };
}

export function patchFetch() {
  const f = window.fetch;
  window.fetch = async (...args) => {
    const start = performance.now();
    const response = await f.apply(this, args);
    let data = '';
    try { data = await response.clone().text(); } catch {}
    const duration = performance.now() - start;
    const req = {
      id: generateUUID(),
      method: args[1]?.method || 'GET',
      url: args[0],
      status: response.status,
      body: truncate(args[1]?.body, 200),
      response: truncate(data, 1024),
      timestamp: start,
      duration
    };
    logRequest(req);
    if (!getLogState().panelHidden) renderLogs();
    return response;
  };
}