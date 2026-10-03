import { editorState as state } from './state.js';
import { $, setStatus } from './dom.js';
import { populateAlbumSelect, populateArtistSelect } from './metadata.js';
import { buildSongObject, loadSongObject } from './song.js';
import { api, notice, announceChange, libraryDirectory } from '../../core/desktop-api.js';
let sessionKey = '',
    ready = false,
    saving = false;
export function rememberEditor() {
    if (!ready) return;
    try {
        localStorage.setItem(
            sessionKey,
            JSON.stringify({
                song: buildSongObject(),
                file: state.currentSongPath,
                revision: state.revision,
                raw: $('rawInput').value,
                cache: $('cacheOutput').value,
            }),
        );
    } catch (e) {
        notice('Rozpracované úpravy se nepodařilo zapamatovat: ' + e.message, true);
    }
}
async function refreshDatabase() {
    const library = await api('library');
    state.currentDb = library.database;
    const select = $('songSelect');
    select.replaceChildren(new Option('-- Vyber píseň --', ''));
    [...new Map(state.currentDb.map((s) => [s.file, s])).values()]
        .sort(
            (a, b) =>
                a.artist.localeCompare(b.artist, 'cs') || a.title.localeCompare(b.title, 'cs'),
        )
        .forEach((s) => select.add(new Option(`[${s.artist}] ${s.title}`, s.file)));
    select.disabled = false;
    select.value = state.currentSongPath || '';
    populateArtistSelect();
    setStatus('dbStatus', `${state.currentDb.length} záznamů · ${library.directory}`, 'ok');
    return library;
}
export async function connectLibrary() {
    try {
        const library = await refreshDatabase();
        sessionKey = 'zpevnik-editor:' + library.id;
        state.songsDirHandle = libraryDirectory('songs');
        state.coversDirHandle = libraryDirectory('img/covers');
        await indexDirectory(state.songsDirHandle);
        setStatus('folderStatus', 'songs/ je připojena automaticky.', 'ok');
        setStatus('coverFolderStatus', 'img/covers/ je připojena automaticky.', 'ok');
        const draft = JSON.parse(localStorage.getItem(sessionKey) || 'null');
        if (draft) {
            state.currentSongPath = draft.file || '';
            state.revision = draft.revision || '';
            loadSongObject(draft.song);
            $('songSelect').value = state.currentSongPath;
            $('current-file').textContent = state.currentSongPath || 'Nová píseň';
            $('rawInput').value = draft.raw || '';
            $('cacheOutput').value = draft.cache || '';
            setStatus('loadStatus', 'Obnovena poslední rozpracovaná píseň.', 'ok');
        }
        ready = true;
        window.__libraryReady = true;
    } catch (e) {
        notice('Knihovnu nelze připojit: ' + e.message, true);
    }
}
export async function pickSongsFolder() {
    await connectLibrary();
}
export async function indexDirectory(dir, prefix = '') {
    state.fileHandleMap.clear();
    for await (const [name, handle] of dir.entries()) state.fileHandleMap.set(name, handle);
}
export function findSongHandle(file) {
    return state.fileHandleMap.get(file.replace(/^songs\//, ''));
}
export function handleDbImport() {
    notice('Editor používá datovou složku nastavenou v aplikaci.');
}
export async function autoLoadSelectedSong() {
    const file = $('songSelect').value;
    if (!file) return;
    try {
        const result = await api(
            'read?path=' + encodeURIComponent('songs/' + file.replace(/^songs\//, '')),
        );
        state.currentSongPath = file;
        state.currentSongHandle = findSongHandle(file);
        state.revision = result.revision;
        loadSongObject(result.value);
        $('current-file').textContent = file;
        setStatus('loadStatus', 'Načteno: ' + file, 'ok');
        rememberEditor();
    } catch (e) {
        notice(e.message, true);
    }
}
export async function loadSongContent(e) {
    try {
        const file = e.target.files[0];
        if (!file) return;
        const song = JSON.parse(await file.text());
        state.currentSongPath = '';
        state.currentSongHandle = null;
        state.revision = '';
        loadSongObject(song);
        $('songSelect').value = '';
        $('current-file').textContent = 'Import: ' + file.name;
        setStatus('loadStatus', 'Import připraven jako nová píseň do songs/.', 'ok');
        rememberEditor();
    } catch (e) {
        notice(e.message, true);
    }
}
export async function saveSongDirect() {
    if (saving) return;
    saving = true;
    document.querySelector('.container').inert = true;
    const button = document.getElementById('saveSongButton');
    if (button) button.disabled = true;
    try {
        const result = await api('song', {
            file: state.currentSongPath || '',
            revision: state.revision || '',
            song: buildSongObject(),
        });
        state.currentSongPath = result.file;
        state.revision = result.revision;
        state.currentSongData = result.song;
        rememberEditor();
        announceChange();
        $('current-file').textContent = result.file;
        setStatus('loadStatus', 'Uloženo: songs/' + result.file, 'ok');
        notice('✓ Uloženo do songs/' + result.file + '\nSeznam písní byl aktualizován.');
        try {
            await refreshDatabase();
            loadSongObject(result.song);
        } catch (e) {
            notice('Píseň je uložená, ale seznam se nepodařilo obnovit: ' + e.message, true);
        }
        return result;
    } catch (e) {
        notice('Neuloženo: ' + e.message, true);
        setStatus('loadStatus', e.message, 'bad');
        return null;
    } finally {
        saving = false;
        document.querySelector('.container').inert = false;
        if (button) button.disabled = false;
    }
}
export function previewSong() {
    try {
        rememberEditor();
        const key = 'zpevnik-preview:' + crypto.randomUUID();
        localStorage.setItem(key, JSON.stringify(buildSongObject()));
        window.open('/index.html?preview=' + encodeURIComponent(key), '_blank');
    } catch (e) {
        notice('Náhled nelze otevřít: ' + e.message, true);
    }
}
export function downloadSong() {
    return saveSongDirect();
}
let timer;
for (const event of ['input', 'change', 'click'])
    document.addEventListener(event, () => {
        clearTimeout(timer);
        timer = setTimeout(rememberEditor, 150);
    });
window.addEventListener('pagehide', rememberEditor);
window.addEventListener('beforeunload', rememberEditor);
