if(window===window.top&&window.chrome?.webview){window.addEventListener('DOMContentLoaded',()=>{
 const bar=document.querySelector('.topbar-right')||document.querySelector('.tools-actions')||document.querySelector('header');if(!bar)return;
 const box=document.createElement('div');box.className='window-controls';
 for(const [action,text,title] of [['minimize','—','Minimalizovat'],['fullscreen','⛶','Celá obrazovka (F11)'],['close','×','Zavřít aplikaci']]){const b=document.createElement('button');b.type='button';b.textContent=text;b.title=title;b.setAttribute('aria-label',title);b.onclick=()=>window.chrome.webview.postMessage({kind:'window-control',action});box.append(b);}bar.append(box);
});}

// Native persistent radio window survives page navigation.
if (window.chrome?.webview && window === window.top) {
 const mountRadio = () => {
  const host = document.querySelector('.topbar-right, .tools-topbar');
  if (!host || document.getElementById('openRadio')) return;
  const button = document.createElement('button'); button.id = 'openRadio'; button.type = 'button';
  button.textContent = '📻'; button.title = 'Rádio – přehrávání na pozadí'; button.setAttribute('aria-label',button.title);
  button.style.cssText = 'flex:0 0 44px;width:44px;min-width:44px;max-width:44px;margin-right:8px;padding:10px;border-radius:12px;cursor:pointer';
  button.onclick = () => chrome.webview.postMessage({kind:'radio-open'}); host.prepend(button);
 };
 if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',mountRadio); else mountRadio();
}
