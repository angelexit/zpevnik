let songsDirHandle = null,
    outputDirHandle = null,
    loadedSongs = [],
    jsonErrors = [],
    oldDatabase = [],
    generated = {
        database: null,
        artists: null,
        report: ''
    };

function slug(t) {
    return (t || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

function normalizePath(p) {
    return (p || '').replace(/\\/g, '/').replace(/^songs\//i, '').replace(/^\//, '');
}

function basename(p) {
    return normalizePath(p).split('/').pop();
}

function log(msg) {
    const el = document.getElementById('logPreview');
    el.textContent += '[' + new Date().toLocaleTimeString() + '] ' + msg + '\n';
}

function setText(id, txt, cls) {
    const e = document.getElementById(id);
    e.textContent = txt;
    e.className = 'hint ' + (cls || 'muted');
}
async function pickSongsFolder() {
    try {
        songsDirHandle = await window.showDirectoryPicker({
            mode: 'read'
        });
        setText('songsStatus', 'Složka vybrána: ' + songsDirHandle.name, '');
        log('Vybrána složka songs: ' + songsDirHandle.name);
    } catch (e) {
        setText('songsStatus', 'Výběr složky zrušen.', 'warn');
    }
}
async function pickOutputFolder() {
    try {
        outputDirHandle = await window.showDirectoryPicker({
            mode: 'readwrite'
        });
        setText('outputStatus', 'Výstupní složka: ' + outputDirHandle.name, '');
        log('Vybrána výstupní složka: ' + outputDirHandle.name);
    } catch (e) {
        setText('outputStatus', 'Výstupní složka není vybraná. Použije se stažení.', 'warn');
    }
}
async function loadOldDatabase(e) {
    const f = e.target.files[0];
    if (!f) return;
    try {
        oldDatabase = JSON.parse(await f.text());
        setText('oldDbStatus', 'Načteno původní database.json: ' + oldDatabase.length + ' položek', '');
        log('Načten starý database.json');
    } catch (err) {
        setText('oldDbStatus', 'Chyba čtení database.json: ' + err.message, 'bad');
    }
}
async function walk(dir, path = '') {
    let out = [];
    for await (const [name, h] of dir.entries()) {
        if (h.kind === 'file' && name.toLowerCase().endsWith('.json')) out.push({
            handle: h,
            rel: path + name,
            name
        });
        else if (h.kind === 'directory') out = out.concat(await walk(h, path + name + '/'));
    }
    return out;
}
async function scanSongs() {
    if (!songsDirHandle) {
        setText('scanStatus', 'Nejdřív vyber složku songs.', 'bad');
        return;
    }
    loadedSongs = [];
    jsonErrors = [];
    generated = {
        database: null,
        artists: null,
        report: ''
    };
    document.getElementById('logPreview').textContent = '';
    try {
        const files = await walk(songsDirHandle);
        document.getElementById('statFound').textContent = files.length;
        log('Nalezeno JSON souborů: ' + files.length);
        for (const item of files) {
            try {
                const file = await item.handle.getFile();
                const song = JSON.parse(await file.text());
                loadedSongs.push({
                    file: item.rel,
                    name: item.name,
                    lastModified: file.lastModified,
                    song
                });
            } catch (err) {
                jsonErrors.push({
                    file: item.rel,
                    error: err.message
                });
                log('CHYBA ' + item.rel + ': ' + err.message);
            }
        }
        updateStats();
        renderSongsList();
        setText('scanStatus', 'Hotovo. OK: ' + loadedSongs.length + ', chyby: ' + jsonErrors.length, jsonErrors.length ? 'warn' : '');
        buildAllPreviews();
    } catch (err) {
        setText('scanStatus', 'Chyba skenu: ' + err.message, 'bad');
        log('FATÁLNÍ CHYBA: ' + err.message);
    }
}

function updateStats() {
    const artists = new Set(loadedSongs.map(x => x.song.artistKey || slug(x.song.artist)));
    document.getElementById('statOk').textContent = loadedSongs.length;
    document.getElementById('statArtists').textContent = artists.size;
    document.getElementById('statErrors').textContent = jsonErrors.length;
}

function renderSongsList() {
    const div = document.getElementById('songsPreview');
    let html = '<div class="row head"><div>Soubor</div><div>Interpret</div><div>Píseň</div><div>Status</div><div>Přehráno</div></div>';
    for (const x of loadedSongs.sort((a, b) => (a.song.artist || '').localeCompare(b.song.artist || '', 'cs') || (a.song.title || '').localeCompare(b.song.title || '', 'cs'))) {
        const st = typeof x.song.status === 'string' ? x.song.status : (x.song.status?.state || 'needs_review');
        const cls = st === 'ok' ? 'ok' : st === 'needs_rework' ? 'badp' : 'warnp';
        const played = x.song.played === true || x.song.playback?.played === true;
        html += `<div class="row"><div>${x.file}</div><div>${x.song.artist||'-'}</div><div>${x.song.title||'-'}</div><div><span class="pill ${cls}">${st}</span></div><div><span class="pill ${played?'ok':'mutedp'}">${played?'přehráno':'nepřehráno'}</span></div></div>`;
    }
    for (const e of jsonErrors) {
        html += `<div class="row"><div>${e.file}</div><div colspan="4"><span class="pill badp">${e.error}</span></div></div>`;
    }
    div.innerHTML = html;
}

function makeDatabase() {
    return loadedSongs.map(x => {
        const s = x.song;
        const aK = s.artistKey || slug(s.artist);
        const alK = slug(s.album || 'nezname');
        const statusState = typeof s.status === 'string' ? s.status : (s.status?.state || 'needs_review');
        const playedValue = s.played === true || s.playback?.played === true;
        return {
            file: basename(x.file),
            artistKey: aK,
            artist: s.artist || '',
            title: s.title || '',
            album: s.album || '',
            year: s.year || '',
            cover: `img/covers/${aK}-${alK}.jpg`,
            status: statusState,
            played: playedValue
        };
    }).sort((a, b) => a.artist.localeCompare(b.artist, 'cs') || a.title.localeCompare(b.title, 'cs'));
}

function makeArtists() {
    const map = new Map();
    for (const x of loadedSongs) {
        const s = x.song;
        const aK = s.artistKey || slug(s.artist);
        if (!map.has(aK)) map.set(aK, {
            artistKey: aK,
            artist: s.artist || '',
            count: 0,
            cover: `img/interprets/${aK}.jpg`
        });
        map.get(aK).count++;
    }
    return Array.from(map.values()).sort((a, b) => a.artist.localeCompare(b.artist, 'cs'));
}

function makeReport() {
    const lines = [];
    lines.push('ZPĚVNÍK EXPORT REPORT');
    lines.push('Vytvořeno: ' + new Date().toLocaleString());
    lines.push('='.repeat(50));
    lines.push('Songů OK: ' + loadedSongs.length);
    lines.push('Chybné JSON: ' + jsonErrors.length);
    lines.push('');
    const groups = {
        needs_review: [],
        needs_rework: [],
        not_played: [],
        missing_cover_note: [],
        missing_title: [],
        missing_artist: []
    };
    for (const x of loadedSongs) {
        const s = x.song;
        const name = (s.artist || '-') + ' – ' + (s.title || '-') + ' [' + x.file + ']';
        if ((typeof s.status === 'string' ? s.status : (s.status?.state || 'needs_review')) === 'needs_review') groups.needs_review.push(name + ' | ' + (s.status?.issues || []).join(', ') + ' | ' + (s.status?.note || ''));
        if ((typeof s.status === 'string' ? s.status : (s.status?.state || '')) === 'needs_rework') groups.needs_rework.push(name + ' | ' + (s.status?.issues || []).join(', ') + ' | ' + (s.status?.note || ''));
        if (!(s.played === true || s.playback?.played === true)) groups.not_played.push(name);
        if ((s.status?.note || '').toLowerCase().includes('obrázek') || (s.status?.note || '').toLowerCase().includes('obal')) groups.missing_cover_note.push(name + ' | ' + s.status.note);
        if (!s.title) groups.missing_title.push(x.file);
        if (!s.artist) groups.missing_artist.push(x.file);
    }
    if (oldDatabase.length) {
        const oldSet = new Set(oldDatabase.map(i => i.file));
        const newSet = new Set(loadedSongs.map(i => i.file));
        const added = [...newSet].filter(x => !oldSet.has(x));
        const removed = [...oldSet].filter(x => !newSet.has(x));
        lines.push('NOVÉ SONGY OPROTI DATABASE');
        lines.push(...(added.length ? added.map(x => '- ' + x) : ['- žádné']));
        lines.push('');
        lines.push('CHYBÍ OPROTI DATABASE');
        lines.push(...(removed.length ? removed.map(x => '- ' + x) : ['- žádné']));
        lines.push('');
    }
    const section = (title, arr) => {
        lines.push(title);
        lines.push('-'.repeat(title.length));
        lines.push(...(arr.length ? arr.map(x => '- ' + x) : ['- nic']));
        lines.push('');
    };
    section('🟠 LEHKÁ ÚPRAVA', groups.needs_review);
    section('🔴 PŘEDĚLAT', groups.needs_rework);
    section('🎸 NEPŘEHRÁNO', groups.not_played);
    section('🖼️ POZNÁMKA K OBALU', groups.missing_cover_note);
    section('❌ CHYBNÉ JSON SOUBORY', jsonErrors.map(e => e.file + ' | ' + e.error));
    return lines.join('\n');
}

function buildAllPreviews() {
    generated.database = makeDatabase();
    generated.artists = makeArtists();
    generated.report = makeReport();
    document.getElementById('databasePreview').textContent = JSON.stringify(generated.database, null, 2);
    document.getElementById('artistsPreview').textContent = JSON.stringify(generated.artists, null, 2);
    document.getElementById('reportPreview').textContent = generated.report;
}
async function writeFile(name, content, type = 'application/json') {
    if (outputDirHandle) {
        const fh = await outputDirHandle.getFileHandle(name, {
            create: true
        });
        const w = await fh.createWritable();
        await w.write(content);
        await w.close();
        log('Zapsáno do výstupní složky: ' + name);
        return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], {
        type
    }));
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        URL.revokeObjectURL(a.href);
        a.remove();
    }, 1000);
    log('Staženo: ' + name);
}
async function ensureData() {
    if (!loadedSongs.length) await scanSongs();
    buildAllPreviews();
}
async function generateDatabase() {
    await ensureData();
    await writeFile('database.json', JSON.stringify(generated.database, null, 2));
}
async function generateArtists() {
    await ensureData();
    await writeFile('artists.json', JSON.stringify(generated.artists, null, 2));
}
async function generateReport() {
    await ensureData();
    await writeFile('ZPEVNIK_REPORT.txt', generated.report, 'text/plain');
}
async function generateAll() {
    await ensureData();
    await writeFile('database.json', JSON.stringify(generated.database, null, 2));
    await writeFile('artists.json', JSON.stringify(generated.artists, null, 2));
    await writeFile('ZPEVNIK_REPORT.txt', generated.report, 'text/plain');
}

