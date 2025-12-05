// Apply the light or dark theme styles to the panel and toggle button based on
// the value stored in GM storage.
export function applyTheme(panel, showBtn) {
  // Determine the preferred theme; defaults to dark when unset
  const dark = !!GM_getValue("darkTheme", true);
  if (panel) {
    panel.style.background = dark ? "rgba(0,0,0,0.8)" : "#fff";
    panel.style.color = dark ? "#0f0" : "#222";
  }
  if (showBtn) {
    showBtn.style.background = dark ? "#222" : "#fff";
    showBtn.style.color = dark ? "#0f0" : "#222";
    showBtn.style.border = dark ? "1px solid #0f0" : "1px solid #222";
  }
}