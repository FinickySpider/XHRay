// Helper for exporting captured logs as a JSON file using the userscript API
import { eventsLog, requestsLog } from '../storage/persistence.js';

export function exportLogs() {
  const data = JSON.stringify({ events: eventsLog, requests: requestsLog }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  GM_download({ url: URL.createObjectURL(blob), name: 'telemetry-logs.json' });
}