// Pomocná funkce pro odstranění diakritiky
function odstranitDiakritiku(text) {
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

document.addEventListener('DOMContentLoaded', () => {
    // Získá jméno interpreta z URL
    const urlParams = new URLSearchParams(window.location.search);
    const artistName = urlParams.get('artist');
    const artistNameElement = document.getElementById('artist-name');
    const songsListElement = document.getElementById('songs-list');

    if (artistName) {
        artistNameElement.textContent = artistName;
    } else {
        artistNameElement.textContent = 'Interpret nenalezen';
        songsListElement.innerHTML = '<p>Není vybrán žádný interpret.</p>';
        return;
    }

    // Načte seznam všech písní
    fetch('list.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP chyba: Status ${response.status}`);
            }
            return response.json();
        })
        .then(files => {
            const fetchPromises = files.map(file => fetch(`songs/${file}`).then(res => res.json()));
            
            Promise.all(fetchPromises)
                .then(songs => {
                    // Filtruje písně podle interpreta
                    const artistSongs = songs.filter(song => song.interpret === artistName);

                    if (artistSongs.length > 0) {
                        artistSongs.forEach(song => {
                            const li = document.createElement('li');
                            const a = document.createElement('a');

                            // Vytvoří název souboru na základě interpreta A názvu písně
                            const interpretSouboru = odstranitDiakritiku(song.interpret)
                                .toLowerCase()
                                .replace(/ /g, '-');
                            
                            const nazevSouboru = odstranitDiakritiku(song.nazev)
                                .toLowerCase()
                                .replace(/ /g, '-');
                                
                            // Upravený odkaz! Nyní směřuje na song.html s parametrem
                            a.href = `song.html?song=${interpretSouboru}-${nazevSouboru}.json`;
                            a.textContent = song.nazev;
                            
                            li.appendChild(a);
                            songsListElement.appendChild(li);
                        });
                    } else {
                        songsListElement.innerHTML = '<p>Pro tohoto interpreta nebyly nalezeny žádné písně.</p>';
                    }
                });
        })
        .catch(error => {
            console.error('Došlo k chybě při načítání dat:', error);
            songsListElement.innerHTML = '<p>Seznam písní se nepodařilo načíst.</p>';
        });
});