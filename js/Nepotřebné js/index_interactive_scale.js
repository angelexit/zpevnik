$(document).ready(function() {
    // 1. Zjisti originální klíč z HTML
    const originalKey = $('.song-content').data('key-original');

    // 2. Odeber třídu 'active' ze všech kláves
    $('.song-scale .key').removeClass('active');

    // 3. Najdi a přidej třídu 'active' správnému klíči
    $(`.song-scale .key[data-key-value="${originalKey}"]`).addClass('active');
    
    // Transpozice je ve výchozím stavu 0, takže ji taky nastavíme jako aktivní
    $(`.song-scale .transpose-step`).each(function() {
        if ($(this).text() === '0') {
            $(this).addClass('active');
        }
    });

    // Další kód pro interakce...
    $('.transpose-step').on('click', function(e) {
        e.preventDefault();
        $('.transpose-step').removeClass('active');
        $(this).addClass('active');
        // Zde by měla být logika pro transpozici
    });

    $('.song-scale .key[id="tone"]').on('click', function(e) {
        e.preventDefault();
        $('.song-scale .key[id="tone"]').removeClass('active');
        $(this).addClass('active');
        // Zde by měla být logika pro změnu tóniny
    });
});