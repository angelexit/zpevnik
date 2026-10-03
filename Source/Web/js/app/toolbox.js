import { logout } from './login.js';

function setupToolbox() {
    const btn = document.getElementById('toolsBtn');
    const panel = document.getElementById('adminToolbox');
    const logoutBtn = document.getElementById('logoutBtn');

    if (!btn || !panel) return;

    btn.onclick = (e) => {
        e.stopPropagation();

        panel.classList.toggle('active');
    };

    document.onclick = () => {
        panel.classList.remove('active');
    };

    panel.onclick = (e) => {
        e.stopPropagation();
    };

    if (logoutBtn) {
        logoutBtn.onclick = logout;
    }
}
export { setupToolbox };
