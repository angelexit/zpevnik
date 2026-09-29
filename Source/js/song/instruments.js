const TUNINGS_BY_INSTRUMENT = {
    guitar: [
        ['standard', 'Kytara 6 strun'],
        ['guitar7', 'Kytara 7 strun'],
        ['dropd', 'Drop D'],
        ['dropc', 'Drop C'],
        ['opend', 'Open D'],
        ['openc', 'Open C'],
        ['openg', 'Open G'],
    ],
    ukulele: [
        ['standard', 'Koncertní / soprán / tenor'],
        ['baritone', 'Baryton'],
    ],
    mandolin: [['standard', 'Standard']],
    banjo: [
        ['banjo5', 'Banjo 5 strun'],
        ['banjo6', 'Banjo 6 strun'],
        ['tenor', 'Banjo tenor'],
    ],
    bass: [
        ['bass4', 'Baskytara 4 struny'],
        ['bass5', 'Baskytara 5 strun'],
    ],
    piano: [['standard', 'Standard']],
};

function normalizeStoredInstrument(value) {
    switch (value) {
        case 'guitar6':
        case 'guitar7':
            return 'guitar';
        case 'ukulele_baritone':
            return 'ukulele';
        case 'banjo5':
        case 'banjo6':
            return 'banjo';
        case 'mandolin':
        case 'ukulele':
        case 'bass':
        case 'piano':
        case 'guitar':
            return value;
        default:
            return 'guitar';
    }
}

function normalizeStoredTuning(instrument, value) {
    if (value === 'guitar6') return 'standard';
    if (value === 'guitar7') return 'guitar7';
    if (value === 'ukulele_baritone') return 'baritone';
    if (value === 'mandolin') return 'standard';

    const tunings = TUNINGS_BY_INSTRUMENT[instrument] || TUNINGS_BY_INSTRUMENT.guitar;
    const values = tunings.map((item) => item[0]);

    return values.includes(value) ? value : tunings[0][0];
}

function updateTuningOptions(instrument, selectedTuning = null) {
    const tuningSelect = document.getElementById('tuningSelect');
    if (!tuningSelect) return;

    const tunings = TUNINGS_BY_INSTRUMENT[instrument] || TUNINGS_BY_INSTRUMENT.guitar;

    tuningSelect.innerHTML = tunings
        .map(
            ([value, label]) => `
        <option value="${value}">${label}</option>
    `,
        )
        .join('');

    const values = tunings.map((item) => item[0]);

    tuningSelect.value = values.includes(selectedTuning) ? selectedTuning : tunings[0][0];

    localStorage.setItem('tuning', tuningSelect.value);
}
export {
    TUNINGS_BY_INSTRUMENT,
    normalizeStoredInstrument,
    normalizeStoredTuning,
    updateTuningOptions,
};
