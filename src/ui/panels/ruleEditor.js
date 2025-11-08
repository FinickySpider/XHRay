import { rules, resetRulesToDefault } from '../../matchers/rules.js';
import { loadRules } from '../../storage/persistence.js';
import { renderLogs } from './overlay.js';

export function renderRuleEditor(container) {
  const dark = !!GM_getValue("darkTheme", true);
  let rulesExpanded = !!GM_getValue("rulesExpanded", false);
  
  const c = document.createElement('div');
  c.style.marginTop = '8px';
  c.style.borderTop = dark ? '1px solid rgba(0, 255, 0, 0.3)' : '1px solid rgba(34, 34, 34, 0.3)';
  c.style.paddingTop = '6px';

  // Toggle button for collapsible rules
  const toggleBtn = document.createElement('button');
  toggleBtn.textContent = rulesExpanded ? '▼ Rules Editor' : '▶ Rules Editor';
  Object.assign(toggleBtn.style, {
    fontSize: '11px',
    marginBottom: '6px',
    background: dark ? '#222' : '#f0f0f0',
    color: dark ? '#0f0' : '#222',
    border: dark ? '1px solid #0f0' : '1px solid #888',
    borderRadius: '3px',
    padding: '4px 8px',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left'
  });

  // Content container (collapsible)
  const contentContainer = document.createElement('div');
  contentContainer.style.display = rulesExpanded ? 'block' : 'none';

  const ta = document.createElement('textarea');
  Object.assign(ta.style, {
    width: '100%',
    height: '100px',
    background: dark ? '#1a1a1a' : '#fff',
    color: dark ? '#e0e0e0' : '#222',
    border: dark ? '1px solid #0f0' : '1px solid #888',
    fontFamily: 'monospace',
    fontSize: '11px',
    padding: '4px',
    boxSizing: 'border-box'
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

  contentContainer.appendChild(ta);
  contentContainer.appendChild(fb);
  contentContainer.appendChild(save);
  contentContainer.appendChild(reset);

  // Toggle button click handler
  toggleBtn.onclick = () => {
    rulesExpanded = !rulesExpanded;
    GM_setValue("rulesExpanded", rulesExpanded);
    contentContainer.style.display = rulesExpanded ? 'block' : 'none';
    toggleBtn.textContent = rulesExpanded ? '▼ Rules Editor' : '▶ Rules Editor';
  };

  c.appendChild(toggleBtn);
  c.appendChild(contentContainer);
  container.appendChild(c);
}