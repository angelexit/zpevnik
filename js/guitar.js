
function get_slugify_chord(chord) {
    return chord.replace('#', 'x').replace('+', 'y').replace('/', '--');
}

function drawChord(chord_name, slugify_chord) {
    // initialize the chart
    var chart = new svguitar.SVGuitarChord('#'+slugify_chord);

    function get_chord(name, idx) {
        var chord = chords[name]["positions"][idx];
        chord['title'] = chords[name]["title"];
        if (chord["barres"]===undefined) {
            chord["barres"] = [];
        }
        return chord;
    }

    function get_packed_chord(name, idx) {
        var chord = {}
        if (chords[name]===undefined) {
            return chord;
        }
        var _chord = chords[name]["ps"][idx];
        chord['title'] = chords[name]["t"];
        chord['position'] = _chord['p'];
        chord['fingers'] = _chord['f'];
        if (_chord["b"]===undefined) {
            chord["barres"] = [];
        }
        else {
            chord['barres'] = [{}];
            chord['barres'][0]['fromString'] = _chord['b'][0]['fs'];
            chord['barres'][0]['toString'] = _chord['b'][0]['ts'];
            chord['barres'][0]['fret'] = _chord['b'][0]['f'];
        }
        return chord;
    }

    chord_struct = get_packed_chord(chord_name, 0);
    json_chord_struct = JSON.stringify(chord_struct);

    // Vzhled prstokladu
    if (json_chord_struct!='{}') {
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
            tuning: ["E", "A", "D", "g", "b", "e"],
        }).chord(chord_struct).draw();
    }
}

function render_chords() {
    $('#chords').empty();
    for (let chord of used_chords) {
        slugify_chord = chord.replace('#', 'x').replace('+', 'y');
        //slugify_chord = get_slugify_chord(chord);
        $('#chords').append( $('<div id="chord-'+slugify_chord+'"></div>') );
        drawChord(chord, "chord-"+slugify_chord);
    }
}

(function( $ ){
    $.fn.transpose = function(t) {
        var keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'B', 'H'];
        var step = null;
        var key = ''
        var key_position = -1;
        var current_key = $(this).attr('data-key');
        var current_key_position = keys.indexOf(current_key);

        var get_base_chord = function(chord) {
            var base_chord = chord[0];
            if (chord[1]=='#' || chord[1]=='b') {
                base_chord = chord.slice(0, 2);
            }
            return base_chord;
        }

        var get_base_chord_position = function(base_chord) {
            base_chord_position = keys.indexOf(base_chord);
            if (base_chord_position+step>keys.length-1) {
                idx = base_chord_position+step-keys.length;
            }
            else if (base_chord_position+step<0) {
                idx = keys.length+step+base_chord_position;
            }
            else {
                idx = base_chord_position+step;
            }
            return idx;
        }

        if (t.includes('+') || t.includes('-') || t=='0') {
            step = parseInt(t.replace('+', ''));
            if (step==0) {
                key = $(this).attr('data-key-original');
                key_position = keys.indexOf(key);
                step = key_position - current_key_position;
            }
            else {
                key_position = get_base_chord_position(current_key);
                key = keys[key_position];
            }
        }
        else {
            key = t;
            key_position = keys.indexOf(key);
            step = key_position - current_key_position;
        }

        if (key==current_key) { return; }

        transposed_used_chords = [];
        for (var i=0; i<used_chords.length; i++) {
            chord = used_chords[i];
            slugify_chord = get_slugify_chord(chord);
            base_chord = get_base_chord(chord);

            idx = get_base_chord_position(base_chord);

            transposed_chord = chord.replace(base_chord, keys[idx]);
            slugify_transposed_chord = get_slugify_chord(transposed_chord);
            transposed_used_chords.push(transposed_chord);

            $('.'+slugify_chord).filter(':not([data-updated=1])').text(transposed_chord);
            $('.'+slugify_chord).filter(':not([data-updated=1])').addClass(slugify_transposed_chord);
            $('.'+slugify_chord+'.'+slugify_transposed_chord).filter(':not([data-updated=1])').attr('data-updated', 1).removeClass(slugify_chord);
        }

        $(this).attr('data-key', key);
        $('#key-'+current_key_position).removeClass('active');
        $('#key-'+key_position).addClass('active');
        $('#song-detail-chords').attr('data-used-chords', transposed_used_chords.toString());
        $('.inline-chord').removeAttr('data-updated');
        $('.inline-chord').unbind('mouseenter mouseleave');
        chord_bind_hover();
        used_chords = transposed_used_chords;

        render_chords();
   };
})( jQuery );


function chord_bind_hover() {
    $('.inline-chord').each(function(idx, el) {
        $(el).append('<span class="chord-tooltip"></span>');
    });

    $('.inline-chord').hover(
        function() {
            var classes = $(this).attr("class").split(/\s+/);
            if (classes.length == 2) {
                var chord = $('#chord-'+classes[1]).html();
                $(this).find('.chord-tooltip').html(chord);
            }
        }, function() {
            $(this).find('.chord-tooltip').html('');
        }
    );
}

$(window).on('load', function() {
    used_chords = $('#song-detail-chords').data('used-chords').split(',');
    render_chords();

    $('.key').on('click', function(e) {
        e.preventDefault();
        $('.song-content').transpose($(this).text());
    });

    $('.transpose-step').on('click', function(e) {
        e.preventDefault();
        $('.song-content').transpose($(this).find('strong').text());
    });

    chord_bind_hover();
});