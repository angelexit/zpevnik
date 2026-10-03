import { state } from '../core/state.js';

function getAppTitle() {
    return state.config?.appTitle || 'Zpěvník';
}

function getAppVersion() {
    return state.config?.appVersion || '';
}

function setHeaderTitle(text, browserTitle = null, href = 'index.html') {
    const mainTitle = document.getElementById('mainTitle');

    if (mainTitle) {
        mainTitle.textContent = text;
        mainTitle.href = href;
    }

    document.title = browserTitle || text;
}

function setContextBar(html = '') {
    const contextBar = document.getElementById('contextBar');
    if (!contextBar) return;

    contextBar.innerHTML = html;
}

function clearContextBar() {
    setContextBar('');
}

function hideOldAlbumBar() {
    const albumBar = document.getElementById('album-filter-bar');
    if (albumBar) {
        albumBar.style.display = 'none';
    }
}
export {
    getAppTitle,
    getAppVersion,
    setHeaderTitle,
    setContextBar,
    clearContextBar,
    hideOldAlbumBar,
};
