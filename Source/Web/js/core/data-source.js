// The desktop host exposes the selected local library at /data/.
// A future TV or GitHub-backed client can replace this provider without changing renderers.
export const libraryRoot = new URL('./data/', new URL('../../index.html', import.meta.url));
export function libraryUrl(path) {
    const clean = String(path).replace(/^\.\//, '');
    const url = new URL(clean, libraryRoot);
    if (!url.href.startsWith(libraryRoot.href))
        throw new Error('Neplatná cesta v knihovně: ' + path);
    return url.href;
}
export async function readLibraryJson(path) {
    const response = await fetch(libraryUrl(path), { cache: 'no-store' });
    if (!response.ok) throw new Error('Nelze načíst data: ' + path + ' (' + response.status + ')');
    return response.json();
}
