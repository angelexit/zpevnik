import { normalizeStoredInstrument, normalizeStoredTuning } from './instruments.js';

function getSongSettings() {
    const savedTheme = localStorage.getItem('theme') || document.body.dataset.theme || 'light';

    const rawInstrument = localStorage.getItem('instrument') || 'guitar';
    const instrument = normalizeStoredInstrument(rawInstrument);
    const tuning = normalizeStoredTuning(
        instrument,
        localStorage.getItem('tuning') || rawInstrument || 'standard',
    );

    localStorage.setItem('instrument', instrument);
    localStorage.setItem('tuning', tuning);

    return {
        instrument,
        tuning,
        handed: localStorage.getItem('handed') || 'right',
        capo: localStorage.getItem('capo') || '0',
        dualChords: localStorage.getItem('dualChords') === 'true',
        transpose: localStorage.getItem('transpose') || 'C',

        fontFamily: localStorage.getItem('songFontFamily') || '"Roboto Mono"',
        fontSize: localStorage.getItem('fontSize') || '100',
        fontHeight: localStorage.getItem('songFontHeight') || '100',
        fontWidth: localStorage.getItem('songFontWidth') || '100',

        darkMode: savedTheme === 'dark',

        highlightChorus: localStorage.getItem('highlightChorus') === 'true',
        compactSections: localStorage.getItem('compactSections') === 'true',

        sectionBorders: localStorage.getItem('sectionBorders') !== 'false',

        chordFrames: localStorage.getItem('songChordFrames') === 'true',
        secondChordFrames: localStorage.getItem('songSecondChordFrames') === 'true',
        secondChordColor: localStorage.getItem('songSecondChordColor') || '',
        chordColor: localStorage.getItem('songChordColor') || '',
    };
}

function applySongVisualSettings(settings) {
    const songContent = document.getElementById('songContent');

    if (!songContent) return;

    songContent.style.setProperty('--song-font-family', settings.fontFamily);
    songContent.style.setProperty('--song-scale', settings.fontSize);
    songContent.style.setProperty('--song-font-height', settings.fontHeight);
    songContent.style.setProperty('--song-font-width', settings.fontWidth);

    if (settings.chordColor) {
        songContent.style.setProperty('--song-chord-color', settings.chordColor);
    } else {
        songContent.style.removeProperty('--song-chord-color');
    }

    songContent.style.setProperty('--song-second-chord-color', settings.secondChordColor || (settings.darkMode ? '#2bc7bd' : '#008b8b'));
    document.body.classList.toggle('second-chord-frames-enabled', settings.secondChordFrames);
    document.body.classList.toggle('chord-frames-enabled', settings.chordFrames);
    document.body.classList.toggle('highlight-chorus-enabled', settings.highlightChorus);
    document.body.classList.toggle('compact-sections-enabled', settings.compactSections);
    document.body.classList.toggle('hide-section-borders', !settings.sectionBorders);
}
export { getSongSettings, applySongVisualSettings };
