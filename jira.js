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
      .front-head .nx-tog{margin-left:auto;margin-right:12px;align-self:center;font-size:11px;padding:7px 16px}
      .nx-tog{margin-left:10px;font:inherit;font-size:9.5px;font-weight:800;letter-spacing:.04em;cursor:pointer;white-space:nowrap;
        padding:3px 10px;border-radius:999px;border:1px solid var(--teal);background:transparent;color:var(--teal)}
      .nx-tog:hover{background:rgba(47,212,191,.12)}
      .nx-tog.on{color:var(--teal);border-color:var(--teal);background:rgba(47,212,191,.08)}
      @media print{.nx-tog{display:none}}
      .nx-homolog-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:8px}
      .nx-homolog-grid div{text-align:center;padding:8px 4px;border-radius:8px;background:var(--panel2,rgba(255,255,255,.03))}
      .nx-homolog-grid b{display:block;font-size:20px;font-weight:800;color:var(--text)}
      .nx-homolog-grid b.ok{color:var(--green)}.nx-homolog-grid b.warn{color:var(--orange)}
      .nx-homolog-grid span{display:block;font-size:9.5px;color:var(--muted);margin-top:3px;line-height:1.3}
      .nx-homolog-grid .nx-homolog-sep{background:none;padding:0;border-left:1px solid var(--line,#18364f);margin:4px auto;width:1px}
      .nx-homolog-grupo{margin-top:12px}
      .nx-homolog-grupo>.t{display:block;font-size:9.5px;letter-spacing:.09em;text-transform:uppercase;color:var(--muted);font-weight:800;margin-bottom:6px}
      .nx-homolog-grupo.destaque>.t{color:var(--teal)}
      .nx-homolog-grupo.destaque .nx-homolog-grid div{box-shadow:inset 0 0 0 1px var(--line,#18364f)}
      .nx-homolog-nota{margin:10px 0 0;font-size:11px;color:var(--muted)}
      @media(max-width:900px){.nx-homolog-grid{grid-template-columns:repeat(4,1fr)!important}}
      /* Onde o trabalho esta parado: volume por esteira e de quem depende cada etapa. */
      .nx-est{margin-top:18px;padding-top:14px;border-top:1px solid var(--line,#18364f)}
      .nx-est-linhas{display:grid;gap:8px}
      .nx-est-l{display:grid;grid-template-columns:76px 62px 1fr 190px;gap:14px;align-items:center;
        padding:10px 14px;border-radius:8px;background:var(--panel2,rgba(255,255,255,.03));border-left:3px solid var(--line,#18364f)}
      .nx-est-l.sottelli{border-left-color:var(--teal)}
      .nx-est-l.mv{border-left-color:var(--orange)}
      .nx-est-l.compartilhada{border-left-color:#8a7bd8}
      .nx-est-l.grupo{border-left-color:#45b36b;background:rgba(69,179,107,.07)}
      .nx-est-n{font-size:26px;font-weight:900;color:var(--text);line-height:1;text-align:center}
      .nx-est-n small{display:block;font-size:9px;font-weight:600;color:var(--muted);margin-top:4px;letter-spacing:.06em;text-transform:uppercase}
      .nx-est-p{text-align:center;border-left:1px solid var(--line,#18364f);padding-left:14px}
      .nx-est-p>span{display:block;font-size:17px;font-weight:800;color:var(--muted);line-height:1}
      .nx-est-p small{display:block;font-size:8.5px;font-weight:600;color:var(--muted);margin-top:5px;letter-spacing:.06em;text-transform:uppercase}
      .nx-est-txt b{display:block;font-size:13px;color:var(--text);font-weight:700}
      .nx-est-txt span{display:block;font-size:10.5px;color:var(--muted);margin-top:2px}
      .nx-est-dono{text-align:right}
      .nx-est-dono b{display:inline-block;font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;
        padding:3px 10px;border-radius:999px;border:1px solid var(--line,#18364f);color:var(--muted)}
      .nx-est-l.sottelli .nx-est-dono b{color:var(--teal);border-color:var(--teal)}
      .nx-est-l.mv .nx-est-dono b{color:var(--orange);border-color:var(--orange)}
      .nx-est-l.compartilhada .nx-est-dono b{color:#8a7bd8;border-color:#8a7bd8}
      .nx-est-l.grupo .nx-est-dono b{color:#45b36b;border-color:#45b36b;white-space:nowrap}
      .nx-est-dono span{display:block;font-size:10px;color:var(--muted);margin-top:4px}
      .nx-est-fluxo{margin-top:14px;padding:12px 14px;border-radius:8px;background:var(--panel2,rgba(255,255,255,.03))}
      .nx-est-fluxo .label{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--teal);font-weight:900}
      .nx-est-passos{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px}
      .nx-est-passo{display:flex;align-items:center;gap:7px;font-size:10.5px;color:var(--text);
        padding:5px 10px;border-radius:999px;border:1px solid var(--line,#18364f)}
      .nx-est-passo i{font-style:normal;font-size:8.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;padding:1px 6px;border-radius:999px}
      .nx-est-passo.mv i{color:var(--orange);border:1px solid var(--orange)}
      .nx-est-passo.sottelli i{color:var(--teal);border:1px solid var(--teal)}
      @media(max-width:900px){.nx-est-l{grid-template-columns:60px 56px 1fr}.nx-est-dono{grid-column:1/-1;text-align:left}}
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
      .nx-jira-aprov{margin-top:5px;font-size:10px;color:#9fc7bd}.nx-jira-aprov b{color:#2fd4bf}
      @media(max-width:760px){.nx-jira-row{grid-template-columns:1fr}}
      @media print{.nx-jira{break-inside:avoid;background:#fff;color:#111;border-color:#bbb}.nx-jira-head p,.nx-jira-stamp,.nx-jira-front span,.nx-jira-nums,.nx-jira-aprov{color:#444}.nx-jira-front b,.nx-jira-nums b{color:#111}}
    `;d.head.appendChild(s);
  }

  // Lista das US aprovadas na homologação (/data/us-aprovadas.json, a mesma da aba
  // "US Aprovadas"): entra como nota em cada frente para a contagem bater entre as abas.
  let aprov=null,carregandoA=null;
  function carregarAprovadas(){
    if(aprov)return Promise.resolve(aprov);if(carregandoA)return carregandoA;
    carregandoA=fetch('/data/us-aprovadas.json'+(VERSION?'?v='+VERSION:''),{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null).then(a=>{aprov=a;return a});
    return carregandoA;
  }
  function notaAprovadas(f){
    const chave=Object.keys((aprov&&aprov.frentes)||{}).find(k=>aprov.frentes[k].projeto===f.projeto);
    if(!chave)return '';
    const fr=aprov.frentes[chave],n=(fr.aprovadas||[]).length,escopo=fr.escopo||f.ativos||f.total;
    if(!n||!escopo)return '';
    // Regra da Andressa (28/09): porcentagem sem casa decimal em todo o painel.
    const pct=String(Math.round(n/escopo*100));
    // Quando há mais aprovadas do que itens em "Concluído", a diferença são as aprovadas
    // com ressalvas — seguem em homologação até os ajustes, mas já contam no indicador.
    const dif=n-(Number(f.prod)||0);
    const obs=dif>0?` · inclui <b>${dif}</b> aprovadas com ressalvas, ainda em homologação`:'';
    return `<div class="nx-jira-aprov">Aprovadas na homologação: <b>${n}</b> (${pct}%)${obs} · detalhe na aba <b>US Aprovadas</b></div>`;
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
    return `<div class="nx-jira-row"><div class="nx-jira-front"><b>${esc(f.nome)}</b><span>${f.ativos||f.total} itens ativos${sprint?` · ${sprint}`:''}</span><span class="pct">${Math.round(f.pctEntregue??f.pctHomologado??0)}%<small>US entregues · concluídas ou em homologação com o cliente</small></span></div><div><div class="nx-jira-bar">${bar}</div><div class="nx-jira-nums">${nums}</div>${foraTxt}${notaAprovadas(f)}</div></div>`;
  }

  function painel(w,j){
    const d=w.document,kpis=d.querySelector('#overview .kpis');if(!kpis||!j||!j.frentes)return;
    styles(d);
    let el=d.querySelector('#overview .nx-jira');
    if(!el){el=d.createElement('div');el.className='nx-jira nx-live';kpis.insertAdjacentElement('afterend',el)}
    const frentes=['revenue','central'].map(k=>j.frentes[k]).filter(Boolean);
    el.innerHTML=`<div class="nx-jira-head"><div><div class="label">Onde estão as entregas</div><h3>US entregues × US desenvolvidas</h3><p>Os percentuais acima medem <b>US desenvolvidas</b> (esforço planejado já implementado, pela planilha de sprints). Aqui é o que já foi <b>entregue</b>: a posição de cada item no Jira — concluído, em homologação com o cliente, em testes ou ainda em desenvolvimento/fila.</p></div><div class="nx-jira-stamp">Lido do Jira em<br><b>${esc(dhm(j.lidoEm))}</b></div></div>${frentes.map(linha).join('')}`;
  }

  // 'Atualizado em' e 'Semana': DESLIGADO em 28/09 a pedido do Felipe.
  //
  // Esta funcao reescrevia a data, a semana e TODOS os rodapes a partir de lidoEm do
  // data/jira.json. Como o jira.json so muda quando alguem roda o retrato.mjs na mao, o
  // painel ficava carimbado com 21/09 / Semana 39 mesmo depois do time atualizar a data
  // pela propria pagina -- a edicao ia para o banco e sumia da tela no carregamento
  // seguinte. Mesma causa da legenda do desvio e das metricas das frentes.
  //
  // A data e a semana passam a ser o que esta gravado no painel (payload.date/week).
  function cabecalho(w,j){
    return;
    /* eslint-disable no-unreachable */
    if(!j||!j.lidoEm)return;const dt=new Date(j.lidoEm);if(isNaN(dt))return;
    const data=`${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`;
    const t=new Date(Date.UTC(dt.getFullYear(),dt.getMonth(),dt.getDate()));t.setUTCDate(t.getUTCDate()+4-(t.getUTCDay()||7));
    const semana=String(Math.ceil(((t-Date.UTC(t.getUTCFullYear(),0,1))/86400000+1)/7));
    const meta=w.document.querySelectorAll('.topbar .meta small');
    if(meta[0]&&meta[0].textContent!==data)meta[0].textContent=data;
    if(meta[1]&&meta[1].textContent!==semana)meta[1].textContent=semana;
    w.document.querySelectorAll('.footer span').forEach(x=>{const s=x.textContent.replace(/Semana\s+\d+/,'Semana '+semana).replace(/\d{2}\/\d{2}\/\d{4}/,data);if(s!==x.textContent)x.textContent=s});
    /* eslint-enable no-unreachable */
  }

  // Rodape de cada aba repetindo a data e a semana do topo. A fonte e o proprio painel
  // (o que o time digitou na barra de cima), nunca o jira.json -- foi por carimbar data
  // de fora que o cabecalho() acima precisou ser desligado.
  function rodapes(w){
    const meta=w.document.querySelectorAll('.topbar .meta small');
    const data=meta[0]&&meta[0].textContent.trim(),semana=meta[1]&&meta[1].textContent.trim();
    if(!/^\d{2}\/\d{2}\/\d{4}$/.test(data||''))return;
    w.document.querySelectorAll('.footer span').forEach(x=>{
      let t=x.textContent.replace(/\d{2}\/\d{2}\/\d{4}/,data);
      if(semana)t=t.replace(/Semana\s+\d+/,'Semana '+semana);
      if(t!==x.textContent)x.textContent=t;
    });
  }

  // Bloco "Homologação em números" na frente Central, lido de /data/homologacao.json (planilha da MV).
  let homolog=null,carregandoH=null;
  function carregarHomolog(){
    if(homolog)return Promise.resolve(homolog);if(carregandoH)return carregandoH;
    carregandoH=fetch('/data/homologacao.json'+(VERSION?'?v='+VERSION:''),{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null).then(h=>{homolog=h;return h});
    return carregandoH;
  }
  // Bloco "Homologação em números", uma vez por frente declarada em data/homologacao.json.
  // Cada frente tem a sua propria fonte e data, porque nao saem do mesmo lugar: a Central vem
  // da planilha da MV e Revenue vem do Jira com a lista revisada pela Transformacao Digital.
  // "Ocultar habilitadores": habilitador nao e US testavel, e na discussao com a MV a
  // conta precisa poder ser lida das duas formas. Em vez de refazer os blocos, cada
  // numero carrega os dois valores em data-com/data-sem e o botao so troca o texto.
  const HAB_KEY='nexus_sem_habilitadores';
  function semHab(w){try{return w.localStorage.getItem(HAB_KEY)==='1'}catch(e){return false}}
  function dual(com,sem){
    const s=(sem===undefined||sem===null)?String(com):String(sem);
    return 'data-com="'+esc(String(com))+'" data-sem="'+esc(s)+'"';
  }
  function aplicaHab(w){
    const on=semHab(w),d=w.document;
    d.querySelectorAll('[data-com][data-sem]').forEach(el=>{
      const v=el.getAttribute(on?'data-sem':'data-com');
      if(v!==null&&el.textContent!==v)el.textContent=v;
    });
    d.querySelectorAll('.nx-tog').forEach(b=>{
      b.textContent=on?'Mostrar habilitadores':'Ocultar habilitadores';
      b.setAttribute('aria-pressed',on?'true':'false');
      b.classList.toggle('on',on);
    });
  }
  // O botao fica no topo da pagina de cada frente, ao lado do selo de risco, e nao
  // dentro dos blocos: e um interruptor da aba inteira, nao de um quadro so.
  function botaoHab(w){
    ['central','revenue'].forEach(id=>{
      const sec=w.document.getElementById(id);if(!sec)return;
      const head=sec.querySelector('.front-head');if(!head||head.querySelector('.nx-tog'))return;
      const b=w.document.createElement('button');
      b.type='button';b.className='nx-tog nx-live';b.setAttribute('aria-pressed','false');
      b.textContent='Ocultar habilitadores';
      const pill=head.querySelector('.status-pill');
      if(pill)head.insertBefore(b,pill);else head.appendChild(b);
    });
  }
  function ligaHab(w){
    if(w.__nxHab)return;w.__nxHab=true;
    w.document.addEventListener('click',ev=>{
      const b=ev.target&&ev.target.closest&&ev.target.closest('.nx-tog');if(!b)return;
      ev.preventDefault();
      try{w.localStorage.setItem(HAB_KEY,semHab(w)?'0':'1')}catch(e){}
      aplicaHab(w);
    });
  }

  function blocoHomolog(w,h){
    if(!h||!h.frentes)return;const d=w.document;
    // Uma grade por grupo. O numero de colunas segue a quantidade de quadros, para a
    // frente que tem uma grade so (Revenue) continuar igual e as rodadas da Central
    // ficarem alinhadas coluna a coluna, que e o que permite comparar uma com a outra.
    const grade=qs=>{
      // {sep:true} marca a virada de uma conta para outra: por tipo de US de um lado,
      // por situacao do outro. Sem isso os numeros se leem como uma sequencia so.
      const cols=qs.map(q=>q.sep?'13px':'1fr').join(' ');
      const quadros=qs.map(q=>{
        if(q.sep)return '<div class="nx-homolog-sep" aria-hidden="true"></div>';
        const cor=q.cor==='ok'?' class="ok"':q.cor==='warn'?' class="warn"':'';
        return `<div><b${cor} ${dual(q.n,q.nSem)}>${esc(String(q.n))}</b><span>${esc(q.rotulo||'')}</span></div>`;
      }).join('');
      return `<div class="nx-homolog-grid" style="grid-template-columns:${cols}">${quadros}</div>`;
    };
    Object.keys(h.frentes).forEach(chave=>{
      const f=h.frentes[chave],sec=d.getElementById(chave);if(!f||!sec)return;
      const grupos=Array.isArray(f.grupos)&&f.grupos.length?f.grupos
                 :(Array.isArray(f.quadros)&&f.quadros.length?[{quadros:f.quadros}]:null);
      if(!grupos)return;
      const fs=sec.querySelector('.front-summary');if(!fs||fs.querySelector('.nx-homolog'))return;
      const corpo=grupos.map(g=>{
        const qs=Array.isArray(g.quadros)?g.quadros:[];
        if(!qs.length)return '';
        return g.titulo
          ? `<div class="nx-homolog-grupo${g.destaque?' destaque':''}"><span class="t">${esc(g.titulo)}</span>${grade(qs)}</div>`
          : grade(qs);
      }).join('');
      const el=d.createElement('div');el.className='nx-homolog nx-live';
      el.innerHTML=`<div class="nx-homolog-head"><span class="label">Homologação em números</span><span class="nx-homolog-src">${esc(f.fonte||'')} · ${esc(dm(f.lidoEm))}</span></div>
        ${corpo}<p class="nx-homolog-nota">${esc(f.nota||'')}</p>`;
      // Homologacao em numeros vem sempre antes de "Onde o trabalho esta": os dois sao
      // carregados em paralelo e, sem isso, a ordem na tela mudava a cada carga.
      const est=fs.querySelector('.nx-est');
      if(est)fs.insertBefore(el,est);else fs.appendChild(el);
      ligaHab(w);botaoHab(w);aplicaHab(w);
    });
  }

  function legendasAvanco(w){
    const cards=w.document.querySelectorAll('#overview .kpis .card');if(cards.length<3)return;
    const p1=cards[0].querySelector('p');if(p1)p1.textContent='US desenvolvidas · média das duas frentes';
    [cards[1],cards[2]].forEach(c=>{if(c.querySelector('.nx-kpi-note'))return;const p=w.document.createElement('p');p.className='nx-kpi-note nx-live';p.textContent='US desenvolvidas (esforço planejado já implementado)';c.appendChild(p)});
  }

  // Métricas das frentes (UAT / homologado / desvio): DESLIGADO em 28/09 a pedido do Felipe.
  //
  // Motivo: a porcentagem do projeto é ponderada pelo PESO DE CADA ÉPICO na planilha de
  // gestão do cronograma. O que este arquivo calculava era contagem de card
  // (retrato.mjs: pct = n / ativos), onde toda US vale 1 — um épico de peso 5% com uma US
  // pesava menos que um de peso 2% com dez US. É o inverso do que a planilha diz, então
  // qualquer número daqui diverge do número do time e sobrescrevia o que eles digitam.
  //
  // O painel passa a mostrar apenas o que o time escreve. Para religar, é preciso antes ler
  // o peso de cada épico da planilha do cronograma e ponderar por ele.
  function metricasFrentes(w,j){
    return;
    /* eslint-disable no-unreachable */
    if(!j||!j.frentes)return;
    // UAT e homologado sem casas decimais (acordo com a MV em 21/09: "30%", nao "30,1%").
    const fmtPct=n=>(n==null||isNaN(n))?null:String(Math.round(Number(n)))+'%';
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
    /* eslint-enable no-unreachable */
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

  // Risco e plano de acao por frente, de /data/riscos.json.
  // SO preenche o que esta VAZIO no painel: se o time escreveu qualquer coisa ali,
  // o texto deles fica e este arquivo e ignorado. Nao e pintura por cima.
  let riscos=null,carregandoR=null;
  function carregarRiscos(){
    if(riscos)return Promise.resolve(riscos);
    if(carregandoR)return carregandoR;
    carregandoR=fetch('/data/riscos.json?v='+Date.now(),{cache:'no-store'})
      .then(r=>r.ok?r.json():null).then(j=>(riscos=j)).catch(()=>null);
    return carregandoR;
  }
  function blocoRiscos(w,j){
    if(!j||!j.frentes)return;
    let mudou=false;
    Object.keys(j.frentes).forEach(chave=>{
      const f=j.frentes[chave],root=w.document.getElementById(chave);if(!f||!root)return;
      const pRisco=root.querySelector('.risk-col:not(.action) p'),
            pAcao=root.querySelector('.risk-col.action p');
      if(pRisco&&!pRisco.textContent.trim()&&f.risco){pRisco.textContent=f.risco;mudou=true}
      if(pAcao&&!pAcao.textContent.trim()&&f.acao){pAcao.textContent=f.acao;mudou=true}
      // Troca travada por conteudo: so reescreve o card se o texto atual for exatamente o
      // que este arquivo publicou da ultima vez. Se alguem editou, a troca nao acontece.
      (f.substitui||[]).forEach(t=>{
        const cards=Array.prototype.slice.call(root.querySelectorAll(".risk-card"));
        const alvo=cards.filter(x=>{const p=x.querySelector(".risk-col:not(.action) p");return p&&p.textContent.trim()===t.deRisco})[0];
        if(!alvo)return;
        alvo.querySelector(".risk-col:not(.action) p").textContent=t.risco;
        const pa=alvo.querySelector(".risk-col.action p");if(pa)pa.textContent=t.acao;
        mudou=true;
      });
      // Cards extras entram como nx-live: sao redesenhados a cada carga e removidos antes
      // de salvar, entao nunca duplicam nem entram no estado gravado no Supabase.
      const wrap=root.querySelector(".risk-wrap");
      const modelo=wrap&&wrap.querySelector(".risk-card:not(.nx-live)");
      if(wrap&&modelo)(f.extras||[]).forEach(x=>{
        if(!x.id||wrap.querySelector("[data-nx-risco=\""+x.id+"\"]"))return;
        const n=modelo.cloneNode(true);
        n.className=modelo.className+" nx-live";
        n.setAttribute("data-nx-risco",x.id);
        const pr=n.querySelector(".risk-col:not(.action) p");if(pr)pr.textContent=x.risco;
        const pa=n.querySelector(".risk-col.action p");if(pa)pa.textContent=x.acao;
        wrap.appendChild(n);mudou=true;
      });
    });
    // A secao de riscos e o selo "1 risco"/"Sem riscos" sao derivados desse texto,
    // entao precisam ser recalculados depois de preencher.
    if(mudou){try{w.syncOverviewFromFronts&&w.syncOverviewFromFronts()}catch(e){}
              try{w.syncPrintReport&&w.syncPrintReport()}catch(e){}}
  }

  // "Onde o trabalho esta parado": volume represado por esteira, com o dono de cada etapa.
  // Serve para separar o que a Sottelli resolve sozinha do que nao resolve -- a leitura
  // que o status precisava para a discussao de responsabilidade com a MV.
  let esteiras=null,carregandoE=null;
  function carregarEsteiras(){
    if(esteiras)return Promise.resolve(esteiras);
    if(carregandoE)return carregandoE;
    carregandoE=fetch('/data/esteiras.json?v='+Date.now(),{cache:'no-store'})
      .then(r=>r.ok?r.json():null).then(j=>(esteiras=j)).catch(()=>null);
    return carregandoE;
  }
  function blocoEsteiras(w,h){
    if(!h||!h.frentes)return;const d=w.document;
    Object.keys(h.frentes).forEach(chave=>{
      const f=h.frentes[chave],sec=d.getElementById(chave);
      if(!f||!sec||!Array.isArray(f.esteiras)||!f.esteiras.length)return;
      const fs=sec.querySelector('.front-summary');if(!fs||fs.querySelector('.nx-est'))return;
      // Uma esteira sem represamento entra com traco no lugar do numero e nao soma.
      // Linha marcada como concluida e trabalho entregue: aparece no quadro, mas nao soma represamento.
      const abertas=f.esteiras.filter(e=>!e.concluido);
      // sh=1 desconta os habilitadores declarados na linha: e o que o botao mostra.
      const soma=(d2,sh)=>abertas.filter(e=>!d2||e.dono===d2).reduce((s,e)=>s+Math.max(0,(Number(e.n)||0)-(sh?(Number(e.hab)||0):0)),0);
      const chamada=sh=>soma(null,sh)+' US em andamento — '+soma('compartilhada',sh)+' em etapa compartilhada, '+soma('mv',sh)+' dependem apenas da MV e '+soma('sottelli',sh)+' estão com a Sottelli.';
      // Percentual de cada linha sobre o total do quadro, a linha concluida inclusive.
      // Sem casa decimal, regra da Andressa: de 0,5 para cima sobe.
      const base=sh=>f.esteiras.reduce((t,e)=>t+Math.max(0,(Number(e.n)||0)-(sh?(Number(e.hab)||0):0)),0);
      const pct=(e,sh)=>{const b=base(sh);const v=Math.max(0,(Number(e.n)||0)-(sh?(Number(e.hab)||0):0));
        return (!b||!Number.isFinite(Number(e.n)))?'—':Math.round(v/b*100+1e-9)+'%'};
      const linhas=f.esteiras.map(e=>`<div class="nx-est-l ${esc(e.dono||'')}">
        <div class="nx-est-n"><span ${dual(e.n,Number(e.hab)?(Number(e.n)||0)-Number(e.hab):undefined)}>${esc(String(e.n))}</span><small>US</small></div>
        <div class="nx-est-p"><span ${dual(pct(e,0),pct(e,1))}>${esc(pct(e,0))}</span><small>do total</small></div>
        <div class="nx-est-txt"><b>${esc(e.nome||'')}</b><span ${dual((e.detalhe||'')+(e.concluido?'':' · aguarda '+(e.espera||'')),(e.detalheSem||e.detalhe||'')+(e.concluido?'':' · aguarda '+(e.espera||'')))}>${esc(e.detalhe||'')}${e.concluido?'':' · aguarda '+esc(e.espera||'')}</span></div>
        <div class="nx-est-dono"><b>${esc(e.donoTexto||'')}</b>${e.concluido?'':'<span>responsabilidade</span>'}</div>
      </div>`).join('');
      const passos=(f.etapas||[]).map((p,i)=>`<span class="nx-est-passo ${esc(p.quem||'')}"><i>${esc(p.quem==='mv'?'MV':'Sottelli')}</i>${i+1}. ${esc(p.texto||'')}</span>`).join('');
      const el=d.createElement('div');el.className='nx-est nx-live';
      el.innerHTML=`<div class="nx-homolog-head"><span class="label">Onde o trabalho está</span><span class="nx-homolog-src">${esc(f.fonte||'')} · ${esc(dm(f.lidoEm))}</span></div>
        <div class="nx-est-linhas">${linhas}</div>
        ${passos?`<div class="nx-est-fluxo"><span class="label">As cinco etapas do refinamento</span><div class="nx-est-passos">${passos}</div></div>`:''}
        <p class="nx-homolog-nota"><b ${dual(chamada(0),chamada(1))}>${esc(chamada(0))}</b> ${esc(f.nota||'')}</p>`;
      fs.appendChild(el);ligaHab(w);botaoHab(w);aplicaHab(w);
    });
  }

  // Riscos e proximos passos sobem para logo abaixo do resumo da frente, onde ficam os quadros
  // de homologacao e de esteiras: o risco fala dos numeros que acabaram de aparecer na tela.
  // O <main> vem do Supabase, entao a ordem e ajustada aqui e nao no HTML do repositorio.
  function reordena(w){
    const d=w.document;
    ["central","revenue"].forEach(id=>{
      const sec=d.getElementById(id);if(!sec)return;
      const resumo=sec.querySelector(".front-summary");if(!resumo)return;
      const secoes=Array.prototype.slice.call(sec.children).filter(x=>x.classList&&x.classList.contains("section"));
      const acha=rot=>secoes.filter(x=>{const e=x.querySelector(".section-title .eyebrow");return e&&e.textContent.trim()===rot})[0];
      const alvos=[acha("GESTÃO ATIVA"),acha("EXECUÇÃO")].filter(Boolean);
      if(alvos.length!==2)return;
      let ref=resumo;
      alvos.forEach(x=>{if(ref.nextElementSibling!==x)ref.parentNode.insertBefore(x,ref.nextElementSibling);ref=x});
    });
  }

  function install(){
    const w=frame.contentWindow;if(!w||!w.document||!w.document.querySelector('#overview .kpis'))return false;
    carregar(w).then(j=>{if(j){painel(w,j);metricasFrentes(w,j);cabecalho(w,j)}
      carregarHomolog().then(h=>{if(h)blocoHomolog(w,h)});
      carregarRiscos().then(r=>{if(r)blocoRiscos(w,r)});
      carregarEsteiras().then(e=>{if(e)blocoEsteiras(w,e)});
      carregarAprovadas().then(a=>{if(a&&dados)painel(w,dados)});});
    legendasAvanco(w);
    proximoMarco(w);
    reordena(w);
    rodapes(w);
    ligaHab(w);botaoHab(w);aplicaHab(w);
    if(!w.__nxJiraObserver){
      w.__nxJiraObserver=true;
      const main=w.document.querySelector('main');
      let timer=null;
      if(main)new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(()=>{try{if(!w.document.querySelector('#overview .nx-jira')&&dados)painel(w,dados);if(dados){metricasFrentes(w,dados);cabecalho(w,dados)}if(homolog)blocoHomolog(w,homolog);if(riscos)blocoRiscos(w,riscos);if(esteiras)blocoEsteiras(w,esteiras);legendasAvanco(w);proximoMarco(w);reordena(w);rodapes(w);botaoHab(w);aplicaHab(w)}catch(e){}},120)}).observe(main,{childList:true,subtree:true});
      frame.addEventListener('nexus-timeline',()=>{try{proximoMarco(w)}catch(e){}});
    }
    return true;
  }

  frame.addEventListener('load',()=>{let n=0;const t=setInterval(()=>{if(install()||++n>40)clearInterval(t)},250)});
  if(frame.contentDocument?.readyState==='complete')setTimeout(install,50);
})();
