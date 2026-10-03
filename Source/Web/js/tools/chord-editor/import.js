import { notice } from '../../core/desktop-api.js';
import { instruments } from './instruments.js';
export function parseChordImport(raw, fallbackName, strings) {
    raw = raw.trim().replace(/;\s*$/, '').replace(/,\s*$/, '');
    if (!raw) throw new Error('Pole JSON je prázdné. Pro načtení akordu použij výběr nahoře.');
    if (raw.startsWith('"')) raw = '{' + raw + '}';
    let full;
    try {
        full = JSON.parse(raw);
    } catch {
        throw new Error('Text není platný JSON akordu. Název jako Cmaj7 zadej do výběru nahoře.');
    }
    const keys = full && typeof full === 'object' ? Object.keys(full) : [];
    let name, data;
    if (Array.isArray(full?.ps)) {
        data = full;
        name = full.t || fallbackName;
    } else {
        if (keys.length !== 1) throw new Error('Vlož jeden akord, nikoli celou databázi.');
        name = keys[0];
        data = full[name];
    }
    if (!name || !Array.isArray(data?.ps) || !data.ps.length)
        throw new Error('Chybí název nebo pole variant ps.');
    for (const p of data.ps) {
        if (!Array.isArray(p.f) || !p.f.length)
            throw new Error('Varianta nemá žádné struny (pole f).');
        for (const f of p.f) {
            if (!Array.isArray(f) || !Number.isInteger(f[0]) || f[0] < 1 || f[0] > strings)
                throw new Error(
                    'Hmat neodpovídá počtu strun vybraného nástroje. Vyber správný druh nástroje nahoře.',
                );
            if (f[1] !== 'x' && (!Number.isInteger(f[1]) || f[1] < 0 || f[1] > 48))
                throw new Error('Neplatný pražec v importu.');
        }
    }
    return { name, data };
}
export async function importChord() {
    try {
        const { name, data } = parseChordImport(
            document.getElementById('importJson').value,
            document.getElementById('chordName').value,
            instruments[document.getElementById('instrument').value].strings,
        );
        await window.importIntoLibrary(data, name);
        notice('Akord ' + name + ' načten do editoru. Pro zápis použij Uložit akord.');
        return true;
    } catch (e) {
        notice(e.message, true);
        return false;
    }
}
