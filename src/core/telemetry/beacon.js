import { generateUUID, truncate } from '../../utils/logger.js';
import { requestsLog, pushToRolling } from '../../storage/persistence.js';
import { renderLogs } from '../../ui/panels/overlay.js';
import { getLogState } from '../../storage/persistence.js';

export function patchSendBeacon() {
  if (!getLogState().beaconLogging) return;
  if (navigator._tm_beacon_patched) return;
  navigator._tm_beacon_patched = true;
  const origBeacon = navigator.sendBeacon;
  navigator.sendBeacon = function(url, data) {
    pushToRolling(requestsLog, {
      id: generateUUID(),
      method: 'BEACON',
      url,
      status: 'sendBeacon',
      body: truncate(data ? data.toString() : '', 200),
      response: '',
      timestamp: performance.now(),
      duration: 0,
      rulesMatched: []
    });
    if (!getLogState().panelHidden) renderLogs();
    return origBeacon.apply(this, arguments);
  };
}