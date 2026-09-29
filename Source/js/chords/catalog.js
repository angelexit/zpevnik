import { normalizeChordName } from './theory.js';
const CHORD_DATABASES = { guitar: {}, ukulele: {}, mandolin: {}, banjo: {}, bass: {}, piano: {} };
const keys = [
    'guitar-standard',
    'guitar-guitar7',
    'guitar-dropd',
    'guitar-dropc',
    'guitar-opend',
    'guitar-openc',
    'guitar-openg',
    'ukulele-standard',
    'ukulele-baritone',
    'mandolin-standard',
    'banjo-banjo5',
    'banjo-banjo6',
    'banjo-tenor',
];
await Promise.all(
    keys.map(async (key) => {
        const response = await fetch('/data/chords/' + key + '.json', { cache: 'no-store' });
        if (!response.ok) throw new Error('Nelze načíst databázi akordů: ' + key);
        const [instrument, tuning] = key.split('-');
        CHORD_DATABASES[instrument][tuning] = await response.json();
    }),
);
function getChordDatabase(instrument, tuning) {
    const instrumentGroup = CHORD_DATABASES[instrument];

    if (!instrumentGroup) return null;

    return instrumentGroup[tuning] || instrumentGroup.standard || null;
}

function findChordData(database, chordName) {
    return (
        database[chordName] ||
        database[normalizeChordName(chordName)] ||
        database[chordName.replace('B', 'A#')] ||
        database[chordName.replace('A#', 'B')] ||
        null
    );
}
export { CHORD_DATABASES, getChordDatabase, findChordData };
