let songs = [];
let currentSong = null;
let currentIndex = 0;
let transposeStep = 0;
let fontSize = 17;
let chordsVisible = true;

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
      displayPiesne(songs);
    });
}

function displayPiesne(list) {
  const listDiv = document.getElementById('piesne-list');
  listDiv.innerHTML = '';
  list.forEach((song, index) => {
    const div = document.createElement('div');
    div.textContent = song.title;
    div.onclick = () => showSong(song, index);
    listDiv.appendChild(div);
  });
}

function showSong(song, index) {
  currentSong = song;
  currentIndex = index;
  transposeStep = 0;
  document.getElementById('song-list').style.display = 'none';
  document.getElementById('song-display').style.display = 'block';
  document.getElementById('song-title').textContent = song.title;
  renderSong(song.text);
}

function showSongByTitle(title) {
  const song = songs.find(s => s.title.toLowerCase() === title.toLowerCase());
  if (song) {
    const index = songs.indexOf(song);
    showSong(song, index);
  } else {
    alert('Pieseň nebola nájdená.');
  }
}

function renderSong(text) {
  let content = text.replace(/\[(.*?)\]/g, (match, chord) => {
    const transposed = transposeChord(chord, transposeStep);
    return chordsVisible ? `<span class="chord">${transposed}</span>` : '';
  });
  document.getElementById('song-content').innerHTML = content;
}

function transposeChord(chord, steps) {
  const chromatic = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const root = chord.match(/[A-G][#b]?/);
  if (!root) return chord;
  const rootOnly = root[0];
  const suffix = chord.replace(rootOnly, '');
  const index = chromatic.indexOf(rootOnly);
  if (index === -1) return chord;
  const newIndex = (index + steps + 12) % 12;
  return chromatic[newIndex] + suffix;
}

function transposeSong(direction) {
  transposeStep += direction;
  renderSong(currentSong.text);
}

function changeFontSize(delta) {
  fontSize = Math.max(12, Math.min(28, fontSize + delta));
  document.getElementById('song-content').style.fontSize = fontSize + 'px';
  localStorage.setItem('fontSize', fontSize);
}

function toggleChords() {
  chordsVisible = !chordsVisible;
  document.getElementById('chord-toggle-text').textContent = chordsVisible ? 'Skryť akordy' : 'Zobraziť akordy';
  renderSong(currentSong.text);
}

function navigateSong(direction) {
  const newIndex = currentIndex + direction;
  if (newIndex >= 0 && newIndex < songs.length) {
    showSong(songs[newIndex], newIndex);
  }
}

function backToList() {
  document.getElementById('song-list').style.display = 'block';
  document.getElementById('song-display').style.display = 'none';
}

document.getElementById('search').addEventListener('input', e => {
  const query = e.target.value.toLowerCase();
  const filtered = songs.filter(s => s.title.toLowerCase().includes(query));
  displayPiesne(filtered);
});

document.getElementById('feedback-form').addEventListener('submit', function (e) {
  e.preventDefault();
  const songTitle = currentSong.title;
  const fromName = this.from_name.value;
  const message = this.message.value;

  emailjs.send("service_3v6xw9p", "template_d5gfd0a", {
    song_title: songTitle,
    from_name: fromName,
    message: message,
    to_email: "timotejreguly@gmail.com"
  }).then(() => {
    alert('Ďakujeme za správu!');
    this.reset();
  }, () => {
    alert('Chyba pri odosielaní.');
  });
});

window.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('fontSize');
  if (saved) {
    fontSize = parseInt(saved);
    document.getElementById('song-content').style.fontSize = fontSize + 'px';
  }
  parseXML();
});
