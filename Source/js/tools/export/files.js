import { exportState } from './state.js';
import { buildAllPreviews, log, renderSongsList, setText, updateStats } from './view.js';

async function pickSongsFolder() {
    try {
        exportState.songsDirHandle = await window.showDirectoryPicker({ mode: 'read' });
        setText('songsStatus', 'Složka vybrána: ' + exportState.songsDirHandle.name, '');
        log('Vybrána složka songs: ' + exportState.songsDirHandle.name);
    } catch (e) {
        setText('songsStatus', 'Výběr složky zrušen.', 'warn');
    }
}

async function pickOutputFolder() {
    try {
        exportState.outputDirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
        setText('outputStatus', 'Výstupní složka: ' + exportState.outputDirHandle.name, '');
        log('Vybrána výstupní složka: ' + exportState.outputDirHandle.name);
    } catch (e) {
        setText('outputStatus', 'Výstupní složka není vybraná. Použije se stažení.', 'warn');
    }
}

async function loadOldDatabase(e) {
    const f = e.target.files[0];
    if (!f) return;
    try {
        exportState.oldDatabase = JSON.parse(await f.text());
        setText(
            'oldDbStatus',
            'Načteno původní database.json: ' + exportState.oldDatabase.length + ' položek',
            '',
        );
        log('Načten starý database.json');
    } catch (err) {
        setText('oldDbStatus', 'Chyba čtení database.json: ' + err.message, 'bad');
    }
}

async function walk(dir, path = '') {
    let out = [];
    for await (const [name, h] of dir.entries()) {
        if (h.kind === 'file' && name.toLowerCase().endsWith('.json'))
            out.push({ handle: h, rel: path + name, name });
        else if (h.kind === 'directory') out = out.concat(await walk(h, path + name + '/'));
    }
    return out;
}

async function scanSongs() {
    if (!exportState.songsDirHandle) {
        setText('scanStatus', 'Nejdřív vyber složku songs.', 'bad');
        return;
    }
    exportState.loadedSongs = [];
    exportState.jsonErrors = [];
    exportState.generated = { database: null, artists: null, report: '' };
    document.getElementById('logPreview').textContent = '';
    try {
        const files = await walk(exportState.songsDirHandle);
        document.getElementById('statFound').textContent = files.length;
        log('Nalezeno JSON souborů: ' + files.length);
        for (const item of files) {
            try {
                const file = await item.handle.getFile();
                const song = JSON.parse(await file.text());
                exportState.loadedSongs.push({
                    file: item.rel,
                    name: item.name,
                    lastModified: file.lastModified,
                    song,
                });
            } catch (err) {
                exportState.jsonErrors.push({ file: item.rel, error: err.message });
                log('CHYBA ' + item.rel + ': ' + err.message);
            }
        }
        updateStats();
        renderSongsList();
        setText(
            'scanStatus',
            'Hotovo. OK: ' +
                exportState.loadedSongs.length +
                ', chyby: ' +
                exportState.jsonErrors.length,
            exportState.jsonErrors.length ? 'warn' : '',
        );
        buildAllPreviews();
    } catch (err) {
        setText('scanStatus', 'Chyba skenu: ' + err.message, 'bad');
        log('FATÁLNÍ CHYBA: ' + err.message);
    }
}

async function writeFile(name, content, type = 'application/json') {
    if (exportState.outputDirHandle) {
        const fh = await exportState.outputDirHandle.getFileHandle(name, { create: true });
        const w = await fh.createWritable();
        await w.write(content);
        await w.close();
        log('Zapsáno do výstupní složky: ' + name);
        return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type }));
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        URL.revokeObjectURL(a.href);
        a.remove();
    }, 1000);
    log('Staženo: ' + name);
}
export { pickSongsFolder, pickOutputFolder, loadOldDatabase, walk, scanSongs, writeFile };
