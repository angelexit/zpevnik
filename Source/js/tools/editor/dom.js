const $ = (id) => document.getElementById(id);

const setStatus = (id, text, cls = '') => {
    const el = $(id);
    el.textContent = text;
    el.className = 'status ' + cls;
};

function openTab(ev, id) {
    document.querySelectorAll('.tab-content').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    $(id).classList.add('active');
    ev.currentTarget.classList.add('active');
}

function openChordEditor() {
    window.open('chords.html', '_blank');
}

function escapeHtml(s) {
    return (s || '').replace(
        /[&<>"]/g,
        (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch],
    );
}
export { $, setStatus, openTab, openChordEditor, escapeHtml };
