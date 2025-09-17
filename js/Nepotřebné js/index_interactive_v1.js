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
    // Přesunuto do ready() funkce pro správnou inicializaci
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
    const originalKey = $('.song-content').data('key-original');

    // Odebere třídu 'active' ze všech kláves (tónina)
    $('.song-scale .key[id="tone"]').removeClass('active');

    // Najde a přidá třídu 'active' správnému klíči
    $(`.song-scale .key[data-key-value="${originalKey}"]`).addClass('active');

    // Transpozice je ve výchozím stavu 0, takže ji taky nastavíme jako aktivní
    $(`.song-scale .transpose-step`).removeClass('active'); // Odebere active z transpozice
    $(`.song-scale .transpose-step`).each(function () {
        if ($(this).text() === '0') {
            $(this).addClass('active');
        }
    });

    // Kód pro interakce tóniny/transpozice
    $('.transpose-step').on('click', function (e) {
        e.preventDefault();
        $('.transpose-step').removeClass('active');
        $(this).addClass('active');
        // Zde by měla být logika pro transpozici
    });

    $('.song-scale .key[id="tone"]').on('click', function (e) {
        e.preventDefault();
        $('.song-scale .key[id="tone"]').removeClass('active');
        $(this).addClass('active');
        // Zde by měla být logika pro změnu tóniny
    });
});