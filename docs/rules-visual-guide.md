# XHRay Rules System - Visual Guide

## 🎨 Understanding Rules Through Diagrams

---

## Basic Rule Structure

```
┌─────────────────────────────────────────────┐
│            XHRay Rule Object                │
├─────────────────────────────────────────────┤
│                                             │
│  {                                          │
│    "name": "Display Name" ←───────────┐    │
│    "selector": "CSS Selector" ←──────┐│    │
│    "urlPattern": "URL Pattern" ←────┐││    │
│  }                                   │││    │
│                                      │││    │
└──────────────────────────────────────┼┼┼────┘
                                       │││
                ┌──────────────────────┘││
                │   Shows in UI         ││
                │   when rule matches   ││
                │                       ││
                └───────────────────────┼┘
                    Matches DOM         │
                    elements            │
                                        │
                                        └────────────────
                                            Matches URLs


```

---

## How Rules Match Events

```
User Action (e.g., Button Click)
         │
         ▼
    ┌────────────────────┐
    │   DOM Event        │
    │   Captured         │
    └────────┬───────────┘
             │
             ▼
    ┌─────────────────────────────────────┐
    │  For each rule:                     │
    │                                     │
    │  1. Test element.matches(selector)  │
    │     ├─ Match? → Add rule badge      │
    │     └─ No match? → Try next         │
    │                                     │
    │  2. Test selector in CSS path       │
    │     ├─ Match? → Add rule badge      │
    │     └─ No match? → Continue         │
    └─────────────────────────────────────┘
             │
             ▼
    ┌────────────────────┐
    │   Event logged     │
    │   with rule        │
    │   badges           │
    └────────────────────┘
```

---

## How Rules Match Requests

```
Network Request Made
         │
         ▼
    ┌────────────────────┐
    │   Request          │
    │   Intercepted      │
    └────────┬───────────┘
             │
             ▼
    ┌────────────────────────────────────────┐
    │  For each rule:                        │
    │                                        │
    │  1. Try: new RegExp(pattern).test(url)│
    │     ├─ Match? → Add rule badge         │
    │     └─ Invalid regex? → Try fallback   │
    │                                        │
    │  2. Fallback: url.includes(pattern)    │
    │     ├─ Match? → Add rule badge         │
    │     └─ No match? → Continue            │
    └────────────────────────────────────────┘
             │
             ▼
    ┌────────────────────┐
    │   Request logged   │
    │   with rule        │
    │   badges           │
    └────────────────────┘
```

---

## Bi-Directional Correlation

```
    USER CLICKS BUTTON                    API REQUEST MADE
           │                                     │
           ▼                                     ▼
    ┌──────────────┐                     ┌──────────────┐
    │ DOM Event    │                     │ HTTP Request │
    │ Captured     │                     │ Intercepted  │
    └──────┬───────┘                     └──────┬───────┘
           │                                     │
           ▼                                     ▼
    ┌──────────────────┐               ┌────────────────────┐
    │ Match against    │               │ Match against      │
    │ rule.selector    │               │ rule.urlPattern    │
    └──────┬───────────┘               └────────┬───────────┘
           │                                     │
           │    ┌─────────────────┐             │
           └───►│  SAME RULE?     │◄────────────┘
                │                 │
                │  "Submit Btn    │
                │   → Submit API" │
                └────────┬────────┘
                         │
                         ▼
                ┌─────────────────────┐
                │  CORRELATION!       │
                │                     │
                │  - Both entries     │
                │    show rule badge  │
                │  - Visual grouping  │
                │  - Easy tracing     │
                └─────────────────────┘
```

---

## Rule Matching Flow (Detailed)

