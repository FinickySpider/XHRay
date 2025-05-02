// ==UserScript==
// @name         XHRay - 
Telemetry Correlator
// @namespace    https://example.com/
// @version      0.3.3
// @description  Logs DOM events and network requests with highlighting, live JSON rule editor, conditional auto-scrolling, precise matching, draggable panel
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

  // Auto-scroll & drag control
  let autoScrollEnabled = true;
  let dragging = false, offsetX = 0, offsetY = 0;

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
      try { rules = JSON.parse(raw); }
      catch (e) { console.warn('Invalid rules JSON, using defaults'); rules = DEFAULT_RULES; }
    } else {
      rules = DEFAULT_RULES;
    }
  }

  // Match rules against a captured event (precise via element.matches)
  function matchRulesForEvent(entry) {
    entry.rulesMatched = [];
    rules.forEach(rule => {
      if (rule.selector) {
        try {
          if (entry.element.matches(rule.selector)) {
            entry.rulesMatched.push(rule.name);
          }
        } catch {
          // fallback to substring on path
          if (entry.selector.includes(rule.selector)) {
            entry.rulesMatched.push(rule.name);
          }
        }
      }
    });
  }

  // Match rules against a logged request (regex or substring)
  function matchRulesForRequest(entry) {
    entry.rulesMatched = entry.rulesMatched || [];
    rules.forEach(rule => {
      const p = rule.urlPattern;
      if (p) {
        let matched = false;
        try {
          const re = new RegExp(p);
          matched = re.test(entry.url);
        } catch {
          matched = entry.url.includes(p);
        }
        if (matched) entry.rulesMatched.push(rule.name);
      }
    });
  }

  // 1. DOM Interaction Layer
  function initDOMCapture() {
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
        } catch {}
      }, true);
    });
  }

  // 2. Network Surveillance Layer
  function patchXHR() {
    const o = XMLHttpRequest.prototype.open;
    const s = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function(method, url) {
      this._meta = {method, url};
      return o.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function(body) {
      const start = performance.now();
      this.addEventListener('loadend', () => {
        const duration = performance.now() - start;
        let rawResp = '';
        try { rawResp = this.responseText; } catch {}
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
      return s.apply(this, arguments);
    };
  }

  function patchFetch() {
    const f = window.fetch;
    window.fetch = async (...args) => {
      const start = performance.now();
      const response = await f.apply(this, args);
      let data = '';
      try { data = await response.clone().text(); } catch {}
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
    const ev = [...eventsLog].reverse().find(e => req.timestamp - e.timestamp <= CORRELATION_WINDOW_MS);
    if (ev) {
      req.eventId = ev.id;
      ev.linkedRequests = ev.linkedRequests||[];
      ev.linkedRequests.push(req.id);
    }
    matchRulesForRequest(req);
    pushToRolling(requestsLog, req);
  }

  // 4. UI Overlay & Controls
  function createPanel() {
    const panel = document.createElement('div');
    panel.id = 'telemetry-panel';
    Object.assign(panel.style, {
      position: 'fixed', width: '350px', maxHeight: '400px',
      overflowY: 'auto', background: 'rgba(0,0,0,0.8)',
      color: '#0f0', fontSize: '12px', fontFamily: 'monospace',
      zIndex: '999999', padding: '8px', borderRadius: '4px',
      bottom: '10px', right: '10px'
    });
    document.body.appendChild(panel);

    // pause/resume auto-scroll on user scroll
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
    const combined = [...eventsLog, ...requestsLog].sort((a,b) => a.timestamp - b.timestamp);
    panel.querySelectorAll('.entry').forEach(e => e.remove());
    combined.forEach(entry => panel.appendChild(formatEntryDOM(entry)));
    if (autoScrollEnabled) panel.scrollTop = panel.scrollHeight;
  }

  function formatEntryDOM(entry) {
    const el = document.createElement('div');
    el.className = 'entry';
    el.style.marginBottom = '4px';

    // badge for matched rules
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

    const time = (entry.timestamp - (window.__telemetryStart||0)).toFixed(0);
    const text = entry.type
      ? `[E:${entry.type}] ${truncate(entry.selector,30)} @${time}ms`
      : `[R:${entry.method}] ${truncate(entry.url,30)} @${time}ms` + (entry.eventId ? ' ↔' : '');

    el.insertAdjacentText('afterbegin', text);
    return el;
  }

  function addControlButtons(panel) {
    window.__telemetryStart = performance.now();
    const btns = document.createElement('div');
    btns.id = 'telemetry-controls';
    btns.style.marginBottom = '6px';
    btns.style.cursor = 'move';

    ['Hide','Clear','Export'].forEach((label, i) => {
      const btn = document.createElement('button');
      btn.textContent = label;
      btn.style.fontSize = '10px';
      if (i < 2) btn.style.marginRight = '4px';
      btn.addEventListener('click', () => {
        if (label === 'Hide') {
          panel.querySelectorAll('.entry').forEach(e => e.style.display = e.style.display==='none'?'block':'none');
          btn.textContent = btn.textContent==='Hide'?'Show':'Hide';
        }
        if (label === 'Clear') { eventsLog = []; requestsLog = []; renderLogs(); }
        if (label === 'Export') exportLogs();
      });
      btns.appendChild(btn);
    });

    panel.appendChild(btns);

    // draggable panel via controls bar
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
    if (!dragging) return;
    const panel = document.getElementById('telemetry-panel');
    panel.style.left = (e.clientX - offsetX) + 'px';
    panel.style.top = (e.clientY - offsetY) + 'px';
  }

  function onStopDrag() {
    dragging = false;
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', onStopDrag);
  }

  // 4.x Live Rule Editor
  function renderRuleEditor(panel) {
    const c = document.createElement('div');
    c.style.marginTop = '8px';
    c.style.borderTop = '1px solid #0f0';
    c.style.paddingTop = '6px';

    const ta = document.createElement('textarea');
    ta.style.width = '100%';
    ta.style.height = '100px';
    ta.value = JSON.stringify(rules, null, 2);

    const fb = document.createElement('div');
    fb.style.color = '#f90';
    fb.style.margin = '4px 0';

    const save = document.createElement('button');
    save.textContent = 'Save Rules';
    save.onclick = () => {
      try {
        const parsed = JSON.parse(ta.value);
        GM_setValue('telemetryRules', ta.value);
        rules = parsed;
        reapplyRulesToLogs();
        renderLogs();
        fb.textContent = '✅ Rules saved';
      } catch (err) {
        fb.textContent = '❌ Invalid JSON: ' + err.message;
      }
    };

    const reset = document.createElement('button');
    reset.textContent = 'Reset Defaults';
    reset.style.marginLeft = '4px';
    reset.onclick = () => {
      GM_setValue('telemetryRules', '');
      loadRules();
      reapplyRulesToLogs();
      renderLogs();
      ta.value = JSON.stringify(rules, null, 2);
      fb.textContent = 'ℹ️ Defaults restored';
    };

    c.appendChild(ta);
    c.appendChild(fb);
    c.appendChild(save);
    c.appendChild(reset);
    panel.appendChild(c);
  }

  // Re-run matchers on all logs
  function reapplyRulesToLogs() {
    eventsLog.forEach(matchRulesForEvent);
    requestsLog.forEach(matchRulesForRequest);
  }

  // Export
  function exportLogs() {
    const data = JSON.stringify({ events: eventsLog, requests: requestsLog }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    GM_download({ url: URL.createObjectURL(blob), name: 'telemetry-logs.json' });
  }

  // Bootstrap
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