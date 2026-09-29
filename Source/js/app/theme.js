import { state } from '../core/state.js';

function setupTheme() {
    const btn = document.getElementById('themeBtn');

    if (!btn) return;

    const savedTheme = localStorage.getItem('theme') || state.config.defaultTheme;

    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }

    updateThemeIcon();

    btn.onclick = () => {
        document.body.classList.toggle('dark-mode');

        const theme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';

        localStorage.setItem('theme', theme);

        updateThemeIcon();
    };
}

function updateThemeIcon() {
    const btn = document.getElementById('themeBtn');

    if (!btn) return;

    const isDark = document.body.classList.contains('dark-mode');

    btn.textContent = isDark ? '☀️' : '🌙';
}
export { setupTheme, updateThemeIcon };
