import { exportState } from './state.js';
import { scanSongs, writeFile } from './files.js';
import { buildAllPreviews, setText } from './view.js';

async function ensureData() {
    if (!exportState.loadedSongs.length) await scanSongs();
    buildAllPreviews();
}

async function generateDatabase() {
    await ensureData();
    await writeFile('database.json', JSON.stringify(exportState.generated.database, null, 2));
}

async function generateArtists() {
    await ensureData();
    await writeFile('artists.json', JSON.stringify(exportState.generated.artists, null, 2));
}

async function generateReport() {
    await ensureData();
    await writeFile('ZPEVNIK_REPORT.txt', exportState.generated.report, 'text/plain');
}

async function generateAll() {
    await ensureData();
    await writeFile('database.json', JSON.stringify(exportState.generated.database, null, 2));
    await writeFile('artists.json', JSON.stringify(exportState.generated.artists, null, 2));
    await writeFile('ZPEVNIK_REPORT.txt', exportState.generated.report, 'text/plain');
}

function resetAll() {
    exportState.songsDirHandle = null;
    exportState.outputDirHandle = null;
    exportState.loadedSongs = [];
    exportState.jsonErrors = [];
    exportState.oldDatabase = [];
    exportState.generated = { database: null, artists: null, report: '' };
    ['statFound', 'statOk', 'statArtists', 'statErrors'].forEach(
        (id) => (document.getElementById(id).textContent = '0'),
    );
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
export { ensureData, generateDatabase, generateArtists, generateReport, generateAll, resetAll };
