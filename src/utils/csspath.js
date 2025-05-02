export function getCSSPath(el) {
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