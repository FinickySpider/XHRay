import { eventsLog, requestsLog, getPanelState, savePanelState } from '../../storage/persistence.js';
import { renderRuleEditor } from './ruleEditor.js';
import { exportLogs, exportSettings, importSettings } from '../../utils/exporter.js';
import { applyTheme, getThemeColors } from '../../settings/theme.js';
import { rules } from '../../matchers/rules.js';

let panel, showBtn, logContainer, inspectorPanel, splitResizeHandle, header;
let autoScrollEnabled = true;
let panelHidden = false;
let dragging = false, offsetX = 0, offsetY = 0;
let panelObserver = null;
let resizing = false;
let inspectorResizing = false;

// Filter state
let filterText = '';
let filterType = 'all'; // 'all', 'event', 'request', 'websocket', 'beacon'
let filterRule = 'all'; // 'all' or specific rule name
let filterDebounceTimer = null;

// Inspector state
let selectedEntry = null;
let inspectorVisible = false;
let inspectorWidth = 400; // Default width in pixels
let activeTab = 'general'; // 'general', 'headers', 'request', 'response', 'debug'

// Modal state
let poppedOutModals = []; // Array of { id, entry, element, activeTab }
let modalIdCounter = 0;

export function createPanel() {
  // Load saved state
  const savedState = getPanelState();
  panelHidden = savedState.hidden;
  const theme = getThemeColors();
  
  // Load inspector width from storage
  inspectorWidth = GM_getValue('inspectorWidth', 400);

  // Main panel container (no scroll)
  panel = document.createElement('div');
  panel.id = 'telemetry-panel';
  Object.assign(panel.style, {
    position: 'fixed',
    width: savedState.dimensions.width || '350px',
    height: savedState.dimensions.height || '400px',
    background: theme.bgPrimary,
    border: `1px solid ${theme.border}`,
    borderRadius: '8px',
    boxShadow: theme.shadowLarge,
    fontSize: '12px', 
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    color: theme.textPrimary,
    zIndex: '2147483647',
    display: panelHidden ? 'none' : 'flex', 
    flexDirection: 'column',
    minWidth: '300px', 
    minHeight: '200px',
    maxWidth: '80vw', 
    maxHeight: '80vh',
    resize: 'none',
    backdropFilter: 'blur(10px)'
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
    padding: '10px 12px',
    borderBottom: `1px solid ${theme.border}`,
    background: theme.bgSecondary,
    borderRadius: '8px 8px 0 0',
    flexShrink: '0'
  });
  panel.appendChild(header);

  addControlButtons(header);
  renderRuleEditor(header);

  // Create split container for logs and inspector
  const splitContainer = document.createElement('div');
  splitContainer.id = 'split-container';
  Object.assign(splitContainer.style, {
    display: 'flex',
    flex: '1',
    minHeight: '0',
    position: 'relative'
  });
  panel.appendChild(splitContainer);

  // Scrollable log container (left side of split)
  logContainer = document.createElement('div');
  logContainer.id = 'telemetry-logs';
  Object.assign(logContainer.style, {
    overflowY: 'auto',
    overflowX: 'hidden',
    padding: '8px',
    flex: '1',
    minHeight: '0',
    minWidth: '200px'
  });
  splitContainer.appendChild(logContainer);

  logContainer.addEventListener('scroll', () => {
    const atBottom = logContainer.scrollTop + logContainer.clientHeight >= logContainer.scrollHeight - 5;
    autoScrollEnabled = atBottom;
  });

  // Split resize handle
  splitResizeHandle = document.createElement('div');
  splitResizeHandle.id = 'split-resize-handle';
  Object.assign(splitResizeHandle.style, {
    width: '4px',
    background: theme.border,
    cursor: 'ew-resize',
    position: 'relative',
    flexShrink: '0',
    transition: 'background 0.2s ease',
    display: 'none' // Hidden until inspector is opened
  });
  
  splitResizeHandle.onmouseenter = () => {
    splitResizeHandle.style.background = theme.accent;
  };
  splitResizeHandle.onmouseleave = () => {
    splitResizeHandle.style.background = theme.border;
  };
  
  splitResizeHandle.addEventListener('mousedown', onSplitResizeStart);
  splitContainer.appendChild(splitResizeHandle);

  // Inspector panel (right side of split)
  inspectorPanel = document.createElement('div');
  inspectorPanel.id = 'inspector-panel';
  Object.assign(inspectorPanel.style, {
    width: `${inspectorWidth}px`,
    minWidth: '250px',
    maxWidth: '600px',
    display: 'none', // Hidden by default
    flexDirection: 'column',
    background: theme.bgSecondary,
    borderLeft: `1px solid ${theme.border}`,
    overflowY: 'auto',
    overflowX: 'hidden'
  });
  splitContainer.appendChild(inspectorPanel);

  showBtn = document.createElement('button');
  showBtn.textContent = 'Show Telemetry';
  Object.assign(showBtn.style, {
    position: 'fixed',
    bottom: '10px',
    right: '10px',
    zIndex: '2147483647',
    fontSize: '12px',
    padding: '8px 16px',
    background: theme.bgSecondary,
    color: theme.textPrimary,
    border: `1px solid ${theme.border}`,
    borderRadius: '6px',
    boxShadow: theme.shadowSmall,
    cursor: 'pointer',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    display: panelHidden ? '' : 'none'
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
  
  // Store current scroll position to restore after render
  const currentScrollTop = logContainer.scrollTop;
  const wasAtBottom = currentScrollTop + logContainer.clientHeight >= logContainer.scrollHeight - 5;
  
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
    
    // Rule filter
    if (filterRule !== 'all') {
      if (!entry.rulesMatched || !entry.rulesMatched.includes(filterRule)) {
        return false;
      }
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
  
  // Optimization: Only append new entries if filters haven't changed and we have existing entries
  const existingCount = logContainer.querySelectorAll('.entry-container').length;
  
  if (existingCount > 0 && combined.length > existingCount) {
    // Just append new entries
    for (let i = existingCount; i < combined.length; i++) {
      logContainer.appendChild(formatEntryDOM(combined[i]));
    }
  } else {
    // Full re-render needed (filter changed, or user cleared logs)
    logContainer.querySelectorAll('.entry-container').forEach(e => e.remove());
    
    if (combined.length === 0) {
      // Show empty state
      const theme = getThemeColors();
      const emptyState = document.createElement('div');
      Object.assign(emptyState.style, {
        padding: '20px',
        textAlign: 'center',
        color: theme.textSecondary,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontSize: '12px'
      });
      emptyState.innerHTML = `
        <div style="font-size: 32px; margin-bottom: 10px;">📭</div>
        <div style="font-weight: 500; margin-bottom: 5px;">No telemetry data yet</div>
        <div>Interact with the page to see DOM events and network requests</div>
      `;
      logContainer.appendChild(emptyState);
    } else {
      combined.forEach(entry => logContainer.appendChild(formatEntryDOM(entry)));
    }
  }
  
  // Restore scroll position or scroll to bottom if was at bottom
  if (wasAtBottom && autoScrollEnabled) {
    logContainer.scrollTop = logContainer.scrollHeight;
  } else {
    logContainer.scrollTop = currentScrollTop;
  }
}

function formatEntryDOM(entry) {
  const theme = getThemeColors();
  const timestampMode = GM_getValue('timestampMode', 'relative');
  
  // Create unique ID for this entry
  const entryId = entry.id || `${entry.timestamp}-${entry.type || entry.method}`;
  
  const container = document.createElement('div');
  container.className = 'entry-container';
  container.dataset.entryId = entryId;
  Object.assign(container.style, {
    marginBottom: '4px',
    borderRadius: '4px',
    background: theme.bgSecondary,
    border: `1px solid ${theme.border}`,
    borderLeft: `3px solid ${theme.border}`,
    padding: '8px 10px',
    transition: 'all 0.2s ease',
    boxShadow: theme.shadowSmall
  });
  
  const el = document.createElement('div');
  el.className = 'entry';
  Object.assign(el.style, {
    color: theme.textPrimary,
    cursor: 'pointer',
    fontWeight: 'normal',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap'
  });

  // Hover effect - modern card elevation
  container.addEventListener('mouseenter', () => {
    container.style.background = theme.bgTertiary;
    container.style.borderLeftColor = theme.accent;
    container.style.boxShadow = theme.shadowMedium;
    container.style.transform = 'translateX(2px)';
  });
  container.addEventListener('mouseleave', () => {
    container.style.background = theme.bgSecondary;
    container.style.borderLeftColor = theme.border;
    container.style.boxShadow = theme.shadowSmall;
    container.style.transform = 'translateX(0)';
  });

  // Type badge with color coding
  const typeBadge = document.createElement('span');
  const isEvent = !!entry.type;
  const method = entry.method || entry.type;
  
  typeBadge.textContent = isEvent ? 'E' : (method === 'GET' ? 'GET' : method === 'POST' ? 'POST' : method);
  Object.assign(typeBadge.style, {
    background: isEvent ? theme.accent : (method === 'POST' ? '#9c27b0' : theme.success),
    color: '#fff',
    fontSize: '9px',
    padding: '2px 6px',
    borderRadius: '3px',
    fontWeight: '600',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    minWidth: '32px',
    textAlign: 'center'
  });
  el.appendChild(typeBadge);

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

  // Timestamp
  const timeEl = document.createElement('span');
  timeEl.textContent = timeStr;
  Object.assign(timeEl.style, {
    color: theme.textSecondary,
    fontSize: '10px',
    fontFamily: 'Consolas, Monaco, monospace',
    minWidth: '80px'
  });
  el.appendChild(timeEl);

  // Main content (URL or selector)
  const content = document.createElement('span');
  content.textContent = entry.type
    ? entry.selector?.slice(0, 40) || 'unknown'
    : entry.url?.slice(0, 50) || 'unknown';
  Object.assign(content.style, {
    flex: '1',
    fontSize: '11px',
    fontFamily: 'Consolas, Monaco, monospace',
    color: theme.textPrimary,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  });
  el.appendChild(content);

  // Rule badge
  if (entry.rulesMatched?.length) {
    const badge = document.createElement('span');
    badge.textContent = entry.rulesMatched.length;
    badge.title = 'Rules: ' + entry.rulesMatched.join(', ');
    Object.assign(badge.style, {
      background: theme.warning,
      color: '#000',
      fontSize: '10px',
      padding: '2px 6px',
      borderRadius: '10px',
      fontWeight: '600',
      minWidth: '18px',
      textAlign: 'center'
    });
    el.appendChild(badge);
  }

  // Correlation indicator
  if (entry.eventId && !entry.type) {
    const corrIcon = document.createElement('span');
    corrIcon.textContent = '↔';
    corrIcon.title = 'Correlated with DOM event';
    Object.assign(corrIcon.style, {
      color: theme.success,
      fontSize: '14px',
      fontWeight: 'bold'
    });
    el.appendChild(corrIcon);
  }

  // Remove the expand indicator - we'll use selection instead
  // No indicator needed since we're using inspector now
  
  // Highlight if this entry is selected
  const isSelected = selectedEntry && (
    (selectedEntry.id === entry.id) || 
    (selectedEntry.timestamp === entry.timestamp && selectedEntry.method === entry.method)
  );
  
  if (isSelected) {
    container.style.borderLeftColor = theme.accent;
    container.style.background = theme.bgTertiary;
    container.style.boxShadow = `0 0 0 1px ${theme.accent}`;
  }
  
  // Click to show in inspector
  container.addEventListener('click', (e) => {
    e.stopPropagation();
    showInspector(entry);
  });
  
  container.appendChild(el);
  
  return container;
}

function addControlButtons(container) {
  window.__telemetryStart = performance.now();
  const theme = getThemeColors();
  
  const btns = document.createElement('div');
  btns.id = 'telemetry-controls';
  btns.style.marginBottom = '8px';
  btns.style.cursor = 'move';
  btns.style.display = 'flex';
  btns.style.gap = '6px';
  btns.style.flexWrap = 'wrap';

  const buttonStyle = {
    fontSize: '11px',
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

  const createButton = (text, title, onClick) => {
    const btn = document.createElement('button');
    btn.textContent = text;
    if (title) btn.title = title;
    Object.assign(btn.style, buttonStyle);
    
    // Add hover effect
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
    
    btn.addEventListener('click', onClick);
    return btn;
  };

  const hideBtn = createButton('Hide', 'Hide panel', () => {
    if (!panel) return;
    panelHidden = !panelHidden;
    panel.style.display = panelHidden ? 'none' : 'flex';
    if (showBtn) showBtn.style.display = panelHidden ? '' : 'none';
    savePanelState({ hidden: panelHidden });
  });
  btns.appendChild(hideBtn);

  const clrBtn = createButton('Clear', 'Clear all logs', () => {
    eventsLog.length = 0;
    requestsLog.length = 0;
    renderLogs();
  });
  btns.appendChild(clrBtn);

  const expBtn = createButton('Export', 'Export logs', exportLogs);
  btns.appendChild(expBtn);

  // Settings export button
  const expSettingsBtn = createButton('⚙️↓', 'Export settings & rules', exportSettings);
  btns.appendChild(expSettingsBtn);

  // Settings import button
  const impSettingsBtn = createButton('⚙️↑', 'Import settings & rules', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        importSettings(event.target.result, (error, message) => {
          if (error) {
            alert(`❌ Import failed: ${error}`);
          } else {
            if (confirm(`✅ ${message}\n\nReload page now to apply changes?`)) {
              location.reload();
            }
          }
        });
      };
      reader.readAsText(file);
    };
    input.click();
  });
  btns.appendChild(impSettingsBtn);

  // Timestamp toggle button
  const timestampMode = GM_getValue('timestampMode', 'relative');
  const timeBtn = createButton(
    timestampMode === 'relative' ? '⏱️' : '🕐',
    timestampMode === 'relative' ? 'Switch to absolute time' : 'Switch to relative time',
    () => {
      const currentMode = GM_getValue('timestampMode', 'relative');
      const newMode = currentMode === 'relative' ? 'absolute' : 'relative';
      GM_setValue('timestampMode', newMode);
      timeBtn.textContent = newMode === 'relative' ? '⏱️' : '🕐';
      timeBtn.title = newMode === 'relative' ? 'Switch to absolute time' : 'Switch to relative time';
      renderLogs();
    }
  );
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
  const theme = getThemeColors();
  const filterContainer = document.createElement('div');
  Object.assign(filterContainer.style, {
    marginBottom: '8px',
    display: 'flex',
    gap: '6px',
    alignItems: 'center'
  });

  // Common input style
  const inputStyle = {
    fontSize: '11px',
    padding: '6px 10px',
    background: theme.bgPrimary,
    color: theme.textPrimary,
    border: `1px solid ${theme.border}`,
    borderRadius: '6px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    transition: 'all 0.2s ease',
    boxShadow: theme.shadowSmall
  };

  // Search input
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Search...';
  Object.assign(searchInput.style, { ...inputStyle, flex: '1' });
  
  // Add focus effect
  searchInput.onfocus = () => {
    searchInput.style.borderColor = theme.accent;
    searchInput.style.boxShadow = theme.shadowAccent;
  };
  searchInput.onblur = () => {
    searchInput.style.borderColor = theme.border;
    searchInput.style.boxShadow = theme.shadowSmall;
  };

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
  Object.assign(typeSelect.style, { ...inputStyle, cursor: 'pointer' });

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

  // Rule filter dropdown
  const ruleSelect = document.createElement('select');
  Object.assign(ruleSelect.style, { ...inputStyle, cursor: 'pointer', minWidth: '100px' });

  // Add 'All' option
  const allOption = document.createElement('option');
  allOption.value = 'all';
  allOption.textContent = 'All Rules';
  ruleSelect.appendChild(allOption);

  // Add individual rule options
  rules.forEach(rule => {
    const option = document.createElement('option');
    option.value = rule.name;
    option.textContent = rule.name;
    ruleSelect.appendChild(option);
  });

  ruleSelect.addEventListener('change', (e) => {
    filterRule = e.target.value;
    renderLogs();
  });

  // Clear filter button
  const clearFilterBtn = document.createElement('button');
  clearFilterBtn.textContent = '✕';
  clearFilterBtn.title = 'Clear filters';
  Object.assign(clearFilterBtn.style, {
    fontSize: '11px',
    padding: '6px 10px',
    background: theme.bgTertiary,
    color: theme.textPrimary,
    border: `1px solid ${theme.border}`,
    borderRadius: '6px',
    cursor: 'pointer',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    boxShadow: theme.shadowSmall
  });

  // Hover effect
  clearFilterBtn.onmouseenter = () => {
    clearFilterBtn.style.background = theme.bgHover;
    clearFilterBtn.style.borderColor = theme.accent;
  };
  clearFilterBtn.onmouseleave = () => {
    clearFilterBtn.style.background = theme.bgTertiary;
    clearFilterBtn.style.borderColor = theme.border;
  };

  clearFilterBtn.addEventListener('click', () => {
    searchInput.value = '';
    typeSelect.value = 'all';
    ruleSelect.value = 'all';
    filterText = '';
    filterType = 'all';
    filterRule = 'all';
    renderLogs();
  });

  filterContainer.appendChild(searchInput);
  filterContainer.appendChild(typeSelect);
  filterContainer.appendChild(ruleSelect);
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

function onSplitResizeStart(e) {
  e.stopPropagation();
  e.preventDefault();
  inspectorResizing = true;
  
  const startX = e.clientX;
  const startWidth = inspectorPanel.offsetWidth;
  
  function onSplitResize(e) {
    if (!inspectorResizing) return;
    
    const deltaX = startX - e.clientX; // Reversed because we're pulling from the left
    let newWidth = startWidth + deltaX;
    
    // Constrain width
    newWidth = Math.max(250, Math.min(newWidth, 600));
    
    inspectorPanel.style.width = newWidth + 'px';
    inspectorWidth = newWidth;
  }
  
  function onSplitResizeStop() {
    inspectorResizing = false;
    document.removeEventListener('mousemove', onSplitResize);
    document.removeEventListener('mouseup', onSplitResizeStop);
    
    // Save inspector width
    GM_setValue('inspectorWidth', inspectorWidth);
  }
  
  document.addEventListener('mousemove', onSplitResize);
  document.addEventListener('mouseup', onSplitResizeStop);
}

function showInspector(entry) {
  selectedEntry = entry;
  inspectorVisible = true;
  
  // Show inspector panel and resize handle
  inspectorPanel.style.display = 'flex';
  splitResizeHandle.style.display = 'block';
  
  // Render inspector content
  renderInspectorContent();
  
  // Re-render logs to show selected state
  renderLogs();
}

function hideInspector() {
  selectedEntry = null;
  inspectorVisible = false;
  
  // Hide inspector panel and resize handle
  inspectorPanel.style.display = 'none';
  splitResizeHandle.style.display = 'none';
  
  // Re-render logs to clear selected state
  renderLogs();
}

function renderInspectorContent() {
  if (!selectedEntry || !inspectorPanel) return;
  
  const theme = getThemeColors();
  inspectorPanel.innerHTML = '';
  
  // Inspector header
  const header = document.createElement('div');
  Object.assign(header.style, {
    padding: '12px',
    borderBottom: `1px solid ${theme.border}`,
    background: theme.bgTertiary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: '0'
  });
  
  const title = document.createElement('div');
  title.textContent = 'Inspector';
  Object.assign(title.style, {
    fontWeight: '600',
    fontSize: '12px',
    color: theme.textPrimary,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  });
  header.appendChild(title);
  
  const buttonContainer = document.createElement('div');
  Object.assign(buttonContainer.style, {
    display: 'flex',
    gap: '8px',
    alignItems: 'center'
  });
  
  // Pop Out button
  const popOutBtn = document.createElement('button');
  popOutBtn.textContent = '⧉';
  popOutBtn.title = 'Pop out to modal';
  Object.assign(popOutBtn.style, {
    background: 'transparent',
    border: `1px solid ${theme.border}`,
    color: theme.accent,
    fontSize: '14px',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '4px',
    lineHeight: '1',
    transition: 'all 0.2s ease'
  });
  popOutBtn.onclick = () => createPopOutModal(selectedEntry, activeTab);
  popOutBtn.onmouseenter = () => {
    popOutBtn.style.background = theme.bgPrimary;
    popOutBtn.style.borderColor = theme.accent;
  };
  popOutBtn.onmouseleave = () => {
    popOutBtn.style.background = 'transparent';
    popOutBtn.style.borderColor = theme.border;
  };
  buttonContainer.appendChild(popOutBtn);
  
  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  closeBtn.title = 'Close inspector';
  Object.assign(closeBtn.style, {
    background: 'transparent',
    border: 'none',
    color: theme.textSecondary,
    fontSize: '16px',
    cursor: 'pointer',
    padding: '0 4px',
    lineHeight: '1'
  });
  closeBtn.onclick = hideInspector;
  closeBtn.onmouseenter = () => closeBtn.style.color = theme.error;
  closeBtn.onmouseleave = () => closeBtn.style.color = theme.textSecondary;
  buttonContainer.appendChild(closeBtn);
  
  header.appendChild(buttonContainer);
  
  inspectorPanel.appendChild(header);
  
  // Tab bar
  const tabBar = document.createElement('div');
  Object.assign(tabBar.style, {
    display: 'flex',
    borderBottom: `1px solid ${theme.border}`,
    background: theme.bgSecondary,
    flexShrink: '0'
  });
  
  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'headers', label: 'Headers' },
    { id: 'request', label: 'Request' },
    { id: 'response', label: 'Response' },
    { id: 'debug', label: 'Debug' }
  ];
  
  tabs.forEach(tab => {
    const tabBtn = document.createElement('button');
    tabBtn.textContent = tab.label;
    const isActive = activeTab === tab.id;
    
    Object.assign(tabBtn.style, {
      padding: '8px 16px',
      background: isActive ? theme.bgPrimary : 'transparent',
      color: isActive ? theme.accent : theme.textSecondary,
      border: 'none',
      borderBottom: isActive ? `2px solid ${theme.accent}` : '2px solid transparent',
      cursor: 'pointer',
      fontSize: '11px',
      fontWeight: isActive ? '600' : '500',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      transition: 'all 0.2s ease'
    });
    
    tabBtn.onclick = () => {
      activeTab = tab.id;
      renderInspectorContent();
    };
    
    tabBtn.onmouseenter = () => {
      if (!isActive) {
        tabBtn.style.background = theme.bgTertiary;
        tabBtn.style.color = theme.textPrimary;
      }
    };
    tabBtn.onmouseleave = () => {
      if (!isActive) {
        tabBtn.style.background = 'transparent';
        tabBtn.style.color = theme.textSecondary;
      }
    };
    
    tabBar.appendChild(tabBtn);
  });
  
  inspectorPanel.appendChild(tabBar);
  
  // Tab content
  const tabContent = document.createElement('div');
  Object.assign(tabContent.style, {
    padding: '12px',
    overflowY: 'auto',
    flex: '1',
    fontFamily: 'Consolas, Monaco, monospace',
    fontSize: '11px',
    color: theme.textPrimary
  });
  
  // Render content based on active tab
  const content = createTabContent(selectedEntry, activeTab, theme);
  tabContent.innerHTML = content;
  
  inspectorPanel.appendChild(tabContent);
}

