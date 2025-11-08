# XHRay Implementation Roadmap

> **Last Updated**: November 7, 2025  
> **Priority Order**: 🔥 Critical Bugs → ⚡ High Priority Features → 🎯 Medium Priority → 🌟 Nice-to-Have

---

## 🐞 **Critical Bugs (Fix First)**

### Bug #1: Controls/Rule Box Not Pinned ⭐ **HIGHEST PRIORITY**
**Issue**: When panel scrolls, controls and rule editor scroll with content and get buried.

**Root Cause**:
- Panel has `overflowY: auto` applied to entire container
- Controls and rule editor are direct children, causing them to scroll with logs

**Fix Strategy**:
```
src/ui/panels/overlay.js - Restructure panel DOM:
├── panel (fixed position, no scroll)
│   ├── header (fixed, contains controls + drag handle)
│   ├── rule-editor (fixed, collapsible)
│   └── log-container (scrollable, overflowY: auto)
```

**Files to Modify**:
- `src/ui/panels/overlay.js` - Lines 12-22 (createPanel structure)
- `src/ui/panels/overlay.js` - Lines 90-130 (addControlButtons)
- `src/ui/panels/ruleEditor.js` - Add collapsible state

**Acceptance Criteria**:
- [ ] Controls always visible at top
- [ ] Rule editor always visible below controls
- [ ] Only logs scroll
- [ ] Drag handle remains accessible

---

### Bug #2: Panel Disappears/Minimize Issue
**Issue**: Panel doesn't minimize properly across page reloads; jumps to last position on drag.

**Root Cause**:
- Panel position (left, top) stored in local variables only
- Hidden state (`panelHidden`) not persisted to GM storage
- On reload, panel resets to default bottom: 10px, right: 10px

**Fix Strategy**:
```javascript
// Add to GM_getValue/GM_setValue:
- panelPosition: { left, top } or { bottom, right }
- panelHidden: boolean
- panelMinimized: boolean (new state separate from hidden)
```

**Files to Modify**:
- `src/ui/panels/overlay.js` - Lines 140-150 (onStopDrag)
- `src/ui/panels/overlay.js` - Lines 30-50 (createPanel initialization)
- `src/ui/panels/overlay.js` - Lines 100-110 (hide button logic)
- `src/storage/persistence.js` - Add `getPanelState()` and `savePanelState()`

**Acceptance Criteria**:
- [ ] Panel position persisted across reloads
- [ ] Minimized state persisted across reloads
- [ ] Panel doesn't jump on first drag
- [ ] Show/Hide button state syncs with panel

---

### Bug #3: UI Turns Green
**Issue**: Sometimes entire UI and all text is green instead of just accents.

**Root Cause**:
- `theme.js` line 4: `panel.style.color = dark ? "#0f0" : "#222";`
- This sets ALL text in panel to green, including entry text

**Fix Strategy**:
```css
/* Apply green ONLY to specific elements: */
- Buttons: border and text
- Badge numbers: keep orange
- Entry text: neutral (white/black based on theme)
- Accents: green for correlations only
```

**Files to Modify**:
- `src/settings/theme.js` - Remove global color override
- `src/ui/panels/overlay.js` - Apply theme classes instead of inline styles
- Create CSS variable system for theming

**Acceptance Criteria**:
- [ ] Panel background changes with theme
- [ ] Text is readable (white on dark, black on light)
- [ ] Green only used for accents (correlation arrows, highlights)
- [ ] Buttons respect theme colors

---

### Bug #4: Panel Disappears After Page Loads
**Issue**: Panel loads initially, then disappears when page does something or loads more content.

**Root Cause** (Multiple Possibilities):
1. Page JavaScript removes/replaces `document.body`
2. Panel gets layered under new elements (z-index conflict)
3. Panel mutation observer not re-attaching after DOM changes

**Fix Strategy**:
```javascript
// Add MutationObserver to detect panel removal:
const observer = new MutationObserver(() => {
  if (!document.body.contains(panel)) {
    console.warn('XHRay panel removed, re-attaching...');
    document.body.appendChild(panel);
    document.body.appendChild(showBtn);
  }
});
observer.observe(document.documentElement, { childList: true, subtree: true });
```

**Files to Modify**:
- `src/ui/panels/overlay.js` - Add MutationObserver in `createPanel()`
- `src/core/bootstrap.js` - Ensure panel creation happens after DOMContentLoaded

