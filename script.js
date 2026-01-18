let songs = [];
let currentSong = null;
let transposeStep = 0;
let fontSize = 17;
let chordsVisible = true;

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxEfu4yOq0BE4gcr4hOaElvVCNzvmZOSgmbeyy4gOqfIxAhBjRgzDPixYNXbn9_UoXbsw/exec'; 

function init() {
    // Okamžité načítanie z pamäte tabletu (bleskové)
    const cachedSongs = localStorage.getItem('spevnik_data');
    if (cachedSongs) {
        songs = JSON.parse(cachedSongs);
        renderList(songs);
    }

    // Načítanie čerstvých dát z Google Disku na pozadí
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
                
                let sortPriority = 4; // Ostatné
                let sortNum = 0;
                let displayId = author;

                // 1. LITURGIA (presne definované kúsky)
                const liturgiaSlova = ["pane zmiluj sa", "aleluja", "svätý", "otče náš", "baranok", "baránok"];
                if (liturgiaSlova.some(word => title.includes(word))) {
                    sortPriority = 1;
                } 
                // 2. PIESNE (čísla)
                else if (/^\d+$/.test(author)) {
                    sortPriority = 2;
                    sortNum = parseInt(author);
                }
                // 3. MARIÁNSKE (M)
                else if (author.startsWith('M')) {
                    sortPriority = 3;
                    sortNum = parseInt(author.replace(/\D/g, '')) || 0;
                    displayId = author;
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

            // Usporiadanie: Liturgia -> Čísla -> Mariánske -> Ostatné
            newSongs.sort((a, b) => {
                if (a.sortPriority !== b.sortPriority) return a.sortPriority - b.sortPriority;
                if (a.sortPriority === 2 || a.sortPriority === 3) return a.sortNum - b.sortNum;
                return a.title.localeCompare(b.title, 'sk');
            });

            // Ak sa dáta zmenili, ulož a prekresli
            if (JSON.stringify(newSongs) !== JSON.stringify(songs)) {
                songs = newSongs;
                localStorage.setItem('spevnik_data', JSON.stringify(songs));
                renderList(songs);
            }
        })
        .catch(err => console.log("Režim offline"));
}

function renderList(list) {
    const container = document.getElementById('piesne-list');
    let html = "";

    const liturgia = list.filter(s => s.sortPriority === 1);
    const piesne = list.filter(s => s.sortPriority === 2);
    const marianske = list.filter(s => s.sortPriority === 3);
    const ostatne = list.filter(s => s.sortPriority === 4);

    if (liturgia.length > 0) html += `<h3 class="section-title">Liturgia</h3>` + generateHtml(liturgia);
    if (piesne.length > 0) html += `<h3 class="section-title">Piesne</h3>` + generateHtml(piesne);
    if (marianske.length > 0) html += `<h3 class="section-title">Mariánske</h3>` + generateHtml(marianske);
    if (ostatne.length > 0) html += `<h3 class="section-title">Ostatné</h3>` + generateHtml(ostatne);
    
    container.innerHTML = html;
}

function generateHtml(items) {
    return items.map((s) => {
        const globalIdx = songs.findIndex(x => x.id === s.id);
        return `
        <div class="song-item" onclick="openSongByIndex(${globalIdx})">
            <span class="song-number">${s.displayId}.</span> ${s.title}
        </div>`;
    }).join('');
}

function openSongByIndex(index) {
    const s = songs[index];
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

function resetTranspose() { 
    transposeStep = 0; 
    document.getElementById('transpose-val').textContent = "0"; 
    renderSong(); 
}

function closeSong() { 
    document.getElementById('song-list').style.display = 'block'; 
    document.getElementById('song-detail').style.display = 'none'; 
}

function changeFontSize(s) { 
    fontSize += s; 
    renderSong(); 
}

function toggleChords() { 
    chordsVisible = !chordsVisible; 
    renderSong(); 
}

function navigateSong(d) {
    let nextIdx = currentSong.currentIndex + d;
    if (nextIdx >= 0 && nextIdx < songs.length) openSongByIndex(nextIdx);
}

document.addEventListener('DOMContentLoaded', () => {
    init();
    document.getElementById('search').addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        const filtered = songs.filter(s => s.title.toLowerCase().includes(q) || s.displayId.toLowerCase().includes(q));
        renderList(filtered);
    });
});
