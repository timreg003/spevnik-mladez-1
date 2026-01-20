/* =====================================================
   KONŠTANTY
===================================================== */
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyyrD8pCxgQYiERsOsDFJ_XoBEbg6KYe1oM8Wj9IAzkq4yqzMSkfApgcc3aFeD0-Pxgww/exec';
const ADMIN_PWD = "qwer";
const FORMSPREE_URL = "https://formspree.io/f/mvzzkwlw";

const LS_DNES = "piesne_dnes";
const LS_PLAYLIST_INDEX = "playlist_index";
const LS_PLAYLIST_ORDER = "playlist_order";

/* =====================================================
   STAV
===================================================== */
let songs = [];
let filteredSongs = [];
let currentSong = null;
let currentModeList = [];
let currentListSource = "all";

let isAdmin = false;

let dnesSelectedIds = [];
let dnesTitle = "PIESNE NA DNES";

let playlistOrder = [];
let editingPlaylistName = null;
let playlistSelectedIds = [];

/* =====================================================
   TOAST
===================================================== */
let toastTimer = null;
function showToast(msg, ok = true) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.innerText = msg;
  t.style.display = "block";
  t.style.borderColor = ok ? "#00c853" : "#ff4444";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.style.display = "none", 1800);
}

/* =====================================================
   ADMIN
===================================================== */
function toggleAdminAuth() {
  if (!isAdmin) {
    const p = prompt("Heslo:");
    if (p !== ADMIN_PWD) return;
    isAdmin = true;
    document.getElementById("admin-toggle-text").innerText = "ODHLÁSIŤ";
    document.getElementById("dnes-editor-panel").style.display = "block";
    document.getElementById("admin-panel").style.display = "block";
    openDnesEditor(true);
  } else {
    isAdmin = false;
    editingPlaylistName = null;
    playlistSelectedIds = [];
    document.getElementById("admin-toggle-text").innerText = "PRIHLÁSIŤ";
    document.getElementById("dnes-editor-panel").style.display = "none";
    document.getElementById("admin-panel").style.display = "none";
    renderPlaylistsUI();
  }
}

/* =====================================================
   XML
===================================================== */
async function parseXML() {
  try {
    const r = await fetch(SCRIPT_URL);
    const xml = await r.text();
    localStorage.setItem("offline_spevnik", xml);
    processXML(xml);
  } catch {
    const saved = localStorage.getItem("offline_spevnik");
    if (saved) processXML(saved);
  }
}

function processXML(xmlText) {
  const dom = new DOMParser().parseFromString(xmlText, "application/xml");
  const nodes = [...dom.getElementsByTagName("song")];

  songs = nodes.map(s => {
    const raw = s.getElementsByTagName("author")[0]?.textContent || "";
    let displayId = raw;
    if (raw.toUpperCase().startsWith("M")) {
      displayId = "Mariánska " + raw.substring(1).replace(/^0+/, "");
    } else if (/^\d+$/.test(raw)) {
      displayId = raw.replace(/^0+/, "");
    }
    return {
      id: s.getElementsByTagName("ID")[0].textContent.trim(),
      title: s.getElementsByTagName("title")[0].textContent.trim(),
      displayId,
      origText: s.getElementsByTagName("songtext")[0]?.textContent || ""
    };
  });

  filteredSongs = [...songs];
  renderAllSongs();

  loadDnesCacheFirst();
  loadPlaylistsCacheFirst();
  loadDnesFromDrive();
  loadPlaylistsFromDrive();
}

/* =====================================================
   ZOZNAM PIESNÍ
===================================================== */
function renderAllSongs() {
  const box = document.getElementById("piesne-list");
  box.innerHTML = filteredSongs.map(s => `
    <div class="song-row" onclick="openSongById('${s.id}','all')">
      <div class="song-id">${s.displayId}.</div>
      <div class="song-title">${escapeHtml(s.title)}</div>
    </div>
  `).join("");
}

function filterSongs() {
  const t = document.getElementById("search").value.toLowerCase();
  filteredSongs = songs.filter(s =>
    s.title.toLowerCase().includes(t) ||
    s.displayId.toLowerCase().includes(t)
  );
  renderAllSongs();
}

/* =====================================================
   DNES
===================================================== */
function parseDnes(raw) {
  if (!raw) return { title: "PIESNE NA DNES", ids: [] };
  try {
    const o = JSON.parse(raw);
    if (Array.isArray(o.ids)) return { title: o.title || "PIESNE NA DNES", ids: o.ids };
  } catch {}
  return { title: "PIESNE NA DNES", ids: raw.split(",").filter(Boolean) };
}

