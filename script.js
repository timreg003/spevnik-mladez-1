const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyyrD8pCxgQYiERsOsDFJ_XoBEbg6KYe1oM8Wj9IAzkq4yqzMSkfApgcc3aFeD0-Pxgww/exec';
const ADMIN_PWD = "qwer";
const FORMSPREE_URL = "https://formspree.io/f/mvzzkwlw";

let songs = [], filteredSongs = [], currentSong = null;
let currentModeList = [];
let currentListSource = 'all';
let currentPlaylistName = "";

let transposeStep = 0, fontSize = 17, chordsVisible = true;
const scale = ["C","C#","D","D#","E","F","F#","G","G#","A","B","H"];

let autoscrollInterval = null, currentLevel = 1;
let isAdmin = false;

let dnesSelectedIds = [];
let selectedSongIds = [];
let playlistOrder = [];

/* ✅ TOAST */
let toastTimer = null;
function showToast(message, ok=true){
  const t = document.getElementById("toast");
  if (!t) return;

  t.style.display = "block";
  t.innerText = message;
  t.style.borderColor = ok ? "#00c853" : "#ff4444";

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    t.style.display = "none";
  }, 1800);
}

window.addEventListener('scroll', () => {
  const btn = document.getElementById("scroll-to-top");
  if (!btn) return;
  btn.style.display = (window.scrollY > 300) ? "flex" : "none";
}, { passive: true });

function toggleSection(section, expand = null) {
  const content = document.getElementById(section + '-section-wrapper');
  const chevron = document.getElementById(section + '-chevron');
  if (!content || !chevron) return;

  const show = expand !== null ? expand : (content.style.display === 'none');
  content.style.display = show ? 'block' : 'none';
  chevron.className = show ? 'fas fa-chevron-up section-chevron' : 'fas fa-chevron-down section-chevron';
}

function smartReset() {
  stopAutoscroll();
  closeSong();
  logoutAdmin();

  document.getElementById('search').value = "";
  currentModeList = [...songs];
  filterSongs();

  loadDnesFromDrive();
  loadPlaylistsFromDrive();

  toggleSection('dnes', false);
  toggleSection('playlists', false);
  toggleSection('all', false);
  toggleSection('update', false);

  window.scrollTo(0, 0);
}

function toggleAdminAuth() {
  if (!isAdmin) {
    const pwd = prompt("Heslo:");
    if (pwd !== ADMIN_PWD) return;

    isAdmin = true;
    document.getElementById('admin-toggle-text').innerText = "ODHLÁSIŤ";

    document.getElementById('dnes-editor-panel').style.display = 'block';
    document.getElementById('admin-panel').style.display = 'block';

    openDnesEditor(true);
    openPlaylistEditorNew(true);

    renderAllSongs();
    renderPlaylistsUI();
  } else {
    logoutAdmin();
  }
}

function logoutAdmin() {
  isAdmin = false;
  document.getElementById('admin-toggle-text').innerText = "PRIHLÁSIŤ";
  document.getElementById('dnes-editor-panel').style.display = 'none';
  document.getElementById('admin-panel').style.display = 'none';
  selectedSongIds = [];
  renderAllSongs();
  renderPlaylistsUI();
}

async function parseXML() {
  try {
    const res = await fetch(SCRIPT_URL);
    const xmlText = await res.text();
    localStorage.setItem('offline_spevnik', xmlText);
    processXML(xmlText);
  } catch (e) {
    const saved = localStorage.getItem('offline_spevnik');
    if (saved) processXML(saved);
  }
}

function processXML(xmlText) {
  const xml = new DOMParser().parseFromString(xmlText, 'application/xml');
  const nodes = xml.getElementsByTagName('song');

  songs = [...nodes].map(s => {
    const text = s.getElementsByTagName('songtext')[0]?.textContent.trim() || "";
    const rawId = s.getElementsByTagName('author')[0]?.textContent.trim() || "";
    let displayId = rawId;

    if (rawId.toUpperCase().startsWith('M')) displayId = "Mariánska " + rawId.substring(1).replace(/^0+/, '');
    else if (/^\d+$/.test(rawId)) displayId = rawId.replace(/^0+/, '');

    return {
      id: s.getElementsByTagName('ID')[0]?.textContent.trim(),
      title: s.getElementsByTagName('title')[0]?.textContent.trim(),
      originalId: rawId,
      displayId,
      origText: text
    };
  });

  songs.sort((a, b) => {
    const idA = a.originalId.toUpperCase(), idB = b.originalId.toUpperCase();
    const isNumA = /^\d+$/.test(idA), isNumB = /^\d+$/.test(idB);
    const isMarA = idA.startsWith('M'), isMarB = idB.startsWith('M');

    if (isNumA && !isNumB) return -1;
    if (!isNumA && isNumB) return 1;
    if (isNumA && isNumB) return parseInt(idA) - parseInt(idB);
    if (isMarA && !isMarB) return -1;
    if (!isMarA && isMarB) return 1;
    if (isMarA && isMarB) return (parseInt(idA.substring(1)) || 0) - (parseInt(idB.substring(1)) || 0);
    return a.title.localeCompare(b.title, 'sk');
  });

  filteredSongs = [...songs];
  currentModeList = [...songs];

  renderAllSongs();
  loadDnesFromDrive();
  loadPlaylistsFromDrive();
}

