import { initFretboard, renderDots, toggleNote } from './fretboard.js';
import { applyEmbeddedTheme } from '../shared/theme.js';
import { copyToClipboard, updateAll } from './output.js';
import { importChord } from './import.js';
import { renderNativeSVG } from './svg.js';

Object.assign(window, {
    initFretboard,
    toggleNote,
    renderDots,
    updateAll,
    renderNativeSVG,
    copyToClipboard,
    importChord,
    applyEmbeddedTheme,
});

initFretboard();

applyEmbeddedTheme(localStorage.getItem('theme') || 'dark');

window.addEventListener('message', (event) => {
    if (event.data?.type !== 'zpevnik-theme-change') return;

    applyEmbeddedTheme(event.data.theme);
});

import * as library from './library.js';
Object.assign(window, library);
await library.connectChordLibrary();

import * as chooser from './chooser.js';
Object.assign(window, chooser);
document.getElementById('instrumentSlot').append(document.getElementById('instrument'));
await chooser.initChooser();
