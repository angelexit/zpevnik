let currentSongPage = 0,
    scheduled = 0;
function repaginateSong() {
    cancelAnimationFrame(scheduled);
    scheduled = requestAnimationFrame(paginateSongSections);
}
function resetPagesToFlatList() {
    const grid = document.getElementById('songContent');
    if (!grid) return;
    const cards = grid.originalCards || [...grid.querySelectorAll('.song-section-card')];
    grid.replaceChildren(...cards);
    grid.dataset.paginated = 'false';
}
function createSongPage() {
    const p = document.createElement('div');
    p.className = 'song-page-page';
    return p;
}
function createSongColumn() {
    const c = document.createElement('div');
    c.className = 'song-page-column';
    return c;
}
function measureSongCard(card, grid) {
    const wrap = createSongPage();
    wrap.classList.add('active');
    wrap.style.cssText =
        'position:absolute;visibility:hidden;pointer-events:none;top:0;left:0;width:100%;height:auto';
    const column = createSongColumn();
    const clone = card.cloneNode(true);
    column.append(clone);
    wrap.append(column);
    grid.append(wrap);
    const height = clone.getBoundingClientRect().height;
    wrap.remove();
    return height;
}
function blankCard(card) {
    const copy = card.cloneNode(false);
    const label = card.querySelector('.section-label').cloneNode(true);
    const content = document.createElement('div');
    content.className = 'section-content';
    copy.append(label, content);
    return copy;
}
function splitCard(card, grid, limit) {
    if (measureSongCard(card, grid) <= limit) return [card];
    const result = [];
    let piece = blankCard(card);
    const content = () => piece.querySelector('.section-content');
    const flush = () => {
        if (content().childNodes.length) result.push(piece);
        piece = blankCard(card);
    };
    for (const verse of card.querySelectorAll('.song-line')) {
        const line = verse.cloneNode(true);
        content().append(line);
        if (measureSongCard(piece, grid) <= limit) continue;
        line.remove();
        flush();
        content().append(line);
        if (measureSongCard(piece, grid) <= limit) continue;
        line.remove();
        let row = verse.cloneNode(false);
        content().append(row);
        for (const word of verse.childNodes) {
            const clone = word.cloneNode(true);
            row.append(clone);
            if (measureSongCard(piece, grid) > limit && row.childNodes.length > 1) {
                clone.remove();
                flush();
                row = verse.cloneNode(false);
                content().append(row);
                row.append(clone);
            }
        }
    }
    flush();
    return result;
}
function paginateSongSections() {
    const grid = document.getElementById('songContent');
    if (!grid) return;
    if (!grid.originalCards) grid.originalCards = [...grid.querySelectorAll('.song-section-card')];
    if (!grid.originalCards.length) return;
    const old = currentSongPage;
    grid.replaceChildren();
    grid.dataset.paginated = 'true';
    const pageHeight = Math.max(240, innerHeight - grid.getBoundingClientRect().top - 20);
    grid.style.setProperty('height', pageHeight + 'px', 'important');
    const gap = document.body.classList.contains('compact-sections-enabled') ? 12 : 20;
    const columns = innerWidth <= 900 ? 1 : 2;
    const cards = grid.originalCards.flatMap((card) => splitCard(card, grid, pageHeight));
    let page,
        column,
        height = 0,
        index = columns;
    const queue=[...cards];
    while(queue.length) {
        const card=queue.shift();
        const h = measureSongCard(card, grid);
        if (!column || height + h > pageHeight) {
            if (index >= columns) {
                page = createSongPage();
                grid.append(page);
                index = 0;
            }
            column = createSongColumn();
            page.append(column);
            index++;
            height = 0;
        }
        column.append(card);
        height += h + gap;
    }
    updateSongPages();
    showSongPage(old);
}
function updateSongPages() {
    const total = document.querySelectorAll('.song-page-page').length;
    const label = document.getElementById('totalPageNum');
    if (label) label.textContent = total;
    const info = document.getElementById('songPageInfo');
    if (info) info.style.display = total > 1 ? 'inline-flex' : 'none';
}
function showSongPage(index) {
    const pages = [...document.querySelectorAll('#songContent>.song-page-page')];
    if (!pages.length) return;
    currentSongPage = Math.max(0, Math.min(index, pages.length - 1));
    pages.forEach((p, i) => p.classList.toggle('active', i === currentSongPage));
    const n = document.getElementById('currentPageNum');
    if (n) n.textContent = currentSongPage + 1;
    autoFitActivePage();
}
function autoFitActivePage() {
    const page = document.querySelector('#songContent>.song-page-page.active');
    if (!page) return;
    page.style.transform = '';
    const grid = page.parentElement;
    const scale = Math.min(1, grid.clientHeight / page.scrollHeight);
    if (scale < 0.99) {
        page.style.transformOrigin = 'top left';
        page.style.transform = `scale(${scale})`;
    }
}
document.addEventListener('keydown', (e) => {
    if (
        e.target.closest('input,select,textarea,button,[contenteditable="true"]') ||
        !document.getElementById('songContent')
    )
        return;
    if (['Space', 'ArrowRight', 'ArrowLeft'].includes(e.code)) {
        e.preventDefault();
        showSongPage(currentSongPage + (e.code === 'ArrowLeft' ? -1 : 1));
    }
});
window.addEventListener('resize', repaginateSong);
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
