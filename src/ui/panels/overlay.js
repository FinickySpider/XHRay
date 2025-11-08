import { eventsLog, requestsLog, getPanelState, savePanelState } from '../../storage/persistence.js';
import { renderRuleEditor } from './ruleEditor.js';
import { exportLogs } from '../../utils/exporter.js';
import { applyTheme } from '../../settings/theme.js';

let panel, showBtn, logContainer, header;
let autoScrollEnabled = true;
let panelHidden = false;
let dragging = false, offsetX = 0, offsetY = 0;
let panelObserver = null;
let resizing = false;

// Filter state
let filterText = '';
let filterType = 'all'; // 'all', 'event', 'request', 'websocket', 'beacon'
let filterDebounceTimer = null;

export function createPanel() {
  // Load saved state
  const savedState = getPanelState();
  panelHidden = savedState.hidden;
  const dark = !!GM_getValue("darkTheme", true);

  // Main panel container (no scroll)
  panel = document.createElement('div');
  panel.id = 'telemetry-panel';
  Object.assign(panel.style, {
    position: 'fixed',
    width: savedState.dimensions.width || '350px',
    height: savedState.dimensions.height || '400px',
    background: dark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.95)',
    fontSize: '12px', fontFamily: 'monospace',
    zIndex: '2147483647', borderRadius: '4px',
    display: panelHidden ? 'none' : 'flex', flexDirection: 'column',
    minWidth: '300px', minHeight: '200px',
    maxWidth: '80vw', maxHeight: '80vh',
    resize: 'none' // We'll handle resize manually
  });
  
  // Apply saved position
  const pos = savedState.position;
  if (pos.left !== undefined && pos.top !== undefined) {
    panel.style.left = pos.left;
    panel.style.top = pos.top;
  } else {
    panel.style.bottom = pos.bottom || '10px';
    panel.style.right = pos.right || '10px';
  }
  
  document.body.appendChild(panel);

  // Fixed header section (controls + rules)
  const header = document.createElement('div');
  header.id = 'telemetry-header';
  Object.assign(header.style, {
    padding: '8px',
    borderBottom: dark ? '1px solid rgba(0, 255, 0, 0.3)' : '1px solid rgba(34, 34, 34, 0.3)',
    flexShrink: '0'
  });
  panel.appendChild(header);

  addControlButtons(header);
  renderRuleEditor(header);

  // Scrollable log container
  logContainer = document.createElement('div');
  logContainer.id = 'telemetry-logs';
  Object.assign(logContainer.style, {
    overflowY: 'auto',
    padding: '8px',
    flex: '1',
    minHeight: '0'
  });
  panel.appendChild(logContainer);

  logContainer.addEventListener('scroll', () => {
    const atBottom = logContainer.scrollTop + logContainer.clientHeight >= logContainer.scrollHeight - 5;
    autoScrollEnabled = atBottom;
  });

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
    display: panelHidden ? '' : 'none',
    cursor: 'pointer'
  });
  showBtn.onclick = () => {
    panelHidden = false;
    panel.style.display = 'flex';
    showBtn.style.display = 'none';
    savePanelState({ hidden: false });
    renderLogs();
  };
  document.body.appendChild(showBtn);

  // Add resize handle
  addResizeHandle();

  applyTheme(panel, showBtn);
  
  // Set up MutationObserver to detect panel removal
  setupPanelProtection();
}

function setupPanelProtection() {
  // Disconnect existing observer if any
  if (panelObserver) {
    panelObserver.disconnect();
  }
  
  // Create observer to watch for panel removal
  panelObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      // Check if panel was removed
      if (mutation.type === 'childList' && mutation.removedNodes.length > 0) {
        for (const node of mutation.removedNodes) {
          if (node === panel || node === showBtn) {
            console.warn('[XHRay] Panel removed from DOM, re-attaching...');
            // Re-attach after a brief delay to avoid infinite loops
            setTimeout(() => {
              if (!document.body.contains(panel)) {
                document.body.appendChild(panel);
              }
              if (!document.body.contains(showBtn)) {
                document.body.appendChild(showBtn);
              }
            }, 100);
          }
        }
      }
    }
  });
  
  // Observe document.body for child removals
  panelObserver.observe(document.body, {
    childList: true,
    subtree: false
  });
}

export function respawnPanel() {
  // Remove existing panel and button
  const existingPanel = document.getElementById('telemetry-panel');
  if (existingPanel) {
    existingPanel.remove();
  }
  
  const existingBtn = Array.from(document.querySelectorAll('button'))
    .find(btn => btn.textContent === 'Show Telemetry');
  if (existingBtn) {
    existingBtn.remove();
  }
  
  // Disconnect observer
  if (panelObserver) {
    panelObserver.disconnect();
    panelObserver = null;
  }
  
  // Recreate panel
  createPanel();
  renderLogs();
  
  console.log('[XHRay] Panel respawned successfully');
}