**Acceptance Criteria**:
- [ ] Panel persists through dynamic page updates
- [ ] Panel re-attaches if removed from DOM
- [ ] No performance impact from observer
- [ ] Works on SPAs (React, Vue, Angular)

---

## ⚡ **High Priority Features**

### Feature #1: Respawn Panel Button (Requested)
**Description**: Add button in Tampermonkey menu to manually respawn panel if it fails.

**Implementation**:
```javascript
// In bootstrap.js or main.js:
GM_registerMenuCommand('🔄 Respawn XHRay Panel', () => {
  const existing = document.getElementById('telemetry-panel');
  if (existing) existing.remove();
  const existingBtn = document.querySelector('button[textContent="Show Telemetry"]');
  if (existingBtn) existingBtn.remove();
  createPanel();
  renderLogs();
});
```

**Files to Modify**:
- `src/core/bootstrap.js` - Add menu command after panel creation

**Acceptance Criteria**:
- [ ] Menu command appears in Tampermonkey dropdown
- [ ] Respawn removes old panel safely
- [ ] Respawn restores logs from sessionStorage
- [ ] Respawn applies saved theme and position

---

### Feature #2: Collapsible Rules Box (Requested)
**Description**: Rule editor should be expandable/collapsible to save space.

**Implementation**:
```javascript
// Add toggle button:
const toggleBtn = document.createElement('button');
toggleBtn.textContent = rulesExpanded ? '▼ Rules' : '▶ Rules';
toggleBtn.onclick = () => {
  rulesExpanded = !rulesExpanded;
  ruleEditor.style.display = rulesExpanded ? '' : 'none';
  GM_setValue('rulesExpanded', rulesExpanded);
};
```

**Files to Modify**:
- `src/ui/panels/ruleEditor.js` - Add toggle state and button
- `src/storage/persistence.js` - Add `rulesExpanded` to settings

**Acceptance Criteria**:
- [ ] Toggle button shows collapse/expand icon
- [ ] State persists across reloads
- [ ] Smooth transition (CSS animation optional)
- [ ] Collapsed by default on small screens

---

### Feature #3: Panel Position Persistence (Related to Bug #2)
**Description**: Save and restore panel position across reloads.

**Implementation**: See Bug #2 fix strategy.

**Acceptance Criteria**:
- [ ] Position saved on drag end
- [ ] Position restored on page load
- [ ] Handles viewport size changes gracefully
- [ ] Resets to default if position invalid (off-screen)

---

## 🎯 **Medium Priority Features**

### Feature #4: Filter/Search Bar
**Description**: UI to filter logs by event type, URL, selector, or search text.

**Implementation Plan**:
1. Add text input to controls section
2. Add filter dropdown (Event, Request, WebSocket, Beacon, All)
3. Filter `combined` array in `renderLogs()` before rendering
4. Debounce search input (300ms)

**Files to Modify**:
- `src/ui/panels/overlay.js` - Add filter UI to controls
- `src/ui/panels/overlay.js` - Modify `renderLogs()` to apply filters

**Acceptance Criteria**:
- [ ] Text search matches URL, selector, method
- [ ] Case-insensitive search
- [ ] Filter by type (Event, Request, etc.)
- [ ] Clear filter button
- [ ] Filter state NOT persisted (resets on reload)

---

### Feature #5: Entry Details/Expansion
**Description**: Click entries to expand and see full request/response details.

**Implementation Plan**:
1. Add click handler to entries
2. Show expandable section with:
   - Full URL
   - Request headers
   - Response preview (if available)
   - Event target details
   - Matched rules explanation
3. Use accordion-style expansion (collapse others when one expands)

**Files to Modify**:
- `src/ui/panels/overlay.js` - Modify `formatEntryDOM()` to add click handler
- `src/core/telemetry/network.js` - Capture response data (limited)

**Acceptance Criteria**:
- [ ] Click entry to expand
- [ ] Show full URL (no truncation)
- [ ] Show request method, headers, body
- [ ] Show response status, headers (if CORS allows)
- [ ] Show which rules matched and why

---

### Feature #6: Timestamp Formatting
**Description**: Add wall-clock time and user-selectable format.

**Implementation Plan**:
1. Add timestamp mode toggle: "Relative" (current) vs "Absolute" (HH:MM:SS)
2. Store preference in GM_getValue('timestampMode')
3. Update `formatEntryDOM()` to format based on mode

**Formats**:
- Relative: `@1234ms` (current)
- Absolute: `14:32:45.123`
- ISO: `2025-11-07T14:32:45.123Z`

