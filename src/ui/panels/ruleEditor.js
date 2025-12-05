// UI component for editing the rule JSON directly within the overlay
import { rules, resetRulesToDefault } from '../../matchers/rules.js';
import { loadRules } from '../../storage/persistence.js';
import { renderLogs } from './overlay.js';

// Render a text area and controls for editing and persisting rule JSON
export function renderRuleEditor(container) {
  // Container for the editor UI
  const c = document.createElement('div');
  c.style.marginTop = '8px';
  c.style.borderTop = '1px solid #0f0';
  c.style.paddingTop = '6px';

  // Textarea where the JSON is edited
  const ta = document.createElement('textarea');
  ta.style.width = '100%';
  ta.style.height = '100px';
  ta.value = JSON.stringify(rules, null, 2);

  // Feedback area for validation messages
  const fb = document.createElement('div');
  fb.style.color = '#f90';
  fb.style.margin = '4px 0';

  const save = document.createElement('button');
  save.textContent = 'Save Rules';
  // Validate and store the edited rules
  save.onclick = () => {
    try {
      const parsed = JSON.parse(ta.value);
      if (!Array.isArray(parsed)) throw new Error("Rules JSON must be an array of rule objects.");
      GM_setValue('telemetryRules', ta.value);
      rules.length = 0; rules.push(...parsed);
      renderLogs();
      fb.textContent = '✅ Rules saved';
    } catch (err) {
      fb.textContent = '❌ Invalid JSON: ' + err.message;
    }
  };

  const reset = document.createElement('button');
  reset.textContent = 'Reset Defaults';
  reset.style.marginLeft = '4px';
  // Restore the default rule set
  reset.onclick = () => {
    GM_setValue('telemetryRules', '');
    resetRulesToDefault();
    loadRules();
    ta.value = JSON.stringify(rules, null, 2);
    renderLogs();
    fb.textContent = 'ℹ️ Defaults restored';
  };

  c.appendChild(ta);
  c.appendChild(fb);
  c.appendChild(save);
  c.appendChild(reset);
  container.appendChild(c);
}