export function renderLogs() {
  if (!logContainer || panelHidden) return;
  let combined = [...eventsLog, ...requestsLog].sort((a, b) => a.timestamp - b.timestamp);
  
  // Apply filters
  combined = combined.filter(entry => {
    // Type filter
    if (filterType !== 'all') {
      if (filterType === 'event' && !entry.type) return false;
      if (filterType === 'request' && entry.type) return false;
      if (filterType === 'websocket' && (!entry.url || !entry.url.includes('ws'))) return false;
      if (filterType === 'beacon' && entry.method !== 'sendBeacon') return false;
    }
    
    // Text search filter
    if (filterText) {
      const searchStr = filterText.toLowerCase();
      const matchesUrl = entry.url?.toLowerCase().includes(searchStr);
      const matchesSelector = entry.selector?.toLowerCase().includes(searchStr);
      const matchesMethod = entry.method?.toLowerCase().includes(searchStr);
      const matchesType = entry.type?.toLowerCase().includes(searchStr);
      
      if (!matchesUrl && !matchesSelector && !matchesMethod && !matchesType) {
        return false;
      }
    }
    
    return true;
  });
  
  logContainer.querySelectorAll('.entry').forEach(e => e.remove());
  combined.forEach(entry => logContainer.appendChild(formatEntryDOM(entry)));
  if (autoScrollEnabled) logContainer.scrollTop = logContainer.scrollHeight;
}

function formatEntryDOM(entry) {
  const dark = !!GM_getValue("darkTheme", true);
  const timestampMode = GM_getValue('timestampMode', 'relative');
  
  const el = document.createElement('div');
  el.className = 'entry';
  Object.assign(el.style, {
    marginBottom: '4px',
    color: dark ? '#e0e0e0' : '#222'
  });

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

  // Format timestamp based on mode
  let timeStr;
  if (timestampMode === 'absolute') {
    const date = new Date(entry.timestamp);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const ms = String(date.getMilliseconds()).padStart(3, '0');
    timeStr = `${hours}:${minutes}:${seconds}.${ms}`;
  } else {
    const relativeMs = (entry.timestamp - (window.__telemetryStart || 0)).toFixed(0);
    timeStr = `@${relativeMs}ms`;
  }

  const text = entry.type
    ? `[E:${entry.type}] ${entry.selector?.slice(0, 30)} ${timeStr}`
    : `[R:${entry.method}] ${entry.url?.slice(0, 30)} ${timeStr}` + (entry.eventId ? ' ↔' : '');

  el.insertAdjacentText('afterbegin', text);
  
  // Add green correlation arrow if present
  if (entry.eventId && !entry.type) {
    const arrow = el.querySelector('↔') || el.lastChild;
    if (arrow && arrow.textContent && arrow.textContent.includes('↔')) {
      el.innerHTML = el.innerHTML.replace('↔', '<span style="color: #0f0">↔</span>');
    }
  }
  
  return el;
}

