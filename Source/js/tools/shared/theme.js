function applyEmbeddedTheme(theme) {
    const isDark = theme === 'dark';

    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle('dark-mode', isDark);
    document.body.classList.toggle('dark-mode', isDark);
}
export { applyEmbeddedTheme };
