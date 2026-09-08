// Shell do Nexus Status Command Center.
// Carrega o app no iframe, sincroniza o estado com o Supabase e aplica os
// ajustes visuais do cronograma. A pagina hospedeira define window.NEXUS_READONLY
// antes de carregar este arquivo: index.html (edicao) e view.html (cliente).
(function(){
  // Somente leitura quando a pagina hospedeira declara window.NEXUS_READONLY.
  // O editor e a visualizacao compartilham este arquivo para nao divergirem.
  const READONLY=!!window.NEXUS_READONLY;
  const SB_URL='https://abxamhsdtqvifzoijklt.supabase.co';
  const SB_KEY='sb_publishable_S8H7R_M6TOq-BHKVSb8TCw_PqZ_rKhS';
  const STATE_URL=SB_URL+'/rest/v1/status_report_state?id=eq.main&select=payload,updated_at';
  const HEADERS={apikey:SB_KEY,'Content-Type':'application/json'};
  const frame=document.getElementById('app');
  const loading=document.getElementById('loading');

  // --- Sessao de edicao -----------------------------------------------------
  // A leitura continua anonima (a chave publishable basta). A escrita manda o
  // access_token do Supabase Auth, que o RLS exige. Guardamos em sessionStorage
  // e nao em localStorage porque o shell limpa o localStorage ao iniciar, e
  // porque o token nao precisa sobreviver ao fechamento da aba.
  const AUTH_KEY='nexus_editor_token';
  const getToken=()=>{try{return sessionStorage.getItem(AUTH_KEY)||''}catch(e){return ''}};
  const setToken=t=>{try{t?sessionStorage.setItem(AUTH_KEY,t):sessionStorage.removeItem(AUTH_KEY)}catch(e){}};

  function writeHeaders(){
    const h={...HEADERS,Prefer:'return=minimal'};
    const t=getToken();
    if(t)h.Authorization='Bearer '+t;
    return h;
  }

  async function signIn(email,password){
    const res=await fetch(SB_URL+'/auth/v1/token?grant_type=password',{
      method:'POST',headers:HEADERS,body:JSON.stringify({email,password})
    });
    const body=await res.json().catch(()=>({}));
    if(!res.ok||!body.access_token)throw new Error(body.error_description||body.msg||body.error||('Falha na autenticação ('+res.status+')'));
    setToken(body.access_token);
  }

  // Overlay de login na pagina hospedeira. A senha e digitada pelo usuario e vai
  // direto para o Supabase; nada dela e guardado.
  function askLogin(aviso){
    return new Promise(resolve=>{
      const el=document.createElement('div');
      el.style.cssText='position:fixed;inset:0;z-index:10;display:grid;place-items:center;background:rgba(4,12,20,.82);font:14px Inter,Segoe UI,Arial,sans-serif';
      el.innerHTML='<form style="width:320px;max-width:88vw;background:#0d253a;border:1px solid #28506e;border-radius:14px;padding:22px;box-shadow:0 18px 50px rgba(0,0,0,.35)">'
        +'<div style="color:#2fd4bf;font-size:10px;letter-spacing:.12em;font-weight:800;margin-bottom:6px">SESSÃO DE EDIÇÃO</div>'
        +'<h2 style="color:#fff;font-size:18px;margin:0 0 14px;font-weight:600">Entrar para salvar</h2>'
        +'<p data-erro style="color:#ff8d7a;font-size:12px;margin:0 0 12px;display:none"></p>'
        +'<input name="email" type="email" required placeholder="E-mail" autocomplete="username" style="width:100%;box-sizing:border-box;margin-bottom:9px;padding:10px 12px;border-radius:9px;border:1px solid #2b4d68;background:#081c2d;color:#fff;font-size:13px">'
        +'<input name="senha" type="password" required placeholder="Senha" autocomplete="current-password" style="width:100%;box-sizing:border-box;margin-bottom:14px;padding:10px 12px;border-radius:9px;border:1px solid #2b4d68;background:#081c2d;color:#fff;font-size:13px">'
        +'<div style="display:flex;gap:8px">'
        +'<button type="submit" style="flex:1;padding:10px;border:0;border-radius:9px;background:#2fd4bf;color:#052029;font-weight:700;font-size:13px;cursor:pointer">Entrar</button>'
        +'<button type="button" data-cancelar style="padding:10px 14px;border:1px solid #2b4d68;border-radius:9px;background:transparent;color:#b8cbd8;font-size:13px;cursor:pointer">Cancelar</button>'
        +'</div></form>';
      const form=el.querySelector('form'),erro=el.querySelector('[data-erro]'),botao=el.querySelector('button[type=submit]');
      if(aviso){erro.textContent=aviso;erro.style.display='block'}
      const fechar=ok=>{el.remove();resolve(ok)};
      el.querySelector('[data-cancelar]').onclick=()=>fechar(false);
      form.onsubmit=async e=>{
        e.preventDefault();
        botao.disabled=true;botao.textContent='Entrando…';
        try{
          await signIn(form.email.value.trim(),form.senha.value);
          fechar(true);
        }catch(err){
          erro.textContent=String(err.message||err);erro.style.display='block';
          botao.disabled=false;botao.textContent='Entrar';
        }
      };
      document.body.appendChild(el);
      form.email.focus();
    });
  }

  try{localStorage.clear()}catch(e){}
  frame.src='/legacy-index.html?v=20260908-sinais2';

  function setBullets(container,items){
    if(!container)return;
    container.querySelectorAll('.bullet').forEach(x=>x.remove());
    (items||[]).forEach(item=>{const el=container.ownerDocument.createElement('div');el.className='bullet';el.textContent=item;container.appendChild(el)});
  }

  function setFrontProgress(root,value){
    const el=root&&root.querySelector('.front-progress');if(!el)return;
    if(el.childNodes.length&&el.childNodes[0].nodeType===3)el.childNodes[0].nodeValue=value+' ';else el.insertBefore(el.ownerDocument.createTextNode(value+' '),el.firstChild);
    const bar=root.querySelector('.front-summary > .progress span');
    if(bar){const n=Math.max(0,Math.min(100,parseFloat(String(value).replace('%','').replace(',','.'))||0));bar.style.width=n+'%'}
  }

  function installTimelineUX(w){
    const d=w.document;
    if(!d.getElementById('nexus-timeline-ux3')){
      const style=d.createElement('style');
      style.id='nexus-timeline-ux3';
      style.textContent=`
      #overview .timeline-panel{border-radius:16px;padding:26px 28px;background:linear-gradient(180deg,rgba(11,32,52,.98),rgba(7,24,39,.98));border-color:#21435f;box-shadow:0 18px 50px rgba(0,0,0,.16)}
      #overview .timeline-panel .panel-head{padding-bottom:18px;margin-bottom:8px;align-items:center}
      #overview .timeline-panel .panel-head h1{font-size:30px;font-weight:650;letter-spacing:-.02em;text-transform:none}
      #overview .timeline-panel .panel-head p{font-size:12px;color:#8da8bd;max-width:none}
      #timeline{padding-top:8px}
      #timeline .calendar-board{min-width:2520px;padding:12px 8px 10px}
      #timeline .calendar-legend{gap:22px;padding:0 8px 16px;color:#9eb7c8;font-size:10px}
      #timeline .calendar-legend span{gap:8px}
      #timeline .exec-swatch{width:10px;height:10px;border-radius:50%}
      #timeline .exec-swatch.joint,#timeline .exec-swatch.final{border-radius:2px;transform:rotate(45deg)}
      #timeline .calendar-grid{grid-template-columns:170px repeat(85,minmax(26px,1fr));grid-template-rows:48px 64px 610px;border-bottom:1px solid #24445d}
      #timeline .cal-month{padding:15px 16px;background:rgba(7,24,39,.28);border-color:#294b64;font-size:11px;letter-spacing:.14em}
      #timeline .cal-sprint-band{grid-row:2/4;margin:4px 5px 8px;border-radius:16px!important;border:1px solid rgba(88,137,169,.28)!important;background:rgba(18,42,64,.26)!important;box-shadow:none!important}
      #timeline .cal-sprint-band[data-sprint="15"],#timeline .cal-sprint-band[data-sprint="17"],#timeline .cal-sprint-band[data-sprint="19"]{background:rgba(47,212,191,.045)!important;border-color:rgba(47,212,191,.28)!important}
      #timeline .cal-sprint-band[data-sprint="16"],#timeline .cal-sprint-band[data-sprint="18"]{background:rgba(42,156,255,.04)!important;border-color:rgba(42,156,255,.24)!important}
      #timeline .cal-sprint-band[data-sprint="20"]{background:rgba(70,221,168,.05)!important;border-color:rgba(70,221,168,.28)!important}
      #timeline .cal-sprint-band:after{top:118px;border-color:rgba(129,169,195,.12)}
      #timeline .cal-sprint-title{margin:14px 10px;padding:9px 12px;border:1px solid #42627a!important;border-radius:12px!important;background:#10283e!important;font-size:10px;font-weight:700;justify-content:center;box-shadow:0 6px 18px rgba(0,0,0,.12)}
      #timeline .cal-sprint-title.current{border-color:#2fd4bf!important;background:#10383b!important}
      #timeline .cal-row-label[style*="grid-row:2"]{visibility:hidden}
      #timeline .cal-row-label[style*="grid-row:3"]{visibility:visible;padding:78px 18px 0 4px;border-bottom:0;align-self:start}
      #timeline .cal-row-label[style*="grid-row:3"] strong{font-size:13px;color:#fff}
      #timeline .cal-row-label[style*="grid-row:3"] span{font-size:9px;color:#829fb3;line-height:1.5}
      #timeline .cal-lane.project{grid-column:2/87;padding-top:0;position:relative;border-bottom:0;align-self:start}
      #timeline .cal-lane.project:before{top:79px;height:2px;background:#41627a;opacity:.9;z-index:2}
      #timeline .cal-bar{grid-row:1!important;align-self:center;height:30px;border-radius:999px;box-shadow:0 8px 18px rgba(0,0,0,.12);z-index:6}
      #timeline .cal-bar span{padding:7px 12px;font-size:10px;letter-spacing:.01em}
      #timeline .cal-mark{grid-row:2!important;align-self:center;width:17px;height:17px;z-index:7}
      #timeline .cal-card{align-self:start;border:1px solid #294b64;border-left-width:5px;border-radius:12px;background:linear-gradient(180deg,#102b43,#0e263b);padding:14px 16px;font-size:10px;line-height:1.55;box-shadow:0 12px 24px rgba(0,0,0,.14);z-index:8;min-height:104px;overflow:visible}
      #timeline .cal-card b{font-size:12px;line-height:1.35;margin-bottom:7px;color:#fff}
      #timeline .cal-card.sottelli{border-left-color:#2fd4bf}
      #timeline .cal-card.mv{border-left-color:#2a9cff}
      #timeline .cal-card.final{border-left-color:#46dda8}
      #timeline .cal-note{gap:6px;margin-top:10px}
      #timeline .cal-note span{padding:4px 8px;font-size:8px;background:#0b2034;border-color:#2a9cff}
      #timeline .calendar-caption{padding:16px 8px 4px;border-top:1px solid #18364f;margin-top:8px;color:#8da8bd;font-size:9px}
      #timeline .scrollhint{margin-top:6px;color:#7392a8}
      /* UX4_CLICKABLE_MILESTONES */
      #timeline .cal-lane.project{grid-template-rows:58px 42px 112px!important}
      #timeline .cal-card{grid-row:3!important;min-height:82px;max-height:92px;overflow:hidden;padding:12px 14px;border-left-width:3px;cursor:pointer;display:flex;align-items:flex-start;transition:border-color .15s ease,transform .15s ease,background .15s ease}
      #timeline .cal-card:hover{transform:translateY(-2px);border-color:#4a7695;background:linear-gradient(180deg,#123049,#102a40)}
      #timeline .cal-card.timeline-selected{border-color:#2fd4bf;box-shadow:0 0 0 1px rgba(47,212,191,.25),0 12px 24px rgba(0,0,0,.16)}
      #timeline .cal-card b{margin:0;font-size:12px;line-height:1.4}
      #timeline .cal-mark{cursor:pointer;transition:transform .15s ease,box-shadow .15s ease}
      #timeline .cal-mark:hover{transform:rotate(45deg) scale(1.12)}
      #timeline .cal-mark.timeline-selected{box-shadow:0 0 0 2px rgba(255,255,255,.2),0 0 0 5px rgba(47,212,191,.25)}
      #timeline .calendar-caption:before{content:'☝  Clique em um marco para ver a explicação.';display:block;color:#9eb7c8;font-size:10px;margin-bottom:8px}
      #timeline .timeline-detail{display:none;margin:14px 8px 4px;border:1px solid #28506e;border-radius:14px;background:linear-gradient(180deg,#0d253a,#091c2d);box-shadow:0 14px 32px rgba(0,0,0,.16);overflow:hidden}
      #timeline .timeline-detail.open{display:grid;grid-template-columns:1.25fr 1fr}
      #timeline .timeline-detail-main{padding:20px 24px;border-right:1px solid #24435d;position:relative}
      #timeline .timeline-detail-side{padding:20px 24px;background:rgba(8,24,39,.42)}
      #timeline .timeline-detail-kicker{font-size:10px;color:#2fd4bf;text-transform:uppercase;letter-spacing:.12em;font-weight:800;margin-bottom:8px}
      #timeline .timeline-detail h3{font-size:20px;line-height:1.25;margin:0 0 10px;color:#fff}
      #timeline .timeline-detail p{font-size:12px;line-height:1.6;margin:0;color:#bed0dc}
      #timeline .timeline-detail-label{font-size:10px;color:#8da8bd;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px}
      #timeline .timeline-detail-close{position:absolute;right:16px;top:14px;border:0;background:transparent;color:#b8cbd8;font-size:20px;line-height:1;cursor:pointer}
      #timeline .timeline-detail-close:hover{color:#fff}
      /* UX5_COLLISION_FREE_COMPACT */
      #timeline .cal-lane.project{grid-template-rows:58px 42px 68px 68px!important}
      #timeline .cal-card{min-height:54px!important;max-height:58px!important;height:58px!important;padding:9px 11px!important;border-radius:10px!important;border-left-width:3px!important;display:block!important;overflow:hidden!important}
      #timeline .cal-card b{display:-webkit-box!important;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:11px!important;line-height:1.25!important;margin:0!important;white-space:normal!important}
      #timeline .cal-card.timeline-selected{transform:translateY(-1px)}
      @media(max-width:980px){#timeline .timeline-detail.open{grid-template-columns:1fr}#timeline .timeline-detail-main{border-right:0;border-bottom:1px solid #24435d}}
      @media(max-width:980px){#timeline .calendar-board{min-width:2200px}}
      `;
      d.head.appendChild(style);
    }

    const head=d.querySelector('#overview .timeline-panel .panel-head');
    if(head){
      const h=head.querySelector('h1'),p=head.querySelector('p');
      if(h)h.textContent='Cronograma executivo';
      if(p)p.textContent='Marcos, sprints e janelas de trabalho em uma leitura mais limpa e apresentável.';
    }
    const legend=[...d.querySelectorAll('#timeline .calendar-legend span')];
    if(legend[0])legend[0].lastChild.textContent=' Sottelli';
    if(legend[1])legend[1].lastChild.textContent=' MV';
    if(legend[2])legend[2].lastChild.textContent=' Marco';
    if(legend[3])legend[3].lastChild.textContent=' Atual';

    const project=d.querySelector('#timeline .cal-lane.project');
    if(!project)return;
    const grid=d.querySelector('#timeline .calendar-grid');
    const cards=[...project.querySelectorAll('.cal-card')];
    const marks=[...project.querySelectorAll('.cal-mark')];
    const bars=[...project.querySelectorAll('.cal-bar')];
    const compactOccupied=[];
    const originalStartCol=card=>{
      if(!card.dataset.uxOriginalColumn)card.dataset.uxOriginalColumn=String(card.style.gridColumn||'');
      return parseInt(card.dataset.uxOriginalColumn.split('/')[0].trim(),10)||startCol(card)||1;
    };
    const compactSpanFor=card=>{
      const t=(card.dataset.timelineTitle||card.querySelector('b')?.textContent||'').trim();
      return t.length>45?9:t.length>30?8:t.length>18?7:6;
    };
    const placeCompactCard=card=>{
      const anchor=originalStartCol(card);
      const span=compactSpanFor(card);
      const start=Math.max(1,Math.min(86-span,anchor));
      const finish=start+span;
      let rowIndex=compactOccupied.findIndex(row=>!row.some(x=>start<x.finish+1&&finish>x.start-1));
      if(rowIndex<0){rowIndex=compactOccupied.length;compactOccupied.push([])}
      compactOccupied[rowIndex].push({start,finish});
      card.style.gridColumn=`${start}/${finish}`;
      card.style.gridRow=String(3+rowIndex);
    };
    cards.forEach(card=>{
      if(card.dataset.uxCompact!=='1'){
        const b=card.querySelector('b');
        if(!b)return;
        const title=b.textContent.trim();
        const clone=card.cloneNode(true);
        const cloneB=clone.querySelector('b');if(cloneB)cloneB.remove();
        const notes=[...clone.querySelectorAll('.cal-note span')].map(x=>x.textContent.trim()).filter(Boolean);
        clone.querySelectorAll('.cal-note').forEach(x=>x.remove());
        const desc=clone.textContent.replace(/\s+/g,' ').trim();
        card.dataset.timelineTitle=title;
        card.dataset.timelineDesc=desc||'Sem descrição complementar.';
        card.dataset.timelineObs=notes.length?notes.join(' · '):(desc||'Sem observações adicionais.');
        card.dataset.uxCompact='1';
        card.innerHTML='<b></b>';
        card.querySelector('b').textContent=title;
      }
      placeCompactCard(card);
      card.onclick=()=>{
        const c=originalStartCol(card);
        const mark=marks.map(m=>({m,dist:Math.abs(startCol(m)-c)})).sort((a,b)=>a.dist-b.dist)[0]?.m||null;
        if(typeof openDetail==='function')openDetail(card,mark);
      };
    });
    marks.forEach(mark=>{
      mark.style.gridRow='2';
      mark.onclick=()=>{
        const m=startCol(mark);
        const card=cards.map(c=>({c,dist:Math.abs(startCol(c)-m)})).sort((a,b)=>a.dist-b.dist)[0]?.c||null;
        if(typeof openDetail==='function')openDetail(card,mark);
      };
    });
    const compactRows=Math.max(1,compactOccupied.length);
    project.style.gridTemplateRows=`58px 42px repeat(${compactRows},68px)`;
    if(grid)grid.style.gridTemplateRows=`48px 64px ${100+compactRows*68}px`;
  }

  function watchTimeline(w){
    installTimelineUX(w);
    const project=w.document.querySelector('#timeline .cal-lane.project');
    if(!project||project.dataset.uxObserved==='1')return;
    project.dataset.uxObserved='1';
    let timer=null;
    const obs=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(()=>installTimelineUX(w),20)});
    obs.observe(project,{childList:true,subtree:true});
  }

  function applySeed(w,seed){
    if(!seed||!seed.central)return;
    const d=w.document,c=seed.central;
    const meta=d.querySelectorAll('.topbar .meta small');
    if(meta[0])meta[0].textContent=seed.meta?.date||'08/09/2026';
    if(meta[1])meta[1].textContent=seed.meta?.week||'36';
    d.querySelectorAll('.footer span:first-child').forEach(x=>x.textContent=x.textContent.replace(/Semana\s+\d+/,'Semana '+(seed.meta?.week||'36')));
    d.querySelectorAll('.footer span:last-child').forEach(x=>x.textContent='Dados atualizados em '+(seed.meta?.date||'08/09/2026'));
    const root=d.getElementById('central');if(!root)return;
    setFrontProgress(root,c.concluded);
    const metrics=root.querySelectorAll('.metric-block strong');
    if(metrics[0])metrics[0].textContent=c.uat;if(metrics[1])metrics[1].textContent=c.homolog;if(metrics[2])metrics[2].textContent=c.deviation;
    const foot=root.querySelectorAll('.front-foot span');if(foot[0])foot[0].textContent=c.sprint;if(foot[1])foot[1].textContent=c.status;
    const groups=root.querySelectorAll('.week-card .subgrid > div');
    setBullets(groups[0],c.activities);setBullets(groups[1],c.attention);setBullets(groups[2],c.pending);setBullets(groups[3],c.blockers);
    const risk=root.querySelector('.risk-col:not(.action) p'),action=root.querySelector('.risk-col.action p');if(risk)risk.textContent=c.risk||'';if(action)action.textContent=c.action||'';
    const next=root.querySelector('.next-grid');
    if(next){next.innerHTML='';(c.next||[]).forEach((item,i)=>{const card=d.createElement('div');card.className='next-card';card.innerHTML='<span class="n"></span><span class="tag2"></span><p></p><small></small>';card.querySelector('.n').textContent=String(i+1).padStart(2,'0');card.querySelector('.tag2').textContent=item.label||'Central de Projetos';card.querySelector('p').textContent=item.text||'';card.querySelector('small').textContent=item.status||'Em acompanhamento';next.appendChild(card)})}
    const epicGrid=root.querySelector('.epic-grid');
    if(epicGrid){epicGrid.innerHTML='';(c.epics||[]).forEach((item,i)=>{const total=Math.max(1,Number(item.total)||1),done=Number(item.done)||0,p=Math.round(done/total*100),row=d.createElement('div');row.className='epic';row.innerHTML='<div class="num"></div><div class="epic-name"></div><strong></strong><div class="bar"><span></span></div>';row.querySelector('.num').textContent=String(item.n||i+1);row.querySelector('.epic-name').textContent=item.name||'';row.querySelector('strong').textContent=done+'/'+total;row.querySelector('.bar span').style.width=p+'%';epicGrid.appendChild(row)})}
    try{w.syncOverviewFromFronts&&w.syncOverviewFromFronts()}catch(e){}
    try{w.syncPrintReport&&w.syncPrintReport()}catch(e){}
  }

  function rebind(w){
    try{w.bindNavigation&&w.bindNavigation()}catch(e){}
    try{w.bindTimelineDrag&&w.bindTimelineDrag()}catch(e){}
    try{w.renderExecutiveCalendar&&w.renderExecutiveCalendar()}catch(e){}
    try{w.syncOverviewFromFronts&&w.syncOverviewFromFronts()}catch(e){}
    try{w.syncPrintReport&&w.syncPrintReport()}catch(e){}
    installTimelineUX(w);
  }

  function capture(w){
    const d=w.document,clone=d.querySelector('main').cloneNode(true);
    clone.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
    // The timeline is rendered from the source data on every load. Persisting the
    // rendered board would store markup whose click handlers cannot survive
    // serialization, so drop it and restore the source board it hides.
    clone.querySelectorAll('.ux11-board,.ux11-detail-host').forEach(x=>x.remove());
    clone.querySelectorAll('.calendar-board').forEach(x=>{x.style.display=''});
    const ov=clone.querySelector('#overview');if(ov)ov.classList.add('active');
    const meta=d.querySelectorAll('.topbar .meta small');
    return {main:clone.innerHTML,date:meta[0]?.textContent||'',week:meta[1]?.textContent||''};
  }

  async function save(w){
    if(READONLY)return;
    // O estado e capturado antes de qualquer pedido de login para que a edicao
    // pendente nao se perca enquanto o usuario digita a senha.
    const body=JSON.stringify({payload:capture(w),updated_at:new Date().toISOString()});
    const enviar=()=>fetch(STATE_URL,{method:'PATCH',headers:writeHeaders(),body});
    let res=await enviar();
    if(res.status===401||res.status===403){
      setToken('');
      const ok=await askLogin('Entre com sua conta para salvar as alterações.');
      if(!ok)throw new Error('Alterações não salvas — login cancelado.');
      res=await enviar();
    }
    if(!res.ok)throw new Error('Falha ao salvar: '+res.status+' '+await res.text());
  }

  // Um save que falha em silencio e pior do que um erro visivel: foi assim que
  // dez marcos sumiram sem ninguem perceber.
  function toast(msg,erro){
    const t=document.createElement('div');
    t.textContent=msg;
    t.style.cssText='position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:11;'
      +'padding:11px 18px;border-radius:10px;font:13px Inter,Segoe UI,Arial,sans-serif;'
      +'box-shadow:0 12px 30px rgba(0,0,0,.3);max-width:78vw;text-align:center;'
      +(erro?'background:#4a1620;border:1px solid #a33;color:#ffd9d2':'background:#0f3b39;border:1px solid #2fd4bf;color:#d6fff8');
    document.body.appendChild(t);
    setTimeout(()=>t.remove(),erro?9000:2600);
  }

  async function load(w){
    const res=await fetch(STATE_URL,{headers:HEADERS,cache:'no-store'});if(!res.ok)throw new Error('Falha ao carregar: '+res.status);
    const rows=await res.json(),payload=rows?.[0]?.payload||{},d=w.document;
    if(payload.main){d.querySelector('main').innerHTML=payload.main;const meta=d.querySelectorAll('.topbar .meta small');if(meta[0]&&payload.date!=null)meta[0].textContent=payload.date;if(meta[1]&&payload.week!=null)meta[1].textContent=payload.week;rebind(w)}
    else if(payload.seed){applySeed(w,payload.seed);if(!READONLY)await save(w)}
  }


  // Modo cliente: remove todo caminho de edicao. As regras ficam no <head> do
  // iframe porque a restauracao do estado troca o innerHTML do <main> inteiro,
  // o que recriaria botoes escondidos apenas no DOM.
  function lockdown(w){
    const d=w.document;
    if(!d.getElementById('nexus-readonly')){
      const st=d.createElement('style');
      st.id='nexus-readonly';
      st.textContent='[onclick*="openEditor"]{display:none!important}#drawerBackdrop{display:none!important}';
      d.head.appendChild(st);
    }
    const noop=function(){};
    try{w.openEditor=noop;w.saveCurrentEditor=noop;w.persistState=noop}catch(e){}
    try{w.eval('openEditor=window.openEditor;saveCurrentEditor=window.saveCurrentEditor;persistState=window.persistState')}catch(e){}
  }

  frame.addEventListener('load',async()=>{
    const w=frame.contentWindow;
    try{
      await load(w);
      installTimelineUX(w);
      watchTimeline(w);
      if(READONLY)lockdown(w);
      else{
        const sharedPersist=function(){
          save(w)
            .then(()=>toast('Status salvo.'))
            .catch(err=>{console.error('[Nexus Supabase]',err);toast(String(err.message||err),true)});
        };
        try{w.persistState=sharedPersist;w.eval('persistState = window.persistState')}catch(e){}
      }
    }catch(err){console.error('[Nexus Supabase]',err)}
    loading.style.display='none';frame.style.opacity='1';
  },{once:true});
})();