function addControlButtons(container) {
  window.__telemetryStart = performance.now();
  const dark = !!GM_getValue("darkTheme", true);
  
  const btns = document.createElement('div');
  btns.id = 'telemetry-controls';
  btns.style.marginBottom = '6px';
  btns.style.cursor = 'move';

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

  const hideBtn = document.createElement('button');
  hideBtn.textContent = 'Hide';
  Object.assign(hideBtn.style, buttonStyle);
  hideBtn.addEventListener('click', () => {
    if (!panel) return;
    panelHidden = !panelHidden;
    panel.style.display = panelHidden ? 'none' : 'flex';
    if (showBtn) showBtn.style.display = panelHidden ? '' : 'none';
    savePanelState({ hidden: panelHidden });
  });
  btns.appendChild(hideBtn);

  const clrBtn = document.createElement('button');
  clrBtn.textContent = 'Clear';
  Object.assign(clrBtn.style, buttonStyle);
  clrBtn.addEventListener('click', () => {
    eventsLog.length = 0;
    requestsLog.length = 0;
    renderLogs();
  });
  btns.appendChild(clrBtn);

  const expBtn = document.createElement('button');
  expBtn.textContent = 'Export';
  Object.assign(expBtn.style, buttonStyle);
  expBtn.addEventListener('click', exportLogs);
  btns.appendChild(expBtn);

  // Timestamp toggle button
  const timestampMode = GM_getValue('timestampMode', 'relative');
  const timeBtn = document.createElement('button');
  timeBtn.textContent = timestampMode === 'relative' ? '⏱️' : '🕐';
  timeBtn.title = timestampMode === 'relative' ? 'Switch to absolute time' : 'Switch to relative time';
  Object.assign(timeBtn.style, buttonStyle);
  timeBtn.addEventListener('click', () => {
    const currentMode = GM_getValue('timestampMode', 'relative');
    const newMode = currentMode === 'relative' ? 'absolute' : 'relative';
    GM_setValue('timestampMode', newMode);
    timeBtn.textContent = newMode === 'relative' ? '⏱️' : '🕐';
    timeBtn.title = newMode === 'relative' ? 'Switch to absolute time' : 'Switch to relative time';
    renderLogs();
  });
  btns.appendChild(timeBtn);

  container.appendChild(btns);

  // Add filter/search bar
  addFilterBar(container);

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

function addFilterBar(container) {
  const dark = !!GM_getValue("darkTheme", true);
  const filterContainer = document.createElement('div');
  Object.assign(filterContainer.style, {
    marginBottom: '8px',
    display: 'flex',
    gap: '4px',
    alignItems: 'center'
  });

  // Search input
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Search...';
  Object.assign(searchInput.style, {
    flex: '1',
    fontSize: '11px',
    padding: '4px 6px',
    background: dark ? '#1a1a1a' : '#fff',
    color: dark ? '#e0e0e0' : '#222',
    border: dark ? '1px solid #0f0' : '1px solid #888',
    borderRadius: '3px',
    fontFamily: 'monospace'
  });

  searchInput.addEventListener('input', (e) => {
    // Debounce search
    if (filterDebounceTimer) {
      clearTimeout(filterDebounceTimer);
    }
    filterDebounceTimer = setTimeout(() => {
      filterText = e.target.value.toLowerCase();
      renderLogs();
    }, 300);
  });

  // Type filter dropdown
  const typeSelect = document.createElement('select');
  Object.assign(typeSelect.style, {
    fontSize: '11px',
    padding: '4px',
    background: dark ? '#1a1a1a' : '#fff',
    color: dark ? '#e0e0e0' : '#222',
    border: dark ? '1px solid #0f0' : '1px solid #888',
    borderRadius: '3px',
    cursor: 'pointer'
  });

  const options = [
    { value: 'all', label: 'All' },
    { value: 'event', label: 'Events' },
    { value: 'request', label: 'Requests' },
    { value: 'websocket', label: 'WebSocket' },
    { value: 'beacon', label: 'Beacon' }
  ];

  options.forEach(opt => {
    const option = document.createElement('option');
    option.value = opt.value;
    option.textContent = opt.label;
    typeSelect.appendChild(option);
  });

  typeSelect.addEventListener('change', (e) => {
    filterType = e.target.value;
    renderLogs();
  });

  // Clear filter button
  const clearFilterBtn = document.createElement('button');
  clearFilterBtn.textContent = '✕';
  clearFilterBtn.title = 'Clear filters';
  Object.assign(clearFilterBtn.style, {
    fontSize: '10px',
    padding: '4px 8px',
    background: dark ? '#222' : '#f0f0f0',
    color: dark ? '#0f0' : '#222',
    border: dark ? '1px solid #0f0' : '1px solid #888',
    borderRadius: '3px',
    cursor: 'pointer'
  });

  clearFilterBtn.addEventListener('click', () => {
    searchInput.value = '';
    typeSelect.value = 'all';
    filterText = '';
    filterType = 'all';
    renderLogs();
  });

  filterContainer.appendChild(searchInput);
  filterContainer.appendChild(typeSelect);
  filterContainer.appendChild(clearFilterBtn);
  container.appendChild(filterContainer);
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
  
  // Save panel position
  const rect = panel.getBoundingClientRect();
  const position = {
    left: rect.left + 'px',
    top: rect.top + 'px'
  };
  savePanelState({ position });
}

function addResizeHandle() {
  const dark = !!GM_getValue("darkTheme", true);
  const resizeHandle = document.createElement('div');
  resizeHandle.id = 'resize-handle';
  Object.assign(resizeHandle.style, {
    position: 'absolute',
    bottom: '0',
    right: '0',
    width: '16px',
    height: '16px',
    cursor: 'nwse-resize',
    zIndex: '10',
    fontSize: '14px',
    lineHeight: '16px',
    textAlign: 'center',
    color: dark ? '#0f0' : '#888',
    userSelect: 'none'
  });
  resizeHandle.textContent = '⋰';
  resizeHandle.title = 'Drag to resize';

  resizeHandle.addEventListener('mousedown', (e) => {
    e.stopPropagation(); // Prevent drag
    resizing = true;
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = panel.offsetWidth;
    const startHeight = panel.offsetHeight;

    function onResize(e) {
      if (!resizing || !panel) return;
      
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      let newWidth = startWidth + deltaX;
      let newHeight = startHeight + deltaY;
      
      // Constrain dimensions
      const minWidth = 300;
      const minHeight = 200;
      const maxWidth = window.innerWidth * 0.8;
      const maxHeight = window.innerHeight * 0.8;
      
      newWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));
      newHeight = Math.max(minHeight, Math.min(newHeight, maxHeight));
      
      panel.style.width = newWidth + 'px';
      panel.style.height = newHeight + 'px';
    }

    function onStopResize() {
      resizing = false;
      document.removeEventListener('mousemove', onResize);
      document.removeEventListener('mouseup', onStopResize);
      
      // Save panel dimensions
      const dimensions = {
        width: panel.style.width,
        height: panel.style.height
      };
      savePanelState({ dimensions });
    }

    document.addEventListener('mousemove', onResize);
    document.addEventListener('mouseup', onStopResize);
  });

  panel.appendChild(resizeHandle);
}