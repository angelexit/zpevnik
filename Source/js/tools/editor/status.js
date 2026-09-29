import { editorState } from './state.js';
import { $ } from './dom.js';

function normalizeStatus(status) {
    const state = status?.state || 'needs_review';
    const issues = Array.isArray(status?.issues) ? status.issues : [];
    const note = status?.note || '';
    if (state === 'ok') {
        return {
            state: 'ok',
            level: 'green',
            label: 'OK',
            issues: [],
            note: '',
            checked: true,
            checked_at: status?.checked_at || new Date().toISOString(),
            play_review_required: false,
            play_reviewed_at: status?.play_reviewed_at || null,
        };
    }
    if (state === 'needs_rework') {
        return {
            state: 'needs_rework',
            level: 'red',
            label: 'Předělat kompletně',
            issues,
            note,
            checked: false,
            checked_at: status?.checked_at || null,
            play_review_required: true,
            play_reviewed_at: status?.play_reviewed_at || null,
        };
    }
    return {
        state: 'needs_review',
        level: 'orange',
        label: 'Lehká úprava',
        issues,
        note,
        checked: false,
        checked_at: status?.checked_at || null,
        play_review_required: true,
        play_reviewed_at: status?.play_reviewed_at || null,
    };
}

function normalizePlayback(playback) {
    return {
        played: playback?.played === true,
        played_at:
            playback?.played === true ? playback?.played_at || new Date().toISOString() : null,
    };
}

function setPlaybackStatus(played) {
    editorState.currentPlayback = normalizePlayback({
        played: played === true,
        played_at:
            played === true
                ? editorState.currentPlayback?.played_at || new Date().toISOString()
                : null,
    });
    renderPlaybackStatus();
}

function renderPlaybackStatus() {
    const notPlayed = $('playback-not-played');
    const played = $('playback-played');
    if (notPlayed) notPlayed.classList.toggle('active', !editorState.currentPlayback?.played);
    if (played) played.classList.toggle('active', editorState.currentPlayback?.played === true);
    const info = $('playback-info');
    if (info) {
        info.textContent = editorState.currentPlayback?.played
            ? `Ověřeno hraním: ${editorState.currentPlayback.played_at ? new Date(editorState.currentPlayback.played_at).toLocaleString('cs-CZ') : 'ano'}`
            : 'Čeká na ověření hraním.';
    }
}

function setSongStatus(state) {
    const previousCheckedAt = editorState.currentReviewStatus?.checked_at || null;
    const previousIssues = editorState.currentReviewStatus?.issues || [];
    const previousNote = editorState.currentReviewStatus?.note || '';
    editorState.currentReviewStatus = normalizeStatus({
        state,
        issues: state === 'ok' ? [] : previousIssues,
        note: state === 'ok' ? '' : previousNote,
        checked_at: state === 'ok' ? new Date().toISOString() : previousCheckedAt,
    });
    renderSongStatus();
}

function getSelectedStatusIssues() {
    return Array.from(document.querySelectorAll('.status-issue:checked')).map((i) => i.value);
}

function updateCurrentStatusDetails() {
    if (!editorState.currentReviewStatus)
        editorState.currentReviewStatus = normalizeStatus({ state: 'needs_review' });
    editorState.currentReviewStatus.issues = getSelectedStatusIssues();
    editorState.currentReviewStatus.note = $('status-note')?.value || '';
}

function renderSongStatus() {
    const map = { ok: 'status-ok', needs_review: 'status-review', needs_rework: 'status-rework' };
    Object.values(map).forEach((id) => {
        const el = $(id);
        if (el) el.classList.remove('active');
    });
    const state = editorState.currentReviewStatus?.state || 'needs_review';
    const active = $(map[state]);
    if (active) active.classList.add('active');

    const details = $('status-details');
    if (details) details.classList.toggle('active', state !== 'ok');
    document.querySelectorAll('.status-issue').forEach((ch) => {
        ch.checked = (editorState.currentReviewStatus?.issues || []).includes(ch.value);
        ch.onchange = updateCurrentStatusDetails;
    });
    if ($('status-note')) $('status-note').value = editorState.currentReviewStatus?.note || '';
}
export {
    normalizeStatus,
    normalizePlayback,
    setPlaybackStatus,
    renderPlaybackStatus,
    setSongStatus,
    getSelectedStatusIssues,
    updateCurrentStatusDetails,
    renderSongStatus,
};
