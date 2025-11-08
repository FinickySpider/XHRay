import { generateUUID } from '../../utils/logger.js';
import { getCSSPath } from '../../utils/csspath.js';
import { truncate } from '../../utils/logger.js';
import { pushToRolling, eventsLog } from '../../storage/persistence.js';
import { matchRulesForEvent } from '../../matchers/rules.js';
import { renderLogs } from '../../ui/panels/overlay.js';
import { getLogState } from '../../storage/persistence.js';

export function initDOMCapture() {
  ['click','submit','change','keydown','input'].forEach(type => {
    document.addEventListener(type, evt => {
      try {
        // Ignore events from within the XHRay panel itself
        let target = evt.target;
        while (target) {
          if (target.id === 'telemetry-panel' || target.id === 'telemetry-header' || target.id === 'telemetry-logs') {
            return; // Skip logging this event
          }
          if (target.className && typeof target.className === 'string' && 
              (target.className.includes('entry-container') || 
               target.className.includes('entry-details') ||
               target.className.includes('entry'))) {
            return; // Skip logging this event
          }
          target = target.parentElement;
        }
        
        // Also check if the target or any parent has xhray-related attributes
        if (evt.target.closest && evt.target.closest('#telemetry-panel, button[textContent*="Show Telemetry"]')) {
          return;
        }
        
        const rec = {
          id: generateUUID(),
          type: evt.type,
          selector: getCSSPath(evt.target),
          element: evt.target,
          text: truncate(evt.target.innerText, 50),
          timestamp: performance.now()
        };
        matchRulesForEvent(rec);
        pushToRolling(eventsLog, rec);
        if (!getLogState().panelHidden) renderLogs();
      } catch {}
    }, true);
  });
}