import { getChordDiagram } from './diagrams.js';

function initChordTooltips() {
    let tooltip = document.getElementById('chordTooltip');

    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'chordTooltip';
        tooltip.className = 'chord-tooltip';
        document.body.appendChild(tooltip);
    }

    document.querySelectorAll('.chord-main').forEach((chordEl) => {
        chordEl.addEventListener('mouseenter', (e) => {
            const chordName = chordEl.textContent.trim();

            if (!chordName) return;

            const instrument = localStorage.getItem('instrument') || 'guitar';
            const tuning = localStorage.getItem('tuning') || 'standard';

            tooltip.innerHTML = getChordDiagram(chordName, instrument, tuning);
            tooltip.classList.add('visible');

            moveChordTooltip(e, tooltip);
        });

        chordEl.addEventListener('mousemove', (e) => {
            moveChordTooltip(e, tooltip);
        });

        chordEl.addEventListener('mouseleave', () => {
            tooltip.classList.remove('visible');
        });

        chordEl.addEventListener('click', (e) => {
            e.stopPropagation();

            const chordName = chordEl.textContent.trim();

            if (!chordName) return;

            const instrument = localStorage.getItem('instrument') || 'guitar6';
            tooltip.innerHTML = getChordDiagram(chordName, instrument);
            tooltip.classList.toggle('visible');

            moveChordTooltip(e, tooltip);
        });
    });
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
