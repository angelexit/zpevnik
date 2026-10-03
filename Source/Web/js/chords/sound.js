let timer, current = null;
let queue = Promise.resolve();
function request(action, body={}) {
 if (!window.chrome?.webview) return Promise.resolve({ok:false});
 // Preserve stop/play ordering even during quick pointer changes.
 const result = queue.then(async()=>{const r=await fetch('/api/midi/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),keepalive:true});return r.json();});
 queue=result.catch(()=>({ok:false}));return queue;
}
export function stopChordSound() {clearTimeout(timer);timer=null;current=null;request('stop').catch(()=>{});}
export function scheduleChordSound(chord, target, tip) {
 stopChordSound();
 if(localStorage.getItem('chordSound')==='false')return;
 const marker={};current=marker;
 timer=setTimeout(async()=>{
  if(current!==marker || !target.isConnected || !tip.classList.contains('visible'))return;
  const result=await request('play',{chord}).catch(()=>({ok:false,message:'Zvuk není dostupný.'}));
  if(current!==marker)return;
  if(!result.ok && result.message){const note=document.createElement('small');note.textContent=result.message;tip.append(note);}
 },1000);
}
window.addEventListener('pagehide',stopChordSound);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopChordSound();});
document.addEventListener('chord-sound-setting',stopChordSound);
