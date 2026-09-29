import { api, notice, announceChange } from '../../core/desktop-api.js';
import { chordState } from './state.js';
import { initFretboard, renderDots } from './fretboard.js';
import { updateAll } from './output.js';
const $ = (id) => document.getElementById(id);
export const mapping = {
    gtr_std: 'guitar-standard',
    gtr_7: 'guitar-guitar7',
    gtr_dropd: 'guitar-dropd',
    gtr_dropc: 'guitar-dropc',
    gtr_opend: 'guitar-opend',
    gtr_openc: 'guitar-openc',
    gtr_openg: 'guitar-openg',
    uke_std: 'ukulele-standard',
    uke_bar: 'ukulele-baritone',
    mandolin: 'mandolin-standard',
    banjo_5: 'banjo-banjo5',
    banjo_6: 'banjo-banjo6',
    banjo_tenor: 'banjo-tenor',
};
let database = {},
    revision = '',
    original = '',
    entry = null,
    position = 0,
    sessionKey = '',
    ready = false,
    busy = false,
    loadedPoints = '',
    loadedPath = '';
function setBusy(value) {
    busy = value;
    for (const id of ['instrument', 'databaseChord', 'chordPosition', 'saveChordButton'])
        $(id).disabled = value;
}
const path = () => 'chords/' + mapping[$('instrument').value] + '.json';
function capture() {
    updateAll();
    const generated = JSON.parse('{' + $('output').value + '}');
    const value = Object.values(generated)[0];
    const result = structuredClone(entry || value);
    result.t = $('chordName').value.trim();
    if (JSON.stringify(chordState.chordData.points) !== loadedPoints)
        result.ps[position] = { ...result.ps[position], ...value.ps[0] };
    return result;
}
function persist() {
    if (!ready || busy) return;
    try {
        localStorage.setItem(
            sessionKey,
            JSON.stringify({
                instrument: $('instrument').value,
                original,
                entry: capture(),
                position,
                revision,
                start: $('startFret').value,
            }),
        );
    } catch (e) {
        notice('Nelze zapamatovat akord: ' + e.message, true);
    }
}
function fillList() {
    const select = $('databaseChord');
    select.replaceChildren(new Option('-- Nový akord --', ''));
    Object.keys(database)
        .sort((a, b) => a.localeCompare(b))
        .forEach((name) => select.add(new Option(name, name)));
    select.value = original;
}
function show() {
    const select = $('chordPosition');
    select.replaceChildren();
    entry.ps.forEach((p, i) =>
        select.add(new Option('Varianta ' + (i + 1) + ' · pražec ' + (p.p || 1), String(i))),
    );
    select.value = String(position);
    $('chordName').value = entry.t || original;
    const p = entry.ps[position];
    const frets = p.f.map((f) => Number(f[1])).filter((n) => n > 0);
    $('startFret').value = frets.length ? Math.max(1, Math.min(...frets)) : 1;
    initFretboard();
    chordState.loadedBarres = p.b || [];
    chordState.chordData.points = p.f.map((f) => ({
        s: f[0],
        f: f[1] === 'x' ? -1 : Number(f[1]),
        p: f[2] ?? (f[1] === 'x' ? 'X' : f[1] === 0 ? '0' : ''),
    }));
    loadedPoints = JSON.stringify(chordState.chordData.points);
    renderDots();
    updateAll();
}
export async function changeChordLibrary() {
    if (busy) return;
    setBusy(true);
    try {
        const result = await api('read?path=' + encodeURIComponent(path()));
        database = result.value;
        revision = result.revision;
        loadedPath = path();
        original = '';
        entry = null;
        position = 0;
        fillList();
        newDatabaseChord();
        $('chordDbStatus').textContent = path() + ' · ' + Object.keys(database).length + ' akordů';
    } catch (e) {
        notice(e.message, true);
    } finally {
        setBusy(false);
        persist();
    }
}
export function selectDatabaseChord() {
    if (entry) entry = capture();
    original = $('databaseChord').value;
    position = 0;
    if (!original) {
        newDatabaseChord();
        return;
    }
    entry = structuredClone(database[original]);
    show();
    persist();
}
export function selectChordPosition() {
    if (!entry) return;
    entry = capture();
    position = Number($('chordPosition').value);
    show();
    persist();
}
export function newDatabaseChord() {
    original = '';
    position = 0;
    entry = { t: '', ps: [{ p: 1, f: [], b: [] }] };
    $('databaseChord').value = '';
    chordState.loadedBarres = [];
    show();
    persist();
}
export function addChordPosition() {
    entry = capture();
    entry.ps.push({ p: 1, f: [], b: [] });
    position = entry.ps.length - 1;
    show();
    persist();
}
export function shiftFretboard() {
    const points = chordState.chordData.points;
    initFretboard();
    chordState.chordData.points = points;
    renderDots();
    updateAll();
    persist();
}
export async function saveDatabaseChord() {
    if (busy) return;
    setBusy(true);
    $('saveChordButton').disabled = true;
    try {
        if (loadedPath !== path())
            throw new Error('Nejdříve znovu načti databázi tohoto nástroje.');
        const value = capture();
        if (!value.t || !value.ps[position].f.length)
            throw new Error('Vyplň název a alespoň jednu strunu hmatu.');
        const result = await api('chord', {
            path: path(),
            name: value.t,
            original,
            entry: value,
            revision,
        });
        database = result.value;
        revision = result.revision;
        loadedPath = path();
        original = value.t;
        entry = value;
        fillList();
        show();
        announceChange();
        window.dispatchEvent(new Event('chord-database-saved'));
        $('chordDbStatus').textContent = 'Uloženo: ' + original + ' · ' + path();
        notice('✓ Akord ' + original + ' uložen. Zpěvník používá aktualizovanou databázi.');
    } catch (e) {
        notice('Neuloženo: ' + e.message, true);
    } finally {
        setBusy(false);
        $('saveChordButton').disabled = false;
        persist();
    }
}
export async function connectChordLibrary() {
    try {
        const library = await api('library');
        sessionKey = 'zpevnik-chord-editor:' + library.id;
        const draft = JSON.parse(localStorage.getItem(sessionKey) || 'null');
        if (draft && mapping[draft.instrument]) $('instrument').value = draft.instrument;
        await changeChordLibrary();
        if (draft) {
            original = draft.original;
            entry = draft.entry;
            position = draft.position;
            revision = draft.revision;
            fillList();
            show();
            $('startFret').value = draft.start || 1;
            shiftFretboard();
        }
        ready = true;
        window.__chordLibraryReady = true;
    } catch (e) {
        notice(e.message, true);
    }
}
export async function importIntoLibrary(data, name) {
    await changeChordLibrary();
    original = '';
    position = 0;
    entry = structuredClone(data);
    entry.t = name;
    show();
    persist();
}
let timer;
for (const event of ['input', 'change', 'click'])
    document.addEventListener(event, () => {
        clearTimeout(timer);
        timer = setTimeout(persist, 160);
    });
window.addEventListener('pagehide', persist);
window.addEventListener('beforeunload', persist);
