// ==== CHORDS: GUITAR VERSION - KOMPLETNÍ MODUL ====

// -- Slugify funkce pro CSS třídy, např. A# → Ax, A+ → Ay, D/F# → D--Fx
function get_slugify_chord(chord) {
    return chord.replace(/#/g, 'x').replace(/\+/g, 'y').replace(/\//g, '--');
}

// -- Globální proměnná pro použité akordy
let used_chords = [];

// -- SVG vykreslení akordu
function drawChord(chord_name, slug_id, tuning = ["E", "A", "D", "g", "b", "e"]) {
    const chart = new svguitar.SVGuitarChord('#' + slug_id);

    const chord_data = chords[chord_name];
    if (!chord_data) return;

    const position = chord_data.ps[0];
    const chord_struct = {
        title: chord_data.t,
        position: position.p,
        fingers: position.f,
        barres: (position.b || []).map(b => ({
            fromString: b.fs,
            toString: b.ts,
            fret: b.f
        }))
    };

    chart.configure({
        titleColor: '#009CDC',
        orientation: 'vertical',
        style: 'normal',
        frets: 4,
        fingerSize: 0.85,
        fingerTextSize: 30,
        fingerColor: "#3207f2",
        fretSize: 1.3,
        nutWidth: 20,
        tuningsFontSize: 32,
        tuning: tuning,
    }).chord(chord_struct).draw();
}

// -- Vykreslení všech použitých akordů do #chords
function render_chords(tuning = ["E", "A", "D", "g", "b", "e"]) {
    $('#chords').empty();
    for (const chord of used_chords) {
        const slug = get_slugify_chord(chord);
        const divId = 'chord-' + slug;
        $('#chords').append(`<div id="${divId}"></div>`);
        drawChord(chord, divId, tuning);
    }
}

// -- Vykreslení tooltipu na najetí myši nad akordem v textu
function chord_bind_hover() {
    $('.inline-chord').each((idx, el) => {
        $(el).append('<span class="chord-tooltip"></span>');
    });

    $('.inline-chord').hover(
        function () {
            const classes = $(this).attr("class").split(/\s+/);
            if (classes.length >= 2) {
                const chord = $('#chord-' + classes[1]).html();
                $(this).find('.chord-tooltip').html(chord);
            }
        },
        function () {
            $(this).find('.chord-tooltip').html('');
        }
    );
}

// -- Transpozice (zachována kvůli funkci, lze přizpůsobit pro jiné nástroje)
(function ($) {
    $.fn.transpose = function (t) {
        const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'B', 'H'];
        let step = 0;
        let key = '';
        let current_key = $(this).attr('data-key') || 'C';
        const current_key_position = keys.indexOf(current_key);

        if (t.includes('+') || t.includes('-') || t === '0') {
            step = parseInt(t.replace('+', '')) || 0;
            if (t === '0') {
                key = $(this).attr('data-key-original');
                step = keys.indexOf(key) - current_key_position;
            } else {
                let target_index = (current_key_position + step + keys.length) % keys.length;
                key = keys[target_index];
            }
        } else {
            key = t;
            step = keys.indexOf(key) - current_key_position;
        }

        if (key === current_key) return;

        let transposed = [];
        for (const chord of used_chords) {
            const base = chord.match(/^[A-H][#b]?/)[0];
            const base_index = keys.indexOf(base);
            const new_base = keys[(base_index + step + keys.length) % keys.length];
            const new_chord = chord.replace(base, new_base);

            const old_slug = get_slugify_chord(chord);
            const new_slug = get_slugify_chord(new_chord);

            $('.' + old_slug).text(new_chord).addClass(new_slug).removeClass(old_slug);
            transposed.push(new_chord);
        }

        $(this).attr('data-key', key);
        $('#song-detail-chords').attr('data-used-chords', transposed.join(','));
        used_chords = transposed;
        render_chords();
        chord_bind_hover();
    };
})(jQuery);

// -- Inicializace po nahrání okna
$(window).on('load', function () {
    const data = $('#song-detail-chords').data('used-chords');
    if (data) {
        used_chords = data.split(',');
        render_chords();
        chord_bind_hover();
    }

    $('.key').on('click', function (e) {
        e.preventDefault();
        $('.song-content').transpose($(this).text());
    });

    $('.transpose-step').on('click', function (e) {
        e.preventDefault();
        $('.song-content').transpose($(this).find('strong').text());
    });
});
