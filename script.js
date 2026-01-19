const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyyrD8pCxgQYiERsOsDFJ_XoBEbg6KYe1oM8Wj9IAzkq4yqzMSkfApgcc3aFeD0-Pxgww/exec';

let songs = [], filteredSongs = [], currentSong = null;
let currentModeList = []; 
let transposeStep = 0, fontSize = 17, chordsVisible = true, isAdmin = false, selectedSongIds = [], adminPassword = "";
const scale = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "B", "H"];

// Autoscroll nastavenia
let autoscrollInterval = null;
let scrollDelay = 80; // Základná rýchlosť (nižšie číslo = rýchlejšie)

function smartReset() {
    stopAutoscroll();
    document.getElementById('admin-panel').style.display = 'none';
    document.getElementById('song-detail').style.display = 'none';
    document.getElementById('song-list').style.display = 'block';
    document.getElementById('search').value = "";
    currentModeList = [...songs];
    filterSongs();
    window.scrollTo(0,0);
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
        if (rawId.startsWith('M')) displayId = "Mariánska " + rawId.substring(1).replace(/^0+/, '');
        else if (/^\d+$/.test(rawId)) displayId = rawId.replace(/^0+/, '');
        return { 
            id: s.getElementsByTagName('ID')[0]?.textContent.trim(), 
            title: s.getElementsByTagName('title')[0]?.textContent.trim(), 
            originalId: rawId, displayId: displayId, origText: text 
        };
    });
    songs.sort((a, b) => {
        const isNumA = /^\d+$/.test(a.originalId), isNumB = /^\d+$/.test(b.originalId);
        if (isNumA && isNumB) return parseInt(a.originalId) - parseInt(b.originalId);
        return a.originalId.localeCompare(b.originalId);
    });
    filteredSongs = [...songs];
    currentModeList = [...songs];
    renderAllSongs();
    loadPlaylistHeaders();
}

