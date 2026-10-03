import {editorState} from './state.js';
import {renderChords} from './chords.js';
import {updatePaths} from './covers.js';
const $=id=>document.getElementById(id);
const validChord=/^[A-H][b#]?(?:mi|m|maj|dim|aug|add|sus|[0-9]|[b#][0-9])*(?:\/[A-H][b#]?)?$/;
$('manualChords').addEventListener('input',()=>{
 const entries=$('manualChords').value.trim().split(/[\s,;]+/).filter(Boolean);
 const invalid=entries.filter(c=>!validChord.test(c));
 editorState.manualChords=new Set(entries.filter(c=>validChord.test(c)));
 renderChords();
 $('manualChordStatus').textContent=invalid.length?'Nerozpoznané akordy: '+invalid.join(', '):'';
});
function flatten(items,result=[],depth=0){if(!Array.isArray(items)||depth>10)return result;for(const item of items){if(!item||typeof item!=='object')continue;if(item.type_!=='heading'&&item.title)result.push(item);flatten(item.sub_tracks,result,depth+1);}return result;}
function syncTracks(){
 const select=$('discogsSongSelect'),info=editorState.currentSongData?.discogs;
 const tracks=info&&info.album===$('album').value&&info.libraryArtist===$('artist').value?flatten(info.tracklist):[];
 select.replaceChildren(new Option('Vybrat skladbu z Discogs…',''));
 tracks.forEach((track,i)=>select.add(new Option([track.position,track.title,track.duration].filter(Boolean).join(' · '),String(i))));
 select.hidden=!tracks.length;
 select.onchange=()=>{const track=tracks[Number(select.value)];if(select.value===''||!track)return;$('title').value=track.title;updatePaths();$('title').dispatchEvent(new Event('input',{bubbles:true}));};
}
document.addEventListener('song-metadata-change',syncTracks);
syncTracks();
