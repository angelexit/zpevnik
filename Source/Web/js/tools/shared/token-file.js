// A user-selected file is read only on request; its path and contents never enter song data.
export function parseTokenFile(content,service){
 const source=content.replace(/^\uFEFF/,'').trim();let value;
 if(source.startsWith('{')){let data;try{data=JSON.parse(source);}catch{throw Error('Soubor není platný JSON.');}value=data[service];if(value&&typeof value==='object')value=value.token;if(value===undefined)value=data.token;}
 else value=source;
 if(typeof value!=='string'||value.trim().length<8||value.trim().length>256||/\s/.test(value.trim()))throw Error('Soubor neobsahuje platný token pro '+service+'.');
 return value.trim();
}
for(const [service,inputId,statusId] of [['discogs','discogsToken','discogsStatus'],['github','ghToken','ghSettingsStatus']]){
 const input=document.getElementById(inputId);if(!input)continue;
 const pick=document.createElement('input');pick.type='file';pick.accept='.txt,.json';pick.hidden=true;
 const button=document.createElement('button');button.type='button';button.className='btn secondary';button.textContent='Načíst token ze souboru';button.style.margin='8px';button.onclick=()=>pick.click();
 const hint=document.createElement('small');hint.style.display='block';hint.textContent='TXT: samotný token. JSON: pole „'+service+'“ nebo „token“. Po načtení potvrď připojení / ulož nastavení. Soubor s tokenem ponech mimo sdílenou knihovnu.';
 input.insertAdjacentElement('afterend',button);button.after(pick,hint);
 pick.onchange=async()=>{const file=pick.files?.[0];if(!file)return;try{if(file.size>8192)throw Error('Soubor s tokenem je příliš velký.');input.value=parseTokenFile(await file.text(),service);document.getElementById(statusId).textContent='Token načten. Potvrď připojení nebo ulož nastavení.';}catch(e){document.getElementById(statusId).textContent=e.message;}finally{pick.value='';}};
}
