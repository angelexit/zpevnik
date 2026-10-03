export function lookupUrl(service,artist,album,title){
 const query=(service==='artist'?[artist]:service==='youtube'?[artist,title]:[artist,album||title]).map(x=>String(x||'').trim()).filter(Boolean).join(' ');
 if(!query)return null;
 return service==='youtube'?'https://www.youtube.com/results?search_query='+encodeURIComponent(query):'https://www.discogs.com/search/?q='+encodeURIComponent(query)+'&type='+(service==='artist'?'artist':'release');
}
for(const [id,service] of [['findDiscogs','release'],['findDiscogsArtist','artist'],['findYoutube','youtube']]){
 document.getElementById(id).onclick=()=>{
 const value=id=>document.getElementById(id).value;
 const url=lookupUrl(service,value('artist'),value('album'),value('title'));
 const status=document.getElementById('lookupStatus');
 if(!url){status.textContent='Nejdřív vyplň interpreta, album nebo název písně.';return;}
 window.open(url,'_blank');status.textContent='Výsledky se otevírají v prohlížeči. Vybrané údaje můžeš přenést do editoru.';
 };
}
