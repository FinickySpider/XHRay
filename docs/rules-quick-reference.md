# XHRay Rules Quick Reference

## Basic Rule Template

```json
{
  "name": "Description of what this tracks",
  "selector": "CSS selector for DOM elements",
  "urlPattern": "URL pattern or regex"
}
```

---

## Common Selector Patterns

| Pattern | Selector | Example |
|---------|----------|---------|
| By ID | `#element-id` | `#submit-btn` |
| By Class | `.class-name` | `.save-button` |
| By Attribute | `[attr='value']` | `[data-action='submit']` |
| By Type | `button`, `form`, `input` | `button[type='submit']` |
| Descendant | `parent child` | `form button` |
| Direct Child | `parent > child` | `.modal > button` |
| Multiple Classes | `.class1.class2` | `.btn.btn-primary` |
| Any Match | `selector1, selector2` | `button, a.btn` |

---

## Common URL Patterns

| Pattern | urlPattern | Matches |
|---------|-----------|---------|
| Simple String | `/api/submit` | Any URL containing `/api/submit` |
| Exact Match | `^/api/submit$` | Only `/api/submit` |
| Multiple Paths | `/api/(login\|logout)` | `/api/login` or `/api/logout` |
| With Numbers | `/api/users/\\d+` | `/api/users/123` |
| Query Params | `/search\\?` | `/search?q=test` |
| Domain Match | `^https://api\\.example\\.com` | Only production domain |
| File Extension | `\\.(jpg\|png)$` | Image files |

---

## Copy-Paste Templates

### Basic Button → API
```json
{
  "name": "Button Name → API Endpoint",
  "selector": "button.your-class",
  "urlPattern": "/api/your-endpoint"
}
```

### Form Submission
```json
{
  "name": "Form Name Submission",
  "selector": "form#your-form",
  "urlPattern": "/api/submit"
}
```

### Search Input
```json
{
  "name": "Search Box → Search API",
  "selector": "input[type='search']",
  "urlPattern": "/api/search\\?"
}
```

### Delete Action
```json
{
  "name": "Delete Button → Delete API",
  "selector": "[data-action='delete']",
  "urlPattern": "/api/.*/delete$"
}
```

### Pagination
```json
{
  "name": "Page Navigation",
  "selector": ".pagination button",
  "urlPattern": "/api/items\\?page=\\d+"
}
```

---

## Framework Quick Start

### React (Material-UI)
```json
[
  {
    "name": "MUI Button Actions",
    "selector": "button.MuiButton-root",
    "urlPattern": "/api/"
  }
]
```

### Vue (Vuetify)
```json
[
  {
    "name": "Vuetify Button Actions",
    "selector": "button.v-btn",
    "urlPattern": "/api/"
  }
]
```

### Angular (Material)
```json
[
  {
    "name": "Mat-Button Actions",
    "selector": "button[mat-button]",
    "urlPattern": "/api/"
  }
]
```

### Bootstrap
```json
[
  {
    "name": "Bootstrap Primary Buttons",
    "selector": "button.btn-primary",
    "urlPattern": "/api/"
  }
]
```

---

## Regex Escape Cheat Sheet

| Character | Raw | In JSON |
|-----------|-----|---------|
| `.` (dot) | `\.` | `\\.` |
| `?` (question) | `\?` | `\\?` |
| `+` (plus) | `\+` | `\\+` |
| `*` (asterisk) | `\*` | `\\*` |
| `\d` (digit) | `\d` | `\\d` |
| `\w` (word) | `\w` | `\\w` |
| `\s` (space) | `\s` | `\\s` |

**Remember**: In JSON, always use double backslash `\\`

---

## Testing Your Rule

### 1. Test Selector (Browser Console)
```javascript
document.querySelector('your-selector')
// Should return the element you want to track
```

### 2. Test URL Pattern (Browser Console)
```javascript
new RegExp('your-pattern').test('https://example.com/api/test')
// Should return true for matching URLs
```

### 3. Save and Test
1. Paste rule into XHRay Rules Editor
2. Click "Save Rules"
3. Perform the action (click, submit, etc.)
4. Check telemetry log for rule badge

---

## Troubleshooting Checklist

- [ ] JSON is valid (no syntax errors)
- [ ] Selector exists on page (test in DevTools)
- [ ] URL pattern matches the request URL
- [ ] Rule is saved before testing
- [ ] Page has been interacted with (action performed)
- [ ] XHRay panel is visible
- [ ] Special regex characters are escaped

---

## Pro Tips

✅ **Start broad, then narrow down**  
✅ **Use descriptive rule names**  
✅ **Test selectors in DevTools first**  
✅ **Export rules regularly as backup**  
✅ **Use string matching when possible (faster than regex)**  
✅ **Keep rules under 50 for best performance**

---

For full documentation, see [rules-system.md](./rules-system.md)