function createTabContent(entry, tab, theme) {
  const lines = [];
  
  switch (tab) {
    case 'general':
      // General info
      if (entry.type) {
        // Event entry
        lines.push(`<div style="margin-bottom: 12px;">`);
        lines.push(`<div style="color: ${theme.textSecondary}; font-size: 10px; margin-bottom: 4px;">EVENT TYPE</div>`);
        lines.push(`<div style="color: ${theme.accent}; font-weight: 600;">${entry.type}</div>`);
        lines.push(`</div>`);
        
        if (entry.selector) {
          lines.push(`<div style="margin-bottom: 12px;">`);
          lines.push(`<div style="color: ${theme.textSecondary}; font-size: 10px; margin-bottom: 4px;">SELECTOR</div>`);
          lines.push(`<div style="word-break: break-all;">${entry.selector}</div>`);
          lines.push(`</div>`);
        }
        
        if (entry.target) {
          lines.push(`<div style="margin-bottom: 12px;">`);
          lines.push(`<div style="color: ${theme.textSecondary}; font-size: 10px; margin-bottom: 4px;">TARGET</div>`);
          lines.push(`<div>${entry.target}</div>`);
          lines.push(`</div>`);
        }
        
        if (entry.text) {
          lines.push(`<div style="margin-bottom: 12px;">`);
          lines.push(`<div style="color: ${theme.textSecondary}; font-size: 10px; margin-bottom: 4px;">TEXT</div>`);
          lines.push(`<div>${entry.text}</div>`);
          lines.push(`</div>`);
        }
        
        if (entry.id) {
          lines.push(`<div style="margin-bottom: 12px;">`);
          lines.push(`<div style="color: ${theme.textSecondary}; font-size: 10px; margin-bottom: 4px;">EVENT ID</div>`);
          lines.push(`<div style="color: ${theme.textMuted}; font-size: 10px;">${entry.id}</div>`);
          lines.push(`</div>`);
        }
      } else {
        // Request entry
        lines.push(`<div style="margin-bottom: 12px;">`);
        lines.push(`<div style="color: ${theme.textSecondary}; font-size: 10px; margin-bottom: 4px;">METHOD</div>`);
        lines.push(`<div style="color: ${theme.accent}; font-weight: 600;">${entry.method}</div>`);
        lines.push(`</div>`);
        
        lines.push(`<div style="margin-bottom: 12px;">`);
        lines.push(`<div style="color: ${theme.textSecondary}; font-size: 10px; margin-bottom: 4px;">URL</div>`);
        lines.push(`<div style="word-break: break-all;">${entry.url}</div>`);
        lines.push(`</div>`);
        
        if (entry.status !== undefined && entry.status !== 'message' && entry.status !== 'send') {
          const statusColor = entry.status >= 200 && entry.status < 300 ? theme.success : theme.warning;
          lines.push(`<div style="margin-bottom: 12px;">`);
          lines.push(`<div style="color: ${theme.textSecondary}; font-size: 10px; margin-bottom: 4px;">STATUS</div>`);
          lines.push(`<div style="color: ${statusColor}; font-weight: 600;">${entry.status}</div>`);
          lines.push(`</div>`);
        }
        
        if (entry.eventId) {
          lines.push(`<div style="margin-bottom: 12px;">`);
          lines.push(`<div style="color: ${theme.textSecondary}; font-size: 10px; margin-bottom: 4px;">CORRELATED EVENT</div>`);
          lines.push(`<div style="color: ${theme.success};">↔ ${entry.eventId}</div>`);
          lines.push(`</div>`);
        }
        
        if (entry.duration !== undefined && entry.duration > 0) {
          lines.push(`<div style="margin-bottom: 12px;">`);
          lines.push(`<div style="color: ${theme.textSecondary}; font-size: 10px; margin-bottom: 4px;">DURATION</div>`);
          lines.push(`<div>${entry.duration.toFixed(2)}ms</div>`);
          lines.push(`</div>`);
        }
      }
      
      // Timestamp
      lines.push(`<div style="margin-bottom: 12px;">`);
      lines.push(`<div style="color: ${theme.textSecondary}; font-size: 10px; margin-bottom: 4px;">TIMESTAMP</div>`);
      lines.push(`<div style="color: ${theme.textMuted}; font-size: 10px;">${new Date(entry.timestamp).toISOString()}</div>`);
      lines.push(`</div>`);
      
      // Matched rules
      if (entry.rulesMatched?.length) {
        lines.push(`<div style="margin-bottom: 12px;">`);
        lines.push(`<div style="color: ${theme.textSecondary}; font-size: 10px; margin-bottom: 4px;">MATCHED RULES</div>`);
        entry.rulesMatched.forEach(ruleName => {
          lines.push(`<div style="margin: 4px 0;"><span style="color: ${theme.success};">✓</span> ${ruleName}</div>`);
        });
        lines.push(`</div>`);
      }
      break;
      
    case 'headers':
      if (entry.headers) {
        lines.push(`<div style="color: ${theme.textSecondary}; font-size: 10px; margin-bottom: 8px;">REQUEST HEADERS</div>`);
        try {
          const headersObj = typeof entry.headers === 'string' ? JSON.parse(entry.headers) : entry.headers;
          Object.entries(headersObj).forEach(([key, value]) => {
            lines.push(`<div style="margin: 6px 0; padding: 8px; background: ${theme.bgPrimary}; border-radius: 4px;">`);
            lines.push(`<div style="color: ${theme.accent}; font-weight: 600; margin-bottom: 4px; font-size: 11px;">${key}</div>`);
            lines.push(`<div style="color: ${theme.textSecondary}; word-wrap: break-word; overflow-wrap: break-word; white-space: pre-wrap; line-height: 1.5;">${value}</div>`);
            lines.push(`</div>`);
          });
        } catch {
          lines.push(`<div style="color: ${theme.error};">Unable to parse headers</div>`);
        }
      } else {
        lines.push(`<div style="color: ${theme.textMuted}; text-align: center; padding: 20px;">No headers available</div>`);
      }
      break;
      
    case 'request':
      if (entry.body !== undefined && entry.body !== null) {
        lines.push(`<div style="color: ${theme.textSecondary}; font-size: 10px; margin-bottom: 8px;">REQUEST BODY</div>`);
        if (entry.body === '' || entry.body === 'undefined' || entry.body === 'null') {
          lines.push(`<div style="color: ${theme.textMuted}; font-style: italic;">(empty)</div>`);
        } else {
          try {
            const bodyStr = typeof entry.body === 'string' ? entry.body : JSON.stringify(entry.body, null, 2);
            lines.push(`<pre style="background: ${theme.bgPrimary}; padding: 10px; border-radius: 4px; white-space: pre-wrap; word-wrap: break-word; overflow-wrap: break-word; margin: 0; line-height: 1.5;">${bodyStr}</pre>`);
          } catch {
            lines.push(`<div style="color: ${theme.error};">Unable to display request body</div>`);
          }
        }
      } else {
        lines.push(`<div style="color: ${theme.textMuted}; text-align: center; padding: 20px;">No request body</div>`);
      }
      break;
      
    case 'response':
      const responseData = entry.response || entry.responseData || entry.responseText;
      if (responseData !== undefined && responseData !== null) {
        lines.push(`<div style="color: ${theme.textSecondary}; font-size: 10px; margin-bottom: 8px;">RESPONSE DATA</div>`);
        if (responseData === '' || responseData === 'undefined' || responseData === 'null') {
          lines.push(`<div style="color: ${theme.textMuted}; font-style: italic;">(empty)</div>`);
        } else {
          try {
            const resStr = typeof responseData === 'string' ? responseData : JSON.stringify(responseData, null, 2);
            const truncated = resStr.length > 2000 ? resStr.slice(0, 2000) + '\n\n... (truncated - ' + resStr.length + ' total chars)' : resStr;
            lines.push(`<pre style="background: ${theme.bgPrimary}; padding: 10px; border-radius: 4px; white-space: pre-wrap; word-wrap: break-word; overflow-wrap: break-word; margin: 0; line-height: 1.5;">${truncated}</pre>`);
          } catch {
            lines.push(`<div style="color: ${theme.error};">Unable to display response</div>`);
          }
        }
      } else {
        lines.push(`<div style="color: ${theme.textMuted}; text-align: center; padding: 20px;">No response data</div>`);
      }
      break;
      
    case 'debug':
      lines.push(`<div style="color: ${theme.textSecondary}; font-size: 10px; margin-bottom: 8px;">ALL ENTRY PROPERTIES</div>`);
      try {
        const safeEntry = {};
        for (const key in entry) {
          if (entry.hasOwnProperty(key)) {
            try {
              if (entry[key] instanceof Element || typeof entry[key] === 'function') {
                safeEntry[key] = `[${typeof entry[key]}]`;
              } else {
                safeEntry[key] = entry[key];
              }
            } catch {
              safeEntry[key] = '[Unable to access]';
            }
          }
        }
        const debugStr = JSON.stringify(safeEntry, null, 2);
        lines.push(`<pre style="background: ${theme.bgPrimary}; padding: 10px; border-radius: 4px; white-space: pre-wrap; word-wrap: break-word; overflow-wrap: break-word; margin: 0; font-size: 10px; line-height: 1.5;">${debugStr}</pre>`);
      } catch (e) {
        lines.push(`<div style="color: ${theme.error};">Debug info unavailable: ${e.message}</div>`);
      }
      break;
  }
  
  return lines.join('');
}

