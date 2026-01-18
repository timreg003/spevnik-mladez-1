const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyyrD8pCxgQYiERsOsDFJ_XoBEbg6KYe1oM8Wj9IAzkq4yqzMSkfApgcc3aFeD0-Pxgww/exec';

let songs = [], filteredSongs = [], currentSong = null, currentModeList = [], transposeStep = 0, fontSize = 17, chordsVisible = true, isAdmin = false, selectedSongIds = [], adminPassword = "";
const scale = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "B", "H"];

// INTELIGENTNÝ RESET
async function smartReset() {
    // Ak sme offline, len sa vrátime na hlavnú obrazovku (aby sme nezmazali dáta bez možnosti ich znova stiahnuť)
    if (!navigator.onLine) {
        closeSong();
        filterSongs(); 
        window.scrollTo(0,0);
        return;
    }

    // Ak sme online, spýtame sa na tvrdý reset
    if (!confirm("Vynútiť aktualizáciu spevníka? (Vymaže sa pamäť a zmeny sa prejavia ihneď)")) return;
    
    localStorage.clear();
    if ('caches' in window) {
        const names = await caches.keys();
        await Promise.all(names.map(n => caches.delete(n)));
    }
    if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (let r of regs) await r.unregister();
    }
    window.location.reload(true);
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
        let displayId = rawId.startsWith('M') ? "Mariánska " + rawId.substring(1).replace(/^0+/, '') : rawId;
        return { id: s.getElementsByTagName('ID')[0]?.textContent.trim(), title: s.getElementsByTagName('title')[0]?.textContent.trim(), originalId: rawId, displayId: displayId, origText: text, originalKey: (text.match(/\[([A-H][#b]?[m]?)\]/) || [])[1] || '?' };
    });
    songs.sort((a, b) => {
        const isNumA = /^\d+$/.test(a.originalId), isNumB = /^\d+$/.test(b.originalId);
        if (isNumA && !isNumB) return -1; if (!isNumA && isNumB) return 1;
        if (isNumA && isNumB) return parseInt(a.originalId) - parseInt(b.originalId);
        if (a.originalId.startsWith('M') && !b.originalId.startsWith('M')) return -1;
        return a.originalId.localeCompare(b.originalId);
    });
    filteredSongs = [...songs]; currentModeList = [...songs];
    renderAllSongs(); loadPlaylistHeaders();
}

function renderAllSongs() {
    document.getElementById('piesne-list').innerHTML = filteredSongs.map(s => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:12px;" onclick="openSongById('${s.id}')">
            <span><span style="color:#00bfff;font-weight:bold;">${s.displayId}.</span> ${s.title}</span>
            ${isAdmin ? `<button onclick="event.stopPropagation(); addToSelection('${s.id}')" style="background:#00bfff; color:black; border-radius:4px; font-weight:bold; width:30px; height:30px; border:none;">+</button>` : ''}
        </div>`).join('');
}

function loadPlaylistHeaders() {
    fetch(`${SCRIPT_URL}?action=list`)
    .then(r => r.json())
    .then(d => { localStorage.setItem('offline_playlists', JSON.stringify(d)); renderPlaylists(d); })
    .catch(() => { const saved = localStorage.getItem('offline_playlists'); if (saved) renderPlaylists(JSON.parse(saved)); });
}

function renderPlaylists(d) {
    const sect = document.getElementById('playlists-section');
    if (!d || d.length === 0) { sect.innerHTML = ""; return; }
    sect.innerHTML = '<h2 class="playlist-header-title">Playlisty</h2>' + d.map(p => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:15px;" onclick="openPlaylist('${p.name}')">
            <span style="cursor:pointer; flex-grow:1; display:flex; align-items:center;">
                <i class="fas fa-music" style="color:#00bfff; margin-right:12px; width:20px; text-align:center;"></i>
                ${p.name}
            </span>
            ${isAdmin ? `<div style="display:flex; gap:20px;"><i class="fas fa-edit" onclick="event.stopPropagation(); editPlaylist('${p.name}')" style="color:#00bfff;"></i><i class="fas fa-trash" onclick="event.stopPropagation(); deletePlaylist('${p.name}')" style="color:#ff4444;"></i></div>` : ''}
        </div>`).join('');
}

function openPlaylist(name) {
    const cached = localStorage.getItem('playlist_' + name);
    if (cached) {
        processOpenPlaylist(name, cached);
        if (navigator.onLine) fetch(`${SCRIPT_URL}?action=get&name=${encodeURIComponent(name)}`).then(r => r.text()).then(t => { if(t !== cached) localStorage.setItem('playlist_' + name, t); });
    } else {
        fetch(`${SCRIPT_URL}?action=get&name=${encodeURIComponent(name)}`).then(r => r.text()).then(t => { localStorage.setItem('playlist_' + name, t); processOpenPlaylist(name, t); });
    }
}

function processOpenPlaylist(name, t) {
    const ids = t.split(',');
    currentModeList = ids.map(id => songs.find(s => s.id === id)).filter(x => x);
    document.getElementById('piesne-list').innerHTML = `
    <div style="text-align:center; padding:15px; border-bottom:2px solid #00bfff; margin-bottom:15px;">
        <h2 class="playlist-header-title" style="font-size:1.3em; margin:0;">${name}</h2>
        <button onclick="smartReset()" style="background:none; color:#ff4444; border:1px solid #ff4444; padding:6px 16px; border-radius:20px; cursor:pointer; margin-top:10px; font-weight:bold;">ZAVRIEŤ PLAYLIST</button>
    </div>` +
    currentModeList.map(s => `<div onclick="openSongById('${s.id}')" style="padding:15px;"><span style="color:#00bfff;font-weight:bold;">${s.displayId}.</span> ${s.title}</div>`).join('');
    window.scrollTo(0,0);
}

function openSongById(id) {
    const s = songs.find(x => x.id === id); if (!s) return;
    currentSong = JSON.parse(JSON.stringify(s)); transposeStep = 0;
    document.getElementById('transpose-val').innerText = "0";
    document.getElementById('song-list').style.display = 'none';
    document.getElementById('song-detail').style.display = 'block';
    document.getElementById('render-title').innerText = s.displayId + '. ' + s.title;
    document.getElementById('form-subject').value = "Chyba: " + s.title;
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

function transposeChord(c, s) {
    return c.replace(/[A-H][#b]?/g, (n) => {
        let note = n === 'B' ? 'B' : (n === 'H' ? 'H' : n);
        let idx = scale.indexOf(note); if (idx === -1) return n;
        let newIdx = (idx + s) % 12; while (newIdx < 0) newIdx += 12;
        return scale[newIdx];
    });
}

function filterSongs() {
    const t = document.getElementById('search').value.toLowerCase();
    filteredSongs = songs.filter(s => s.title.toLowerCase().includes(t) || s.displayId.toLowerCase().includes(t));
    renderAllSongs();
}

function navigateSong(d) {
    const idx = currentModeList.findIndex(s => s.id === currentSong.id);
    const n = currentModeList[idx + d]; if (n) openSongById(n.id);
}

function closeSong() { document.getElementById('song-list').style.display = 'block'; document.getElementById('song-detail').style.display = 'none'; }
function transposeSong(d) { transposeStep += d; document.getElementById('transpose-val').innerText = (transposeStep > 0 ? "+" : "") + transposeStep; renderSong(); }
function resetTranspose() { transposeStep = 0; document.getElementById('transpose-val').innerText = "0"; renderSong(); }
function toggleChords() { chordsVisible = !chordsVisible; renderSong(); }
function changeFontSize(d) { fontSize += d; renderSong(); }

function unlockAdmin() { let p = prompt('Heslo:'); if (p === "qwer") { adminPassword = p; isAdmin = true; document.getElementById('admin-panel').style.display = 'block'; renderAllSongs(); loadPlaylistHeaders(); } }

document.addEventListener('DOMContentLoaded', parseXML);
