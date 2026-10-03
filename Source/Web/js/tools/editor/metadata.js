import { editorState } from './state.js';
import { $ } from './dom.js';
import { updatePaths } from './covers.js';

function populateArtistSelect() {
    const sel = $('artistSelect');
    const artists = Array.from(
        new Set(editorState.currentDb.map((s) => (s.artist || '').trim()).filter(Boolean)),
    ).sort((a, b) => a.localeCompare(b, 'cs'));
    editorState.currentArtists = artists;
    sel.disabled = false;
    sel.innerHTML = '<option value="">-- Vyber interpreta pro novou píseň --</option>';
    artists.forEach((name) => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        sel.appendChild(opt);
    });
    const custom = document.createElement('option');
    custom.value = '__custom__';
    custom.textContent = '➕ Vlastní / nový interpret…';
    sel.appendChild(custom);
}

function handleArtistSelectChange() {
    const sel = $('artistSelect');
    const input = $('artist');
    if (sel.value === '__custom__') {
        input.style.display = 'block';
        input.value = '';
        input.focus();
    } else if (sel.value) {
        input.style.display = 'none';
        input.value = sel.value;
    } else {
        input.style.display = 'none';
        input.value = '';
    }
    populateAlbumSelect(input.value);
    updatePaths();
}

function setArtistValue(name) {
    const value = name || '';
    const sel = $('artistSelect');
    const input = $('artist');
    input.value = value;
    if (editorState.currentArtists.includes(value)) {
        sel.value = value;
        input.style.display = 'none';
    } else if (value) {
        sel.value = '__custom__';
        input.style.display = 'block';
    } else {
        sel.value = '';
        input.style.display = 'none';
    }
}

function handleCustomArtistInput() {
    populateAlbumSelect($('artist').value);
    updatePaths();
}

function getAlbumListForArtist(artistName) {
    const map = new Map();
    editorState.currentDb
        .filter((s) => (s.artist || '').trim() === (artistName || '').trim())
        .forEach((s) => {
            const album = (s.album || '').trim();
            if (!album) return;
            const year = (s.year || '').toString().trim();
            if (!map.has(album)) map.set(album, { album, year });
            else if (!map.get(album).year && year) map.get(album).year = year;
        });
    return Array.from(map.values()).sort((a, b) => a.album.localeCompare(b.album, 'cs'));
}

function populateAlbumSelect(artistName) {
    const sel = $('albumSelect');
    const input = $('album');
    const cleanArtist = (artistName || '').trim();
    const albums = getAlbumListForArtist(cleanArtist);
    editorState.currentAlbums = albums;

    input.style.display = 'none';
    input.value = '';

    if (!cleanArtist) {
        sel.disabled = true;
        sel.innerHTML = '<option value="">-- Nejdříve vyber interpreta --</option>';
        input.style.display = 'none';
        input.value = '';
        return;
    }

    sel.disabled = false;
    sel.innerHTML = '<option value="">-- Vyber album --</option>';
    albums.forEach((item) => {
        const opt = document.createElement('option');
        opt.value = item.album;
        opt.dataset.year = item.year || '';
        opt.textContent = item.year ? `${item.album} (${item.year})` : item.album;
        sel.appendChild(opt);
    });
    const custom = document.createElement('option');
    custom.value = '__custom__';
    custom.textContent = '➕ Vlastní / nové album…';
    sel.appendChild(custom);

    if (!albums.length) {
        sel.value = '__custom__';
        input.style.display = 'block';
    }
}

function handleAlbumSelectChange() {
    const sel = $('albumSelect');
    const input = $('album');
    if (sel.value === '__custom__') {
        input.style.display = 'block';
        input.value = '';
        input.focus();
    } else if (sel.value) {
        input.style.display = 'none';
        input.value = sel.value;
        const year = sel.selectedOptions[0]?.dataset.year || '';
        if (year) $('year').value = year;
    } else {
        input.style.display = 'none';
        input.value = '';
    }
    updatePaths();
}

function handleCustomAlbumInput() {
    updatePaths();
}

function setAlbumValue(albumName, yearValue = '') {
    const value = albumName || '';
    const sel = $('albumSelect');
    const input = $('album');
    const item = editorState.currentAlbums.find((a) => a.album === value);
    input.value = value;
    if (item) {
        sel.value = value;
        input.style.display = 'none';
        if (!$('year').value && item.year) $('year').value = item.year;
    } else if (value) {
        sel.value = '__custom__';
        input.style.display = 'block';
    } else {
        sel.value = '';
        input.style.display = 'none';
    }
    if (yearValue) $('year').value = yearValue;
}
export {
    populateArtistSelect,
    handleArtistSelectChange,
    setArtistValue,
    handleCustomArtistInput,
    getAlbumListForArtist,
    populateAlbumSelect,
    handleAlbumSelectChange,
    handleCustomAlbumInput,
    setAlbumValue,
};