**Files to Modify**:
- `src/ui/panels/overlay.js` - Lines 70-80 (formatEntryDOM timestamp)
- `src/ui/panels/overlay.js` - Add timestamp mode toggle to controls

**Acceptance Criteria**:
- [ ] Toggle between relative/absolute time
- [ ] Absolute shows HH:MM:SS.mmm
- [ ] Preference persists across reloads
- [ ] Timezone awareness (local time)

---

### Feature #7: Resizable Panel
**Description**: Allow user to resize panel width and height.

**Implementation Plan**:
1. Add resize handle (bottom-right corner)
2. On mousedown, track drag and update panel dimensions
3. Constrain min/max sizes (min: 300x200, max: 80% viewport)
4. Persist dimensions in GM_getValue

**Files to Modify**:
- `src/ui/panels/overlay.js` - Add resize handle and handlers
- `src/storage/persistence.js` - Add panel dimensions to state

**Acceptance Criteria**:
- [ ] Resize handle visible (⋰ icon)
- [ ] Drag to resize width and height
- [ ] Min dimensions: 300px × 200px
- [ ] Max dimensions: 80% viewport
- [ ] Dimensions persist across reloads

---

### Feature #8: Export/Import Rules and Settings
**Description**: UI for exporting/importing rules and settings as JSON files.

**Implementation Plan**:
1. Add "Export Settings" button to controls
2. Create JSON blob with:
   ```json
   {
     "version": "1.0",
     "rules": [...],
     "settings": { logSize, persistLogs, theme, etc. }
   }
   ```
3. Use `GM_download()` to save file
4. Add "Import Settings" button with file input
5. Validate imported JSON before applying

**Files to Modify**:
- `src/utils/exporter.js` - Add `exportSettings()` and `importSettings()`
- `src/ui/panels/overlay.js` - Add import/export buttons

**Acceptance Criteria**:
- [ ] Export creates `xhray-settings-YYYY-MM-DD.json`
- [ ] Import validates JSON structure
- [ ] Import confirms before overwriting
- [ ] Export includes rules and all settings

---

## 🌟 **Nice-to-Have / Future Features**

### Feature #9: Advanced Rule Builder (Requested)
**Description**: Visual rule builder with live preview and validation.

**Complexity**: HIGH - Separate UI panel required

**Features**:
- Drag-and-drop selector builder
- URL pattern tester with live examples from logs
- Rule priority ordering
- Rule groups/categories
- Import/export individual rules

**Estimated Effort**: 10-15 hours

---

### Feature #10: Element Picker (Requested)
**Description**: Click-to-select DOM elements for adding to rules or watch list.

**Complexity**: HIGH - Requires overlay + event interception

**Implementation Outline**:
1. Add "Pick Element" button to controls
2. On click, enable picker mode:
   - Overlay with pointer-events
   - Highlight hovered elements
   - Click to select
3. Show element selector options (id, class, data-*, etc.)
4. Add to rule or watch list

**Files to Create**:
- `src/ui/elementPicker.js` - Picker overlay and logic

**Estimated Effort**: 8-12 hours

---

### Feature #11: WebSocket Message Correlation
**Description**: Associate WebSocket messages with DOM events that triggered them.

**Implementation**:
- Extend `beacon.js` and `websocket.js` to track recent DOM events
- Add `eventId` to WS message logs similar to XHR/fetch
- Show correlation in UI with ↔ arrow

**Files to Modify**:
- `src/core/telemetry/websocket.js` - Add event correlation logic
- `src/ui/panels/overlay.js` - Handle WS entries with eventId

**Estimated Effort**: 3-5 hours

---

### Feature #12: IndexedDB Support
**Description**: Store large logs, cross-page correlation, long-term storage.

**Complexity**: HIGH - Major persistence refactor

**Use Cases**:
- Sessions with >10,000 entries
- Cross-page flow tracking (SPA navigation)
- Historical analysis (last 7 days of logs)

**Implementation Outline**:
1. Create `src/storage/indexedDB.js`
2. Schema:
   ```javascript
   {
     store: 'logs',
     keyPath: 'id',
     indexes: ['timestamp', 'type', 'url', 'eventId']
   }
   ```
3. Add fallback: sessionStorage → IndexedDB → in-memory
4. Add UI for querying historical logs

**Estimated Effort**: 15-20 hours

---

### Feature #13: Log Filtering by Rule
**Description**: Show only entries matching specific rules.

