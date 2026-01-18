const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyyrD8pCxgQYiERsOsDFJ_XoBEbg6KYe1oM8Wj9IAzkq4yqzMSkfApgcc3aFeD0-Pxgww/exec';

let songs = [];
let filteredSongs = [];
let currentSong = null;
let currentModeList = [];
let transposeStep = 0;
let fontSize = 17;
let chordsVisible = true;
let isAdmin = false;
let selectedSongIds = [];
let adminPassword = "";

const scale = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "B", "H"];

// HLAVNÁ FUNKCIA: Skúsi sieť, ak zlyhá, vytiahne dáta z pamäte mobilu
async function parseXML() {
    try {
        const res = await fetch(SCRIPT_URL);
        if (!res.ok) throw new Error();
        const xmlText = await res.text();
        
        // ZÁLOHA: Uložíme si čerstvé dáta do pamäte prehliadača
        localStorage.setItem('offline_spevnik', xmlText);
        
        processXML(xmlText);
    } catch (e) {
        // OFFLINE REŽIM: Skúsime nájsť poslednú uloženú verziu
        const savedData = localStorage.getItem('offline_spevnik');
        if (savedData) {
            console.log("Pracujem v offline režime.");
            processXML(savedData);
            // Upozornenie pre používateľa
            document.getElementById('search').placeholder = "OFFLINE REŽIM - Dáta z pamäte";
        } else {
            document.getElementById('piesne-list').innerHTML = 'Chyba: Nie ste pripojený a nemáte uloženú žiadnu offline kópiu.';
        }
    }
}

