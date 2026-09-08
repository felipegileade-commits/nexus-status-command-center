(()=>{
  const frame=document.getElementById('app');
  if(!frame)return;

  const DAY=86400000;
  const START=new Date('2026-09-01T00:00:00');
  const END=new Date('2026-11-13T00:00:00');
  const TOTAL=Math.max(1,Math.round((END-START)/DAY));
  const fmt=d=>`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
  const parse=s=>{const m=String(s||'').match(/(\d{1,2})\D+(\d{1,2})/);return m?new Date(2026,Number(m[2])-1,Number(m[1])):null};
  const pct=d=>Math.max(0,Math.min(100,((d-START)/DAY)/TOTAL*100));
  const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const months=[['SETEMBRO','01/09','30/09'],['OUTUBRO','01/10','31/10'],['NOVEMBRO','01/11','13/11']];
  const sprints=[
    ['Sprint 15','01/09','07/09','21/08 a 07/09',true],
    ['Sprint 16','08/09','22/09','08/09 a 22/09'],
    ['Sprint 17','23/09','07/10','23/09 a 07/10'],
    ['Sprint 18','08/10','22/10','08/10 a 22/10'],
    ['Sprint 19','23/10','05/11','23/10 a 05/11'],
    ['Sprint 20','06/11','13/11','06/11 a 13/11']
  ];
  const ticks=['01/09','08/09','15/09','22/09','29/09','06/10','13/10','20/10','27/10','03/11','10/11','13/11'];

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
  const status=item=>{const t=`${item.tag||''} ${item.title||''}`.toLowerCase();if(/entregue|conclu|final/.test(t))return 'Concluído';if(/uat|homologa|andamento/.test(t))return 'Em andamento';return 'Planejado'};

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

  function items(w){
    return read(w).map(x=>{
      const p=String(x.dateText||'').split(/\s+[—–-]\s+/),start=parse(p[0]),end=parse(p[1]||p[0]);
      return {...x,start,end,kind:kind(x)};
    }).filter(x=>x.start&&x.start>=START&&!/^sprint\s+\d+/i.test((x.title||'').trim())&&!/lucas em recife/i.test(x.title||''))
      .sort((a,b)=>a.start-b.start);
  }

  const signature=xs=>JSON.stringify(xs.map(x=>[x.dateText,x.title,x.value,x.desc,x.kind]));

  function styles(d){
    if(d.getElementById('ux11-style'))return;
    const s=d.createElement('style');s.id='ux11-style';s.textContent=`
      #timeline .ux11-board{min-width:1080px;color:#f5f8fb;padding:4px 6px 2px}
      #timeline .ux11-chart{display:grid;grid-template-columns:64px 1fr;border-top:1px solid #17344d;border-bottom:1px solid #17344d}
      #timeline .ux11-labels{position:relative;height:350px;border-right:1px solid #27465e;color:#d7e3eb;font-size:10px;font-weight:800}
      #timeline .ux11-label{position:absolute;left:2px}.ux11-label.sprints{top:98px}.ux11-label.windows{top:160px}.ux11-label.marks{top:222px}
      #timeline .ux11-track{position:relative;height:350px;background:linear-gradient(180deg,rgba(8,27,43,.34),rgba(8,27,43,.12))}
      #timeline .ux11-month{position:absolute;top:0;height:50px;padding:11px 12px;border-left:1px solid #24465f;border-bottom:1px solid #24465f;font-size:11px;font-weight:900;letter-spacing:.10em}.ux11-month small{display:block;color:#829fb2;font-size:9px;letter-spacing:0;margin-top:2px}
      #timeline .ux11-gridline{position:absolute;top:50px;bottom:0;width:1px;background:rgba(51,84,108,.17)}
      #timeline .ux11-tick{position:absolute;top:54px;color:#819eb1;font-size:8px;transform:translateX(-50%);white-space:nowrap}
      #timeline .ux11-sprint{position:absolute;top:82px;height:36px;border:1px solid #3b607c;border-radius:9px;background:#10283e;display:flex;align-items:center;justify-content:center;text-align:center;font-size:9px;font-weight:800;line-height:1.2}.ux11-sprint.current{border-color:#2fd4bf;background:rgba(18,72,69,.70)}
      #timeline .ux11-window{position:absolute;top:145px;height:28px;border-radius:999px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 10px}.ux11-window.sottelli{background:rgba(15,92,84,.70);border:1px solid #2fd4bf}.ux11-window.mv{background:rgba(24,69,112,.86);border:1px solid #2a9cff}
      #timeline .ux11-rail{position:absolute;left:0;right:0;top:214px;height:2px;background:#41637b}
      #timeline .ux11-diamond{position:absolute;top:206px;width:16px;height:16px;transform:translateX(-50%) rotate(45deg);border:2px solid #071b2a;background:#ff8d2d;box-shadow:0 0 0 1px #ffb36e;cursor:pointer;z-index:8;padding:0}.ux11-diamond.sottelli{background:#2fd4bf}.ux11-diamond.mv{background:#2a9cff}.ux11-diamond.final{background:#46dda8}.ux11-diamond.active{box-shadow:0 0 0 2px #fff,0 0 0 5px rgba(47,212,191,.25)}
      #timeline .ux11-card{position:absolute;height:42px;border-radius:8px;border:1px solid #31526a;border-left:3px solid #ff8d2d;background:linear-gradient(180deg,#102a40,#0d2336);padding:6px 8px;color:#fff;cursor:pointer;box-shadow:0 7px 16px rgba(0,0,0,.12);z-index:6;text-align:left}.ux11-card.sottelli{border-left-color:#2fd4bf}.ux11-card.mv{border-left-color:#2a9cff}.ux11-card.final{border-left-color:#46dda8}.ux11-card:hover,.ux11-card.active{border-color:#2fd4bf;transform:translateY(-1px)}.ux11-card .date{font-size:8px;font-weight:900;color:#cfe0ea;margin-bottom:2px}.ux11-card .title{font-size:9px;font-weight:800;line-height:1.12;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
      #timeline .ux11-stem{position:absolute;width:1px;background:#41637b;z-index:3}
      #timeline .ux11-hint{margin:10px 0 0;color:#8da8bd;font-size:10px}
      .ux11-detail-host{margin:12px 0 4px}
      .ux11-detail{display:none;border:1px solid #2b5878;border-radius:12px;background:linear-gradient(180deg,#0c2438,#081c2d);grid-template-columns:1.1fr 1fr;overflow:hidden;box-shadow:0 14px 32px rgba(0,0,0,.20)}.ux11-detail.open{display:grid}.ux11-detail-main{padding:18px 20px}.ux11-detail-side{padding:18px 20px;border-left:1px solid #23435d}.ux11-detail-kicker{font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:#2fd4bf;font-weight:900;margin-bottom:7px}.ux11-detail h3{margin:0 0 13px;font-size:18px}.ux11-meta{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;border-top:1px solid #1e3b53;padding-top:12px}.ux11-meta span{font-size:8px;color:#83a1b5}.ux11-meta b{display:block;color:#fff;font-size:9px;margin-top:4px}.ux11-detail-side h4{margin:0 0 6px;color:#91aabd;font-size:8px;text-transform:uppercase;letter-spacing:.08em}.ux11-detail-side p{margin:0 0 12px;color:#c1d2dd;font-size:10px;line-height:1.5}.ux11-status{display:inline-block;border-radius:999px;padding:3px 8px;background:#16483f;color:#7ff0ce}
      @media(max-width:980px){#timeline .ux11-board{min-width:1040px}.ux11-detail.open{grid-template-columns:1fr}.ux11-detail-side{border-left:0;border-top:1px solid #23435d}}
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
  let lastW=null,lastXs=null;
  function replaceNow(){
    if(!lastW||!lastXs)return;
    const b=lastW.document.querySelector('.ux11-board');
    if(b)place(b,lastXs);
  }

  function place(board,xs){
    const track=board.querySelector('.ux11-track');if(!track)return;
    const width=track.clientWidth||1080,gap=7,lanes=[];
    track.querySelectorAll('.ux11-stem').forEach(x=>x.remove());
    [...track.querySelectorAll('.ux11-card')].forEach((card,i)=>{
      const item=xs[i],anchor=width*pct(item.start)/100,title=item.title||'',cw=title.length>28?126:title.length>18?116:104;
      card.style.width=cw+'px';
      const desired=Math.max(0,Math.min(width-cw,anchor-cw/2));
      let lane=-1,left=desired;
      for(let r=0;r<lanes.length;r++){
        if(!lanes[r].some(iv=>desired<iv.right+gap&&desired+cw>iv.left-gap)){lane=r;break}
      }
      if(lane<0){lane=lanes.length;lanes.push([])}
      lanes[lane].push({left,right:left+cw});
      const top=239+lane*50;card.style.left=left+'px';card.style.top=top+'px';
      const stem=track.ownerDocument.createElement('div');stem.className='ux11-stem';stem.style.left=anchor+'px';stem.style.top='222px';stem.style.height=Math.max(10,top-222)+'px';track.appendChild(stem);
    });
    const h=310+Math.max(0,lanes.length-1)*50;
    track.style.height=h+'px';board.querySelector('.ux11-labels').style.height=h+'px';
  }

  function show(t,board,xs,idx){
    const item=xs[idx];if(!item)return;
    board.querySelectorAll('.ux11-card,.ux11-diamond').forEach(x=>x.classList.remove('active'));
    board.querySelector(`.ux11-card[data-idx="${idx}"]`)?.classList.add('active');
    board.querySelector(`.ux11-diamond[data-idx="${idx}"]`)?.classList.add('active');
    const host=detailHost(t),detail=host.querySelector('.ux11-detail'),main=host.querySelector('.ux11-detail-main'),side=host.querySelector('.ux11-detail-side');
    const date=item.end>item.start?`${fmt(item.start)} a ${fmt(item.end)}`:fmt(item.start);
    main.innerHTML=`<div class="ux11-detail-kicker">DETALHE DO MARCO</div><h3>${esc(date)} · ${esc(item.title||'Marco')}</h3><div class="ux11-meta"><span>Data<b>${esc(fmt(item.start)+'/2026')}</b></span><span>Responsável<b>${esc(owner(item.kind))}</b></span><span>Categoria<b>${esc(category(item))}</b></span><span>Status<b><i class="ux11-status">${esc(status(item))}</i></b></span></div>`;
    side.innerHTML=`<h4>Descrição</h4><p>${esc(item.desc||'Sem descrição complementar.')}</p><h4>Observações</h4><p>${esc(item.value||item.tag||'Sem observações adicionais.')}</p>`;
    detail.classList.add('open');
    setTimeout(()=>host.scrollIntoView({behavior:'smooth',block:'nearest'}),0);
  }

  function build(w,force=false){
    const d=w.document,t=d.getElementById('timeline');if(!t)return false;
    const xs=items(w);
    if(!xs.length)return false; // keep the original timeline visible until data is ready
    styles(d);
    const sig=signature(xs);let board=t.querySelector('.ux11-board');
    if(board&&board.dataset.signature===sig&&!force){lastW=w;lastXs=xs;place(board,xs);return true}
    if(board)board.remove();
    board=d.createElement('div');board.className='ux11-board';board.dataset.signature=sig;
    board.innerHTML='<div class="ux11-chart"><div class="ux11-labels"><div class="ux11-label sprints">Sprints</div><div class="ux11-label windows">Janelas</div><div class="ux11-label marks">Marcos</div></div><div class="ux11-track"></div></div><div class="ux11-hint">Clique no losango ou no quadro para abrir os detalhes do marco.</div>';
    t.prepend(board);
    // only hide the old board after UX11 has been rendered successfully
    const old=t.querySelector('.calendar-board');if(old)old.style.display='none';
    const track=board.querySelector('.ux11-track');
    months.forEach(([name,a,b])=>{const da=parse(a),db=parse(b),m=d.createElement('div');m.className='ux11-month';m.style.left=pct(da)+'%';m.style.width=(pct(db)-pct(da)+100/TOTAL)+'%';m.innerHTML=`${name}<small>2026</small>`;track.appendChild(m);const l=d.createElement('div');l.className='ux11-gridline';l.style.left=pct(da)+'%';track.appendChild(l)});
    ticks.forEach(x=>{const e=d.createElement('div');e.className='ux11-tick';e.style.left=pct(parse(x))+'%';e.textContent=x;track.appendChild(e)});
    sprints.forEach(([name,a,b,label,current])=>{const e=d.createElement('div');e.className='ux11-sprint'+(current?' current':'');e.style.left=pct(parse(a))+'%';e.style.width=Math.max(4,pct(parse(b))-pct(parse(a)))+'%';e.innerHTML=`${name}<br>${label}`;track.appendChild(e)});
    xs.filter(x=>x.end>x.start&&(/uat/i.test(x.title||'')||/homologa[cç][aã]o de revenue/i.test(x.title||''))).slice(0,2).forEach(x=>{const e=d.createElement('div');e.className='ux11-window '+x.kind;e.style.left=pct(x.start)+'%';e.style.width=Math.max(5,pct(x.end)-pct(x.start))+'%';e.textContent=`${fmt(x.start)} – ${fmt(x.end)} · ${owner(x.kind)}${/uat/i.test(x.title||'')?' (UAT)':''}`;track.appendChild(e)});
    const rail=d.createElement('div');rail.className='ux11-rail';track.appendChild(rail);
    xs.forEach((item,i)=>{
      const diamond=d.createElement('button');diamond.type='button';diamond.className='ux11-diamond '+item.kind;diamond.style.left=pct(item.start)+'%';diamond.dataset.idx=String(i);diamond.setAttribute('aria-label',`Abrir ${fmt(item.start)} ${item.title}`);track.appendChild(diamond);
      const card=d.createElement('button');card.type='button';card.className='ux11-card '+item.kind;card.dataset.idx=String(i);const date=item.end>item.start?`${fmt(item.start)} a ${fmt(item.end)}`:fmt(item.start);card.innerHTML=`<div class="date">${esc(date)}</div><div class="title">${esc(item.title||item.value||'Marco')}</div>`;track.appendChild(card);
      const open=e=>{e.preventDefault();e.stopPropagation();show(t,board,xs,i)};
      diamond.onclick=open;card.onclick=open;
    });
    // Delegated fallback in case another script replaces direct handlers.
    board.onclick=e=>{
      const target=e.target.closest?.('.ux11-diamond,.ux11-card');if(!target)return;
      const idx=Number(target.dataset.idx);if(Number.isInteger(idx)){e.preventDefault();e.stopPropagation();show(t,board,xs,idx)}
    };
    place(board,xs);
    detailHost(t);
    lastW=w;lastXs=xs;
    // The first place() runs before layout settles, so the track still reports its
    // pre-layout width and the right-most card lands past the real edge. Re-place
    // once the frame has painted, and again whenever the timeline is resized.
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
      const src=w.document.querySelector('#timeline .timeline-source');
      if(src){let timer=null;new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(()=>build(w,true),90)}).observe(src,{childList:true,subtree:true,characterData:true})}
    }
    return ok;
  }

  frame.addEventListener('load',()=>{let n=0;const timer=setInterval(()=>{if(install()||++n>40)clearInterval(timer)},250)});
  if(frame.contentDocument?.readyState==='complete')setTimeout(install,50);
})();