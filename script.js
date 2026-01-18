let songs = [];
let currentSong = null;
let transposeStep = 0;
let fontSize = 17;
let chordsVisible = true;
let currentGroup = 'piesne';
let baseKey = 'C';

// 1. NAČÍTANIE PIESNÍ
function parseXML() {
  fetch('export.zpk.xml')
    .then(res => {
      if (!res.ok) throw new Error('Súbor export.zpk.xml nenájdený');
      return res.text();
    })
    .then(xmlText => {
      const parser = new DOMParser();
      const xml = parser.parseFromString(xmlText, 'application/xml');
      const songNodes = xml.querySelectorAll('song');
      
      const all = Array.from(songNodes).map(song => ({
        title: song.querySelector('title')?.textContent.trim() || "Bez názvu",
        text: song.querySelector('songtext')?.textContent.trim() || ""
      }));

      const text = all.filter(s => !/^\d+(\.\d+)?$/.test(s.title));
      const num  = all.filter(s =>  /^\d+(\.\d+)?$/.test(s.title));

      text.sort((a, b) => a.title.localeCompare(b.title, 'sk'));
      num.sort((a, b) => parseFloat(a.title) - parseFloat(b.title));

      songs = [...text, ...num];
      displayPiesne(songs);
    })
    .catch(err => console.error("Chyba pri načítaní:", err));
}

function displayPiesne(list) {
  const listDiv = document.getElementById('piesne-list');
  if (!listDiv) return;
  listDiv.innerHTML = '';
  list.forEach((song) => {
    const div = document.createElement('div');
    div.textContent = song.title;
    div.onclick = () => {
      currentGroup = 'piesne';
      showSong(song);
    };
    listDiv.appendChild(div);
  });
}

// 2. ZOBRAZENIE PIESNE
function showSong(song) {
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

// 3. LOGIKA LITURGIE A NAVIGÁCIE
function openLiturgieSong(title) {
  const matches = songs.filter(s => s.title.toLowerCase() === title.toLowerCase());
  if (matches.length === 0) return;

  currentGroup = 'liturgia';
  showSong(matches[0]);
}

function getCurrentGroupSongs() {
  const poradie = ['Pane zmiluj sa', 'Aleluja', 'Svätý', 'Otče náš', 'Baránok'];
  if (currentGroup === 'liturgia') {
    return poradie
      .map(title => songs.find(s => s.title.toLowerCase() === title.toLowerCase()))
      .filter(Boolean);
  }
  return songs.filter(s => !poradie.map(p => p.toLowerCase()).includes(s.title.toLowerCase()));
}

function navigateSong(direction) {
  const group = getCurrentGroupSongs();
  const indexInGroup = group.indexOf(currentSong);
  const newIndex = indexInGroup + direction;
  
  if (newIndex >= 0 && newIndex < group.length) {
    showSong(group[newIndex]);
  }
}

// 4. TRANSPOZÍCIA (Hm oprava + limit 12)
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

// 5. POMOCNÉ FUNKCIE
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
  const content = document.getElementById('song-content');
  if (content) content.style.fontSize = fontSize + 'px';
  localStorage.setItem('fontSize', fontSize);
}

document.getElementById('search').addEventListener('input', e => {
  const query = e.target.value.toLowerCase();
  const filtered = songs.filter(s => s.title.toLowerCase().includes(query));
  displayPiesne(filtered);
});

window.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('fontSize');
  if (saved) {
    fontSize = parseInt(saved);
    const content = document.getElementById('song-content');
    if(content) content.style.fontSize = fontSize + 'px';
  }
  parseXML();
});
