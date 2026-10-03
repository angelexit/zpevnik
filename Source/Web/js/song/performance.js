import { transposeChord, noteNumber, NOTES_SHARP } from '../chords/theory.js';
import { TUNINGS_BY_INSTRUMENT } from './instruments.js';
import { repaginateSong } from './pagination.js';
let current = null;
const $ = (id) => document.getElementById(id);
function tunings() {
    const inst = $('secondInstrument').value,
        select = $('secondTuning');
    select.replaceChildren();
    for (const [value, label] of TUNINGS_BY_INSTRUMENT[inst]) select.add(new Option(label, value));
    const saved = localStorage.getItem('secondTuning');
    if ([...select.options].some((o) => o.value === saved)) select.value = saved;
}
export function initPerformance(song) {
    const sourceCapo=Math.max(0,Math.min(12,Number(song.capo)||0));
    const writtenKey=noteNumber(song.key);
    const source=writtenKey<0?-1:(writtenKey+sourceCapo)%12;
    const identity = (song.artist || '') + '|' + (song.title || '');
    const signature=JSON.stringify([song.key,sourceCapo]);
    const savedIsCurrent=localStorage.getItem('performance-source-v2:'+identity)===signature;
    current = { source, sourceCapo, identity, mode: localStorage.getItem('capo-mode:' + identity) || 'key', lastCapo: 0 };
    const transpose = $('transposeSelect');
    transpose.replaceChildren(new Option('Původní tónina', 'original'));
    for (const n of NOTES_SHARP)
        transpose.add(
            new Option(n + (String(song.key).match(/(?:mi|m|min|moll)$/) ? ' moll' : ''), n),
        );
    const saved = savedIsCurrent ? localStorage.getItem('target-key:' + identity) : null;
    if (saved && [...transpose.options].some((o) => o.value === saved)) transpose.value = saved;
    transpose.disabled = source < 0;
    transpose.title = source < 0 ? 'V editoru nejprve vyplň tóninu písně.' : '';
    const second = $('secondInstrument');
    second.value = localStorage.getItem('secondInstrument') || 'guitar';
    tunings();
    $('secondCapo').value = localStorage.getItem('secondCapo') || '0';
    const mainCapo = $('capoSlider');
    mainCapo.value = (savedIsCurrent ? localStorage.getItem('capo:' + identity) : null) ?? String(current.sourceCapo);
    current.lastCapo = Number(mainCapo.value);
    $('capoMode').value = current.mode;
    const change = () => {
        localStorage.setItem('performance-source-v2:'+identity,signature);
        localStorage.setItem('capo:' + identity, mainCapo.value);
        localStorage.setItem('capo', mainCapo.value);
        localStorage.setItem('target-key:' + identity, transpose.value);
        localStorage.setItem('dualChords', $('dualChordToggle').checked);
        localStorage.setItem('secondInstrument', second.value);
        localStorage.setItem('secondTuning', $('secondTuning').value);
        localStorage.setItem('secondCapo', $('secondCapo').value);
        updatePerformance();
        repaginateSong();
    };
    mainCapo.oninput = () => {
        if (current.mode === 'shapes' && current.source >= 0) {
            const pitch = transpose.value === 'original' ? current.source : noteNumber(transpose.value);
            transpose.value = NOTES_SHARP[(pitch + Number(mainCapo.value) - current.lastCapo + 24) % 12];
        }
        current.lastCapo = Number(mainCapo.value);
        change();
    };
    $('capoMode').disabled = source < 0;
    $('capoMode').title = source < 0 ? 'Nejprve vyplň tóninu písně v editoru.' : '';
    $('capoMode').onchange = () => {
        current.mode = $('capoMode').value;
        localStorage.setItem('capo-mode:' + identity, current.mode);
        change();
    };
    transpose.onchange = change;
    $('dualChordToggle').onchange = change;
    $('secondCapo').oninput = change;
    $('secondTuning').onchange = change;
    second.onchange = () => {
        tunings();
        change();
    };
    for (const id of ['instrumentSelect', 'tuningSelect']) {
        const old = $(id).onchange;
        $(id).onchange = (e) => {
            old?.(e);
            change();
        };
    }
    updatePerformance();
}
export function updatePerformance() {
    if (!current) return;
    const grid = $('songContent');
    if (!grid) return;
    const target = $('transposeSelect').value,
        delta =
            target === 'original' || current.source < 0 ? 0 : noteNumber(target) - current.source;
    const dual = $('dualChordToggle').checked;
    document.body.classList.toggle('dual-chords-enabled', dual);
    $('secondSettings').hidden = !dual;
    const capos = [Number($('capoSlider').value), Number($('secondCapo').value)];
    $('capoValue').textContent = capos[0];
    $('secondCapoValue').textContent = capos[1];
    const roots = [grid, ...(grid.originalCards || [])];
    for (const root of roots)
        for (const node of root.querySelectorAll('[data-original]')) {
            const row = node.classList.contains('chord-second') ? 1 : 0;
            node.textContent = transposeChord(
                node.dataset.original,
                delta + current.sourceCapo - capos[row],
            );
            node.dataset.instrument = $(row ? 'secondInstrument' : 'instrumentSelect').value;
            node.dataset.tuning = $(row ? 'secondTuning' : 'tuningSelect').value;
            node.dataset.capo = String(capos[row]);
        }
    $('performanceLegend').textContent =
        (current.source < 0
            ? 'Tónina není vyplněná'
            : `Znějící tónina: ${target === 'original' ? String(currentSongKey()) : target}`) +
        ` · 1. řada: capo ${capos[0]}` +
        (dual ? ` · 2. řada (modrozelená): capo ${capos[1]}` : '');
}
function currentSongKey() {
    return current.source < 0 ? '?' : NOTES_SHARP[current.source];
}
