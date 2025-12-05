// Generate a unique CSS selector for a DOM element
export function getCSSPath(el) {
  // Only elements can have a CSS path
  if (!(el instanceof Element)) return '';
  // Prefer an ID selector if available
  if (el.id) return `#${el.id}`;
  const parts = [];
  while (el && el.nodeType === Node.ELEMENT_NODE) {
    let selector = el.nodeName.toLowerCase();
    if (el.className) {
      // Include all class names to make the selector specific
      selector += '.' + Array.from(el.classList).join('.');
    }
    const parent = el.parentNode;
    if (parent) {
      // If there are multiple siblings of the same type add :nth-of-type index
      const siblings = Array.from(parent.children).filter(e => e.nodeName === el.nodeName);
      if (siblings.length > 1) {
        const idx = siblings.indexOf(el) + 1;
        selector += `:nth-of-type(${idx})`;
      }
    }
    // Build selector from leaf up to the root
    parts.unshift(selector);
    el = parent;
  }
  // Combine parts into a full CSS path
  return parts.join(' > ');
}