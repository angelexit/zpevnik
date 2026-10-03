import { scheduleChordSound, stopChordSound } from './sound.js';
import { getChordDiagram } from './diagrams.js';

function initChordTooltips() {
    let tooltip = document.getElementById('chordTooltip');

    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'chordTooltip';
        tooltip.className = 'chord-tooltip';
        document.body.appendChild(tooltip);
    }

    if (document.body.dataset.chordTipsBound) return;
    document.body.dataset.chordTipsBound = 'true';
    let activeChord=null;
    const hide=()=>{ activeChord=null;tooltip.classList.remove("visible");stopChordSound(); };
    document.addEventListener("keydown",e=>{if(e.key==="Escape")hide();});
    document.addEventListener("click",e=>{if(!e.target.closest("[data-original],#chordTooltip"))hide();});
    new MutationObserver(()=>{if(activeChord && !activeChord.isConnected)hide();}).observe(document.getElementById("app-content") || document.body,{childList:true,subtree:true});
    function show(e, toggle = false) {
        const chord = e.target.closest('.chord-main[data-original],.chord-second[data-original]');
        if (!chord) return;
        if(activeChord===chord && tooltip.classList.contains("visible"))return;
        activeChord=chord;
        const tip = document.getElementById('chordTooltip');
        tip.innerHTML = getChordDiagram(
            chord.textContent.trim(),
            chord.dataset.instrument || 'guitar',
            chord.dataset.tuning || 'standard',
            { transposeSteps: 0, capo: Number(chord.dataset.capo) || 0 },
        );
        tip.classList.add('visible');
        if(tip.querySelector('svg'))scheduleChordSound(chord.textContent.trim(),chord,tip);
        moveChordTooltip(e, tip);
        if (toggle) e.stopPropagation();
    }
    document.addEventListener('mouseover', (e) => show(e));
    document.addEventListener('mousemove', (e) => {
        if (e.target.closest('[data-original]'))
            moveChordTooltip(e, document.getElementById('chordTooltip'));
    });
    document.addEventListener('mouseout', (e) => {
        const chord=e.target.closest('[data-original]');
        if(chord && !chord.contains(e.relatedTarget))hide();
    });
    document.addEventListener('click', (e) => show(e, true));
}

function moveChordTooltip(e, tooltip) {
    const offsetX = 22;
    const offsetY = 18;

    // fallback rozměry
    const tooltipWidth = tooltip.offsetWidth || 180;
    const tooltipHeight = tooltip.offsetHeight || 220;

    let x = e.clientX + offsetX;
    let y = e.clientY + offsetY;

    // pravý okraj
    if (x + tooltipWidth > window.innerWidth - 10) {
        x = e.clientX - tooltipWidth - offsetX;
    }

    // spodní okraj
    if (y + tooltipHeight > window.innerHeight - 10) {
        y = e.clientY - tooltipHeight - offsetY;
    }

    // levý okraj
    if (x < 10) {
        x = 10;
    }

    // horní okraj
    if (y < 10) {
        y = 10;
    }

    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
}
export { initChordTooltips, moveChordTooltip };