function createPopOutModal(entry, initialTab = 'general') {
  const theme = getThemeColors();
  const modalId = modalIdCounter++;
  
  // Create modal container
  const modal = document.createElement('div');
  modal.id = `xhray-modal-${modalId}`;
  Object.assign(modal.style, {
    position: 'fixed',
    width: '500px',
    height: '600px',
    top: `${100 + (poppedOutModals.length * 30)}px`, // Stagger modals
    left: `${200 + (poppedOutModals.length * 30)}px`,
    background: theme.bgPrimary,
    border: `1px solid ${theme.border}`,
    borderRadius: '8px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
    zIndex: `${100000 + modalId}`,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  });
  
  // Modal state
  const modalState = {
    id: modalId,
    entry: entry,
    element: modal,
    activeTab: initialTab,
    dragging: false,
    offsetX: 0,
    offsetY: 0
  };
  
  // Modal header (draggable)
  const modalHeader = document.createElement('div');
  Object.assign(modalHeader.style, {
    padding: '12px',
    borderBottom: `1px solid ${theme.border}`,
    background: theme.bgTertiary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'move',
    flexShrink: '0',
    userSelect: 'none'
  });
  
  const modalTitle = document.createElement('div');
  const entryType = entry.method || entry.type || 'Entry';
  const entryLabel = entry.url || entry.selector || 'Details';
  modalTitle.textContent = `${entryType} - ${entryLabel.length > 40 ? entryLabel.substring(0, 40) + '...' : entryLabel}`;
  Object.assign(modalTitle.style, {
    fontWeight: '600',
    fontSize: '11px',
    color: theme.textPrimary,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    flex: '1',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  });
  modalHeader.appendChild(modalTitle);
  
  const modalCloseBtn = document.createElement('button');
  modalCloseBtn.textContent = '✕';
  modalCloseBtn.title = 'Close modal';
  Object.assign(modalCloseBtn.style, {
    background: 'transparent',
    border: 'none',
    color: theme.textSecondary,
    fontSize: '16px',
    cursor: 'pointer',
    padding: '0 4px',
    lineHeight: '1'
  });
  modalCloseBtn.onclick = () => closePopOutModal(modalId);
  modalCloseBtn.onmouseenter = () => modalCloseBtn.style.color = theme.error;
  modalCloseBtn.onmouseleave = () => modalCloseBtn.style.color = theme.textSecondary;
  modalHeader.appendChild(modalCloseBtn);
  
  // Make header draggable
  modalHeader.onmousedown = (e) => {
    if (e.target === modalCloseBtn) return;
    modalState.dragging = true;
    modalState.offsetX = e.clientX - modal.offsetLeft;
    modalState.offsetY = e.clientY - modal.offsetTop;
    modal.style.zIndex = `${100000 + modalIdCounter}`; // Bring to front
  };
  
  modal.appendChild(modalHeader);
  
  // Tab bar
  const tabBar = document.createElement('div');
  Object.assign(tabBar.style, {
    display: 'flex',
    borderBottom: `1px solid ${theme.border}`,
    background: theme.bgSecondary,
    flexShrink: '0'
  });
  
  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'headers', label: 'Headers' },
    { id: 'request', label: 'Request' },
    { id: 'response', label: 'Response' },
    { id: 'debug', label: 'Debug' }
  ];
  
  tabs.forEach(tab => {
    const tabBtn = document.createElement('button');
    tabBtn.textContent = tab.label;
    const isActive = modalState.activeTab === tab.id;
    
    Object.assign(tabBtn.style, {
      padding: '8px 16px',
      background: isActive ? theme.bgPrimary : 'transparent',
      color: isActive ? theme.accent : theme.textSecondary,
      border: 'none',
      borderBottom: isActive ? `2px solid ${theme.accent}` : '2px solid transparent',
      cursor: 'pointer',
      fontSize: '11px',
      fontWeight: isActive ? '600' : '500',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      transition: 'all 0.2s ease'
    });
    
    tabBtn.onclick = () => {
      modalState.activeTab = tab.id;
      renderModalContent(modalState);
    };
    
    tabBtn.onmouseenter = () => {
      if (!isActive) {
        tabBtn.style.background = theme.bgTertiary;
        tabBtn.style.color = theme.textPrimary;
      }
    };
    tabBtn.onmouseleave = () => {
      if (!isActive) {
        tabBtn.style.background = 'transparent';
        tabBtn.style.color = theme.textSecondary;
      }
    };
    
    tabBar.appendChild(tabBtn);
  });
  
  modal.appendChild(tabBar);
  
  // Tab content container
  const tabContent = document.createElement('div');
  tabContent.id = `modal-content-${modalId}`;
  Object.assign(tabContent.style, {
    padding: '12px',
    overflowY: 'auto',
    flex: '1',
    fontFamily: 'Consolas, Monaco, monospace',
    fontSize: '11px',
    color: theme.textPrimary
  });
  modal.appendChild(tabContent);
  
  // Add to DOM and track
  document.body.appendChild(modal);
  poppedOutModals.push(modalState);
  
  // Render initial content
  renderModalContent(modalState);
  
  // Global drag handlers for this modal
  const onMouseMove = (e) => {
    if (modalState.dragging) {
      modal.style.left = `${e.clientX - modalState.offsetX}px`;
      modal.style.top = `${e.clientY - modalState.offsetY}px`;
    }
  };
  
  const onMouseUp = () => {
    modalState.dragging = false;
  };
  
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
  
  // Store cleanup handlers on modal
  modal._cleanup = () => {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };
}

