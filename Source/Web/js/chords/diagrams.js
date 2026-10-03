import { findChordData, getChordDatabase } from './catalog.js';
import { normalizeChordName, transposeChord } from './theory.js';
import { escapeHtml, generateStringInstrumentSVG } from './svg.js';

function getChordDiagram(chordName, instrument = 'guitar', tuning = 'standard', options = {}) {
    if (!chordName) {
        return `<div class="no-svg">Neznámý akord</div>`;
    }

    const transposeSteps = Number(
        options.transposeSteps ?? localStorage.getItem('transposeSteps') ?? 0,
    );

    const capo = Number(options.capo ?? localStorage.getItem('capo') ?? 0);

    const originalChord = normalizeChordName(chordName);

    const renderedChord = transposeSteps
        ? transposeChord(originalChord, transposeSteps)
        : originalChord;

    if (instrument === 'piano') {
        return `
            <div class="no-svg">
                🎹 Piano ${escapeHtml(renderedChord)} zatím není připravené
            </div>
        `;
    }

    const database = getChordDatabase(instrument, tuning);

    if (!database) {
        return `
            <div class="no-svg">
                ${escapeHtml(instrument)} / ${escapeHtml(tuning)} zatím nemá databázi
            </div>
        `;
    }

    const chordData = findChordData(database, renderedChord);

    if (!chordData) {
        return `
            <div class="no-svg">
                ${escapeHtml(renderedChord)}
                <small>${escapeHtml(instrument)} / ${escapeHtml(tuning)}</small>
            </div>
        `;
    }

    return generateStringInstrumentSVG(renderedChord, chordData, instrument, tuning, {
        originalChord,
        transposeSteps,
        capo,
    });
}
export { getChordDiagram };
