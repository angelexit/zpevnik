const $ = id => document.getElementById(id);
const audio = $('audio');
audio.volume = Number(localStorage.getItem('radioVolume') ?? .7);
$('volume').value = audio.volume;
let busy = false, signature = '';
async function api(action, body) {
 const res = await fetch('/api/radio/' + action, body ? {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)} : {});
 const data = await res.json(); if (!res.ok || data.error) throw new Error(data.error || 'Rádio není dostupné.'); return data;
}
async function refresh() {
 const state = await api('state');
 const key = JSON.stringify(state.stations);
 if (key !== signature) {
  const selected = $('stations').value || localStorage.getItem('radioStation');
  $('stations').replaceChildren(...state.stations.map(s => new Option(s.name, s.id)));
  if (state.stations.some(s => s.id === selected)) $('stations').value = selected;
  signature = key;
 }
 $('metadata').textContent = state.status;
 if (state.title) $('title').textContent = state.title;
 $('history').replaceChildren(...state.history.map(x => { const li = document.createElement('li'); li.textContent = `${x.time} · ${x.station} — ${x.title}`; return li; }));
}
async function run(action) {
 if (busy) return; busy = true; $('error').textContent = '';
 for (const id of ['play','stop','add']) $(id).disabled = true;
 try { await action(); } catch(e) { $('error').textContent = e.message; }
 finally { busy = false; for (const id of ['play','stop','add']) $(id).disabled = false; }
}
$('play').onclick = () => run(async () => {
 audio.pause(); audio.removeAttribute('src'); audio.load();
 const id = $('stations').value;
 const data = await api('start', {id}); localStorage.setItem('radioStation',id);
 $('title').textContent = $('stations').selectedOptions[0].textContent;
 audio.src = data.url;
 try { await audio.play(); } catch(e) { await api('stop',{}); throw new Error('Stream se nepodařilo přehrát. Zkus jinou stanici nebo přímou adresu MP3/AAC.'); }
});
$('stop').onclick = () => run(async () => { audio.pause(); audio.removeAttribute('src'); audio.load(); await api('stop',{}); $('title').textContent = 'Rádio je zastavené.'; $('audioStatus').textContent = 'Zastaveno'; await refresh(); });
$('volume').oninput = () => { audio.volume = Number($('volume').value); localStorage.setItem('radioVolume',audio.volume); };
$('background').onclick = () => chrome.webview.postMessage({kind:'radio-hide'});
$('add').onclick = () => run(async () => { await api('add',{name:$('name').value,url:$('url').value}); $('name').value = ''; $('url').value = ''; await refresh(); });
audio.onplaying = () => $('audioStatus').textContent = '▶ Hraje • můžeš se vrátit do Zpěvníku';
audio.onwaiting = () => $('audioStatus').textContent = 'Načítám zvuk…';
audio.onerror = () => { if (audio.hasAttribute('src')) { $('audioStatus').textContent = 'Zvuk se nepodařilo načíst. Zkus Přehrát nebo jinou stanici.'; api('stop',{}).catch(()=>{}); } };
audio.onended = () => { $('audioStatus').textContent = 'Stream byl ukončen. Pro opětovné spuštění stiskni Přehrát.'; api('stop',{}).catch(()=>{}); };
refresh().catch(e => $('error').textContent = e.message);
setInterval(() => refresh().catch(e => $('error').textContent = e.message),2500);
