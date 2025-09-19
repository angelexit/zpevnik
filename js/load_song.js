document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const fileName = urlParams.get('song');

    if (!fileName) {
        document.getElementById('song-detail-chords').innerHTML = '<p>Píseň nenalezena. Prosím, vraťte se na hlavní stránku.</p>';
        return;
    }

    fetch(`songs/${fileName}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP chyba: Status ${response.status}`);
            }
            return response.json();
        })
        .then(songData => {
            const songDetailElement = document.getElementById('song-detail-chords');
            const songContentElement = document.querySelector('.song-content.print');

            document.getElementById('song-artist').textContent = songData.interpret;
            document.getElementById('song-title').textContent = songData.nazev;

            // Zde je nová funkce pro rozdělení textu do vrstev akordy/text
            songDetailElement.innerHTML = renderSongWithChordLayer(songData.text);

            if (songData.used_chords) {
                songDetailElement.setAttribute('data-used-chords', songData.used_chords);
            } else {
                songDetailElement.setAttribute('data-used-chords', '');
            }

            if (songData.tonina) {
                songContentElement.setAttribute('data-key', songData.tonina);
                songContentElement.setAttribute('data-key-original', songData.tonina);
            }

            if (window.renderChordsFromDataAttributes) {
                window.renderChordsFromDataAttributes();
            }
        })
        .catch(error => {
            console.error('Došlo k chybě při načítání písně:', error);
            document.getElementById('song-detail-chords').innerHTML = `<p>Píseň "${fileName}" se nepodařilo načíst.</p>`;
        });
});

// Pomocná funkce pro vrstvení akordů nad textem
function renderSongWithChordLayer(songText) {
    const lines = songText.split('\n');
    let html = '';

    lines.forEach(line => {
        const chordRegex = /\[([^\]]+)\]/g;
        let chordRow = '';
        let textRow = '';
        let lastIndex = 0;
        let match;

        while ((match = chordRegex.exec(line)) !== null) {
            const chord = match[1];
            const textBefore = line.slice(lastIndex, match.index);
            textRow += textBefore;
            chordRow += '&nbsp;'.repeat(textBefore.length);

            // SVG kompatibilita: nahrazení # za x v class
            chordRow += `<span class=\"chord ${chord.replace('#', 'x')}\">${chord}</span>`;
            lastIndex = match.index + match[0].length;
        }
        const textAfter = line.slice(lastIndex);
        textRow += textAfter;
        chordRow += '&nbsp;'.repeat(textAfter.length);

        // Pokud je řádek pouze akord ([C]), zobraz akord dole u textu
        const onlyChord = line.trim().match(/^\[[^\]]+\]$/);

        html += `
          <div class=\"song-row\">
            ${!onlyChord ? `<div class=\"chord-layer\">${chordRow}</div>` : ''}
            <div class=\"text-layer\">${onlyChord ? chordRow.trim() : textRow}</div>
          </div>
        `;
    });

    return html;
}