export async function checkSyncOnOpen() {
    if(localStorage.getItem('zpevnikMode')!=='admin')return;
    if(location.search.includes('preview='))return;
    try {
        const response=await fetch('/api/github/settings');if(!response.ok)return;
        const {settings}=await response.json();
        if(settings.checkOnOpen===false||!settings.owner||!settings.repo||!settings.branch)return;
        const check=await fetch('/api/github/check',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
        const result=await check.json();
        const text=!check.ok?'GitHub se nepodařilo zkontrolovat. Zpěvník funguje s místními daty.':result.conflicts?`GitHub: ${result.conflicts} konfliktů k porovnání.`:result.downloads?`Na GitHubu jsou změny k načtení (${result.downloads}).`:result.uploads?`Máš místní změny k odeslání (${result.uploads}).`:'';
        if(!text)return;
        const notice=document.createElement('aside');notice.className='sync-notice';notice.setAttribute('role','status');
        const label=document.createElement('span');label.textContent=text;
        const link=document.createElement('a');link.href='/tools/index.html#export';link.textContent='Otevřít synchronizaci';
        const close=document.createElement('button');close.textContent='×';close.setAttribute('aria-label','Zavřít upozornění');close.onclick=()=>notice.remove();
        notice.append(label,link,close);document.body.append(notice);
    }catch{/* Offline operation remains available. */}
}
