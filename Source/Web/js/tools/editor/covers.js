import { editorState } from './state.js';
import { $, setStatus } from './dom.js';
import { slug } from '../shared/paths.js';

async function pickCoversFolder() {
    if (!window.showDirectoryPicker) {
        setStatus('coverFolderStatus', 'Pro práci s obaly použij Chrome/Edge.', 'bad');
        return;
    }
    try {
        editorState.coversDirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
        setStatus(
            'coverFolderStatus',
            'Složka obalů připojena. Obal se bude hledat automaticky podle alba.',
            'ok',
        );
        await refreshCoverPreview();
    } catch (err) {
        setStatus('coverFolderStatus', 'Výběr složky obalů zrušen.', 'warn');
    }
}

function getCoverBaseName() {
    const aK = slug($('artist').value);
    const alK = slug($('album').value || 'nezname');
    return aK && alK ? `${aK}-${alK}` : '';
}

function updatePaths() {
    document.dispatchEvent(new Event('song-metadata-change'));
    const aK = slug($('artist').value);
    const tK = slug($('title').value);
    const coverBase = getCoverBaseName();
    $('file-path').textContent = aK && tK ? `${aK}-${tK}.json` : '-';
    $('cover-path').textContent = coverBase ? `img/covers/${coverBase}.jpg` : '-';
    refreshCoverPreview();
}

function setCoverEmpty(message = 'Bez obalu') {
    if (editorState.currentCoverObjectUrl) URL.revokeObjectURL(editorState.currentCoverObjectUrl);
    editorState.currentCoverObjectUrl = null;
    $('cover-preview').style.display = 'none';
    $('cover-preview').removeAttribute('src');
    $('cover-placeholder').style.display = 'block';
    $('cover-placeholder').textContent = message;
}

async function findCoverHandle() {
    if (!editorState.coversDirHandle) return null;
    const base = getCoverBaseName();
    if (!base) return null;
    for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
        try {
            return await editorState.coversDirHandle.getFileHandle(`${base}.${ext}`);
        } catch (_) {}
    }
    return null;
}

async function refreshCoverPreview() {
    const token = ++editorState.coverPreviewToken;
    const base = getCoverBaseName();
    if (!base) {
        setCoverEmpty('Bez názvu alba');
        $('coverStatus').textContent =
            'Vyplň interpreta a album, potom půjde obal najít nebo přidat.';
        return;
    }
    if (!editorState.coversDirHandle) {
        setCoverEmpty('Bez obalu');
        $('coverStatus').textContent =
            `Cesta připravena: img/covers/${base}.jpg. Pro náhled vyber složku img/covers/.`;
        return;
    }
    const handle = await findCoverHandle();
    if (token !== editorState.coverPreviewToken) return;
    if (!handle) {
        setCoverEmpty('Chybí obal');
        $('coverStatus').textContent =
            `Obal nenalezen. Klikni „PŘIDAT / VYMĚNIT OBAL“ a uloží se jako ${base}.jpg.`;
        return;
    }
    const file = await handle.getFile();
    if (editorState.currentCoverObjectUrl) URL.revokeObjectURL(editorState.currentCoverObjectUrl);
    editorState.currentCoverObjectUrl = URL.createObjectURL(file);
    $('cover-preview').src = editorState.currentCoverObjectUrl;
    $('cover-preview').style.display = 'block';
    $('cover-placeholder').style.display = 'none';
    $('coverStatus').textContent = `Obal načten: ${handle.name}`;
}

async function imageFileToJpegBlob(file) {
    if (
        file.type === 'image/jpeg' ||
        file.name.toLowerCase().endsWith('.jpg') ||
        file.name.toLowerCase().endsWith('.jpeg')
    )
        return file;
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0);
    return await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
}

async function pickCoverImage() {
    if (!editorState.coversDirHandle) {
        setStatus('coverFolderStatus', 'Nejdřív vyber složku img/covers/.', 'warn');
        return;
    }
    const base = getCoverBaseName();
    if (!base) {
        $('coverStatus').textContent = 'Nejdřív vyplň interpreta a album.';
        return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        try {
            $('coverStatus').textContent = 'Ukládám obal…';
            const jpegBlob = await imageFileToJpegBlob(file);
            const newHandle = await editorState.coversDirHandle.getFileHandle(`${base}.jpg`, {
                create: true,
            });
            const writable = await newHandle.createWritable();
            await writable.write(jpegBlob);
            await writable.close();
            $('coverStatus').textContent = `Obal uložen jako ${base}.jpg`;
            await refreshCoverPreview();
        } catch (err) {
            $('coverStatus').textContent =
                'Obal se nepodařilo uložit. Zkontroluj práva složky nebo zkus JPG.';
        }
    };
    input.click();
}
export {
    pickCoversFolder,
    getCoverBaseName,
    updatePaths,
    setCoverEmpty,
    findCoverHandle,
    refreshCoverPreview,
    imageFileToJpegBlob,
    pickCoverImage,
};
