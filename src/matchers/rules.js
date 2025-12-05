// Array of user defined correlation rules. Each rule may define a CSS selector
// and/or URL pattern to link DOM events with network requests.
export let rules = [];

// Fallback rules that are used when no custom rules have been saved
const DEFAULT_RULES = [
  {
    name: 'Submit Button → Submit API',
    selector: '.submit-btn',
    urlPattern: '/api/submit',
    action: 'highlight'
  }
];

// Match a DOM event entry against all rules and populate `rulesMatched`
export function matchRulesForEvent(entry) {
  entry.rulesMatched = [];
  // Iterate over all rules looking for selector matches
  // Iterate over all rules looking for URL pattern matches
  rules.forEach(rule => {
    if (!rule.selector) return;
    let matched = false;
    if (entry.element instanceof Element) {
      try {
        if (entry.element.matches(rule.selector)) matched = true;
      } catch {}
    }
    if (!matched && entry.selector.includes(rule.selector)) {
      matched = true;
    }
    if (matched) {
      entry.rulesMatched.push(rule.name);
    }
  });
}

// Match a network request entry against all rules by URL pattern
export function matchRulesForRequest(entry) {
  entry.rulesMatched = entry.rulesMatched || [];
  rules.forEach(rule => {
    if (!rule.urlPattern) return;
    let matched = false;
    try {
      matched = new RegExp(rule.urlPattern).test(entry.url);
    } catch {
      matched = entry.url.includes(rule.urlPattern);
    }
    if (matched) {
      entry.rulesMatched.push(rule.name);
    }
  });
}

// Restore the hard-coded default rule set
export function resetRulesToDefault() {
  rules = DEFAULT_RULES;
}