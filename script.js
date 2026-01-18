let songs = [];
let currentSong = null;
let transposeStep = 0;
let fontSize = 17;
let chordsVisible = true;
let isAdmin = false;
let selectedSongIds = [];
let adminPassword = "";
let isPlaylistMode = false;
let currentPlaylistSongs = [];

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxEfu4yOq0BE4gcr4hOaElvVCNzvmZOSgmbeyy4gOqfIxAhBjRgzDPixYNXbn9_UoXbsw/exec'; 

function init() {
    const cachedSongs = localStorage.getItem('spevnik_data');
    if (cachedSongs) {
        songs = JSON.parse(cachedSongs);
        renderList(songs);
    }

    fetch(SCRIPT_URL + "?t=" + Date.now())
        .then(res => res.text())
        .then(xmlText => {
            const parser = new DOMParser();
            const xml = parser.parseFromString(xmlText, 'application/xml');
            const songNodes = xml.getElementsByTagName('song');
            
            const newSongs = Array.from(songNodes).map(song => {
                const getVal = (t) => song.getElementsByTagName(t)[0]?.textContent.trim() || "";
                const author = getVal('author');
                const title = getVal('title').toLowerCase();
                
                let sortPriority = 4; // Predvolené: Ostatné
                let sortNum = 0;
                let displayId = author;

                // 1. LITURGIA (Pevne definované názvy)
                const liturgiaSlova = ["pane zmiluj sa", "aleluja", "svätý", "otče náš", "baránok"];
                if (liturgiaSlova.some(word => title.includes(word))) {
                    sortPriority = 1;
                } 
                // 2. PIESNE (Čísla v author)
                else if (/^\d+$/.test(author)) {
                    sortPriority = 2;
                    sortNum = parseInt(author);
                    displayId = author;
                }
                // 3. MARIÁNSKE (M v author)
                else if (author.startsWith('M')) {
                    sortPriority = 3;
                    sortNum = parseInt(author.replace(/\D/g, '')) || 0;
                    displayId = "M " + sortNum;
                }

                return {
                    id: getVal('ID'),
                    displayId: displayId,
                    sortPriority: sortPriority,
                    sortNum: sortNum,
                    title: getVal('title'),
                    text: getVal('songtext')
                };
            });

            newSongs.sort((a, b) => {
                if (a.sortPriority !== b.sortPriority) return a.sortPriority - b.sortPriority;
                if (a.sortPriority === 2 || a.sortPriority === 3) return a.sortNum - b.sortNum;
                return a.title.localeCompare(b.title, 'sk');
            });

            if (JSON.stringify(newSongs) !== JSON.stringify(songs)) {
                songs = newSongs;
                localStorage.setItem('spevnik_data', JSON.stringify(songs));
                if (!isPlaylistMode) renderList(songs);
            }
            loadPlaylistHeaders();
        })
        .catch(err => {
            if (!songs.length) document.getElementById('piesne-list').innerHTML = "Chyba načítania.";
        });
}

function renderList(list) {
    const container = document.getElementById('piesne-list');
    let html = "";

    if (isPlaylistMode) {
        html += `<button onclick="showAllSongs()" style="width:100%; margin-bottom:15px; background:#444; padding:15px; border-radius:8px; color:white; border:none; font-weight:bold;">⬅ Späť na všetky piesne</button>`;
        html += `<h3>Zvolený playlist</h3>`;
        html += generateItemsHtml(list);
    } else {
        const liturgia = list.filter(s => s.sortPriority === 1);
        const piesne = list.filter(s => s.sortPriority === 2);
        const marianske = list.filter(s => s.sortPriority === 3);
        const ostatne = list.filter(s => s.sortPriority === 4);

        if (liturgia.length > 0) html += `<h3>Liturgia</h3>` + generateItemsHtml(liturgia);
        if (piesne.length > 0) html += `<h3>Piesne</h3>` + generateItemsHtml(piesne);
        if (marianske.length > 0) html += `<h3>Mariánske</h3>` + generateItemsHtml(marianske);
        if (ostatne.length > 0) html += `<h3>Ostatné</h3>` + generateItemsHtml(ostatne);
    }
    
    container.innerHTML = html;
}

function generateItemsHtml(items) {
    return items.map((s) => {
        const originalIdx = songs.findIndex(x => x.id === s.id);
        return `
        <div class="song-item">
            <div class="song-info" onclick="openSongByIndex(${originalIdx})">
                <span class="song-number">${s.displayId}.</span> ${s.title}
            </div>
            ${isAdmin ? `<button class="add-btn" onclick="addToSelection('${s.id}')">+</button>` : ''}
        </div>`;
    }).join('');
}

// ... (Zvyšok funkcií: showAllSongs, openPlaylist, unlockAdmin, atď. zostáva rovnaký ako v predošlom kóde)

function showAllSongs() { isPlaylistMode = false; renderList(songs); }

function openPlaylist(name) {
    fetch(`${SCRIPT_URL}?action=get&name=${encodeURIComponent(name)}&t=${Date.now()}`)
        .then(r => r.text())
        .then(idsText => {
            const ids = idsText.split(',');
            currentPlaylistSongs = ids.map(id => songs.find(s => s.id === id)).filter(x => x);
            isPlaylistMode = true;
            renderList(currentPlaylistSongs);
            window.scrollTo(0,0);
        });
}

