// Persistence helpers for logs and rule configuration. This module also
// exposes the current in-memory event and request logs.
import { rules, resetRulesToDefault } from '../matchers/rules.js';

// Circular buffers used to store the most recent events and requests
export let eventsLog = [];
export let requestsLog = [];

// Push an item onto a rolling array with optional persistence to sessionStorage
export function pushToRolling(arr, item) {
  const max = parseInt(GM_getValue("logSize", 500), 10) || 500;
  arr.push(item);
  if (arr.length > max) arr.shift();
  if (getLogState().persistLogs) {
    sessionStorage.setItem('XHRayLogs', JSON.stringify({ eventsLog, requestsLog }));
  }
}

// Load rule configuration from GM storage, falling back to defaults on error
export function loadRules() {
  const raw = GM_getValue('telemetryRules');
  if (raw) {
    try { rules.length = 0; rules.push(...JSON.parse(raw)); }
    catch {
      console.warn('Invalid rules JSON, using defaults');
      resetRulesToDefault();
    }
  } else {
    resetRulesToDefault();
  }
}

// Restore persisted logs from sessionStorage when resuming a session
export function restoreLogsFromSession() {
  const data = sessionStorage.getItem('XHRayLogs');
  if (data) {
    try {
      const logs = JSON.parse(data);
      eventsLog = Array.isArray(logs.eventsLog) ? logs.eventsLog : [];
      requestsLog = Array.isArray(logs.requestsLog) ? logs.requestsLog : [];
    } catch {
      // Ignore corrupt session data and start fresh
    }
  }
}

// Convenience helper for reading logging related settings
export function getLogState() {
  return {
    persistLogs: !!GM_getValue("persistLogs", false),
    wsLogging: !!GM_getValue("wsLogging", false),
    beaconLogging: !!GM_getValue("beaconLogging", false),
    panelHidden: false // to be set dynamically
  };
}