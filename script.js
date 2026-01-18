// ... (začiatok zostáva rovnaký až po parseXML)

async function parseXML() {
    try {
        const res = await fetch(SCRIPT_URL + "?t=" + Date.now());
        const xmlText = await res.text();
        const xml = new DOMParser().parseFromString(xmlText, 'application/xml');
        songs = Array.from(xml.getElementsByTagName('song')).map(s => {
            const txt = s.getElementsByTagName('songtext')[0]?.textContent || "";
            const auth = s.getElementsByTagName('author')[0]?.textContent || "";
            return {
                id: s.getElementsByTagName('ID')[0]?.textContent || "",
                title: s.getElementsByTagName('title')[0]?.textContent || "Bez názvu",
                displayId: auth,
                origText: txt,
                originalKey: txt.match(/\[([A-H][#b]?[m]?)\]/)?.[1] || "?"
            };
        });

        // ŠPECIÁLNE RADENIE
        songs.sort((a, b) => {
            const idA = a.displayId;
            const idB = b.displayId;
            const isNumA = /^\d+$/.test(idA);
            const isNumB = /^\d+$/.test(idB);
            const isMarA = idA.startsWith('M');
            const isMarB = idB.startsWith('M');

            if (isNumA && !isNumB) return -1;
            if (!isNumA && isNumB) return 1;
            if (isNumA && isNumB) return parseInt(idA) - parseInt(idB);
            if (isMarA && !isMarB) return -1;
            if (!isMarA && isMarB) return 1;
            return idA.localeCompare(idB);
        });

        filteredSongs = [...songs];
        renderAllSongs();
        loadPlaylistHeaders();
    } catch (e) { document.getElementById('piesne-list').innerText = "Chyba pripojenia."; }
}

function formatSongId(id) {
    if (/^\d+$/.test(id)) return parseInt(id).toString();
    if (id.startsWith('M')) return "Mariánska " + parseInt(id.substring(1));
    return id;
}

// UPRAVENÉ UKLADANIE (BEZ WINDOW.OPEN)
async function savePlaylist() {
    const name = document.getElementById('playlist-name').value;
    if (!name || !selectedSongIds.length) return alert("Názov chýba!");
    const url = `${SCRIPT_URL}?action=save&name=${encodeURIComponent(name)}&pwd=${encodeURIComponent(adminPassword)}&content=${selectedSongIds.join(',')}`;
    try {
        const r = await fetch(url);
        alert("Uložené!");
        location.reload();
    } catch(e) { alert("Chyba pri ukladaní."); }
}

async function deletePlaylist(name) {
    if(!confirm("Zmazať "+name+"?")) return;
    const url = `${SCRIPT_URL}?action=delete&name=${encodeURIComponent(name)}&pwd=${encodeURIComponent(adminPassword)}`;
    try {
        await fetch(url);
        loadPlaylistHeaders();
    } catch(e) { alert("Chyba pri mazaní."); }
}

function sendErrorReport() {
    const name = document.getElementById('error-name').value;
    const msg = document.getElementById('error-msg').value;
    if(!msg) return alert("Napíšte chybu.");
    const btn = document.getElementById('error-btn');
    btn.innerText = "ODOSIELAM..."; btn.disabled = true;
    fetch(FORMSPREE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pieseň: currentSong.title, meno: name, správa: msg })
    }).then(() => {
        alert("Nahlásené. Vďaka!");
        document.getElementById('error-msg').value = "";
        document.getElementById('error-name').value = "";
    }).finally(() => {
        btn.innerText = "ODOSLAŤ"; btn.disabled = false;
    });
}
// ... (zvyšok funkcií ako navigateSong, transpose atď. ponechať)
