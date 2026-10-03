import {setAlbumValue} from './metadata.js';
import {updatePaths,getCoverBaseName,imageFileToJpegBlob,refreshCoverPreview} from './covers.js';
import {editorState} from './state.js';
const $=id=>document.getElementById(id);
let busy=false, selectedArtist=null;
async function api(action,body){const r=await fetch('/api/discogs/'+action,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{});const d=await r.json();if(!r.ok)throw Error(d.error||'Operace se nezdařila.');return d;}
async function run(fn){if(busy)return;busy=true;$('discogsStatus').textContent='Načítám…';try{await fn();}catch(e){$('discogsStatus').textContent=e.message;}finally{busy=false;}}
function button(text,fn,parent){const b=document.createElement('button');b.type='button';b.textContent=text;b.style.margin='4px';b.onclick=()=>run(fn);parent.append(b);return b;}
function text(value,parent,tag='p'){const el=document.createElement(tag);el.textContent=value;parent.append(el);return el;}
function link(url,label,parent){try{const u=new URL(url);if(u.protocol!=='https:'||!['www.discogs.com','discogs.com','www.youtube.com','youtube.com','youtu.be'].includes(u.hostname))return;const a=text(label,parent,'a');a.href=u.href;a.target='_blank';a.rel='noopener';a.style.display='block';}catch{}}
$('discogsPanel').addEventListener('toggle',()=>{if($('discogsPanel').open){if(!$('discogsQuery').value)$('discogsQuery').value=$('artist').value;run(async()=>{const s=await api('status');$('discogsStatus').textContent=s.hasToken?'Token je uložen. Můžeš hledat.':'Vlož osobní token a ověř připojení.';});}});
$('discogsConnect').onclick=()=>run(async()=>{const token=$('discogsToken').value;$('discogsToken').value='';const s=await api('connect',{token});$('discogsStatus').textContent='Připojeno: '+s.username;});
$('discogsForget').onclick=()=>run(async()=>{await api('forget',{});$('discogsToken').value='';$('discogsStatus').textContent='Token byl odstraněn.';});
async function artists(query,page=1){const d=await api('search',{query,page});const box=$('discogsResults');box.replaceChildren();$('discogsDetail').replaceChildren();for(const a of d.results||[])button(a.title,()=>albums(a.id,a.title),box);navigation(d.pagination,p=>artists(query,p),box);$('discogsStatus').textContent=(d.results?.length?'Vyber interpreta.':'Žádný interpret nenalezen. Zkus upravit jméno.');}
function navigation(p,fn,box){if(p?.page>1)button('← Předchozí',()=>fn(p.page-1),box);if(p?.page<p?.pages)button('Další →',()=>fn(p.page+1),box);}
async function albums(id,name,page=1){selectedArtist={id,name};const d=await api('albums',{id,page});const box=$('discogsResults');box.replaceChildren();$('discogsDetail').replaceChildren();text(name,box,'strong');for(const a of d.releases||[])button(`${a.title} · ${a.year||'rok neuveden'} · ${a.type==='master'?'album / master':a.format||'vydání'}`,()=>detail(a.id,a.type),box);navigation(d.pagination,p=>albums(id,name,p),box);$('discogsStatus').textContent='Vyber album nebo konkrétní vydání. Strana '+(d.pagination?.page||1);}
$('discogsSearch').onclick=()=>run(()=>artists($('discogsQuery').value.trim()));
async function detail(id,type){const d=await api('detail',{id,type});const box=$('discogsDetail');box.replaceChildren();text(d.title,box,'h3');link(d.uri||`https://www.discogs.com/${type==='master'?'master':'release'}/${id}`,'Otevřít na Discogs',box);
const checks={};for(const [key,label] of [['album','Název alba: '+d.title],['year','Rok: '+(d.year||'neuveden')],['genres','Žánry: '+(d.genres||[]).join(', ')],['cover','Převzít obal (případný stávající obal bude nahrazen)']]){const l=document.createElement('label');l.style.display='block';const c=document.createElement('input');c.type='checkbox';c.checked=key==='album'||key==='year';c.disabled=key==='cover'&&!d.images?.length;l.append(c,document.createTextNode(' '+label));box.append(l);checks[key]=c;}
if(d.images?.length){try{const image=await api('image',{id,type});const img=document.createElement('img');img.src=image.data;img.alt='Obal '+d.title;img.style.cssText='max-width:180px;max-height:180px;display:block;margin:12px 0';box.append(img);checks.cover.dataset.image=image.data;}catch(e){text('Náhled obalu: '+e.message,box);}}
renderTracklist(d.tracklist,box);
for(const v of d.videos||[])link(v.uri,v.title||'Video',box);
const originalSong=editorState.currentSongData;const originalArtist=$('artist').value;const originalTitle=$('title').value;
button('Převzít vybrané údaje do editoru',async()=>{
if(editorState.currentSongData!==originalSong||$('artist').value!==originalArtist||$('title').value!==originalTitle)throw Error('Píseň se změnila. Vyber album znovu.');
if(checks.album.checked)setAlbumValue(d.title);if(checks.year.checked&&d.year)$('year').value=d.year;
editorState.currentSongData||={};if(checks.genres.checked){editorState.currentSongData.genres=d.genres||[];editorState.currentSongData.styles=d.styles||[];}
editorState.currentSongData.discogs={id,artist:selectedArtist,album:d.title,libraryArtist:$('artist').value,tracklist:d.tracklist||[],type:type==='master'?'master':'release',url:d.uri||`https://www.discogs.com/${type==='master'?'master':'release'}/${id}`};updatePaths();
if(checks.cover.checked){if(!editorState.coversDirHandle||!getCoverBaseName())throw Error('Údaje převzaty. Pro obal nejdřív vyplň interpreta a album a připoj složku obalů.');let data=checks.cover.dataset.image;if(!data)data=(await api('image',{id,type})).data;const blob=await(await fetch(data)).blob();const jpg=await imageFileToJpegBlob(new File([blob],'discogs-image',{type:blob.type}));const handle=await editorState.coversDirHandle.getFileHandle(getCoverBaseName()+'.jpg',{create:true});const writer=await handle.createWritable();await writer.write(jpg);await writer.close();await refreshCoverPreview();}
$('discogsStatus').textContent='Vybrané údaje jsou v editoru. Píseň ulož běžným tlačítkem.';
},box);$('discogsStatus').textContent='Zkontroluj údaje a zaškrtni, co chceš převzít.';
}


