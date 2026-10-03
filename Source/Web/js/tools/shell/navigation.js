import { toolsState } from './state.js';

const TOOLS = {
    editor: {
        title: 'Editor písní | Zpěvník',
        frameId: 'editorFrame',
    },

    chords: {
        title: 'Editor akordů | Zpěvník',
        frameId: 'chordsFrame',
    },

    export: {
        title: 'GitHub databáze | Zpěvník',
        frameId: 'exportFrame',
    },
};

function openTool(requestedToolName, replaceHash = false) {
    const toolName = Object.prototype.hasOwnProperty.call(TOOLS, requestedToolName)
        ? requestedToolName
        : 'editor';

    const tool = TOOLS[toolName];

    toolsState.activeToolName = toolName;

    document.querySelectorAll('.tool-frame').forEach((frame) => {
        frame.classList.toggle('active', frame.id === tool.frameId);
    });

    document.querySelectorAll('.tools-tab').forEach((button) => {
        button.classList.toggle('active', button.dataset.tool === toolName);
    });

    document.title = tool.title;

    const newHash = `#${toolName}`;

    if (replaceHash) {
        history.replaceState({ tool: toolName }, '', newHash);
    } else if (location.hash !== newHash) {
        history.pushState({ tool: toolName }, '', newHash);
    }

    localStorage.setItem('lastToolsTab', toolName);
}

function reloadActiveTool() {
    const tool = TOOLS[toolsState.activeToolName];

    if (!tool) return;

    const frame = document.getElementById(tool.frameId);

    if (frame) frame.src = frame.getAttribute('src');
}

function goSongbook() {
    const editor = document.getElementById('editorFrame')?.contentWindow;
    editor?.rememberEditor?.();
    window.location.href = '../index.html';
}
export { TOOLS, openTool, reloadActiveTool, goSongbook };
