import { renderArtists } from '../catalog/artists.js';
import { renderSongs } from '../catalog/songs.js';
import { renderSongDetail, renderSongObject } from '../song/view.js';

async function router() {
    const params = new URLSearchParams(window.location.search);

    const artistKey = params.get('artist');
    const songFile = params.get('song');

    const content = document.getElementById('app-content');

    if (!content) return;

    content.innerHTML = '';

    if (params.has('preview')) {
        const key = params.get('preview');
        if (!key.startsWith('zpevnik-preview:')) throw new Error('Neplatný náhled');
        const song = JSON.parse(localStorage.getItem(key) || 'null');
        if (!song) {
            content.textContent = 'Náhled už není k dispozici. Otevři jej znovu v editoru.';
            return;
        }
        renderSongObject(song, content);
        const banner = document.createElement('div');
        banner.textContent = 'Náhled úprav · soubor se tímto neukládá';
        banner.style.cssText = 'padding:8px 24px;background:#e4ddff;color:#401880';
        content.prepend(banner);
    } else if (songFile) {
        await renderSongDetail(songFile, content);
    } else if (artistKey) {
        renderSongs(artistKey, content);
    } else {
        renderArtists(content);
    }
}
export { router };
