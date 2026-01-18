let songs = [];
let currentSong = null;
let currentMode = "all"; 
let currentModeList = [];
let transposeStep = 0;
let fontSize = 17;
let chordsVisible = true;
let isAdmin = false;
let selectedSongIds = [];
let adminPassword = "";

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxEfu4yOq0BE4gcr4hOaElvVCNzvmZOSgmbeyy4gOqfIxAhBjRgzDPixYNXbn9_UoXbsw/exec';

function parseXML() {
  fetch(SCRIPT_URL + "?t=" + new Date().getTime())
    .then(res => res.text())
    .then(xmlText => {
      const parser = new DOMParser();
      const xml = parser.parseFromString(xmlText, 'application/xml');
      const songNodes = xml.getElementsByTagName('song');
      
      songs = Array.from(songNodes).map(song => {
        const getVal = (t) => song.getElementsByTagName(t)[0]?.textContent.trim() || "";
        const st = getVal('songtext');
        const firstChord = st.match(/\[([A-H][#b]?[m]?)\]/);
        return {
          id: getVal('ID'),
          title: getVal('title') || "Bez názvu",
          displayId: getVal('author') || "",
          text: st,
          origText: st,
          originalKey: firstChord ? firstChord[1] : "?"
        };
      });
      renderAllSongs();
      loadPlaylistHeaders();
      renderLiturgia();
    });
}

function renderLiturgia() {
    // Svätý sa teraz hľadá podľa displayId "999"
    const mapping = [
        {n: 'Pane zmiluj sa', search: 'Pane zmiluj sa'},
        {n: 'Aleluja', search: 'Aleluja'},
        {n: 'Svätý', search: '999'}, 
        {n: 'Otče náš', search: 'Otče náš'},
        {n: 'Baránok', search: 'Baránok'}
    ];
    const container = document.querySelector('.liturgia');
    container.innerHTML = mapping.map(m => {
        const s = songs.find(x => x.title.toLowerCase().includes(m.search.toLowerCase()) || x.displayId === m.search);
        const isSel = s && selectedSongIds.includes(s.id);
        return `
            <div onclick="handleSongClick('${s?.id}', 'liturgia')" style="display:flex; justify-content:space-between; align-items:center; padding: 10px 14px; margin-bottom: 5px; ${isSel ? 'border-left: 5px solid #00bfff;' : ''}">
                ${m.n}
                ${isAdmin && s ? `<i class="fas ${isSel ? 'fa-check-circle' : 'fa-plus-circle'}" style="color:#00bfff"></i>` : ''}
            </div>
        `;
    }).join('');
}

function renderAllSongs() {
  const container = document.getElementById('piesne-list');
  const sorted = songs.slice().sort((a, b) => {
      const numA = parseInt(a.displayId) || 9999;
      const numB = parseInt(b.displayId) || 9999;
      return numA - numB;
  });
  
  container.innerHTML = sorted.map(s => {
    const isSel = selectedSongIds.includes(s.id);
    return `
      <div onclick="handleSongClick('${s.id}', 'all')" style="display:flex; justify-content:space-between; align-items:center; padding: 10px 14px; margin-bottom: 5px; ${isSel ? 'border-left: 5px solid #00bfff;' : ''}">
        <div><span style="color: #00bfff; font-weight: bold; margin-right: 8px;">${s.displayId}.</span> ${s.title}</div>
        ${isAdmin ? `<i class="fas ${isSel ? 'fa-check-circle' : 'fa-plus-circle'}" style="color:#00bfff"></i>` : ''}
      </div>`;
  }).join('');
}

function handleSongClick(id, mode) {
    if (isAdmin) {
        const index = selectedSongIds.indexOf(id);
        if (index === -1) selectedSongIds.push(id);
        else selectedSongIds.splice(index, 1);
        renderSelected();
        renderAllSongs();
        renderLiturgia();
    } else {
        if (mode === 'liturgia') openLiturgia(id);
        else openSongById(id, "all");
    }
}

function openLiturgia(id) {
    const mapping = ['Pane zmiluj sa', 'Aleluja', '999', 'Otče náš', 'Baránok'];
    currentModeList = mapping.map(m => songs.find(s => s.title.toLowerCase().includes(m.toLowerCase()) || s.displayId === m)).filter(x => x);
    currentMode = "liturgia";
    openSongById(id);
}

function openSongById(id, mode) {
    if (mode === "all") { currentMode = "all"; currentModeList = songs; }
    const s = songs.find(x => x.id === id);
    if (!s) return;
    currentSong = JSON.parse(JSON.stringify(s));
    transposeStep = 0;
    document.getElementById('song-list').style.display = 'none';
    document.getElementById('song-detail').style.display = 'block';
    renderSong();
    window.scrollTo(0,0);
}

function renderSong() {
  let text = currentSong.text;
  if (!chordsVisible) text = text.replace(/\[.*?\]/g, '');
  else text = text.replace(/\[(.*?)\]/g, '<span class="chord">$1</span>');
  
  // Minimalizované paddingy a line-height, aby to nebolo široké
  const header = `
    <div style="text-align:center; margin-bottom: 5px;">
        <h2 style="margin:0; color:#00bfff; border:none; padding:0; font-size: 1.4em;">${currentSong.displayId ? currentSong.displayId + '. ' : ''}${currentSong.title}</h2>
        <div style="color:#666; font-size: 0.8em; margin: 2px 0 10px 0;">Pôvodná tónina: ${currentSong.originalKey}</div>
    </div>
  `;
  const contentEl = document.getElementById('song-content');
  contentEl.innerHTML = header + text;
  contentEl.style.fontSize = fontSize + "px";
  contentEl.style.lineHeight = "1.8"; // Zúženie riadkov textu
  contentEl.style.padding = "10px 15px"; // Zúženie poliat
  document.getElementById('transpose-val').innerText = (transposeStep > 0 ? "+" : "") + transposeStep;
}

function navigateSong(step) {
    const list = (currentMode === "playlist") ? currentPlaylist : (currentMode === "liturgia" ? currentModeList : songs);
    const currIdx = list.findIndex(s => s.id === currentSong.id);
    const nextIdx = currIdx + step;
    if (nextIdx >= 0 && nextIdx < list.length) openSongById(list[nextIdx].id);
}

function transposeSong(step) {
  transposeStep += step;
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'B', 'H'];
  const trans = (c) => c.replace(/[A-H][#b]?/g, m => {
    let n = (m==='Bb'||m==='Hb') ? 'B' : m;
    let i = notes.indexOf(n);
    if (i===-1) return m;
    let ni = (i+step)%12; while(ni<0) ni+=12;
    return notes[ni];
  });
  currentSong.text = currentSong.origText.replace(/\[(.*?)\]/g, (m, c) => `[${trans(c)}]`);
  renderSong();
}

function resetTranspose() { transposeStep = 0; currentSong.text = currentSong.origText; renderSong(); }
function closeSong() { document.getElementById('song-list').style.display = 'block'; document.getElementById('song-detail').style.display = 'none'; }
function changeFontSize(s) { fontSize += s; renderSong(); }
function toggleChords() { chordsVisible = !chordsVisible; renderSong(); }

function unlockAdmin() {
  const p = prompt("Heslo:");
  if (p) { adminPassword = p; isAdmin = true; document.getElementById('admin-panel').style.display = 'block'; renderAllSongs(); renderLiturgia(); loadPlaylistHeaders(); }
}

function moveInSelection(i, d) {
  const ni = i + d;
  if (ni >= 0 && ni < selectedSongIds.length) {
    [selectedSongIds[i], selectedSongIds[ni]] = [selectedSongIds[ni], selectedSongIds[i]];
    renderSelected();
  }
}

function renderSelected() {
  document.getElementById('selected-list').innerHTML = selectedSongIds.map((id, i) => {
    const s = songs.find(x => x.id === id);
    return `<div style="display:flex; justify-content:space-between; background:#2a2a2a; padding:5px 10px; margin-bottom:3px; border-radius:5px; font-size:12px;">
      ${s.title}
      <div>
        <i class="fas fa-arrow-up" onclick="moveInSelection(${i},-1)" style="margin-right:10px; color:#00bfff"></i>
        <i class="fas fa-arrow-down" onclick="moveInSelection(${i},1)" style="margin-right:10px; color:#00bfff"></i>
        <i class="fas fa-times" onclick="handleSongClick('${id}')" style="color:red"></i>
      </div>
    </div>`;
  }).join('');
}

function savePlaylist() {
  const name = document.getElementById('playlist-name').value;
  if (!name || !selectedSongIds.length) return alert("Chýba názov!");
  
  const url = `${SCRIPT_URL}?action=save&name=${encodeURIComponent(name)}&pwd=${encodeURIComponent(adminPassword)}&content=${selectedSongIds.join(',')}`;
  
  fetch(url).then(r => r.text()).then(res => { 
    alert(res); 
    if(res.includes("Uložené")) { 
        selectedSongIds = []; isAdmin = false; 
        document.getElementById('admin-panel').style.display = 'none';
        renderAllSongs(); renderLiturgia(); loadPlaylistHeaders();
    } 
  }).catch(err => alert("Chyba pripojenia: " + err));
}

function loadPlaylistHeaders() {
  fetch(`${SCRIPT_URL}?action=list&t=${Date.now()}`)
    .then(r => r.json()).then(data => {
      const container = document.getElementById('playlists-section');
      if (!container) return;
      let html = data.length ? "<h2>Dnešný program</h2>" : "";
      html += data.map(p => `<div style="background:#1e1e1e; border:1px solid #333; padding:12px; margin-bottom:5px; border-radius:10px; cursor:pointer; display:flex; justify-content:space-between;" onclick="openPlaylist('${p.name}')">
        <span><i class="fas fa-layer-group" style="margin-right:10px; color:#00bfff"></i>${p.name}</span>
        ${isAdmin ? `<i class="fas fa-trash" onclick="event.stopPropagation(); deletePlaylist('${p.name}')" style="color:red"></i>` : ''}
      </div>`).join('');
      container.innerHTML = html;
    });
}

function openPlaylist(name) {
  fetch(`${SCRIPT_URL}?action=get&name=${encodeURIComponent(name)}&t=${Date.now()}`)
    .then(r => r.text()).then(idsText => {
      const ids = idsText.split(',');
      currentPlaylist = ids.map(id => songs.find(s => s.id === id)).filter(x => x);
      currentMode = "playlist";
      document.getElementById('piesne-title').innerText = name;
      document.getElementById('piesne-list').innerHTML = `<button onclick="renderAllSongs(); document.getElementById('piesne-title').innerText='Piesne';" style="width:100%; padding:10px; margin-bottom:10px; background:#2a2a2a; color:#00bfff; border-radius:10px; border:1px solid #333; font-weight:bold;">⬅ Späť na všetky piesne</button>` + 
      currentPlaylist.map(s => `<div onclick="openSongById('${s.id}')" style="background:#1e1e1e; padding:12px; margin-bottom:5px; border-radius:10px;"><span style="color:#00bfff; font-weight:bold;">${s.displayId}.</span> ${s.title}</div>`).join('');
      window.scrollTo(0, 0);
    });
}

function deletePlaylist(name) {
    if(confirm("Zmazať?")) fetch(`${SCRIPT_URL}?action=delete&name=${encodeURIComponent(name)}&pwd=${encodeURIComponent(adminPassword)}`).then(() => loadPlaylistHeaders());
}

document.addEventListener('DOMContentLoaded', () => {
    parseXML();
    document.getElementById('search').addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        const filtered = songs.filter(s => s.title.toLowerCase().includes(q) || s.displayId.toLowerCase().includes(q));
        document.getElementById('piesne-list').innerHTML = filtered.map(s => `<div onclick="handleSongClick('${s.id}', 'all')" style="padding:10px 14px; margin-bottom:5px; background:#1e1e1e; border-radius:10px;"><span style="color:#00bfff; font-weight:bold;">${s.displayId}.</span> ${s.title}</div>`).join('');
    });
});