// Spracovanie XML dát (toto je pôvodná logika, ktorú netreba meniť)
function processXML(xmlText) {
    const xml = new DOMParser().parseFromString(xmlText, 'application/xml');
    const nodes = xml.getElementsByTagName('song');

    songs = [...nodes].map(s => {
        const text = s.getElementsByTagName('songtext')[0]?.textContent.trim() || "";
        const rawId = s.getElementsByTagName('author')[0]?.textContent.trim() || "";
        let displayId = rawId;
        if (rawId.startsWith('M')) {
            const num = rawId.substring(1).replace(/^0+/, '');
            displayId = "Mariánska " + num;
        }
        return {
            id: s.getElementsByTagName('ID')[0]?.textContent.trim(),
            title: s.getElementsByTagName('title')[0]?.textContent.trim(),
            originalId: rawId,
            displayId: displayId,
            origText: text,
            originalKey: (text.match(/\[([A-H][#b]?[m]?)\]/) || [])[1] || '?'
        };
    });

    sortSongs();
    filteredSongs = [...songs];
    currentModeList = [...songs];
    renderAllSongs();
    loadPlaylistHeaders();
}

// TRIEDENIE (tvoje pôvodné)
function sortSongs() {
    songs.sort((a, b) => {
        const aIsNum = /^\d+$/.test(a.originalId);
        const bIsNum = /^\d+$/.test(b.originalId);
        const aIsM = a.originalId.startsWith('M');
        const bIsM = b.originalId.startsWith('M');
        if (aIsNum && !bIsNum) return -1;
        if (!aIsNum && bIsNum) return 1;
        if (aIsNum && bIsNum) return parseInt(a.originalId) - parseInt(b.originalId);
        if (aIsM && !bIsM) return -1;
        if (!aIsM && bIsM) return 1;
        if (aIsM && bIsM) {
            const numA = parseInt(a.originalId.substring(1));
            const numB = parseInt(b.originalId.substring(1));
            return numA - numB;
        }
        return a.originalId.localeCompare(b.originalId);
    });
}

// OSTATNÉ FUNKCIE (render, filter, openSong, atď.) zostávajú nezmenené...
// (Tu pokračuje tvoj pôvodný kód pre zobrazenie piesní, transpozíciu a formulár)

function renderAllSongs() {
    const el = document.getElementById('piesne-list');
    el.innerHTML = filteredSongs.map(s => `
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid #333; padding:12px;" onclick="openSongById('${s.id}')">
            <span><span style="color:#00bfff;font-weight:bold;">${s.displayId}.</span> ${s.title}</span>
            ${isAdmin ? `<button onclick="event.stopPropagation(); addToSelection('${s.id}')" style="background:#00bfff; color:black; border-radius:4px; font-weight:bold; width:30px; height:30px; border:none;">+</button>` : ''}
        </div>`).join('');
}

function filterSongs() {
    const t = document.getElementById('search').value.toLowerCase();
    filteredSongs = songs.filter(s => s.title.toLowerCase().includes(t) || s.displayId.toLowerCase().includes(t));
    renderAllSongs();
}

function openSongById(id) {
    const found = songs.find(s => s.id === id);
    if (!found) return;
    currentSong = JSON.parse(JSON.stringify(found));
    transposeStep = 0;
    document.getElementById('transpose-val').innerText = "0";
    document.getElementById('song-list').style.display = 'none';
    document.getElementById('song-detail').style.display = 'block';
    document.getElementById('render-title').innerText = currentSong.displayId + '. ' + currentSong.title;
    document.getElementById('render-key').innerText = 'Tónina: ' + currentSong.originalKey;
    document.getElementById('form-subject').value = "Chyba v piesni: " + currentSong.title;
    renderSong();
    window.scrollTo(0,0);
}

function renderSong() {
    let text = currentSong.origText;
    if (transposeStep !== 0) text = text.replace(/\[(.*?)\]/g, (match, chord) => `[${transposeChord(chord, transposeStep)}]`);
    if (!chordsVisible) text = text.replace(/\[.*?\]/g, '');
    const content = document.getElementById('song-content');
    content.innerHTML = text.replace(/\[(.*?)\]/g, '<span class="chord">$1</span>');
    content.style.fontSize = fontSize + 'px';
}

function transposeChord(chord, step) {
    return chord.replace(/[A-H][#b]?/g, (note) => {
        let n = note === 'B' ? 'B' : (note === 'H' ? 'H' : note);
        let idx = scale.indexOf(n);
        if (idx === -1) return note;
        let newIdx = (idx + step) % 12;
        while (newIdx < 0) newIdx += 12;
        return scale[newIdx];
    });
}

function navigateSong(dir) {
    const index = currentModeList.findIndex(s => s.id === currentSong.id);
    const next = currentModeList[index + dir];
    if (next) openSongById(next.id);
}

function closeSong() {
    document.getElementById('song-list').style.display = 'block';
    document.getElementById('song-detail').style.display = 'none';
}

function transposeSong(dir) { transposeStep += dir; document.getElementById('transpose-val').innerText = (transposeStep > 0 ? "+" : "") + transposeStep; renderSong(); }
function resetTranspose() { transposeStep = 0; document.getElementById('transpose-val').innerText = "0"; renderSong(); }
function toggleChords() { chordsVisible = !chordsVisible; renderSong(); }
function changeFontSize(dir) { fontSize += dir; renderSong(); }

// FORMULÁR: Odosielanie cez fetch
document.addEventListener('submit', async function(e) {
    if (e.target && e.target.id === 'error-form') {
        e.preventDefault();
        const form = e.target;
        const status = document.getElementById('form-status');
        const btn = document.getElementById('form-submit-btn');
        const data = new FormData(form);
        btn.disabled = true;
        btn.innerText = "ODOSIELAM...";
        try {
            const response = await fetch('https://formspree.io/f/mvzzkwlw', {
                method: 'POST',
                body: data,
                headers: { 'Accept': 'application/json' }
            });
            if (response.ok) {
                form.style.display = 'none';
                status.style.display = 'block';
                setTimeout(() => {
                    form.reset();
                    form.style.display = 'block';
                    status.style.display = 'none';
                    btn.disabled = false;
                    btn.innerText = "ODOSLAŤ";
                }, 3000);
            } else { alert("Chyba pri odosielaní."); btn.disabled = false; btn.innerText = "ODOSLAŤ"; }
        } catch (error) { alert("Chyba spojenia (ste offline?)"); btn.disabled = false; btn.innerText = "ODOSLAŤ"; }
    }
});

// ADMIN FUNKCIE (pôvodné)
function unlockAdmin() {
    const p = prompt('Heslo:');
    if (p === "qwer") {
        adminPassword = p; isAdmin = true;
        document.getElementById('admin-panel').style.display = 'block';
        renderAllSongs(); loadPlaylistHeaders();
    }
}

function savePlaylist() {
    const name = document.getElementById('playlist-name').value;
    if (!name || !selectedSongIds.length) return alert('Zadaj názov a pridaj piesne');
    window.open(`${SCRIPT_URL}?action=save&name=${encodeURIComponent(name)}&pwd=${adminPassword}&content=${selectedSongIds.join(',')}`, '_blank','width=300,height=200');
    setTimeout(loadPlaylistHeaders, 2000);
}

function deletePlaylist(name) {
    if (!confirm(`Vymazať playlist "${name}"?`)) return;
    window.open(`${SCRIPT_URL}?action=delete&name=${encodeURIComponent(name)}&pwd=${adminPassword}`, '_blank','width=300,height=200');
    setTimeout(loadPlaylistHeaders, 2000);
}

function loadPlaylistHeaders() {
    // Playlisty tiež ukladáme pre offline
    fetch(`${SCRIPT_URL}?action=list`)
    .then(r => r.json())
    .then(d => {
        localStorage.setItem('offline_playlists', JSON.stringify(d));
        renderPlaylists(d);
    })
    .catch(() => {
        const saved = localStorage.getItem('offline_playlists');
        if (saved) renderPlaylists(JSON.parse(saved));
    });
}

function renderPlaylists(d) {
    const sect = document.getElementById('playlists-section');
    if (!d || d.length === 0) { sect.innerHTML = ""; return; }
    sect.innerHTML = '<h2>PLAYLISTY</h2>' + d.map(p => `
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid #333; padding:10px;">
            <span onclick="openPlaylist('${p.name}')" style="cursor:pointer; flex-grow:1;">📄 ${p.name}</span>
            ${isAdmin ? `<i class="fas fa-edit" onclick="editPlaylist('${p.name}')" style="color:#00bfff; cursor:pointer; margin-right:15px;"></i><i class="fas fa-trash" onclick="deletePlaylist('${p.name}')" style="color:#ff4444; cursor:pointer;"></i>` : ''}
        </div>`).join('');
}

function openPlaylist(name) {
    fetch(`${SCRIPT_URL}?action=get&name=${encodeURIComponent(name)}`)
    .then(r => r.text())
    .then(t => {
        localStorage.setItem('playlist_' + name, t);
        processOpenPlaylist(name, t);
    })
    .catch(() => {
        const saved = localStorage.getItem('playlist_' + name);
        if (saved) processOpenPlaylist(name, saved);
    });
}

function processOpenPlaylist(name, t) {
    const ids = t.split(',');
    currentModeList = ids.map(id => songs.find(s => s.id === id)).filter(x => x);
    document.getElementById('piesne-list').innerHTML = `<div style="padding:10px; color:#00bfff; font-weight:bold; border-bottom:2px solid #00bfff; display:flex; justify-content:space-between; align-items:center;"><span>Playlist: ${name}</span><button onclick="location.reload()" style="background:none; color:red; border:1px solid red; padding:2px 8px; border-radius:4px; cursor:pointer;">Zrušiť</button></div>` +
    currentModeList.map(s => `<div onclick="openSongById('${s.id}')" style="padding:12px; border-bottom:1px solid #333;"><span style="color:#00bfff;font-weight:bold;">${s.displayId}.</span> ${s.title}</div>`).join('');
}

function editPlaylist(name) {
    const t = localStorage.getItem('playlist_' + name);
    if(t) {
        selectedSongIds = t.split(',');
        document.getElementById('playlist-name').value = name;
        renderEditor(); window.scrollTo(0,0);
    }
}

function addToSelection(id) { selectedSongIds.push(id); renderEditor(); }
function clearSelection() { selectedSongIds = []; document.getElementById('playlist-name').value = ""; renderEditor(); }
function moveSong(idx, dir) {
    let target = idx + dir; if (target < 0 || target >= selectedSongIds.length) return;
    [selectedSongIds[idx], selectedSongIds[target]] = [selectedSongIds[target], selectedSongIds[idx]];
    renderEditor();
}
function removeFromSelection(idx) { selectedSongIds.splice(idx, 1); renderEditor(); }
function renderEditor() {
    const container = document.getElementById('selected-list-editor');
    if (selectedSongIds.length === 0) { container.innerHTML = '<div style="color: #666; text-align: center; padding: 10px;">Žiadne piesne v playliste</div>'; return; }
    container.innerHTML = selectedSongIds.map((id, index) => {
        const s = songs.find(x => x.id === id);
        return `<div style="display:flex; align-items:center; background:#1e1e1e; margin-bottom:2px; padding:5px; border-radius:4px; gap:5px; border-bottom: 1px solid #333;"><span style="flex-grow:1; font-size:13px; color:white;">${s ? s.title : id}</span><button onclick="moveSong(${index}, -1)" style="padding:4px; background:#333;"><i class="fas fa-chevron-up"></i></button><button onclick="moveSong(${index}, 1)" style="padding:4px; background:#333;"><i class="fas fa-chevron-down"></i></button><button onclick="removeFromSelection(${index})" style="padding:4px; background:#ff4444;"><i class="fas fa-times"></i></button></div>`;
    }).join('');
}

document.addEventListener('DOMContentLoaded', parseXML);
