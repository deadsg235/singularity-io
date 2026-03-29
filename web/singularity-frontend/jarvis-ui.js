/**
 * jarvis-ui.js — Shared UI primitives v3.0
 * Toast · Nav · Modals · Sidebar
 */

// ── Toast ────────────────────────────────────────────────────
const Toast = (() => {
  const icons = { success: "✓", error: "✕", info: "ℹ", warn: "⚠" };
  const colors = {
    success: "var(--red)",
    error:   "#ff4444",
    info:    "#60a5fa",
    warn:    "#f59e0b",
  };

  function show(msg, type = "info", ms = 3500) {
    const c = document.getElementById("toast-container");
    if (!c) return;
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.innerHTML = `<span style="color:${colors[type]}">${icons[type]}</span> ${msg}`;
    c.appendChild(el);
    setTimeout(() => {
      el.style.cssText += "opacity:0;transform:translateX(16px);transition:all .22s ease";
      setTimeout(() => el.remove(), 240);
    }, ms);
  }

  return {
    success: m => show(m, "success"),
    error:   m => show(m, "error"),
    info:    m => show(m, "info"),
    warn:    m => show(m, "warn"),
  };
})();
window.Toast = Toast;

// ── Nav / Sidebar ────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  // Mobile nav toggle
  const toggle  = document.getElementById("nav-toggle");
  const navLinks = document.getElementById("nav-links");
  toggle?.addEventListener("click", () => navLinks?.classList.toggle("open"));

  // Active link highlight
  const page = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-links a").forEach(a => {
    if (a.getAttribute("href") === page) a.classList.add("active");
  });

  // Sidebar
  const sidebar  = document.getElementById("sidebar");
  const overlay  = document.getElementById("sidebar-overlay");
  const menuBtn  = document.getElementById("menu-btn");
  const closeBtn = document.getElementById("close-sidebar");

  function openSidebar()  { sidebar?.classList.add("open"); overlay?.classList.add("active"); }
  function closeSidebar() { sidebar?.classList.remove("open"); overlay?.classList.remove("active"); }

  menuBtn?.addEventListener("click", openSidebar);
  closeBtn?.addEventListener("click", closeSidebar);
  overlay?.addEventListener("click", closeSidebar);

  // ULTIMA modal
  const modal      = document.getElementById("ultima-modal");
  const launchBtn  = document.getElementById("launch-ultima");
  const closeModal = document.getElementById("close-ultima");
  const sidebarBtn = document.getElementById("ultima-sidebar-btn");

  const openUltima  = () => modal?.classList.remove("hidden");
  const closeUltima = () => modal?.classList.add("hidden");

  launchBtn?.addEventListener("click", openUltima);
  sidebarBtn?.addEventListener("click", () => { closeSidebar(); openUltima(); });
  closeModal?.addEventListener("click", closeUltima);
  modal?.addEventListener("click", e => { if (e.target === modal) closeUltima(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeUltima(); });
});
