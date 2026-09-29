function renderNativeSVG(name, pos, barreData, inst) {
    const esc = (value) =>
        String(value ?? '').replace(
            /[&<>"']/g,
            (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
        );
    const width = 160;
    const height = 230;
    const margin = 45;
    const stringDist = (width - 40) / (inst.strings - 1);

    // Dynamické rozestupy pražců pro náhled
    let fPos = [0];
    let cD = 58;
    for (let i = 1; i <= 4; i++) {
        fPos[i] = fPos[i - 1] + cD;
        cD *= 0.88;
    }

    let svg = `<svg width="${width}" height="${height + 40}" viewBox="0 0 ${width} ${height + 40}" xmlns="http://www.w3.org/2000/svg">`;
    svg += `<text x="${width / 2}" y="25" text-anchor="middle" font-family="Arial" font-weight="bold" font-size="18" fill="#009CDC">${esc(name)}</text>`;
    if (pos.p > 1)
        svg += `<text x="5" y="${margin + 25}" font-size="12" fill="#888" font-family="Arial">${pos.p}</text>`;

    // Pražce
    for (let i = 0; i <= 4; i++) {
        const y = margin + fPos[i];
        svg += `<line x1="20" y1="${y}" x2="${width - 20}" y2="${y}" stroke="#444" stroke-width="${i === 0 && pos.p === 1 ? 6 : 2}" stroke-linecap="round" />`;
    }
    // Struny
    for (let i = 0; i < inst.strings; i++) {
        const x = 20 + i * stringDist;
        svg += `<line x1="${x}" y1="${margin}" x2="${x}" y2="${margin + fPos[4]}" stroke="#888" stroke-width="2" />`;
    }

    // Baré pruhy
    barreData.forEach((b) => {
        const fIdx = b.f - pos.p;
        if (fIdx >= 0 && fIdx < 4) {
            const yM = margin + fPos[fIdx] + (fPos[fIdx + 1] - fPos[fIdx]) / 2;
            const xS = 20 + (inst.strings - b.fs) * stringDist;
            const xE = 20 + (inst.strings - b.ts) * stringDist;
            svg += `<rect x="${xS - 12}" y="${yM - 11}" width="${xE - xS + 24}" height="22" rx="11" fill="#222" />`;
            svg += `<text x="${(xS + xE) / 2}" y="${yM + 5}" text-anchor="middle" font-size="12" fill="white" font-family="Arial" font-weight="bold">${esc(b.finger)}</text>`;
        }
    });

    // Tóny, křížky a nuly
    pos.f.forEach((p) => {
        const [s, f, txt] = p;
        const sIdx = inst.strings - s;
        const cx = 20 + sIdx * stringDist;

        if (f === 'x' || f === -1) {
            // Křížek
            svg += `<g stroke="#444" stroke-width="2"><line x1="${cx - 5}" y1="${margin - 17}" x2="${cx + 5}" y2="${margin - 7}" /><line x1="${cx + 5}" y1="${margin - 17}" x2="${cx - 5}" y2="${margin - 7}" /></g>`;
        } else if (f === 0) {
            // Nula
            svg += `<circle cx="${cx}" cy="${margin - 12}" r="6" fill="none" stroke="#444" stroke-width="2" />`;
        } else {
            const fIdx = f - pos.p;
            // Kreslíme prst jen pokud není součástí baré
            if (
                fIdx >= 0 &&
                fIdx < 4 &&
                !barreData.some((b) => b.f === f && s <= b.fs && s >= b.ts && b.finger === txt)
            ) {
                const yM = margin + fPos[fIdx] + (fPos[fIdx + 1] - fPos[fIdx]) / 2;
                svg += `<circle cx="${cx}" cy="${yM}" r="12" fill="#222" />`;
                if (txt)
                    svg += `<text x="${cx}" y="${yM + 5}" text-anchor="middle" font-size="12" fill="white" font-family="Arial">${esc(txt)}</text>`;
            }
        }
    });
    document.getElementById('svg-render').innerHTML = svg + `</svg>`;
}
export { renderNativeSVG };