```
                          ┌─────────────────┐
                          │  Rule Defined   │
                          │                 │
                          │  selector: X    │
                          │  urlPattern: Y  │
                          └────────┬────────┘
                                   │
                 ┌─────────────────┴─────────────────┐
                 │                                   │
                 ▼                                   ▼
        ┌────────────────┐                  ┌────────────────┐
        │  DOM Event     │                  │ HTTP Request   │
        │  Occurs        │                  │ Made           │
        └────────┬───────┘                  └────────┬───────┘
                 │                                   │
                 ▼                                   ▼
        ┌─────────────────┐                ┌──────────────────┐
        │ Try: element    │                │ Try: Regex       │
        │ .matches(X)     │                │ Match Y vs URL   │
        └────────┬────────┘                └────────┬─────────┘
                 │                                   │
         ┌───────┴────────┐                  ┌──────┴──────────┐
         │                │                  │                 │
         ▼                ▼                  ▼                 ▼
    ┌────────┐      ┌─────────┐       ┌────────┐       ┌──────────┐
    │ Match  │      │ No      │       │ Match  │       │ Regex    │
    │        │      │ Match   │       │        │       │ Error    │
    └───┬────┘      └────┬────┘       └───┬────┘       └────┬─────┘
        │                │                 │                 │
        │                ▼                 │                 ▼
        │         ┌────────────┐           │         ┌─────────────┐
        │         │ Try: CSS   │           │         │ Fallback:   │
        │         │ path       │           │         │ String      │
        │         │ includes X │           │         │ includes Y  │
        │         └─────┬──────┘           │         └──────┬──────┘
        │               │                  │                │
        │       ┌───────┴────────┐         │        ┌───────┴──────┐
        │       │                │         │        │              │
        │       ▼                ▼         │        ▼              ▼
        │  ┌────────┐      ┌────────┐     │   ┌────────┐    ┌────────┐
        │  │ Match  │      │ No     │     │   │ Match  │    │ No     │
        │  │        │      │ Match  │     │   │        │    │ Match  │
        │  └───┬────┘      └───┬────┘     │   └───┬────┘    └───┬────┘
        │      │               │          │       │             │
        └──────┴───────────────┴──────────┴───────┴─────────────┘
                               │
                               ▼
                    ┌────────────────────┐
                    │  Add Rule Badge    │
                    │  to Log Entry      │
                    └────────────────────┘
```

---

## Example: Button Click → API Call

```
Step 1: User clicks button
┌──────────────────────────────────┐
│  <button class="submit-btn">     │
│    Submit Form                   │  ← User clicks here
│  </button>                       │
└──────────────────────────────────┘

Step 2: XHRay captures event
┌──────────────────────────────────┐
│  Event {                         │
│    type: "click",                │
│    element: <button>,            │
│    selector: "button.submit-btn",│
│    timestamp: 12345.67           │
│  }                               │
└──────────────────────────────────┘

Step 3: Check rules
┌──────────────────────────────────────┐
│  Rule: "Submit Button → Submit API"  │
│  {                                   │
│    selector: ".submit-btn" ✓ MATCH   │
│    urlPattern: "/api/submit"         │
│  }                                   │
└──────────────────────────────────────┘

Step 4: Log event with rule badge
┌─────────────────────────────────────────┐
│  🎯 Submit Button → Submit API          │
│  ──────────────────────────────────────│
│  Type: click                           │
│  Element: button.submit-btn            │
│  Time: 12345.67ms                      │
└─────────────────────────────────────────┘

Step 5: API call triggered
┌──────────────────────────────────┐
│  POST /api/submit                │
│  {                               │
│    "data": "form values"         │
│  }                               │
└──────────────────────────────────┘

Step 6: XHRay intercepts request
┌──────────────────────────────────┐
│  Request {                       │
│    method: "POST",               │
│    url: "/api/submit",           │
│    status: 200,                  │
│    timestamp: 12346.20           │
│  }                               │
└──────────────────────────────────┘

Step 7: Check rules again
┌──────────────────────────────────────┐
│  Rule: "Submit Button → Submit API"  │
│  {                                   │
│    selector: ".submit-btn"           │
│    urlPattern: "/api/submit" ✓ MATCH │
│  }                                   │
└──────────────────────────────────────┘

Step 8: Log request with SAME rule badge
┌─────────────────────────────────────────┐
│  🎯 Submit Button → Submit API          │
│  ──────────────────────────────────────│
│  Method: POST                          │
│  URL: /api/submit                      │
│  Status: 200 OK                        │
│  Duration: 0.53ms                      │
└─────────────────────────────────────────┘

Step 9: Correlation visible in UI
┌─────────────────────────────────────────┐
│  XHRay Telemetry Panel                  │
├─────────────────────────────────────────┤
│                                         │
│  🎯 Submit Button → Submit API          │ ◄── Event
│  ───────────────────────────────────── │
│  Type: click                           │
│  Element: button.submit-btn            │
│  Time: 12345.67ms                      │
│                                         │
│  🎯 Submit Button → Submit API          │ ◄── Request
│  ───────────────────────────────────── │
│  Method: POST                          │
│  URL: /api/submit                      │
│  Status: 200 OK                        │
│  Duration: 0.53ms                      │
│                                         │
└─────────────────────────────────────────┘
     ▲                           ▲
     │                           │
     └───── CORRELATED! ─────────┘
```

