let songs = [];
let currentSong = null;
let transposeStep = 0;
let fontSize = 17;
let chordsVisible = true;
let scrollInterval = null;

const FILE_ID = '1AyQnmtBzJhTWTPkHzXiqUKYyhRTUA0ZY'; 
const URL = `https://corsproxy.io/?https://docs.google.com/uc?export=download&id=${FILE_ID}`;

function parseXML() {
  fetch(URL)
    .then(res => res.text())
    .then(xmlText => {
      const parser = new DOMParser();
      const xml = parser.parseFromString(xmlText, 'application/xml');
      const songNodes = xml.querySelectorAll('song');
      
      songs = Array.from(songNodes).map((song, index) => {
        const authorTag = song.querySelector('author')?.textContent || "";
        const songNumber = parseInt(authorTag.replace(/\D/g, '')) || (index + 1);
        
        // OPRAVA: V tvojom XML je názov v atribúte <song title="...">
        return {
          id: songNumber,
          title: song.getAttribute('title') || "Bez názvu",
          text: song.querySelector('songtext')?.textContent.trim() || ""
        };
      });

      songs.sort((a, b) => a.id - b.id);
      displayPiesne(songs);
    })
    .catch(err => {
      document.getElementById('piesne-list').innerText = "Chyba pripojenia. Skús obnoviť stránku.";
    });
}

function displayPiesne(list) {
  const listDiv = document.getElementById('piesne-list');
  if(!listDiv) return;
  listDiv.innerHTML = list.map(s => `
    <div onclick='openSong(${s.id})'>
      <span style="color: #00bfff; font-weight: bold; margin-right: 8px;">${s.id}.</span> ${s.title}
    </div>
  `).join('');
}

function openSong(id) {
  const s = songs.find(x => x.id === id);
  if(!s) return;
  currentSong = s;
  transposeStep = 0;
  
  document.getElementById('song-list').style.display = 'none';
  document.getElementById('song-detail').style.display = 'block';
  document.getElementById('song-title').textContent = s.id + ". " + s.title;
  
  renderSong();
  window.scrollTo(0,0);
}

function renderSong() {
  if(!currentSong) return;
  let txt = currentSong.text.replace(/\n\s*\n\s*\n/g, '\n\n');
  txt = txt.replace(/\[(.*?)\]/g, (match, chord) => {
    if(!chordsVisible) return '';
    return `<span class="chord">${transposeChord(chord, transposeStep)}</span>`;
  });
  const contentDiv = document.getElementById('song-content');
  contentDiv.innerHTML = txt;
  contentDiv.style.fontSize = fontSize + 'px';
}

// FUNKCIA PRE ŠÍPKY (Predchádzajúca / Nasledujúca)
function navigateSong(direction) {
  const currentIndex = songs.findIndex(s => s.id === currentSong.id);
  const nextIndex = currentIndex + direction;
  if (nextIndex >= 0 && nextIndex < songs.length) {
    openSong(songs[nextIndex].id);
  }
}

// OPRAVA LITURGIE: Hľadá pieseň podľa mena v zozname
function openLiturgieSong(name) {
  const s = songs.find(x => x.title.toLowerCase().includes(name.toLowerCase()));
  if(s) {
    openSong(s.id);
  } else {
    alert("Pieseň '" + name + "' sa v spevníku nenašla.");
  }
}

function closeSong() {
  document.getElementById('song-list').style.display = 'block';
  document.getElementById('song-detail').style.display = 'none';
  stopScroll();
}

function transposeChord(chord, step) {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'B', 'H'];
  return chord.replace(/[A-H][#b]?/g, (match) => {
    let n = match === 'Bb' || match === 'Hb' ? 'B' : match;
    let idx = notes.indexOf(n);
    if(idx === -1) return match;
    let newIdx = (idx + step) % 12;
    while(newIdx < 0) newIdx += 12;
    return notes[newIdx];
  });
}

function startScroll(speed) {
  stopScroll();
  if(speed === 0) return;
  scrollInterval = setInterval(() => { window.scrollBy(0, 1); }, 120 - (speed * 30));
}
function stopScroll() { clearInterval(scrollInterval); }
function transposeSong(step) { transposeStep += step; renderSong(); }
function changeFontSize(step) { fontSize += step; renderSong(); }
function toggleChords() { chordsVisible = !chordsVisible; renderSong(); }

document.addEventListener('DOMContentLoaded', () => {
  parseXML();
  const sInp = document.getElementById('search');
  if(sInp) {
    sInp.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      displayPiesne(songs.filter(s => s.title.toLowerCase().includes(q) || s.id.toString().includes(q)));
    });
  }
});
