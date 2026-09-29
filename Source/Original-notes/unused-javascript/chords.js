    const instruments = {
        gtr_std: {
            strings: 6,
            tuning: ["E", "A", "D", "G", "B", "E"]
        },
        gtr_7: {
            strings: 7,
            tuning: ["B", "E", "A", "D", "G", "B", "E"]
        },
        gtr_dropd: {
            strings: 6,
            tuning: ["D", "A", "D", "G", "B", "E"]
        },
        gtr_dropc: {
            strings: 6,
            tuning: ["C", "G", "C", "F", "A", "D"]
        },
        gtr_opend: {
            strings: 6,
            tuning: ["D", "A", "D", "F#", "A", "D"]
        },
        banjo_5: {
            strings: 5,
            tuning: ["G", "D", "G", "B", "D"]
        },
        banjo_tenor: {
            strings: 4,
            tuning: ["C", "G", "D", "A"]
        },
        uke_std: {
            strings: 4,
            tuning: ["G", "C", "E", "A"]
        },
        uke_bar: {
            strings: 4,
            tuning: ["D", "G", "B", "E"]
        },
        mandolin: {
            strings: 4,
            tuning: ["G", "D", "A", "E"]
        }
    };

    let chordData = {
        name: "G",
        points: []
    };
    const dotFrets = [3, 5, 7, 9, 12];
    const heights = [35, 45, 41, 37, 34, 31, 28, 26, 24, 22, 20, 18, 17];

    function initFretboard() {
        const instKey = document.getElementById('instrument').value;
        const inst = instruments[instKey];
        const fb = document.getElementById('fretboard');
        const nums = document.getElementById('fretNums');
        const labels = document.getElementById('stringLabels');
        const inlays = document.getElementById('inlayContainer');

        fb.querySelectorAll('.string-col').forEach(c => c.remove());
        nums.innerHTML = '';
        labels.innerHTML = '';
        inlays.innerHTML = '';
        chordData.points = [];

        let cumulativeHeight = 0;
        for (let f = 0; f <= 12; f++) {
            const numEl = document.createElement('div');
            numEl.className = `fret-num f-${f}`;
            numEl.innerText = f;
            nums.appendChild(numEl);

            if (f > 0 && dotFrets.includes(f)) {
                const dotCenter = cumulativeHeight + (heights[f] / 2) - 6;
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
                cell.onclick = () => toggleNote(inst.strings - i, f);
                col.appendChild(cell);
            }
            fb.appendChild(col);
        }
        updateAll();
    }

    function toggleNote(s, f) {
        if (f === 0) {
            const current = chordData.points.find(p => p.s === s && (p.f === 0 || p.f === -1));
            if (!current) {
                chordData.points = chordData.points.filter(p => p.s !== s);
                chordData.points.push({
                    s: s,
                    f: 0,
                    p: "0"
                });
            } else if (current.p === "0") {
                current.f = -1;
                current.p = "X";
            } else {
                chordData.points = chordData.points.filter(p => p.s !== s);
            }
        } else {
            const idx = chordData.points.findIndex(p => p.s === s && p.f === f);
            if (idx > -1) {
                const finger = prompt("Prstoklad (1-4, T):", chordData.points[idx].p);
                if (finger === null) chordData.points.splice(idx, 1);
                else chordData.points[idx].p = finger;
            } else {
                chordData.points = chordData.points.filter(p => p.s !== s);
                chordData.points.push({
                    s: s,
                    f: f,
                    p: ""
                });
            }
        }
        renderDots();
        updateAll();
    }

    function renderDots() {
        document.querySelectorAll('.note').forEach(n => n.remove());
        const inst = instruments[document.getElementById('instrument').value];
        chordData.points.forEach(p => {
            const stringIdx = inst.strings - p.s;
            const targetCol = document.querySelectorAll('.string-col')[stringIdx];
            if (targetCol) {
                const targetCell = targetCol.children[p.f === -1 ? 0 : p.f];
                const n = document.createElement('div');
                n.className = 'note' + (p.f <= 0 ? ' special' : '');
                n.innerText = p.p;
                targetCell.appendChild(n);
            }
        });
    }

    function updateAll() {
        const name = document.getElementById('chordName').value;
        const instKey = document.getElementById('instrument').value;
        const inst = instruments[instKey];

        const fretCounts = {};
        chordData.points.forEach(p => {
            if (p.f > 0) fretCounts[p.f] = (fretCounts[p.f] || 0) + 1;
        });

        const barres = [];
        Object.keys(fretCounts).forEach(f => {
            const fNum = parseInt(f);
            const notes = chordData.points.filter(p => p.f === fNum);
            const fingers = {};
            notes.forEach(n => {
                if (n.p && n.p !== "")(fingers[n.p] = fingers[n.p] || []).push(n.s);
            });
            Object.keys(fingers).forEach(fin => {
                if (fingers[fin].length >= 2) barres.push({
                    "fs": Math.max(...fingers[fin]),
                    "ts": Math.min(...fingers[fin]),
                    "f": fNum,
                    "finger": fin
                });
            });
        });

        const outputObj = {
            "t": name,
            "ps": [{
                "p": chordData.points.some(p => p.f > 0) ? Math.max(1, Math.min(...chordData.points.filter(p => p.f > 0).map(p => p.f))) : 1,
                "f": chordData.points.map(p => [p.s, (p.f === -1 ? "x" : p.f), String(p.p)]),
                "b": barres.map(b => ({
                    fs: b.fs,
                    ts: b.ts,
                    f: b.f
                }))
            }]
        };

        document.getElementById('output').value = `"${name}":${JSON.stringify(outputObj)}`;
        renderNativeSVG(name, outputObj.ps[0], barres, inst);
    }

    function renderNativeSVG(name, pos, barreData, inst) {
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
        svg += `<text x="${width/2}" y="25" text-anchor="middle" font-family="Arial" font-weight="bold" font-size="18" fill="#009CDC">${name}</text>`;
        if (pos.p > 1) svg += `<text x="5" y="${margin + 25}" font-size="12" fill="#888" font-family="Arial">${pos.p}</text>`;

        // Pražce
        for (let i = 0; i <= 4; i++) {
            const y = margin + fPos[i];
            svg += `<line x1="20" y1="${y}" x2="${width - 20}" y2="${y}" stroke="#444" stroke-width="${i===0 && pos.p===1 ? 6:2}" stroke-linecap="round" />`;
        }
        // Struny
        for (let i = 0; i < inst.strings; i++) {
            const x = 20 + (i * stringDist);
            svg += `<line x1="${x}" y1="${margin}" x2="${x}" y2="${margin + fPos[4]}" stroke="#888" stroke-width="2" />`;
        }

        // Baré pruhy
        barreData.forEach(b => {
            const fIdx = b.f - pos.p;
            if (fIdx >= 0 && fIdx < 4) {
                const yM = margin + fPos[fIdx] + (fPos[fIdx + 1] - fPos[fIdx]) / 2;
                const xS = 20 + (inst.strings - b.fs) * stringDist;
                const xE = 20 + (inst.strings - b.ts) * stringDist;
                svg += `<rect x="${xS - 12}" y="${yM - 11}" width="${xE - xS + 24}" height="22" rx="11" fill="#222" />`;
                svg += `<text x="${(xS + xE)/2}" y="${yM + 5}" text-anchor="middle" font-size="12" fill="white" font-family="Arial" font-weight="bold">${b.finger}</text>`;
            }
        });

        // Tóny, křížky a nuly
        pos.f.forEach(p => {
            const [s, f, txt] = p;
            const sIdx = inst.strings - s;
            const cx = 20 + (sIdx * stringDist);

            if (f === "x" || f === -1) {
                // Křížek
                svg += `<g stroke="#444" stroke-width="2"><line x1="${cx-5}" y1="${margin-17}" x2="${cx+5}" y2="${margin-7}" /><line x1="${cx+5}" y1="${margin-17}" x2="${cx-5}" y2="${margin-7}" /></g>`;
            } else if (f === 0) {
                // Nula
                svg += `<circle cx="${cx}" cy="${margin - 12}" r="6" fill="none" stroke="#444" stroke-width="2" />`;
            } else {
                const fIdx = f - pos.p;
                // Kreslíme prst jen pokud není součástí baré
                if (fIdx >= 0 && fIdx < 4 && !barreData.some(b => b.f === f && s <= b.fs && s >= b.ts && b.finger === txt)) {
                    const yM = margin + fPos[fIdx] + (fPos[fIdx + 1] - fPos[fIdx]) / 2;
                    svg += `<circle cx="${cx}" cy="${yM}" r="12" fill="#222" />`;
                    if (txt) svg += `<text x="${cx}" y="${yM + 5}" text-anchor="middle" font-size="12" fill="white" font-family="Arial">${txt}</text>`;
                }
            }
        });
        document.getElementById('svg-render').innerHTML = svg + `</svg>`;
    }

    function copyToClipboard() {
        const output = document.getElementById("output");
        output.select();
        document.execCommand("copy");
        alert("JSON zkopírován!");
    }

    function importChord() {
        try {
            let raw = document.getElementById('importJson').value.trim();
            if (raw.startsWith('"')) raw = "{" + raw + "}";
            const full = JSON.parse(raw);
            const key = Object.keys(full)[0];
            const data = full[key];
            document.getElementById('chordName').value = key;
            const ps = data.ps[0];
            const maxS = Math.max(...ps.f.map(f => f[0]));

            if (maxS === 7) document.getElementById('instrument').value = "gtr_7";
            else if (maxS === 5) document.getElementById('instrument').value = "banjo_5";
            else if (maxS <= 4) document.getElementById('instrument').value = "uke_std";
            else document.getElementById('instrument').value = "gtr_std";

            initFretboard();
            chordData.points = ps.f.map(f => ({
                s: f[0],
                f: (f[1] === "x" ? -1 : f[1]),
                p: f[2]
            }));
            renderDots();
            updateAll();
        } catch (e) {
            alert("Chyba importu!");
        }
    }

    initFretboard();