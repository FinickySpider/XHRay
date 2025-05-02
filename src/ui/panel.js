export function showSettingsPanel() {
  if (document.querySelector("#xhray-panel")) return;

  const panel = document.createElement("div");
  panel.id = "xhray-panel";
  panel.innerHTML = "<h2>XHRay Settings Panel 🎛️</h2>";
  panel.style.cssText = "position:fixed;top:100px;right:50px;background:#1e1e1e;color:#fff;padding:15px;border-radius:8px;z-index:99999";
  document.body.appendChild(panel);
}