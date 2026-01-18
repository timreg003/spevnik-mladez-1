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

/* ================== XML ================== */
async function parseXML() {
    try {
        const res = await fetch(SCRIPT_URL + '?t=' + Date.now());
        const xmlText = await res.text();
        const xml = new DOMParser().parseFromString(xmlText, 'application/xml');
        const nodes = xml.getElementsByTagName('song');

        songs = [...nodes].map(s => {
            const text = s.getElementsByTagName('songtext')[0]?.textContent.trim() || "";
            return {
                id: s.getElementsByTagName('ID')[0]?.textContent.trim(),
                title: s.getElementsByTagName('title')[0]?.textContent.trim(),
                displayId: s.getElementsByTagName('author')[0]?.textContent.trim(),
                origText: text,
                originalKey: (text.match(/\[([A-H][#b]?[m]?)\]/) || [])[1] || '?'
            };
        });

        filteredSongs = [...songs];
        renderAllSongs();
        loadPlaylistHeaders();
    } catch (e) {
        document.getElementById('piesne-list').innerHTML = 'Chyba pri načítaní: ' + e.message;
    }
}

/* ================== RENDER ================== */
function renderAllSongs() {
    const el = document.getElementById('piesne-list');
    currentModeList = filteredSongs;
    el.innerHTML = filteredSongs.map(s => {
        const isSelected = selectedSongIds.includes(s.id) ? 'border: 1px solid #00bfff;' : '';
        return `
        <div style="display:flex; justify-content:space-between; align-items:center; ${isSelected}" onclick="openSongById('${s.id}')">
            <span><span style="color:#00bfff;font-weight:bold;">${s.displayId}.</span> ${s.title}</span>
            ${isAdmin ? `<button onclick="event.stopPropagation(); addToSelection('${s.id}')" style="background:#333; border-radius:4px; padding:4px 8px;">+</button>` : ''}
        </div>`;
    }).join('');
}

function filterSongs() {
    const t = document.getElementById('search').value.toLowerCase();
    filteredSongs = songs.filter(s => s.title.toLowerCase().includes(t) || s.displayId.toLowerCase().includes(t));
    renderAllSongs();
}

/* ================== SONG DETAIL ================== */
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
    
    renderSong();
    window.scrollTo(0,0);
}

function closeSong() {
    document.getElementById('song-list').style.display = 'block';
    document.getElementById('song-detail').style.display = 'none';
}

function renderSong() {
    let text = currentSong.origText;
    if (transposeStep !== 0) {
        text = text.replace(/\[(.*?)\]/g, (match, chord) => `[${transposeChord(chord, transposeStep)}]`);
    }
    if (!chordsVisible) text = text.replace(/\[.*?\]/g, '');
    
    const content = document.getElementById('song-content');
    content.innerHTML = text.replace(/\[(.*?)\]/g, '<span class="chord">$1</span>');
    content.style.fontSize = fontSize + 'px';
}

/* ================== TRANSPOZÍCIA ================== */
function transposeChord(chord, step) {
    return chord.replace(/[A-H][#b]?/g, (note) => {
        let idx = scale.indexOf(note.replace('B', 'B').replace('H', 'H')); 
        if (note === 'B') idx = 10;
        if (note === 'H') idx = 11;
        if (idx === -1) return note;
        let newIdx = (idx + step) % 12;
        while (newIdx < 0) newIdx += 12;
        return scale[newIdx];
    });
}

function transposeSong(dir) {
    transposeStep += dir;
    document.getElementById('transpose-val').innerText = (transposeStep > 0 ? "+" : "") + transposeStep;
    renderSong();
}

function resetTranspose() {
    transposeStep = 0;
    document.getElementById('transpose-val').innerText = "0";
    renderSong();
}

function toggleChords() {
    chordsVisible = !chordsVisible;
    renderSong();
}

function changeFontSize(dir) {
    fontSize += dir;
    renderSong();
}

function navigateSong(dir) {
    const index = currentModeList.findIndex(s => s.id === currentSong.id);
    const next = currentModeList[index + dir];
    if (next) openSongById(next.id);
}

/* ================== ADMIN LOGIKA ================== */
function unlockAdmin() {
    const p = prompt('Heslo:');
    if (p) {
        adminPassword = p;
        isAdmin = true;
        document.getElementById('admin-panel').style.display = 'block';
        renderAllSongs();
    }
}

function addToSelection(id) {
    const idx = selectedSongIds.indexOf(id);
    if (idx === -1) selectedSongIds.push(id);
    else selectedSongIds.splice(idx, 1);
    
    const selDiv = document.getElementById('selected-list');
    selDiv.innerText = selectedSongIds.length > 0 ? "Vybraté: " + selectedSongIds.join(', ') : "Žiadne vybraté piesne";
    renderAllSongs();
}

function savePlaylist() {
    const name = document.getElementById('playlist-name').value;
    if (!name || !selectedSongIds.length) return alert('Chýba názov alebo piesne');
    window.open(`${SCRIPT_URL}?action=save&name=${encodeURIComponent(name)}&pwd=${adminPassword}&content=${selectedSongIds.join(',')}`,
      '_blank','width=1,height=1');
    setTimeout(loadPlaylistHeaders, 2000);
}

function loadPlaylistHeaders() {
    fetch(`${SCRIPT_URL}?action=list&t=${Date.now()}`)
        .then(r => r.json())
        .then(d => {
            const sect = document.getElementById('playlists-section');
            if (d.length === 0) {
                sect.innerHTML = "";
                return;
            }
            sect.innerHTML = '<h2>PLAYLISTY</h2>' + d.map(p => 
                `<div onclick="openPlaylist('${p.name}')">📄 ${p.name}</div>`
            ).join('');
        })
        .catch(e => console.log("Zatiaľ žiadne playlisty"));
}

function openPlaylist(name) {
    fetch(`${SCRIPT_URL}?action=get&name=${encodeURIComponent(name)}`)
        .then(r => r.text())
        .then(t => {
            const ids = t.split(',');
            currentModeList = ids.map(id => songs.find(s => s.id === id)).filter(x => x);
            document.getElementById('piesne-list').innerHTML = 
                `<div style="color:#666; margin-bottom:10px;">Program: <b>${name}</b> | <a href="#" onclick="location.reload()" style="color:#00bfff;">Zrušiť</a></div>` +
                currentModeList.map(s => `
                <div onclick="openSongById('${s.id}')">
                    <span style="color:#00bfff;font-weight:bold;">${s.displayId}.</span> ${s.title}
                </div>`).join('');
            window.scrollTo(0,0);
        });
}

document.addEventListener('DOMContentLoaded', parseXML);
