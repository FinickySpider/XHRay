// Simple helper used in demos to display a placeholder settings panel
export function showSettingsPanel() {
  // Prevent multiple panels from being created
  if (document.querySelector("#xhray-panel")) return;

  const panel = document.createElement("div");
  panel.id = "xhray-panel";
  panel.innerHTML = "<h2>XHRay Settings Panel 🎛️</h2>";
  // Basic styling for the floating panel
  panel.style.cssText = "position:fixed;top:100px;right:50px;background:#1e1e1e;color:#fff;padding:15px;border-radius:8px;z-index:99999";
  // Add the panel to the document
  document.body.appendChild(panel);
}