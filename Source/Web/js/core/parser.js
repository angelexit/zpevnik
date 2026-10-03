export function escapeHtml(value = '') {
    return String(value).replace(
        /[&<>"']/g,
        (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[c],
    );
}
// Each lyric fragment and its chord share a normal-flow grid cell. Chord widths
// therefore participate in layout instead of colliding at absolute positions.
export function renderSongWithChordLayer(line = '', onChordFound) {
    line = line.replace(/\[:/g, '𝄆 ').replace(/:\]/g, ' 𝄇');
    if (!line)
        return '<div class="song-line verse-flow empty-line"><span class="verse-word">&nbsp;</span></div>';
    const words = [];
    let pieces = [],
        chord = '',
        text = '';
    function piece() {
        if (chord || text) {
            pieces.push({ chord, text });
            chord = '';
            text = '';
        }
    }
    function word(space = '') {
        piece();
        if (pieces.length) {
            words.push({ pieces, space });
            pieces = [];
        } else if (space && words.length) words[words.length - 1].space += space;
    }
    for (const m of line.matchAll(/\[([^\]]+)\]|([^\s\[]+|\[)|([\t ]+)/g)) {
        if (m[1] !== undefined) {
            piece();
            chord = m[1];
            onChordFound?.(chord);
        } else if (m[3]) word(m[3]);
        else text += m[2];
    }
    word();
    const has = words.some((w) => w.pieces.some((p) => p.chord));
    const chordOnly = line.replace(/\[[^\]]+\]/g, '').replace(/[.\s]/g, '') === '';
    return `<div class="song-line verse-flow ${has ? 'with-chords' : 'without-chords'} ${chordOnly ? 'chords-only' : ''}">${words.map((w) => `<span class="verse-word">${w.pieces.map((p) => `<span class="verse-piece"><span class="chord-main" ${p.chord ? `data-original="${escapeHtml(p.chord)}"` : ''}>${escapeHtml(p.chord)}</span><span class="chord-second" ${p.chord ? `data-original="${escapeHtml(p.chord)}"` : ''}>${escapeHtml(p.chord)}</span><span class="verse-lyric">${chordOnly ? '' : escapeHtml(p.text)}</span></span>`).join('')}</span>${w.space ? ' ' : ''}`).join('')}</div>`;
}
