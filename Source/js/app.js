import { fetchData } from './core/loader.js';
import { state } from './core/state.js';
import { setupLogin } from './app/login.js';
import { setupTheme } from './app/theme.js';
import { setupToolbox } from './app/toolbox.js';
import { router } from './app/router.js';

import './shell/interactions.js';

async function init() {
    try {
        state.config = await fetchData('./config.json');
        state.database = await fetchData('./database.json');
        state.artists = await fetchData('./artists.json');

        setupTitle();
        setupLogin();
        setupTheme();
        setupToolbox();

        window.onpopstate = router;

        router();
    } catch (err) {
        console.error('Chyba při startu:', err);
        const content = document.getElementById('app-content');
        if (content)
            content.textContent =
                'Data zpěvníku se nepodařilo načíst. Zkontroluj datovou složku v nabídce aplikace. ' +
                err.message;
    }
}

function setupTitle() {
    const mt = document.getElementById('mainTitle');

    if (mt && state.config) {
        mt.textContent = state.config.appTitle;
    }
}

init();
export { init, setupTitle };

window.addEventListener('storage', (e) => {
    if (e.key === 'zpevnik-library-change' && !location.search.includes('preview='))
        location.reload();
});
