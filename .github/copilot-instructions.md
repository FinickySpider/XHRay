# XHRay - AI Coding Agent Instructions

## Project Overview
XHRay is a **Tampermonkey userscript** that correlates DOM events with network telemetry (XHR, fetch, WebSocket, sendBeacon). It's built as a modular ES6 project compiled with Vite into a single `.user.js` file for browser installation.

## Architecture & Data Flow

### Bootstrap Sequence (Critical Understanding)
1. `main.js` → immediately invokes `bootstrap()`
2. `bootstrap.js` orchestrates initialization in this order:
   - Load settings from `GM_getValue` (Tampermonkey storage)
   - Load correlation rules from storage
   - Patch all telemetry APIs (XHR, fetch, WebSocket, sendBeacon)
   - Initialize DOM event listeners
   - Create floating UI panel
   - Start 1-second render loop for log updates

### Core Components
- **Telemetry Layers** (`src/core/telemetry/`): Monkey-patch native browser APIs to intercept calls
- **Rule Matcher** (`src/matchers/rules.js`): Bi-directional matching between DOM events (via CSS selectors) and network requests (via URL patterns)
- **Storage** (`src/storage/persistence.js`): Rolling logs with configurable size limit, uses both `GM_getValue` (persistent) and `sessionStorage` (ephemeral)
- **UI Panel** (`src/ui/panels/overlay.js`): Draggable floating panel with auto-scroll detection, live rule editor

### Key Pattern: Event-Request Correlation
When a DOM event occurs, it gets a UUID. If a network request is made within proximity, it references the event's UUID via `eventId`. Rules match both independently and create correlation badges in the UI.

## Build System

### Commands
- **Development**: `npm run dev` (Vite dev server - hot reload)
- **Production Build**: `npm run build` or `Compile.bat`
  - Bundles `src/main.js` as IIFE
  - Injects `src/header.meta.js` Tampermonkey metadata block via custom Vite plugin
  - Outputs to `dist/xhray.user.js` (unminified for userscript compatibility)
- **Release**: `npm run release` or `Release.bat`
  - Runs `standard-version` (conventional commits)
  - Auto-generates `CHANGELOG.md`
  - Creates git tag, pushes with `--follow-tags`

### Critical Build Details
- Build produces **IIFE format** (not ESM) - userscripts can't use modules
- **No minification** - preserves debugging and Tampermonkey compatibility
- Custom `userscriptHeader()` plugin prepends metadata block post-build
- Header version (`src/header.meta.js`) must be manually synced with `package.json`

## Tampermonkey API Constraints

### GM_* Functions (Not Standard Browser APIs)
These are injected by Tampermonkey and only work in userscript context:
- `GM_getValue(key, defaultValue)` - read persistent storage
- `GM_setValue(key, value)` - write persistent storage (string values only)
- `GM_download({ url, name })` - trigger file download
- `GM_registerMenuCommand(name, callback)` - add userscript menu item

**Important**: These are globals, not imports. Don't mock in tests without DOM setup.

## Testing Strategy
- **Framework**: Vitest with jsdom environment
- **Scope**: Unit tests for rule matching logic (`tests/matcher.test.js`)
- **Limitation**: Cannot test GM_* APIs or full integration without Tampermonkey
- Run: `npm test` (no test script exists yet - needs addition to `package.json`)

## Code Conventions

### Commit Messages (Enforced by Commitlint)
Format: `<type>(<scope>): <subject>`
- **Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`
- **Scopes**: `telemetry`, `panels`, `settings`, `matchers`, `storage`, `docs`, `build`, `ci`
- **Example**: `feat(telemetry): add WebSocket frame inspection`

### Module Structure
- **No default exports** - all modules use named exports
- **Import order**: Core → Storage → UI → Utils
- **Side effects**: Keep patching code isolated in telemetry modules

### Storage Keys (GM_getValue/GM_setValue)
- `telemetryRules` - JSON string of correlation rules
- `logSize` - max rolling log entries (default: 500)
- `persistLogs` - boolean for sessionStorage persistence
- `wsLogging` - enable WebSocket telemetry
- `beaconLogging` - enable sendBeacon telemetry
- `darkTheme` - UI theme preference

## Extension Points

### Adding New Telemetry Sources
1. Create module in `src/core/telemetry/`
2. Monkey-patch the target API (store original reference)
3. Call `pushToRolling(requestsLog, entry)` with timestamped entry
4. Import and invoke in `bootstrap.js`
5. Add optional enable flag to `getLogState()`

### Adding Rule Match Criteria
Edit `src/matchers/rules.js`:
- `matchRulesForEvent()` - modify selector matching logic
- `matchRulesForRequest()` - modify URL pattern matching (supports regex)
- Both use try-catch for regex validation fallback

### UI Panel Customization
`src/ui/panels/overlay.js` controls all rendering:
- `formatEntryDOM()` - customize log entry appearance
- Auto-scroll logic based on `panel.scrollTop` proximity (5px threshold)
- Draggable panel uses `mousedown`/`mousemove`/`mouseup` events

## Common Pitfalls
1. **Don't minify output** - breaks Tampermonkey debugging and `@grant` detection
2. **Regex in rules must be validated** - user-provided patterns can crash matcher
3. **Rolling log array mutations** - always use `pushToRolling()` to maintain size limit
4. **Theme application timing** - call `applyTheme()` after DOM elements created
5. **Panel render loop** - 1-second interval is intentional (performance vs. reactivity)

## Quick Reference Files
- Entry point: `src/main.js`
- Initialization logic: `src/core/bootstrap.js`
- Rule matching: `src/matchers/rules.js`
- Build config: `vite.config.js`
- Userscript metadata: `src/header.meta.js`
