// ===== GOOGLE APPS SCRIPT URL =====
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyyrD8pCxgQYiERsOsDFJ_XoBEbg6KYe1oM8Wj9IAzkq4yqzMSkfApgcc3aFeD0-Pxgww/exec";
const ADMIN_PWD = "qwer";

// ===== STAV APLIKÁCIE =====
let isAdmin = false;

// ===== ZBALITEĽNÉ SEKCIe =====
function toggleSection(id) {
  const section = document.getElementById("section-" + id);
  const arrow = document.getElementById("arrow-" + id);

  if (!section || !arrow) return;

  section.classList.toggle("hidden");
  arrow.classList.toggle("fa-chevron-down");
  arrow.classList.toggle("fa-chevron-up");
}

// ===== PRIHLÁSENIE / ODHLÁSENIE =====
function toggleAdminAuth() {
  const btn = document.getElementById("admin-toggle-btn");

  if (!isAdmin) {
    const pwd = prompt("Heslo:");
    if (pwd !== ADMIN_PWD) return;

    isAdmin = true;
    btn.innerText = "ODHLÁSIŤ";

    // zobraz editory
    document.querySelectorAll(".editor").forEach(e => {
      e.classList.remove("hidden");
    });
  } else {
    isAdmin = false;
    btn.innerText = "PRIHLÁSIŤ";

    // skry editory
    document.querySelectorAll(".editor").forEach(e => {
      e.classList.add("hidden");
    });
  }
}

// ===== HOME RESET =====
function smartReset() {
  location.reload();
}

// ===== TVRDÁ AKTUALIZÁCIA APLIKÁCIE =====
async function hardResetApp() {
  try {
    localStorage.clear();

    if ("caches" in window) {
      const keys = await caches.keys();
      for (const k of keys) {
        await caches.delete(k);
      }
    }
  } catch (e) {
    console.error("Chyba pri čistení cache:", e);
  }

  location.reload(true);
}

/* ======================================================
   POZNÁMKA:
   - Tento script rieši:
     • zbaliteľné sekcie
     • login / logout
     • reset aplikácie
   - Logika piesní, playlistov, dnes zoznamu
     sa bude dopĺňať / napájať ďalej
====================================================== */
