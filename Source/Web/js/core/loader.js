import { readLibraryJson } from './data-source.js';
export async function fetchData(path) {
    if (path === './config.json') {
        const response = await fetch(path, { cache: 'no-store' });
        if (!response.ok) throw new Error('Nelze načíst nastavení aplikace.');
        const config=await response.json();
        try {
            const shared=await fetch('/data/config.json',{cache:'no-store'});
            if(shared.ok){const data=await shared.json();for(const key of ['appTitle','appVersion','defaultTheme','searchPlaceholder','homeTitle','loadingText','sectionLabels'])if(data[key]!==undefined)config[key]=data[key];}
        }catch{}
        return config;
    }
    return readLibraryJson(path);
}
export async function loadSong(fileName) {
    return readLibraryJson('songs/' + fileName);
}
