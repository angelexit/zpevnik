import { exportState } from './state.js';

function makeReport() {
    const lines = [];
    lines.push('ZPĚVNÍK EXPORT REPORT');
    lines.push('Vytvořeno: ' + new Date().toLocaleString());
    lines.push('='.repeat(50));
    lines.push('Songů OK: ' + exportState.loadedSongs.length);
    lines.push('Chybné JSON: ' + exportState.jsonErrors.length);
    lines.push('');
    const groups = {
        needs_review: [],
        needs_rework: [],
        not_played: [],
        missing_cover_note: [],
        missing_title: [],
        missing_artist: [],
    };
    for (const x of exportState.loadedSongs) {
        const s = x.song;
        const name = (s.artist || '-') + ' – ' + (s.title || '-') + ' [' + x.file + ']';
        if (
            (typeof s.status === 'string' ? s.status : s.status?.state || 'needs_review') ===
            'needs_review'
        )
            groups.needs_review.push(
                name + ' | ' + (s.status?.issues || []).join(', ') + ' | ' + (s.status?.note || ''),
            );
        if ((typeof s.status === 'string' ? s.status : s.status?.state || '') === 'needs_rework')
            groups.needs_rework.push(
                name + ' | ' + (s.status?.issues || []).join(', ') + ' | ' + (s.status?.note || ''),
            );
        if (!(s.played === true || s.playback?.played === true)) groups.not_played.push(name);
        if (
            (s.status?.note || '').toLowerCase().includes('obrázek') ||
            (s.status?.note || '').toLowerCase().includes('obal')
        )
            groups.missing_cover_note.push(name + ' | ' + s.status.note);
        if (!s.title) groups.missing_title.push(x.file);
        if (!s.artist) groups.missing_artist.push(x.file);
    }
    if (exportState.oldDatabase.length) {
        const oldSet = new Set(exportState.oldDatabase.map((i) => i.file));
        const newSet = new Set(exportState.loadedSongs.map((i) => i.file));
        const added = [...newSet].filter((x) => !oldSet.has(x));
        const removed = [...oldSet].filter((x) => !newSet.has(x));
        lines.push('NOVÉ SONGY OPROTI DATABASE');
        lines.push(...(added.length ? added.map((x) => '- ' + x) : ['- žádné']));
        lines.push('');
        lines.push('CHYBÍ OPROTI DATABASE');
        lines.push(...(removed.length ? removed.map((x) => '- ' + x) : ['- žádné']));
        lines.push('');
    }
    const section = (title, arr) => {
        lines.push(title);
        lines.push('-'.repeat(title.length));
        lines.push(...(arr.length ? arr.map((x) => '- ' + x) : ['- nic']));
        lines.push('');
    };
    section('🟠 LEHKÁ ÚPRAVA', groups.needs_review);
    section('🔴 PŘEDĚLAT', groups.needs_rework);
    section('🎸 NEPŘEHRÁNO', groups.not_played);
    section('🖼️ POZNÁMKA K OBALU', groups.missing_cover_note);
    section(
        '❌ CHYBNÉ JSON SOUBORY',
        exportState.jsonErrors.map((e) => e.file + ' | ' + e.error),
    );
    return lines.join('\n');
}
export { makeReport };