---

## Selector Matching Hierarchy

```
    User provides selector: ".submit-btn"
                │
                ▼
    ┌────────────────────────────┐
    │  Try Direct Match          │
    │  element.matches()         │
    └────────┬───────────────────┘
             │
      ┌──────┴──────┐
      │             │
      ▼             ▼
   ┌──────┐    ┌─────────┐
   │ YES  │    │   NO    │
   └──┬───┘    └────┬────┘
      │             │
      │             ▼
      │    ┌──────────────────┐
      │    │ Try Fallback     │
      │    │ Generated CSS    │
      │    │ path includes    │
      │    │ selector string  │
      │    └────────┬─────────┘
      │             │
      │      ┌──────┴──────┐
      │      │             │
      │      ▼             ▼
      │   ┌──────┐    ┌─────────┐
      │   │ YES  │    │   NO    │
      │   └──┬───┘    └────┬────┘
      │      │             │
      └──────┴─────────────┘
             │
             ▼
    ┌────────────────┐
    │  Rule Matched  │
    │  Add Badge     │
    └────────────────┘
```

---

## URL Pattern Matching Hierarchy

```
    User provides urlPattern: "/api/users/\\d+"
                │
                ▼
    ┌────────────────────────────┐
    │  Try Regex Match           │
    │  new RegExp(pattern).test()│
    └────────┬───────────────────┘
             │
      ┌──────┴──────┐
      │             │
      ▼             ▼
   ┌──────┐    ┌──────────┐
   │ VALID│    │  INVALID │
   │ REGEX│    │  REGEX   │
   └──┬───┘    └────┬─────┘
      │             │
      ▼             ▼
   ┌──────────┐  ┌────────────────┐
   │ Test URL │  │ Fallback:      │
   └────┬─────┘  │ String Match   │
        │        │ url.includes() │
        │        └────────┬───────┘
        │                 │
  ┌─────┴─────┐    ┌──────┴──────┐
  │           │    │             │
  ▼           ▼    ▼             ▼
┌──────┐  ┌──────┐ ┌──────┐  ┌─────────┐
│ MATCH│  │ NO   │ │ MATCH│  │   NO    │
│      │  │MATCH │ │      │  │  MATCH  │
└──┬───┘  └──┬───┘ └──┬───┘  └────┬────┘
   │         │        │           │
   └─────────┴────────┴───────────┘
             │
             ▼
    ┌────────────────┐
    │  Rule Matched  │
    │  Add Badge     │
    └────────────────┘
```

---

## Complete Rule Lifecycle

```
┌──────────────────────────────────────────────────────────┐
│                  INITIALIZATION                          │
└───────────────────────┬──────────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────┐
        │ GM_getValue('rules')      │
        │ Load from storage         │
        └────────────┬──────────────┘
                     │
          ┌──────────┴──────────┐
          │                     │
          ▼                     ▼
    ┌──────────┐         ┌───────────┐
    │  Found   │         │ Not Found │
    │  Rules   │         │           │
    └────┬─────┘         └─────┬─────┘
         │                     │
         │                     ▼
         │              ┌──────────────┐
         │              │ Load Default │
         │              │ Rules        │
         │              └──────┬───────┘
         │                     │
         └──────────┬──────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────────┐
│                   RUNTIME MATCHING                       │
└───────────────────────┬──────────────────────────────────┘
                        │
        ┌───────────────┴────────────────┐
        │                                │
        ▼                                ▼
┌────────────────┐              ┌────────────────┐
│  DOM Events    │              │  HTTP Requests │
│  Captured      │              │  Intercepted   │
└────────┬───────┘              └────────┬───────┘
         │                               │
         ▼                               ▼
┌──────────────────┐          ┌────────────────────┐
│ Match against    │          │ Match against      │
│ rule.selector    │          │ rule.urlPattern    │
└────────┬─────────┘          └────────┬───────────┘
         │                             │
         ▼                             ▼
┌──────────────────┐          ┌────────────────────┐
│ Add matched      │          │ Add matched        │
│ rules to entry   │          │ rules to entry     │
└────────┬─────────┘          └────────┬───────────┘
         │                             │
         └──────────────┬──────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────┐
│                   UI RENDERING                           │
└───────────────────────┬──────────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────┐
        │ Display entries with      │
        │ rule badges in panel      │
        └───────────────────────────┘
```

