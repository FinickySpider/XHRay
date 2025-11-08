import { rules, resetRulesToDefault } from '../../matchers/rules.js';
import { loadRules } from '../../storage/persistence.js';
import { renderLogs } from './overlay.js';

export function renderRuleEditor(container) {
  const dark = !!GM_getValue("darkTheme", true);
  
  const c = document.createElement('div');
  c.style.marginTop = '8px';
  c.style.borderTop = dark ? '1px solid rgba(0, 255, 0, 0.3)' : '1px solid rgba(34, 34, 34, 0.3)';
  c.style.paddingTop = '6px';

  const ta = document.createElement('textarea');
  Object.assign(ta.style, {
    width: '100%',
    height: '100px',
    background: dark ? '#1a1a1a' : '#fff',
    color: dark ? '#e0e0e0' : '#222',
    border: dark ? '1px solid #0f0' : '1px solid #888',
    fontFamily: 'monospace',
    fontSize: '11px',
    padding: '4px'
  });
  ta.value = JSON.stringify(rules, null, 2);

  const fb = document.createElement('div');
  fb.style.color = '#f90';
  fb.style.margin = '4px 0';
  fb.style.fontSize = '11px';

  const buttonStyle = {
    fontSize: '10px',
    marginRight: '4px',
    background: dark ? '#222' : '#f0f0f0',
    color: dark ? '#0f0' : '#222',
    border: dark ? '1px solid #0f0' : '1px solid #888',
    borderRadius: '3px',
    padding: '4px 8px',
    cursor: 'pointer'
  };

  const save = document.createElement('button');
  save.textContent = 'Save Rules';
  Object.assign(save.style, buttonStyle);
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
  Object.assign(reset.style, buttonStyle);
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