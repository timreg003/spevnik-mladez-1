// ... (začiatok script.js ostáva rovnaký ako predtým) ...

function renderPlaylists(d) {
    const sect = document.getElementById('playlists-section');
    if (!d || d.length === 0) { sect.innerHTML = ""; return; }
    
    // Nadpis "PLAYLISTY" je teraz v strede a s gradientom
    sect.innerHTML = '<div style="text-align:center;"><h2 class="playlist-header-title">Playlisty</h2></div>' + d.map(p => `
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid #333; padding:12px; background:#1e1e1e; margin-bottom:2px; border-radius:8px;" onclick="openPlaylist('${p.name}')">
            <span style="cursor:pointer; flex-grow:1;"><i class="fas fa-file-audio" style="color:#00bfff; margin-right:10px;"></i>${p.name}</span>
            ${isAdmin ? `<div style="display:flex; gap:20px; padding-left:10px;">
                <i class="fas fa-edit" onclick="event.stopPropagation(); editPlaylist('${p.name}')" style="color:#00bfff; cursor:pointer;"></i>
                <i class="fas fa-trash" onclick="event.stopPropagation(); deletePlaylist('${p.name}')" style="color:#ff4444; cursor:pointer;"></i>
            </div>` : ''}
        </div>`).join('');
}

function processOpenPlaylist(name, t) {
    const ids = t.split(',');
    currentModeList = ids.map(id => songs.find(s => s.id === id)).filter(x => x);
    
    // Aj pri otvorenom playliste použijeme vycentrovaný gradient nadpis
    document.getElementById('piesne-list').innerHTML = `
    <div style="text-align:center; padding:10px; border-bottom:2px solid #00bfff; margin-bottom:10px;">
        <h2 class="playlist-header-title" style="font-size:1.2em; margin:0;">${name}</h2>
        <button onclick="location.reload()" style="background:none; color:#ff4444; border:1px solid #ff4444; padding:4px 12px; border-radius:20px; cursor:pointer; margin-top:10px; font-size:0.8em;">ZAVRIEŤ PLAYLIST</button>
    </div>` +
    currentModeList.map(s => `
        <div onclick="openSongById('${s.id}')" style="padding:12px; border-bottom:1px solid #333; display:flex; justify-content:space-between; align-items:center;">
            <span><span style="color:#00bfff;font-weight:bold;">${s.displayId}.</span> ${s.title}</span>
        </div>`).join('');
}

// ... (zvyšok script.js ostáva rovnaký) ...
