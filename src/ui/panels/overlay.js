import { eventsLog, requestsLog, getPanelState, savePanelState } from '../../storage/persistence.js';
import { renderRuleEditor } from './ruleEditor.js';
import { exportLogs, exportSettings, importSettings } from '../../utils/exporter.js';
import { applyTheme, getThemeColors } from '../../settings/theme.js';
import { rules } from '../../matchers/rules.js';

let panel, showBtn, logContainer, header;
let autoScrollEnabled = true;
let panelHidden = false;
let dragging = false, offsetX = 0, offsetY = 0;
let panelObserver = null;
let resizing = false;

// Filter state
let filterText = '';
let filterType = 'all'; // 'all', 'event', 'request', 'websocket', 'beacon'
let filterRule = 'all'; // 'all' or specific rule name
let filterDebounceTimer = null;

// Track expanded entries to preserve state across re-renders
let expandedEntries = new Set();
let expandedDebugSections = new Set(); // Track which debug sections are open
let entryScrollPositions = new Map(); // Track scroll positions of expanded entry details
let lastRenderedCount = 0; // Track how many entries were last rendered

export function createPanel() {
  // Load saved state
  const savedState = getPanelState();
  panelHidden = savedState.hidden;
  const theme = getThemeColors();

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
  
  if (existingCount > 0 && combined.length > existingCount && 
      lastRenderedCount === existingCount &&
      expandedEntries.size === 0) {
    // Just append new entries (no expanded entries to worry about)
    for (let i = existingCount; i < combined.length; i++) {
      logContainer.appendChild(formatEntryDOM(combined[i]));
    }
    lastRenderedCount = combined.length;
  } else if (existingCount > 0 && combined.length > existingCount && expandedEntries.size > 0) {
    // We have expanded entries - only add new entries without re-rendering existing
    for (let i = existingCount; i < combined.length; i++) {
      logContainer.appendChild(formatEntryDOM(combined[i]));
    }
    lastRenderedCount = combined.length;
    // Skip scroll manipulation to avoid flashing
    if (wasAtBottom && autoScrollEnabled) {
      logContainer.scrollTop = logContainer.scrollHeight;
    }
    return; // Early return to avoid re-render
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
    lastRenderedCount = combined.length;
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
  const isExpanded = expandedEntries.has(entryId);
  
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
    fontWeight: isExpanded ? '500' : 'normal',
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

  // Expand/collapse indicator
  const indicator = document.createElement('span');
  indicator.textContent = isExpanded ? '▼' : '▶';
  Object.assign(indicator.style, {
    color: theme.accent,
    fontSize: '10px'
  });
  el.insertBefore(indicator, el.firstChild);
  
  // Create expandable details section
  const detailsSection = createDetailsSection(entry);
  detailsSection.style.display = isExpanded ? 'block' : 'none';
  
  // Toggle details on click - without triggering re-render
  container.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent event bubbling
    
    if (expandedEntries.has(entryId)) {
      expandedEntries.delete(entryId);
      detailsSection.style.display = 'none';
      el.style.fontWeight = 'normal';
      indicator.textContent = '▶';
    } else {
      expandedEntries.add(entryId);
      detailsSection.style.display = 'block';
      el.style.fontWeight = '500';
      indicator.textContent = '▼';
    }
  });
  
  container.appendChild(el);
  container.appendChild(detailsSection);
  
  return container;
}

