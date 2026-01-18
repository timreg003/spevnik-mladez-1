let songs = [];
let currentSong = null;
let transposeStep = 0;
let fontSize = 17;
let chordsVisible = true;

// Tvoj overený funkčný odkaz
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxEfu4yOq0BE4gcr4hOaElvVCNzvmZOSgmbeyy4gOqfIxAhBjRgzDPixYNXbn9_UoXbsw/exec';

function parseXML() {
  fetch(SCRIPT_URL)
    .then(res => res.text())
    .then(xmlText => {
      const parser = new DOMParser();
      const xml = parser.parseFromString(xmlText, 'application/xml');
      
      // Hľadáme značky <song> (ak ich tvoj XML používa, čo v tomto exporte zvyčajne býva)
      const songNodes = xml.querySelectorAll('song');
      
      if (songNodes.length === 0) {
        document.getElementById('piesne-list').innerText = "V XML sa nenašli žiadne piesne (značka <song>).";
        return;
      }

      songs = Array.from(songNodes).map(song => {
        const titleVal = song.querySelector('title')?.textContent.trim() || "Bez názvu";
        const authorVal = song.querySelector('author')?.textContent.trim() || "";
        const songText = song.querySelector('songtext')?.textContent.trim() || "";

        // Automatická dedukcia tóniny z prvého akordu [ ]
        const firstChordMatch = songText.match(/\[(.*?)\]/);
        const deducedKey = firstChordMatch ? firstChordMatch[1] : "";

        let displayId = authorVal;
        let sortPriority = 1; 
        let internalSortNum = 0;

        // Radenie Mariánskych piesní a čísel
        if (authorVal.toUpperCase().startsWith('M')) {
          const num = parseInt(authorVal.replace(/\D/g, '')) || 0;
          displayId = "Mariánska " + num;
          sortPriority = 2;
          internalSortNum = num; 
        } else if (authorVal !== "" && /^\d+$/.test(authorVal)) {
          sortPriority = 1;
          internalSortNum = parseInt(authorVal);
        } else {
          sortPriority = 3;
          displayId = authorVal || "---";
        }

        return {
          displayId: displayId,
          sortPriority: sortPriority,
          sortNum: internalSortNum,
          title: titleVal,
          baseKey: deducedKey,
          text: songText
        };
      });

      // Zoradenie zoznamu
      songs.sort((a, b) => {
        if (a.sortPriority !== b.sortPriority) return a.sortPriority - b.sortPriority;
        if (a.sortPriority === 1 || a.sortPriority === 2) return a.sortNum - b.sortNum;
        return a.displayId.localeCompare(b.displayId, 'sk');
      });

      displayPiesne(songs);
    })
    .catch(err => {
      console.error("Chyba:", err);
      document.getElementById('piesne-list').innerText = "Chyba pri načítaní XML zo skriptu.";
    });
}

// Zvyšok funkcií (displayPiesne, openSongByIndex, renderSong, atď.) zostáva rovnaký ako predtým
