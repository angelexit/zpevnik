import {state} from '../core/state.js';
import {loadSong} from '../core/loader.js';
import {libraryUrl} from '../core/data-source.js';
const cache=new Map();
let generation=0;
export const normalizeSearch=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('cs');
export function setupSearch(container,artistKey=null){
 const input=document.getElementById('globalSearch');if(!input)return;
 const route=++generation;let request=0;
 input.hidden=false;input.value='';input.placeholder=artistKey?'Hledat v písních tohoto interpreta…':'Hledat interpreta, píseň nebo slova v textu…';
 input.setAttribute('aria-label',input.placeholder);
 const original=[...container.children];
 const results=document.createElement('section');results.className='search-results';results.hidden=true;container.append(results);
 const songs=Array.isArray(state.database)?state.database.filter(s=>!artistKey||s.artistKey===artistKey):[];
 const textFor=s=>{if(!cache.has(s.file))cache.set(s.file,loadSong(s.file).then(data=>({text:normalizeSearch((data.parts||[]).map(p=>p.text||'').join(' ').replace(/\[[^\]]*\]/g,'')),ok:true})).catch(()=>{cache.delete(s.file);return {text:'',ok:false};}));return cache.get(s.file);};
 const card=(title,subtitle,url,cover)=>{
  const el=document.createElement('div');el.className='card has-cover';
  if(cover)el.style.backgroundImage=`url("${libraryUrl(cover)}")`;
  const overlay=document.createElement('div');overlay.className='card-overlay';
  const body=document.createElement('div');body.className='card-content';
  const h=document.createElement('h3');h.textContent=title;
  const sub=document.createElement('div');sub.className='meta-info';sub.textContent=subtitle;
  body.append(h,sub);el.append(overlay,body);el.tabIndex=0;el.setAttribute('role','link');
  const open=()=>{history.pushState({},'',url);window.dispatchEvent(new Event('popstate'));};
  el.onclick=open;el.onkeydown=e=>{if(e.key==='Enter')open();};return el;
 };
 input.oninput=async()=>{
  const id=++request;const words=normalizeSearch(input.value).trim().split(/\s+/).filter(Boolean);
  original.forEach(el=>el.hidden=words.length>0);results.hidden=!words.length;
  if(!words.length){results.replaceChildren();return;}
  const matches=text=>words.every(w=>text.includes(w));
  const draw=(found,loading=false,failed=false)=>{
   results.replaceChildren();const status=document.createElement('p');status.setAttribute('role','status');
   const artists=artistKey?[]:(state.artists||[]).filter(a=>matches(normalizeSearch(a.artist)));
   status.textContent=`Nalezeno: ${found.length} písní`+(artists.length?`, ${artists.length} interpretů`:'')+(loading?' · Prohledávám texty…':failed?' · Některé texty se nepodařilo načíst.':'');results.append(status);
   const grid=document.createElement('div');grid.className='song-grid';
   artists.forEach(a=>grid.append(card(a.artist,'Interpret','?artist='+encodeURIComponent(a.artistKey),a.cover)));
   found.forEach(s=>grid.append(card(s.title,[s.artist,s.album].filter(Boolean).join(' · '),'?song='+encodeURIComponent(s.file),s.cover)));
   results.append(grid);
  };
  const metadata=s=>normalizeSearch([s.title,s.artist,s.album].join(' '));
  draw(songs.filter(s=>matches(metadata(s))),true);
  const loaded=await Promise.all(songs.map(textFor));
  if(route!==generation||id!==request||!results.isConnected)return;
  draw(songs.filter((s,i)=>matches(metadata(s)+' '+loaded[i].text)),false,loaded.some(x=>!x.ok));
 };
}
export function hideSearch(){generation++;const input=document.getElementById('globalSearch');if(input){input.hidden=true;input.oninput=null;}}
