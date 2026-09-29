function generateStringInstrumentSVG(chordName, chordData, instrument, tuning, meta = {}) {
    if (!chordData || !chordData.ps || !chordData.ps[0]) {
        return `<div class="no-svg">${escapeHtml(chordName)}</div>`;
    }

    const pos = chordData.ps[0];
    const startFret = Number(pos.p || 1);

    const stringCount = getStringCount(instrument, tuning);

    const viewWidth = 110;
    const viewHeight = 138;

    const gridLeft = 24;
    const gridRight = 86;
    const gridTop = 34;
    const gridBottom = 112;

    const fretCount = 4;
    const gridWidth = gridRight - gridLeft;
    const fretHeight = (gridBottom - gridTop) / fretCount;

    const stringGap = stringCount > 1 ? gridWidth / (stringCount - 1) : gridWidth;

    let svg = `
        <div
            class="chord-diagram-container"
            data-instrument="${escapeHtml(instrument)}"
            data-tuning="${escapeHtml(tuning)}"
            data-capo="${escapeHtml(meta.capo ?? 0)}"
            data-original-chord="${escapeHtml(meta.originalChord ?? chordName)}"
            data-rendered-chord="${escapeHtml(chordName)}"
        >
            <svg
                viewBox="0 0 ${viewWidth} ${viewHeight}"
                class="chord-svg"
                xmlns="http://www.w3.org/2000/svg"
            >
                <text
                    x="${viewWidth / 2}"
                    y="16"
                    text-anchor="middle"
                    class="chord-title"
                >${escapeHtml(chordName)}</text>
    `;

    if (meta.capo > 0) {
        svg += `
            <text
                x="${viewWidth / 2}"
                y="29"
                text-anchor="middle"
                class="capo-label"
            >Capo ${meta.capo}</text>
        `;
    }

    for (let i = 0; i < stringCount; i++) {
        const x = gridLeft + i * stringGap;

        svg += `
            <line
                x1="${x}"
                y1="${gridTop}"
                x2="${x}"
                y2="${gridBottom}"
                class="string-line"
            />
        `;
    }

    for (let i = 0; i <= fretCount; i++) {
        const y = gridTop + i * fretHeight;
        const isNut = startFret === 1 && i === 0;

        svg += `
            <line
                x1="${gridLeft}"
                y1="${y}"
                x2="${gridRight}"
                y2="${y}"
                class="${isNut ? 'nut' : 'fret-line'}"
            />
        `;
    }

    if (startFret > 1) {
        svg += `
            <text
                x="9"
                y="${gridTop + fretHeight * 0.7}"
                class="fret-num"
            >${startFret}</text>
        `;
    }

    if (Array.isArray(pos.b)) {
        pos.b.forEach((barre) => {
            const fromString = Number(barre.fs);
            const toString = Number(barre.ts);
            const fret = Number(barre.f);

            if (!fromString || !toString || !fret) return;

            const x1 = stringToX(fromString, stringCount, gridLeft, stringGap);
            const x2 = stringToX(toString, stringCount, gridLeft, stringGap);
            const y = gridTop + (fret - 1) * fretHeight + fretHeight / 2;

            svg += `
                <line
                    x1="${x1}"
                    y1="${y}"
                    x2="${x2}"
                    y2="${y}"
                    class="barre-line"
                />
            `;
        });
    }

    if (Array.isArray(pos.f)) {
        pos.f.forEach((fretInfo) => {
            const stringNum = Number(fretInfo[0]);
            const fretNum = fretInfo[1];
            const finger = fretInfo[2] || '';

            if (!stringNum) return;

            const x = stringToX(stringNum, stringCount, gridLeft, stringGap);

            if (fretNum === 'x' || fretNum === 'X') {
                svg += `
                    <text
                        x="${x}"
                        y="${gridTop - 7}"
                        text-anchor="middle"
                        class="mute-string"
                    >X</text>
                `;
                return;
            }

            if (Number(fretNum) === 0) {
                svg += `
                    <text
                        x="${x}"
                        y="${gridTop - 7}"
                        text-anchor="middle"
                        class="open-string"
                    >O</text>
                `;
                return;
            }

            const fret = Number(fretNum);

            if (!fret) return;

            const y = gridTop + (fret - 1) * fretHeight + fretHeight / 2;

            svg += `
                <circle
                    cx="${x}"
                    cy="${y}"
                    r="4.7"
                    class="fret-dot"
                />
            `;

            if (finger) {
                svg += `
                    <text
                        x="${x}"
                        y="${y + 2.8}"
                        text-anchor="middle"
                        class="finger-num"
                    >${escapeHtml(finger)}</text>
                `;
            }
        });
    }

    svg += `
            </svg>
        </div>
    `;

    return svg;
}

function getStringCount(instrument, tuning) {
    if (instrument === 'banjo' && tuning === 'tenor') return 4;
    if (instrument === 'guitar' && tuning === 'guitar7') {
        return 7;
    }

    if (instrument === 'ukulele') {
        return 4;
    }

    if (instrument === 'mandolin') {
        return 4;
    }

    if (instrument === 'banjo' && tuning === 'banjo5') {
        return 5;
    }

    if (instrument === 'banjo' && tuning === 'banjo6') {
        return 6;
    }

    if (instrument === 'bass' && tuning === 'bass5') {
        return 5;
    }

    if (instrument === 'bass') {
        return 4;
    }

    return 6;
}

function stringToX(stringNum, stringCount, gridLeft, stringGap) {
    return gridLeft + (stringCount - stringNum) * stringGap;
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}
export { generateStringInstrumentSVG, getStringCount, stringToX, escapeHtml };
