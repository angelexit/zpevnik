const $ = id => document.getElementById(id);
let planId=null,busy=false,statusTimer,changes=[];
const choices={};
const fields={owner:'ghOwner',repo:'ghRepo',branch:'ghBranch',folder:'ghFolder'};
async function api(action,body) {
    const response=await fetch('/api/github/'+action,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const result=await response.json();if(!response.ok)throw new Error(result.error||'Operace se nezdařila.');return result;
}
function invalidate(){if($('ghBulk'))$('ghBulk').hidden=true;planId=null;changes=[];for(const key of Object.keys(choices))delete choices[key];lock(busy);}
function lock(value){
    busy=value;$('githubSettings').inert=value;$('ghChanges').inert=value;$('ghCheck').disabled=value;$('ghScope').disabled=value;$('ghBulk').inert=value;
    const unresolved=changes.some(e=>e.action==='conflict'&&!choices[e.path]);
    $('ghDownload').disabled=$('ghPublish').disabled=value||!planId||unresolved;
}
async function run(action){
    if(busy)return;lock(true);
    const started=Date.now();
    statusTimer=setInterval(async()=>{try{const result=await api('status');if(busy&&result.progress)$('ghStatus').textContent=result.progress+' · '+Math.floor((Date.now()-started)/1000)+' s';}catch{}},1200);
    try{await action();}catch(error){invalidate();$('ghStatus').textContent=error.message;}
    finally{clearInterval(statusTimer);lock(false);}
}
async function save(forget=false){
    const body=Object.fromEntries(Object.entries(fields).map(([k,id])=>[k,$(id).value.trim()]));
    body.token=$('ghToken').value;body.forgetToken=forget;body.checkOnOpen=$('ghAuto').checked;
    const result=await api('settings',body);$('ghToken').value='';
    $('ghSettingsStatus').textContent='Nastavení uloženo. '+(result.hasToken?'Token je uložen chráněně i pro další spuštění.':'Token není vyplněný. Veřejná data lze načíst, k odesílání je potřeba token.');invalidate();return result;
}
$('githubSettings').addEventListener('input',invalidate);
$('githubSettings').onsubmit=e=>{e.preventDefault();run(()=>save());};
$('ghForget').onclick=()=>run(()=>save(true));
$('ghScope').onchange=()=>{
    invalidate();$('ghChanges').replaceChildren();$('ghWarnings').replaceChildren();$('ghResult').replaceChildren();$('ghReload').hidden=true;
    $('ghScopeHelp').textContent=$('ghScope').value==='project'?'Source a Licenses vedle EXE ↔ Source a Licenses v kořeni repozitáře. Databáze a EXE se touto volbou nemění.':'Písně, obrázky a akordy v nastavené podsložce databáze.';
    $('ghStatus').textContent='Zvolený obsah nejprve porovnej.';
};
function chooseAll(value){for(const select of $('ghChanges').querySelectorAll('select')){select.value=value;select.dispatchEvent(new Event('change'));}}
$('ghAllLocal').onclick=()=>chooseAll('local');$('ghAllRemote').onclick=()=>chooseAll('remote');
const labels={upload:'↑ Z tohoto počítače na GitHub',download:'↓ Z GitHubu do počítače',merge:'↔ Sloučit nezávislé změny seznamu',conflict:'⚠ Změněno na obou stranách'};
async function preview(path){
    try{
        const result=await api('preview',{planId,path});$('ghPreviewTitle').textContent=path;
        for(const [side,id] of [['local','ghLocalPreview'],['remote','ghRemotePreview']]){
            const host=$(id);host.replaceChildren();
            if(result.isJson||!result[side].startsWith('data:image/')){const pre=document.createElement('pre');pre.textContent=result[side];host.append(pre);}
            else{const img=document.createElement('img');img.src=result[side];img.alt=side==='local'?'Místní obrázek':'Obrázek na GitHubu';host.append(img);}
        }
        $('ghPreview').showModal();
    }catch(error){$('ghStatus').textContent=error.message;}
}
$('ghClosePreview').onclick=()=>$('ghPreview').close();
$('ghCheck').onclick=()=>run(async()=>{
    await save();$('ghStatus').textContent='Porovnávám poslední společný stav, tento počítač a GitHub…';
    $('ghChanges').replaceChildren();$('ghWarnings').replaceChildren();$('ghResult').replaceChildren();
    const result=await api('check',{scope:$('ghScope').value});planId=result.planId;changes=result.changes;
    $('ghStatus').textContent=result.target+' — k odeslání: '+result.uploads+', k načtení: '+result.downloads+', konflikty: '+result.conflicts+', shodné: '+result.unchanged+'.'+(result.firstSync?' První propojení: u rozdílných verzí vyber, kterou zachovat.':'');
    for(const change of changes){
        const row=document.createElement('tr');row.classList.toggle('sync-conflict',change.action==='conflict');
        for(const value of [change.path,change.unknownBase?'⚠ Rozdílné verze – společný stav neznámý':labels[change.action]]){const cell=document.createElement('td');cell.textContent=value;row.append(cell);}
        const controls=document.createElement('td');
        if(change.action==='conflict'){
            const select=document.createElement('select');select.setAttribute('aria-label','Verze souboru '+change.path);
            for(const [value,label] of [['','Vyber verzi…'],['local','Ponechat místní'],['remote','Použít GitHub']])select.add(new Option(label,value));
            select.onchange=()=>{choices[change.path]=select.value;lock(false);};controls.append(select);
        }
        const button=document.createElement('button');button.textContent='Porovnat obsah';button.onclick=()=>preview(change.path);controls.append(button);row.append(controls);$('ghChanges').append(row);
    }
    for(const warning of result.warnings){const p=document.createElement('p');p.textContent=warning;$('ghWarnings').append(p);}
    $('ghBulk').hidden=!result.conflicts;
    if(result.conflicts)$('ghWarnings').append('Nejdřív vyber verzi u každého konfliktu. Přepsané místní soubory budou zálohované.');
});
async function apply(action){
    $('ghStatus').textContent=action==='download'?'Načítám změny bez odesílání…':'Synchronizuji oba směry…';
    const result=await api(action,{planId,choices});invalidate();$('ghChanges').replaceChildren();$('ghWarnings').replaceChildren();$('ghStatus').textContent=result.message;
    for(const warning of result.warnings||[]){const p=document.createElement('p');p.textContent=warning;$('ghWarnings').append(p);}
    if(result.localApplied&&result.scope==='project'){$('ghResult').textContent='Zdroje a licence jsou uložené. Spuštěná EXE zůstává stejná; stažené zdroje se automaticky nesestavují ani nespouštějí.';}
    else if(result.localApplied){$('ghReload').hidden=false;$('ghResult').textContent='Data jsou uložená. Obnov zpěvník, aby se načetly nové seznamy. Rozpracované koncepty v editoru se samy nepřepisují.';}
    if(result.url){const p=document.createElement('p'),link=document.createElement('a');link.href=result.url;link.textContent='Verze na GitHubu';link.target='_blank';link.rel='noopener';p.append(link);$('ghResult').append(p);}
}
$('ghPublish').onclick=()=>run(()=>apply('publish'));
$('ghDownload').onclick=()=>run(()=>apply('download'));
$('ghReload').onclick=()=>{window.top.location.href='/index.html';};
run(async()=>{
    const result=await api('settings');for(const [key,id] of Object.entries(fields))$(id).value=result.settings[key]??(key==='branch'?'main':'');
    $('ghAuto').checked=result.settings.checkOnOpen!==false;$('ghSettingsStatus').textContent=result.hasToken?'Token je připravený.':'Token není vyplněný.';
    $('ghStatus').textContent='Nastav repozitář a porovnej změny.';
});
