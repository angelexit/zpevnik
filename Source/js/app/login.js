import { state } from '../core/state.js';

function setupLogin() {
    if (!state.config.loginEnabled) {
        applyMode('user');
        return;
    }

    const savedMode = localStorage.getItem('zpevnikMode');
    const savedEmail = localStorage.getItem('zpevnikUserEmail');

    if (!savedMode) {
        showLoginOverlay();
    } else {
        applyMode(savedMode, savedEmail);
    }
}

function showLoginOverlay() {
    const overlay = document.getElementById('loginOverlay');

    overlay.classList.remove('hidden');

    /* USER LOGIN */

    document.getElementById('userLoginBtn').onclick = () => {
        const email = document.getElementById('userEmailInput').value.trim();

        if (!email || !email.includes('@')) {
            showLoginError('Zadej platný email.');

            return;
        }

        localStorage.setItem('zpevnikMode', 'user');
        localStorage.setItem('zpevnikUserEmail', email);

        console.log('USER LOGIN:', email);

        overlay.classList.add('hidden');

        applyMode('user', email);
    };

    /* ADMIN LOGIN */

    document.getElementById('adminLoginBtn').onclick = () => {
        const name = document.getElementById('adminNameInput').value.trim();

        const pass = document.getElementById('adminPassInput').value.trim();

        if (name === state.config.adminName && pass === state.config.adminPassword) {
            localStorage.setItem('zpevnikMode', 'admin');
            localStorage.setItem('zpevnikUserEmail', 'admin');

            console.log('ADMIN LOGIN');

            overlay.classList.add('hidden');

            applyMode('admin', 'admin');
        } else {
            showLoginError('Špatné admin přihlášení.');
        }
    };
}

function showLoginError(text) {
    const el = document.getElementById('loginError');

    if (!el) return;

    el.textContent = text;
}

function applyMode(mode, email = '') {
    document.body.dataset.mode = mode;

    const toolsBtn = document.getElementById('toolsBtn');

    if (mode === 'admin') {
        if (toolsBtn) {
            toolsBtn.style.display = 'flex';
        }
    } else {
        if (toolsBtn) {
            toolsBtn.style.display = 'none';
        }
    }
}

function logout() {
    localStorage.removeItem('zpevnikMode');
    localStorage.removeItem('zpevnikUserEmail');

    location.reload();
}
export { setupLogin, showLoginOverlay, showLoginError, applyMode, logout };
