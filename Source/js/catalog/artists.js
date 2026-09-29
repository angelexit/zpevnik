import { libraryUrl } from '../core/data-source.js';
import { state } from '../core/state.js';
import {
    clearContextBar,
    getAppTitle,
    getAppVersion,
    hideOldAlbumBar,
    setHeaderTitle,
} from '../shell/header.js';

function renderArtists(container) {
    hideOldAlbumBar();

    const appTitle = getAppTitle();
    const appVersion = getAppVersion();

    const artistCount = state.artists?.length || 0;

    const songCount = Array.isArray(state.database) ? state.database.length : 0;

    const fullTitle = appVersion
        ? `${appTitle} ${appVersion} · ${artistCount} interpretů · ${songCount} písní`
        : `${appTitle} · ${artistCount} interpretů · ${songCount} písní`;

    setHeaderTitle(fullTitle, fullTitle, 'index.html');
    clearContextBar();

    const artists = state.artists || [];

    const html = artists
        .map(
            (a) => `
        <div class="card has-cover"
             style="background-image: url('${libraryUrl(a.cover)}');"
             onclick="window.history.pushState({}, '', '?artist=${a.artistKey}'); window.dispatchEvent(new Event('popstate'));">
            <div class="card-overlay"></div>
            <div class="card-content">
                <h3>${a.artist}</h3>
                <div class="meta-info">${a.count} písní</div>
            </div>
        </div>
    `,
        )
        .join('');

    container.innerHTML = `
        <div class="artist-grid">
            ${html || '<p>Žádná data</p>'}
        </div>
    `;
}
export { renderArtists };
