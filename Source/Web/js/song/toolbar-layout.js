import { setContextBar } from '../shell/header.js';
function renderSongContextToolbar(settings) {
    setContextBar(`
        <div class="song-toolbar compact collapsed" id="playToolbar">
            <button class="song-toolbar-toggle" id="playToolbarToggle" type="button">
                <span>🎸 Hraní</span>
                <span id="playToolbarState">▼</span>
            </button>

            <div class="song-toolbar-content">
                <div class="toolbar-group">
                    <label for="instrumentSelect">Nástroj</label>
                       <select id="instrumentSelect">
                           <option value="guitar">🎸 Kytara</option>
                           <option value="ukulele">🪕 Ukulele</option>
                           <option value="mandolin">🎻 Mandolína</option>
                           <option value="banjo">🪕 Banjo</option>
                           <option value="bass">🎸 Baskytara</option>
                           <option value="piano">🎹 Piáno</option>
                        </select>
                </div>

                <div class="toolbar-group">
                    <label for="tuningSelect">Ladění</label>
                    <select id="tuningSelect"></select>
                </div>

                <div class="toolbar-group">
                    <label for="handedSelect">Orientace</label>
                    <select id="handedSelect">
                        <option value="right">Pravák</option>
                        <option value="left">Levák</option>
                    </select>
                </div>

                <div class="toolbar-group">
                    <label for="capoSlider">
                        Capo: <span id="capoValue">${settings.capo}</span>
                    </label>
                    <input type="range" min="0" max="12" value="${settings.capo}" id="capoSlider">
                </div>

                <div class="toolbar-group">
                    <label for="transposeSelect">Znějící tónina</label>
                    <select id="transposeSelect">
                        <option>C</option>
                        <option>C#</option>
                        <option>D</option>
                        <option>D#</option>
                        <option>E</option>
                        <option>F</option>
                        <option>F#</option>
                        <option>G</option>
                        <option>G#</option>
                        <option>A</option>
                        <option>A#</option>
                        <option>B</option>
                    </select>
                </div>

                <div class="toolbar-group">
                    <label for="capoMode">Při posunu capa</label>
                    <select id="capoMode"><option value="key">Zachovat tóninu</option><option value="shapes">Zachovat hmaty 1. hráče</option></select>
                </div>
                <div class="toolbar-group checkbox-group">
                    <label>
                        <input type="checkbox" id="dualChordToggle">
                        Dva akordy
                    </label>
                </div>
                <div id="secondSettings" class="second-settings" hidden>
                    <label>Druhý nástroj<select id="secondInstrument"><option value="guitar">Kytara</option><option value="ukulele">Ukulele</option><option value="mandolin">Mandolína</option><option value="banjo">Banjo</option><option value="bass">Baskytara</option><option value="piano">Piáno</option></select></label>
                    <label>Druhé ladění<select id="secondTuning"></select></label>
                    <label>Druhé capo: <span id="secondCapoValue">0</span><input id="secondCapo" type="range" min="0" max="12" value="0"></label>
                </div>
                <small id="performanceLegend" class="performance-legend"></small>
            </div>
        </div>

        <div class="song-toolbar compact collapsed" id="settingsToolbar">
            <button class="song-toolbar-toggle" id="settingsToolbarToggle" type="button">
                <span>⚙️ Nastavení</span>
                <span id="settingsToolbarState">▼</span>
            </button>

            <div class="song-toolbar-content">
                <div class="toolbar-group">
                    <label for="fontFamilySelect">Písmo</label>
                    <select id="fontFamilySelect">
                        <option value='"Roboto Mono"'>Roboto Mono</option>
                        <option value='"IBM Plex Mono"'>IBM Plex Mono</option>
                        <option value='"Courier New"'>Courier New</option>
                        <option value='"JetBrains Mono"'>JetBrains Mono</option>
                        <option value='"Fira Code"'>Fira Code</option>
                        <option value='"Cascadia Mono"'>Cascadia Mono</option>
                        <option value='"Source Code Pro"'>Source Code Pro</option>
                        <option value='"Inconsolata"'>Inconsolata</option>
                        <option value='"Ubuntu Mono"'>Ubuntu Mono</option>
                        <option value='"PT Mono"'>PT Mono</option>
                        <option value='"Space Mono"'>Space Mono</option>
                    </select>
                </div>

                <div class="toolbar-group">
                    <label for="fontSizeSlider">
                        Velikost: <span id="fontSizeValue">${settings.fontSize}</span>%
                    </label>
                    <input type="range" min="70" max="180" value="${settings.fontSize}" id="fontSizeSlider">
                </div>

                <div class="toolbar-group">
                    <label for="fontHeightSlider">
                        Výška: <span id="fontHeightValue">${settings.fontHeight}</span>%
                    </label>
                    <input type="range" min="85" max="130" value="${settings.fontHeight}" id="fontHeightSlider">
                </div>

                <div class="toolbar-group">
                    <label for="fontWidthSlider">
                        Šířka: <span id="fontWidthValue">${settings.fontWidth}</span>%
                    </label>
                    <input type="range" min="85" max="125" value="${settings.fontWidth}" id="fontWidthSlider">
                </div>

                <div class="toolbar-group checkbox-group">
                    <label>
                        <input type="checkbox" id="darkModeToggle">
                        Tmavý režim
                    </label>
                </div>

                <div class="toolbar-group checkbox-group">
                    <label>
                        <input type="checkbox" id="highlightChorusToggle">
                        Zvýraznit refrény
                    </label>
                </div>

                <div class="toolbar-group checkbox-group">
                    <label>
                        <input type="checkbox" id="compactSectionsToggle">
                        Kompaktní sekce
                    </label>
                </div>

                <div class="toolbar-group checkbox-group">
                    <label>
                        <input type="checkbox" id="sectionBordersToggle">
                        Barevné okraje sekcí
                    </label>
                </div>

                <div class="toolbar-group">
                    <label for="chordColorSelect">Barva akordů</label>
                    <select id="chordColorSelect">
                        <option value="">Výchozí</option>
                        <option value="#2563eb">Modrá</option>
                        <option value="#4f46e5">Indigo</option>
                        <option value="#7c3aed">Fialová</option>
                        <option value="#dc2626">Červená</option>
                        <option value="#ea580c">Oranžová</option>
                        <option value="#16a34a">Zelená</option>
                        <option value="#0891b2">Tyrkysová</option>
                        <option value="#111827">Černá</option>
                        <option value="#ffffff">Bílá</option>
                    </select>
                </div>
                <div class="toolbar-group"><label for="chordFrames">Orámování akordů</label><select id="chordFrames"><option value="false">Bez orámování</option><option value="true">S orámováním</option></select></div>
                <div class="toolbar-group">
                    <label for="secondChordColorSelect">Barva druhých akordů</label>
                    <select id="secondChordColorSelect">
                        <option value="">Výchozí</option>
                        <option value="#2563eb">Modrá</option>
                        <option value="#4f46e5">Indigo</option>
                        <option value="#7c3aed">Fialová</option>
                        <option value="#dc2626">Červená</option>
                        <option value="#ea580c">Oranžová</option>
                        <option value="#16a34a">Zelená</option>
                        <option value="#0891b2">Tyrkysová</option>
                        <option value="#111827">Černá</option>
                        <option value="#ffffff">Bílá</option>
                    </select>
                </div>
                <div class="toolbar-group"><label for="secondChordFrames">Orámování druhých akordů</label><select id="secondChordFrames"><option value="false">Bez orámování</option><option value="true">S orámováním</option></select></div>
<div class="toolbar-group"><label><input type="checkbox" id="chordSound"> Přehrát zvuk akordu po 1 s</label></div>
                <div class="toolbar-group"><label for="diagramBackground">Pozadí náhledu akordu</label>
                <select id="diagramBackground"><option value="#ffffff">Bílé</option><option value="#f0f0f0">Téměř bílé</option><option value="#e0e0e0">Světle šedé</option><option value="#cccccc">Šedé</option></select></div>
            </div>
        </div>
    `);
}
export { renderSongContextToolbar };