**Implementation**:
- Add dropdown to controls: "Filter by Rule: [All] [Rule 1] [Rule 2]..."
- Filter `combined` array by `entry.rulesMatched` array

**Files to Modify**:
- `src/ui/panels/overlay.js` - Add rule filter dropdown

**Estimated Effort**: 2-3 hours

---

### Feature #14: Advanced Theme Customization
**Description**: More than dark/light - custom color schemes.

**Features**:
- Preset themes: Matrix, Cyberpunk, Light, High Contrast
- Custom accent colors
- Font size adjustment
- Transparency slider

**Files to Modify**:
- `src/settings/theme.js` - Expand theme system
- Create `src/settings/themes/` with preset definitions

**Estimated Effort**: 5-8 hours

---

### Feature #15: Rule Actions Beyond Highlighting
**Description**: Rules can trigger actions: notify, filter, extract, log to console.

**Action Types**:
- **Notify**: Show browser notification
- **Filter**: Hide from log view
- **Extract**: Save to separate list
- **Console**: Log to browser console
- **Break**: Debugger breakpoint (if DevTools open)

**Implementation**:
- Add `action` field to rule schema
- Execute action in `matchRulesForEvent()` and `matchRulesForRequest()`

**Files to Modify**:
- `src/matchers/rules.js` - Add action execution logic
- `src/ui/panels/ruleEditor.js` - Add action dropdown

**Estimated Effort**: 5-7 hours

---

## 📊 **Implementation Priority Matrix**

| Priority | Item | Effort | Impact | Dependencies |
|----------|------|--------|--------|--------------|
| 🔥 P0 | Bug #4: Controls Not Pinned | 2h | Critical | None |
| 🔥 P0 | Bug #2: Panel Disappears/Minimize | 3h | Critical | None |
| 🔥 P0 | Bug #3: UI Turns Green | 1h | High | None |
| 🔥 P0 | Bug #1: Panel Disappears After Load | 2h | High | None |
| ⚡ P1 | Feature #1: Respawn Button | 30min | High | Bug fixes |
| ⚡ P1 | Feature #2: Collapsible Rules | 1h | Medium | Bug #4 |
| ⚡ P1 | Feature #3: Panel Position Persistence | (Bug #2) | High | Bug #2 |
| 🎯 P2 | Feature #4: Filter/Search Bar | 3h | High | Bug #4 |
| 🎯 P2 | Feature #6: Timestamp Formatting | 2h | Medium | None |
| 🎯 P2 | Feature #5: Entry Expansion | 4h | Medium | Bug #4 |
| 🎯 P2 | Feature #7: Resizable Panel | 3h | Medium | Bug #2 |
| 🎯 P2 | Feature #8: Export/Import Settings | 2h | Medium | None |
| � P2 | **Feature #16: Split Panel Inspector** | **5h** | **High** | **Sprint 3** |
| 🎯 P2 | **Feature #17: Pop-Out Modals** | **2h** | **Medium** | **Feature #16** |
| �🌟 P3 | Feature #13: Filter by Rule | 2h | Low | Feature #4 |
| 🌟 P3 | Feature #11: WS Correlation | 4h | Medium | None |
| 🌟 P3 | Feature #14: Advanced Themes | 6h | Low | Bug #3 |
| 🌟 P3 | Feature #15: Rule Actions | 6h | Medium | None |
| 🌟 P4 | Feature #9: Advanced Rule Builder | 12h | High | Feature #2 |
| 🌟 P4 | Feature #10: Element Picker | 10h | High | Bug #4 |
| 🌟 P4 | Feature #12: IndexedDB | 18h | Medium | Major refactor |

---

## 🎯 **Recommended Sprint Plan**

### ✅ Sprint 1: Critical Bug Fixes (8 hours) - COMPLETED
- [x] Bug #4: Pin controls to top
- [x] Bug #2: Panel position/minimize persistence
- [x] Bug #3: Fix green text theme issue
- [x] Bug #1: Panel disappears after page load
- [x] Feature #1: Add respawn button

**Deliverable**: Stable, persistent panel with fixed controls. ✅ **DELIVERED** ✅ COMPLETE

---

### ✅ Sprint 2: UX Improvements (8 hours) - COMPLETED
- [x] Feature #2: Collapsible rules box
- [x] Feature #4: Filter/search bar
- [x] Feature #6: Timestamp formatting
- [x] Feature #7: Resizable panel

**Deliverable**: Enhanced usability and filtering. ✅ **DELIVERED**