function loadDnesCacheFirst() {
  const box = document.getElementById("dnes-section");
  const p = parseDnes(localStorage.getItem(LS_DNES));
  dnesTitle = p.title;
  document.getElementById("dnes-title").innerText = dnesTitle;

  if (!p.ids.length) {
    box.innerHTML = `<div class="dnes-empty">Zoznam piesní na konkrétny deň je momentálne prázdny.</div>`;
    return;
  }

  box.innerHTML = p.ids.map(id => {
    const s = songs.find(x => x.id === id);
    return s ? `
      <div class="song-row" onclick="openSongById('${s.id}','dnes')">
        <div class="song-id">${s.displayId}.</div>
        <div class="song-title">${escapeHtml(s.title)}</div>
      </div>` : "";
  }).join("");
}

async function loadDnesFromDrive() {
  try {
    const r = await fetch(`${SCRIPT_URL}?action=get&name=PiesneNaDnes`);
    const t = await r.text();
    localStorage.setItem(LS_DNES, t);
  } catch {}
  loadDnesCacheFirst();
}

function clearDnesSelection() {
  dnesSelectedIds = [];
  dnesTitle = "PIESNE NA DNES";
  localStorage.setItem(LS_DNES, JSON.stringify({ title: dnesTitle, ids: [] }));
  loadDnesCacheFirst();
  showToast("Vymazané");
}

/* =====================================================
   PLAYLISTY – OPRAVENÉ
===================================================== */
function loadPlaylistsCacheFirst() {
  try {
    playlistOrder = JSON.parse(localStorage.getItem(LS_PLAYLIST_ORDER) || "[]");
  } catch {
    playlistOrder = [];
  }
  renderPlaylistsUI();
}

async function loadPlaylistsFromDrive() {
  let list = [];
  try {
    const r = await fetch(`${SCRIPT_URL}?action=list`);
    list = await r.json();
  } catch {}
  playlistOrder = list
    .map(p => p.name)
    .filter(n => n !== "PiesneNaDnes" && n !== "PlaylistOrder");

  localStorage.setItem(LS_PLAYLIST_ORDER, JSON.stringify(playlistOrder));
  renderPlaylistsUI();
}

function renderPlaylistsUI() {
  const box = document.getElementById("playlists-section");

  if (!playlistOrder.length) {
    box.innerHTML = `<div class="dnes-empty">Žiadne playlisty.</div>`;
    return;
  }

  box.innerHTML = playlistOrder.map((name, idx) => `
    <div class="draggable-item"
         draggable="${isAdmin}"
         data-idx="${idx}"
         ondragstart="onPlaylistDragStart(event)"
         ondragover="onPlaylistDragOver(event)"
         ondrop="onPlaylistDrop(event)">
      <div onclick="openPlaylist('${encodeURIComponent(name)}')">
        <i class="fas fa-music"></i> ${escapeHtml(name)}
      </div>
      ${isAdmin ? `
        <button onclick="editPlaylist('${encodeURIComponent(name)}')">✏️</button>
        <button onclick="deletePlaylist('${encodeURIComponent(name)}')">❌</button>
      ` : ``}
    </div>
  `).join("");
}

function openPlaylist(enc) {
  const name = decodeURIComponent(enc);
  const raw = localStorage.getItem("playlist_" + name) || "";
  const ids = raw.split(",").filter(Boolean);

  const box = document.getElementById("playlists-section");
  box.innerHTML = `
    <div class="playlist-title">${escapeHtml(name)}</div>
    ${ids.map(id => {
      const s = songs.find(x => x.id === id);
      return s ? `
        <div class="song-row" onclick="openSongById('${s.id}','playlist')">
          <div class="song-id">${s.displayId}.</div>
          <div class="song-title">${escapeHtml(s.title)}</div>
        </div>` : "";
    }).join("")}
  `;
}

/* =====================================================
   DRAG PORADIE PLAYLISTOV
===================================================== */
function onPlaylistDragStart(e) {
  e.dataTransfer.setData("idx", e.currentTarget.dataset.idx);
}
function onPlaylistDragOver(e) {
  e.preventDefault();
}
function onPlaylistDrop(e) {
  e.preventDefault();
  const from = +e.dataTransfer.getData("idx");
  const to = +e.currentTarget.dataset.idx;
  const item = playlistOrder.splice(from, 1)[0];
  playlistOrder.splice(to, 0, item);
  localStorage.setItem(LS_PLAYLIST_ORDER, JSON.stringify(playlistOrder));
  renderPlaylistsUI();
}

/* =====================================================
   HELPERS
===================================================== */
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  }[m]));
}

/* =====================================================
   START
===================================================== */
document.addEventListener("DOMContentLoaded", () => {
  parseXML();
});
