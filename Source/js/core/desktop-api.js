export async function api(endpoint, body) {
    const response = await fetch('/api/' + endpoint + (body ? '' : ''), {
        method: body ? 'POST' : 'GET',
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body: body ? JSON.stringify(body) : undefined,
        cache: 'no-store',
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Operace se nezdařila.');
    return data;
}
export function announceChange() {
    localStorage.setItem(
        'zpevnik-library-change',
        JSON.stringify({ at: Date.now(), id: crypto.randomUUID() }),
    );
}
export function notice(message, error = false) {
    let el = document.getElementById('save-notice');
    if (!el) {
        el = document.createElement('div');
        el.id = 'save-notice';
        el.setAttribute('role', 'status');
        el.style.cssText =
            'position:fixed;bottom:22px;right:22px;z-index:99999;max-width:650px;padding:18px 24px;border-radius:12px;color:white;box-shadow:0 4px 20px #0005;white-space:pre-wrap';
        document.body.append(el);
    }
    el.style.background = error ? '#a51d36' : '#087c66';
    el.textContent = message;
    el.hidden = false;
    clearTimeout(notice.timer);
    notice.timer = setTimeout(() => (el.hidden = true), error ? 18000 : 7000);
}
export function libraryDirectory(path) {
    const handle = (name) => ({
        kind: 'file',
        name: name.split('/').pop(),
        async getFile() {
            const r = await fetch('/data/' + path + '/' + name, { cache: 'no-store' });
            if (!r.ok) throw new Error('Soubor nenalezen');
            return new File([await r.blob()], name);
        },
        async createWritable() {
            let blob;
            return {
                async write(value) {
                    blob = value instanceof Blob ? value : new Blob([value]);
                },
                async close() {
                    const base64 = await new Promise((resolve, reject) => {
                        const r = new FileReader();
                        r.onload = () => resolve(r.result.split(',')[1]);
                        r.onerror = reject;
                        r.readAsDataURL(blob);
                    });
                    await api('cover', { path: path + '/' + name, base64 });
                    announceChange();
                },
            };
        },
    });
    return {
        kind: 'directory',
        name: path,
        async getFileHandle(name, options = {}) {
            const h = handle(name);
            if (!options.create) await h.getFile();
            return h;
        },
        async *entries() {
            for (const name of await api('list?path=' + encodeURIComponent(path)))
                yield [name, handle(name)];
        },
    };
}
