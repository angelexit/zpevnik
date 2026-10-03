import { resetChordHistory } from './chord-text.js';
import { editorState } from './state.js';
import { $, setStatus } from './dom.js';
import { populateAlbumSelect, setAlbumValue, setArtistValue } from './metadata.js';
import {
    normalizePlayback,
    normalizeStatus,
    renderPlaybackStatus,
    renderSongStatus,
    updateCurrentStatusDetails,
} from './status.js';
import { refreshCoverPreview, updatePaths } from './covers.js';
import { renderChords } from './chords.js';
import { addSection, autoSpaceInstrumentalLine, isInstrumentalType } from './sections.js';
import { slug } from '../shared/paths.js';

function normalizeSongParts(song) {
    if (Array.isArray(song?.parts)) return song.parts;
    if (Array.isArray(song?.sections))
        return song.sections.map((p) => ({
            type: p.type || p.name || 'verse',
            text: p.text || p.content || p.lyrics || '',
        }));
    if (typeof song?.text === 'string' && song.text.trim())
        return [{ type: 'verse', text: song.text }];
    if (typeof song?.lyrics === 'string' && song.lyrics.trim())
        return [{ type: 'verse', text: song.lyrics }];
    return [];
}

function loadSongObject(song) {
    editorState.currentSongData = song || {};
    setArtistValue(song.artist || '');
    populateAlbumSelect(song.artist || '');
    $('title').value = song.title || '';
    $('year').value = song.year || '';
    setAlbumValue(song.album || '', song.year || '');
    $('key').value = song.key || '';
    $('capo').value = song.capo || 0;
    $('youtube_link').value = song.youtube_link || '';
    editorState.detectedChords = new Set(song.used_chords || []);
    editorState.manualChords = new Set((song.editor_chords || []).filter(c=>typeof c==='string' && /^[A-H][b#]?(?:mi|m|maj|dim|aug|add|sus|[0-9]|[b#][0-9])*(?:\/[A-H][b#]?)?$/.test(c)));
    $('manualChords').value = [...editorState.manualChords].join(', ');
    editorState.currentReviewStatus = normalizeStatus(song.status);
    editorState.currentPlayback = normalizePlayback(song.playback);
    renderSongStatus();
    renderPlaybackStatus();
    renderChords();
    $('sections-container').innerHTML = '';
    const parts = normalizeSongParts(song);
    if (parts.length) parts.forEach((p) => addSection(p.type, p.text));
    else addSection();
    updatePaths();
    resetChordHistory();
}

function resetEditorInputs() {
    const ok = confirm(
        'Vymazat aktuálně rozpracovaný editor? Databáze a vybrané složky zůstanou připojené.',
    );
    if (!ok) return;
    editorState.currentSongHandle = null;
    editorState.currentSongPath = '';
    editorState.revision = '';
    editorState.currentSongData = null;
    editorState.detectedChords = new Set();
    editorState.manualChords = new Set();
    $('manualChords').value = '';
    $('manualChordStatus').textContent = '';
    editorState.currentReviewStatus = normalizeStatus({
        state: 'needs_review',
        issues: [],
        note: '',
    });
    editorState.currentPlayback = normalizePlayback({ played: false });

    $('songSelect').value = '';
    setArtistValue('');
    populateAlbumSelect('');
    $('title').value = '';
    $('album').value = '';
    $('year').value = '';
    $('key').value = '';
    $('capo').value = 0;
    $('youtube_link').value = '';
    $('rawInput').value = '';
    $('cacheOutput').value = '';
    $('sections-container').innerHTML = '';
    addSection();
    $('current-file').textContent = '-';
    renderSongStatus();
    renderPlaybackStatus();
    renderChords();
    updatePaths();
    resetChordHistory();
    setStatus('loadStatus', 'Editor vyčištěn. Databáze i složky zůstaly připojené.', 'ok');
}

function clearWorkAreasForNewSong({ keepArtist = false, keepAlbum = false } = {}) {
    const oldArtist = $('artist').value;
    const oldAlbum = $('album').value;
    const oldYear = $('year').value;
    const oldArtistSelect = $('artistSelect').value;
    const oldAlbumSelect = $('albumSelect').value;

    editorState.currentSongHandle = null;
    editorState.currentSongPath = '';
    editorState.revision = '';
    editorState.currentSongData = null;
    editorState.detectedChords = new Set();
    editorState.manualChords = new Set();
    $('manualChords').value = '';
    $('manualChordStatus').textContent = '';
    editorState.currentReviewStatus = normalizeStatus({
        state: 'needs_review',
        issues: [],
        note: '',
    });
    editorState.currentPlayback = normalizePlayback({ played: false });

    $('songSelect').value = '';
    $('title').value = '';
    $('key').value = '';
    $('capo').value = 0;
    $('youtube_link').value = '';
    $('rawInput').value = '';
    $('cacheOutput').value = '';
    $('sections-container').innerHTML = '';
    addSection();
    $('current-file').textContent = '-';

    if (keepArtist) {
        setArtistValue(oldArtist);
        $('artistSelect').value = oldArtistSelect;
        populateAlbumSelect(oldArtist);
        if (keepAlbum) {
            $('albumSelect').value = oldAlbumSelect;
            $('album').value = oldAlbum;
            $('year').value = oldYear;
        } else {
            $('albumSelect').value = '';
            $('album').value = '';
            $('year').value = '';
        }
    } else {
        setArtistValue('');
        populateAlbumSelect('');
        $('album').value = '';
        $('year').value = '';
    }

    renderSongStatus();
    renderPlaybackStatus();
    renderChords();
    updatePaths();
    resetChordHistory();
    refreshCoverPreview();
}

function startSameArtistSong() {
    const artist = $('artist').value.trim();
    if (!artist) {
        setStatus(
            'loadStatus',
            'Nejdřív vyber interpreta, potom můžeš přidat další song stejného interpreta.',
            'warn',
        );
        return;
    }
    const ok = confirm(
        'Připravit nový song stejného interpreta? Zachovám interpreta a aktuální album/rok, vymažu název, střižnu a finální sekce.',
    );
    if (!ok) return;
    clearWorkAreasForNewSong({ keepArtist: true, keepAlbum: true });
    setStatus('loadStatus', `Připraven nový song pro interpreta: ${artist}`, 'ok');
    $('title').focus();
}

function startDifferentSong() {
    const ok = confirm(
        'Připravit úplně nový song? Databáze a složky zůstanou připojené, data aktuální písně se vyčistí.',
    );
    if (!ok) return;
    clearWorkAreasForNewSong({ keepArtist: false, keepAlbum: false });
    setStatus('loadStatus', 'Připraven nový song. Vyber interpreta nebo zadej vlastního.', 'ok');
    $('artistSelect').focus();
}

function buildSongObject() {
    updateCurrentStatusDetails();
    return {
        ...editorState.currentSongData,
        title: $('title').value,
        artist: $('artist').value,
        artistKey: slug($('artist').value),
        album: $('album').value,
        year: $('year').value,
        key: $('key').value,
        capo: parseInt($('capo').value) || 0,
        editor_chords: [...editorState.manualChords],
        used_chords: [
            ...new Set(
                [...document.querySelectorAll('.section-card textarea')].flatMap((t) =>
                    [...t.value.matchAll(/\[([^\]\n]+)\]/g)].map((m) => m[1]),
                ),
            ),
        ].sort(),
        youtube_link: $('youtube_link').value,
        last_modified: new Date().toISOString(),
        status: normalizeStatus(editorState.currentReviewStatus),
        playback: normalizePlayback(editorState.currentPlayback),
        source: editorState.currentSongData?.source || {
            created_by: 'Song Manager',
            generator_version: '3.3',
        },
        parts: Array.from(document.querySelectorAll('.section-card')).map((c) => {
            const type = c.querySelector('select').value;
            const text = c.querySelector('textarea').value;

            return { type, text };
        }),
    };
}
export {
    normalizeSongParts,
    loadSongObject,
    resetEditorInputs,
    clearWorkAreasForNewSong,
    startSameArtistSong,
    startDifferentSong,
    buildSongObject,
};