---

## Rule Editor Workflow

```
┌────────────────────────────────────────────────────────┐
│  XHRay Panel → Click "Rules Editor"                    │
└────────────────┬───────────────────────────────────────┘
                 │
                 ▼
        ┌────────────────┐
        │ View current   │
        │ rules (JSON)   │
        └────────┬───────┘
                 │
                 ▼
        ┌────────────────┐
        │ Edit JSON in   │
        │ text area      │
        └────────┬───────┘
                 │
                 ▼
        ┌────────────────┐
        │ Click "Save"   │
        └────────┬───────┘
                 │
      ┌──────────┴──────────┐
      │                     │
      ▼                     ▼
┌──────────┐          ┌───────────┐
│  Valid   │          │  Invalid  │
│  JSON    │          │  JSON     │
└────┬─────┘          └─────┬─────┘
     │                      │
     ▼                      ▼
┌──────────────┐     ┌──────────────┐
│ GM_setValue  │     │ Show error   │
│ Save to      │     │ message      │
│ storage      │     └──────────────┘
└────┬─────────┘
     │
     ▼
┌──────────────┐
│ Update rules │
│ array        │
└────┬─────────┘
     │
     ▼
┌──────────────┐
│ Re-render    │
│ logs with    │
│ new rules    │
└──────────────┘
```

---

## Preset Import Workflow

```
┌─────────────────────────────────────────┐
│  Open rule-presets.json                 │
└──────────────┬──────────────────────────┘
               │
               ▼
       ┌───────────────┐
       │ Find preset   │
       │ (e.g., "mui") │
       └───────┬───────┘
               │
               ▼
       ┌───────────────────┐
       │ Copy rules array  │
       │ from preset       │
       └───────┬───────────┘
               │
               ▼
       ┌──────────────────────┐
       │ Open XHRay Rules     │
       │ Editor               │
       └───────┬──────────────┘
               │
               ▼
       ┌──────────────────────┐
       │ Paste rules array    │
       │ (replace or append)  │
       └───────┬──────────────┘
               │
               ▼
       ┌──────────────────────┐
       │ Click "Save Rules"   │
       └───────┬──────────────┘
               │
               ▼
       ┌──────────────────────┐
       │ Rules active         │
       │ immediately!         │
       └──────────────────────┘
```

---

## Troubleshooting Decision Tree

```
                    Rule not working?
                           │
         ┌─────────────────┴─────────────────┐
         │                                   │
         ▼                                   ▼
    No event logs?                      No request logs?
         │                                   │
         ▼                                   ▼
    Check selector                     Check URL pattern
         │                                   │
    ┌────┴────┐                        ┌────┴────┐
    │         │                        │         │
    ▼         ▼                        ▼         ▼
Valid?    Invalid?                Valid?    Invalid?
    │         │                        │         │
    ▼         ▼                        ▼         ▼
Element   Fix CSS                  URL       Fix regex
exists?   selector                 correct?  pattern
    │                                  │
    ▼                                  ▼
Correct   Test in DevTools        Test regex
event     with querySelector      with RegExp
type?                              .test()
```

---

**Visual Guide Complete!**

For detailed explanations, see:
- [Rules System Documentation](rules-system.md)
- [Real-World Examples](rules-examples.md)
- [Rules Quick Reference](rules-quick-reference.md)
