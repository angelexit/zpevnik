function slug(t) {
    return (t || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
}

function normalizePath(p) {
    return (p || '')
        .replace(/\\/g, '/')
        .replace(/^songs\//i, '')
        .replace(/^\//, '');
}

function basename(p) {
    return normalizePath(p).split('/').pop();
}
export { slug, normalizePath, basename };
