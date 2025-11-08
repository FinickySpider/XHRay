import { eventsLog, requestsLog } from '../storage/persistence.js';
import { rules } from '../matchers/rules.js';

export function exportLogs() {
  const data = JSON.stringify({ events: eventsLog, requests: requestsLog }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  GM_download({ url: URL.createObjectURL(blob), name: 'telemetry-logs.json' });
}

export function exportSettings() {
  const settings = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    rules: rules,
    settings: {
      logSize: GM_getValue('logSize', 500),
      persistLogs: GM_getValue('persistLogs', false),
      wsLogging: GM_getValue('wsLogging', false),
      beaconLogging: GM_getValue('beaconLogging', false),
      darkTheme: GM_getValue('darkTheme', true),
      timestampMode: GM_getValue('timestampMode', 'relative'),
      rulesExpanded: GM_getValue('rulesExpanded', false),
      panelPosition: GM_getValue('panelPosition', null),
      panelDimensions: GM_getValue('panelDimensions', null)
    }
  };
  
  const data = JSON.stringify(settings, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const timestamp = new Date().toISOString().split('T')[0];
  GM_download({ url: URL.createObjectURL(blob), name: `xhray-settings-${timestamp}.json` });
}

export function importSettings(jsonString, callback) {
  try {
    const data = JSON.parse(jsonString);
    
    // Validate structure
    if (!data.version || !data.rules || !data.settings) {
      throw new Error('Invalid settings file structure. Missing required fields.');
    }
    
    if (!Array.isArray(data.rules)) {
      throw new Error('Rules must be an array.');
    }
    
    // Import rules
    rules.length = 0;
    rules.push(...data.rules);
    GM_setValue('telemetryRules', JSON.stringify(data.rules));
    
    // Import settings
    const s = data.settings;
    if (s.logSize !== undefined) GM_setValue('logSize', s.logSize);
    if (s.persistLogs !== undefined) GM_setValue('persistLogs', s.persistLogs);
    if (s.wsLogging !== undefined) GM_setValue('wsLogging', s.wsLogging);
    if (s.beaconLogging !== undefined) GM_setValue('beaconLogging', s.beaconLogging);
    if (s.darkTheme !== undefined) GM_setValue('darkTheme', s.darkTheme);
    if (s.timestampMode !== undefined) GM_setValue('timestampMode', s.timestampMode);
    if (s.rulesExpanded !== undefined) GM_setValue('rulesExpanded', s.rulesExpanded);
    if (s.panelPosition) GM_setValue('panelPosition', s.panelPosition);
    if (s.panelDimensions) GM_setValue('panelDimensions', s.panelDimensions);
    
    callback(null, 'Settings imported successfully. Refresh page to apply all changes.');
  } catch (error) {
    callback(error.message, null);
  }
}