function renderTracklist(tracks,parent){
 const section=document.createElement('section');section.className='discogs-tracklist';parent.append(section);
 text('Skladby',section,'h4');
 if(!Array.isArray(tracks)||!tracks.length){text('Discogs u tohoto vydání seznam skladeb neuvádí.',section);return;}
 const table=document.createElement('table');table.setAttribute('aria-label','Skladby na vybraném vydání');
 const head=document.createElement('thead');const headers=document.createElement('tr');
 for(const label of ['Pořadí','Skladba','Délka']){const th=text(label,headers,'th');th.scope='col';}head.append(headers);table.append(head);
 const body=document.createElement('tbody');table.append(body);section.append(table);
 function rows(items,depth=0){for(const item of items){
  if(!item||typeof item!=='object')continue;
  const row=document.createElement('tr');body.append(row);
  if(item.type_==='heading'){const cell=text(item.title||'',row,'th');cell.colSpan=3;cell.scope='rowgroup';row.className='discogs-track-heading';}
  else {text(item.position||'—',row,'td');const title=text(item.title||'Bez názvu',row,'td');title.style.paddingLeft=(12+depth*16)+'px';text(item.duration||'—',row,'td');}
  if(Array.isArray(item.sub_tracks)&&depth<10)rows(item.sub_tracks,depth+1);
 }}rows(tracks);
}
