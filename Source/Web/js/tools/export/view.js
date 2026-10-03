import { exportState } from './state.js';
import { slug } from '../shared/paths.js';
import { makeArtists, makeDatabase } from './indexes.js';
import { makeReport } from './report.js';

function log(msg) {
    const el = document.getElementById('logPreview');
    el.textContent += '[' + new Date().toLocaleTimeString() + '] ' + msg + '\n';
}

function setText(id, txt, cls) {
    const e = document.getElementById(id);
    e.textContent = txt;
    e.className = 'hint ' + (cls || 'muted');
}

function updateStats() {
    const artists = new Set(
        exportState.loadedSongs.map((x) => x.song.artistKey || slug(x.song.artist)),
    );
    document.getElementById('statOk').textContent = exportState.loadedSongs.length;
    document.getElementById('statArtists').textContent = artists.size;
    document.getElementById('statErrors').textContent = exportState.jsonErrors.length;
}

function renderSongsList() {
    const div = document.getElementById('songsPreview');
    let html =
        '<div class="row head"><div>Soubor</div><div>Interpret</div><div>Píseň</div><div>Status</div><div>Přehráno</div></div>';
    for (const x of exportState.loadedSongs.sort(
        (a, b) =>
            (a.song.artist || '').localeCompare(b.song.artist || '', 'cs') ||
            (a.song.title || '').localeCompare(b.song.title || '', 'cs'),
    )) {
        const st =
            typeof x.song.status === 'string'
                ? x.song.status
                : x.song.status?.state || 'needs_review';
        const cls = st === 'ok' ? 'ok' : st === 'needs_rework' ? 'badp' : 'warnp';
        const played = x.song.played === true || x.song.playback?.played === true;
        html += `<div class="row"><div>${x.file}</div><div>${x.song.artist || '-'}</div><div>${x.song.title || '-'}</div><div><span class="pill ${cls}">${st}</span></div><div><span class="pill ${played ? 'ok' : 'mutedp'}">${played ? 'přehráno' : 'nepřehráno'}</span></div></div>`;
    }
    for (const e of exportState.jsonErrors) {
        html += `<div class="row"><div>${e.file}</div><div colspan="4"><span class="pill badp">${e.error}</span></div></div>`;
    }
    div.innerHTML = html;
}

function buildAllPreviews() {
    exportState.generated.database = makeDatabase();
    exportState.generated.artists = makeArtists();
    exportState.generated.report = makeReport();
    document.getElementById('databasePreview').textContent = JSON.stringify(
        exportState.generated.database,
        null,
        2,
    );
    document.getElementById('artistsPreview').textContent = JSON.stringify(
        exportState.generated.artists,
        null,
        2,
    );
    document.getElementById('reportPreview').textContent = exportState.generated.report;
}

function showPreview(which, btn) {
    document.querySelectorAll('.smalltab').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    ['songs', 'database', 'artists', 'report', 'log'].forEach((id) => {
        document.getElementById(id + 'Preview').style.display =
            id === which ? (id === 'songs' ? 'block' : 'block') : 'none';
    });
}
export { log, setText, updateStats, renderSongsList, buildAllPreviews, showPreview };
