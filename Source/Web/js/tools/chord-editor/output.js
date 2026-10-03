import { instruments } from './instruments.js';
import { chordState } from './state.js';
import { renderNativeSVG } from './svg.js';

function updateAll() {
    const name = document.getElementById('chordName').value;
    const instKey = document.getElementById('instrument').value;
    const inst = instruments[instKey];

    const fretCounts = {};
    chordState.chordData.points.forEach((p) => {
        if (p.f > 0) fretCounts[p.f] = (fretCounts[p.f] || 0) + 1;
    });

    const barres = [];
    Object.keys(fretCounts).forEach((f) => {
        const fNum = parseInt(f);
        const notes = chordState.chordData.points.filter((p) => p.f === fNum);
        const fingers = {};
        notes.forEach((n) => {
            if (n.p && n.p !== '') (fingers[n.p] = fingers[n.p] || []).push(n.s);
        });
        Object.keys(fingers).forEach((fin) => {
            if (fingers[fin].length >= 2)
                barres.push({
                    fs: Math.max(...fingers[fin]),
                    ts: Math.min(...fingers[fin]),
                    f: fNum,
                    finger: fin,
                });
        });
    });

    const outputObj = {
        t: name,
        ps: [
            {
                fretMode: 'absolute',
                p: chordState.chordData.points.some((p) => p.f > 0)
                    ? Math.max(
                          1,
                          Math.min(
                              ...chordState.chordData.points.filter((p) => p.f > 0).map((p) => p.f),
                          ),
                      )
                    : 1,
                f: chordState.chordData.points.map((p) => [
                    p.s,
                    p.f === -1 ? 'x' : p.f,
                    String(p.p),
                ]),
                b: chordState.loadedBarres ?? barres.map((b) => ({ fs: b.fs, ts: b.ts, f: b.f })),
            },
        ],
    };

    document.getElementById('output').value =
        `${JSON.stringify(name)}:${JSON.stringify(outputObj)}`;
    renderNativeSVG(name, outputObj.ps[0], outputObj.ps[0].b, inst);
}

function copyToClipboard() {
    const output = document.getElementById('output');
    output.select();
    document.execCommand('copy');
    alert('JSON zkopírován!');
}

export { updateAll, copyToClipboard };
