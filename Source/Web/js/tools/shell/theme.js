function applyToolsTheme(theme) {
    const isDark = theme === 'dark';

    document.documentElement.dataset.theme = theme;

    document.documentElement.classList.toggle('dark-mode', isDark);

    document.body.classList.toggle('dark-mode', isDark);

    const button = document.getElementById('toolsThemeBtn');

    if (button) {
        button.textContent = isDark ? '☀️' : '🌙';

        button.title = isDark ? 'Přepnout na světlý režim' : 'Přepnout na tmavý režim';
    }

    /*
            iframe má vlastní dokument.

            Editor, export i akordy si ale čtou stejný
            localStorage klíč "theme", takže režim zůstane
            jednotný. Pošleme jim navíc zprávu pro okamžité
            překreslení bez reloadu.
        */

    document.querySelectorAll('.tool-frame').forEach((frame) => {
        try {
            frame.contentWindow?.postMessage(
                {
                    type: 'zpevnik-theme-change',
                    theme,
                },
                '*',
            );
        } catch (error) {
            console.warn('Režim se nepodařilo předat iframe:', error);
        }
    });
}

function toggleToolsTheme() {
    const currentTheme = localStorage.getItem('theme') || 'dark';

    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';

    localStorage.setItem('theme', nextTheme);

    applyToolsTheme(nextTheme);
}
export { applyToolsTheme, toggleToolsTheme };
