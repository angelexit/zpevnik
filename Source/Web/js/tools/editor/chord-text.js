import { parseSections } from './section-import.js';
// Visual chord tokens, with bracket notation retained at the serialization boundary.
const editors = new Set();
// WebView may select a contenteditable=false chip on a simple click.
// Detect actual pointer drags instead of mistaking that selection for a drag.
let pointerGesture = null;
document.addEventListener('pointerdown', e => {
    pointerGesture = e.button === 0 ? { x:e.clientX, y:e.clientY, target:e.target, selecting:e.shiftKey, moved:false } : null;
}, true);
document.addEventListener('pointermove', e => {
    if(pointerGesture && Math.hypot(e.clientX-pointerGesture.x,e.clientY-pointerGesture.y)>4) pointerGesture.moved=true;
}, true);
document.addEventListener('pointercancel', () => { pointerGesture=null; }, true);
window.addEventListener('blur', () => { pointerGesture=null; });
let lifted = null,
    floating = null;
const undo = [],
    redo = [];
let previous = [];
function read(node) {
    if (node.nodeType === Node.TEXT_NODE) return node.data;
    if (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.DOCUMENT_FRAGMENT_NODE)
        return '';
    if (node.dataset?.verseBreak !== undefined) return '\n';
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
    text = text.replace(/\r\n?/g, '\n').replace(/↵/g, '\n');
    const f = document.createDocumentFragment();
    let at = 0;
    for (const match of text.replace(/↵/g, '\n').matchAll(/\[([^\]\n]+)\]|(\n)/g)) {
        f.append(document.createTextNode(text.slice(at, match.index)));
        const chip = document.createElement('span');
        if (match[2]) {
            chip.className = 'verse-break';
            chip.contentEditable = 'false';
            chip.dataset.verseBreak = 'true';
            chip.append(document.createTextNode('↵'), document.createElement('br'));
            chip.title = 'Konec verše';
            f.append(chip);
            at = match.index + match[0].length;
            continue;
        }
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
    ).closest?.('.inline-chord,.verse-break');
    if (token) {
        range.setStartAfter(token);
        range.collapse(true);
    }
    return range;
}
function selectAfter(node) {
    if (!node) return;
    node.parentElement?.focus();
    const r = document.createRange();
    r.setStartAfter(node);
    r.collapse(true);
    const s = getSelection();
    s.removeAllRanges();
    s.addRange(r);
}
export function insertVerseBreak(editor) {
    insertEditorText(editor, '\n');
}
export function insertVisualChord(editor, name) {
    insertEditorText(editor, '[' + name + ']');
}
function insertEditorText(editor, text) {
    cancelChordMove();
    editor.focus();
    let r = editor.savedRange;
    if (!r || !editor.contains(r.startContainer)) {
        r = document.createRange();
        r.selectNodeContents(editor);
        r.collapse(false);
    }
    r.deleteContents();
    const f = fragment(text);
    const last = f.lastChild;
    r.insertNode(f);
    selectAfter(last);
    editor.savedRange = getSelection().getRangeAt(0).cloneRange();
    changed();
}
function mountPlainCache(textarea) {
    const controls = document.createElement('div'); controls.className = 'verse-controls';
    textarea.after(controls);

        const target = document.createElement('select');
        target.setAttribute('aria-label', 'Cílová finální sekce');
        const refreshTargets = () => {
            const chosen = target.value;
            target.replaceChildren();
            document.querySelectorAll('.section-card').forEach((card, i) => {
                const label = card.querySelector('select')?.selectedOptions[0]?.textContent || 'Sekce';
                target.add(new Option((i + 1) + '. ' + label, String(i)));
            });
            if ([...target.options].some(o => o.value === chosen)) target.value = chosen;
        };
        refreshTargets();
        target.addEventListener('focus', refreshTargets);
        const transfer = document.createElement('button');
        transfer.type = 'button';transfer.textContent = 'Vložit výběr / vše do sekce';
        transfer.onmousedown = e => e.preventDefault();
        transfer.onclick = () => {
            const value = textarea.selectionStart !== textarea.selectionEnd ? textarea.value.slice(textarea.selectionStart, textarea.selectionEnd) : textarea.value;
            const destination = document.querySelectorAll('.section-card')[Number(target.value)]?.querySelector('.chord-text');
            if (destination && value) insertEditorText(destination, value);
        };
        const split = document.createElement('button');
        split.type = 'button';
        split.textContent = 'Rozdělit do sekcí podle prázdných řádků';
        split.onclick = async () => {
            const value = textarea.selectionStart !== textarea.selectionEnd ? textarea.value.slice(textarea.selectionStart, textarea.selectionEnd) : textarea.value;
            const blocks = parseSections(value);
            if (!blocks.length) return;
            const { addSection } = await import('./sections.js');
            let anchor = document.querySelectorAll('.section-card')[Number(target.value)];
            for (const {type, text: block} of blocks) {
                if (anchor && !anchor.querySelector('textarea').value.trim()) {
                    anchor.querySelector('.part-type').value = type;
                    anchor.querySelector('textarea').value = block;
                } else {
                    const card = addSection(type, block);
                    if (anchor) anchor.after(card);
                    anchor = card;
                }
                anchor.querySelector('textarea').dispatchEvent(new Event('input', { bubbles: true }));
            }
            document.dispatchEvent(new Event('change', { bubbles: true }));
        };
        controls.append(target, transfer, split);
    return textarea;
}