function renderModalContent(modalState) {
  const theme = getThemeColors();
  const contentDiv = document.getElementById(`modal-content-${modalState.id}`);
  if (!contentDiv) return;
  
  const content = createTabContent(modalState.entry, modalState.activeTab, theme);
  contentDiv.innerHTML = content;
  
  // Re-render tab buttons to update active state
  const modal = modalState.element;
  const tabBar = modal.children[1]; // Second child is tab bar
  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'headers', label: 'Headers' },
    { id: 'request', label: 'Request' },
    { id: 'response', label: 'Response' },
    { id: 'debug', label: 'Debug' }
  ];
  
  Array.from(tabBar.children).forEach((tabBtn, index) => {
    const tab = tabs[index];
    const isActive = modalState.activeTab === tab.id;
    
    tabBtn.style.background = isActive ? theme.bgPrimary : 'transparent';
    tabBtn.style.color = isActive ? theme.accent : theme.textSecondary;
    tabBtn.style.borderBottom = isActive ? `2px solid ${theme.accent}` : '2px solid transparent';
    tabBtn.style.fontWeight = isActive ? '600' : '500';
  });
}

function closePopOutModal(modalId) {
  const index = poppedOutModals.findIndex(m => m.id === modalId);
  if (index === -1) return;
  
  const modalState = poppedOutModals[index];
  
  // Cleanup event listeners
  if (modalState.element._cleanup) {
    modalState.element._cleanup();
  }
  
  // Remove from DOM
  modalState.element.remove();
  
  // Remove from tracking array
  poppedOutModals.splice(index, 1);
}

function addResizeHandle() {
  const theme = getThemeColors();
  const resizeHandle = document.createElement('div');
  resizeHandle.id = 'resize-handle';
  Object.assign(resizeHandle.style, {
    position: 'absolute',
    bottom: '0',
    right: '0',
    width: '20px',
    height: '20px',
    cursor: 'nwse-resize',
    zIndex: '10',
    fontSize: '16px',
    lineHeight: '20px',
    textAlign: 'center',
    color: theme.textSecondary,
    userSelect: 'none',
    borderRadius: '0 0 8px 0',
    background: `linear-gradient(135deg, transparent 50%, ${theme.bgTertiary} 50%)`,
    transition: 'color 0.2s ease'
  });
  resizeHandle.textContent = '⋰';
  resizeHandle.title = 'Drag to resize';

  // Hover effect
  resizeHandle.onmouseenter = () => {
    resizeHandle.style.color = theme.accent;
  };
  resizeHandle.onmouseleave = () => {
    resizeHandle.style.color = theme.textSecondary;
  };

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