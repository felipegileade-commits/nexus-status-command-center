// Cronograma executivo (setembro → novembro). Lê os marcos que o app guarda na
// .timeline-source e desenha um quadro limpo: meses, sprints, janelas de
// trabalho e no máximo uma linha de marcos. Marcos repetidos com o mesmo
// título (ex.: "Homologação Central" toda semana) viram uma única janela com
// cadência, em vez de um losango por semana.
(()=>{
  const frame=document.getElementById('app');
  if(!frame)return;

  const DAY=86400000;
  const START=new Date('2026-09-01T00:00:00');
  const END=new Date('2026-11-16T00:00:00'); // folga de 3 dias após a entrega final (13/11) para nada estourar o trilho
  const TOTAL=Math.max(1,Math.round((END-START)/DAY));
  const fmt=d=>`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
  const parse=s=>{const m=String(s||'').match(/(\d{1,2})\D+(\d{1,2})/);return m?new Date(2026,Number(m[2])-1,Number(m[1])):null};
  const pct=d=>Math.max(0,Math.min(100,((d-START)/DAY)/TOTAL*100));
  const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();

  const months=[['Setembro','01/09','30/09'],['Outubro','01/10','31/10'],['Novembro','01/11','13/11']];
  const sprints=[
    ['Sprint 15','01/09','07/09'],
    ['Sprint 16','08/09','22/09'],
    ['Sprint 17','23/09','07/10'],
    ['Sprint 18','08/10','22/10'],
    ['Sprint 19','23/10','05/11'],
    ['Sprint 20','06/11','13/11']
  ];
  const ticks=['08/09','15/09','22/09','29/09','06/10','13/10','20/10','27/10','03/11','10/11'];

  const kind=item=>{
    const t=`${item.label||''} ${item.tag||''} ${item.title||''} ${item.value||''} ${item.desc||''}`.toLowerCase();
    if(/entrega final|encerramento|conclus[aã]o final/.test(t))return 'final';
    if(/homologa[cç][aã]o de revenue|\bmv\b/.test(t))return 'mv';
    if(/central de projetos/.test(t)&&/homologa/.test(t))return 'mv';
    if(/sottelli|uat|ajustes|bugs/.test(t))return 'sottelli';
    return 'milestone';
  };
  const owner=k=>k==='mv'?'MV':k==='sottelli'?'Sottelli':k==='final'?'Projeto Nexus':'Sottelli';
  const category=item=>{const t=(item.title||'').toLowerCase();if(/homologa/.test(t))return 'Homologação';if(/uat|teste/.test(t))return 'Testes';if(/ajuste|bug/.test(t))return 'Ajustes';if(/entrega|conclu/.test(t))return 'Desenvolvimento';return 'Planejamento'};
  const hojeZero=()=>{const h=new Date();h.setHours(0,0,0,0);return h};
  const passado=item=>{const fim=item.end&&item.end>item.start?item.end:item.start;return !!fim&&fim<hojeZero()};
  const emCurso=item=>!!item.start&&!!item.end&&item.end>item.start&&item.start<=hojeZero()&&item.end>=hojeZero();
  const status=item=>{const t=`${item.tag||''} ${item.title||''}`.toLowerCase();if(passado(item)||/entregue|conclu/.test(t))return 'Concluído';if(emCurso(item)||/andamento/.test(t))return 'Em andamento';return 'Planejado'};

  function read(w){
    try{
      if(typeof w.readTimelineItems==='function'){
        const got=w.readTimelineItems();
        if(Array.isArray(got)&&got.length)return got;
      }
    }catch(e){}
    const d=w.document,out=[];
    d.querySelectorAll('#timeline .timeline-source .month-group').forEach(g=>g.querySelectorAll('.milestone-card').forEach(card=>{
      const raw=card.querySelector('.date-row strong')?.textContent||'',nums=raw.match(/\d+/g)||[];
      if(nums.length<2)return;
      const a=`${String(nums[0]).padStart(2,'0')}/${String(nums[1]).padStart(2,'0')}`;
      const b=nums.length>=4?`${String(nums[2]).padStart(2,'0')}/${String(nums[3]).padStart(2,'0')}`:a;
      out.push({
        dateText:a+(b!==a?` — ${b}`:''),
        label:card.querySelector('.date-row span')?.textContent||'',
        tag:card.querySelector('.tag')?.textContent||'',
        title:card.querySelector('h3')?.textContent||'',
        value:card.querySelector('b')?.textContent||'',
        desc:card.querySelector('p')?.textContent||''
      });
    }));
    return out;
  }

  // Marcos brutos: datas interpretadas, tipo, sem sprints nem presença.
  function items(w){
    return read(w).map(x=>{
      const p=String(x.dateText||'').split(/\s+[—–-]\s+/),start=parse(p[0]),end=parse(p[1]||p[0]);
      return {...x,start,end,kind:kind(x)};
    }).filter(x=>x.start&&x.start>=START&&!/^sprint\s+\d+/i.test((x.title||'').trim())&&!/lucas em recife/i.test(x.title||''))
      .sort((a,b)=>a.start-b.start);
  }

  // Agrupa marcos pontuais repetidos (mesmo título, 3+ ocorrências) numa janela
  // com cadência. O que sobra vira marco; as faixas já datadas viram janelas.
  function organizar(xs){
    const grupos={};
    xs.forEach(x=>{if(x.end>x.start)return;const k=norm(x.title);(grupos[k]=grupos[k]||[]).push(x)});
    const janelas=[],marcos=[];
    const agrupados=new Set();
    Object.values(grupos).forEach(g=>{
      if(g.length<3)return;
      g.forEach(x=>agrupados.add(x));
      const first=g[0],last=g[g.length-1];
      const dias=Math.round((last.start-first.start)/DAY)/(g.length-1);
      const cadencia=dias>=6&&dias<=8?'semanal':dias>=13&&dias<=15?'quinzenal':`${g.length} datas`;
      janelas.push({...first,start:first.start,end:last.start,grupo:g,cadencia,
        dateText:`${fmt(first.start)} — ${fmt(last.start)}`,
        desc:`${g.length} sessões (${cadencia}): ${g.map(x=>fmt(x.start)).join(', ')}. ${first.desc||''}`.trim()});
    });
    xs.forEach(x=>{if(agrupados.has(x))return;if(x.end>x.start)janelas.push(x);else marcos.push(x)});
    janelas.sort((a,b)=>a.start-b.start);
    return {janelas,marcos,all:[...janelas,...marcos]};
  }

  const signature=xs=>JSON.stringify(xs.map(x=>[x.dateText,x.title,x.value,x.desc,x.kind]));
  // Marcos já interpretados (datas, tipo), para o jira.js calcular o próximo marco.
  const expose=xs=>{frame.__nexusTimelineItems=xs;try{frame.dispatchEvent(new CustomEvent('nexus-timeline'))}catch(e){}};

  function styles(d){
    if(d.getElementById('ux11-style'))return;
    const s=d.createElement('style');s.id='ux11-style';s.textContent=`
      #timeline .ux11-board{min-width:1040px;color:#f5f8fb;padding:2px 4px 0}
      #timeline .ux11-chart{display:grid;grid-template-columns:70px 1fr}
      #timeline .ux11-labels{position:relative;color:#7f9bb0;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase}
      #timeline .ux11-label{position:absolute;left:0;transform:translateY(-50%)}
      #timeline .ux11-track{position:relative;background:linear-gradient(180deg,rgba(8,27,43,.28),rgba(8,27,43,.06));border-radius:12px}
      #timeline .ux11-month{position:absolute;top:0;height:40px;padding:8px 12px;border-left:1px solid rgba(78,118,150,.35);font-size:13px;font-weight:800;letter-spacing:.02em;color:#f5f8fb}#timeline .ux11-month small{margin-left:6px;color:#7f9bb0;font-size:10px;font-weight:600;letter-spacing:.06em}
      #timeline .ux11-gridline{position:absolute;top:40px;bottom:0;width:1px;background:rgba(78,118,150,.22)}
      #timeline .ux11-tick{position:absolute;top:44px;color:#5f7d95;font-size:9px;transform:translateX(-50%);white-space:nowrap}
      #timeline .ux11-tickline{position:absolute;top:58px;bottom:0;width:1px;background:rgba(78,118,150,.08)}
      #timeline .ux11-sprint{position:absolute;height:26px;border-radius:7px;background:rgba(16,40,62,.55);border:1px solid rgba(78,118,150,.35);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#b9cddb;letter-spacing:.02em}#timeline .ux11-sprint.current{background:rgba(18,72,69,.75);border-color:#2fd4bf;color:#fff}
      #timeline .ux11-window{position:absolute;height:30px;border-radius:999px;display:flex;align-items:center;gap:8px;padding:0 12px;font-size:10.5px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer;border:1px solid transparent;transition:transform .12s ease}#timeline .ux11-window small{font-weight:600;opacity:.8}#timeline .ux11-window.tight small{display:none}#timeline .ux11-window.sottelli{background:rgba(15,92,84,.72);border-color:#2fd4bf}#timeline .ux11-window.mv{background:rgba(24,69,112,.9);border-color:#2a9cff}#timeline .ux11-window.milestone{background:rgba(120,70,20,.8);border-color:#ff8d2d}#timeline .ux11-window:hover,#timeline .ux11-window.active{transform:translateY(-1px);box-shadow:0 0 0 2px rgba(255,255,255,.25)}#timeline .ux11-window.done{opacity:.55}
      #timeline .ux11-rail{position:absolute;left:0;right:0;height:2px;background:rgba(78,118,150,.45)}
      #timeline .ux11-diamond{position:absolute;width:14px;height:14px;transform:translate(-50%,-50%) rotate(45deg);border:2px solid #071b2a;background:#ff8d2d;box-shadow:0 0 0 1px #ffb36e;cursor:pointer;z-index:8;padding:0}#timeline .ux11-diamond.sottelli{background:#2fd4bf}#timeline .ux11-diamond.mv{background:#2a9cff}#timeline .ux11-diamond.final{background:#46dda8;width:18px;height:18px}#timeline .ux11-diamond.done{background:#1f7a62;box-shadow:0 0 0 1px #46dda8}#timeline .ux11-diamond.live{box-shadow:0 0 0 2px #ff8d2d}#timeline .ux11-diamond.active{box-shadow:0 0 0 2px #fff,0 0 0 5px rgba(47,212,191,.25)}
      #timeline .ux11-card{position:absolute;width:150px;border-radius:9px;border:1px solid rgba(78,118,150,.35);border-left:3px solid #ff8d2d;background:rgba(13,35,54,.92);padding:7px 10px;color:#fff;cursor:pointer;z-index:6;text-align:left;transition:transform .12s ease}#timeline .ux11-card.sottelli{border-left-color:#2fd4bf}#timeline .ux11-card.mv{border-left-color:#2a9cff}#timeline .ux11-card.final{border-left-color:#46dda8}#timeline .ux11-card:hover,#timeline .ux11-card.active{border-color:#2fd4bf;transform:translateY(-1px)}#timeline .ux11-card.done{opacity:.6;border-left-color:#46dda8}#timeline .ux11-card.done .date::before{content:'✓ ';color:#46dda8}#timeline .ux11-card .date{font-size:9.5px;font-weight:800;color:#a9c0d0;margin-bottom:3px;letter-spacing:.03em}#timeline .ux11-card .title{font-size:11px;font-weight:700;line-height:1.25;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
      #timeline .ux11-stem{position:absolute;width:1px;background:rgba(78,118,150,.5);z-index:3}
      #timeline .ux11-today{position:absolute;top:40px;bottom:0;width:0;border-left:2px dashed #ff8d2d;z-index:5;pointer-events:none}#timeline .ux11-today i{position:absolute;top:-2px;left:-1px;transform:translateX(-50%);background:#ff8d2d;color:#071b2a;font:900 9px/1 Inter,Segoe UI,Arial,sans-serif;letter-spacing:.06em;padding:4px 8px;border-radius:999px;white-space:nowrap;font-style:normal}
      #timeline .ux11-legend{display:flex;gap:16px;flex-wrap:wrap;margin:10px 0 0 70px;font-size:10px;color:#8da8bd}#timeline .ux11-legend i{display:inline-block;width:9px;height:9px;transform:rotate(45deg);margin-right:6px;vertical-align:-1px;background:#ff8d2d}#timeline .ux11-legend i.done{background:#1f7a62;box-shadow:0 0 0 1px #46dda8}#timeline .ux11-legend i.sottelli{background:#2fd4bf}#timeline .ux11-legend i.mv{background:#2a9cff}#timeline .ux11-legend i.final{background:#46dda8}#timeline .ux11-legend i.today{transform:none;width:0;height:10px;border-left:2px dashed #ff8d2d;background:none}
      #timeline .ux11-hint{margin:6px 0 0 70px;color:#6f8ca3;font-size:10px}
      .ux11-detail-host{margin:12px 0 4px}
      .ux11-detail{display:none;border:1px solid #2b5878;border-radius:12px;background:linear-gradient(180deg,#0c2438,#081c2d);grid-template-columns:1.1fr 1fr;overflow:hidden;box-shadow:0 14px 32px rgba(0,0,0,.20)}.ux11-detail.open{display:grid}.ux11-detail-main{padding:18px 20px}.ux11-detail-side{padding:18px 20px;border-left:1px solid #23435d}.ux11-detail-kicker{font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:#2fd4bf;font-weight:900;margin-bottom:7px}.ux11-detail h3{margin:0 0 13px;font-size:18px}.ux11-meta{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;border-top:1px solid #1e3b53;padding-top:12px}.ux11-meta span{font-size:8px;color:#83a1b5}.ux11-meta b{display:block;color:#fff;font-size:9px;margin-top:4px}.ux11-detail-side h4{margin:0 0 6px;color:#91aabd;font-size:8px;text-transform:uppercase;letter-spacing:.08em}.ux11-detail-side p{margin:0 0 12px;color:#c1d2dd;font-size:10px;line-height:1.5}.ux11-status{display:inline-block;border-radius:999px;padding:3px 8px;background:#16483f;color:#7ff0ce}
      @media(max-width:980px){#timeline .ux11-board{min-width:1000px}.ux11-detail.open{grid-template-columns:1fr}.ux11-detail-side{border-left:0;border-top:1px solid #23435d}}
    `;d.head.appendChild(s);
  }

  function detailHost(t){
    let host=t.parentElement?.querySelector(':scope > .ux11-detail-host');
    if(!host){
      host=t.ownerDocument.createElement('div');host.className='ux11-detail-host';
      host.innerHTML='<div class="ux11-detail"><div class="ux11-detail-main"></div><div class="ux11-detail-side"></div></div>';
      t.insertAdjacentElement('afterend',host);
    }
    return host;
  }

  // The board element is replaced whenever the timeline data changes, so a
  // reference captured in a closure goes stale. Keep the last render's inputs at
  // module level and always look the board up fresh.
  let lastW=null,lastOrg=null;
  const wired=new WeakSet();
  function replaceNow(){
    if(!lastW||!lastOrg)return;
    const b=lastW.document.querySelector('.ux11-board');
    if(b)place(b,lastOrg);
  }

  // Alturas fixas do quadro: meses 0–40, sprints, janelas, trilho de marcos.
  const Y={sprint:70,windows:110,windowH:30,windowGap:8};
  function place(board,org){
    const track=board.querySelector('.ux11-track');if(!track)return;
    const width=track.clientWidth||1040,gap=8;
    // janelas em lanes
    const wl=[];
    [...track.querySelectorAll('.ux11-window')].forEach(el=>{
      const item=org.all[Number(el.dataset.idx)];const left=width*pct(item.start)/100,right=width*pct(item.end)/100;
      let lane=wl.findIndex(l=>!l.some(iv=>left<iv.right+gap&&right>iv.left-gap));
      if(lane<0){lane=wl.length;wl.push([])}
      wl[lane].push({left,right});
      el.style.top=(Y.windows+lane*(Y.windowH+Y.windowGap))+'px';
      el.classList.remove('tight');if(el.scrollWidth>el.clientWidth+1)el.classList.add('tight'); // janela estreita: esconde as datas (mede sempre com elas visíveis)
    });
    const railY=Y.windows+Math.max(1,wl.length)*(Y.windowH+Y.windowGap)+28;
    track.querySelector('.ux11-rail').style.top=railY+'px';
    board.querySelector('.ux11-label.marks').style.top=(railY+34)+'px';
    board.querySelector('.ux11-label.windows').style.top=(Y.windows+Y.windowH/2+(Math.max(1,wl.length)-1)*(Y.windowH+Y.windowGap)/2)+'px';
    track.querySelectorAll('.ux11-stem').forEach(x=>x.remove());
    track.querySelectorAll('.ux11-diamond').forEach(el=>{el.style.top=railY+'px'});
    // cards em lanes abaixo do trilho
    const cl=[],cw=150;
    [...track.querySelectorAll('.ux11-card')].forEach(card=>{
      const item=org.all[Number(card.dataset.idx)],anchor=width*pct(item.start)/100;
      const desired=Math.max(0,Math.min(width-cw,anchor-cw/2));
      let lane=cl.findIndex(l=>!l.some(iv=>desired<iv.right+gap&&desired+cw>iv.left-gap));
      if(lane<0){lane=cl.length;cl.push([])}
      cl[lane].push({left:desired,right:desired+cw});
      const top=railY+22+lane*62;card.style.left=desired+'px';card.style.top=top+'px';
      const stem=track.ownerDocument.createElement('div');stem.className='ux11-stem';stem.style.left=anchor+'px';stem.style.top=(railY+8)+'px';stem.style.height=Math.max(6,top-railY-8)+'px';track.appendChild(stem);
    });
    const h=railY+22+Math.max(1,cl.length)*62+8;
    track.style.height=h+'px';board.querySelector('.ux11-labels').style.height=h+'px';
  }

  function show(t,board,org,idx){
    const item=org.all[idx];if(!item)return;
    board.querySelectorAll('.ux11-card,.ux11-diamond,.ux11-window').forEach(x=>x.classList.remove('active'));
    board.querySelectorAll(`[data-idx="${idx}"]`).forEach(x=>x.classList.add('active'));
    const host=detailHost(t),detail=host.querySelector('.ux11-detail'),main=host.querySelector('.ux11-detail-main'),side=host.querySelector('.ux11-detail-side');
    const date=item.end>item.start?`${fmt(item.start)} a ${fmt(item.end)}`:fmt(item.start);
    main.innerHTML=`<div class="ux11-detail-kicker">${item.grupo?'JANELA DE TRABALHO':'DETALHE DO MARCO'}</div><h3>${esc(date)} · ${esc(item.title||'Marco')}${item.cadencia?` <small style="font-size:11px;color:#8da8bd;font-weight:600">(${esc(item.cadencia)})</small>`:''}</h3><div class="ux11-meta"><span>Data<b>${esc(fmt(item.start)+'/2026')}</b></span><span>Responsável<b>${esc(owner(item.kind))}</b></span><span>Categoria<b>${esc(category(item))}</b></span><span>Status<b><i class="ux11-status">${esc(status(item))}</i></b></span></div>`;
    side.innerHTML=`<h4>Descrição</h4><p>${esc(item.desc||'Sem descrição complementar.')}</p><h4>Observações</h4><p>${esc(item.value||item.tag||'Sem observações adicionais.')}</p>`;
    detail.classList.add('open');
    setTimeout(()=>host.scrollIntoView({behavior:'smooth',block:'nearest'}),0);
  }

  function build(w,force=false){
    const d=w.document,t=d.getElementById('timeline');if(!t)return false;
    const xs=items(w);
    if(!xs.length)return false; // keep the original timeline visible until data is ready
    styles(d);
    const org=organizar(xs);
    const sig=signature(xs);let board=t.querySelector('.ux11-board');
    if(board&&board.dataset.signature===sig&&!force&&wired.has(board)){lastW=w;lastOrg=org;expose(xs);place(board,org);return true}
    if(board)board.remove();
    board=d.createElement('div');board.className='ux11-board';board.dataset.signature=sig;wired.add(board);
    board.innerHTML='<div class="ux11-chart"><div class="ux11-labels"><div class="ux11-label sprints" style="top:'+(Y.sprint+13)+'px">Sprints</div><div class="ux11-label windows">Janelas</div><div class="ux11-label marks">Marcos</div></div><div class="ux11-track"></div></div>';
    t.prepend(board);
    const old=t.querySelector('.calendar-board');if(old)old.style.display='none';
    const hintOld=t.closest('.panel')?.querySelector('.scrollhint');if(hintOld)hintOld.style.display='none';
    const track=board.querySelector('.ux11-track');
    months.forEach(([name,a,b])=>{const da=parse(a),db=parse(b),m=d.createElement('div');m.className='ux11-month';m.style.left=pct(da)+'%';m.style.width=(pct(db)-pct(da)+100/TOTAL)+'%';m.innerHTML=`${name}<small>2026</small>`;track.appendChild(m);const l=d.createElement('div');l.className='ux11-gridline';l.style.left=pct(da)+'%';track.appendChild(l)});
    ticks.forEach(x=>{const e=d.createElement('div');e.className='ux11-tick';e.style.left=pct(parse(x))+'%';e.textContent=x;track.appendChild(e);const l=d.createElement('div');l.className='ux11-tickline';l.style.left=pct(parse(x))+'%';track.appendChild(l)});
    const hoje=hojeZero();
    sprints.forEach(([name,a,b])=>{const ini=parse(a),fim=parse(b);const current=hoje>=ini&&hoje<=fim;const e=d.createElement('div');e.className='ux11-sprint'+(current?' current':'');e.style.left=(pct(ini)+0.15)+'%';e.style.width=Math.max(4,pct(fim)-pct(ini)+100/TOTAL-0.3)+'%';e.style.top=Y.sprint+'px';e.textContent=name+(current?' · atual':'');e.title=`${a} a ${b}`;track.appendChild(e)});
    const rail=d.createElement('div');rail.className='ux11-rail';track.appendChild(rail);
    if(hoje>=START&&hoje<=END){const today=d.createElement('div');today.className='ux11-today';today.style.left=pct(hoje)+'%';today.innerHTML=`<i>HOJE ${fmt(hoje)}</i>`;track.appendChild(today)}
    org.all.forEach((item,i)=>{
      const extra=passado(item)?' done':emCurso(item)?' live':'';
      const open=e=>{e.preventDefault();e.stopPropagation();show(t,board,org,i)};
      if(item.end>item.start){
        const e=d.createElement('button');e.type='button';e.className='ux11-window '+item.kind+extra;e.dataset.idx=String(i);
        e.style.left=pct(item.start)+'%';e.style.width=Math.max(5,pct(item.end)-pct(item.start)+(item.grupo?100/TOTAL:0))+'%';
        e.innerHTML=`${esc(item.title)}<small>· ${fmt(item.start)} – ${fmt(item.end)}${item.cadencia?` · ${esc(item.cadencia)}`:''}</small>`;
        e.title=item.desc||'';e.onclick=open;track.appendChild(e);
      }else{
        const diamond=d.createElement('button');diamond.type='button';diamond.className='ux11-diamond '+item.kind+extra;diamond.style.left=pct(item.start)+'%';diamond.dataset.idx=String(i);diamond.setAttribute('aria-label',`Abrir ${fmt(item.start)} ${item.title}`);diamond.onclick=open;track.appendChild(diamond);
        const card=d.createElement('button');card.type='button';card.className='ux11-card '+item.kind+extra;card.dataset.idx=String(i);card.innerHTML=`<div class="date">${esc(fmt(item.start))}${item.label?` · ${esc(item.label)}`:''}</div><div class="title">${esc(item.title||item.value||'Marco')}</div>`;card.onclick=open;track.appendChild(card);
      }
    });
    board.onclick=e=>{
      const target=e.target.closest?.('.ux11-diamond,.ux11-card,.ux11-window');if(!target)return;
      const idx=Number(target.dataset.idx);if(Number.isInteger(idx)){e.preventDefault();e.stopPropagation();show(t,board,org,idx)}
    };
    const legend=d.createElement('div');legend.className='ux11-legend';legend.innerHTML='<span><i class="today"></i>Hoje</span><span><i class="done"></i>Concluído</span><span><i class="sottelli"></i>Sottelli</span><span><i class="mv"></i>MV</span><span><i></i>Marco conjunto</span><span><i class="final"></i>Entrega final</span>';board.appendChild(legend);
    const hint=d.createElement('div');hint.className='ux11-hint';hint.textContent='Clique em um marco ou janela para ver o detalhe.';board.appendChild(hint);
    place(board,org);
    detailHost(t);
    lastW=w;lastOrg=org;expose(xs);
    const raf=cb=>{try{w.requestAnimationFrame(cb)}catch(e){w.setTimeout(cb,16)}};
    raf(()=>{replaceNow();raf(replaceNow)});
    w.setTimeout(replaceNow,300);
    if(!w.__ux11Resize){
      w.__ux11Resize=true;
      w.addEventListener('resize',replaceNow);
      if(typeof w.ResizeObserver==='function')new w.ResizeObserver(replaceNow).observe(t);
    }
    return true;
  }

  function install(){
    const w=frame.contentWindow;if(!w||!w.document?.querySelector('#timeline'))return false;
    const ok=build(w,false);
    if(ok&&!w.__ux11Observer){
      w.__ux11Observer=true;
      const main=w.document.querySelector('main');
      if(main){
        const check=()=>{
          const b=w.document.querySelector('.ux11-board');
          if(!b||!wired.has(b)){build(w,true);return}
          let sig='';
          try{sig=signature(items(w))}catch(e){return}
          if(sig&&b.dataset.signature!==sig)build(w,true);
        };
        let timer=null;
        new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(()=>{try{check()}catch(e){}},90)})
          .observe(main,{childList:true,subtree:true,characterData:true});
      }
    }
    return ok;
  }

  frame.addEventListener('load',()=>{let n=0;const timer=setInterval(()=>{if(install()||++n>40)clearInterval(timer)},250)});
  if(frame.contentDocument?.readyState==='complete')setTimeout(install,50);
})();
