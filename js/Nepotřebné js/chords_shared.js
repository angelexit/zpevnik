// ===== SHARED CHORDS BOOTSTRAPER =====

// Dynamické ladění pro nástroje
const instrumentTunings = {
  guitar:   ["E", "A", "D", "g", "b", "e"],
  ukulele:  ["G", "C", "E", "A"],
  baritone: ["D", "G", "B", "E"],
  mandolin: ["G", "D", "A", "E"]
};

// Výchozí nástroj
const selectedInstrument = localStorage.getItem('selectedInstrument') || 'guitar';
const tuning = instrumentTunings[selectedInstrument] || instrumentTunings.guitar;

// Funkce pro přepis akordů v textu a jejich inicializaci
$(document).ready(function () {
  const songTextElement = $('#song-detail-chords');
  const použitéAkordy = new Set();
  const regexAkordy = /\[([A-H][#b]?((maj|min|mi|m|dim|aug|\+|sus|add)?\d*)?(\/[A-H][#b]?)?)\]/g;

  let htmlObsah = songTextElement.html();
  let upravenyHtml = "";
  let posledniIndex = 0;
  let nalezenyAkord;

  while ((nalezenyAkord = regexAkordy.exec(htmlObsah)) !== null) {
    const nazevAkordu = nalezenyAkord[1];
    const slug = get_slugify_chord(nazevAkordu);
    upravenyHtml += htmlObsah.substring(posledniIndex, nalezenyAkord.index);
    upravenyHtml += `<sup class="inline-chord ${slug}" data-chord-name="${nazevAkordu}">${nazevAkordu}</sup>`;
    použitéAkordy.add(nazevAkordu);
    posledniIndex = regexAkordy.lastIndex;
  }

  upravenyHtml += htmlObsah.substring(posledniIndex);
  songTextElement.html(upravenyHtml);
  songTextElement.attr('data-used-chords', Array.from(použitéAkordy).join(','));

  // Aktivuj SVG a tooltipy
  if (typeof render_chords === 'function') {
    used_chords = Array.from(použitéAkordy);
    render_chords(tuning);
  }
  if (typeof chord_bind_hover === 'function') {
    chord_bind_hover();
  }
});
