// Aba "Riscos e pendências": quarta guia da navegação, lida de /data/p-9c4e1b7a3f.json.
// Só no editor (index.html): é apoio interno e não entra na view do cliente (decisão do Felipe, 17/09).
// Renderizada em tempo de carga (classe nx-live, o shell.js não grava no estado).
(()=>{
  const frame=document.getElementById('app');
  if(!frame)return;
  const VERSION=(document.currentScript&&/[?&]v=([^&]+)/.exec(document.currentScript.src)||[])[1]||'';
  const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let dados=null,carregando=null;
  function carregar(){
    if(dados)return Promise.resolve(dados);if(carregando)return carregando;
    carregando=fetch('/data/p-9c4e1b7a3f.json'+(VERSION?'?v='+VERSION:''),{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null).then(j=>{dados=j;return j});
    return carregando;
  }
  function styles(d){
    if(d.getElementById('nx-pend-style'))return;
    const s=d.createElement('style');s.id='nx-pend-style';s.textContent=`
      #riscos .nx-sec{margin:22px 0 0}
      #riscos .nx-sec h2{font-size:18px;font-weight:600;margin:0 0 4px}
      #riscos .nx-sec .sub{color:var(--muted);font-size:12px;margin:0 0 12px}
      .nx-risk-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
      .nx-risk{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:16px 18px;border-left:4px solid var(--orange)}
      .nx-risk.alto{border-left-color:var(--red)}.nx-risk.medio{border-left-color:var(--orange)}.nx-risk.baixo{border-left-color:var(--green)}
      .nx-risk-top{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:6px}
      .nx-risk-top .frente{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--teal);font-weight:800}
      .nx-risk-top .nivel{font-size:10px;font-weight:800;padding:3px 9px;border-radius:999px;background:var(--panel2);color:var(--muted)}
      .nx-risk.alto .nivel{color:var(--red)}.nx-risk.medio .nivel{color:var(--orange)}
      .nx-risk h3{margin:0 0 6px;font-size:14px;font-weight:700;color:var(--text)}
      .nx-risk p{margin:0;font-size:12px;line-height:1.5;color:var(--muted)}
      .nx-risk .meta{margin-top:10px;display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:11px}
      .nx-risk .meta span{display:block;color:var(--muted);font-size:9px;text-transform:uppercase;letter-spacing:.08em;margin-bottom:2px}
      .nx-risk .meta b{font-weight:600;color:var(--text)}
      .nx-table{width:100%;border-collapse:collapse;background:var(--panel);border:1px solid var(--line);border-radius:12px;overflow:hidden;font-size:12px}
      .nx-table th{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);text-align:left;padding:10px 12px;border-bottom:1px solid var(--line);background:var(--panel2)}
      .nx-table td{padding:9px 12px;border-bottom:1px solid var(--line);vertical-align:top;color:var(--text)}
      .nx-table tr:last-child td{border-bottom:0}
      .nx-table td.muted{color:var(--muted);white-space:nowrap}
      .nx-two{display:grid;grid-template-columns:1.2fr .8fr;gap:16px;align-items:start}
      .nx-att{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:14px 18px}
      .nx-att li{font-size:12px;color:var(--text);margin:6px 0;line-height:1.45}
      .nx-stamp{color:var(--muted);font-size:11px;margin:6px 0 0}
      @media(max-width:900px){.nx-risk-grid,.nx-two{grid-template-columns:1fr}}
    `;d.head.appendChild(s);
  }
  function tabela(rows,cols){
    return `<table class="nx-table"><thead><tr>${cols.map(c=>`<th>${esc(c[1])}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${cols.map(c=>`<td class="${c[2]||''}">${esc(r[c[0]])}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  }
  function render(w,j){
    const d=w.document;styles(d);
    const nav=d.querySelector('.nav');const main=d.querySelector('main');if(!nav||!main)return;
    if(!nav.querySelector('[data-view="riscos"]')){
      const b=d.createElement('button');b.type='button';b.dataset.view='riscos';b.className='nx-live';b.innerHTML='Riscos e<br>pendências';
      b.onclick=()=>{nav.querySelectorAll('button').forEach(x=>x.classList.remove('active'));d.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));b.classList.add('active');d.getElementById('riscos').classList.add('active');w.scrollTo({top:0,behavior:'smooth'})};
      nav.appendChild(b);
      // os botões antigos precisam também desligar a nova aba
      nav.querySelectorAll('button:not([data-view="riscos"])').forEach(x=>x.addEventListener('click',()=>{b.classList.remove('active');const v=d.getElementById('riscos');if(v)v.classList.remove('active')}));
    }
    let sec=d.getElementById('riscos');
    if(!sec){sec=d.createElement('section');sec.id='riscos';sec.className='view nx-live';main.appendChild(sec)}
    const nivelCls=n=>String(n||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
    const riscos=(j.riscos||[]).map(r=>`<div class="nx-risk ${nivelCls(r.nivel)}"><div class="nx-risk-top"><span class="frente">${esc(r.frente)}</span><span class="nivel">${esc(r.nivel)}</span></div><h3>${esc(r.titulo)}</h3><p>${esc(r.desc)}</p><div class="meta"><div><span>Impacto</span><b>${esc(r.impacto)}</b></div><div><span>Ação</span><b>${esc(r.acao)}</b></div></div></div>`).join('');
    sec.innerHTML=`
      <div class="hero-title"><div class="eyebrow">Acompanhamento</div><h1>Riscos e pendências</h1><p>Atraso é risco: o que pode comprometer a entrega até 13/11, o que está com a MV, o que está com a Sottelli e o que já foi entregue.</p><p class="nx-stamp">Atualizado em ${esc(j.atualizadoEm)} · Fontes: ${esc(j.fontes)}</p></div>
      <div class="nx-sec"><h2>Riscos</h2><p class="sub">Ordenados por criticidade. Nível: Alto = compromete a data final; Médio = compromete a sprint ou a qualidade.</p><div class="nx-risk-grid">${riscos}</div></div>
      <div class="nx-sec"><h2>Pendências com a MV</h2><p class="sub">Decisões e insumos que dependem do cliente.</p>${tabela(j.pendenciasMV||[],[['item','Item'],['desde','Desde','muted'],['prazo','Prazo','muted'],['status','Situação']])}</div>
      <div class="nx-sec nx-two"><div><h2>Pendências da Sottelli</h2><p class="sub">Compromissos do time.</p>${tabela(j.pendenciasSottelli||[],[['item','Item'],['desde','Desde','muted'],['prazo','Prazo','muted'],['status','Situação']])}</div>
      <div><h2>Entregue pela MV</h2><p class="sub">Insumos já recebidos (confirmados no e-mail).</p>${tabela(j.entreguesMV||[],[['item','Item'],['data','Data','muted']])}</div></div>
      <div class="nx-sec"><h2>Pontos de atenção</h2><div class="nx-att"><ul>${(j.atencao||[]).map(a=>`<li>${esc(a)}</li>`).join('')}</ul></div></div>`;
  }
  function install(){
    const w=frame.contentWindow;if(!w||!w.document||!w.document.querySelector('.nav'))return false;
    carregar().then(j=>{if(j)render(w,j)});
    if(!w.__nxPendObserver){
      w.__nxPendObserver=true;const main=w.document.querySelector('main');let t=null;
      if(main)new MutationObserver(()=>{clearTimeout(t);t=setTimeout(()=>{try{if(dados&&!w.document.getElementById('riscos'))render(w,dados)}catch(e){}},150)}).observe(main,{childList:true});
    }
    return true;
  }
  frame.addEventListener('load',()=>{let n=0;const t=setInterval(()=>{if(install()||++n>40)clearInterval(t)},250)});
  if(frame.contentDocument?.readyState==='complete')setTimeout(install,50);
})();
