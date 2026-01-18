let songs = [];
let currentSong = null;
let transposeStep = 0;
let fontSize = 17;
let chordsVisible = true;

const FILE_ID = '1AyQnmtBzJhTWTPkHzXiqUKYyhRTUA0ZY'; 
const URL = `https://corsproxy.io/?https://docs.google.com/uc?export=download&id=${FILE_ID}`;

function parseXML() {
  fetch(URL)
    .then(res => res.text())
    .then(xmlText => {
      const parser = new DOMParser();
      const xml = parser.parseFromString(xmlText, 'application/xml');
      const songNodes = xml.querySelectorAll('song');
      
      songs = Array.from(songNodes).map(song => {
        const authorVal = song.querySelector('author')?.textContent.trim() || "";
        const titleVal = song.querySelector('title')?.textContent.trim() || "Bez názvu";
        const songText = song.querySelector('songtext')?.textContent.trim() || "";

        // DEDUKCIA TÓNINY: Nájdeme prvý výskyt akordu v hranatých zátvorkách [ ]
        const firstChordMatch = songText.match(/\[(.*?)\]/);
        const deducedKey = firstChordMatch ? firstChordMatch[1] : "";

        let displayId = authorVal;
        let sortPriority = 1; // 1: Čísla, 2: Mariánske (M), 3: Textové ID

        if (authorVal.toUpperCase().startsWith('M')) {
          const num = authorVal.replace(/\D/g, '');
          displayId = "Mariánska " + (parseInt(num) || num);
          sortPriority = 2;
        } else if (authorVal !== "" && !/^\d+$/.test(authorVal)) {
          sortPriority = 3;
        } else if (authorVal === "") {
          sortPriority = 3;
          displayId = "---";
        }

        return {
          authorRaw: authorVal,
          displayId: displayId,
          sortPriority: sortPriority,
          title: titleVal,
          baseKey: deducedKey, // Vydedukovaná tónina
          text: songText
        };
      });

      // RADENIE: Čísla -> Mariánske -> Textové na koniec
      songs.sort((a, b) => {
        if (a.sortPriority !== b.sortPriority) return a.sortPriority - b.sortPriority;
        if (a.sortPriority === 1) return parseInt(a.authorRaw) - parseInt(b.authorRaw);
        return a.displayId.localeCompare(b.displayId, 'sk');
      });

      displayPiesne(songs);
    })
    .catch(err => {
      document.getElementById('piesne-list').innerText = "Chyba pripojenia. Skús obnoviť stránku.";
    });
}

function displayPiesne(list) {
  const listDiv = document.getElementById('piesne-list');
  if(!listDiv) return;
  listDiv.innerHTML = list.map((s, index) => `
    <div onclick='openSongByIndex(${index})'>
      <span style="color: #00bfff; font-weight: bold; margin-right: 8px;">${s.displayId}.</span> ${s.title}
    </div>
  `).join('');
}

function openSongByIndex(index) {
  const s = songs[index];
  if(!s) return;
  currentSong = { ...s, currentIndex: index };
  transposeStep = 0;
  
  document.getElementById('song-list').style.display = 'none';
  document.getElementById('song-detail').style.display = 'block';
  document.getElementById('song-title').textContent = s.displayId + ". " + s.title;
  
  // Zobrazenie vydedukovanej tóniny
  document.getElementById('base-key-display').textContent = s.baseKey ? "Pôvodná tónina: " + s.baseKey : "Pôvodná tónina: Nezistená";
  
  renderSong();
  updateTransposeLabel();
  window.scrollTo(0,0);
}

function renderSong() {
  if(!currentSong) return;
  let txt = currentSong.text.replace(/\n\s*\n\s*\n/g, '\n\n');
  txt = txt.replace(/\[(.*?)\]/g, (match, chord) => {
    if(!chordsVisible) return '';
    return `<span class="chord">${transposeChord(chord, transposeStep)}</span>`;
  });
  document.getElementById('song-content').innerHTML = txt;
  document.getElementById('song-content').style.fontSize = fontSize + 'px';
}

function navigateSong(direction) {
  const nextIdx = currentSong.currentIndex + direction;
  if (nextIdx >= 0 && nextIdx < songs.length) {
    openSongByIndex(nextIdx);
  }
}

function resetTranspose() {
  transposeStep = 0;
  updateTransposeLabel();
  renderSong();
}

function transposeSong(step) {
  transposeStep += step;
  updateTransposeLabel();
  renderSong();
}

function updateTransposeLabel() {
  const el = document.getElementById('transpose-val');
  if(el) el.textContent = (transposeStep > 0 ? "+" : "") + transposeStep;
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

function openLiturgieSong(name) {
  const idx = songs.findIndex(x => x.title.toLowerCase().includes(name.toLowerCase()));
  if(idx !== -1) openSongByIndex(idx);
}

function closeSong() {
  document.getElementById('song-list').style.display = 'block';
  document.getElementById('song-detail').style.display = 'none';
}

function changeFontSize(step) { fontSize += step; renderSong(); }
function toggleChords() { chordsVisible = !chordsVisible; renderSong(); }

document.addEventListener('DOMContentLoaded', () => {
  parseXML();
  document.getElementById('search').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = songs.map((s, i) => ({...s, originalIndex: i}))
                          .filter(s => s.title.toLowerCase().includes(q) || s.displayId.toLowerCase().includes(q));
    
    document.getElementById('piesne-list').innerHTML = filtered.map(s => `
      <div onclick='openSongByIndex(${s.originalIndex})'>
        <span style="color: #00bfff; font-weight: bold; margin-right: 8px;">${s.displayId}.</span> ${s.title}
      </div>
    `).join('');
  });
});
