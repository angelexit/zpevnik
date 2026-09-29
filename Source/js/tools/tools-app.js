// ==========================================
// ZPĚVNÍK TOOLS APP
// tools-app.js
// ==========================================

window.addEventListener('DOMContentLoaded', () => {
    initToolsApp();
});

// ------------------------------------------
// START
// ------------------------------------------

function initToolsApp() {

    // tlačítka menu
    document.querySelectorAll('.tool-tab').forEach(btn => {

        btn.addEventListener('click', () => {
            const tool = btn.dataset.tool;
            openTool(tool);
        });

    });

    // hash při načtení
    const hash = window.location.hash.replace('#', '');

    if (hash) {
        openTool(hash);
    } else {
        openTool('editor');
    }

}

// ------------------------------------------
// OTEVŘENÍ MODULU
// ------------------------------------------

function openTool(tool) {

    // schovej vše
    document.querySelectorAll('.tool-page')
        .forEach(page => {
            page.classList.remove('active');
        });

    // deaktivuj menu
    document.querySelectorAll('.tool-tab')
        .forEach(btn => {
            btn.classList.remove('active');
        });

    // zobraz modul
    const target = document.getElementById(`tool-${tool}`);

    if (target) {
        target.classList.add('active');
    }

    // aktivní tlačítko
    const activeBtn = document.querySelector(`[data-tool="${tool}"]`);

    if (activeBtn) {
        activeBtn.classList.add('active');
    }

    // URL HASH
    window.location.hash = tool;

    // INIT MODULŮ
    switch (tool) {

        case 'editor':

            if (window.initEditor) {
                window.initEditor();
            }

            break;

        case 'export':

            if (window.initExporter) {
                window.initExporter();
            }

            break;

        case 'chords':

            if (window.initChordBuilder) {
                window.initChordBuilder();
            }

            break;

    }

}