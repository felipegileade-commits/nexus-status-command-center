(()=>{
  const frame=document.getElementById('app');
  if(!frame)return;

  const DAY=86400000;
  const START=new Date('2026-08-17T00:00:00');
  const END=new Date('2026-11-13T00:00:00');
  const TOTAL=Math.round((END-START)/DAY);
  const fmt=d=>`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
  const parse=s=>{const m=String(s||'').match(/(\d{1,2})\D+(\d{1,2})/);return m?new Date(2026,Number(m[2])-1,Number(m[1])):null};
  const pct=d=>Math.max(0,Math.min(100,((d-START)/DAY)/TOTAL*100));
  const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const months=[['AGOSTO','17/08','31/08'],['SETEMBRO','01/09','30/09'],['OUTUBRO','01/10','31/10'],['NOVEMBRO','01/11','13/11']];
  const sprints=[['Sprint 15','21/08','07/09',true],['Sprint 16','08/09','22/09'],['Sprint 17','23/09','07/10'],['Sprint 18','08/10','22/10'],['Sprint 19','23/10','05/11'],['Sprint 20','06/11','13/11']];
  const ticks=['17/08','31/08','14/09','28/09','12/10','26/10','09/11','13/11'];

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
    try{if(typeof w.readTimelineItems==='function')return w.readTimelineItems()}catch(e){}
    const d=w.document,out=[];
    d.querySelectorAll('#timeline .timeline-source .month-group').forEach(g=>g.querySelectorAll('.milestone-card').forEach(card=>{
      const raw=card.querySelector('.date-row strong')?.textContent||'',nums=raw.match(/\d+/g)||[];if(nums.length<2)return;
      const a=`${String(nums[0]).padStart(2,'0')}/${String(nums[1]).padStart(2,'0')}`;
      const b=nums.length>=4?`${String(nums[2]).padStart(2,'0')}/${String(nums[3]).padStart(2,'0')}`:a;
      out.push({dateText:a+(b!==a?` — ${b}`:''),label:card.querySelector('.date-row span')?.textContent||'',tag:card.querySelector('.tag')?.textContent||'',title:card.querySelector('h3')?.textContent||'',value:card.querySelector('b')?.textContent||'',desc:card.querySelector('p')?.textContent||''});
    }));
    return out;
  }
  function items(w){
    return read(w).map(x=>{const p=String(x.dateText||'').split(/\s+[—–-]\s+/),start=parse(p[0]),end=parse(p[1]||p[0]);return {...x,start,end,kind:kind(x)}})
      .filter(x=>x.start&&!/^sprint\s+\d+/i.test((x.title||'').trim())&&!/lucas em recife/i.test(x.title||''))
      .sort((a,b)=>a.start-b.start).slice(0,7);
  }
  const signature=xs=>JSON.stringify(xs.map(x=>[x.dateText,x.title,x.value,x.desc,x.kind]));

  function styles(d){
    if(d.getElementById('ux10-style'))return;
    const s=d.createElement('style');s.id='ux10-style';s.textContent=`
      #timeline .calendar-board{display:none!important}
      #timeline{padding-top:0!important}
      #timeline .ux10-board{min-width:1240px;color:#f5f8fb;padding:4px 6px 2px}
      #timeline .ux10-chart{display:grid;grid-template-columns:72px 1fr;border-top:1px solid #17344d;border-bottom:1px solid #17344d}
      #timeline .ux10-labels{position:relative;height:340px;border-right:1px solid #27465e;color:#d7e3eb;font-size:10px;font-weight:800}
      #timeline .ux10-label{position:absolute;left:2px}.ux10-label.sprints{top:104px}.ux10-label.windows{top:168px}.ux10-label.marks{top:230px}
      #timeline .ux10-track{position:relative;height:340px;background:linear-gradient(180deg,rgba(8,27,43,.34),rgba(8,27,43,.12))}
      #timeline .ux10-month{position:absolute;top:0;height:52px;padding:12px 12px;border-left:1px solid #24465f;border-bottom:1px solid #24465f;font-size:11px;font-weight:900;letter-spacing:.10em}.ux10-month small{display:block;color:#829fb2;font-size:9px;letter-spacing:0;margin-top:2px}
      #timeline .ux10-gridline{position:absolute;top:52px;bottom:0;width:1px;background:rgba(51,84,108,.17)}
      #timeline .ux10-tick{position:absolute;top:56px;color:#819eb1;font-size:8px;transform:translateX(-50%);white-space:nowrap}
      #timeline .ux10-sprint{position:absolute;top:86px;height:38px;border:1px solid #3b607c;border-radius:9px;background:#10283e;display:flex;align-items:center;justify-content:center;text-align:center;font-size:9px;font-weight:800;line-height:1.2}.ux10-sprint.current{border-color:#2fd4bf;background:rgba(18,72,69,.70)}
      #timeline .ux10-window{position:absolute;top:151px;height:30px;border-radius:999px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 10px}.ux10-window.sottelli{background:rgba(15,92,84,.70);border:1px solid #2fd4bf}.ux10-window.mv{background:rgba(24,69,112,.86);border:1px solid #2a9cff}
      #timeline .ux10-rail{position:absolute;left:0;right:0;top:222px;height:2px;background:#41637b}
      #timeline .ux10-diamond{position:absolute;top:214px;width:16px;height:16px;transform:translateX(-50%) rotate(45deg);border:2px solid #071b2a;background:#ff8d2d;box-shadow:0 0 0 1px #ffb36e;cursor:pointer;z-index:8;padding:0}.ux10-diamond.sottelli{background:#2fd4bf}.ux10-diamond.mv{background:#2a9cff}.ux10-diamond.final{background:#46dda8}.ux10-diamond.active{box-shadow:0 0 0 2px #fff,0 0 0 5px rgba(47,212,191,.25)}
      #timeline .ux10-card{position:absolute;height:44px;border-radius:8px;border:1px solid #31526a;border-left:3px solid #ff8d2d;background:linear-gradient(180deg,#102a40,#0d2336);padding:6px 8px;color:#fff;cursor:pointer;box-shadow:0 7px 16px rgba(0,0,0,.12);z-index:6;text-align:left}.ux10-card.sottelli{border-left-color:#2fd4bf}.ux10-card.mv{border-left-color:#2a9cff}.ux10-card.final{border-left-color:#46dda8}.ux10-card:hover,.ux10-card.active{border-color:#2fd4bf;transform:translateY(-1px)}.ux10-card .date{font-size:8px;font-weight:900;color:#cfe0ea;margin-bottom:2px}.ux10-card .title{font-size:9px;font-weight:800;line-height:1.12;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
      #timeline .ux10-stem{position:absolute;width:1px;background:#41637b;z-index:3}
      #timeline .ux10-hint{margin:10px 0 0;color:#8da8bd;font-size:10px}
      #timeline .ux10-detail{display:none;margin:12px 0 4px;border:1px solid #2b5878;border-radius:12px;background:linear-gradient(180deg,#0c2438,#081c2d);grid-template-columns:1.1fr 1fr;overflow:hidden;box-shadow:0 14px 32px rgba(0,0,0,.20)}.ux10-detail.open{display:grid}.ux10-detail-main{padding:18px 20px}.ux10-detail-side{padding:18px 20px;border-left:1px solid #23435d}.ux10-detail-kicker{font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:#2fd4bf;font-weight:900;margin-bottom:7px}.ux10-detail h3{margin:0 0 13px;font-size:18px}.ux10-meta{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;border-top:1px solid #1e3b53;padding-top:12px}.ux10-meta span{font-size:8px;color:#83a1b5}.ux10-meta b{display:block;color:#fff;font-size:9px;margin-top:4px}.ux10-detail-side h4{margin:0 0 6px;color:#91aabd;font-size:8px;text-transform:uppercase;letter-spacing:.08em}.ux10-detail-side p{margin:0 0 12px;color:#c1d2dd;font-size:10px;line-height:1.5}.ux10-status{display:inline-block;border-radius:999px;padding:3px 8px;background:#16483f;color:#7ff0ce}
      @media(max-width:980px){#timeline .ux10-board{min-width:1180px}.ux10-detail.open{grid-template-columns:1fr}.ux10-detail-side{border-left:0;border-top:1px solid #23435d}}
    `;d.head.appendChild(s);
  }

  function place(board,xs){
    const track=board.querySelector('.ux10-track'),width=track.clientWidth||1160,gap=7,lanes=[];
    track.querySelectorAll('.ux10-stem').forEach(x=>x.remove());
    [...track.querySelectorAll('.ux10-card')].forEach((card,i)=>{
      const item=xs[i],anchor=width*pct(item.start)/100,title=item.title||'',cw=title.length>28?132:title.length>18?122:108;
      card.style.width=cw+'px';const desired=Math.max(0,Math.min(width-cw,anchor-cw/2));let lane=-1,left=desired;
      for(let r=0;r<lanes.length;r++){
        const overlaps=lanes[r].some(iv=>desired<iv.right+gap&&desired+cw>iv.left-gap);
        if(!overlaps){lane=r;left=desired;break}
      }
      if(lane<0){lane=lanes.length;lanes.push([])}
      lanes[lane].push({left,right:left+cw});
      const top=247+lane*52;card.style.left=left+'px';card.style.top=top+'px';
      const stem=track.ownerDocument.createElement('div');stem.className='ux10-stem';stem.style.left=anchor+'px';stem.style.top='230px';stem.style.height=Math.max(10,top-230)+'px';track.appendChild(stem);
    });
    const h=320+Math.max(0,lanes.length-1)*52;track.style.height=h+'px';board.querySelector('.ux10-labels').style.height=h+'px';
  }

  function show(board,xs,idx){
    const item=xs[idx];if(!item)return;
    board.querySelectorAll('.ux10-card,.ux10-diamond').forEach(x=>x.classList.remove('active'));
    board.querySelector(`.ux10-card[data-idx="${idx}"]`)?.classList.add('active');board.querySelector(`.ux10-diamond[data-idx="${idx}"]`)?.classList.add('active');
    const detail=board.querySelector('.ux10-detail'),main=board.querySelector('.ux10-detail-main'),side=board.querySelector('.ux10-detail-side');
    const date=item.end>item.start?`${fmt(item.start)} a ${fmt(item.end)}`:fmt(item.start);
    main.innerHTML=`<div class="ux10-detail-kicker">DETALHE DO MARCO</div><h3>${esc(date)} · ${esc(item.title||'Marco')}</h3><div class="ux10-meta"><span>Data<b>${esc(fmt(item.start)+'/2026')}</b></span><span>Responsável<b>${esc(owner(item.kind))}</b></span><span>Categoria<b>${esc(category(item))}</b></span><span>Status<b><i class="ux10-status">${esc(status(item))}</i></b></span></div>`;
    side.innerHTML=`<h4>Descrição</h4><p>${esc(item.desc||'Sem descrição complementar.')}</p><h4>Observações</h4><p>${esc(item.value||item.tag||'Sem observações adicionais.')}</p>`;
    detail.classList.add('open');
    setTimeout(()=>detail.scrollIntoView({behavior:'smooth',block:'nearest'}),0);
  }

  function build(w,force=false){
    const d=w.document,t=d.getElementById('timeline');if(!t)return false;styles(d);const xs=items(w);if(!xs.length)return false;
    const sig=signature(xs);let board=t.querySelector('.ux10-board');if(board&&board.dataset.signature===sig&&!force){place(board,xs);return true}
    if(board)board.remove();board=d.createElement('div');board.className='ux10-board';board.dataset.signature=sig;
    board.innerHTML=`<div class="ux10-chart"><div class="ux10-labels"><div class="ux10-label sprints">Sprints</div><div class="ux10-label windows">Janelas</div><div class="ux10-label marks">Marcos</div></div><div class="ux10-track"></div></div><div class="ux10-hint">Clique no losango ou no quadro para abrir os detalhes do marco.</div><div class="ux10-detail"><div class="ux10-detail-main"></div><div class="ux10-detail-side"></div></div>`;
    t.prepend(board);const track=board.querySelector('.ux10-track');
    months.forEach(([name,a,b])=>{const da=parse(a),db=parse(b),m=d.createElement('div');m.className='ux10-month';m.style.left=pct(da)+'%';m.style.width=(pct(db)-pct(da)+100/TOTAL)+'%';m.innerHTML=`${name}<small>2026</small>`;track.appendChild(m);const l=d.createElement('div');l.className='ux10-gridline';l.style.left=pct(da)+'%';track.appendChild(l)});
    ticks.forEach(x=>{const e=d.createElement('div');e.className='ux10-tick';e.style.left=pct(parse(x))+'%';e.textContent=x;track.appendChild(e)});
    sprints.forEach(([n,a,b,c])=>{const e=d.createElement('div');e.className='ux10-sprint'+(c?' current':'');e.style.left=pct(parse(a))+'%';e.style.width=Math.max(4,pct(parse(b))-pct(parse(a)))+'%';e.innerHTML=`${n}<br>${a} – ${b}`;track.appendChild(e)});
    xs.filter(x=>x.end>x.start&&(/uat/i.test(x.title||'')||/homologa[cç][aã]o de revenue/i.test(x.title||''))).slice(0,2).forEach(x=>{const e=d.createElement('div');e.className='ux10-window '+x.kind;e.style.left=pct(x.start)+'%';e.style.width=Math.max(5,pct(x.end)-pct(x.start))+'%';e.textContent=`${fmt(x.start)} – ${fmt(x.end)} · ${owner(x.kind)}`;track.appendChild(e)});
    const rail=d.createElement('div');rail.className='ux10-rail';track.appendChild(rail);
    xs.forEach((x,i)=>{const dia=d.createElement('button');dia.type='button';dia.className='ux10-diamond '+x.kind;dia.style.left=pct(x.start)+'%';dia.dataset.idx=i;dia.setAttribute('aria-label',`Abrir ${fmt(x.start)} ${x.title}`);track.appendChild(dia);const card=d.createElement('button');card.type='button';card.className='ux10-card '+x.kind;card.dataset.idx=i;card.innerHTML=`<div class="date">${esc(x.end>x.start?fmt(x.start)+' a '+fmt(x.end):fmt(x.start))}</div><div class="title">${esc(x.title||x.value||'Marco')}</div>`;track.appendChild(card)});
    board.addEventListener('click',e=>{const el=e.target.closest('.ux10-diamond,.ux10-card');if(!el)return;e.preventDefault();e.stopPropagation();show(board,xs,Number(el.dataset.idx))});
    place(board,xs);if(typeof w.ResizeObserver==='function'){const ro=new w.ResizeObserver(()=>place(board,xs));ro.observe(track);board.__ux10RO=ro}return true;
  }

  function install(){const w=frame.contentWindow;if(!w||!w.document?.querySelector('#timeline'))return false;const ok=build(w,false);if(ok&&!w.__ux10Observer){w.__ux10Observer=true;const src=w.document.querySelector('#timeline .timeline-source');if(src){let timer;new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(()=>build(w,true),80)}).observe(src,{childList:true,subtree:true,characterData:true})}}return ok}
  frame.addEventListener('load',()=>{let n=0;const timer=setInterval(()=>{if(install()||++n>30)clearInterval(timer)},250)});
  if(frame.contentDocument?.readyState==='complete')setTimeout(install,50);
})();