function showPreview(which, btn) {
    document.querySelectorAll('.smalltab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    ['songs', 'database', 'artists', 'report', 'log'].forEach(id => {
        document.getElementById(id + 'Preview').style.display = id === which ? (id === 'songs' ? 'block' : 'block') : 'none';
    });
}

function resetAll() {
    songsDirHandle = null;
    outputDirHandle = null;
    loadedSongs = [];
    jsonErrors = [];
    oldDatabase = [];
    generated = {
        database: null,
        artists: null,
        report: ''
    };
    ['statFound', 'statOk', 'statArtists', 'statErrors'].forEach(id => document.getElementById(id).textContent = '0');
    setText('songsStatus', 'Čekám na složku songs...', 'muted');
    setText('outputStatus', 'Volitelné. Bez výběru se soubory stáhnou.', 'muted');
    setText('oldDbStatus', 'Volitelné pro porovnání nových/chybějících songů.', 'muted');
    setText('scanStatus', 'Nejdřív vyber složku songs.', 'muted');
    document.getElementById('songsPreview').innerHTML = '';
    document.getElementById('databasePreview').textContent = '';
    document.getElementById('artistsPreview').textContent = '';
    document.getElementById('reportPreview').textContent = '';
    document.getElementById('logPreview').textContent = '';
}