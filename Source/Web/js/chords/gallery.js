import {TUNINGS_BY_INSTRUMENT} from '../song/instruments.js';
import {generateStringInstrumentSVG} from './svg.js';
import {setHeaderTitle,clearContextBar} from '../shell/header.js';
export const groups=[['Trojzvuky',['','mi','aug','dim']],['Septakordy',['7','mi7','maj7','aug7','dim7','mi7b5']],['Průtažné akordy',['sus2','sus4','7sus2','7sus4']],['Rozšířené akordy',['9','mi9','maj9','11','mi11','13','mi13']],['Přidané tóny',['5','6','mi6','add9','miadd9']]];
export async function renderChordGallery(host){
 setHeaderTitle('Akordy','Akordy | Zpěvník');clearContextBar();host.className='chord-gallery';
 const controls=document.createElement('div');controls.className='chord-gallery-controls';
 const label=document.createElement('label');label.textContent='Základní tón: ';
 const root=document.createElement('select');root.id='galleryRoot';root.setAttribute('aria-label','Základní tón');
 for(const n of ['C','C#','Db','D','D#','Eb','E','F','F#','Gb','G','G#','Ab','A','A#','B','H'])root.add(new Option(n,n));label.append(root);
 const instrument=document.createElement('select');instrument.id='galleryInstrument';
 const tuning=document.createElement('select');tuning.id='galleryTuning';
 for(const [value,name] of Object.entries({guitar:'Kytara',ukulele:'Ukulele',mandolin:'Mandolína',banjo:'Banjo',bass:'Baskytara',piano:'Piáno'}))instrument.add(new Option(name,value));
 controls.append(label);
 for(const [text,select] of [['Nástroj: ',instrument],['Ladění: ',tuning]]){const l=document.createElement('label');l.textContent=text;l.append(select);controls.append(l);}
 host.append(controls);
 const body=document.createElement('div');host.append(body);let db={},request=0;
 function setTunings(){tuning.replaceChildren();for(const [value,name] of TUNINGS_BY_INSTRUMENT[instrument.value])tuning.add(new Option(name,value));}
 async function load(){
  const current=++request;body.textContent='Načítám akordy…';body.dataset.loading='true';
  const key=instrument.value+'-'+tuning.value;
  try{let r=await fetch('/data/chords/'+key+'.json',{cache:'no-store'});if(!r.ok)r=await fetch('/chord-seeds/'+key+'.json');
   if(current!==request)return;
   if(!r.ok){db={};body.dataset.loading='false';draw();return;}
   const data=await r.json();if(current!==request)return;db=data;body.dataset.loading='false';draw();
  }catch{if(current===request){db={};body.dataset.loading='false';body.textContent='Databázi akordů se nepodařilo načíst.';}}
 }
 const aliases={aug:['aug','+','+5'],aug7:['aug7','7#5','7+5'],mi7b5:['mi7b5','mi7-5'],sus2:['sus2','2sus'],sus4:['sus4','sus','4sus'], '7sus4':['7sus4','7sus','7/4'],miadd9:['miadd9','madd9']};
 const roots={Eb:['Eb','Es','D#'],'D#':['D#','Es','Eb'],Ab:['Ab','As','G#'],'G#':['G#','As','Ab'],Db:['Db','C#'],'C#':['C#','Db'],Gb:['Gb','F#'],'F#':['F#','Gb'],B:['B','Bb','A#'],'A#':['A#','B','Bb']};
 function draw(){body.replaceChildren();if(!Object.keys(db).length){const note=document.createElement('p');note.textContent='Pro tento nástroj a ladění zatím není k dispozici databáze hmatů.';body.append(note);}for(const [title,qualities] of groups){const section=document.createElement('section'),heading=document.createElement('h2');heading.textContent=title+' ('+qualities.length+')';const row=document.createElement('div');row.className='chord-gallery-row';section.append(heading,row);
 for(const q of qualities){const name=root.value+q,card=document.createElement('article'),h=document.createElement('h3');card.className='chord-gallery-card';h.textContent=name;card.append(h);let item=db[name];if(!item)for(const r of roots[root.value]||[root.value]){for(const suffix of aliases[q]||[q]){if(db[r+suffix]){item=db[r+suffix];break;}}if(item)break;}
 const ps=(item?.ps||[]).filter(p=>Array.isArray(p.f)&&p.f.length);const diagram=document.createElement('div');card.append(diagram);
 if(!ps.length)diagram.textContent='Hmat zatím chybí';else{const render=i=>diagram.innerHTML=generateStringInstrumentSVG(name,{...item,ps:[ps[i]]},instrument.value,tuning.value);render(0);if(ps.length>1){const variants=document.createElement('select');variants.setAttribute('aria-label','Varianta '+name);ps.forEach((p,i)=>variants.add(new Option('Hmat '+(i+1),i)));variants.onchange=()=>render(Number(variants.value));card.append(variants);}}row.append(card);}body.append(section);}}
 root.onchange=()=>{if(body.dataset.loading!=='true')draw();};instrument.onchange=()=>{setTunings();load();};tuning.onchange=load;setTunings();await load();
}
