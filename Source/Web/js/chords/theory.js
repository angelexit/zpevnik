const NOTES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'H'];

const NOTE_ALIASES = {
    B: 'A#',
    Bb: 'A#',
    'A#': 'A#',

    Db: 'C#',
    Eb: 'D#',
    Gb: 'F#',
    Ab: 'G#',

    Cb: 'H',
    'E#': 'F',
    Fb: 'E',
    'H#': 'C',
};

function normalizeChordName(chordName) {
    return String(chordName)
        .trim()
        .replace(/\s+/g, '')
        .replace(/moll/gi, 'mi')
        .replace(/min/gi, 'mi');
}

function transposeChord(chordName, steps = 0) {
    if (!Number.isFinite(Number(steps))) return chordName;
    if (Number(steps) % 12 === 0) return chordName;
    const note = (root) => {
        const index = NOTES_SHARP.indexOf(NOTE_ALIASES[root] || root);
        return index < 0 ? root : NOTES_SHARP[(((index + Number(steps)) % 12) + 12) % 12];
    };
    return String(chordName)
        .replace(/^([A-H](?:#|b)?)/, (_, n) => note(n))
        .replace(/\/([A-H](?:#|b)?)$/, (_, n) => '/' + note(n));
}
function noteNumber(key) {
    const root = String(key || '')
        .trim()
        .match(/^([A-H](?:#|b)?)/)?.[1];
    return NOTES_SHARP.indexOf(NOTE_ALIASES[root] || root);
}
export { NOTES_SHARP, NOTE_ALIASES, normalizeChordName, transposeChord, noteNumber };
