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

const SCRIPT_URL = 'TVOJA_URL_Z_GOOGLE_SCRIPTu'; // <--- DOPLŇ SVOJU URL!

function init() {
    // 1. Načítame piesne
    fetch(SCRIPT_URL)
        .then(res => res.text())
        .then(xmlText => {
            const parser = new DOMParser();
            const xml = parser.parseFromString(xmlText, 'application/xml');
            const songNodes = xml.getElementsByTagName('song');
            
            songs = Array.from(songNodes).map(song => {
                const getVal = (t) => song.getElementsByTagName(t)[0]?.textContent.trim() || "";
                const author = getVal('author');
                let sortPriority = 3;
                let sortNum = 0;
                let displayId = author;

                if (author.startsWith('M')) {
                    sortPriority = 2;
                    sortNum = parseInt(author.replace(/\D/g, '')) || 0;
                    displayId = "M " + sortNum;
                } else if (/^\d+$/.test(author)) {
                    sortPriority = 1;
                    sortNum = parseInt(author);
                    displayId = sortNum.toString();
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

            songs.sort((a, b) => {
                if (a.sortPriority !== b.sortPriority) return a.sortPriority - b.sortPriority;
                if (a.sortPriority < 3) return a.sortNum - b.sortNum;
                return a.title.localeCompare(b.title, 'sk');
            });

            // OKAMŽITE vykreslíme všetky piesne
            renderList(songs);
            // Potom načítame playlisty do menu
            loadPlaylistHeaders();
        })
        .catch(err => {
            document.getElementById('piesne-list').innerHTML = "Chyba načítania: " + err;
        });
}

function renderList(list) {
    const container = document.getElementById('piesne-list');
    
    // Ak sme v režime playlistu, pridáme hore tlačidlo na zrušenie filtra
    let html = "";
    if (isPlaylistMode) {
        html += `<button onclick="showAllSongs()" style="width:100%; margin-bottom:15px; background:#444; padding:15px;">⬅ Späť na všetky piesne</button>`;
    }

    html += list.map((s) => {
        const originalIdx = songs.findIndex(x => x.id === s.id);
        return `
        <div class="song-item">
            <div class="song-info" onclick="openSongByIndex(${originalIdx}, ${isPlaylistMode})">
                <span class="song-number">${s.displayId}.</span> ${s.title}
            </div>
            ${isAdmin ? `<button class="add-btn" onclick="addToSelection('${s.id}')">+</button>` : ''}
        </div>
    `}).join('');
    
    container.innerHTML = html;
}

function showAllSongs() {
    isPlaylistMode = false;
    currentPlaylistSongs = [];
    renderList(songs);
}

function openPlaylist(name) {
    fetch(`${SCRIPT_URL}?action=get&name=${encodeURIComponent(name)}`)
        .then(r => r.text())
        .then(idsText => {
            const ids = idsText.split(',');
            currentPlaylistSongs = ids.map(id => songs.find(s => s.id === id)).filter(x => x);
            isPlaylistMode = true;
            renderList(currentPlaylistSongs);
            window.scrollTo(0,0);
        });
}

// Ostatné funkcie (openSongByIndex, transpose, atď.) ostávajú rovnaké ako v predošlom kóde...
// ... (skopíruj si zvyšok z predchádzajúcej správy od "function unlockAdmin()...")
