import { insertVisualChord } from './chord-text.js';
import { editorState } from './state.js';
import { $ } from './dom.js';

function processToCache() {
    const input = $('rawInput').value.split('\n');
    let out = [];
    let chordLine = null;
    input.forEach((line) => {
        if (!line.trim()) {
            out.push('');
            chordLine = null;
            return;
        }
        if (
            line
                .trim()
                .split(/\s+/)
                .every((c) =>
                    /^[A-H][b#]?(m|mi|maj|dim|aug|add|sus|[0-9])*[0-9]?(\/[A-H][b#]?)?$/.test(c),
                )
        ) {
            chordLine = line;
        } else {
            if (chordLine) {
                let res = line;
                let off = 0;
                chordLine.replace(/\S+/g, (m, i) => {
                    editorState.detectedChords.add(m);
                    res = res.slice(0, i + off) + '[' + m + ']' + res.slice(i + off);
                    off += m.length + 2;
                });
                out.push(res);
                chordLine = null;
            } else out.push(line);
        }
    });
    $('cacheOutput').value = out.join('\n');
    renderChords();
}

function renderChords() {
    const div = $('chord-display');
    if (!div) return;
    div.innerHTML = '';
    const chords = Array.from(editorState.detectedChords).sort();
    if (!chords.length) {
        div.textContent = '-';
        div.classList.add('chord-display-empty');
        return;
    }
    div.classList.remove('chord-display-empty');
    chords.forEach((c) => {
        const s = document.createElement('span');
        s.className = 'chord-tag';
        s.textContent = c;
        div.appendChild(s);
    });

    refreshChordPickers();
}

function getDetectedChordList() {
    return Array.from(editorState.detectedChords || [])
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, 'cs'));
}

function buildChordName(root) {
    return root + editorState.chordBuilderAccidental + editorState.chordBuilderQuality;
}

function buildChordQuickPicker() {
    const roots = ['C', 'D', 'E', 'F', 'G', 'A', 'H', 'B'];
    const accidentals = [
        { label: 'bez', value: '' },
        { label: '#', value: '#' },
        { label: 'b', value: 'b' },
    ];
    const qualities = [
        { label: 'dur', value: '' },
        { label: 'moll', value: 'mi' },
        { label: '7', value: '7' },
        { label: 'maj7', value: 'maj7' },
        { label: 'add7', value: 'add7' },
        { label: 'sus2', value: 'sus2' },
        { label: 'sus4', value: 'sus4' },
        { label: 'dim', value: 'dim' },
        { label: 'aug', value: 'aug' },
    ];
    const usedChords = getDetectedChordList();
    const preview = buildChordName('C');

    return `
            <div class="chord-quick-picker">
                <div class="picker-head">
                    <span class="picker-label">🎸 Akord builder</span>
                    <span class="chord-preview">Ukázka: ${preview}</span>
                </div>

                <div class="chord-builder-row">
                    <span class="builder-label">1. Typ</span>
                    ${qualities
                        .map(
                            (item) => `
                        <button type="button"
                                class="chord-btn quality-btn ${editorState.chordBuilderQuality === item.value ? 'active' : ''}"
                                onclick="setChordBuilderQuality('${item.value}')">
                            ${item.label}
                        </button>
                    `,
                        )
                        .join('')}
                </div>

                <div class="chord-builder-row">
                    <span class="builder-label">2. # / b</span>
                    ${accidentals
                        .map(
                            (item) => `
                        <button type="button"
                                class="chord-btn modifier-btn ${editorState.chordBuilderAccidental === item.value ? 'active' : ''}"
                                onclick="setChordBuilderAccidental('${item.value}')">
                            ${item.label}
                        </button>
                    `,
                        )
                        .join('')}
                </div>

                <div class="chord-builder-row">
                    <span class="builder-label">3. Základ</span>
                    ${roots
                        .map(
                            (root) => `
                        <button type="button" class="chord-btn root-btn" onclick="insertBuiltChordIntoSection(this, '${root}')">${root}</button>
                    `,
                        )
                        .join('')}
                </div>

                ${
                    usedChords.length
                        ? `
                    <div class="chord-builder-row used-row">
                        <span class="builder-label">Použité</span>
                        ${usedChords
                            .map(
                                (ch) => `
                            <button type="button" class="chord-btn used-btn" onclick="insertChordIntoSection(this, '${ch.replace(/'/g, "\\'")}')">${ch}</button>
                        `,
                            )
                            .join('')}
                    </div>
                `
                        : ''
                }
            </div>
        `;
}

function refreshChordPickers() {
    document.querySelectorAll('.section-card').forEach((card) => {
        const old = card.querySelector('.chord-quick-picker');
        if (old) old.outerHTML = buildChordQuickPicker();
    });
}

function setChordBuilderAccidental(value) {
    editorState.chordBuilderAccidental = value || '';
    refreshChordPickers();
}

function setChordBuilderQuality(value) {
    editorState.chordBuilderQuality = value || '';
    refreshChordPickers();
}

function insertBuiltChordIntoSection(btn, root) {
    insertChordIntoSection(btn, buildChordName(root));
}

function insertChordIntoSection(btn, chord) {
    const card = btn.closest('.section-card');
    if (!card) return;

    const textarea = card.querySelector('textarea');
    if (!textarea) return;

    insertVisualChord(card.querySelector('.chord-text'), chord);

    editorState.detectedChords.add(chord);
    renderChords();
}
export {
    processToCache,
    renderChords,
    getDetectedChordList,
    buildChordName,
    buildChordQuickPicker,
    refreshChordPickers,
    setChordBuilderAccidental,
    setChordBuilderQuality,
    insertBuiltChordIntoSection,
    insertChordIntoSection,
};
