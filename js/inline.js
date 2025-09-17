$(document).ready(function () {
    const songTextElement = $('#song-detail-chords');
    const použitéAkordy = new Set();

    function zpracujTextSAkordy() {
        const regexAkordy = /\[([A-H][#b]?((maj|min|mi|m|dim|aug|\+|sus|add)?\d*)?(\/[A-H][#b]?)?)\]/g;

        let htmlObsah = songTextElement.html();
        let upravenyHtml = "";
        let posledniIndex = 0;
        let nalezenyAkord;

        if (!htmlObsah) {
            console.warn("Element s ID '#song-detail-chords' je prázdný nebo nebyl nalezen.");
            return;
        }

        while ((nalezenyAkord = regexAkordy.exec(htmlObsah)) !== null) {
            const nazevAkorduKomplet = nalezenyAkord[1];
            upravenyHtml += htmlObsah.substring(posledniIndex, nalezenyAkord.index);

            if (typeof get_slugify_chord === 'function') {
                const slug = get_slugify_chord(nazevAkorduKomplet);
                upravenyHtml += `<sup class="inline-chord ${slug}" data-chord-name="${nazevAkorduKomplet}">${nazevAkorduKomplet}</sup>`;
            } else {
                upravenyHtml += `<sup class="inline-chord" data-chord-name="${nazevAkorduKomplet}">${nazevAkorduKomplet}</sup>`;
                console.warn("Funkce get_slugify_chord není definována.");
            }

            použitéAkordy.add(nazevAkorduKomplet);
            posledniIndex = regexAkordy.lastIndex;
        }

        upravenyHtml += htmlObsah.substring(posledniIndex);
        songTextElement.html(upravenyHtml);
        songTextElement.attr('data-used-chords', Array.from(použitéAkordy).join(','));
    }

    zpracujTextSAkordy();
});

$(window).on('load', function () {
    if (typeof zobrazAkordy === 'function') zobrazAkordy();
    if (typeof aktivujInlineAkordy === 'function') aktivujInlineAkordy();

    // 💡 Simulace změny transpozice
    setTimeout(() => {
        if (typeof transponuj === 'function') {
            transponuj(1); // krok +1
            setTimeout(() => transponuj(0), 50); // krok zpět
        } else if ($('#transpozice-plus').length && $('#transpozice-nula').length) {
            $('#transpozice-plus').click(); // klik na +
            setTimeout(() => $('#transpozice-nula').click(), 50);
        } else {
            console.warn("Funkce nebo tlačítka pro transpozici nejsou dostupné.");
        }
    }, 300);
});

<script>
  $(window).on('load', function () {
    if (typeof render_chords === 'function') {
      render_chords(); // Vykreslí SVG akordy
    }
    if (typeof chord_bind_hover === 'function') {
      chord_bind_hover(); // Aktivuje tooltipy
    }
  });
</script>
