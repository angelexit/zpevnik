import {hideSearch} from '../catalog/search.js';
import { initPerformance } from './performance.js';
import { loadSong } from '../core/loader.js';
import { renderSongWithChordLayer } from '../core/parser.js';
import { getAppTitle, hideOldAlbumBar, setHeaderTitle } from '../shell/header.js';
import { getSongSettings } from './settings.js';
import { initSongToolbarSettings } from './toolbar.js';
import { renderSongContextToolbar } from './toolbar-layout.js';
import { paginateSongSections, showSongPage } from './pagination.js';
import { initChordTooltips } from '../chords/tooltips.js';

async function renderSongDetail(file, container) {
    return renderSongObject(await loadSong(file), container);
}

function renderSongObject(song, container) {
    hideOldAlbumBar();
    if (!song) return;
    hideSearch();document.body.classList.add('song-detail-view');

    const artist = song.artist || 'Interpret';
    const title = song.title || 'Píseň';
    const artistKey = song.artistKey || '';

    setHeaderTitle(
        `${artist} – ${title}`,
        `${artist} – ${title} | ${getAppTitle()}`,
        artistKey ? `?artist=${artistKey}` : 'index.html',
    );

    const settings = getSongSettings();

    renderSongContextToolbar(settings);

    const parts = Array.isArray(song.parts) ? song.parts : [];

    container.innerHTML = `
        <div class="song-page-info" id="songPageInfo" style="display:none;">
            Strana <span id="currentPageNum">1</span> /
            <span id="totalPageNum">1</span>
        </div>

        <div class="song-sections-grid" id="songContent" data-paginated="false">
            ${parts
                .map(
                    (part) => `
                <div class="song-section-card ${part.type || ''}" data-type="${part.type}">
                    <div class="section-label">${part.type}</div>
                    <div class="section-content">
                        ${(part.text || '')
                            .replace(/↵/g, '\n')
                            .split('\n')
                            .map((line) => {
                                let rendered = renderSongWithChordLayer(line);

                                if (rendered.includes('lyric-line') && line.trim() === '.') {
                                    rendered = rendered.replace(
                                        /<div class="lyric-line">\.<\/div>/,
                                        '<div class="lyric-line"></div>',
                                    );
                                }

                                return rendered;
                            })
                            .join('')}
                    </div>
                </div>
            `,
                )
                .join('')}
        </div>
    `;

    initSongToolbarSettings(settings);
    initPerformance(song);
    initChordTooltips();
    requestAnimationFrame(() => {
        setTimeout(() => {
            paginateSongSections();
            showSongPage(0);
        }, 100);
    });
}
export { renderSongDetail, renderSongObject };
