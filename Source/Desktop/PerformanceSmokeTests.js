window.__performanceTest=null;
(async()=>{try{
const {renderSongObject}=await import('/js/song/view.js');const {transposeChord}=await import('/js/chords/theory.js');const {paginateSongSections,showSongPage}=await import('/js/song/pagination.js');
function assert(ok,message){if(!ok)throw new Error(message);}
assert(transposeChord('Cmi7/G',2)==='Dmi7/A','Slash bass transposition');assert(transposeChord('H',1)==='C','H wrap');assert(transposeChord('B',2)==='C','Czech B');assert(transposeChord('C',-25)==='H','Negative transposition');
const fixture={artist:'Test',title:'Layout test',key:'C',capo:0,parts:[{type:'verse',text:'[C]Slova [Ami7][Cmi] další konec [G7][Ami7][Cmi]\n'+('Velmi dlouhý [Fmaj7]text pokračuje dál a dál. ').repeat(24)},{type:'chorus',text:'[C/G]Jediný řádek'},{type:'bridge',text:'[Ami7][Cmi][G7]'}]};
const before=JSON.stringify(fixture);renderSongObject(fixture,document.getElementById('app-content'));
const $=id=>document.getElementById(id);const first=()=>document.querySelector('.chord-main[data-original="C"]');
$('transposeSelect').value='D';$('transposeSelect').dispatchEvent(new Event('change'));$('capoSlider').value='0';$('capoSlider').dispatchEvent(new Event('input'));assert(first().textContent==='D','Target key refresh');
$('capoSlider').value='2';$('capoSlider').dispatchEvent(new Event('input'));assert(first().textContent==='C','Live capo');
$('dualChordToggle').checked=true;$('dualChordToggle').dispatchEvent(new Event('change'));$('secondCapo').value='5';$('secondCapo').dispatchEvent(new Event('input'));assert(document.querySelector('.chord-second[data-original="C"]').textContent==='A','Independent second capo');
$('secondInstrument').value='mandolin';$('secondInstrument').dispatchEvent(new Event('change'));assert(document.querySelector('.chord-second[data-original="C"]').dataset.instrument==='mandolin','Second instrument diagram metadata');
$('capoSlider').value='0';$('capoSlider').dispatchEvent(new Event('input'));assert(first().textContent==='D','No accumulated transposition');assert(JSON.stringify(fixture)===before,'Source song mutated');
// Switching modes must not change pitch/shapes. Moving capo then raises the shared pitch.
$('transposeSelect').value='C';$('transposeSelect').dispatchEvent(new Event('change'));
$('secondCapo').value='0';$('secondCapo').dispatchEvent(new Event('input'));
$('capoMode').value='shapes';$('capoMode').dispatchEvent(new Event('change'));
assert(first().textContent==='C','Mode switch changed shapes');
$('capoSlider').value='2';$('capoSlider').dispatchEvent(new Event('input'));
assert(first().textContent==='C'&&$('transposeSelect').value==='D','Preserve shapes and raise pitch');
assert(document.querySelector('.chord-second[data-original="C"]').textContent==='D','Second player follows raised pitch');
$('secondCapo').value='2';$('secondCapo').dispatchEvent(new Event('input'));
assert(document.querySelector('.chord-second[data-original="C"]').textContent==='C','Both capos same shapes');
$('capoMode').value='key';$('capoMode').dispatchEvent(new Event('change'));
assert(first().textContent==='C','Switch back changed shapes');
$('capoSlider').value='0';$('capoSlider').dispatchEvent(new Event('input'));
assert(first().textContent==='D','Preserve pitch after mode switch');
await new Promise(r=>setTimeout(r,250));
let sizes=[];
for(const width of [1200,760,360]){
 $('songContent').style.setProperty('width',width+'px','important');paginateSongSections();const pages=[...document.querySelectorAll('#songContent>.song-page-page')];
 for(let i=0;i<pages.length;i++){showSongPage(i);for(const line of pages[i].querySelectorAll('.song-line')){assert(line.scrollWidth<=line.clientWidth+2,'Horizontal overflow '+width);for(const cls of ['.chord-main[data-original]','.chord-second[data-original]']){const chords=[...line.querySelectorAll(cls)].filter(c=>c.getBoundingClientRect().height>0);for(let j=1;j<chords.length;j++){const a=chords[j-1].getBoundingClientRect(),b=chords[j].getBoundingClientRect();assert(Math.abs(a.top-b.top)>2||a.right<=b.left+1,'Overlapping chords '+width);}}}}
 sizes.push({width,pages:pages.length});
}
$('songContent').style.removeProperty('width');paginateSongSections();
const capoSong={artist:'Test',title:'Source capo test',key:'Dmi',capo:3,parts:[{type:'verse',text:'[Dmi]Test [A7]druhý'}]};
localStorage.setItem('capo:Test|Source capo test','1');localStorage.setItem('target-key:Test|Source capo test','G');localStorage.removeItem('performance-source-v2:Test|Source capo test');
renderSongObject(capoSong,document.getElementById('app-content'));
assert(document.querySelector('.chord-main[data-original="Dmi"]').textContent==='Dmi','Source capo changed written shapes');
$('dualChordToggle').checked=true;$('dualChordToggle').dispatchEvent(new Event('change'));$('secondCapo').value='0';$('secondCapo').dispatchEvent(new Event('input'));
assert(document.querySelector('.chord-second[data-original="Dmi"]').textContent==='Fmi','Second guitar without capo');
$('secondCapo').value='3';$('secondCapo').dispatchEvent(new Event('input'));assert(document.querySelector('.chord-second[data-original="Dmi"]').textContent==='Dmi','Same capo shapes');
// Whole sections must move to the next column, not fill a leftover gap.
const sectionSong={artist:'Test',title:'Whole sections',key:'C',capo:0,parts:Array.from({length:7},(_,i)=>({type:i%2?'chorus':'verse',text:Array.from({length:4},(_,j)=>'[C]Blok '+i+' řádek '+j).join('\n')}))};
renderSongObject(sectionSong,document.getElementById('app-content'));
await new Promise(r=>setTimeout(r,100));paginateSongSections();
assert(document.querySelectorAll('#songContent .song-section-card').length===7,'Whole section split between columns');
$('diagramBackground').value='#cccccc';$('diagramBackground').dispatchEvent(new Event('change'));
assert(localStorage.getItem('diagramBackground')==='#cccccc','Diagram background persistence');
renderSongObject(sectionSong,document.getElementById('app-content'));
assert($('diagramBackground').value==='#cccccc','Diagram background restored');
$('diagramBackground').value='#ffffff';$('diagramBackground').dispatchEvent(new Event('change'));
assert($('globalSearch').hidden,'Search visible in song');
const {setupSearch}=await import('/js/catalog/search.js');
const {state}=await import('/js/core/state.js');
const {loadSong}=await import('/js/core/loader.js');
const originalDatabase=state.database;
const sample=originalDatabase[0];
const source=await loadSong(sample.file);
const word=(source.parts||[]).map(p=>p.text||'').join(' ').replace(/\[[^\]]*\]/g,'').match(/[\p{L}]{5,}/u)?.[0];
assert(word,'Search text fixture missing');
state.database=[{...sample,artistKey:'search-a',artist:'Test A',title:'První test'},{...sample,artistKey:'search-b',artist:'Test B',title:'Druhý test'}];
const container=$('app-content');container.innerHTML='<div id="originalCatalog">Původní</div>';
setupSearch(container,'search-a');$('globalSearch').value=word;$('globalSearch').dispatchEvent(new Event('input'));
await new Promise(r=>setTimeout(r,300));assert(container.querySelectorAll('.search-results .card').length===1,'Artist lyric search scope');
$('globalSearch').value='zzznicnenalezeno';$('globalSearch').dispatchEvent(new Event('input'));await new Promise(r=>setTimeout(r,100));assert(container.querySelectorAll('.search-results .card').length===0,'No-match search');
$('globalSearch').value='';$('globalSearch').dispatchEvent(new Event('input'));assert(!$('originalCatalog').hidden,'Search clear restore');
container.innerHTML='<div>Původní</div>';setupSearch(container);$('globalSearch').value=word;$('globalSearch').dispatchEvent(new Event('input'));await new Promise(r=>setTimeout(r,100));assert(container.querySelectorAll('.search-results .card').length===2,'Global lyric search');
state.database=originalDatabase;
window.__performanceTest={ok:true,transpose:true,slashBass:true,capo:true,capoModes:true,dual:true,secondInstrument:true,sourceUnchanged:true,responsive:sizes};
}catch(e){window.__performanceTest={ok:false,error:String(e),stack:e.stack};}})();
