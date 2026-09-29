function escapeHtml(value = '') {
    return String(value).replace(
        /[&<>"']/g,
        (char) =>
            ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;',
            })[char],
    );
}

export function renderSongWithChordLayer(line = '', onChordFound) {
    line = line.replace(/\[:/g, '𝄆 ').replace(/:\]/g, ' 𝄇');

    const chordRegex = /\[([^\]]+)\]/g;

    let cleanLine = '';
    const chordsInLine = [];
    let lastIndex = 0;
    let match;

    // 1. Krok: Vytáhneme akordy a zjistíme jejich přesnou pozici v čistém textu
    while ((match = chordRegex.exec(line)) !== null) {
        const chord = match[1];
        cleanLine += line.slice(lastIndex, match.index);

        chordsInLine.push({
            chord: chord,
            index: cleanLine.length, // Pozice v čistém řetězci
        });

        if (onChordFound) {
            onChordFound(chord);
        }

        lastIndex = match.index + match[0].length;
    }
    cleanLine += line.slice(lastIndex);

    // Pokud je řádek prázdný
    if (!cleanLine.length && chordsInLine.length === 0) {
        return `<div class="song-line empty-line">&nbsp;</div>`;
    }

    // Grupování akordů, které padnou na úplně stejný index (např. [G][G7] nebo capo režim)
    const groupedChords = [];
    chordsInLine.forEach((c) => {
        let group = groupedChords.find((g) => g.index === c.index);
        if (!group) {
            group = { index: c.index, chords: [] };
            groupedChords.push(group);
        }
        group.chords.push(c.chord);
    });

    // 2. Krok: Vygenerujeme HTML pro akordovou vrstvu
    let chordsHtml = '';
    if (groupedChords.length > 0) {
        chordsHtml = `<div class="chord-line">`;
        let lastChordIndex = 0;

        groupedChords.forEach((group) => {
            const distance = group.index - lastChordIndex;

            chordsHtml += `
                <span class="chord-wrapper" style="margin-left: ${distance}ch;">
                    <span class="chord-stack">
                        ${group.chords
                            .map(
                                (chord, i) => `
                            <span class="${i === 0 ? 'chord-main' : 'chord-second'}">${escapeHtml(chord)}</span>
                        `,
                            )
                            .join('')}
                    </span>
                </span>
            `;

            lastChordIndex = group.index;
        });

        chordsHtml += `</div>`;
    }

    // 3. Krok: Složení výsledného řádku
    const hasChordsClass = chordsInLine.length > 0 ? 'has-chords' : 'no-chords';

    // Použijeme trimování opatrně, abychom na konci řádku neztratili případný prostor pro koncové akordy
    const renderedText = cleanLine === '' ? '&nbsp;' : escapeHtml(cleanLine);

    return `
        <div class="song-line ${hasChordsClass}">
            ${chordsHtml}
            <div class="lyric-line">${renderedText}</div>
        </div>
    `;
}
