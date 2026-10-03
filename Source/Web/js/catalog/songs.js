import { libraryUrl } from '../core/data-source.js';
import { state } from '../core/state.js';
import {
    clearContextBar,
    getAppTitle,
    hideOldAlbumBar,
    setContextBar,
    setHeaderTitle,
} from '../shell/header.js';

function renderSongGrid(songs, container) {
    const html = songs
        .map(
            (s) => `
        <div class="card song-card has-cover"
             style="background-image: url('${libraryUrl(s.cover)}');"
             data-album="${s.album || ''}"
             onclick="window.history.pushState({}, '', '?song=${encodeURIComponent(s.file)}'); window.dispatchEvent(new Event('popstate'));">
            <div class="card-overlay"></div>
            <div class="card-content">
                <h3>${s.title}</h3>
                <div class="meta-info">
                    ${s.album || ''} ${s.year ? `(${s.year})` : ''}
                </div>
            </div>
        </div>
    `,
        )
        .join('');

    const grid = container.querySelector('.song-grid');

    if (grid) {
        grid.innerHTML = html || '<p>Žádné písně</p>';
    }
}

function renderAlphabetFilter(songs, container) {
    const alphabetContainer = container.querySelector('#alphabet-filter');
    if (!alphabetContainer) return;

    alphabetContainer.innerHTML = '';

    const alphabet = '#ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

    const usedLetters = new Set(
        songs.map((song) => {
            const first = song.title?.trim()?.[0]?.toUpperCase();

            if (!first) return '#';

            return /[A-Z]/.test(first) ? first : '#';
        }),
    );

    alphabet.forEach((letter) => {
        const btn = document.createElement('button');

        btn.className = 'letter-btn';
        btn.textContent = letter;
        btn.dataset.letter = letter;

        const enabled = usedLetters.has(letter);

        if (!enabled) {
            btn.classList.add('disabled');
            btn.disabled = true;
        }

        btn.addEventListener('click', () => {
            alphabetContainer.querySelectorAll('.letter-btn').forEach((b) => {
                b.classList.remove('active');
            });

            btn.classList.add('active');

            filterByLetter(letter, songs, container);
        });

        alphabetContainer.appendChild(btn);
    });
}

function filterByLetter(letter, songs, container) {
    let filteredSongs;

    if (letter === '#') {
        filteredSongs = songs.filter((song) => {
            const first = song.title?.trim()?.[0]?.toUpperCase();

            return !/[A-Z]/.test(first);
        });
    } else {
        filteredSongs = songs.filter((song) =>
            song.title?.trim()?.toUpperCase().startsWith(letter),
        );
    }

    renderSongGrid(filteredSongs, container);
}

function renderSongs(artistKey, container) {
    hideOldAlbumBar();

    let songs = [];

    if (Array.isArray(state.database)) {
        songs = state.database.filter((s) => s.artistKey === artistKey);
    } else if (state.database && typeof state.database === 'object') {
        const artistName = Object.keys(state.database).find(
            (k) => state.database[k].artistKey === artistKey,
        );

        songs = artistName ? [...state.database[artistName].songs] : [];
    }

    const artistName =
        songs[0]?.artist ||
        state.artists?.find((a) => a.artistKey === artistKey)?.artist ||
        'Interpret';

    setHeaderTitle(artistName, `${artistName} | ${getAppTitle()}`, 'index.html');

    const albumMap = {};

    const tempForAlbums = [...songs].sort((a, b) => (a.year || 0) - (b.year || 0));

    tempForAlbums.forEach((song) => {
        if (song.album && !albumMap[song.album]) {
            albumMap[song.album] = song.year || '';
        }
    });

    const albums = Object.keys(albumMap);

    if (albums.length > 1) {
        setContextBar(`
            <div class="context-chip-row">
                <button class="chip active" data-album="all">Všechna alba</button>

                ${albums
                    .map((album) => {
                        const albumSong = songs.find((s) => s.album === album);
                        const cover = albumSong?.cover || '';

                        return `
                        <button
                            class="album-cover-chip"
                            data-album="${album}"
                            data-year="${albumMap[album]}"
                            title="${album}${albumMap[album] ? ' (' + albumMap[album] + ')' : ''}"
                        >
                            <img src="${libraryUrl(cover)}" alt="${album}">
                        </button>
                    `;
                    })
                    .join('')}
            </div>
        `);
    } else {
        clearContextBar();
    }

    container.innerHTML = `
        <div class="sort-bar">
            <div class="sort-row">
                <span class="sort-label">Řadit:</span>
                <button class="sort-btn active" id="sortAbc">A-Z</button>
                <button class="sort-btn" id="sortNew">Od nejnovějšího</button>
                <div id="alphabet-filter" class="alphabet-filter"></div>
            </div>
        </div>

        <div class="song-grid"></div>
    `;

    const sortAbcBtn = container.querySelector('#sortAbc');
    const sortNewBtn = container.querySelector('#sortNew');

    sortAbcBtn.onclick = (e) => {
        const sorted = [...songs].sort((a, b) => a.title.localeCompare(b.title, 'cs'));

        renderSongGrid(sorted, container);
        renderAlphabetFilter(sorted, container);

        container.querySelectorAll('.sort-btn').forEach((btn) => {
            btn.classList.remove('active');
        });

        e.target.classList.add('active');

        container.querySelectorAll('.letter-btn').forEach((btn) => {
            btn.classList.remove('active');
        });

        setupAlbumFiltering();
    };

    sortNewBtn.onclick = (e) => {
        const sorted = [...songs].sort(
            (a, b) => new Date(b.last_modified || 0) - new Date(a.last_modified || 0),
        );

        renderSongGrid(sorted, container);
        renderAlphabetFilter(sorted, container);

        container.querySelectorAll('.sort-btn').forEach((btn) => {
            btn.classList.remove('active');
        });

        e.target.classList.add('active');

        setupAlbumFiltering();
    };

    const initial = [...songs].sort((a, b) => a.title.localeCompare(b.title, 'cs'));

    renderSongGrid(initial, container);
    renderAlphabetFilter(initial, container);
    setupAlbumFiltering();
}

function setupAlbumFiltering() {
    const contextBar = document.getElementById('contextBar');
    if (!contextBar) return;

    const filters = contextBar.querySelectorAll('.chip, .album-cover-chip');

    filters.forEach((filter) => {
        filter.onclick = () => {
            filters.forEach((c) => c.classList.remove('active'));

            filter.classList.add('active');

            const selectedAlbum = filter.dataset.album;

            document.querySelectorAll('.song-card').forEach((card) => {
                card.style.display =
                    selectedAlbum === 'all' || card.dataset.album === selectedAlbum
                        ? 'flex'
                        : 'none';
            });
        };
    });
}
export { renderSongGrid, renderAlphabetFilter, filterByLetter, renderSongs, setupAlbumFiltering };
