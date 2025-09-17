document.addEventListener('DOMContentLoaded', () => {
  const artistsContainer = document.getElementById('artists-list');

  // Načte seznam všech písní
  fetch('list.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP chyba: Status ${response.status}`);
      }
      return response.json();
    })
    .then(files => {
      // Načte data každé písně a vytvoří seznam slibů (Promises)
      const fetchPromises = files.map(file => 
        fetch(`songs/${file}`).then(res => res.json())
      );

      // Zpracuje všechny sliby najednou
      Promise.all(fetchPromises)
        .then(songs => {
          // Seskupí písně podle interpreta
          const groupedByArtist = songs.reduce((acc, song) => {
            const artist = song.interpret || 'Neznámý interpret';
            if (!acc[artist]) {
              acc[artist] = [];
            }
            acc[artist].push(song);
            return acc;
          }, {});

          // Vytvoří HTML pro každý soubor
          for (const artist in groupedByArtist) {
          const li = document.createElement('li');
          const artistLink = document.createElement('a');
          artistLink.href = `artist.html?artist=${encodeURIComponent(artist)}`;
          artistLink.textContent = artist;
          artistLink.classList.add('artist-link');
          li.appendChild(artistLink);
          artistsContainer.appendChild(li);
         }
        });
    })
    .catch(error => {
      console.error('Došlo k chybě při načítání dat:', error);
      artistsContainer.innerHTML = '<p>Seznam písní se nepodařilo načíst.</p>';
    });
});