function createDetailsSection(entry) {
  const theme = getThemeColors();
  // Create unique ID for this entry
  const entryId = entry.id || `${entry.timestamp}-${entry.type || entry.method}`;
  const isDebugExpanded = expandedDebugSections.has(entryId);
  const savedScrollPos = entryScrollPositions.get(entryId) || 0;
  
  const details = document.createElement('div');
  details.className = 'entry-details';
  details.dataset.entryId = entryId;
  Object.assign(details.style, {
    marginTop: '8px',
    padding: '12px',
    background: theme.bgPrimary,
    border: `1px solid ${theme.border}`,
    borderRadius: '6px',
    fontSize: '11px',
    fontFamily: 'Consolas, Monaco, monospace',
    wordBreak: 'break-word',
    maxHeight: '300px',
    overflowY: 'auto',
    overflowX: 'hidden',
    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)'
  });
  
  // Restore scroll position after content is added
  setTimeout(() => {
    if (details && savedScrollPos > 0) {
      details.scrollTop = savedScrollPos;
    }
  }, 0);

  const lines = [];

  if (entry.type) {
    // Event details
    lines.push(`<strong style="color: ${theme.accent}">📌 Event Type:</strong> ${entry.type}`);
    if (entry.selector) {
      lines.push(`<strong style="color: ${theme.accent}">🎯 Selector:</strong> ${entry.selector}`);
    }
    if (entry.target) {
      lines.push(`<strong style="color: ${theme.accent}">🔍 Target:</strong> ${entry.target}`);
    }
    if (entry.text) {
      lines.push(`<strong style="color: ${theme.accent}">📝 Text:</strong> ${entry.text}`);
    }
    if (entry.element) {
      lines.push(`<strong style="color: ${theme.accent}">🏷️ Element:</strong> ${entry.element.tagName || 'N/A'}`);
      if (entry.element.id) {
        lines.push(`&nbsp;&nbsp;<span style="color: ${theme.textSecondary}">ID:</span> ${entry.element.id}`);
      }
      if (entry.element.className) {
        lines.push(`&nbsp;&nbsp;<span style="color: ${theme.textSecondary}">Class:</span> ${entry.element.className}`);
      }
    }
    if (entry.id) {
      lines.push(`<strong style="color: ${theme.accent}">🆔 Event ID:</strong> ${entry.id}`);
    }
  } else {
    // Request details
    lines.push(`<strong style="color: ${theme.accent}">🔧 Method:</strong> ${entry.method}`);
    lines.push(`<strong style="color: ${theme.accent}">🌐 Full URL:</strong>`);
    lines.push(`<div style="word-break: break-all; padding-left: 10px; color: ${theme.textSecondary}">${entry.url}</div>`);
    
    if (entry.eventId) {
      lines.push(`<strong style="color: ${theme.success}">⟷ Correlated Event ID:</strong> ${entry.eventId}`);
    }
    
    if (entry.status !== undefined && entry.status !== 'message' && entry.status !== 'send') {
      const statusColor = entry.status >= 200 && entry.status < 300 ? theme.success : theme.warning;
      lines.push(`<strong style="color: ${theme.accent}">📊 Status:</strong> <span style="color: ${statusColor}">${entry.status}</span>`);
    }
    
    if (entry.headers) {
      lines.push(`<strong style="color: ${theme.accent}">📋 Headers:</strong>`);
      try {
        const headersObj = typeof entry.headers === 'string' ? JSON.parse(entry.headers) : entry.headers;
        Object.entries(headersObj).forEach(([key, value]) => {
          lines.push(`&nbsp;&nbsp;<em style="color: ${theme.textSecondary}">${key}:</em> ${value}`);
        });
      } catch {
        lines.push(`&nbsp;&nbsp;${entry.headers}`);
      }
    }
    
    // Show request body if present (even if empty string, show it)
    if (entry.body !== undefined && entry.body !== null) {
      lines.push(`<strong style="color: ${theme.accent}">📤 Request Body:</strong>`);
      if (entry.body === '' || entry.body === 'undefined' || entry.body === 'null') {
        lines.push(`&nbsp;&nbsp;<em style="color: ${theme.textMuted}">(empty)</em>`);
      } else {
        try {
          const bodyStr = typeof entry.body === 'string' ? entry.body : JSON.stringify(entry.body, null, 2);
          lines.push(`<pre style="margin: 4px 0; padding: 8px; background: ${theme.bgSecondary}; border: 1px solid ${theme.border}; border-radius: 4px; overflow-x: auto; white-space: pre-wrap;">${bodyStr}</pre>`);
        } catch {
          lines.push(`&nbsp;&nbsp;<span style="color: ${theme.error}">[Unable to display]</span>`);
        }
      }
    }
    
    // Show response if present (check multiple field names)
    const responseData = entry.response || entry.responseData || entry.responseText;
    if (responseData !== undefined && responseData !== null) {
      lines.push(`<strong style="color: ${theme.accent}">📥 Response:</strong>`);
      if (responseData === '' || responseData === 'undefined' || responseData === 'null') {
        lines.push(`&nbsp;&nbsp;<em style="color: ${theme.textMuted}">(empty)</em>`);
      } else {
        try {
          const resStr = typeof responseData === 'string' ? responseData : JSON.stringify(responseData, null, 2);
          // Show more response data
          const truncated = resStr.length > 1000 ? resStr.slice(0, 1000) + '\n... (truncated - ' + resStr.length + ' total chars)' : resStr;
          lines.push(`<pre style="margin: 4px 0; padding: 8px; background: ${theme.bgSecondary}; border: 1px solid ${theme.border}; border-radius: 4px; overflow-x: auto; white-space: pre-wrap;">${truncated}</pre>`);
        } catch {
          lines.push(`&nbsp;&nbsp;<span style="color: ${theme.error}">[Unable to display]</span>`);
        }
      }
    }
    
    if (entry.duration !== undefined && entry.duration > 0) {
      lines.push(`<strong style="color: ${theme.accent}">⏱️ Duration:</strong> ${entry.duration.toFixed(2)}ms`);
    }
    
    // Debug: Show ALL entry properties to help identify what's available
    try {
      const debugDetailsId = `debug-${entryId}`;
      lines.push(`<details id="${debugDetailsId}" ${isDebugExpanded ? 'open' : ''} style="margin-top: 8px;"><summary style="cursor: pointer; color: ${theme.textSecondary};">🔍 Debug: All Entry Properties</summary>`);
      // Create a safe copy without circular references
      const safeEntry = {};
      for (const key in entry) {
        if (entry.hasOwnProperty(key)) {
          try {
            // Skip DOM elements and functions
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
      lines.push(`<pre style="margin: 4px 0; padding: 8px; background: ${theme.bgSecondary}; border: 1px solid ${theme.border}; border-radius: 4px; overflow-x: auto; font-size: 9px;">${debugStr}</pre>`);
      lines.push(`</details>`);
    } catch (e) {
      lines.push(`<em style="color: ${theme.warning};">Debug info unavailable: ${e.message}</em>`);
    }
  }
  
  // Matched rules explanation
  if (entry.rulesMatched?.length) {
    lines.push(`<strong style="color: ${theme.warning}">📏 Matched Rules:</strong>`);
    entry.rulesMatched.forEach(ruleName => {
      lines.push(`&nbsp;&nbsp;<span style="color: ${theme.success}">✓</span> ${ruleName}`);
    });
  }
  
  lines.push(`<strong style="color: ${theme.accent}">🕐 Timestamp:</strong> <span style="color: ${theme.textSecondary}">${new Date(entry.timestamp).toISOString()}</span>`);
  if (entry.id) {
    lines.push(`<strong style="color: ${theme.accent}">🔑 Entry ID:</strong> <span style="color: ${theme.textSecondary}">${entry.id}</span>`);
  }

  details.innerHTML = lines.join('<br>');
  
  // Add event listener to track debug section toggle
  const debugDetailsEl = details.querySelector(`#debug-${entryId}`);
  if (debugDetailsEl) {
    debugDetailsEl.addEventListener('toggle', () => {
      if (debugDetailsEl.open) {
        expandedDebugSections.add(entryId);
      } else {
        expandedDebugSections.delete(entryId);
      }
    });
  }
  
  // Track scroll position changes
  details.addEventListener('scroll', () => {
    entryScrollPositions.set(entryId, details.scrollTop);
  });
  
  return details;
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
    lastRenderedCount = 0;
    expandedEntries.clear();
    expandedDebugSections.clear();
    entryScrollPositions.clear();
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