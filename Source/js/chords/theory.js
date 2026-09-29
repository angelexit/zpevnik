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
    const match = chordName.match(/^([A-H](?:#|b)?)(.*)$/);

    if (!match) return chordName;

    let root = match[1];
    const suffix = match[2] || '';

    root = NOTE_ALIASES[root] || root;

    const index = NOTES_SHARP.indexOf(root);

    if (index === -1) return chordName;

    const newIndex = (index + steps + NOTES_SHARP.length) % NOTES_SHARP.length;

    return NOTES_SHARP[newIndex] + suffix;
}
export { NOTES_SHARP, NOTE_ALIASES, normalizeChordName, transposeChord };
