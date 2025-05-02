import { eventsLog, requestsLog } from '../../storage/persistence.js';
import { renderRuleEditor } from './ruleEditor.js';
import { exportLogs } from '../../utils/exporter.js';
import { applyTheme } from '../../settings/theme.js';

let panel, showBtn;
let autoScrollEnabled = true;
let panelHidden = false;
let dragging = false, offsetX = 0, offsetY = 0;

export function createPanel() {
  panel = document.createElement('div');
  panel.id = 'telemetry-panel';
  Object.assign(panel.style, {
    position: 'fixed', width: '350px', maxHeight: '400px',
    overflowY: 'auto', background: 'rgba(0,0,0,0.8)',
    color: '#0f0', fontSize: '12px', fontFamily: 'monospace',
    zIndex: '2147483647', padding: '8px', borderRadius: '4px',
    bottom: '10px', right: '10px'
  });
  document.body.appendChild(panel);

  panel.addEventListener('scroll', () => {
    const atBottom = panel.scrollTop + panel.clientHeight >= panel.scrollHeight - 5;
    autoScrollEnabled = atBottom;
  });

  addControlButtons(panel);
  renderRuleEditor(panel);

  showBtn = document.createElement('button');
  showBtn.textContent = 'Show Telemetry';
  Object.assign(showBtn.style, {
    position: 'fixed',
    bottom: '10px',
    right: '10px',
    zIndex: '2147483647',
    fontSize: '12px',
    padding: '6px 12px',
    background: '#222',
    color: '#0f0',
    border: '1px solid #0f0',
    borderRadius: '4px',
    display: 'none',
    cursor: 'pointer'
  });
  showBtn.onclick = () => {
    panelHidden = false;
    panel.style.display = '';
    showBtn.style.display = 'none';
    renderLogs();
  };
  document.body.appendChild(showBtn);

  applyTheme(panel, showBtn);
}

export function renderLogs() {
  if (!panel || panelHidden) return;
  const combined = [...eventsLog, ...requestsLog].sort((a, b) => a.timestamp - b.timestamp);
  panel.querySelectorAll('.entry').forEach(e => e.remove());
  combined.forEach(entry => panel.appendChild(formatEntryDOM(entry)));
  if (autoScrollEnabled) panel.scrollTop = panel.scrollHeight;
}

function formatEntryDOM(entry) {
  const el = document.createElement('div');
  el.className = 'entry';
  el.style.marginBottom = '4px';

  if (entry.rulesMatched?.length) {
    const badge = document.createElement('span');
    badge.textContent = entry.rulesMatched.length;
    Object.assign(badge.style, {
      marginLeft: '6px', background: '#f90', color: '#000',
      fontSize: '10px', padding: '1px 4px', borderRadius: '3px'
    });
    el.appendChild(badge);
    el.title = 'Rules: ' + entry.rulesMatched.join(', ');
  }

  const time = (entry.timestamp - (window.__telemetryStart || 0)).toFixed(0);
  const text = entry.type
    ? `[E:${entry.type}] ${entry.selector?.slice(0, 30)} @${time}ms`
    : `[R:${entry.method}] ${entry.url?.slice(0, 30)} @${time}ms` + (entry.eventId ? ' ↔' : '');

  el.insertAdjacentText('afterbegin', text);
  return el;
}

function addControlButtons(panel) {
  window.__telemetryStart = performance.now();
  const btns = document.createElement('div');
  btns.id = 'telemetry-controls';
  btns.style.marginBottom = '6px';
  btns.style.cursor = 'move';

  const hideBtn = document.createElement('button');
  hideBtn.textContent = 'Hide';
  hideBtn.style.fontSize = '10px';
  hideBtn.style.marginRight = '4px';
  hideBtn.addEventListener('click', () => {
    if (!panel) return;
    panelHidden = !panelHidden;
    panel.style.display = panelHidden ? 'none' : '';
    if (showBtn) showBtn.style.display = panelHidden ? '' : 'none';
  });
  btns.appendChild(hideBtn);

  const clrBtn = document.createElement('button');
  clrBtn.textContent = 'Clear';
  clrBtn.style.fontSize = '10px';
  clrBtn.style.marginRight = '4px';
  clrBtn.addEventListener('click', () => {
    eventsLog.length = 0;
    requestsLog.length = 0;
    renderLogs();
  });
  btns.appendChild(clrBtn);

  const expBtn = document.createElement('button');
  expBtn.textContent = 'Export';
  expBtn.style.fontSize = '10px';
  expBtn.addEventListener('click', exportLogs);
  btns.appendChild(expBtn);

  panel.appendChild(btns);

  btns.addEventListener('mousedown', e => {
    dragging = true;
    offsetX = e.clientX - panel.getBoundingClientRect().left;
    offsetY = e.clientY - panel.getBoundingClientRect().top;
    panel.style.bottom = 'auto';
    panel.style.right = 'auto';
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', onStopDrag);
  });
}

function onDrag(e) {
  if (!dragging || !panel) return;
  panel.style.left = (e.clientX - offsetX) + 'px';
  panel.style.top = (e.clientY - offsetY) + 'px';
}

function onStopDrag() {
  dragging = false;
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', onStopDrag);
}