import { dotFrets, heights, instruments } from './instruments.js';
import { chordState } from './state.js';
import { updateAll } from './output.js';

function initFretboard() {
    const start = Number(document.getElementById('startFret')?.value) || 1;
    const instKey = document.getElementById('instrument').value;
    const inst = instruments[instKey];
    const fb = document.getElementById('fretboard');
    const nums = document.getElementById('fretNums');
    const labels = document.getElementById('stringLabels');
    const inlays = document.getElementById('inlayContainer');

    fb.querySelectorAll('.string-col').forEach((c) => c.remove());
    nums.innerHTML = '';
    labels.innerHTML = '';
    inlays.innerHTML = '';
    chordState.chordData.points = [];

    let cumulativeHeight = 0;
    for (let f = 0; f <= 12; f++) {
        const numEl = document.createElement('div');
        numEl.className = `fret-num f-${f}`;
        numEl.innerText = f === 0 ? 0 : start + f - 1;
        nums.appendChild(numEl);

        if (f > 0 && dotFrets.includes(f)) {
            const dotCenter = cumulativeHeight + heights[f] / 2 - 6;
            if (f === 12) {
                inlays.innerHTML += `<div class="dot double" style="top: ${dotCenter}px"></div>`;
                inlays.innerHTML += `<div class="dot double-2" style="top: ${dotCenter}px"></div>`;
            } else {
                inlays.innerHTML += `<div class="dot" style="top: ${dotCenter}px"></div>`;
            }
        }
        cumulativeHeight += heights[f];
    }

    for (let i = 0; i < inst.strings; i++) {
        labels.innerHTML += `<div class="s-label">${inst.tuning[i]}</div>`;
        const col = document.createElement('div');
        col.className = 'string-col';
        for (let f = 0; f <= 12; f++) {
            const cell = document.createElement('div');
            cell.className = `fret-cell f-${f}` + (f === 0 ? ' open' : '');
            cell.onclick = () => toggleNote(inst.strings - i, f === 0 ? 0 : start + f - 1);
            col.appendChild(cell);
        }
        fb.appendChild(col);
    }
    updateAll();
}

function toggleNote(s, f) {
    chordState.loadedBarres = null;
    if (f === 0) {
        const current = chordState.chordData.points.find(
            (p) => p.s === s && (p.f === 0 || p.f === -1),
        );
        if (!current) {
            chordState.chordData.points = chordState.chordData.points.filter((p) => p.s !== s);
            chordState.chordData.points.push({ s: s, f: 0, p: '0' });
        } else if (current.p === '0') {
            current.f = -1;
            current.p = 'X';
        } else {
            chordState.chordData.points = chordState.chordData.points.filter((p) => p.s !== s);
        }
    } else {
        const idx = chordState.chordData.points.findIndex((p) => p.s === s && p.f === f);
        if (idx > -1) {
            const finger = prompt('Prstoklad (1-4, T):', chordState.chordData.points[idx].p);
            if (finger === null) chordState.chordData.points.splice(idx, 1);
            else chordState.chordData.points[idx].p = finger;
        } else {
            chordState.chordData.points = chordState.chordData.points.filter((p) => p.s !== s);
            chordState.chordData.points.push({ s: s, f: f, p: '' });
        }
    }
    renderDots();
    updateAll();
}

function renderDots() {
    document.querySelectorAll('.note').forEach((n) => n.remove());
    const inst = instruments[document.getElementById('instrument').value];
    chordState.chordData.points.forEach((p) => {
        const stringIdx = inst.strings - p.s;
        const targetCol = document.querySelectorAll('.string-col')[stringIdx];
        if (targetCol) {
            const targetCell =
                targetCol.children[
                    p.f <= 0
                        ? 0
                        : p.f - (Number(document.getElementById('startFret')?.value) || 1) + 1
                ];
            if (!targetCell) return;
            const n = document.createElement('div');
            n.className = 'note' + (p.f <= 0 ? ' special' : '');
            n.innerText = p.p;
            targetCell.appendChild(n);
        }
    });
}
export { initFretboard, toggleNote, renderDots };
