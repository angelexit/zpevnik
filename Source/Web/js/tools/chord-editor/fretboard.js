import {soundingNote} from '../../chords/notes.js';
import { dotFrets, heights, instruments } from './instruments.js';
import { chordState } from './state.js';
import { updateAll } from './output.js';

function initFretboard() {
    const start = Number(document.getElementById('startFret')?.value) || 1;
    const instKey = document.getElementById('instrument').value;
    const inst = instruments[instKey];
    const fb = document.getElementById('fretboard');
    fb.style.setProperty('--neck-height',(inst.strings*38)+'px');
    const nums = document.getElementById('fretNums');
    const labels = document.getElementById('stringLabels');
    const inlays = document.getElementById('inlayContainer');

    fb.querySelectorAll('.string-col').forEach((c) => c.remove());
    nums.innerHTML = '';
    labels.innerHTML = '';
    inlays.innerHTML = '';
    chordState.chordData.points = [];

    const weights=Array.from({length:13},(_,i)=>i===0?.65:Math.pow(2,-(i-1)/12));
    const total=weights.reduce((a,b)=>a+b,0);
    for(let f=0;f<=12;f++){
        const absolute=f===0?0:start+f-1;
        const num=document.createElement('div');num.className='fret-num';num.textContent=absolute;num.style.flex=weights[f]+' 1 0';nums.append(num);
        if(instKey.startsWith('gtr_')&&[3,5,7,9,12,15,18,21,23].includes(absolute)){
            const marker=document.createElement('div');marker.className='neck-marker'+(absolute===12?' double-marker':'');
            marker.dataset.fret=absolute;marker.style.left=((weights.slice(0,f).reduce((a,b)=>a+b,0)+weights[f]/2)/total*100)+'%';inlays.append(marker);
        }
    }

    for (let i = 0; i < inst.strings; i++) {
        labels.innerHTML += `<div class="s-label">${inst.tuning[i].replace('B','H')}</div>`;
        const col = document.createElement('div');
        col.className = 'string-col';
        for (let f = 0; f <= 12; f++) {
            const cell = document.createElement('div');
            cell.className = `fret-cell f-${f}` + (f === 0 ? ' open' : '');
            cell.style.flex=weights[f]+' 1 0';
            if(f===0)cell.dataset.openTone=inst.tuning[i].replace('B','H');
            cell.onclick = () => toggleNote(inst.strings - i, f === 0 ? 0 : start + f - 1);
            col.appendChild(cell);
        }
        fb.appendChild(col);
    }
    setEditorHand();
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
            n.innerText = p.f === 0 ? '○' : p.p;
            if(p.f>=0){const small=document.createElement('small');small.className='note-tone';small.textContent=soundingNote(inst.tuning,p.s,p.f);n.append(small);}
            targetCell.appendChild(n);
        }
    });
}
export { initFretboard, toggleNote, renderDots };

export function setEditorHand(){document.querySelector('.neck-scroll').classList.toggle('left-handed',document.getElementById('editorHand').value==='left');}
