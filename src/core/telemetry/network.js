// Network interception utilities for XHR and Fetch requests.  Each intercepted
// request is recorded so it can later be correlated with DOM events.

import { generateUUID, truncate } from '../../utils/logger.js';
import { requestsLog, pushToRolling } from '../../storage/persistence.js';
import { matchRulesForRequest } from '../../matchers/rules.js';
import { renderLogs } from '../../ui/panels/overlay.js';
import { getLogState } from '../../storage/persistence.js';

// Helper used by the XHR and Fetch patches to push a request entry into the
// rolling log after applying rule matching.
function logRequest(req) {
  matchRulesForRequest(req);
  pushToRolling(requestsLog, req);
}

// Patch XMLHttpRequest to capture network calls made using the classic XHR API.
export function patchXHR() {
  const o = XMLHttpRequest.prototype.open;
  const s = XMLHttpRequest.prototype.send;
  // Wrap `open` to capture the method and url for later use
  XMLHttpRequest.prototype.open = function(method, url) {
    this._meta = { method, url };
    return o.apply(this, arguments);
  };
  // Wrap `send` so we can record the request/response once it completes
  XMLHttpRequest.prototype.send = function(body) {
    const start = performance.now();
    // When the request finishes gather details and store them
    this.addEventListener('loadend', () => {
      const duration = performance.now() - start;
      let rawResp = '';
      // Accessing `responseText` can throw if the response type is not text
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
      // Push the captured request into storage and apply matching
      logRequest(req);
      // Update the UI if the panel is visible
      if (!getLogState().panelHidden) renderLogs();
    });
    return s.apply(this, arguments);
  };
}

// Patch the Fetch API to intercept modern network requests made via
// `window.fetch`.
export function patchFetch() {
  const f = window.fetch;
  window.fetch = async (...args) => {
    // Intercept the outgoing request and capture timings
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
    // Store the request entry and evaluate matching rules
    logRequest(req);
    // Update the UI if the panel is visible
    if (!getLogState().panelHidden) renderLogs();
    return response;
  };
}