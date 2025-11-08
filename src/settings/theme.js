export function applyTheme(panel, showBtn) {
  const dark = !!GM_getValue("darkTheme", true);
  if (panel) {
    panel.style.background = dark ? "rgba(0,0,0,0.8)" : "rgba(255,255,255,0.95)";
    // Don't set color on panel itself - let entries set their own colors
  }
  if (showBtn) {
    showBtn.style.background = dark ? "#222" : "#fff";
    showBtn.style.color = dark ? "#0f0" : "#222";
    showBtn.style.border = dark ? "1px solid #0f0" : "1px solid #222";
  }
}