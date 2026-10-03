import { mountChordText } from './chord-text.js';
import { $, escapeHtml } from './dom.js';
import { buildChordQuickPicker } from './chords.js';

function isInstrumentalType(type) {
    return ['intro', 'bridge', 'outro', 'mezihra'].includes(type);
}

function lineLooksInstrumental(line) {
    const cleaned = (line || '').replace(/\[[^\]]+\]/g, '').replace(/[.\s]/g, '');

    return cleaned.length === 0 && /\[[^\]]+\]/.test(line || '');
}

function autoSpaceInstrumentalLine(line) {
    const chordRegex = /\[([^\]]+)\]/g;
    const chords = [];
    let match;

    while ((match = chordRegex.exec(line)) !== null) {
        chords.push({
            fullMatch: match[0],
            chordName: match[1],
            length: match[1].length,
        });
    }

    if (chords.length === 0) return line;

    const BASE_GAP = 3;
    let processedLine = '';

    chords.forEach((ch, index) => {
        const isLast = index === chords.length - 1;

        const spacesAfter = isLast ? 3 : ch.length + BASE_GAP;

        processedLine += ch.fullMatch + ' '.repeat(spacesAfter);
    });

    return processedLine.trimEnd() + ' .';
}

function normalizeInstrumentalForEdit(type, text) {
    if (!isInstrumentalType(type)) return text || '';

    return (text || '')
        .split('\n')
        .map((line) => {
            let clean = line.trim();
            if (clean.endsWith('.')) clean = clean.slice(0, -1).trimEnd();
            return clean.replace(/\]\s+\[/g, '] [');
        })
        .join('\n');
}

function addSection(type = 'verse', text = '') {
    const div = document.createElement('div');
    div.className = 'section-card';

    const editText = (text || '').replace(/↵/g, '\n');

    div.innerHTML = `
            <select class="part-type">
                <option value="intro" ${type === 'intro' ? 'selected' : ''}>Intro</option>
                <option value="verse" ${type === 'verse' ? 'selected' : ''}>Sloka</option>
                <option value="chorus" ${type === 'chorus' ? 'selected' : ''}>Refrén</option>
                <option value="bridge" ${type === 'bridge' ? 'selected' : ''}>Mezihra</option>
                <option value="outro" ${type === 'outro' ? 'selected' : ''}>Outro</option>
            </select>
            <textarea>${escapeHtml(editText)}</textarea>
            ${buildChordQuickPicker()}
            <div class="instrumental-hint">↵ určuje konec verše. Dlouhý verš se na obrazovce zalomí podle dostupné šířky.</div>
        `;

    $('sections-container').appendChild(div);
    mountChordText(div.querySelector('textarea'));
    return div;
}
export {
    isInstrumentalType,
    lineLooksInstrumental,
    autoSpaceInstrumentalLine,
    normalizeInstrumentalForEdit,
    addSection,
};
