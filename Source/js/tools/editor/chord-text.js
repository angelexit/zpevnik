// Visual chord tokens, with bracket notation retained at the serialization boundary.
const editors = new Set();
let lifted = null,
    floating = null;
const undo = [],
    redo = [];
let previous = [];
function read(node) {
    if (node.nodeType === Node.TEXT_NODE) return node.data;
    if (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.DOCUMENT_FRAGMENT_NODE)
        return '';
    if (node.dataset?.chord !== undefined) return '[' + node.dataset.chord + ']';
    if (node.nodeName === 'BR') return '\n';
    let out = '';
    for (const child of node.childNodes) {
        if (['DIV', 'P'].includes(child.nodeName) && out && !out.endsWith('\n')) out += '\n';
        out += read(child);
    }
    return out;
}
function fragment(text) {
    const f = document.createDocumentFragment();
    let at = 0;
    for (const match of text.matchAll(/\[([^\]\n]+)\]/g)) {
        f.append(document.createTextNode(text.slice(at, match.index)));
        const chip = document.createElement('span');
        chip.className = 'inline-chord';
        chip.contentEditable = 'false';
        chip.dataset.chord = match[1];
        chip.textContent = match[1];
        chip.title = 'Klikni pro přesun; Esc jej zruší';
        chip.setAttribute('role', 'button');
        chip.tabIndex = 0;
        f.append(chip);
        at = match.index + match[0].length;
    }
    f.append(document.createTextNode(text.slice(at)));
    return f;
}
function snapshot() {
    return [...editors].filter((e) => e.isConnected).map((e) => [e, read(e)]);
}
function changed() {
    const now = snapshot();
    if (JSON.stringify(now.map((x) => x[1])) !== JSON.stringify(previous.map((x) => x[1]))) {
        undo.push(previous);
        if (undo.length > 100) undo.shift();
        redo.length = 0;
        previous = now;
    }
    for (const [e] of now) e.dispatchEvent(new Event('change', { bubbles: true }));
}
export function resetChordHistory() {
    cancelChordMove();
    for (const e of editors) if (!e.isConnected) editors.delete(e);
    undo.length = 0;
    redo.length = 0;
    previous = snapshot();
}
export function cancelChordMove() {
    lifted?.classList.remove('chord-lifted');
    lifted = null;
    floating?.remove();
    floating = null;
}
function lift(chip, x = 30, y = 30) {
    cancelChordMove();
    lifted = chip;
    chip.classList.add('chord-lifted');
    floating = document.createElement('div');
    floating.className = 'floating-chord';
    floating.textContent = chip.dataset.chord + ' · klikni do textu · Esc zrušit';
    document.body.append(floating);
    floating.style.left = x + 12 + 'px';
    floating.style.top = y + 16 + 'px';
}
function caret(editor, x, y) {
    let range = document.caretRangeFromPoint?.(x, y);
    if (!range || !editor.contains(range.startContainer)) {
        range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(false);
    }
    const token = (
        range.startContainer.nodeType === 1
            ? range.startContainer
            : range.startContainer.parentElement
    ).closest?.('.inline-chord');
    if (token) {
        range.setStartAfter(token);
        range.collapse(true);
    }
    return range;
}
function selectAfter(node) {
    const r = document.createRange();
    r.setStartAfter(node);
    r.collapse(true);
    const s = getSelection();
    s.removeAllRanges();
    s.addRange(r);
    node.parentElement?.focus();
}
export function insertVisualChord(editor, name) {
    cancelChordMove();
    editor.focus();
    let r = editor.savedRange;
    if (!r || !editor.contains(r.startContainer)) {
        r = document.createRange();
        r.selectNodeContents(editor);
        r.collapse(false);
    }
    r.deleteContents();
    const f = fragment('[' + name + ']');
    const last = f.lastChild;
    r.insertNode(f);
    selectAfter(last);
    editor.savedRange = getSelection().getRangeAt(0).cloneRange();
    changed();
}
export function mountChordText(textarea) {
    const editor = document.createElement('div');
    editor.className = 'chord-text';
    editor.contentEditable = 'true';
    editor.spellcheck = false;
    editor.setAttribute('role', 'textbox');
    editor.setAttribute('aria-multiline', 'true');
    editor.setAttribute('aria-label', 'Text sekce s přesouvatelnými akordy');
    editor.replaceChildren(fragment(textarea.value));
    textarea.hidden = true;
    textarea.style.display = 'none';
    textarea.after(editor);
    editors.add(editor);
    Object.defineProperty(textarea, 'value', {
        configurable: true,
        get: () => read(editor),
        set: (text) => {
            cancelChordMove();
            editor.replaceChildren(fragment(String(text)));
            previous = snapshot();
        },
    });
    const remember = () => {
        const s = getSelection();
        if (s.rangeCount && editor.contains(s.anchorNode)) {
            editor.savedRange = s.getRangeAt(0).cloneRange();
            const node = s.anchorNode.nodeType === 1 ? s.anchorNode : s.anchorNode.parentElement;
            const chip = node.closest?.('.inline-chord');
            if (chip && s.isCollapsed) {
                editor.savedRange.setStartAfter(chip);
                editor.savedRange.collapse(true);
            }
        }
    };
    editor.addEventListener('keyup', remember);
    editor.addEventListener('mouseup', remember);
    editor.addEventListener('input', (event) => {
        cancelChordMove();
        if (event.data === ']') {
            const selection = getSelection();
            const before = document.createRange();
            before.selectNodeContents(editor);
            before.setEnd(selection.anchorNode, selection.anchorOffset);
            let offset = read(before.cloneContents()).length;
            editor.replaceChildren(fragment(read(editor)));
            const range = document.createRange();
            range.selectNodeContents(editor);
            range.collapse(false);
            for (const node of editor.childNodes) {
                const size = read(node).length;
                if (offset <= size) {
                    if (node.nodeType === Node.TEXT_NODE) range.setStart(node, offset);
                    else if (offset === 0) range.setStartBefore(node);
                    else range.setStartAfter(node);
                    range.collapse(true);
                    break;
                }
                offset -= size;
            }
            selection.removeAllRanges();
            selection.addRange(range);
        }
        remember();
        changed();
    });
    editor.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            cancelChordMove();
            e.preventDefault();
        }
        if (e.key === 'Enter') {
            e.preventDefault();
            document.execCommand('insertText', false, '\n');
        }
    });
    editor.addEventListener('click', (e) => {
        const chip = e.target.closest('.inline-chord');
        if (lifted) {
            if (chip === lifted) {
                cancelChordMove();
                return;
            }
            const r = caret(editor, e.clientX, e.clientY);
            const marker = document.createTextNode('');
            r.insertNode(marker);
            const moving = lifted;
            cancelChordMove();
            marker.replaceWith(moving);
            selectAfter(moving);
            remember();
            changed();
            e.preventDefault();
        } else if (chip) {
            lift(chip, e.clientX, e.clientY);
            e.preventDefault();
        }
    });
    editor.addEventListener('paste', (e) => {
        e.preventDefault();
        cancelChordMove();
        const text = e.clipboardData.getData('text/plain');
        const s = getSelection();
        if (!s.rangeCount) return;
        const r = s.getRangeAt(0);
        if (!editor.contains(r.startContainer)) return;
        r.deleteContents();
        const f = fragment(text);
        const last = f.lastChild;
        r.insertNode(f);
        selectAfter(last);
        remember();
        changed();
    });
    for (const type of ['copy', 'cut'])
        editor.addEventListener(type, (e) => {
            const s = getSelection();
            if (!s.rangeCount || s.isCollapsed) return;
            const r = s.getRangeAt(0);
            e.preventDefault();
            e.clipboardData.setData('text/plain', read(r.cloneContents()));
            if (type === 'cut') {
                cancelChordMove();
                r.deleteContents();
                changed();
            }
        });
    previous = snapshot();
    return editor;
}
document.addEventListener('pointermove', (e) => {
    if (floating) {
        floating.style.left = Math.min(e.clientX + 12, innerWidth - 280) + 'px';
        floating.style.top = Math.min(e.clientY + 16, innerHeight - 45) + 'px';
    }
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') cancelChordMove();
    if (
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === 'z' &&
        e.target.closest('.chord-text')
    ) {
        e.preventDefault();
        cancelChordMove();
        const from = e.shiftKey ? redo : undo,
            to = e.shiftKey ? undo : redo;
        if (from.length) {
            to.push(snapshot());
            for (const [node, text] of from.pop())
                if (node.isConnected) node.replaceChildren(fragment(text));
            previous = snapshot();
            for (const [node] of previous)
                node.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }
});
