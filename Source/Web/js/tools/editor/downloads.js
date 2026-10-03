async function writeTextFileToDir(dirHandle, fileName, text, mime = 'application/json') {
    const fh = await dirHandle.getFileHandle(fileName, { create: true });
    const writable = await fh.createWritable();
    await writable.write(new Blob([text], { type: mime }));
    await writable.close();
}

function downloadFileSafe(content, fileName, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        URL.revokeObjectURL(url);
        a.remove();
    }, 1000);
}
export { writeTextFileToDir, downloadFileSafe };
