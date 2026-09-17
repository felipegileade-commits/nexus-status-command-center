// Tema claro: injeta /tema-claro.css no iframe assim que o documento dele
// existe (antes de o shell.js revelar o frame), para não piscar escuro.
// ?tema=escuro mantém o visual antigo.
(()=>{
  const frame=document.getElementById('app');
  if(!frame)return;
  const ESCURO=/[?&]tema=escuro\b/.test(location.search);
  const VERSION=(document.currentScript&&/[?&]v=([^&]+)/.exec(document.currentScript.src)||[])[1]||'';
  if(ESCURO)return;
  document.documentElement.classList.add('nx-claro');
  function aplicar(){
    const d=frame.contentDocument;if(!d||!d.head||d.getElementById('nx-tema-claro'))return;
    const l=d.createElement('link');l.id='nx-tema-claro';l.rel='stylesheet';l.href='/tema-claro.css'+(VERSION?'?v='+VERSION:'');
    d.head.appendChild(l);
  }
  // O documento do iframe é criado antes do 'load'; tentamos cedo e garantimos no load.
  const t=setInterval(()=>{try{if(frame.contentDocument?.head){aplicar();if(frame.contentDocument.readyState==='complete')clearInterval(t)}}catch(e){}},30);
  frame.addEventListener('load',()=>{aplicar();clearInterval(t)});
})();
