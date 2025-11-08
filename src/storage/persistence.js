import { rules, resetRulesToDefault } from '../matchers/rules.js';

export let eventsLog = [];
export let requestsLog = [];

export function pushToRolling(arr, item) {
  const max = parseInt(GM_getValue("logSize", 500), 10) || 500;
  arr.push(item);
  if (arr.length > max) arr.shift();
  if (getLogState().persistLogs) {
    sessionStorage.setItem('XHRayLogs', JSON.stringify({eventsLog, requestsLog}));
  }
}

export function loadRules() {
  const raw = GM_getValue('telemetryRules');
  if (raw) {
    try { rules.length = 0; rules.push(...JSON.parse(raw)); }
    catch { console.warn('Invalid rules JSON, using defaults'); resetRulesToDefault(); }
  } else {
    resetRulesToDefault();
  }
}

export function restoreLogsFromSession() {
  const data = sessionStorage.getItem('XHRayLogs');
  if (data) {
    try {
      const logs = JSON.parse(data);
      eventsLog = Array.isArray(logs.eventsLog) ? logs.eventsLog : [];
      requestsLog = Array.isArray(logs.requestsLog) ? logs.requestsLog : [];
    } catch {}
  }
}

export function getLogState() {
  return {
    persistLogs: !!GM_getValue("persistLogs", false),
    wsLogging: !!GM_getValue("wsLogging", false),
    beaconLogging: !!GM_getValue("beaconLogging", false),
    panelHidden: false // to be set dynamically
  };
}

export function getPanelState() {
  const positionStr = GM_getValue('panelPosition');
  const defaultPosition = { bottom: '10px', right: '10px' };
  
  try {
    const position = positionStr ? JSON.parse(positionStr) : defaultPosition;
    return {
      position,
      hidden: !!GM_getValue('panelHidden', false),
      minimized: !!GM_getValue('panelMinimized', false)
    };
  } catch {
    return { position: defaultPosition, hidden: false, minimized: false };
  }
}

export function savePanelState(state) {
  if (state.position) {
    GM_setValue('panelPosition', JSON.stringify(state.position));
  }
  if (state.hidden !== undefined) {
    GM_setValue('panelHidden', state.hidden);
  }
  if (state.minimized !== undefined) {
    GM_setValue('panelMinimized', state.minimized);
  }
}