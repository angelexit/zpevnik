import { exportState } from './state.js';
import { basename, slug } from '../shared/paths.js';

function makeDatabase() {
    return exportState.loadedSongs
        .map((x) => {
            const s = x.song;
            const aK = s.artistKey || slug(s.artist);
            const alK = slug(s.album || 'nezname');
            const statusState =
                typeof s.status === 'string' ? s.status : s.status?.state || 'needs_review';
            const playedValue = s.played === true || s.playback?.played === true;
            return {
                file: basename(x.file),
                artistKey: aK,
                artist: s.artist || '',
                title: s.title || '',
                album: s.album || '',
                year: s.year || '',
                cover: `img/covers/${aK}-${alK}.jpg`,
                status: statusState,
                played: playedValue,
            };
        })
        .sort(
            (a, b) =>
                a.artist.localeCompare(b.artist, 'cs') || a.title.localeCompare(b.title, 'cs'),
        );
}

function makeArtists() {
    const map = new Map();
    for (const x of exportState.loadedSongs) {
        const s = x.song;
        const aK = s.artistKey || slug(s.artist);
        if (!map.has(aK))
            map.set(aK, {
                artistKey: aK,
                artist: s.artist || '',
                count: 0,
                cover: `img/interprets/${aK}.jpg`,
            });
        map.get(aK).count++;
    }
    return Array.from(map.values()).sort((a, b) => a.artist.localeCompare(b.artist, 'cs'));
}
export { makeDatabase, makeArtists };
