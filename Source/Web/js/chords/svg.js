import {instrumentTuning} from './notes.js';
import {renderDiagram} from './diagram.js';
function generateStringInstrumentSVG(name,data,instrument,tuning,meta={}){
 if(!data?.ps?.[0])return `<div class="no-svg">${escapeHtml(name)}</div>`;
 const svg=renderDiagram(name,data.ps[0],{strings:getStringCount(instrument,tuning),tuning:instrumentTuning(instrument,tuning)});
 return `<div class="chord-diagram-container" data-instrument="${escapeHtml(instrument)}" data-tuning="${escapeHtml(tuning)}" data-capo="${Number(meta.capo)||0}" data-original-chord="${escapeHtml(meta.originalChord??name)}" data-rendered-chord="${escapeHtml(name)}">${svg}</div>`;
}
function getStringCount(instrument, tuning) {
    if (instrument === 'banjo' && tuning === 'tenor') return 4;
    if (instrument === 'guitar' && tuning === 'guitar7') {
        return 7;
    }

    if (instrument === 'ukulele') {
        return 4;
    }

    if (instrument === 'mandolin') {
        return 4;
    }

    if (instrument === 'banjo' && tuning === 'banjo5') {
        return 5;
    }

    if (instrument === 'banjo' && tuning === 'banjo6') {
        return 6;
    }

    if (instrument === 'bass' && tuning === 'bass5') {
        return 5;
    }

    if (instrument === 'bass') {
        return 4;
    }

    return 6;
}

function stringToX(stringNum, stringCount, gridLeft, stringGap) {
    return gridLeft + (stringCount - stringNum) * stringGap;
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}
export { generateStringInstrumentSVG, getStringCount, stringToX, escapeHtml };