function unlockAdmin() {
    const p = prompt("Zadaj heslo pre úpravy:");
    if (p) { adminPassword = p; isAdmin = true; document.getElementById('admin-panel').style.display = 'block'; renderList(songs); }
}

function addToSelection(id) { if (!selectedSongIds.includes(id)) { selectedSongIds.push(id); renderSelection(); } }

function renderSelection() {
    const container = document.getElementById('current-selection-list');
    container.innerHTML = selectedSongIds.map((id, idx) => {
        const s = songs.find(x => x.id === id);
        return `<div class="selection-item" style="display:flex; justify-content:space-between; align-items:center; background:#333; margin:5px 0; padding:5px; border-radius:5px;">
            <span>${s.title}</span>
            <div>
                <button onclick="moveSelection(${idx}, -1)">↑</button>
                <button onclick="moveSelection(${idx}, 1)">↓</button>
                <button onclick="removeFromSelection(${idx})" style="color:red">X</button>
            </div>
        </div>`;
    }).join('');
}

function moveSelection(idx, dir) {
    const target = idx + dir;
    if (target >= 0 && target < selectedSongIds.length) {
        [selectedSongIds[idx], selectedSongIds[target]] = [selectedSongIds[target], selectedSongIds[idx]];
        renderSelection();
    }
}

function removeFromSelection(idx) { selectedSongIds.splice(idx, 1); renderSelection(); }

function savePlaylist() {
    const name = document.getElementById('playlist-name').value;
    if (!name || selectedSongIds.length === 0) return alert("Zadaj názov a vyber piesne!");
    const btn = document.getElementById('save-btn');
    btn.disabled = true; btn.textContent = "Ukladám...";
    const url = `${SCRIPT_URL}?action=save&name=${encodeURIComponent(name)}&pwd=${adminPassword}&content=${selectedSongIds.join(',')}`;
    fetch(url).then(r => r.text()).then(res => {
        alert(res); btn.disabled = false; btn.textContent = "Uložiť pre všetkých";
        if (res === "Uložené") { selectedSongIds = []; renderSelection(); loadPlaylistHeaders(); }
    });
}

function loadPlaylistHeaders() {
    fetch(`${SCRIPT_URL}?action=list&t=${Date.now()}`)
        .then(r => r.json())
        .then(data => {
            const container = document.getElementById('playlists-container');
            if (!data.length) { container.innerHTML = "Žiadne playlisty."; return; }
            container.innerHTML = data.map(p => `<div class="playlist-row"><button onclick="openPlaylist('${p.name}')">📄 ${p.name}</button>${isAdmin ? `<button onclick="deletePlaylist('${p.name}')" style="color:red; width:40px; flex-grow:0; text-align:center;">🗑️</button>` : ''}</div>`).join('');
        });
}

function deletePlaylist(name) {
    if (confirm(`Zmazať ${name}?`)) fetch(`${SCRIPT_URL}?action=delete&name=${encodeURIComponent(name)}&pwd=${adminPassword}`).then(() => loadPlaylistHeaders());
}

function openSongByIndex(index) {
    const listToUse = isPlaylistMode ? currentPlaylistSongs : songs;
    const s = listToUse[index];
    if(!s) return;
    currentSong = { ...s, currentIndex: index };
    transposeStep = 0;
    document.getElementById('song-list').style.display = 'none';
    document.getElementById('song-detail').style.display = 'block';
    document.getElementById('song-title').textContent = s.displayId + ". " + s.title;
    renderSong();
    window.scrollTo(0,0);
}

function renderSong() {
    if(!currentSong) return;
    let txt = currentSong.text.replace(/\[(.*?)\]/g, (m, c) => chordsVisible ? `<span class="chord">${transposeChord(c, transposeStep)}</span>` : '');
    document.getElementById('song-content').innerHTML = txt;
    document.getElementById('song-content').style.fontSize = fontSize + 'px';
}

function transposeChord(chord, step) {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'B', 'H'];
    return chord.replace(/[A-H][#b]?/g, (match) => {
        let n = (match === 'Bb' || match === 'Hb') ? 'B' : match;
        let idx = notes.indexOf(n);
        if(idx === -1) return match;
        let newIdx = (idx + step) % 12;
        while(newIdx < 0) newIdx += 12;
        return notes[newIdx];
    });
}

function transposeSong(s) { 
    transposeStep += s; 
    document.getElementById('transpose-val').textContent = (transposeStep > 0 ? "+" : "") + transposeStep;
    renderSong(); 
}
function resetTranspose() { transposeStep = 0; document.getElementById('transpose-val').textContent = "0"; renderSong(); }
function closeSong() { document.getElementById('song-list').style.display = 'block'; document.getElementById('song-detail').style.display = 'none'; }
function changeFontSize(s) { fontSize += s; renderSong(); }
function toggleChords() { chordsVisible = !chordsVisible; renderSong(); }

function navigateSong(d) { 
    const listToUse = isPlaylistMode ? currentPlaylistSongs : songs;
    const nextIdx = currentSong.currentIndex + d;
    if (nextIdx >= 0 && nextIdx < listToUse.length) {
        openSongByIndex(nextIdx);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    init();
    document.getElementById('search').addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        const listToSearch = isPlaylistMode ? currentPlaylistSongs : songs;
        const filtered = listToSearch.filter(s => s.title.toLowerCase().includes(q) || s.displayId.toLowerCase().includes(q));
        renderList(filtered);
    });
});
