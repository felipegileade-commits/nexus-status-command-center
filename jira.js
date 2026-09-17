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
  const CORES={prod:'#46dda8',uat:'#2a9cff',testado:'#8fd3ff',qa:'#f5c451',dev:'#ff8d2d',upstream:'#41637b',fase2:'#2b3d4d',cancelado:'#1d2a36'};
  const NOMES={prod:'Concluído',uat:'Homologação com o cliente',testado:'Testado pelo QA · aguardando UAT',qa:'Em teste QA',dev:'Em desenvolvimento',upstream:'Em definição (refino / aprovação)',fase2:'Fora do escopo (fase 2)',cancelado:'Cancelado'};
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
      .nx-homolog{margin-top:18px;padding-top:14px;border-top:1px solid var(--line,#18364f)}
      .nx-homolog-head{display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:10px}
      .nx-homolog-head .label{margin:0;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--teal);font-weight:900}
      .nx-homolog-src{font-size:10px;color:var(--muted)}
      .nx-homolog-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:8px}
      .nx-homolog-grid div{text-align:center;padding:8px 4px;border-radius:8px;background:var(--panel2,rgba(255,255,255,.03))}
      .nx-homolog-grid b{display:block;font-size:20px;font-weight:800;color:var(--text)}
      .nx-homolog-grid b.ok{color:var(--green)}.nx-homolog-grid b.warn{color:var(--orange)}
      .nx-homolog-grid span{display:block;font-size:9.5px;color:var(--muted);margin-top:3px;line-height:1.3}
      .nx-homolog-nota{margin:10px 0 0;font-size:11px;color:var(--muted)}
      @media(max-width:900px){.nx-homolog-grid{grid-template-columns:repeat(4,1fr)}}
      .metric-block .nx-desvio-nota{display:block;margin-top:5px;color:#8faec5;font-size:10px;line-height:1.35;font-weight:500}
      .pr-kpi .nx-desvio-nota{display:block;margin-top:1.5mm;font-size:6.5px;color:#677987;line-height:1.3}
      .timeline-panel .panel-actions button[onclick*="scrollTl"]{display:none!important}
            .nx-jira-bar{display:flex;height:22px;border-radius:999px;overflow:hidden;background:#0b1a28;border:1px solid #1f3d55}
      .nx-jira-bar span{display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:#06131d;min-width:0;overflow:hidden;white-space:nowrap}
      .nx-jira-bar span.dev,.nx-jira-bar span.cancelado{color:#d7e3eb}
      .nx-jira-nums{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:7px;font-size:10px;color:#c1d2dd}
      .nx-jira-nums i{display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:5px;vertical-align:-1px}
      .nx-jira-nums b{color:#fff;margin-right:2px}
      .nx-jira-fora{margin-top:5px;font-size:10px;color:#7f9bb0}.nx-jira-fora b{color:#a9c0d0}
      @media(max-width:760px){.nx-jira-row{grid-template-columns:1fr}}
      @media print{.nx-jira{break-inside:avoid;background:#fff;color:#111;border-color:#bbb}.nx-jira-head p,.nx-jira-stamp,.nx-jira-front span,.nx-jira-nums{color:#444}.nx-jira-front b,.nx-jira-nums b{color:#111}}
    `;d.head.appendChild(s);
  }

  function linha(f){
    // A barra mostra só o escopo ativo; fase 2 e cancelados ficam como nota.
    const partes=['prod','uat','testado','qa','dev','upstream'].map(id=>[id,Number(f[id])||0]).filter(([,n])=>n>0);
    const total=partes.reduce((a,[,n])=>a+n,0)||1;
    const nomes=NOMES;
    const fora=[['fase2',Number(f.fase2)||0],['cancelado',Number(f.cancelado)||0]].filter(([,n])=>n>0);
    const bar=partes.map(([id,n])=>`<span class="${id}" style="width:${(n/total*100).toFixed(2)}%;background:${CORES[id]}" title="${esc(nomes[id])}: ${n}">${n/total>0.07?n:''}</span>`).join('');
    const nums=partes.map(([id,n])=>`<div><i style="background:${CORES[id]}"></i><b>${n}</b>${esc(nomes[id])}</div>`).join('');
    const foraTxt=fora.length?`<div class="nx-jira-fora">Fora da barra: ${fora.map(([id,n])=>`<b>${n}</b> ${esc(nomes[id]).toLowerCase()}`).join(' · ')}</div>`:'';
    const sprint=f.sprint&&f.sprint.nome?`${esc(f.sprint.nome)}${f.sprint.inicio?` · ${dm(f.sprint.inicio)} a ${dm(f.sprint.fim)}`:''}`:'';
    return `<div class="nx-jira-row"><div class="nx-jira-front"><b>${esc(f.nome)}</b><span>${f.ativos||f.total} itens ativos${sprint?` · ${sprint}`:''}</span><span class="pct">${String(f.pctEntregue??f.pctHomologado??0).replace('.',',')}%<small>US entregues · concluídas ou em homologação com o cliente</small></span></div><div><div class="nx-jira-bar">${bar}</div><div class="nx-jira-nums">${nums}</div>${foraTxt}</div></div>`;
  }

  function painel(w,j){
    const d=w.document,kpis=d.querySelector('#overview .kpis');if(!kpis||!j||!j.frentes)return;
    styles(d);
    let el=d.querySelector('#overview .nx-jira');
    if(!el){el=d.createElement('div');el.className='nx-jira nx-live';kpis.insertAdjacentElement('afterend',el)}
    const frentes=['revenue','central'].map(k=>j.frentes[k]).filter(Boolean);
    el.innerHTML=`<div class="nx-jira-head"><div><div class="label">Onde estão as entregas</div><h3>US entregues × US desenvolvidas</h3><p>Os percentuais acima medem <b>US desenvolvidas</b> (esforço planejado já implementado, pela planilha de sprints). Aqui é o que já foi <b>entregue</b>: a posição de cada item no Jira — concluído, em homologação com o cliente, em testes ou ainda em desenvolvimento/fila.</p></div><div class="nx-jira-stamp">Lido do Jira em<br><b>${esc(dhm(j.lidoEm))}</b></div></div>${frentes.map(linha).join('')}`;
  }

  // 'Atualizado em' e 'Semana' seguem a leitura do Jira (semana ISO).
  function cabecalho(w,j){
    if(!j||!j.lidoEm)return;const dt=new Date(j.lidoEm);if(isNaN(dt))return;
    const data=`${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`;
    const t=new Date(Date.UTC(dt.getFullYear(),dt.getMonth(),dt.getDate()));t.setUTCDate(t.getUTCDate()+4-(t.getUTCDay()||7));
    const semana=String(Math.ceil(((t-Date.UTC(t.getUTCFullYear(),0,1))/86400000+1)/7));
    const meta=w.document.querySelectorAll('.topbar .meta small');
    if(meta[0]&&meta[0].textContent!==data)meta[0].textContent=data;
    if(meta[1]&&meta[1].textContent!==semana)meta[1].textContent=semana;
    w.document.querySelectorAll('.footer span').forEach(x=>{const s=x.textContent.replace(/Semana\s+\d+/,'Semana '+semana).replace(/\d{2}\/\d{2}\/\d{4}/,data);if(s!==x.textContent)x.textContent=s});
  }

  // Bloco "Homologação em números" na frente Central, lido de /data/homologacao.json (planilha da MV).
  let homolog=null,carregandoH=null;
  function carregarHomolog(){
    if(homolog)return Promise.resolve(homolog);if(carregandoH)return carregandoH;
    carregandoH=fetch('/data/homologacao.json'+(VERSION?'?v='+VERSION:''),{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null).then(h=>{homolog=h;return h});
    return carregandoH;
  }
  function blocoHomolog(w,h){
    const c=h&&h.central;if(!c)return;const d=w.document,sec=d.getElementById('central');if(!sec)return;
    const fs=sec.querySelector('.front-summary');if(!fs||fs.querySelector('.nx-homolog'))return;
    const el=d.createElement('div');el.className='nx-homolog nx-live';
    const naoBug=c.melhorias+c.ajustes;
    el.innerHTML=`<div class="nx-homolog-head"><span class="label">Homologação em números</span><span class="nx-homolog-src">${esc(h.fonte)} · ${esc(dm(h.lidoEm))}</span></div>
      <div class="nx-homolog-grid">
        <div><b>${c.usTestaveis}</b><span>US testáveis</span></div>
        <div><b class="ok">${c.aprovadas}</b><span>aprovadas</span></div>
        <div><b class="warn">${c.reprovadas}</b><span>reprovadas · ${c.reprovadasSemBug} sem bug</span></div>
        <div><b>${c.naoIniciadas}</b><span>não iniciadas</span></div>
        <div><b>${c.apontamentos}</b><span>apontamentos</span></div>
        <div><b>${c.bugs}</b><span>bugs (${Math.round(c.bugs/c.apontamentos*100)}%)</span></div>
        <div><b>${naoBug}</b><span>melhorias e ajustes (${Math.round(naoBug/c.apontamentos*100)}%)</span></div>
      </div><p class="nx-homolog-nota">${esc(c.nota||'')}</p>`;
    fs.appendChild(el);
  }

  function legendasAvanco(w){
    const cards=w.document.querySelectorAll('#overview .kpis .card');if(cards.length<3)return;
    const p1=cards[0].querySelector('p');if(p1)p1.textContent='US desenvolvidas · média das duas frentes';
    [cards[1],cards[2]].forEach(c=>{if(c.querySelector('.nx-kpi-note'))return;const p=w.document.createElement('p');p.className='nx-kpi-note nx-live';p.textContent='US desenvolvidas (esforço planejado já implementado)';c.appendChild(p)});
  }

  // Métricas das frentes (UAT / homologado / desvio) vindas do Jira — decisão do Felipe em 16/09.
  // UAT = concluído + em homologação; homologado = concluído; desvio = data/desvio.json.
  function metricasFrentes(w,j){
    if(!j||!j.frentes)return;
    const fmtPct=n=>(n==null||isNaN(n))?null:String(Number(n).toFixed(2)).replace('.',',')+'%';
    const fmtDesvio=n=>(n==null||isNaN(n))?null:(n>0?'+':'')+String(Number(n).toFixed(2)).replace('.',',')+'%';
    [['central','central'],['revenue','revenue']].forEach(([sec,k])=>{
      const f=j.frentes[k],root=w.document.getElementById(sec);if(!f||!root)return;
      const m=root.querySelectorAll('.metrics-row .metric-block strong');if(m.length<3)return;
      const vals=[fmtPct(f.pctUat),fmtPct(f.pctHomologado),fmtDesvio(f.desvio)];
      vals.forEach((v,i)=>{if(v==null||m[i].dataset.nxAuto===v)return;m[i].textContent=v;m[i].dataset.nxAuto=v;m[i].title='Lido do Jira em '+dhm(j.lidoEm)});
      if(vals[2]!=null)m[2].style.color=f.desvio<0?'var(--red)':'var(--green)';
      // subtítulo do desvio (de onde vem o atraso); nx-live para não ir ao estado salvo
      const bloco=m[2].parentElement;let nota=bloco.querySelector('.nx-desvio-nota');
      if(f.desvioNota){if(!nota){nota=w.document.createElement('small');nota.className='nx-desvio-nota nx-live';bloco.appendChild(nota)}if(nota.textContent!==f.desvioNota)nota.textContent=f.desvioNota}else if(nota)nota.remove();
      const pr=w.document.querySelector(sec==='central'?'#prCentral':'#prRevenue');const kp=pr&&pr.querySelectorAll('.pr-kpi')[3];
      if(kp&&f.desvioNota){let pn=kp.querySelector('.nx-desvio-nota');if(!pn){pn=w.document.createElement('small');pn.className='nx-desvio-nota nx-live';kp.appendChild(pn)}pn.textContent=f.desvioNota}
    });
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
    carregar(w).then(j=>{if(j){painel(w,j);metricasFrentes(w,j);cabecalho(w,j)}
      carregarHomolog().then(h=>{if(h)blocoHomolog(w,h)});});
    legendasAvanco(w);
    proximoMarco(w);
    if(!w.__nxJiraObserver){
      w.__nxJiraObserver=true;
      const main=w.document.querySelector('main');
      let timer=null;
      if(main)new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(()=>{try{if(!w.document.querySelector('#overview .nx-jira')&&dados)painel(w,dados);if(dados){metricasFrentes(w,dados);cabecalho(w,dados)}if(homolog)blocoHomolog(w,homolog);legendasAvanco(w);proximoMarco(w)}catch(e){}},120)}).observe(main,{childList:true,subtree:true});
      frame.addEventListener('nexus-timeline',()=>{try{proximoMarco(w)}catch(e){}});
    }
    return true;
  }

  frame.addEventListener('load',()=>{let n=0;const t=setInterval(()=>{if(install()||++n>40)clearInterval(t)},250)});
  if(frame.contentDocument?.readyState==='complete')setTimeout(install,50);
})();
