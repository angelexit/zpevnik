import { TOOLS, goSongbook, openTool, reloadActiveTool } from './navigation.js';
import { applyToolsTheme, toggleToolsTheme } from './theme.js';

Object.assign(window, {
    openTool,
    reloadActiveTool,
    goSongbook,
    applyToolsTheme,
    toggleToolsTheme,
    initToolsPage,
});

(function () {
    const theme = localStorage.getItem('theme') || 'dark';

    document.documentElement.dataset.theme = theme;

    if (theme === 'dark') {
        document.documentElement.classList.add('dark-mode');
    }
})();

window.addEventListener('popstate', () => {
    const toolName = location.hash.replace('#', '').trim() || 'editor';

    openTool(toolName, true);
});

function initToolsPage() {
    const savedTheme = localStorage.getItem('theme') || 'dark';

    applyToolsTheme(savedTheme);

    const hashTool = location.hash.replace('#', '').trim();

    const savedTool = localStorage.getItem('lastToolsTab');

    const startTool = TOOLS[hashTool] ? hashTool : TOOLS[savedTool] ? savedTool : 'editor';

    openTool(startTool, true);
}

initToolsPage();
export { initToolsPage };