function renderAllSongs() {
  const box = document.getElementById('piesne-list');
  if (!box) return;

  box.innerHTML = filteredSongs.map(s => `
    <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; border-bottom:1px solid #333; color:#fff;" onclick="openSongById('${s.id}','all')">
      <span><span style="color:#00bfff;font-weight:bold;">${s.displayId}.</span> ${s.title}</span>
    </div>
  `).join('');
}

function filterSongs() {
  const t = document.getElementById('search').value.toLowerCase();
  filteredSongs = songs.filter(s => s.title.toLowerCase().includes(t) || s.displayId.toLowerCase().includes(t));
  renderAllSongs();
}

/* --- zvyšok tvojho scriptu ostáva rovnaký (openSong, dnes, playlisty, drag...) --- */
/* ✅ Dôležité: upravil som iba saveDnesEditor() a savePlaylist() aby ukázali toast */

function parseDnesPayload(raw) {
  const trimmed = (raw || "").trim();
  if (!trimmed) return { title: "PIESNE NA DNES", ids: [] };

  try {
    const obj = JSON.parse(trimmed);
    if (obj && Array.isArray(obj.ids)) {
      return { title: (obj.title || "PIESNE NA DNES"), ids: obj.ids.map(String) };
    }
  } catch(e) {}

  const ids = trimmed.split(',').map(x => x.trim()).filter(Boolean);
  return { title: "PIESNE NA DNES", ids };
}

function setDnesTitle(title) {
  const t = (title || "PIESNE NA DNES").toUpperCase();
  document.getElementById('dnes-title').innerText = t;
}

function getDnesIds() {
  const raw = localStorage.getItem('piesne_dnes') || "";
  return parseDnesPayload(raw).ids;
}

async function loadDnesFromDrive() {
  document.getElementById('dnes-section').innerHTML = '<div class="dnes-empty">Načítavam...</div>';

  try {
    const r = await fetch(`${SCRIPT_URL}?action=get&name=PiesneNaDnes&t=${Date.now()}`);
    const t = await r.text();
    if (t != null) localStorage.setItem('piesne_dnes', t.trim());
  } catch(e) {}

  const payload = parseDnesPayload(localStorage.getItem('piesne_dnes') || "");
  setDnesTitle(payload.title);
  renderDnesSection();

  if (isAdmin) openDnesEditor(true);
}

function renderDnesSection() {
  const box = document.getElementById('dnes-section');
  const payload = parseDnesPayload(localStorage.getItem('piesne_dnes') || "");
  const ids = payload.ids;

  if (!ids.length) {
    box.innerHTML = '<div class="dnes-empty">Žiadne piesne.</div>';
    return;
  }

  box.innerHTML = ids.map(id => {
    const s = songs.find(x => x.id === id);
    if (!s) return '';
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:12px;border-bottom:1px solid #333;color:#fff;" onclick="openSongById('${s.id}','dnes')">
        <span><span style="color:#00bfff;font-weight:bold;">${s.displayId}.</span> ${s.title}</span>
      </div>`;
  }).join('');
}

function openDnesEditor(silent=false) {
  if (!isAdmin && !silent) return;
  const payload = parseDnesPayload(localStorage.getItem('piesne_dnes') || "");
  dnesSelectedIds = [...payload.ids];
  document.getElementById('dnes-name').value = payload.title || "PIESNE NA DNES";
  renderDnesEditor();
  filterDnesSearch();
}

/* ... filterDnesSearch, renderDnesEditor, drag handlers ostávajú ako máš ... */

async function saveDnesEditor() {
  const title = (document.getElementById('dnes-name').value || "PIESNE NA DNES").trim();
  const payload = JSON.stringify({ title, ids: dnesSelectedIds });

  localStorage.setItem('piesne_dnes', payload);
  setDnesTitle(title);
  renderDnesSection();

  try{
    await fetch(`${SCRIPT_URL}?action=save&name=PiesneNaDnes&pwd=${ADMIN_PWD}&content=${encodeURIComponent(payload)}`, { mode: 'no-cors' });
    showToast("Uložené ✅", true);
  }catch(e){
    showToast("Nepodarilo sa uložiť ❌", false);
  }
}

/* ✅ Playlist save toast */
async function savePlaylist() {
  if (!isAdmin) return;

  const name = (document.getElementById('playlist-name').value || "").trim();
  if (!name) return alert("Zadaj názov playlistu.");

  const content = selectedSongIds.join(',');
  localStorage.setItem('playlist_' + name, content);

  try{
    await fetch(`${SCRIPT_URL}?action=save&name=${encodeURIComponent(name)}&pwd=${ADMIN_PWD}&content=${encodeURIComponent(content)}`, { mode: 'no-cors' });
    showToast("Uložené ✅", true);
  }catch(e){
    showToast("Nepodarilo sa uložiť ❌", false);
  }

  /* zvyšok si nechaj podľa tvojej verzie (order, reset editor, refresh UI) */
}

/* Formspree, hardResetApp, atď. nechaj podľa svojej aktuálnej verzie. */

document.addEventListener('DOMContentLoaded', () => {
  toggleSection('dnes', false);
  toggleSection('playlists', false);
  toggleSection('all', false);
  toggleSection('update', false);

  parseXML();
});
