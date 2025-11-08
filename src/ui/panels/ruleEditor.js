import { rules, resetRulesToDefault } from '../../matchers/rules.js';
import { loadRules } from '../../storage/persistence.js';
import { renderLogs } from './overlay.js';
import { getThemeColors } from '../../settings/theme.js';

export function renderRuleEditor(container) {
  const theme = getThemeColors();
  let rulesExpanded = !!GM_getValue("rulesExpanded", false);
  
  const c = document.createElement('div');
  c.style.marginTop = '8px';
  c.style.borderTop = `1px solid ${theme.border}`;
  c.style.paddingTop = '8px';

  // Toggle button for collapsible rules
  const toggleBtn = document.createElement('button');
  toggleBtn.textContent = rulesExpanded ? '▼ Rules Editor' : '▶ Rules Editor';
  Object.assign(toggleBtn.style, {
    fontSize: '11px',
    marginBottom: '8px',
    background: theme.bgTertiary,
    color: theme.textPrimary,
    border: `1px solid ${theme.border}`,
    borderRadius: '6px',
    padding: '6px 12px',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    boxShadow: theme.shadowSmall
  });

  // Hover effect
  toggleBtn.onmouseenter = () => {
    toggleBtn.style.background = theme.bgHover;
    toggleBtn.style.borderColor = theme.accent;
    toggleBtn.style.boxShadow = theme.shadowAccent;
  };
  toggleBtn.onmouseleave = () => {
    toggleBtn.style.background = theme.bgTertiary;
    toggleBtn.style.borderColor = theme.border;
    toggleBtn.style.boxShadow = theme.shadowSmall;
  };

  // Content container (collapsible)
  const contentContainer = document.createElement('div');
  contentContainer.style.display = rulesExpanded ? 'block' : 'none';

  const ta = document.createElement('textarea');
  Object.assign(ta.style, {
    width: '100%',
    height: '120px',
    background: theme.bgPrimary,
    color: theme.textPrimary,
    border: `1px solid ${theme.border}`,
    borderRadius: '6px',
    fontFamily: 'Consolas, Monaco, monospace',
    fontSize: '11px',
    padding: '8px',
    boxSizing: 'border-box',
    resize: 'vertical',
    transition: 'all 0.2s ease',
    boxShadow: `inset ${theme.shadowSmall}`
  });
  ta.value = JSON.stringify(rules, null, 2);

  // Focus effect
  ta.onfocus = () => {
    ta.style.borderColor = theme.accent;
    ta.style.boxShadow = `inset ${theme.shadowAccent}`;
  };
  ta.onblur = () => {
    ta.style.borderColor = theme.border;
    ta.style.boxShadow = `inset ${theme.shadowSmall}`;
  };

  const fb = document.createElement('div');
  fb.style.color = theme.warning;
  fb.style.margin = '6px 0';
  fb.style.fontSize = '11px';
  fb.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

  const buttonStyle = {
    fontSize: '11px',
    marginRight: '6px',
    background: theme.bgTertiary,
    color: theme.textPrimary,
    border: `1px solid ${theme.border}`,
    borderRadius: '6px',
    padding: '6px 12px',
    cursor: 'pointer',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    boxShadow: theme.shadowSmall
  };

  const createButton = (text, onClick) => {
    const btn = document.createElement('button');
    btn.textContent = text;
    Object.assign(btn.style, buttonStyle);
    
    btn.onmouseenter = () => {
      btn.style.background = theme.bgHover;
      btn.style.borderColor = theme.accent;
      btn.style.boxShadow = theme.shadowAccent;
    };
    btn.onmouseleave = () => {
      btn.style.background = theme.bgTertiary;
      btn.style.borderColor = theme.border;
      btn.style.boxShadow = theme.shadowSmall;
    };
    
    btn.onclick = onClick;
    return btn;
  };

  const save = createButton('Save Rules', () => {
    try {
      const parsed = JSON.parse(ta.value);
      if (!Array.isArray(parsed)) throw new Error("Rules JSON must be an array of rule objects.");
      GM_setValue('telemetryRules', ta.value);
      rules.length = 0; rules.push(...parsed);
      renderLogs();
      fb.textContent = '✅ Rules saved';
      fb.style.color = theme.success;
    } catch (err) {
      fb.textContent = '❌ Invalid JSON: ' + err.message;
      fb.style.color = theme.error;
    }
  });

  const reset = createButton('Reset Defaults', () => {
    GM_setValue('telemetryRules', '');
    resetRulesToDefault();
    loadRules();
    ta.value = JSON.stringify(rules, null, 2);
    renderLogs();
    fb.textContent = 'ℹ️ Defaults restored';
    fb.style.color = theme.accent;
  });

  const buttonsContainer = document.createElement('div');
  buttonsContainer.style.display = 'flex';
  buttonsContainer.style.gap = '6px';
  buttonsContainer.style.marginTop = '8px';
  
  contentContainer.appendChild(ta);
  contentContainer.appendChild(fb);
  buttonsContainer.appendChild(save);
  buttonsContainer.appendChild(reset);
  contentContainer.appendChild(buttonsContainer);

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