function renderAllSongs() {
    document.getElementById('piesne-list').innerHTML = filteredSongs.map(s => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; border-bottom: 1px solid #333;" onclick="openSongById('${s.id}', 'all')">
            <span><span style="color:#00bfff;font-weight:bold;">${s.displayId}.</span> ${s.title}</span>
            ${isAdmin ? `<button onclick="event.stopPropagation(); addToSelection('${s.id}')" style="background:#00bfff; color:black; border-radius:4px; font-weight:bold; width:30px; height:30px; border:none;">+</button>` : ''}
        </div>`).join('');
}

// FORMULÁR LOGIKA - BEZ PREKLIKU
async function submitErrorForm(e) {
    e.preventDefault();
    const btn = document.getElementById('submit-btn');
    const status = document.getElementById('form-status');
    const form = document.getElementById('error-form');
    
    btn.disabled = true;
    btn.innerText = "ODOSIELAM...";

    const formData = new FormData(form);
    
    try {
        const response = await fetch("https://formspree.io/f/mvzzkwlw", {
            method: "POST",
            body: formData,
            headers: { 'Accept': 'application/json' }
        });

        if (response.ok) {
            status.innerText = "Vďaka! Správa bola odoslaná.";
            status.style.display = "block";
            form.reset();
            setTimeout(() => { status.style.display = "none"; }, 4000);
        } else {
            alert("Chyba pri odosielaní. Skús to neskôr.");
        }
    } catch (err) {
        alert("Chyba spojenia.");
    } finally {
        btn.disabled = false;
        btn.innerText = "ODOSLAŤ";
    }
}

function updateFormSubject(title) {
    document.getElementById('form-subject').value = "Chyba v piesni: " + title;
}

function openSongById(id, source) {
    const s = songs.find(x => x.id === id); if (!s) return;
    if (source === 'all') currentModeList = [...songs];
    currentSong = JSON.parse(JSON.stringify(s));
    transposeStep = 0;
    stopAutoscroll();
    document.getElementById('song-list').style.display = 'none';
    document.getElementById('song-detail').style.display = 'block';
    const titleStr = s.displayId + '. ' + s.title;
    document.getElementById('render-title').innerText = titleStr;
    updateFormSubject(titleStr);
    renderSong(); window.scrollTo(0,0);
}

function renderSong() {
    let text = currentSong.origText;
    if (transposeStep !== 0) text = text.replace(/\[(.*?)\]/g, (m, c) => `[${transposeChord(c, transposeStep)}]`);
    if (!chordsVisible) text = text.replace(/\[.*?\]/g, '');
    const el = document.getElementById('song-content');
    el.innerHTML = text.replace(/\[(.*?)\]/g, '<span class="chord">$1</span>');
    el.style.fontSize = fontSize + 'px';
}

function navigateSong(d) {
    stopAutoscroll();
    const idx = currentModeList.findIndex(s => s.id === currentSong.id);
    const n = currentModeList[idx + d]; 
    if (n) {
        currentSong = JSON.parse(JSON.stringify(n));
        transposeStep = 0;
        const titleStr = n.displayId + '. ' + n.title;
        document.getElementById('render-title').innerText = titleStr;
        updateFormSubject(titleStr);
        renderSong(); window.scrollTo(0,0);
    }
}

// LOGIKA AUTOSCROLL S RÝCHLOSŤAMI
function toggleAutoscroll() {
    const btn = document.getElementById('scroll-btn');
    if (autoscrollInterval) {
        stopAutoscroll();
    } else {
        btn.innerHTML = '<i class="fas fa-pause"></i>';
        btn.classList.add('active');
        startScrolling();
    }
}

function startScrolling() {
    if (autoscrollInterval) clearInterval(autoscrollInterval);
    autoscrollInterval = setInterval(() => {
        window.scrollBy(0, 1);
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight) stopAutoscroll();
    }, scrollDelay);
}

function stopAutoscroll() {
    if (autoscrollInterval) { clearInterval(autoscrollInterval); autoscrollInterval = null; }
    const btn = document.getElementById('scroll-btn');
    if (btn) { btn.innerHTML = '<i class="fas fa-play"></i>'; btn.classList.remove('active'); }
}

function changeScrollSpeed(delta) {
    // delta -10 (zajac = menší delay = rýchlejšie)
    // delta +10 (korytnačka = väčší delay = pomalšie)
    scrollDelay += delta;
    if (scrollDelay < 10) scrollDelay = 10;
    if (scrollDelay > 300) scrollDelay = 300;
    
    // Zobrazenie úrovne (čím menší delay, tým vyššie číslo úrovne)
    const level = Math.round((310 - scrollDelay) / 10);
    document.getElementById('speed-label').innerText = "Rýchlosť: " + level;
    
    if (autoscrollInterval) startScrolling(); // Aktualizuj bežiaci posun
}

function transposeChord(c, s) {
    return c.replace(/[A-H][#b]?/g, (n) => {
        let note = n === 'B' ? 'B' : (n === 'H' ? 'H' : n);
        let idx = scale.indexOf(note); if (idx === -1) return n;
        let newIdx = (idx + s) % 12; while (newIdx < 0) newIdx += 12;
        return scale[newIdx];
    });
}

function closeSong() { stopAutoscroll(); document.getElementById('song-list').style.display = 'block'; document.getElementById('song-detail').style.display = 'none'; }
function transposeSong(d) { transposeStep += d; document.getElementById('transpose-val').innerText = (transposeStep > 0 ? "+" : "") + transposeStep; renderSong(); }
function resetTranspose() { transposeStep = 0; document.getElementById('transpose-val').innerText = "0"; renderSong(); }
function toggleChords() { chordsVisible = !chordsVisible; renderSong(); }
function changeFontSize(d) { fontSize += d; renderSong(); }
function filterSongs() { const t = document.getElementById('search').value.toLowerCase(); filteredSongs = songs.filter(s => s.title.toLowerCase().includes(t) || s.displayId.toLowerCase().includes(t)); renderAllSongs(); }

function unlockAdmin() { let p = prompt('Heslo:'); if (p === "qwer") { adminPassword = p; isAdmin = true; document.getElementById('admin-panel').style.display = 'block'; renderAllSongs(); loadPlaylistHeaders(); } }
function addToSelection(id) { if(!selectedSongIds.includes(id)) selectedSongIds.push(id); renderEditor(); }
function clearSelection() { selectedSongIds = []; document.getElementById('playlist-name').value = ""; renderEditor(); }
function removeFromSelection(idx) { selectedSongIds.splice(idx, 1); renderEditor(); }
function moveInSelection(index, direction) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= selectedSongIds.length) return;
    const temp = selectedSongIds[index];
    selectedSongIds[index] = selectedSongIds[newIndex];
    selectedSongIds[newIndex] = temp;
    renderEditor();
}
function renderEditor() {
    const container = document.getElementById('selected-list-editor');
    if (selectedSongIds.length === 0) { container.innerHTML = '<div style="color: #666; text-align: center; padding: 10px;">Prázdny playlist</div>'; return; }
    container.innerHTML = selectedSongIds.map((id, index) => {
        const s = songs.find(x => x.id === id);
        return `<div class="editor-item"><span style="flex-grow:1; font-size:13px; color:white;">${s ? s.title : id}</span><div class="editor-btn-group"><button onclick="moveInSelection(${index}, -1)"><i class="fas fa-chevron-up"></i></button><button onclick="moveInSelection(${index}, 1)"><i class="fas fa-chevron-down"></i></button><button onclick="removeFromSelection(${index})" style="background:#ff4444;"><i class="fas fa-times"></i></button></div></div>`;
    }).join('');
}
function savePlaylist() {
    const name = document.getElementById('playlist-name').value;
    if (!name || !selectedSongIds.length) return alert('Zadaj názov a vyber piesne');
    window.open(`${SCRIPT_URL}?action=save&name=${encodeURIComponent(name)}&pwd=${adminPassword}&content=${selectedSongIds.join(',')}`, '_blank','width=300,height=200');
}
function editPlaylist(name) {
    const cached = localStorage.getItem('playlist_' + name);
    if (!cached) return;
    selectedSongIds = cached.split(',').filter(x => x);
    document.getElementById('playlist-name').value = name;
    document.getElementById('admin-panel').style.display = 'block';
    renderEditor();
    window.scrollTo(0,0);
}
function loadPlaylistHeaders() {
    fetch(`${SCRIPT_URL}?action=list`).then(r => r.json()).then(d => { localStorage.setItem('offline_playlists', JSON.stringify(d)); renderPlaylists(d); })
    .catch(() => { const saved = localStorage.getItem('offline_playlists'); if (saved) renderPlaylists(JSON.parse(saved)); });
}
function openPlaylist(name) {
    fetch(`${SCRIPT_URL}?action=get&name=${encodeURIComponent(name)}`).then(r => r.text()).then(t => { localStorage.setItem('playlist_' + name, t); processOpenPlaylist(name, t); });
}
function processOpenPlaylist(name, t) {
    const ids = t.split(',');
    currentModeList = ids.map(id => songs.find(s => s.id === id)).filter(x => x);
    document.getElementById('piesne-list').innerHTML = `<div style="text-align:center; padding:15px; border-bottom:2px solid #00bfff; margin-bottom:15px;"><h2 class="playlist-header-title" style="margin:0; -webkit-text-fill-color:#00bfff;">${name}</h2><button onclick="smartReset()" style="background:none; color:#ff4444; border:1px solid #ff4444; padding:6px 16px; border-radius:20px; cursor:pointer; margin-top:10px; font-weight:bold;">ZAVRIEŤ</button></div>` +
    currentModeList.map(s => `<div onclick="openSongById('${s.id}', 'playlist')" style="padding:15px; border-bottom: 1px solid #333;"><span style="color:#00bfff;font-weight:bold;">${s.displayId}.</span> ${s.title}</div>`).join('');
    window.scrollTo(0,0);
}
function renderPlaylists(d) {
    const sect = document.getElementById('playlists-section');
    if (!d || d.length === 0) { sect.innerHTML = ""; return; }
    sect.innerHTML = '<h2 class="playlist-header-title">Playlisty</h2>' + d.map(p => `<div style="display:flex; justify-content:space-between; align-items:center; padding:15px; border-bottom: 1px solid #333;" onclick="openPlaylist('${p.name}')"><span style="cursor:pointer; flex-grow:1;"><i class="fas fa-music" style="color:#00bfff; margin-right:12px;"></i>${p.name}</span>${isAdmin ? `<div style="display:flex; gap:20px;"><i class="fas fa-edit" onclick="event.stopPropagation(); editPlaylist('${p.name}')" style="color:#00bfff;"></i><i class="fas fa-trash" onclick="event.stopPropagation(); deletePlaylist('${p.name}')" style="color:#ff4444;"></i></div>` : ''}</div>`).join('');
}
function deletePlaylist(n) { if (confirm(`Vymazať ${n}?`)) window.open(`${SCRIPT_URL}?action=delete&name=${encodeURIComponent(n)}&pwd=${adminPassword}`, '_blank','width=300,height=200'); }

document.addEventListener('DOMContentLoaded', parseXML);
