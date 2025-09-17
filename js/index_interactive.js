$(document).ready(function () {
    // === 1. Vyhledávání ===
    $('#search-box').on('input', function () {
        const filter = $(this).val().toLowerCase();
        $('#artist-list li').each(function () {
            const name = $(this).text().toLowerCase();
            $(this).toggle(name.includes(filter));
        });
    });

    // === 2. Přepínání světlý/tmavý režim ===
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        $('body').addClass('dark-mode');
    }

    $('#toggle-theme').on('click', function () {
        $('body').toggleClass('dark-mode');
        const isDarkMode = $('body').hasClass('dark-mode');
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    });

    // === 3. Zvýraznění navštívených odkazů ===
    const visited = JSON.parse(localStorage.getItem('visitedArtists') || '[]');
    visited.forEach(href => {
        $(`#artist-list a[href='${href}']`).addClass('visited');
    });

    $('#artist-list a').on('click', function () {
        const href = $(this).attr('href');
        if (!visited.includes(href)) {
            visited.push(href);
            localStorage.setItem('visitedArtists', JSON.stringify(visited));
        }
    });

    // === 4. Reset navštívených ===
    $('#reset-visited').on('click', function () {
        localStorage.removeItem('visitedArtists');
        $('#artist-list a').removeClass('visited');
    });

    // === 5. Nastavení aktivní tóniny a transpozice ===
    const allNotes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "B", "H"];

    // Funkce, která aktualizuje vizuální stav tóniny a transpozice
    function updateActiveState(step) {
        // Získáme původní tóninu (data-key-original)
        const originalKey = $('.song-content').data('key-original');
        if (!originalKey) {
            console.warn("Atribut 'data-key-original' pro původní tóninu nebyl nalezen. Používám výchozí C.");
            $('.song-content').data('key-original', 'C');
            originalKey = 'C';
        }
        
        // Vypočítáme index nové tóniny
        const originalIndex = allNotes.indexOf(originalKey);
        const newIndex = (originalIndex + step + allNotes.length) % allNotes.length;
        const newKey = allNotes[newIndex];

        // Speciální pravidlo pro B a H
        const displayedKey = (newKey === 'B') ? 'B' : (newKey === 'H') ? 'H' : newKey;

        // Aktualizujeme aktivní tóninu
        $('.song-scale .key[id="tone"]').removeClass('active');
        $(`.song-scale .key[data-key-value="${displayedKey}"]`).addClass('active');

        // Aktualizujeme aktivní tlačítko transpozice
        $('.transpose-step').removeClass('active');
        $(`.transpose-step[data-step="${step}"]`).addClass('active');

        // Voláme vaši vlastní transpoziční funkci
        if (typeof transponuj_song === 'function') {
            transponuj_song(step);
            console.log(`Písnička transponována o ${step} půltónů.`);
        } else {
            console.warn('Funkce pro transpozici (transponuj_song) nebyla nalezena.');
        }
    }

    // Inicializace při načtení stránky
    updateActiveState(0);

    // Kód pro interakce transpozice
    $('.transpose-step').on('click', function (e) {
        e.preventDefault();
        
        const step = parseInt($(this).attr('data-step'), 10);
        
        // Zabráníme zbytečnému spuštění, pokud je již aktivní
        if ($(this).hasClass('active')) {
            return;
        }

        updateActiveState(step);
    });

    // Kód pro interakce tóniny
    $('.song-scale .key[id="tone"]').on('click', function (e) {
        e.preventDefault();
        
        const newKey = $(this).data('key-value');
        const originalKey = $('.song-content').data('key-original');
        
        const originalIndex = allNotes.indexOf(originalKey);
        const newIndex = allNotes.indexOf(newKey);
        
        if (originalIndex === -1 || newIndex === -1) {
            console.error('Tónina nebyla nalezena v seznamu not.');
            return;
        }
        
        const step = newIndex - originalIndex;

        updateActiveState(step);
    });
});