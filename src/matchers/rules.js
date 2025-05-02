export let rules = [];

const DEFAULT_RULES = [
  {
    name: 'Submit Button → Submit API',
    selector: '.submit-btn',
    urlPattern: '/api/submit',
    action: 'highlight'
  }
];

export function matchRulesForEvent(entry) {
  entry.rulesMatched = [];
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

export function resetRulesToDefault() {
  rules = DEFAULT_RULES;
}