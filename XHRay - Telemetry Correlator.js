// ==UserScript==
// @name         XHRay - Telemetry Correlator
// @namespace    https://example.com/
// @version      0.3.2
// @description  Logs DOM events and network requests with highlighting and live JSON rule editor, conditional auto-scrolling UI
// @match        *://*/*
// @grant        GM_download
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-start
// ==/UserScript==

(function() {
  'use strict';

  // Configuration
  const MAX_ENTRIES = 500;
  const CORRELATION_WINDOW_MS = 500;

  // Default rules if none are stored
  const DEFAULT_RULES = [
    {
      name: 'Submit Button → Submit API',
      selector: '.submit-btn',
      urlPattern: '/api/submit',
      action: 'highlight'
    }
  ];

  // Loaded rule set
  let rules = [];

  // Rolling logs
  let eventsLog = [];
  let requestsLog = [];

  // Auto-scroll control
  let autoScrollEnabled = true;

  // Utility: UUID v4
  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Utility: simple CSS path
  function getCSSPath(el) {
    if (!(el instanceof Element)) return '';
    if (el.id) return `#${el.id}`;
    const parts = [];
    while (el && el.nodeType === Node.ELEMENT_NODE) {
      let selector = el.nodeName.toLowerCase();
      if (el.className) {
        selector += '.' + Array.from(el.classList).join('.');
      }
      const parent = el.parentNode;
      if (parent) {
        const siblings = Array.from(parent.children).filter(e => e.nodeName === el.nodeName);
        if (siblings.length > 1) {
          const idx = siblings.indexOf(el) + 1;
          selector += `:nth-of-type(${idx})`;
        }
      }
      parts.unshift(selector);
      el = parent;
    }
    return parts.join(' > ');
  }

  // Utility: truncate string
  function truncate(str = '', max = 50) {
    return str.length > max ? str.slice(0, max) + '…' : str;
  }

  // Utility: push to rolling window
  function pushToRolling(arr, item) {
    arr.push(item);
    if (arr.length > MAX_ENTRIES) arr.shift();
  }

  // Load rules from storage or use defaults
  function loadRules() {
    const raw = GM_getValue('telemetryRules');
    if (raw) {
      try {
        rules = JSON.parse(raw);
      } catch (e) {
        console.warn('Invalid telemetryRules JSON, using defaults');
        rules = DEFAULT_RULES;
      }
    } else {
      rules = DEFAULT_RULES;
    }
  }

  // Match rules against a captured event
  function matchRulesForEvent(entry) {
    entry.rulesMatched = [];
    rules.forEach(rule => {
      if (rule.selector && entry.selector.includes(rule.selector)) {
        entry.rulesMatched.push(rule.name);
      }
    });
  }

  // Match rules against a logged request
  function matchRulesForRequest(entry) {
    entry.rulesMatched = entry.rulesMatched || [];
    rules.forEach(rule => {
      if (rule.urlPattern) {
        try {
          const re = new RegExp(rule.urlPattern);
          if (re.test(entry.url)) {
            entry.rulesMatched.push(rule.name);
          }
        } catch (e) {
          console.warn('Invalid URL pattern in rule', rule);
        }
      }
    });
  }

  // 1. DOM Interaction Layer
  function initDOMCapture() {
    const eventTypes = ['click','submit','change','keydown','input'];
    eventTypes.forEach(type => {
      document.addEventListener(type, evt => {
        try {
          const rec = {
            id: generateUUID(),
            type: evt.type,
            selector: getCSSPath(evt.target),
            text: truncate(evt.target.innerText, 50),
            timestamp: performance.now()
          };
          matchRulesForEvent(rec);
          pushToRolling(eventsLog, rec);
        } catch(e) { /* swallow errors */ }
      }, true);
    });
  }

  // 2. Network Surveillance Layer
  function patchXHR() {
    const _open = XMLHttpRequest.prototype.open;
    const _send = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function(method, url) {
      this._meta = { method, url };
      return _open.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function(body) {
      const start = performance.now();
      this.addEventListener('loadend', () => {
        const duration = performance.now() - start;
        let rawResp = '';
        try {
          rawResp = this.responseText;
        } catch {
          rawResp = '';
        }
        const req = {
          id: generateUUID(),
          method: this._meta.method,
          url: this._meta.url,
          status: this.status,
          body: truncate(body, 200),
          response: truncate(rawResp, 1024),
          timestamp: start,
          duration
        };
        logRequest(req);
      });
      return _send.apply(this, arguments);
    };
  }

  function patchFetch() {
    const _fetch = window.fetch;
    window.fetch = async (...args) => {
      const start = performance.now();
      const response = await _fetch.apply(this, args);
      const clone = response.clone();
      let data;
      try { data = await clone.text(); } catch { data = ''; }
      const duration = performance.now() - start;
      const req = {
        id: generateUUID(),
        method: args[1]?.method || 'GET',
        url: args[0],
        status: response.status,
        body: truncate(args[1]?.body, 200),
        response: truncate(data, 1024),
        timestamp: start,
        duration
      };
      logRequest(req);
      return response;
    };
  }

  // 3. Correlation Engine
  function logRequest(req) {
    const matchEvt = findLastEventWithin(req.timestamp, CORRELATION_WINDOW_MS);
    if (matchEvt) {
      req.eventId = matchEvt.id;
      matchEvt.linkedRequests = matchEvt.linkedRequests || [];
      matchEvt.linkedRequests.push(req.id);
    }
    matchRulesForRequest(req);
    pushToRolling(requestsLog, req);
  }

  function findLastEventWithin(ts, windowMs) {
    return [...eventsLog].reverse().find(e => ts - e.timestamp <= windowMs);
  }

  // 4. UI Overlay & Controls
  function createPanel() {
    const panel = document.createElement('div');
    panel.id = 'telemetry-panel';
    Object.assign(panel.style, {
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      width: '350px',
      maxHeight: '400px',
      overflowY: 'auto',
      background: 'rgba(0,0,0,0.8)',
      color: '#0f0',
      fontSize: '12px',
      fontFamily: 'monospace',
      zIndex: '999999',
      padding: '8px',
      borderRadius: '4px'
    });
    document.body.appendChild(panel);

    // Pause/resume auto-scroll based on user scroll
    panel.addEventListener('scroll', () => {
      const atBottom = panel.scrollTop + panel.clientHeight >= panel.scrollHeight - 5;
      autoScrollEnabled = atBottom;
    });

    addControlButtons(panel);
    renderRuleEditor(panel);
  }

  function renderLogs() {
    const panel = document.getElementById('telemetry-panel');
    if (!panel) return;
    const entries = [...eventsLog, ...requestsLog].sort((a,b) => a.timestamp - b.timestamp);
    panel.querySelectorAll('.entry').forEach(el => el.remove());
    entries.forEach(entry => {
      const el = formatEntryDOM(entry);
      panel.appendChild(el);
    });
    if (autoScrollEnabled) {
      panel.scrollTop = panel.scrollHeight;
    }
  }

  function formatEntryDOM(entry) {
    const el = document.createElement('div');
    el.className = 'entry';
    el.style.marginBottom = '4px';
    if (entry.rulesMatched && entry.rulesMatched.length) {
      el.style.backgroundColor = 'rgba(255,255,0,0.2)';
      el.title = 'Rules: ' + entry.rulesMatched.join(', ');
    }
    const time = (entry.timestamp - (window.__telemetryStart||0)).toFixed(0);
    let text = '';
    if (entry.type) {
      text = `[E:${entry.type}] ${truncate(entry.selector,30)} @${time}ms`;
    } else {
      text = `[R:${entry.method}] ${truncate(entry.url,30)} @${time}ms`;
      if (entry.eventId) text += ' ↔';
    }
    el.textContent = text;
    return el;
  }

  function addControlButtons(panel) {
    window.__telemetryStart = performance.now();
    const btns = document.createElement('div');
    btns.style.marginBottom = '6px';

    const toggle = document.createElement('button');
    toggle.textContent = 'Hide';
    Object.assign(toggle.style, { marginRight: '4px', fontSize:'10px' });
    toggle.onclick = () => {
      panel.querySelectorAll('.entry').forEach(e => {
        e.style.display = e.style.display==='none'?'block':'none';
      });
      toggle.textContent = toggle.textContent === 'Hide' ? 'Show' : 'Hide';
    };
    btns.appendChild(toggle);

    const clr = document.createElement('button');
    clr.textContent = 'Clear';
    Object.assign(clr.style, { marginRight: '4px', fontSize:'10px' });
    clr.onclick = () => { eventsLog = []; requestsLog = []; renderLogs(); };
    btns.appendChild(clr);

    const exp = document.createElement('button');
    exp.textContent = 'Export';
    exp.style.fontSize='10px';
    exp.onclick = exportLogs;
    btns.appendChild(exp);

    panel.appendChild(btns);
  }

  // 4.x Live Rule Editor
  function renderRuleEditor(panel) {
    const container = document.createElement('div');
    container.style.marginTop = '8px';
    container.style.borderTop = '1px solid #0f0';
    container.style.paddingTop = '6px';

    const textarea = document.createElement('textarea');
    textarea.style.width = '100%';
    textarea.style.height = '100px';
    textarea.value = JSON.stringify(rules, null, 2);

    const feedback = document.createElement('div');
    feedback.style.color = '#f90';
    feedback.style.margin = '4px 0';

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save Rules';
    saveBtn.onclick = () => {
      try {
        const parsed = JSON.parse(textarea.value);
        GM_setValue('telemetryRules', textarea.value);
        rules = parsed;
        reapplyRulesToLogs();
        renderLogs();
        feedback.textContent = '✅ Rules saved';
      } catch (err) {
        feedback.textContent = '❌ Invalid JSON: ' + err.message;
      }
    };

    const resetBtn = document.createElement('button');
    resetBtn.textContent = 'Reset Defaults';
    resetBtn.style.marginLeft = '4px';
    resetBtn.onclick = () => {
      GM_setValue('telemetryRules', '');
      loadRules();
      reapplyRulesToLogs();
      renderLogs();
      textarea.value = JSON.stringify(rules, null, 2);
      feedback.textContent = 'ℹ️ Defaults restored';
    };

    container.appendChild(textarea);
    container.appendChild(feedback);
    container.appendChild(saveBtn);
    container.appendChild(resetBtn);
    panel.appendChild(container);
  }

  // Utility: re-run matching on all existing entries
  function reapplyRulesToLogs() {
    eventsLog.forEach(entry => matchRulesForEvent(entry));
    requestsLog.forEach(entry => matchRulesForRequest(entry));
  }

  // 5. Export Functionality
  function exportLogs() {
    const data = JSON.stringify({ events: eventsLog, requests: requestsLog }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    GM_download({
      url: URL.createObjectURL(blob),
      name: 'telemetry-logs.json',
      onerror: () => console.error('Download failed')
    });
  }

  // 6. Bootstrap sequence
  function bootstrap() {
    loadRules();
    initDOMCapture();
    patchXHR();
    patchFetch();
    createPanel();
    setInterval(renderLogs, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }

})();
