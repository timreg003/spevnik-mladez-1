let songs = [];
let currentSong = null;
let transposeStep = 0;
let fontSize = 17;

// === NAČÍTANIE PIESNÍ ===
function parseXML() {
  fetch('export.zpk.xml')
    .then(res => res.text())
    .then(xmlText => {
      const parser = new DOMParser();
      const xml = parser.parseFromString(xmlText, 'application/xml');
      const songNodes = xml.querySelectorAll('song');
      const all = Array.from(songNodes).map(song => ({
        title: song.querySelector('title').textContent.trim(),
        text: song.querySelector('songtext').textContent.trim()
      }));

      const text = all.filter(s => !/^\d+(\.\d+)?$/.test(s.title));
      const num  = all.filter(s =>  /^\d+(\.\d+)?$/.test(s.title));
      text.sort((a, b) => a.title.localeCompare(b.title, 'sk'));
      num.sort((a, b) => parseFloat(a.title) - parseFloat(b.title));
      songs = [...text, ...num];

      renderSongList(songs);
    });
}

function renderSongList(list) {
  const listDiv = document.getElementById('song-list');
  listDiv.innerHTML = '';
  list.forEach(song => {
    const div = document.createElement('div');
    div.innerHTML = `${song.title}`;
    div.style.cursor = 'pointer';
    div.style.fontSize = '19px';
    div.style.lineHeight = '1.9';
    div.style.padding = '14px';
    div.style.borderBottom = '1px solid #2a2a2a';
    div.style.borderRadius = '8px';
    div.style.marginBottom = '10px';
    div.style.background = '#1e1e1e';
    div.style.transition = 'background 0.2s';
    div.onmouseenter = () => div.style.background = '#2a2a2a';
    div.onmouseleave = () => div.style.background = '#1e1e1e';
    listDiv.appendChild(div);
  });
}

function showSong(song) {
  currentSong = song;
  transposeStep = 0;
  document.getElementById('song-list').style.display = 'none';
  document.getElementById('song-display').style.display = 'block';
  document.getElementById('song-title').textContent = song.title;
  renderSong(song.text);
}

function renderSong(text) {
  const content = text.replace(/\[(.*?)\]/g, (match, chord) => {
    const transposed = transposeChord(chord, transposeStep);
    return `<span class="chord">${transposed}</span>`;
  });
  document.getElementById('song-content').innerHTML = content;
}

function transposeChord(chord, steps) {
  const chromatic = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const root = chord.match(/[A-G][#b]?/);
  if (!root) return chord;
  const rootOnly = root[0];
  const
