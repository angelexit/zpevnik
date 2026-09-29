import { updateTuningOptions } from './instruments.js';
import { applySongVisualSettings } from './settings.js';
import { repaginateSong } from './pagination.js';

function initSongToolbarSettings(settings) {
    const songContent = document.getElementById('songContent');

    const instrumentSelect = document.getElementById('instrumentSelect');
    const tuningSelect = document.getElementById('tuningSelect');
    const handedSelect = document.getElementById('handedSelect');
    const transposeSelect = document.getElementById('transposeSelect');
    const dualChordToggle = document.getElementById('dualChordToggle');
    const capoSlider = document.getElementById('capoSlider');

    const fontFamilySelect = document.getElementById('fontFamilySelect');
    const fontSizeSlider = document.getElementById('fontSizeSlider');
    const fontHeightSlider = document.getElementById('fontHeightSlider');
    const fontWidthSlider = document.getElementById('fontWidthSlider');

    const darkModeToggle = document.getElementById('darkModeToggle');
    const highlightChorusToggle = document.getElementById('highlightChorusToggle');
    const compactSectionsToggle = document.getElementById('compactSectionsToggle');
    const sectionBordersToggle = document.getElementById('sectionBordersToggle');
    const chordColorSelect = document.getElementById('chordColorSelect');

    if (!songContent) return;

    applySongVisualSettings(settings);

    document.body.classList.toggle('dual-chords-enabled', settings.dualChords);

    if (instrumentSelect) instrumentSelect.value = settings.instrument;
    updateTuningOptions(settings.instrument, settings.tuning);
    if (tuningSelect) tuningSelect.value = settings.tuning;
    if (handedSelect) handedSelect.value = settings.handed;
    if (transposeSelect) transposeSelect.value = settings.transpose;
    if (dualChordToggle) dualChordToggle.checked = settings.dualChords;

    if (fontFamilySelect) fontFamilySelect.value = settings.fontFamily;
    if (fontSizeSlider) fontSizeSlider.value = settings.fontSize;
    if (fontHeightSlider) fontHeightSlider.value = settings.fontHeight;
    if (fontWidthSlider) fontWidthSlider.value = settings.fontWidth;

    if (darkModeToggle) darkModeToggle.checked = settings.darkMode;
    if (highlightChorusToggle) highlightChorusToggle.checked = settings.highlightChorus;
    if (compactSectionsToggle) compactSectionsToggle.checked = settings.compactSections;
    if (sectionBordersToggle) sectionBordersToggle.checked = settings.sectionBorders;
    if (chordColorSelect) chordColorSelect.value = settings.chordColor;

    if (instrumentSelect) {
        instrumentSelect.onchange = (e) => {
            const instrument = e.target.value;

            localStorage.setItem('instrument', instrument);

            updateTuningOptions(instrument);

            const tuningSelect = document.getElementById('tuningSelect');

            if (tuningSelect) {
                localStorage.setItem('tuning', tuningSelect.value);
            }
        };
    }

    if (tuningSelect) {
        tuningSelect.onchange = (e) => {
            localStorage.setItem('tuning', e.target.value);
        };
    }

    if (handedSelect) {
        handedSelect.onchange = (e) => {
            localStorage.setItem('handed', e.target.value);
        };
    }

    if (transposeSelect) {
        transposeSelect.onchange = (e) => {
            localStorage.setItem('transpose', e.target.value);
        };
    }

    if (dualChordToggle) {
        dualChordToggle.onchange = (e) => {
            localStorage.setItem('dualChords', e.target.checked);

            document.body.classList.toggle('dual-chords-enabled', e.target.checked);
        };
    }

    if (capoSlider) {
        capoSlider.oninput = (e) => {
            const capoValue = document.getElementById('capoValue');

            if (capoValue) {
                capoValue.textContent = e.target.value;
            }

            localStorage.setItem('capo', e.target.value);
        };
    }

    if (fontFamilySelect) {
        fontFamilySelect.onchange = (e) => {
            localStorage.setItem('songFontFamily', e.target.value);
            songContent.style.setProperty('--song-font-family', e.target.value);
            repaginateSong();
        };
    }

    if (fontSizeSlider) {
        fontSizeSlider.oninput = (e) => {
            const value = e.target.value;
            const valueEl = document.getElementById('fontSizeValue');

            if (valueEl) valueEl.textContent = value;

            localStorage.setItem('fontSize', value);
            songContent.style.setProperty('--song-scale', value);

            repaginateSong();
        };
    }

    if (fontHeightSlider) {
        fontHeightSlider.oninput = (e) => {
            const value = e.target.value;
            const valueEl = document.getElementById('fontHeightValue');

            if (valueEl) valueEl.textContent = value;

            localStorage.setItem('songFontHeight', value);
            songContent.style.setProperty('--song-font-height', value);

            repaginateSong();
        };
    }

    if (fontWidthSlider) {
        fontWidthSlider.oninput = (e) => {
            const value = e.target.value;
            const valueEl = document.getElementById('fontWidthValue');

            if (valueEl) valueEl.textContent = value;

            localStorage.setItem('songFontWidth', value);
            songContent.style.setProperty('--song-font-width', value);

            repaginateSong();
        };
    }

    if (darkModeToggle) {
        darkModeToggle.onchange = (e) => {
            const theme = e.target.checked ? 'dark' : 'light';

            localStorage.setItem('theme', theme);

            document.body.dataset.theme = theme;
            document.body.classList.toggle('dark-mode', theme === 'dark');

            const themeBtn = document.getElementById('themeBtn');

            if (themeBtn) {
                themeBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
            }
        };
    }

    if (highlightChorusToggle) {
        highlightChorusToggle.onchange = (e) => {
            localStorage.setItem('highlightChorus', e.target.checked);

            document.body.classList.toggle('highlight-chorus-enabled', e.target.checked);
        };
    }

    if (compactSectionsToggle) {
        compactSectionsToggle.onchange = (e) => {
            localStorage.setItem('compactSections', e.target.checked);

            document.body.classList.toggle('compact-sections-enabled', e.target.checked);

            repaginateSong();
        };
    }

    if (sectionBordersToggle) {
        sectionBordersToggle.onchange = (e) => {
            localStorage.setItem('sectionBorders', e.target.checked);

            document.body.classList.toggle('hide-section-borders', !e.target.checked);
        };
    }

    if (chordColorSelect) {
        chordColorSelect.onchange = (e) => {
            const value = e.target.value;

            localStorage.setItem('songChordColor', value);

            if (value) {
                songContent.style.setProperty('--song-chord-color', value);
            } else {
                songContent.style.removeProperty('--song-chord-color');
            }
        };
    }

    initCollapsibleToolbar('playToolbar', 'playToolbarToggle', 'playToolbarState');

    initCollapsibleToolbar('settingsToolbar', 'settingsToolbarToggle', 'settingsToolbarState');

    songContent.addEventListener('click', () => {
        collapseSongToolbars();
    });
}

function initCollapsibleToolbar(toolbarId, toggleId, stateId) {
    const toolbar = document.getElementById(toolbarId);
    const toggle = document.getElementById(toggleId);
    const state = document.getElementById(stateId);

    if (!toolbar || !toggle || !state) return;

    toggle.onclick = () => {
        toolbar.classList.toggle('collapsed');

        state.textContent = toolbar.classList.contains('collapsed') ? '▼' : '▲';
    };
}

function collapseSongToolbars() {
    const playToolbar = document.getElementById('playToolbar');
    const settingsToolbar = document.getElementById('settingsToolbar');

    const playState = document.getElementById('playToolbarState');
    const settingsState = document.getElementById('settingsToolbarState');

    if (playToolbar) {
        playToolbar.classList.add('collapsed');
    }

    if (settingsToolbar) {
        settingsToolbar.classList.add('collapsed');
    }

    if (playState) {
        playState.textContent = '▼';
    }

    if (settingsState) {
        settingsState.textContent = '▼';
    }
}
export { initSongToolbarSettings, initCollapsibleToolbar, collapseSongToolbars };
