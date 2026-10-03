import { api, notice } from '../../core/desktop-api.js';
import { mapping, changeChordLibrary, newDatabaseChord, selectDatabaseChord } from './library.js';
import { updateAll } from './output.js';
const $ = (id) => document.getElementById(id);
let databases = {},
    generation = 0;
export function matchingName(db, name) {
    if (Object.hasOwn(db, name)) return name;
    const alternatives = [
        name.replace(/^([A-H][#b]?)mi(?=\d|$)/, '$1m'),
        name.replace(/^([A-H][#b]?)m(?=\d|$)/, '$1mi'),
    ];
    return alternatives.find((n) => Object.hasOwn(db, n)) || null;
}
function rows() {
    return [...$('instrument').options].map((o) => ({
        key: o.value,
        label: o.textContent,
        group: o.parentElement.label || 'Nástroj',
    }));
}
export async function refreshAvailability() {
    const current = ++generation;
    const results = await Promise.allSettled(
        Object.entries(mapping).map(async ([key, file]) => [
            key,
            (await api('read?path=chords/' + file + '.json')).value,
        ]),
    );
    if (current !== generation) return;
    databases = {};
    for (const result of results)
        if (result.status === 'fulfilled') databases[result.value[0]] = result.value[1];
    renderAvailability();
}
export function renderAvailability() {
    const name = $('lookupName').value.trim();
    const body = $('availabilityBody');
    body.replaceChildren();
    for (const row of rows()) {
        const db = databases[row.key];
        const matched = db ? matchingName(db, name) : null;
        const count = matched
            ? (db[matched].ps || []).filter((p) => Array.isArray(p.f) && p.f.length).length
            : 0;
        const tr = document.createElement('tr');
        tr.dataset.instrument = row.key;
        tr.dataset.count = String(count);
        const label = document.createElement('td');
        label.textContent = row.label;
        const status = document.createElement('td');
        status.textContent = !db
            ? 'Nelze načíst'
            : count
              ? `${count} hmatů${matched !== name ? ' (' + matched + ')' : ''}`
              : 'Chybí';
        status.style.color = !db ? '#a15c00' : count ? '#168252' : '#b14b4b';
        const action = document.createElement('td');
        const button = document.createElement('button');
        button.textContent = count ? 'Otevřít' : 'Doplnit';
        button.disabled = !db || !name;
        button.onclick = () => loadChosenChord(row.key);
        action.append(button);
        tr.append(label, status, action);
        body.append(tr);
    }
}
export function buildLookupChord() {
    $('lookupName').value =
        $('lookupRoot').value + $('lookupAccidental').value + $('lookupQuality').value;
    renderAvailability();
}
export function filterInstrumentTypes() {
    const group = $('instrumentGroup').value;
    const options = [...$('instrument').options];
    for (const o of options) o.hidden = o.parentElement.label !== group;
    const option = options.find((o) => !o.hidden);
    if (option) {
        $('instrument').value = option.value;
        changeChordLibrary();
    }
}
export async function loadChosenChord(key = $('instrument').value) {
    try {
        const name = $('lookupName').value.trim();
        if (!name) throw new Error('Vyber základní tón a typ akordu nebo napiš jeho název.');
        $('instrument').value = key;
        $('instrumentGroup').value = rows().find((r) => r.key === key).group;
        for (const o of $('instrument').options)
            o.hidden = o.parentElement.label !== $('instrumentGroup').value;
        await changeChordLibrary();
        const response = await api('read?path=chords/' + mapping[key] + '.json');
        databases[key] = response.value;
        const match = matchingName(response.value, name);
        if (match) {
            $('databaseChord').value = match;
            selectDatabaseChord();
            notice('Načten akord ' + match + '.');
        } else {
            newDatabaseChord();
            $('chordName').value = name;
            updateAll();
            notice('Akord ' + name + ' v této databázi chybí. Můžeš doplnit hmat a uložit jej.');
        }
        renderAvailability();
    } catch (e) {
        notice(e.message, true);
    }
}
export async function initChooser() {
    const group = $('instrumentGroup');
    for (const name of [...new Set(rows().map((r) => r.group))]) group.add(new Option(name, name));
    group.value = rows().find((r) => r.key === $('instrument').value)?.group || 'Kytara';
    $('lookupName').value = $('chordName').value || 'C';
    const parts = $('lookupName').value.match(/^([A-H])([#b]?)(.*)$/);
    if (parts) {
        $('lookupRoot').value = parts[1];
        $('lookupAccidental').value = parts[2];
        const q = parts[3] === 'm' ? 'mi' : parts[3];
        if ([...$('lookupQuality').options].some((o) => o.value === q))
            $('lookupQuality').value = q;
    }
    await refreshAvailability();
}
window.addEventListener('chord-database-saved', refreshAvailability);

window.addEventListener('storage', (e) => {
    if (e.key === 'zpevnik-library-change') refreshAvailability();
});
