function repaginateSong() {
    const grid = document.querySelector('.song-sections-grid');

    if (!grid) return;

    resetPagesToFlatList();

    requestAnimationFrame(() => {
        paginateSongSections();
    });
}

let currentSongPage = 0;

function resetPagesToFlatList() {
    const grid = document.querySelector('.song-sections-grid');
    if (!grid) return;

    const cards = Array.from(grid.querySelectorAll('.song-section-card'));

    grid.innerHTML = '';

    cards.forEach((card) => {
        grid.appendChild(card);
    });

    grid.dataset.paginated = 'false';
}

function paginateSongSections() {
    const grid = document.querySelector('.song-sections-grid');

    if (!grid) return;

    const cards = Array.from(grid.querySelectorAll('.song-section-card'));

    if (!cards.length) return;

    if (grid.querySelector('.song-page-page')) {
        resetPagesToFlatList();

        requestAnimationFrame(paginateSongSections);

        return;
    }

    const pageHeight = Math.max(300, window.innerHeight - 180);

    grid.innerHTML = '';
    grid.dataset.paginated = 'true';

    let page = createSongPage();
    let leftColumn = createSongColumn();
    let rightColumn = createSongColumn();

    page.append(leftColumn, rightColumn);

    let leftHeight = 0;
    let rightHeight = 0;
    let hasCardsOnPage = false;

    cards.forEach((card) => {
        const cardHeight = measureSongCard(card, grid);

        if (leftHeight + cardHeight <= pageHeight || leftHeight === 0) {
            leftColumn.appendChild(card);
            leftHeight += cardHeight;
            hasCardsOnPage = true;

            return;
        }

        if (rightHeight + cardHeight <= pageHeight || rightHeight === 0) {
            rightColumn.appendChild(card);
            rightHeight += cardHeight;
            hasCardsOnPage = true;

            return;
        }

        if (hasCardsOnPage) {
            grid.appendChild(page);
        }

        page = createSongPage();
        leftColumn = createSongColumn();
        rightColumn = createSongColumn();

        page.append(leftColumn, rightColumn);

        leftColumn.appendChild(card);

        leftHeight = cardHeight;
        rightHeight = 0;
        hasCardsOnPage = true;
    });

    if (hasCardsOnPage) {
        grid.appendChild(page);
    }

    updateSongPages();
    showSongPage(0);
}

function measureSongCard(card, grid) {
    const tempWrap = document.createElement('div');

    tempWrap.className = 'song-page-page active';
    tempWrap.style.position = 'absolute';
    tempWrap.style.visibility = 'hidden';
    tempWrap.style.pointerEvents = 'none';
    tempWrap.style.left = '-99999px';
    tempWrap.style.top = '0';
    tempWrap.style.width = grid.clientWidth + 'px';

    const tempCol = document.createElement('div');
    tempCol.className = 'song-page-column';

    const clone = card.cloneNode(true);

    tempCol.appendChild(clone);
    tempWrap.appendChild(tempCol);

    document.body.appendChild(tempWrap);

    const height = clone.offsetHeight + 20;

    tempWrap.remove();

    return height;
}

function createSongPage() {
    const page = document.createElement('div');

    page.className = 'song-page-page';

    return page;
}

function createSongColumn() {
    const column = document.createElement('div');

    column.className = 'song-page-column';

    return column;
}

function updateSongPages() {
    const pages = document.querySelectorAll('.song-page-page');
    const total = pages.length;

    const totalEl = document.getElementById('totalPageNum');
    const currentEl = document.getElementById('currentPageNum');
    const info = document.getElementById('songPageInfo');

    if (totalEl) {
        totalEl.textContent = total;
    }

    if (currentEl) {
        currentEl.textContent = '1';
    }

    if (info) {
        info.style.display = total > 1 ? 'inline-flex' : 'none';
    }
}

function showSongPage(index) {
    const pages = document.querySelectorAll('.song-page-page');

    if (!pages.length) return;

    currentSongPage = Math.max(0, Math.min(index, pages.length - 1));

    pages.forEach((page, i) => {
        page.classList.toggle('active', i === currentSongPage);
    });

    const currentEl = document.getElementById('currentPageNum');

    if (currentEl) {
        currentEl.textContent = currentSongPage + 1;
    }

    autoFitActivePage();
}

document.addEventListener('keydown', (e) => {
    const isSongOpen = document.querySelector('.song-page-page');

    if (!isSongOpen) return;

    if (e.code === 'Space' || e.code === 'ArrowRight') {
        e.preventDefault();

        showSongPage(currentSongPage + 1);
    }

    if (e.code === 'ArrowLeft') {
        e.preventDefault();

        showSongPage(currentSongPage - 1);
    }
});

window.addEventListener('resize', () => {
    const grid = document.querySelector('.song-sections-grid');

    if (!grid) return;

    resetPagesToFlatList();

    requestAnimationFrame(paginateSongSections);
});

function autoFitActivePage() {
    const page = document.querySelector('.song-page-page.active');
    const grid = document.querySelector('.song-sections-grid');

    if (!page || !grid) return;

    page.style.transform = '';
    page.style.transformOrigin = 'top left';
    page.style.width = '100%';

    const maxWidth = grid.clientWidth;
    const maxHeight = grid.clientHeight;

    const scaleX = maxWidth / page.scrollWidth;
    const scaleY = maxHeight / page.scrollHeight;
    const scale = Math.min(1, scaleX, scaleY);

    page.style.transform = `scale(${scale})`;
    page.style.width = `${100 / scale}%`;
}
export {
    repaginateSong,
    currentSongPage,
    resetPagesToFlatList,
    paginateSongSections,
    measureSongCard,
    createSongPage,
    createSongColumn,
    updateSongPages,
    showSongPage,
    autoFitActivePage,
};
