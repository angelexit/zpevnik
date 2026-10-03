import { editorState } from './state.js';
import { $ } from './dom.js';
import { downloadFileSafe, writeTextFileToDir } from './downloads.js';
import { normalizePath, slug } from '../shared/paths.js';

async function collectSongsFromDirectory(dirHandle, prefix = '') {
    const files = [];
    for await (const [name, handle] of dirHandle.entries()) {
        const rel = prefix ? `${prefix}/${name}` : name;
        if (handle.kind === 'directory')
            files.push(...(await collectSongsFromDirectory(handle, rel)));
        else if (handle.kind === 'file' && name.toLowerCase().endsWith('.json'))
            files.push({ handle, rel });
    }
    return files;
}

async function pickIndexerFolder() {
    if (!window.showDirectoryPicker) {
        $('indexer-status').textContent = 'Prohlížeč nepodporuje výběr složky. Použij Chrome/Edge.';
        return;
    }
    try {
        editorState.indexerDirHandle = await window.showDirectoryPicker({ mode: 'read' });
        const items = await collectSongsFromDirectory(editorState.indexerDirHandle);
        $('indexer-folder-status').textContent =
            `Zdroj vybrán: ${editorState.indexerDirHandle.name} / nalezeno ${items.length} JSON souborů.`;
        $('indexer-status').textContent =
            'Složka připravena. Vyber cíl výstupu nebo rovnou klikni na „Generovat indexy“.';
    } catch (err) {
        $('indexer-status').textContent = 'Výběr složky zrušen.';
    }
}

async function pickIndexerOutputFolder() {
    if (!window.showDirectoryPicker) {
        $('indexer-status').textContent =
            'Prohlížeč nepodporuje zápis do složky. Použije se stažení souborů.';
        return;
    }
    try {
        editorState.indexerOutputDirHandle = await window.showDirectoryPicker({
            mode: 'readwrite',
        });
        $('indexer-output-status').textContent =
            `Cíl výstupu: ${editorState.indexerOutputDirHandle.name} / soubory se zapíšou přímo sem.`;
        $('indexer-status').textContent = 'Cíl připraven.';
    } catch (err) {
        $('indexer-status').textContent = 'Výběr cílové složky zrušen. Použije se stažení souborů.';
    }
}

async function useEditorSongsFolderForIndexer() {
    if (!editorState.songsDirHandle) {
        $('indexer-status').textContent =
            'Nejdřív nahoře v editoru vyber složku songs/, nebo tady klikni na „Vybrat jinou složku“.';
        return;
    }
    editorState.indexerDirHandle = editorState.songsDirHandle;
    const items = await collectSongsFromDirectory(editorState.indexerDirHandle);
    $('indexer-folder-status').textContent =
        `Používám připojenou složku: ${editorState.indexerDirHandle.name} / nalezeno ${items.length} JSON souborů.`;
    $('indexer-status').textContent =
        'Složka připravena. Vyber cíl výstupu nebo rovnou klikni na „Generovat indexy“.';
}

async function generateIndexesFromSelectedFolder() {
    try {
        if (!editorState.indexerDirHandle && editorState.songsDirHandle) {
            editorState.indexerDirHandle = editorState.songsDirHandle;
            $('indexer-folder-status').textContent =
                `Automaticky používám připojenou složku: ${editorState.songsDirHandle.name}.`;
        }
        if (!editorState.indexerDirHandle) {
            $('indexer-status').textContent = 'Nejdřív vyber zdrojovou složku songs/.';
            return;
        }
        $('indexer-status').textContent = 'Generuji indexy…';
        const items = await collectSongsFromDirectory(editorState.indexerDirHandle);
        if (!items.length) {
            $('indexer-status').textContent =
                'Ve vybrané složce nebyly nalezeny žádné JSON soubory.';
            return;
        }
        await generateIndexes(items.map((x) => ({ fileLike: null, rel: x.rel, handle: x.handle })));
    } catch (err) {
        console.error(err);
        $('indexer-status').textContent =
            'CHYBA při generování: ' + (err && err.message ? err.message : err);
    }
}

