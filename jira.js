// Painel "Onde estão as entregas": posição dos itens de cada frente na esteira
// (concluído → homologação → testes QA → desenvolvimento), lida de
// /data/jira.json (gerado por scripts/sync-jira.mjs ou scripts/retrato.mjs).
// Também calcula o cartão "Próximo marco" pela data de hoje, a partir dos marcos
// do cronograma que o timeline.js expõe em frame.__nexusTimelineItems.
//
// Tudo aqui é renderização em tempo de carga: os nós criados levam a classe
// nx-live e o shell.js os descarta antes de gravar o estado no Supabase.
(()=>{
  const frame=document.getElementById('app');
  if(!frame)return;

  const VERSION=(document.currentScript&&/[?&]v=([^&]+)/.exec(document.currentScript.src)||[])[1]||'';
  const CORES={prod:'#46dda8',uat:'#2a9cff',qa:'#f5c451',dev:'#41637b',cancelado:'#2b3d4d'};
  const MESES=['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
  const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dm=iso=>{const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso||''));if(m)return `${m[3]}/${m[2]}`;const d=new Date(iso);return isNaN(d)?'':`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`};
  const dhm=iso=>{const d=new Date(iso);return isNaN(d)?'':`${dm(iso)} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`};

  let dados=null,carregando=null;
  function carregar(w){
    if(dados)return Promise.resolve(dados);
    if(carregando)return carregando;
    carregando=fetch('/data/jira.json'+(VERSION?'?v='+VERSION:''),{cache:'no-store'})
      .then(r=>{if(!r.ok)throw new Error('data/jira.json '+r.status);return r.json()})
      .catch(err=>{console.warn('[Nexus Jira]',err.message);const j=w&&w.__nexusJira;return j&&j.frentes?j:null})
      .then(j=>{dados=j;return j});
    return carregando;
  }

  function styles(d){
    if(d.getElementById('nx-jira-style'))return;
    const s=d.createElement('style');s.id='nx-jira-style';s.textContent=`
      .nx-jira{margin:14px 0 0;border:1px solid #1f3d55;border-radius:14px;background:linear-gradient(180deg,#0c2438,#081c2d);padding:16px 18px 14px;color:#f5f8fb}
      .nx-jira-head{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap;margin-bottom:12px}
      .nx-jira-head .label{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#2fd4bf;font-weight:900}
      .nx-jira-head h3{margin:3px 0 0;font-size:15px;font-weight:800}
      .nx-jira-head p{margin:4px 0 0;color:#8faec5;font-size:11px;max-width:640px}
      .nx-jira-stamp{color:#8da8bd;font-size:10px;text-align:right;white-space:nowrap}
      .nx-jira-row{display:grid;grid-template-columns:200px 1fr;gap:14px;align-items:center;padding:10px 0;border-top:1px solid #17344d}
      .nx-jira-row:first-of-type{border-top:0}
      .nx-jira-front b{display:block;font-size:13px}
      .nx-jira-front span{display:block;color:#8faec5;font-size:10px;margin-top:2px}
      .nx-jira-front .pct{display:block;margin-top:6px;font-size:18px;font-weight:900;color:#46dda8;line-height:1}
      .nx-jira-front .pct small{display:block;font-size:9px;color:#8faec5;font-weight:600;margin-top:3px}
      .nx-kpi-note{margin:6px 0 0;color:#8faec5;font-size:10px}
            .nx-jira-bar{display:flex;height:22px;border-radius:999px;overflow:hidden;background:#0b1a28;border:1px solid #1f3d55}
      .nx-jira-bar span{display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:#06131d;min-width:0;overflow:hidden;white-space:nowrap}
      .nx-jira-bar span.dev,.nx-jira-bar span.cancelado{color:#d7e3eb}
      .nx-jira-nums{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:7px;font-size:10px;color:#c1d2dd}
      .nx-jira-nums i{display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:5px;vertical-align:-1px}
      .nx-jira-nums b{color:#fff;margin-right:2px}
      .nx-jira-nums .muted{color:#8da8bd}
      @media(max-width:760px){.nx-jira-row{grid-template-columns:1fr}}
      @media print{.nx-jira{break-inside:avoid;background:#fff;color:#111;border-color:#bbb}.nx-jira-head p,.nx-jira-stamp,.nx-jira-front span,.nx-jira-nums{color:#444}.nx-jira-front b,.nx-jira-nums b{color:#111}}
    `;d.head.appendChild(s);
  }

  function linha(f){
    const partes=['prod','uat','qa','dev','cancelado'].map(id=>[id,Number(f[id])||0]).filter(([,n])=>n>0);
    const total=partes.reduce((a,[,n])=>a+n,0)||1;
    const nomes={prod:'Concluído',uat:'Homologação com o cliente',qa:'Testes QA',dev:'Desenvolvimento / fila',cancelado:'Cancelado'};
    const bar=partes.map(([id,n])=>`<span class="${id}" style="width:${(n/total*100).toFixed(2)}%;background:${CORES[id]}" title="${esc(nomes[id])}: ${n}">${n/total>0.07?n:''}</span>`).join('');
    const nums=partes.map(([id,n])=>`<div><i style="background:${CORES[id]}"></i><b>${n}</b>${esc(nomes[id])}${id==='dev'&&f.bloqueado?` <span class="muted">(${f.bloqueado} bloqueado${f.bloqueado>1?'s':''})</span>`:''}</div>`).join('');
    const sprint=f.sprint&&f.sprint.nome?`${esc(f.sprint.nome)}${f.sprint.inicio?` · ${dm(f.sprint.inicio)} a ${dm(f.sprint.fim)}`:''}`:'';
    return `<div class="nx-jira-row"><div class="nx-jira-front"><b>${esc(f.nome)}</b><span>${f.ativos||f.total} itens ativos${sprint?` · ${sprint}`:''}</span><span class="pct">${String(f.pctHomologado??0).replace('.',',')}%<small>US entregues · concluídas ou em homologação com o cliente</small></span></div><div><div class="nx-jira-bar">${bar}</div><div class="nx-jira-nums">${nums}</div></div></div>`;
  }

  function painel(w,j){
    const d=w.document,kpis=d.querySelector('#overview .kpis');if(!kpis||!j||!j.frentes)return;
    styles(d);
    let el=d.querySelector('#overview .nx-jira');
    if(!el){el=d.createElement('div');el.className='nx-jira nx-live';kpis.insertAdjacentElement('afterend',el)}
    const frentes=['revenue','central'].map(k=>j.frentes[k]).filter(Boolean);
    el.innerHTML=`<div class="nx-jira-head"><div><div class="label">Onde estão as entregas</div><h3>US entregues × US desenvolvidas</h3><p>Os percentuais acima medem <b>US desenvolvidas</b> (esforço planejado já implementado, pela planilha de sprints). Aqui é o que já foi <b>entregue</b>: a posição de cada item no Jira — concluído, em homologação com o cliente, em testes ou ainda em desenvolvimento/fila.</p></div><div class="nx-jira-stamp">Lido do Jira em<br><b>${esc(dhm(j.lidoEm))}</b></div></div>${frentes.map(linha).join('')}`;
  }

  function legendasAvanco(w){
    const cards=w.document.querySelectorAll('#overview .kpis .card');if(cards.length<3)return;
    const p1=cards[0].querySelector('p');if(p1)p1.textContent='US desenvolvidas · média das duas frentes';
    [cards[1],cards[2]].forEach(c=>{if(c.querySelector('.nx-kpi-note'))return;const p=w.document.createElement('p');p.className='nx-kpi-note nx-live';p.textContent='US desenvolvidas (esforço planejado já implementado)';c.appendChild(p)});
  }

  function proximoMarco(w){
    const xs=frame.__nexusTimelineItems;if(!Array.isArray(xs)||!xs.length)return;
    const d=w.document,card=d.querySelector('#overview .kpis .card:nth-child(4)');if(!card)return;
    const hoje=new Date();hoje.setHours(0,0,0,0);
    const futuros=xs.filter(x=>x.start&&x.start>=hoje).sort((a,b)=>a.start-b.start);
    const emCurso=xs.filter(x=>x.start&&x.end&&x.start<hoje&&x.end>=hoje).sort((a,b)=>a.end-b.end);
    const item=futuros[0]||emCurso[0];if(!item)return;
    const big=card.querySelector('.big'),b=card.querySelector('b'),p=card.querySelector('p');
    const dt=item.start;
    if(big)big.textContent=`${String(dt.getDate()).padStart(2,'0')} ${MESES[dt.getMonth()]}`;
    if(b)b.textContent=item.title||item.value||'Marco';
    if(p){const owner=item.kind==='mv'?'MV':item.kind==='final'?'Projeto Nexus':'Sottelli';const dias=Math.round((dt-hoje)/86400000);p.textContent=`${item.label||owner}${dias>0?` · em ${dias} dia${dias>1?'s':''}`:dias===0?' · hoje':' · em andamento'}`}
    card.dataset.nxAuto='1';
  }

  function install(){
    const w=frame.contentWindow;if(!w||!w.document||!w.document.querySelector('#overview .kpis'))return false;
    carregar(w).then(j=>{if(j)painel(w,j)});
    legendasAvanco(w);
    proximoMarco(w);
    if(!w.__nxJiraObserver){
      w.__nxJiraObserver=true;
      const main=w.document.querySelector('main');
      let timer=null;
      if(main)new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(()=>{try{if(!w.document.querySelector('#overview .nx-jira')&&dados)painel(w,dados);legendasAvanco(w);proximoMarco(w)}catch(e){}},120)}).observe(main,{childList:true,subtree:true});
      frame.addEventListener('nexus-timeline',()=>{try{proximoMarco(w)}catch(e){}});
    }
    return true;
  }

  frame.addEventListener('load',()=>{let n=0;const t=setInterval(()=>{if(install()||++n>40)clearInterval(t)},250)});
  if(frame.contentDocument?.readyState==='complete')setTimeout(install,50);
})();
