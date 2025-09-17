document.addEventListener('DOMContentLoaded', () => {
    // Získá název souboru z URL
    const urlParams = new URLSearchParams(window.location.search);
    const fileName = urlParams.get('song');
    
    if (!fileName) {
        document.getElementById('song-detail-chords').innerHTML = '<p>Píseň nenalezena. Prosím, vraťte se na hlavní stránku.</p>';
        return;
    }

    // Načte JSON soubor s písní
    fetch(`songs/${fileName}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP chyba: Status ${response.status}`);
            }
            return response.json();
        })
        .then(songData => {
            // Získá element pro text písně
            const songDetailElement = document.getElementById('song-detail-chords');
            const songContentElement = document.querySelector('.song-content.print');
            
            // Naplní stránku daty z JSON souboru
            document.getElementById('song-artist').textContent = songData.interpret;
            document.getElementById('song-title').textContent = songData.nazev;
            songDetailElement.innerHTML = songData.text;

            // ***** DŮLEŽITÁ ÚPRAVA *****
            // Aktualizuje atribut `data-used-chords`
            if (songData.used_chords) {
                songDetailElement.setAttribute('data-used-chords', songData.used_chords);
            } else {
                songDetailElement.setAttribute('data-used-chords', '');
            }

            // Aktualizuje transpozici
            if (songData.tonina) {
                songContentElement.setAttribute('data-key', songData.tonina);
                songContentElement.setAttribute('data-key-original', songData.tonina);
            }

            // Po vložení textu a nastavení atributu se akordy vykreslí do stránky
            if (window.renderChordsFromDataAttributes) {
                window.renderChordsFromDataAttributes();
            }
        })
        .catch(error => {
            console.error('Došlo k chybě při načítání písně:', error);
            document.getElementById('song-detail-chords').innerHTML = `<p>Píseň "${fileName}" se nepodařilo načíst.</p>`;
        });
});