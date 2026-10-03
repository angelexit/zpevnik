import { $, escapeHtml, openChordEditor, openTab } from './dom.js';
import {
    collectSongsFromDirectory,
    generateIndexes,
    generateIndexesFromSelectedFolder,
    pickIndexerFolder,
    pickIndexerOutputFolder,
    saveIndexOutputs,
    useEditorSongsFolderForIndexer,
} from './indexer.js';
import {
    getSelectedStatusIssues,
    normalizePlayback,
    normalizeStatus,
    renderPlaybackStatus,
    renderSongStatus,
    setPlaybackStatus,
    setSongStatus,
    updateCurrentStatusDetails,
} from './status.js';
import {
    addSection,
    autoSpaceInstrumentalLine,
    isInstrumentalType,
    lineLooksInstrumental,
    normalizeInstrumentalForEdit,
} from './sections.js';
import { applyEmbeddedTheme } from '../shared/theme.js';
import { basename, normalizePath, slug } from '../shared/paths.js';
import {
    getAlbumListForArtist,
    handleAlbumSelectChange,
    handleArtistSelectChange,
    handleCustomAlbumInput,
    handleCustomArtistInput,
    populateAlbumSelect,
    populateArtistSelect,
    setAlbumValue,
    setArtistValue,
} from './metadata.js';
import {
    autoLoadSelectedSong,
    downloadSong,
    findSongHandle,
    handleDbImport,
    indexDirectory,
    loadSongContent,
    pickSongsFolder,
    saveSongDirect,
} from './files.js';
import {
    findCoverHandle,
    getCoverBaseName,
    imageFileToJpegBlob,
    pickCoverImage,
    pickCoversFolder,
    refreshCoverPreview,
    setCoverEmpty,
    updatePaths,
} from './covers.js';
import {
    buildSongObject,
    clearWorkAreasForNewSong,
    loadSongObject,
    normalizeSongParts,
    resetEditorInputs,
    startDifferentSong,
    startSameArtistSong,
} from './song.js';
import {
    buildChordName,
    buildChordQuickPicker,
    getDetectedChordList,
    insertBuiltChordIntoSection,
    insertChordIntoSection,
    processToCache,
    refreshChordPickers,
    renderChords,
    setChordBuilderAccidental,
    setChordBuilderQuality,
    setChordBuilderPart,
} from './chords.js';
import { downloadFileSafe, writeTextFileToDir } from './downloads.js';

Object.assign(window, {
    slug,
    normalizePath,
    basename,
    openTab,
    openChordEditor,
    populateArtistSelect,
    handleArtistSelectChange,
    setArtistValue,
    handleCustomArtistInput,
    getAlbumListForArtist,
    populateAlbumSelect,
    handleAlbumSelectChange,
    handleCustomAlbumInput,
    setAlbumValue,
    pickSongsFolder,
    pickCoversFolder,
    indexDirectory,
    findSongHandle,
    handleDbImport,
    autoLoadSelectedSong,
    loadSongContent,
    normalizeStatus,
    normalizePlayback,
    setPlaybackStatus,
    renderPlaybackStatus,
    setSongStatus,
    getSelectedStatusIssues,
    updateCurrentStatusDetails,
    renderSongStatus,
    normalizeSongParts,
    loadSongObject,
    getCoverBaseName,
    updatePaths,
    setCoverEmpty,
    findCoverHandle,
    refreshCoverPreview,
    imageFileToJpegBlob,
    pickCoverImage,
    processToCache,
    renderChords,
    getDetectedChordList,
    buildChordName,
    buildChordQuickPicker,
    refreshChordPickers,
    setChordBuilderAccidental,
    setChordBuilderQuality,
    setChordBuilderPart,
    insertBuiltChordIntoSection,
    insertChordIntoSection,
    isInstrumentalType,
    lineLooksInstrumental,
    autoSpaceInstrumentalLine,
    normalizeInstrumentalForEdit,
    addSection,
    escapeHtml,
    resetEditorInputs,
    clearWorkAreasForNewSong,
    startSameArtistSong,
    startDifferentSong,
    buildSongObject,
    saveSongDirect,
    downloadSong,
    collectSongsFromDirectory,
    pickIndexerFolder,
    pickIndexerOutputFolder,
    useEditorSongsFolderForIndexer,
    generateIndexesFromSelectedFolder,
    writeTextFileToDir,
    downloadFileSafe,
    saveIndexOutputs,
    generateIndexes,
    applyEmbeddedTheme,
});

$('bulkFiles').onchange = async (e) => {
    try {
        const files = Array.from(e.target.files);
        await generateIndexes(
            files.map((f) => ({ fileLike: f, rel: f.webkitRelativePath || f.name, handle: null })),
        );
    } catch (err) {
        console.error(err);
        $('indexer-status').textContent =
            'CHYBA při ručním generování: ' + (err && err.message ? err.message : err);
    }
};

renderSongStatus();

addSection();

applyEmbeddedTheme(localStorage.getItem('theme') || 'dark');

window.addEventListener('message', (event) => {
    if (event.data?.type !== 'zpevnik-theme-change') return;

    applyEmbeddedTheme(event.data.theme);
});

import { connectLibrary, previewSong, rememberEditor } from './files.js';
window.previewSong = previewSong;
window.rememberEditor = rememberEditor;
await connectLibrary();

import { mountChordText, resetChordHistory } from './chord-text.js';
mountChordText(document.getElementById('cacheOutput'));
resetChordHistory();
