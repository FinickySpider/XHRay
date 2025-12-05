// Generate a RFC4122 version 4 UUID
export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Shorten long strings with an ellipsis
export function truncate(str = '', max = 50) {
  return str.length > max ? str.slice(0, max) + '…' : str;
}