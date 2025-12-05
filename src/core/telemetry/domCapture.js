// Attaches high level DOM event listeners and records interactions.  Each
// interaction is normalised into an event record and stored for later matching
// against network requests.

import { generateUUID } from '../../utils/logger.js';
import { getCSSPath } from '../../utils/csspath.js';
import { truncate } from '../../utils/logger.js';
import { pushToRolling, eventsLog } from '../../storage/persistence.js';
import { matchRulesForEvent } from '../../matchers/rules.js';
import { renderLogs } from '../../ui/panels/overlay.js';
import { getLogState } from '../../storage/persistence.js';

// Registers DOM listeners for several common events and records each
// interaction into the events log.
export function initDOMCapture() {
  // Listen for a variety of user interactions on the document
  ['click','submit','change','keydown','input'].forEach(type => {
    document.addEventListener(type, evt => {
      try {
        // Build an event record describing the interaction
        const rec = {
          id: generateUUID(),
          type: evt.type,
          selector: getCSSPath(evt.target),
          element: evt.target,
          text: truncate(evt.target.innerText, 50),
          timestamp: performance.now()
        };
        // Associate event entries with any matching correlation rules
        matchRulesForEvent(rec);
        // Persist the event in the rolling log, trimming when necessary
        pushToRolling(eventsLog, rec);
        // Re-render the log panel unless it has been manually hidden
        if (!getLogState().panelHidden) renderLogs();
      } catch {
        // Ignore errors from event processing to avoid breaking the page
      }
    }, true);
  });
}