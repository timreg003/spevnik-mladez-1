let songs = [];
let currentSong = null;
let transposeStep = 0;
let fontSize = 17;
let chordsVisible = true;
let currentGroup = 'piesne';
let baseKey = 'C';

function parseXML() {
  fetch('export.zpk.xml')
    .then(res => res.text())
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
    });
}

function displayPiesne(list) {
  const listDiv = document.getElementById('piesne-list');
  if (!listDiv) return;
  listDiv.innerHTML = '';
  list.forEach(song => {
    const div = document.createElement('div');
    div.textContent = song.title;
    div.onclick = () => { currentGroup = 'piesne'; showSong(song); };
    listDiv.appendChild(div);
  });
}

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
  
  const chordBtn = document.getElementById('chord-btn');
  chordBtn.innerHTML = '<i class="fas fa-eye"></i>';
  chordBtn.style.color = '#fff';
  chordsVisible = true;

  updateTransposeDisplay();
  renderSong(song.text);
  window.scrollTo(0, 0);
}

function renderSong(text) {
  let content = text.replace(/\[(.*?)\]/g, (match, chord) => {
    const transposed = transposeChord(chord, transposeStep);
    return chordsVisible ? `<span class="chord">${transposed}</span>` : '';
  });
  document.getElementById('song-content').innerHTML = content;
}

function transposeChord(chord, steps) {
  if (steps === 0) return chord;
  const scale = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'H'];
  const rootMatch = chord.match(/^([A-H][#b]?)/);
  if (!rootMatch) return chord;

  const root = rootMatch[1];
  const suffix = chord.substring(root.length);
  const mapToIndex = {
    'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4,
    'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8,
    'A': 9, 'A#': 10, 'Bb': 10, 'B': 10, 'H': 11, 'Cb': 11
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

function openLiturgieSong(title) {
  const match = songs.find(s => s.title.toLowerCase() === title.toLowerCase());
  if (match) { currentGroup = 'liturgia'; showSong(match); }
}

function navigateSong(direction) {
  const poradie = ['Pane zmiluj sa', 'Aleluja', 'Svätý', 'Otče náš', 'Baránok'];
  let group = currentGroup === 'liturgia' 
    ? poradie.map(t => songs.find(s => s.title.toLowerCase() === t.toLowerCase())).filter(Boolean)
    : songs.filter(s => !poradie.map(p => p.toLowerCase()).includes(s.title.toLowerCase()));
  
  let idx = group.indexOf(currentSong);
  if (idx !== -1 && group[idx + direction]) showSong(group[idx + direction]);
}

function backToList() {
  document.getElementById('song-list').style.display = 'block';
  document.getElementById('song-display').style.display = 'none';
}

function toggleChords() {
  chordsVisible = !chordsVisible;
  const btn = document.getElementById('chord-btn');
  btn.innerHTML = chordsVisible ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
  btn.style.color = chordsVisible ? '#fff' : '#555';
  renderSong(currentSong.text);
}

function updateTransposeDisplay() {
  document.getElementById('base-key').textContent = baseKey;
  document.getElementById('transpose-offset').textContent = transposeStep > 0 ? `+${transposeStep}` : transposeStep;
}

function changeFontSize(delta) {
  fontSize = Math.max(12, Math.min(35, fontSize + delta));
  document.getElementById('song-content').style.fontSize = fontSize + 'px';
}

document.getElementById('search')?.addEventListener('input', e => {
  const query = e.target.value.toLowerCase();
  displayPiesne(songs.filter(s => s.title.toLowerCase().includes(query)));
});

window.addEventListener('DOMContentLoaded', parseXML);