---

### ✅ Sprint 3: Advanced Features (10 hours) - COMPLETED
- [x] Feature #5: Entry details expansion
- [x] Feature #8: Export/import settings
- [x] Feature #11: WebSocket correlation
- [x] Feature #13: Filter by rule

**Deliverable**: Deep inspection and data portability. ✅ **DELIVERED**

**Post-Sprint Review**: Entry expansion in live-updating log caused UX issues (re-rendering, flashing, text selection loss). Moving to split panel inspector architecture for Sprint 3.5.

---

### ✅ Sprint 3.5: Inspector Panel Refactor (7 hours) - COMPLETED
**Description**: Replace inline entry expansion with professional split-panel inspector + pop-out modals.

**Problem Statement**:
- Current inline expansion in scrolling log caused:
  - Visual flashing on re-renders
  - Lost text selection when copying data
  - Difficult to read complex JSON in scrolling context
  - Multiple expanded entries create cluttered view

**Solution**: Split panel architecture inspired by Chrome DevTools Network tab. ✅ **DELIVERED**

**Delivered Features**:
- ✅ **Phase 0: Modern Theme Refresh** - Complete color palette overhaul
  - Updated from Matrix (black/green) to DevTools-inspired (dark grays/cyan)
  - Added rounded corners, box shadows, smooth transitions
  - Mixed typography (sans-serif UI, monospace code)
  - Comprehensive hover states and animations

- ✅ **Phase 1: Split Panel Inspector** - Professional inspection interface
  - Restructured panel into log view (left) and inspector (right)
  - Resizable split with drag handle (250-600px range)
  - Click entry to open inspector with full details
  - Tabbed interface: General / Headers / Request / Response / Debug
  - Inspector never re-renders - completely stable during log updates
  - Selected entry highlighted with cyan border and glow

- ✅ **Phase 2: Pop-Out Modals** - Multi-entry comparison
  - "Pop Out" button (⧉) in inspector header
  - Creates draggable floating modals
  - Multiple modals open simultaneously for side-by-side comparison
  - Each modal has full tabbed interface
  - Modals auto-stagger positions (30px offset)
  - Click-to-front z-index management

- ✅ **Code Cleanup** - Removed ~200 lines of legacy code
  - Deleted old `expandedEntries`, `expandedDebugSections`, `entryScrollPositions` state
  - Removed `createDetailsSection()` function (181 lines)
  - Simplified `renderLogs()` - no expansion state tracking
  - Removed `lastRenderedCount` optimization logic

**Final Stats**:
- Build size: 70.16 kB (up from 46.14 kB in Sprint 3)
- Code reduction: ~200 lines removed, ~450 lines added (net +250 for major features)
- Performance: No re-rendering issues, stable text selection, smooth interactions

**Deliverable**: Professional-grade inspection system with Chrome DevTools UX. ✅ **COMPLETE**

---

### Sprint 4: Power User Features (20+ hours)
- [ ] Feature #9: Advanced rule builder
- [ ] Feature #10: Element picker
- [ ] Feature #14: Advanced themes
- [ ] Feature #15: Rule actions

**Deliverable**: Professional-grade debugging tool.

---

### Sprint 5: Enterprise Features (Optional, 20+ hours)
- [ ] Feature #12: IndexedDB support
- [ ] Cross-page flow tracking
- [ ] Historical log analysis
- [ ] Performance optimizations

**Deliverable**: Production-ready monitoring solution.

---

## 🔧 **Testing Checklist**

After each fix/feature, verify:
- [ ] Works on static sites (example.com)
- [ ] Works on SPAs (React apps, Gmail, Twitter)
- [ ] Panel persists through navigation
- [ ] Panel position/state saved correctly
- [ ] Theme applies correctly on load
- [ ] No console errors
- [ ] Performance acceptable (<100ms render time)
- [ ] Works with other userscripts (no conflicts)

---

## 📝 **Notes for AI Coding Agent**

1. **Always fix bugs before features** - Users can't use features if panel disappears.
2. **Test across pages** - Load 3-4 different sites after each change.
3. **Verify GM_getValue persistence** - Check Tampermonkey storage in browser DevTools.
4. **Use console.log sparingly** - This is a debugging tool, don't pollute console.
5. **Preserve backward compatibility** - Existing users' rules/settings must migrate safely.
6. **Document breaking changes** - Update CHANGELOG.md for any storage schema changes.

---

**END OF ROADMAP**
