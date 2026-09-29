import { readLibraryJson } from './data-source.js';
export async function fetchData(path) {
    if (path === './config.json') {
        const response = await fetch(path, { cache: 'no-store' });
        if (!response.ok) throw new Error('Nelze načíst nastavení aplikace.');
        return response.json();
    }
    return readLibraryJson(path);
}
export async function loadSong(fileName) {
    return readLibraryJson('songs/' + fileName);
}
