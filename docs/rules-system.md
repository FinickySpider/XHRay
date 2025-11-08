# XHRay Rules System Documentation

## Table of Contents
1. [Overview](#overview)
2. [Rule Structure](#rule-structure)
3. [How Rules Work](#how-rules-work)
4. [Selector Matching](#selector-matching)
5. [URL Pattern Matching](#url-pattern-matching)
6. [Creating Custom Rules](#creating-custom-rules)
7. [Working Examples](#working-examples)
8. [Framework Presets](#framework-presets)
9. [Advanced Patterns](#advanced-patterns)
10. [Troubleshooting](#troubleshooting)

---

## Overview

The XHRay rules system provides **bi-directional correlation** between DOM events (clicks, form submissions, input changes) and network telemetry (XHR, fetch, WebSocket, sendBeacon). Rules allow you to:

- **Track which UI elements trigger which API calls**
- **Highlight correlated events in the telemetry log**
- **Debug complex user flows across frontend and backend**
- **Monitor specific interactions in production**

Rules are defined as JSON objects and stored persistently via Tampermonkey's `GM_setValue` API.

---

## Rule Structure

Each rule is a JSON object with the following properties:

```json
{
  "name": "Human-readable rule name",
  "selector": "CSS selector for DOM elements",
  "urlPattern": "String or regex pattern for URLs",
  "action": "highlight"
}
```

### Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | ✅ Yes | Display name shown in the UI when rule matches |
| `selector` | string | ⚠️ Conditional | CSS selector to match DOM elements (required for event matching) |
| `urlPattern` | string | ⚠️ Conditional | String or regex pattern to match request URLs (required for request matching) |
| `action` | string | ❌ No | Future use - currently only `"highlight"` is supported |

**Important**: At least one of `selector` or `urlPattern` must be specified. Both can be present for full bi-directional correlation.

---

## How Rules Work

### Initialization Flow
1. **Bootstrap Phase**: Rules are loaded from Tampermonkey storage via `GM_getValue('telemetryRules')`
2. **Default Fallback**: If no rules exist, a single default rule is loaded
3. **Validation**: Invalid JSON triggers a console warning and defaults are used

### Matching Flow

#### Event Matching (DOM → Rule)
When a DOM event occurs (click, submit, change, keydown, input):

```javascript
// 1. Event is captured with metadata
const event = {
  id: "uuid-1234",
  type: "click",
  selector: "button.submit-btn",
  element: <HTMLElement>,
  timestamp: 12345.67
};

// 2. Rules are checked against the event
rules.forEach(rule => {
  // Try direct element matching first
  if (event.element.matches(rule.selector)) {
    event.rulesMatched.push(rule.name);
  }
  // Fallback to selector string matching
  if (event.selector.includes(rule.selector)) {
    event.rulesMatched.push(rule.name);
  }
});
```

#### Request Matching (Network → Rule)
When a network request is made (XHR, fetch, WebSocket, sendBeacon):

```javascript
// 1. Request is captured with metadata
const request = {
  id: "uuid-5678",
  method: "POST",
  url: "https://api.example.com/submit",
  status: 200,
  timestamp: 12346.78,
  duration: 234
};

// 2. Rules are checked against the request
rules.forEach(rule => {
  // Try regex matching first
  try {
    if (new RegExp(rule.urlPattern).test(request.url)) {
      request.rulesMatched.push(rule.name);
    }
  } catch {
    // Fallback to substring matching
    if (request.url.includes(rule.urlPattern)) {
      request.rulesMatched.push(rule.name);
    }
  }
});
```

### Visual Correlation
When both an event and a request match the same rule within proximity:
- A **correlation badge** appears in the UI
- The rule name is displayed on both entries
- Entries are visually grouped for easy tracing

---

## Selector Matching

XHRay uses standard CSS selectors to match DOM elements. The matching process:

1. **Direct Element Match**: Tests `element.matches(selector)` 
2. **Fallback String Match**: If element matching fails, checks if the generated CSS path includes the selector string

### Supported Selector Types

#### Element Selectors
```json
{
  "name": "Track all buttons",
  "selector": "button"
}
```

#### Class Selectors
```json
{
  "name": "Track submit buttons",
  "selector": ".submit-btn"
}
```

#### ID Selectors
```json
{
  "name": "Track login form",
  "selector": "#login-form"
}
```

#### Attribute Selectors
```json
{
  "name": "Track data attributes",
  "selector": "[data-action='submit']"
}
```

#### Descendant Selectors
```json
{
  "name": "Track form buttons",
  "selector": "form button"
}
```

#### Child Selectors
```json
{
  "name": "Track direct children",
  "selector": ".container > button"
}
```

#### Pseudo-selectors
```json
{
  "name": "Track first submit button",
  "selector": "button[type='submit']:first-of-type"
}
```

#### Complex Combinations
```json
{
  "name": "Track specific pattern",
  "selector": "div.modal form#checkout button.primary[type='submit']"
}
```

### Selector Best Practices

✅ **DO:**
- Use specific selectors to avoid false positives
- Prefer semantic attributes (`[data-testid]`, `[aria-label]`)
- Use class names that reflect business logic
- Test selectors in browser DevTools before adding to rules

❌ **DON'T:**
- Avoid overly generic selectors (`div`, `span`, `*`)
- Don't rely on dynamically generated classes (`css-abc123`)
- Avoid selectors that might match XHRay's own UI

---

## URL Pattern Matching

URL patterns support both **simple string matching** and **regex patterns**.

### String Matching (Simple)
If the pattern is not a valid regex, XHRay falls back to substring matching:

```json
{
  "name": "Track all API calls",
  "urlPattern": "/api/"
}
```
**Matches:**
- `https://example.com/api/users`
- `https://example.com/v1/api/submit`
- `http://localhost:3000/api/data`

### Regex Matching (Advanced)
For precise matching, use regex patterns:

```json
{
  "name": "Track user endpoints",
  "urlPattern": "/api/users/\\d+"
}
```
**Matches:**
- `https://example.com/api/users/123`
- `https://example.com/api/users/9876`

**Does NOT match:**
- `https://example.com/api/users/abc`
- `https://example.com/api/users`

### Regex Pattern Examples

#### Exact Path Match
```json
{
  "name": "Track login endpoint only",
  "urlPattern": "/api/auth/login$"
}
```

#### Multiple Endpoints (Alternation)
```json
{
  "name": "Track auth endpoints",
  "urlPattern": "/api/(login|logout|register)"
}
```

#### Query Parameters
```json
{
  "name": "Track analytics with user ID",
  "urlPattern": "/analytics\\?.*userId=\\d+"
}
```

#### Domain Matching
```json
{
  "name": "Track production API only",
  "urlPattern": "^https://api\\.production\\.com"
}
```

#### File Extensions
```json
{
  "name": "Track image uploads",
  "urlPattern": "\\.(jpg|png|gif|webp)$"
}
```

#### HTTP Methods (Note: Pattern matches URL only)
To match specific methods, combine with request inspection:
```json
{
  "name": "Track POST requests to submit",
  "urlPattern": "/submit",
  "notes": "Will match all methods - filter visually in UI"
}
```

### URL Pattern Best Practices

✅ **DO:**
- Escape special regex characters (`\.`, `\?`, `\+`, etc.)
- Use `^` and `$` anchors for exact matches
- Test patterns at [regex101.com](https://regex101.com/) with JavaScript flavor
- Start with string matching, add regex only when needed

❌ **DON'T:**
- Don't forget to double-escape backslashes in JSON (`\\` not `\`)
- Avoid overly broad patterns that match unintended URLs
- Don't use lookaheads/lookbehinds (limited browser support)

---

## Creating Custom Rules

### Step 1: Open the Rule Editor
1. Locate the XHRay floating panel
2. Click **"▶ Rules Editor"** to expand the editor
3. You'll see the current rules in JSON format

### Step 2: Edit the JSON Array
Rules are stored as an array of objects:

```json
[
  {
    "name": "Existing Rule",
    "selector": ".old-selector",
    "urlPattern": "/old-pattern"
  },
  {
    "name": "New Rule",
    "selector": ".new-selector",
    "urlPattern": "/new-pattern"
  }
]
```

### Step 3: Add Your Rule
Insert a new object in the array:

```json
[
  {
    "name": "Track Checkout Button",
    "selector": "button#checkout-btn",
    "urlPattern": "/api/orders/create"
  }
]
```

### Step 4: Validate and Save
1. Click **"Save Rules"** button
2. Check for validation feedback:
   - ✅ Green message = success
   - ❌ Red message = JSON syntax error
3. Rules take effect immediately (no page reload needed)

### Step 5: Test Your Rule
1. Perform the action (click button, submit form, etc.)
2. Check the telemetry log for the rule badge
3. Verify both event and request show the rule name

---

## Working Examples

### Example 1: Basic Button Click → API Call
**Scenario**: Track when a "Save" button triggers a POST request

```json
{
  "name": "Save Button → Save API",
  "selector": "button.save-btn",
  "urlPattern": "/api/save"
}
```

**What it does:**
- Captures clicks on any element with class `save-btn`
- Matches any request URL containing `/api/save`
- Displays "Save Button → Save API" badge when both occur

### Example 2: Form Submission
**Scenario**: Track form submissions to login endpoint

```json
{
  "name": "Login Form Submission",
  "selector": "form#login-form",
  "urlPattern": "/api/auth/login"
}
```

**What it does:**
- Captures `submit` events on the login form
- Matches POST requests to the login endpoint
- Correlates form submission with authentication request

### Example 3: Search Input → Search API
**Scenario**: Track search box typing and API calls

```json
{
  "name": "Search Box → Search API",
  "selector": "input[type='search']",
  "urlPattern": "/api/search\\?"
}
```

**What it does:**
- Captures `input` and `change` events on search inputs
- Matches URLs with `/api/search?` (query parameters)
- Helps debug search debouncing and API timing

### Example 4: Delete Actions with Confirmation
**Scenario**: Track delete button clicks across different resources

```json
{
  "name": "Delete Actions",
  "selector": "[data-action='delete']",
  "urlPattern": "/api/.*/delete$"
}
```

**What it does:**
- Matches any element with `data-action="delete"` attribute
- Uses regex to match URLs ending in `/delete` for any resource
- Examples: `/api/users/123/delete`, `/api/posts/456/delete`

### Example 5: Monitoring Third-Party Scripts
**Scenario**: Track when analytics events are fired

```json
{
  "name": "Analytics Event Tracking",
  "selector": "[data-analytics-event]",
  "urlPattern": "google-analytics\\.com|analytics\\.company\\.com"
}
```

**What it does:**
- Matches elements with analytics tracking attributes
- Uses regex alternation to match multiple analytics domains
- Monitors when user actions trigger analytics beacons

### Example 6: Pagination Tracking
**Scenario**: Monitor page navigation and data fetching

```json
{
  "name": "Pagination → Data Fetch",
  "selector": ".pagination button, .pagination a",
  "urlPattern": "/api/items\\?page=\\d+"
}
```

**What it does:**
- Matches both button and link pagination controls
- Uses regex to match paginated API requests
- Helps debug infinite scroll and pagination issues

### Example 7: File Upload Monitoring
**Scenario**: Track file uploads from input to API

```json
{
  "name": "File Upload → Upload API",
  "selector": "input[type='file']",
  "urlPattern": "/api/upload|/api/media"
}
```

**What it does:**
- Captures `change` events on file inputs
- Matches multiple upload endpoints using alternation
- Monitors upload API calls and timing

### Example 8: Modal Interactions
**Scenario**: Track modal button clicks and related API calls

```json
{
  "name": "Modal Actions",
  "selector": ".modal button[type='submit']",
  "urlPattern": "/api/modal"
}
```

**What it does:**
- Specifically targets submit buttons inside modals
- Matches API calls triggered by modal actions
- Useful for debugging modal-specific workflows

---

## Framework Presets

### React Applications

#### Preset: React Router Navigation
```json
[
  {
    "name": "React Router Link Navigation",
    "selector": "a[href^='/']",
    "urlPattern": "/api/"
  },
  {
    "name": "React Button Actions",
    "selector": "button[class*='btn'], button[class*='Button']",
    "urlPattern": "/api/"
  },
  {
    "name": "React Form Submissions",
    "selector": "form",
    "urlPattern": "/api/"
  }
]
```

#### Preset: React Material-UI (MUI)
```json
[
  {
    "name": "MUI Button → API",
    "selector": "button.MuiButton-root",
    "urlPattern": "/api/"
  },
  {
    "name": "MUI IconButton → API",
    "selector": "button.MuiIconButton-root",
    "urlPattern": "/api/"
  },
  {
    "name": "MUI TextField Input",
    "selector": "input.MuiInputBase-input",
    "urlPattern": "/api/search|/api/autocomplete"
  },
  {
    "name": "MUI Dialog Actions",
    "selector": ".MuiDialog-root button",
    "urlPattern": "/api/"
  }
]
```

#### Preset: React Ant Design
```json
[
  {
    "name": "Ant Design Button",
    "selector": "button.ant-btn",
    "urlPattern": "/api/"
  },
  {
    "name": "Ant Design Form Submit",
    "selector": ".ant-form button[type='submit']",
    "urlPattern": "/api/"
  },
  {
    "name": "Ant Design Table Actions",
    "selector": ".ant-table-row button, .ant-table-row a",
    "urlPattern": "/api/"
  },
  {
    "name": "Ant Design Modal Actions",
    "selector": ".ant-modal button.ant-btn-primary",
    "urlPattern": "/api/"
  }
]
```

### Vue.js Applications

#### Preset: Vue.js Standard
```json
[
  {
    "name": "Vue Button Click",
    "selector": "button[class*='v-btn'], button[v-on]",
    "urlPattern": "/api/"
  },
  {
    "name": "Vue Form Submit",
    "selector": "form[v-on\\:submit], form[@submit]",
    "urlPattern": "/api/"
  },
  {
    "name": "Vue Router Links",
    "selector": "a[class*='router-link']",
    "urlPattern": "/api/"
  }
]
```

#### Preset: Vuetify
```json
[
  {
    "name": "Vuetify Button Actions",
    "selector": "button.v-btn",
    "urlPattern": "/api/"
  },
  {
    "name": "Vuetify Text Field Input",
    "selector": ".v-text-field input",
    "urlPattern": "/api/search|/api/validate"
  },
  {
    "name": "Vuetify Dialog Actions",
    "selector": ".v-dialog button.v-btn",
    "urlPattern": "/api/"
  },
  {
    "name": "Vuetify Data Table Actions",
    "selector": ".v-data-table button",
    "urlPattern": "/api/"
  }
]
```

### Angular Applications

#### Preset: Angular Material
```json
[
  {
    "name": "Mat-Button Actions",
    "selector": "button[mat-button], button[mat-raised-button], button[mat-flat-button]",
    "urlPattern": "/api/"
  },
  {
    "name": "Mat-Input Changes",
    "selector": "input[matInput]",
    "urlPattern": "/api/"
  },
  {
    "name": "Mat-Dialog Actions",
    "selector": "mat-dialog-actions button",
    "urlPattern": "/api/"
  },
  {
    "name": "Mat-Table Actions",
    "selector": "mat-table button, mat-row button",
    "urlPattern": "/api/"
  }
]
```

### Bootstrap Applications

#### Preset: Bootstrap 5
```json
[
  {
    "name": "Bootstrap Primary Buttons",
    "selector": "button.btn-primary, a.btn-primary",
    "urlPattern": "/api/"
  },
  {
    "name": "Bootstrap Form Submit",
    "selector": "form button[type='submit']",
    "urlPattern": "/api/"
  },
  {
    "name": "Bootstrap Modal Actions",
    "selector": ".modal button.btn",
    "urlPattern": "/api/"
  },
  {
    "name": "Bootstrap Dropdown Actions",
    "selector": ".dropdown-item",
    "urlPattern": "/api/"
  },
  {
    "name": "Bootstrap Card Actions",
    "selector": ".card button, .card a.btn",
    "urlPattern": "/api/"
  }
]
```

### E-Commerce Platforms

#### Preset: Shopify Themes
```json
[
  {
    "name": "Add to Cart",
    "selector": "button[name='add'], .add-to-cart-button, [data-action='add-to-cart']",
    "urlPattern": "/cart/add"
  },
  {
    "name": "Update Cart",
    "selector": ".cart__update, button[name='update']",
    "urlPattern": "/cart/update|/cart/change"
  },
  {
    "name": "Checkout Button",
    "selector": "button[name='checkout'], .checkout-button",
    "urlPattern": "/checkout"
  },
  {
    "name": "Product Variant Selection",
    "selector": ".product-form select, .variant-selector",
    "urlPattern": "/products/.*\\.js"
  },
  {
    "name": "Wishlist Actions",
    "selector": "[data-action='add-to-wishlist']",
    "urlPattern": "/wishlist"
  }
]
```

#### Preset: WooCommerce
```json
[
  {
    "name": "WooCommerce Add to Cart",
    "selector": "button.add_to_cart_button, .single_add_to_cart_button",
    "urlPattern": "\\?add-to-cart=|/\\?wc-ajax=add_to_cart"
  },
  {
    "name": "WooCommerce Cart Update",
    "selector": "button[name='update_cart']",
    "urlPattern": "/cart/\\?update_cart"
  },
  {
    "name": "WooCommerce Checkout",
    "selector": "#place_order",
    "urlPattern": "/checkout/\\?wc-ajax=checkout"
  },
  {
    "name": "WooCommerce AJAX Filters",
    "selector": ".woocommerce-widget-layered-nav a",
    "urlPattern": "\\?wc-ajax=get_refreshed_fragments"
  }
]
```

### CMS Platforms

#### Preset: WordPress Admin
```json
[
  {
    "name": "WordPress Publish/Update",
    "selector": "#publish, #save-post",
    "urlPattern": "/wp-admin/post\\.php|/wp-admin/admin-ajax\\.php"
  },
  {
    "name": "WordPress Media Upload",
    "selector": "#plupload-upload-ui button, .upload-button",
    "urlPattern": "/wp-admin/async-upload\\.php"
  },
  {
    "name": "WordPress AJAX Actions",
    "selector": ".wp-admin [data-action]",
    "urlPattern": "/wp-admin/admin-ajax\\.php"
  },
  {
    "name": "WordPress Quick Edit",
    "selector": ".inline-edit-save button",
    "urlPattern": "/wp-admin/admin-ajax\\.php.*action=inline-save"
  }
]
```

### Single Page Application (SPA) Patterns

#### Preset: Generic SPA
```json
[
  {
    "name": "SPA Navigation Links",
    "selector": "a[href^='#'], a[href^='/']",
    "urlPattern": "/api/"
  },
  {
    "name": "SPA Load More / Infinite Scroll",
    "selector": "button[class*='load-more'], button[class*='show-more']",
    "urlPattern": "/api/.*\\?page=|/api/.*\\?offset="
  },
  {
    "name": "SPA Search/Filter",
    "selector": "input[type='search'], input[name*='search'], input[name*='filter']",
    "urlPattern": "/api/search|/api/filter"
  },
  {
    "name": "SPA CRUD Operations",
    "selector": "[data-action='create'], [data-action='update'], [data-action='delete']",
    "urlPattern": "/api/"
  }
]
```

### REST API Patterns

#### Preset: RESTful API Monitoring
```json
[
  {
    "name": "GET Requests (List/Read)",
    "selector": "button, a",
    "urlPattern": "/api/[^/]+$|/api/[^/]+/\\d+$"
  },
  {
    "name": "POST Requests (Create)",
    "selector": "form button[type='submit'], button[class*='create'], button[class*='add']",
    "urlPattern": "/api/[^/]+$"
  },
  {
    "name": "PUT/PATCH Requests (Update)",
    "selector": "button[class*='update'], button[class*='save'], button[class*='edit']",
    "urlPattern": "/api/[^/]+/\\d+$"
  },
  {
    "name": "DELETE Requests",
    "selector": "button[class*='delete'], button[class*='remove']",
    "urlPattern": "/api/[^/]+/\\d+$"
  }
]
```

### GraphQL Applications

#### Preset: GraphQL Monitoring
```json
[
  {
    "name": "GraphQL Queries",
    "selector": "button, a, form",
    "urlPattern": "/graphql"
  },
  {
    "name": "Apollo Client Operations",
    "selector": "[data-apollo], [class*='apollo']",
    "urlPattern": "/graphql"
  }
]
```

### Real-Time Features

#### Preset: WebSocket Monitoring
```json
[
  {
    "name": "Chat Message Send",
    "selector": "button[class*='send'], button[type='submit']",
    "urlPattern": "wss?://.*/(chat|messages|socket)"
  },
  {
    "name": "Live Updates Toggle",
    "selector": "button[class*='live'], input[type='checkbox'][class*='real-time']",
    "urlPattern": "wss?://"
  }
]
```

#### Preset: Server-Sent Events (SSE)
```json
[
  {
    "name": "SSE Notifications",
    "selector": "button[class*='notify'], button[class*='subscribe']",
    "urlPattern": "/events|/stream|/sse"
  }
]
```

---

## Advanced Patterns

### Multi-Step Form Flows
Track complex forms across multiple steps:

```json
[
  {
    "name": "Step 1: Personal Info",
    "selector": "#step1-form button[type='submit']",
    "urlPattern": "/api/registration/step1"
  },
  {
    "name": "Step 2: Address Info",
    "selector": "#step2-form button[type='submit']",
    "urlPattern": "/api/registration/step2"
  },
  {
    "name": "Step 3: Payment Info",
    "selector": "#step3-form button[type='submit']",
    "urlPattern": "/api/registration/step3"
  },
  {
    "name": "Step 4: Confirmation",
    "selector": "#step4-form button[type='submit']",
    "urlPattern": "/api/registration/complete"
  }
]
```

### Debounced Input Tracking
Monitor autocomplete and search-as-you-type:

```json
{
  "name": "Debounced Search Input",
  "selector": "input[name='search'], input[type='search']",
  "urlPattern": "/api/search\\?q=",
  "notes": "Will show multiple events for each keystroke, but correlates with debounced API calls"
}
```

### Authentication Flows
Track login, token refresh, and logout:

```json
[
  {
    "name": "Login Action",
    "selector": "button[type='submit']#login-btn, form#login-form button[type='submit']",
    "urlPattern": "/api/auth/login|/api/v1/authenticate"
  },
  {
    "name": "Token Refresh (Background)",
    "selector": "",
    "urlPattern": "/api/auth/refresh"
  },
  {
    "name": "Logout Action",
    "selector": "button[class*='logout'], a[href*='logout']",
    "urlPattern": "/api/auth/logout"
  }
]
```

### Lazy Loading and Code Splitting
Track dynamic module loading:

```json
{
  "name": "Dynamic Module Loading",
  "selector": "button[data-module], a[data-route]",
  "urlPattern": "\\.chunk\\.js$|\\.bundle\\.js$"
}
```

### A/B Testing and Feature Flags
Monitor when features are toggled:

```json
{
  "name": "Feature Flag Toggle",
  "selector": "[data-feature-flag]",
  "urlPattern": "/api/features|/api/experiments"
}
```

### Error Handling and Retry Logic
Track failed requests and retry attempts:

```json
{
  "name": "Retry Button Actions",
  "selector": "button[class*='retry'], button[data-action='retry']",
  "urlPattern": "/api/"
}
```

### Batch Operations
Monitor bulk actions:

```json
{
  "name": "Bulk Delete",
  "selector": "button[data-action='bulk-delete'], button[class*='bulk-action']",
  "urlPattern": "/api/.*/batch|/api/.*/bulk"
}
```

### Analytics and Tracking Correlation
Correlate user actions with analytics beacons:

```json
[
  {
    "name": "Google Analytics Events",
    "selector": "[data-ga-event], [data-gtm-click]",
    "urlPattern": "google-analytics\\.com/collect|googletagmanager\\.com"
  },
  {
    "name": "Custom Analytics",
    "selector": "[data-track], [data-analytics]",
    "urlPattern": "/api/analytics|/api/track"
  },
  {
    "name": "Mixpanel Events",
    "selector": "[data-mixpanel]",
    "urlPattern": "mixpanel\\.com/track"
  }
]
```

---

## Troubleshooting

### Rule Not Matching

**Problem**: Rule doesn't appear in the telemetry log

**Solutions**:
1. **Verify JSON syntax**: Use [JSONLint](https://jsonlint.com/) to validate
2. **Test selector in DevTools**: 
   ```javascript
   document.querySelector('your-selector')
   // Should return the expected element
   ```
3. **Test URL pattern**:
   ```javascript
   new RegExp('your-pattern').test('https://example.com/api/test')
   // Should return true
   ```
4. **Check timing**: Ensure rule is saved before performing the action
5. **Inspect element path**: Click an element and check its generated CSS path in the log

### Too Many Matches

**Problem**: Rule matches too broadly

**Solutions**:
1. **Make selectors more specific**:
   ```json
   // Instead of:
   { "selector": "button" }
   
   // Use:
   { "selector": "form#checkout button.primary-action" }
   ```

2. **Use exact URL matching**:
   ```json
   // Instead of:
   { "urlPattern": "/api/" }
   
   // Use:
   { "urlPattern": "^https://api\\.example\\.com/v1/users$" }
   ```

### Regex Errors

**Problem**: Invalid regex pattern causes fallback to string matching

**Solutions**:
1. **Escape special characters**:
   ```json
   // Wrong:
   { "urlPattern": "/api/users?" }
   
   // Correct:
   { "urlPattern": "/api/users\\?" }
   ```

2. **Double-escape in JSON**:
   ```json
   // Wrong:
   { "urlPattern": "\d+" }
   
   // Correct:
   { "urlPattern": "\\d+" }
   ```

3. **Test regex separately**:
   ```javascript
   // In browser console:
   new RegExp('/api/users/\\d+').test('/api/users/123')
   ```

### No Correlation Between Event and Request

**Problem**: Event and request both match the rule but don't correlate

**Explanation**: 
- XHRay shows rule badges independently for events and requests
- Visual correlation appears when both occur in proximity
- Requests may be delayed (debouncing, queueing) or asynchronous

**Solutions**:
1. **Check timing**: Look at timestamps in the log
2. **Verify causation**: Ensure the event actually triggers the request
3. **Use browser DevTools**: Network tab to confirm request is made
4. **Check for intermediate actions**: Some frameworks batch or queue requests

### Performance Impact

**Problem**: Too many rules slow down the browser

**Solutions**:
1. **Limit rule count**: Keep rules under 50 for optimal performance
2. **Use specific selectors**: Avoid `*` or overly generic selectors
3. **Disable unused rules**: Comment out or remove rules you're not actively using
4. **Use string matching when possible**: Regex is slower than string matching

### Rules Not Persisting

**Problem**: Rules reset after page reload

**Solutions**:
1. **Verify Tampermonkey permissions**: Ensure `@grant GM_setValue` is present
2. **Check storage quota**: Tampermonkey has storage limits
3. **Export rules as backup**: Use the export feature regularly
4. **Check for script conflicts**: Other userscripts may interfere

### False Positives

**Problem**: Rule matches unintended elements or requests

**Solutions**:
1. **Use negative selectors**: Exclude specific elements
   ```json
   {
     "selector": "button:not(.exclude-this-class)"
   }
   ```

2. **Use exact matches**: Anchor regex patterns
   ```json
   {
     "urlPattern": "^https://api\\.example\\.com/submit$"
   }
   ```

3. **Add context to selectors**: Include parent elements
   ```json
   {
     "selector": "main .content button.action"
   }
   ```

---

## Tips and Best Practices

### Development Workflow

1. **Start Broad, Then Narrow**:
   ```json
   // Step 1: Start with broad rule
   { "selector": "button", "urlPattern": "/api/" }
   
   // Step 2: Observe what matches
   // Step 3: Refine to specific elements
   { "selector": "form#checkout button.submit", "urlPattern": "/api/orders/create" }
   ```

2. **Use Descriptive Names**:
   ```json
   // Bad:
   { "name": "Rule 1" }
   
   // Good:
   { "name": "Checkout Button → Order Creation API" }
   ```

3. **Document Complex Patterns**:
   ```json
   {
     "name": "Multi-step Checkout Flow",
     "selector": ".checkout-wizard button[type='submit']",
     "urlPattern": "/api/checkout/(cart|shipping|payment|confirm)",
     "notes": "Tracks all 4 steps of checkout process"
   }
   ```

4. **Export Rules Regularly**:
   - Click "Export Logs" to save rules
   - Store in version control for team sharing
   - Document rule changes in commit messages

### Testing Rules

1. **Test in Isolation**: Temporarily disable other rules to verify behavior
2. **Use DevTools Console**: Test selectors and regex before adding to rules
3. **Check Both Directions**: Verify event→rule and request→rule matching
4. **Validate Timing**: Ensure events and requests occur within expected timeframes

### Organizing Rules

For large rule sets, use naming conventions:

```json
[
  {
    "name": "[AUTH] Login Form Submit",
    "selector": "#login-form"
  },
  {
    "name": "[AUTH] Logout Button",
    "selector": ".logout-btn"
  },
  {
    "name": "[CART] Add to Cart",
    "selector": ".add-to-cart"
  },
  {
    "name": "[CART] Update Quantity",
    "selector": ".quantity-input"
  }
]
```

### Sharing Rules with Team

1. **Export Settings**: Use XHRay's export feature
2. **Version Control**: Store `rules.json` in repo
3. **Documentation**: Maintain a README explaining each rule's purpose
4. **Code Reviews**: Review rule changes like code changes

---

## Appendix: Rule Schema Reference

### Complete Schema

```typescript
interface Rule {
  name: string;              // Required: Display name for UI
  selector?: string;         // Optional: CSS selector for DOM elements
  urlPattern?: string;       // Optional: URL pattern (string or regex)
  action?: 'highlight';      // Optional: Action type (currently only 'highlight')
  notes?: string;            // Optional: Internal documentation (not used by XHRay)
}

type Rules = Rule[];
```

### Validation Rules

- ✅ Array must be valid JSON
- ✅ Each rule must be an object
- ✅ `name` property is required (string)
- ✅ At least one of `selector` or `urlPattern` must be present
- ✅ Invalid regex in `urlPattern` falls back to string matching (no error)
- ✅ Invalid CSS selector is caught silently (no crash)

### Storage Format

Rules are stored as a JSON string in Tampermonkey storage:

```javascript
GM_setValue('telemetryRules', JSON.stringify(rules));
```

Access via:
```javascript
const rulesJSON = GM_getValue('telemetryRules');
const rules = JSON.parse(rulesJSON);
```

---

## Additional Resources

- **CSS Selectors Reference**: [MDN CSS Selectors](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors)
- **Regex Testing**: [Regex101 (JavaScript flavor)](https://regex101.com/?flavor=javascript)
- **JSON Validation**: [JSONLint](https://jsonlint.com/)
- **XHRay GitHub**: [Repository](https://github.com/FinickySpider/XHRay)

---

## Contributing Rule Presets

Have a useful rule preset for a framework or platform? Contribute to XHRay:

1. Test your rules thoroughly
2. Document the framework/version
3. Submit a pull request with:
   - Rule preset JSON
   - Description of use case
   - Example screenshots (optional)

---

**Last Updated**: Sprint 3 (November 2025)  
**XHRay Version**: Check `package.json` for current version
