let songs = [];
let currentSong = null;
let transposeStep = 0;
let fontSize = 17;
let chordsVisible = true;
let currentGroup = 'piesne';
let baseKey = 'C';

// Funkcia na načítanie XML
function parseXML() {
  console.log("Sťahujem XML...");
  fetch('export.zpk.xml')
    .then(res => {
      if (!res.ok) throw new Error('Nepodarilo sa načítať XML súbor');
      return res.text();
    })
    .then(xmlText => {
      const parser = new DOMParser();
      const xml = parser.parseFromString(xmlText, 'application/xml');
      const songNodes = xml.querySelectorAll('song');
      
      if (songNodes.length === 0) console.error("V XML sa nenašli žiadne piesne!");

      const all = Array.from(songNodes).map(song => ({
        title: song.querySelector('title')?.textContent.trim() || "Bez názvu",
        text: song.querySelector('songtext')?.textContent.trim() || ""
      }));

      // Rozdelenie na textové a číslované
      const text = all.filter(s => !/^\d+(\.\d+)?$/.test(s.title));
      const num  = all.filter(s =>  /^\d+(\.\d+)?$/.test(s.title));

      text.sort((a, b) => a.title.localeCompare(b.title, 'sk'));
      num.sort((a, b) => parseFloat(a.title) - parseFloat(b.title));

      songs = [...text, ...num];
      console.log("Načítaných piesní:", songs.length);
      displayPiesne(songs);
    })
    .catch(err => console.error("Chyba:", err));
}

function displayPiesne(list) {
  const listDiv = document.getElementById('piesne-list');
  if (!listDiv) return;
  listDiv.innerHTML = '';
  list.forEach((song, index) => {
    const div = document.createElement('div');
    div.textContent = song.title;
    div.onclick = () => {
      currentGroup = 'piesne';
      showSong(song, index);
    };
    listDiv.appendChild(div);
  });
}

function showSong(song, index) {
  currentSong = song;
  transposeStep = 0;

  const firstChordMatch = song.text.match(/\[(.*?)\]/);
  if (firstChordMatch) {
    const rootMatch = firstChordMatch[1].match(/[A-H][#b]?/);
    baseKey = rootMatch ? rootMatch[0] : 'C';
  } else {
    baseKey = 'C';
  }

  document.getElementById('song-list').style.display = 'none';
  document.getElementById('song-display').style.display = 'block';
  document.getElementById('song-title').textContent = song.title;
  updateTransposeDisplay();
  renderSong(song.text);
  window.scrollTo(0, 0);
}

function renderSong(text) {
  const contentDiv = document.getElementById('song-content');
  if (!contentDiv) return;
  
  let content = text.replace(/\[(.*?)\]/g, (match, chord) => {
    const transposed = transposeChord(chord, transposeStep);
    return chordsVisible ? `<span class="chord">${transposed}</span>` : '';
  });
  contentDiv.innerHTML = content;
}

function transposeChord(chord, steps) {
  if (steps === 0) return chord;
  const scale = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'H'];
  const rootMatch = chord.match(/^([A-H][#b]?)/);
  if (!rootMatch) return chord;

  const root = rootMatch[1];
  const suffix = chord.substring(root.length);
  const mapToIndex = {
    'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6,
    'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 10, 'H': 11, 'Cb': 11
  };

  let index = mapToIndex[root];
  if (index === undefined) return chord;

  const newIndex = (index + steps + 120) % 12;
  return scale[newIndex] + suffix;
}

function transposeSong(direction) {
  let nextStep = transposeStep + direction;
  if (nextStep >= -12 && nextStep <= 12) {
    transposeStep = nextStep;
    updateTransposeDisplay();
    renderSong(currentSong.text);
  }
}

function updateTransposeDisplay() {
  document.getElementById('base-key').textContent = baseKey;
  document.getElementById('transpose-offset').textContent = transposeStep > 0 ? `+${transposeStep}` : transposeStep;
}

function backToList() {
  document.getElementById('song-list').style.display = 'block';
  document.getElementById('song-display').style.display = 'none';
}

function toggleChords() {
  chordsVisible = !chordsVisible;
  document.getElementById('chord-toggle-text').textContent = chordsVisible ? 'Skryť akordy' : 'Zobraziť akordy';
  renderSong(currentSong.text);
}

function changeFontSize(delta) {
  fontSize = Math.max(12, Math.min(35, fontSize + delta));
  document.getElementById('song-content').style.fontSize = fontSize + 'px';
  localStorage.setItem('fontSize', fontSize);
}

// Vyhľadávanie
document.getElementById('search').addEventListener('input', e => {
  const query = e.target.value.toLowerCase();
  const filtered = songs.filter(s => s.title.toLowerCase().includes(query));
  displayPiesne(filtered);
});

// Štart aplikácie
window.addEventListener('DOMContentLoaded', () => {
  parseXML();
});
