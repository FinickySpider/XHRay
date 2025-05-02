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