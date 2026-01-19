const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyyrD8pCxgQYiERsOsDFJ_XoBEbg6KYe1oM8Wj9IAzkq4yqzMSkfApgcc3aFeD0-Pxgww/exec";
const ADMIN_PWD = "qwer";

let isAdmin = false;

function toggleSection(id) {
  const section = document.getElementById("section-" + id);
  const arrow = document.getElementById("arrow-" + id);
  if (!section || !arrow) return;

  section.classList.toggle("hidden");
  arrow.classList.toggle("fa-chevron-down");
  arrow.classList.toggle("fa-chevron-up");
}

function closeSection(id) {
  const section = document.getElementById("section-" + id);
  const arrow = document.getElementById("arrow-" + id);
  if (!section || !arrow) return;

  if (!section.classList.contains("hidden")) section.classList.add("hidden");
  arrow.classList.add("fa-chevron-down");
  arrow.classList.remove("fa-chevron-up");
}

function setEditorsVisible(visible) {
  document.querySelectorAll(".editor").forEach(el => {
    if (visible) el.classList.remove("hidden");
    else el.classList.add("hidden");
  });
}

// PRIHLÁSENIE / ODHLÁSENIE
function toggleAdminAuth() {
  const btn = document.getElementById("admin-toggle-btn");

  if (!isAdmin) {
    const pwd = prompt("Heslo:");
    if (pwd !== ADMIN_PWD) return;

    isAdmin = true;
    btn.querySelector("span").innerText = "ODHLÁSIŤ";
    setEditorsVisible(true);
  } else {
    // ODHLÁSENIE
    isAdmin = false;
    btn.querySelector("span").innerText = "PRIHLÁSIŤ";

    // AUTO ZATVORENIE (schovanie) editorov
    setEditorsVisible(false);

    // Voliteľné: zavri update sekciu, aby po logout neostávalo rozbalené tlačidlo
    closeSection("update");
  }
}

function smartReset() {
  location.reload();
}

// TVRDÁ AKTUALIZÁCIA (fix PWA / service worker miešania)
async function hardResetApp() {
  try {
    localStorage.clear();

    // zmaž všetky cache storage
    if ("caches" in window) {
      const keys = await caches.keys();
      for (const k of keys) {
        await caches.delete(k);
      }
    }

    // odregistruj všetky service workery (toto je kľúčové)
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const reg of regs) {
        await reg.unregister();
      }
    }
  } catch (e) {
    console.error("Chyba pri aktualizácii:", e);
  }

  // cache-bust reload aby sa natiahli nové súbory a nerozsypal layout
  const base = window.location.href.split("#")[0].split("?")[0];
  window.location.replace(base + "?v=" + Date.now());
}