export function mountChordText(textarea) {
    if (textarea.id === 'cacheOutput') return mountPlainCache(textarea);
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
    const controls = document.createElement('div');
    controls.className = 'verse-controls';
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = '↵ Vložit veršítko';
    button.onmousedown = (e) => e.preventDefault();
    button.onclick = () => insertVerseBreak(editor);
    const count = document.createElement('small');
    controls.append(button, count);
    editor.after(controls);

    let timer;
    const updateCount = () => {
        cancelAnimationFrame(timer);
        timer = requestAnimationFrame(() => {
            if (!editor.isConnected) return;
            const text = read(editor);
            const range = document.createRange();
            range.selectNodeContents(editor);
            const rects = [...range.getClientRects()].filter((r) => r.height > 0 && r.width > 0);
            const top =
                editor.getBoundingClientRect().top +
                parseFloat(getComputedStyle(editor).paddingTop);
            const height = parseFloat(getComputedStyle(editor).lineHeight);
            const rows = new Set(
                rects.map((r) => Math.max(0, Math.floor((r.top - top + height * 0.2) / height))),
            );
            count.textContent = `${text ? text.split('\n').length : 0} veršů · ${text ? Math.max(rows.size, text.split('\n').length) : 0} řádků v editoru`;
        });
    };
    editor.addEventListener('input', updateCount);
    editor.addEventListener('change', updateCount);
    const resize = new ResizeObserver(updateCount);
    resize.observe(editor);
    updateCount();

    editors.add(editor);
    Object.defineProperty(textarea, 'value', {
        configurable: true,
        get: () => read(editor),
        set: (text) => {
            cancelChordMove();
            editor.replaceChildren(fragment(String(text)));
            updateCount();
            previous = snapshot();
        },
    });
    const remember = () => {
        const s = getSelection();
        if (s.rangeCount && editor.contains(s.anchorNode)) {
            editor.savedRange = s.getRangeAt(0).cloneRange();
            const node = s.anchorNode.nodeType === 1 ? s.anchorNode : s.anchorNode.parentElement;
            const chip = node.closest?.('.inline-chord,.verse-break');
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
        if (event.data === ']' || event.data?.includes('\n')) {
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
        const gesture=pointerGesture;pointerGesture=null;
        const simpleClick=gesture && editor.contains(gesture.target) && !gesture.selecting && !gesture.moved
            && Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)<=4 && e.detail<=1;
        // Preserve text selection on drag, Shift-click and double-click.
        if(gesture && !simpleClick) { cancelChordMove(); return; }
        if(!simpleClick && !getSelection().isCollapsed) return;
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
            if(simpleClick) { selectAfter(chip); remember(); }
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
        if (!editor.contains(r.startContainer) || !editor.contains(r.endContainer)) return;
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
            if (!editor.contains(r.startContainer) || !editor.contains(r.endContainer)) return;
            e.preventDefault();
            e.clipboardData.setData('text/plain', read(r.cloneContents()));
            if (type === 'cut') {
                cancelChordMove();
                r.deleteContents();
                editor.savedRange = r.cloneRange();
                changed();
            }
        });
    for (const [label, action] of [['Kopírovat', 'copy'], ['Vyjmout', 'cut'], ['Vložit', 'paste']]) {
        const control = document.createElement('button');control.type='button';control.textContent=label;
        control.onmousedown=e=>e.preventDefault();
        control.onclick=async()=>{
            try {
                cancelChordMove();
                if(action==='paste') { insertEditorText(editor, await navigator.clipboard.readText()); return; }
                const range=editor.savedRange;
                if(!range || range.collapsed || !editor.contains(range.startContainer) || !editor.contains(range.endContainer)) return;
                const selectionRange=range.cloneRange();
                await navigator.clipboard.writeText(read(selectionRange.cloneContents()));
                if(action==='cut') { selectionRange.deleteContents();editor.savedRange=selectionRange;editor.focus();getSelection().removeAllRanges();getSelection().addRange(selectionRange);changed(); }
            } catch { count.textContent='Použij Ctrl+C, Ctrl+X nebo Ctrl+V přímo v textu.'; }
        };
        controls.append(control);
    }
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
