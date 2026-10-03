import { applyEmbeddedTheme } from '../shared/theme.js';
import { basename, normalizePath, slug } from '../shared/paths.js';
import {
    buildAllPreviews,
    log,
    renderSongsList,
    setText,
    showPreview,
    updateStats,
} from './view.js';
import {
    loadOldDatabase,
    pickOutputFolder,
    pickSongsFolder,
    scanSongs,
    walk,
    writeFile,
} from './files.js';
import { makeArtists, makeDatabase } from './indexes.js';
import { makeReport } from './report.js';
import {
    ensureData,
    generateAll,
    generateArtists,
    generateDatabase,
    generateReport,
    resetAll,
} from './actions.js';

Object.assign(window, {
    slug,
    normalizePath,
    basename,
    log,
    setText,
    pickSongsFolder,
    pickOutputFolder,
    loadOldDatabase,
    walk,
    scanSongs,
    updateStats,
    renderSongsList,
    makeDatabase,
    makeArtists,
    makeReport,
    buildAllPreviews,
    writeFile,
    ensureData,
    generateDatabase,
    generateArtists,
    generateReport,
    generateAll,
    showPreview,
    resetAll,
    applyEmbeddedTheme,
});

applyEmbeddedTheme(localStorage.getItem('theme') || 'dark');

window.addEventListener('message', (event) => {
    if (event.data?.type !== 'zpevnik-theme-change') return;

    applyEmbeddedTheme(event.data.theme);
});
