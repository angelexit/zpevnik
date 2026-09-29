# Mapa modulů

Veškerá aktivní aplikační logika v JavaScriptu používá ES moduly s explicitními importy. HTML soubory nástrojů obsahují jejich strukturu a odkazy na vstupní moduly. Původní on-click/on-change atributy zůstávají jako propojení ovládání; příslušné funkce jsou v modulech, nikoli v dlouhých vložených skriptech.

## Kde co měnit

Cesty níže jsou relativní k `Source/Web/js`.

| Modul / složka | Odpovědnost |
|---|---|
| `app.js` | Spuštění aplikace a pořadí inicializace |
| `app/router.js` | Navigace podle URL, otevření interpreta a písně |
| `app/login.js` | Původní místní přepínač uživatel/admin a odhlášení |
| `app/theme.js` | Světlý/tmavý režim hlavní aplikace |
| `app/toolbox.js` | Nabídka administračních nástrojů |
| `core/state.js` | Sdílený načtený stav aplikace; bez závislosti na startovacím skriptu |
| `core/data-source.js` | Rozhraní ke knihovně v Data; budoucí bod napojení dalších platforem |
| `core/loader.js` | Načtení konfigurace a konkrétní písně |
| `core/parser.js` | Převod řádků textu s akordy na vykreslovaný obsah |
| `shell/header.js` | Nadpis, kontextová lišta a titulek okna |
| `shell/interactions.js` | Vodorovné posouvání pásu alb kolečkem |
| `catalog/artists.js` | Přehled interpretů |
| `catalog/songs.js` | Seznam písní, alba, abeceda a řazení |
| `song/view.js` | Sestavení detailu písně z dat a propojení jeho částí |
| `song/settings.js` | Načtení uložených hodnot a použití vizuálního nastavení |
| `song/toolbar-layout.js` | HTML ovládacích prvků Hraní a Nastavení |
| `song/toolbar.js` | Události ovládání, ukládání voleb a rozbalování panelů |
| `song/instruments.js` | Nástroje, ladění a kompatibilita starších uložených hodnot |
| `song/pagination.js` | Měření, dělení do stránek, šipky/mezerník a reakce na změnu okna |
| `chords/diagrams.js` | Veřejný vstup pro vykreslení akordu |
| `chords/catalog.js` | Volba databáze akordů podle nástroje a ladění |
| `chords/databases/` | Samostatné původní akordové databáze |
| `chords/theory.js` | Normalizace názvů a transpozice akordů |
| `chords/svg.js` | Vykreslení samotného diagramu SVG |
| `chords/tooltips.js` | Zobrazení a umístění akordového náhledu u textu |
| `tools/shell/` | Navigace mezi nástroji, jejich motiv a start |
| `tools/shared/paths.js` | Jediná společná implementace slug a relativních cest nástrojů |
| `tools/shared/theme.js` | Aplikace motivu v jednotlivých nástrojích |
| `tools/editor/state.js` | Stav právě upravované písně, vybrané složky a pracovní hodnoty |
| `tools/editor/metadata.js` | Výběr interpreta, alba a roku |
| `tools/editor/files.js` | Výběr složky písní, import a uložení JSON |
| `tools/editor/song.js` | Naplnění/reset formuláře a vytvoření objektu písně |
| `tools/editor/status.js` | Stav kontroly a přehrání písně |
| `tools/editor/covers.js` | Cesty a náhledy obalů, import obrázku |
| `tools/editor/chords.js` | Zpracování vložených akordů a rychlý výběr akordu |
| `tools/editor/sections.js` | Přidávání částí a úprava instrumentálních řádků |
| `tools/editor/indexer.js` | Indexování knihovny a vytvoření databázových souborů |
| `tools/editor/downloads.js` | Zápis/stažení výstupních souborů indexeru |
| `tools/editor/dom.js` | Pomocné operace formuláře, záložky a bezpečné vložení textu |
| `tools/export/state.js` | Stav samostatného exportního nástroje |
| `tools/export/files.js` | Výběr složek, načtení JSON a zápis výstupu |
| `tools/export/indexes.js` | Generování database.json a artists.json |
| `tools/export/report.js` | Generování textového reportu |
| `tools/export/view.js` | Statistiky, seznamy a náhledy exportu |
| `tools/export/actions.js` | Uživatelské akce generování a resetu |
| `tools/chord-editor/state.js` | Stav právě tvořeného akordu |
| `tools/chord-editor/instruments.js` | Rozměry hmatníku a ladění nástrojů |
| `tools/chord-editor/fretboard.js` | Klikání na hmatník a kreslení bodů |
| `tools/chord-editor/svg.js` | Náhled vytvořeného diagramu |
| `tools/chord-editor/output.js` | Sestavení výsledného JSON a kopírování |
| `tools/chord-editor/import.js` | Načtení existujícího diagramu do editoru |
| `tools/*/main.js` | Start konkrétního nástroje a úzké propojení s původními HTML handlery |

`render/ui.js` a `render/chords.js` jsou malé kompatibilní vstupy, které pouze reexportují veřejné funkce. Logika už v nich není. Prázdný původní `render/piano.js` zůstává neaktivní; podpora klavíru tímto krokem nevznikla.

## Pravidla pro další úpravy

- Data patří do `Data`; kód, styly a šablony do `Source/Web`.
- Každý modul upravuj podle odpovědnosti uvedené výše. Do `app.js` a `main.js` nepřidávej vlastní vykreslování nebo práci se soubory.
- Závislosti uváděj přes `import`. Nevytvářej sdílený stav pomocí náhodných proměnných na `window`.
- Původní HTML handlery připojuje `main.js` explicitně přes `Object.assign(window, ...)`. Jde o kompatibilitu ovládání; pracovní stav zůstává v `state.js`. Při další úpravě konkrétní komponenty je možné její atributové handlery nahradit přímo `addEventListener`.
- Moduly nemají kruhové importy. Sdílené hodnoty ukládej do samostatného stavu nebo předávej parametrem.
- Staré nepoužívané kopie skriptů jsou v `Source/Original-notes/unused-javascript`; aplikace je nenačítá. Needituj je jako živý kód.
- Úplný seznam veřejných exportů a závislostí je v `Source/MODULY.json`.

Nativní okno, nabídka, lokální obsluha požadavků a vývojový režim jsou v `Source/Desktop/Program.cs`; F11/Esc v `FullScreenController.cs`. Browserový kód tyto platformní věci neřeší.


## Lokální editory 3.1.4
- Desktop/LibraryStore.cs: omezený přístup do datové složky, kontrola revize, zálohy a společné uložení písně s indexy.
- Web/js/core/desktop-api.js: komunikace editorů s desktopovou vrstvou, potvrzení výsledku a přístup k obalům.
- Web/js/tools/editor/files.js: načítání, ukládání, náhled a obnovení rozepsané písně.
- Web/js/tools/chord-editor/library.js: databáze akordů, varianty a rozpracovaný hmat.
- Web/js/chords/catalog.js: načítání sdílených JSON databází z Data/chords/.
- Web/chord-seeds/: pouze výchozí obsah pro první vytvoření chybějících databází. Pro každodenní úpravy používej editor a Data/chords/.


## Verze 3.1.5
- js/tools/editor/chord-text.js: vizuální akordové štítky, serializace závorek, přesun, schránka a historie změn.
- js/tools/chord-editor/chooser.js: sestavení názvu akordu, výběr nástroje a přehled dostupnosti ve všech databázích.
- js/tools/chord-editor/import.js: validace importu jednoho akordu bez automatické změny nástroje.
