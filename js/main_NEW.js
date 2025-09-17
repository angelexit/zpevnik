document.addEventListener('DOMContentLoaded', () => {
    const artistsList = document.getElementById('artists-list');
    
    fetch('songs/artists.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Chyba při načítání seznamu interpretů.');
            }
            return response.json();
        })
        .then(artists => {
            if (artists.length === 0) {
                artistsList.innerHTML = '<p>V seznamu nejsou žádní interpreti.</p>';
                return;
            }
            
            artists.forEach(artist => {
                const artistDiv = document.createElement('div');
                artistDiv.classList.add('artist-box');
                
                const artistName = document.createElement('h2');
                artistName.textContent = artist.name;
                artistDiv.appendChild(artistName);

                const songsList = document.createElement('ul');
                artist.songs.forEach(song => {
                    const listItem = document.createElement('li');
                    const songLink = document.createElement('a');
                    
                    // ***** OPRAVENÁ ČÁST: Odstranění zbytečné cesty s interpretem *****
                    const fileName = song.fileName;
                    songLink.href = `song.html?song=${fileName}`;
                    songLink.textContent = song.title;
                    
                    listItem.appendChild(songLink);
                    songsList.appendChild(listItem);
                });
                
                artistDiv.appendChild(songsList);
                artistsList.appendChild(artistDiv);
            });
        })
        .catch(error => {
            console.error('Došlo k chybě:', error);
            artistsList.innerHTML = '<p>Seznam písní se nepodařilo načíst.</p>';
        });
});