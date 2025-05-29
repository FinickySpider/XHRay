// Monkey patch for navigator.sendBeacon to capture Beacon API requests. Entries
// are pushed into the request log so they can be correlated with DOM events.

import { generateUUID, truncate } from '../../utils/logger.js';
import { requestsLog, pushToRolling } from '../../storage/persistence.js';
import { renderLogs } from '../../ui/panels/overlay.js';
import { getLogState } from '../../storage/persistence.js';

// Apply the patch if the user has enabled Beacon logging. Subsequent calls will
// skip patching if it has already been applied.
export function patchSendBeacon() {
  if (!getLogState().beaconLogging) return;
  if (navigator._tm_beacon_patched) return;
  navigator._tm_beacon_patched = true;
  const origBeacon = navigator.sendBeacon;
  // Replace `sendBeacon` with a wrapper that records the request details
  // before delegating to the original implementation.
  navigator.sendBeacon = function(url, data) {
    // Store a simplified record of the beacon call in the rolling request log
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