async function saveIndexOutputs(database, artists, todoText) {
    const databaseText = JSON.stringify(database, null, 2);
    const artistsText = JSON.stringify(artists, null, 2);
    const preview = $('indexer-preview');
    if (preview) {
        preview.style.display = 'block';
        preview.value = databaseText;
    }
    if (editorState.indexerOutputDirHandle) {
        await writeTextFileToDir(editorState.indexerOutputDirHandle, 'database.json', databaseText);
        await writeTextFileToDir(editorState.indexerOutputDirHandle, 'artists.json', artistsText);
        await writeTextFileToDir(
            editorState.indexerOutputDirHandle,
            'OBRAZKY_K_DOPLNENI.txt',
            todoText,
            'text/plain',
        );
        $('indexer-status').textContent =
            `HOTOVO: Zpracováno ${database.length} písní. Soubory jsou zapsané do cílové složky.`;
    } else {
        downloadFileSafe(databaseText, 'database.json', 'application/json');
        setTimeout(() => downloadFileSafe(artistsText, 'artists.json', 'application/json'), 300);
        setTimeout(() => downloadFileSafe(todoText, 'OBRAZKY_K_DOPLNENI.txt', 'text/plain'), 600);
        $('indexer-status').textContent =
            `HOTOVO: Zpracováno ${database.length} písní. Pokud Chrome blokne stažení, database.json je dole v náhledu.`;
    }
}

async function generateIndexes(items) {
    const database = [];
    const artistsMap = new Map();
    const todo = ['ÚKOLY: OBRÁZKY (POSLEDNÍCH 7 DNÍ)\n' + '='.repeat(30)];
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    let skipped = 0;
    for (const item of items) {
        try {
            const file = item.fileLike || (await item.handle.getFile());
            const song = JSON.parse(await file.text());
            if (!song || !song.title || !song.artist) {
                skipped++;
                continue;
            }
            const aK = song.artistKey || slug(song.artist);
            const alK = slug(song.album || 'nezname');
            const cover = `img/covers/${aK}-${alK}.jpg`;
            const rel = normalizePath(item.rel);
            database.push({
                file: rel,
                artistKey: aK,
                artist: song.artist,
                title: song.title,
                album: song.album || '',
                year: song.year || '',
                cover: cover,
                status: song.status?.state || 'needs_review',
                issues: song.status?.issues || [],
                played: song.playback?.played === true,
            });
            if (!artistsMap.has(aK))
                artistsMap.set(aK, {
                    artistKey: aK,
                    artist: song.artist,
                    count: 0,
                    cover: `img/interprets/${aK}.jpg`,
                });
            artistsMap.get(aK).count++;
            if (file.lastModified > weekAgo.getTime()) {
                todo.push(`[ ] Interpret: img/interprets/${aK}.jpg`);
                todo.push(`[ ] Album: ${cover}`);
                todo.push('---');
            }
        } catch (err) {
            console.warn('Přeskakuji JSON:', item.rel, err);
            skipped++;
        }
    }
    const databaseSorted = database.sort(
        (a, b) =>
            (a.artist || '').localeCompare(b.artist || '', 'cs') ||
            (a.title || '').localeCompare(b.title || '', 'cs'),
    );
    const artistsSorted = Array.from(artistsMap.values()).sort((a, b) =>
        (a.artist || '').localeCompare(b.artist || '', 'cs'),
    );
    let todoText = todo.join('\n');
    if (skipped) todoText += `\n\nPřeskočeno JSON souborů: ${skipped}`;
    await saveIndexOutputs(databaseSorted, artistsSorted, todoText);
}
export {
    collectSongsFromDirectory,
    pickIndexerFolder,
    pickIndexerOutputFolder,
    useEditorSongsFolderForIndexer,
    generateIndexesFromSelectedFolder,
    saveIndexOutputs,
    generateIndexes,
};
