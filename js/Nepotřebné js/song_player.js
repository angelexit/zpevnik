// === song_player.js ===
// Slugify pro názvy akordů (A#, Ami, A+ atd.)
function get_slugify_chord(chord) {
  return chord
    .replace(/(min|mi|m)(?!a|a7|aj)/gi, 'm')
    .replace(/#/g, 'x')
    .replace(/\+/g, 'y')
    .replace(/\//g, '--');
}

// Ladění pro různé nástroje
const instrumentTunings = {
  guitar:   ["E", "A", "D", "g", "b", "e"],
  ukulele:  ["G", "C", "E", "A"],
  baritone: ["D", "G", "B", "E"],
  mandolin: ["G", "D", "A", "E"]
};

// Data pro akordy (předpokládá se načtení správného JSON objektu např. window.chords_guitar)
const instrumentChordSources = {
  guitar: window.chords_guitar || {},
  ukulele: window.chords_ukulele || {},
  baritone: window.chords_baritone || {},
  mandolin: window.chords_mandolin || {}
};

// Aktuální nástroj z localStorage
function getSelectedInstrument() {
  return localStorage.getItem('selectedInstrument') || 'guitar';
}

// === Nahrazení [akord] → <sup class="inline-chord ...">
function zpracujTextSAkordy() {
  const songTextElement = document.getElementById('song-detail-chords');
  const použitéAkordy = new Set();
  const regexAkordy = /\[([A-H][#b]?((maj|min|mi|m|dim|aug|\+|sus|add)?\d*)?(\/[A-H][#b]?)?)\]/g;

  if (!songTextElement) return;
  let html = songTextElement.innerHTML;
  let upravenyHtml = "";
  let lastIndex = 0;
  let match;

  while ((match = regexAkordy.exec(html)) !== null) {
    const chordText = match[1];
    const slug = get_slugify_chord(chordText);
    použitéAkordy.add(chordText);
    upravenyHtml += html.substring(lastIndex, match.index);
    upravenyHtml += `<sup class="inline-chord ${slug}" data-chord-name="${chordText}">${chordText}</sup>`;
    lastIndex = regexAkordy.lastIndex;
  }
  upravenyHtml += html.substring(lastIndex);
  songTextElement.innerHTML = upravenyHtml;
  songTextElement.setAttribute('data-used-chords', Array.from(použitéAkordy).join(','));
}

// === Vykreslení SVG akordů
function renderChords() {
  const instrument = getSelectedInstrument();
  const tuning = instrumentTunings[instrument];
  const chordData = instrumentChordSources[instrument];
  const used = document.getElementById('song-detail-chords').getAttribute('data-used-chords');
  const chords = used ? used.split(',') : [];

  const container = document.getElementById('chords');
  container.innerHTML = '';

  chords.forEach(chord => {
    const slug = get_slugify_chord(chord);
    const div = document.createElement('div');
    div.id = 'chord-' + slug;
    container.appendChild(div);

    if (!chordData[chord]) return;

    const chart = new svguitar.SVGuitarChord('#' + div.id);
    const pos = chordData[chord].ps[0];
    const chordStruct = {
      title: chordData[chord].t,
      position: pos.p,
      fingers: pos.f,
      barres: (pos.b || []).map(b => ({ fromString: b.fs, toString: b.ts, fret: b.f }))
    };

    chart.configure({
      tuning,
      frets: 4,
      titleColor: '#009CDC',
      orientation: 'vertical',
      style: 'normal',
      fingerSize: 0.85,
      fingerTextSize: 30,
      fingerColor: "#3207f2",
      fretSize: 1.3,
      nutWidth: 20,
      tuningsFontSize: 32,
    }).chord(chordStruct).draw();
  });
}

// === Tooltipy na inline akordech
function bindChordHover() {
  document.querySelectorAll('.inline-chord').forEach(el => {
    const slug = Array.from(el.classList).find(c => c !== 'inline-chord');
    const tooltip = document.createElement('span');
    tooltip.className = 'chord-tooltip';
    el.appendChild(tooltip);

    el.addEventListener('mouseenter', () => {
      const svg = document.getElementById('chord-' + slug);
      if (svg) tooltip.innerHTML = svg.innerHTML;
    });
    el.addEventListener('mouseleave', () => {
      tooltip.innerHTML = '';
    });
  });
}

// === Inicializace po načtení stránky
window.addEventListener('load', () => {
  zpracujTextSAkordy();
  renderChords();
  bindChordHover();
});
