(()=>{
  const frame=document.getElementById('app');
  if(!frame)return;

  const DAY=86400000;
  const START=new Date('2026-08-17T00:00:00');
  const END=new Date('2026-11-13T00:00:00');
  const TOTAL=Math.round((END-START)/DAY);
  const fmtDate=d=>`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
  const parseDM=s=>{const m=String(s||'').match(/(\d{1,2})\D+(\d{1,2})/);return m?new Date(2026,Number(m[2])-1,Number(m[1])):null};
  const pct=d=>Math.max(0,Math.min(100,((d-START)/DAY)/TOTAL*100));
  const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const months=[['AGOSTO','17/08','31/08'],['SETEMBRO','01/09','30/09'],['OUTUBRO','01/10','31/10'],['NOVEMBRO','01/11','13/11']];
  const sprints=[['Sprint 15','21/08','07/09',true],['Sprint 16','08/09','22/09'],['Sprint 17','23/09','07/10'],['Sprint 18','08/10','22/10'],['Sprint 19','23/10','05/11'],['Sprint 20','06/11','13/11']];
  const ticks=['17/08','24/08','31/08','07/09','14/09','21/09','28/09','05/10','12/10','19/10','26/10','02/11','09/11','13/11'];

  const kindFor=item=>{
    const t=`${item.label||''} ${item.tag||''} ${item.title||''} ${item.value||''} ${item.desc||''}`.toLowerCase();
    if(/entrega final|encerramento|conclus[aã]o final/.test(t))return 'final';
    if(/homologa[cç][aã]o de revenue|\bmv\b/.test(t))return 'mv';
    if(/central de projetos/.test(t)&&/homologa/.test(t))return 'mv';
    if(/sottelli|uat|ajustes|bugs/.test(t))return 'sottelli';
    return 'milestone';
  };
  const ownerFor=k=>k==='mv'?'MV':k==='sottelli'?'Sottelli':k==='final'?'Projeto Nexus':'Sottelli';
  const categoryFor=item=>{const t=(item.title||'').toLowerCase();if(/homologa/.test(t))return 'Homologação';if(/uat|teste/.test(t))return 'Testes';if(/ajuste|bug/.test(t))return 'Ajustes';if(/entrega|conclu/.test(t))return 'Desenvolvimento';return 'Planejamento'};
  const statusFor=item=>{const t=`${item.tag||''} ${item.title||''}`.toLowerCase();if(/entregue|conclu|final/.test(t))return 'Concluído';if(/uat|homologa|andamento/.test(t))return 'Em andamento';return 'Planejado'};

  function readItems(w){
    try{if(typeof w.readTimelineItems==='function')return w.readTimelineItems()}catch(e){}
    const d=w.document,items=[];
    d.querySelectorAll('#timeline .timeline-source .month-group').forEach(g=>{
      const month=g.querySelector('.month-header strong')?.textContent||'';
      g.querySelectorAll('.milestone-card').forEach(card=>{
        const raw=card.querySelector('.date-row strong')?.textContent||'';
        const nums=raw.match(/\d+/g)||[];
        if(nums.length<2)return;
        const a=`${String(nums[0]).padStart(2,'0')}/${String(nums[1]).padStart(2,'0')}`;
        const b=nums.length>=4?`${String(nums[2]).padStart(2,'0')}/${String(nums[3]).padStart(2,'0')}`:a;
        items.push({month,dateText:a+(b!==a?` — ${b}`:''),label:card.querySelector('.date-row span')?.textContent||'',tag:card.querySelector('.tag')?.textContent||'',title:card.querySelector('h3')?.textContent||'',value:card.querySelector('b')?.textContent||'',desc:card.querySelector('p')?.textContent||''});
      });
    });
    return items;
  }

  function normalized(w){
    return readItems(w).map(item=>{
      const p=String(item.dateText||'').split(/\s+[—–-]\s+/),start=parseDM(p[0]),end=parseDM(p[1]||p[0]);
      return {...item,start,end,kind:kindFor(item)};
    }).filter(x=>x.start&&!/^sprint\s+\d+/i.test((x.title||'').trim())&&!/lucas em recife/i.test(x.title||''))
      .sort((a,b)=>a.start-b.start);
  }

  const signature=items=>JSON.stringify(items.map(x=>[x.dateText,x.title,x.value,x.desc,x.kind]));

  function injectStyles(d){
    if(d.getElementById('ux9-style'))return;
    const s=d.createElement('style');s.id='ux9-style';s.textContent=`
      #timeline .calendar-board{display:none!important}
      #timeline{padding-top:2px!important}
      #timeline .ux9-board{min-width:1260px;color:#f5f8fb;padding:8px 8px 2px}
      #timeline .ux9-topline{display:flex;justify-content:flex-end;gap:22px;margin:0 6px 14px;color:#9eb6c8;font-size:10px}
      #timeline .ux9-key{display:flex;align-items:center;gap:7px}.ux9-dot{width:10px;height:10px;border-radius:50%;display:inline-block}.ux9-dot.sottelli{background:#2fd4bf}.ux9-dot.mv{background:#2a9cff}.ux9-diamond-key{width:11px;height:11px;transform:rotate(45deg);background:#ff8d2d;display:inline-block}.ux9-period-key{width:14px;height:11px;border:1px solid #4b7aa0;border-radius:3px;background:#10283e;display:inline-block}
      #timeline .ux9-chart{display:grid;grid-template-columns:82px 1fr;border-top:1px solid #17344d;border-bottom:1px solid #17344d}
      #timeline .ux9-labels{position:relative;height:360px;border-right:1px solid #27465e;font-size:11px;font-weight:800}.ux9-label{position:absolute;left:4px;display:flex;align-items:center;gap:7px}.ux9-label:after{content:'›';color:#88a9be;font-size:18px}.ux9-label.sprints{top:108px}.ux9-label.windows{top:178px}.ux9-label.marks{top:244px}
      #timeline .ux9-track{position:relative;height:360px;background:linear-gradient(180deg,rgba(8,27,43,.35),rgba(8,27,43,.15))}
      #timeline .ux9-month{position:absolute;top:0;height:58px;padding:13px 14px;border-left:1px solid #24465f;border-bottom:1px solid #24465f;font-size:12px;font-weight:900;letter-spacing:.11em}.ux9-month small{display:block;color:#9cb3c3;letter-spacing:0;font-size:10px;margin-top:2px}
      #timeline .ux9-gridline{position:absolute;top:58px;bottom:0;width:1px;background:rgba(51,84,108,.20)}
      #timeline .ux9-tick{position:absolute;top:62px;color:#91aabd;font-size:9px;transform:translateX(-50%);white-space:nowrap}.ux9-tick:after{content:'';display:block;width:1px;height:10px;background:#4b6b83;margin:4px auto 0}
      #timeline .ux9-sprint{position:absolute;top:98px;height:44px;border:1px solid #3d6380;border-radius:10px;background:#10283e;display:flex;align-items:center;justify-content:center;text-align:center;font-size:10px;font-weight:800;line-height:1.3;box-shadow:0 6px 16px rgba(0,0,0,.12)}.ux9-sprint.current{border-color:#2fd4bf;background:rgba(18,72,69,.72)}
      #timeline .ux9-window{position:absolute;top:166px;height:36px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 12px}.ux9-window.sottelli{background:rgba(15,92,84,.68);border:1px solid #2fd4bf}.ux9-window.mv{background:rgba(24,69,112,.85);border:1px solid #2a9cff}
      #timeline .ux9-rail{position:absolute;left:0;right:0;top:246px;height:2px;background:#41637b}
      #timeline .ux9-diamond{position:absolute;top:237px;width:18px;height:18px;transform:translateX(-50%) rotate(45deg);border:2px solid #071b2a;background:#ff8d2d;box-shadow:0 0 0 1px #ffb36e;cursor:pointer;z-index:7;padding:0}.ux9-diamond.sottelli{background:#2fd4bf;box-shadow:0 0 0 1px #8cebdc}.ux9-diamond.mv{background:#2a9cff;box-shadow:0 0 0 1px #8bc8ff}.ux9-diamond.final{background:#46dda8;box-shadow:0 0 0 1px #94f0d1}.ux9-diamond.active{box-shadow:0 0 0 2px #fff,0 0 0 5px rgba(47,212,191,.25)}
      #timeline .ux9-card{position:absolute;height:50px;border-radius:8px;border:1px solid #31526a;border-left:3px solid #ff8d2d;background:linear-gradient(180deg,#102a40,#0d2336);padding:7px 9px;color:#fff;cursor:pointer;box-shadow:0 8px 18px rgba(0,0,0,.13);z-index:5;text-align:left;transition:transform .12s ease,border-color .12s ease}.ux9-card:before{content:'';position:absolute;top:var(--stem-top);left:var(--stem-x);height:var(--stem-height);width:1px;background:#41637b}.ux9-card.sottelli{border-left-color:#2fd4bf}.ux9-card.mv{border-left-color:#2a9cff}.ux9-card.final{border-left-color:#46dda8}.ux9-card:hover,.ux9-card.active{border-color:#2fd4bf;transform:translateY(-1px)}.ux9-card .date{font-size:9px;font-weight:900;color:#cfe0ea;margin-bottom:2px}.ux9-card .title{font-size:10px;font-weight:800;line-height:1.15;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
      #timeline .ux9-hint{margin:12px 0 0;color:#8da8bd;font-size:10px;display:flex;align-items:center;gap:7px}.ux9-hint:before{content:'☝';font-size:12px}
      #timeline .ux9-detail{display:none;margin:14px 0 6px;border:1px solid #28506e;border-radius:12px;background:linear-gradient(180deg,#0c2438,#081c2d);grid-template-columns:1.15fr 1fr;overflow:hidden}.ux9-detail.open{display:grid}.ux9-detail-main{padding:18px 22px}.ux9-detail-side{padding:18px 22px;border-left:1px solid #23435d}.ux9-detail-kicker{font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:#2fd4bf;font-weight:900;margin-bottom:7px}.ux9-detail h3{margin:0 0 13px;font-size:20px}.ux9-meta{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;border-top:1px solid #1e3b53;padding-top:13px}.ux9-meta span{font-size:9px;color:#83a1b5}.ux9-meta b{display:block;color:#fff;font-size:10px;margin-top:4px}.ux9-detail-side h4{margin:0 0 7px;color:#91aabd;font-size:9px;text-transform:uppercase;letter-spacing:.08em}.ux9-detail-side p{margin:0 0 14px;color:#c1d2dd;font-size:11px;line-height:1.55}.ux9-status{display:inline-block;border-radius:999px;padding:4px 9px;background:#16483f;color:#7ff0ce}
      @media(max-width:980px){#timeline .ux9-board{min-width:1180px}.ux9-detail.open{grid-template-columns:1fr}.ux9-detail-side{border-left:0;border-top:1px solid #23435d}}
    `;d.head.appendChild(s)
  }

  function placeCards(board,items){
    const track=board.querySelector('.ux9-track');if(!track)return;
    const width=track.clientWidth||1200,cards=[...track.querySelectorAll('.ux9-card')],gap=8,rows=[[]];
    cards.forEach((card,i)=>{
      const item=items[i],anchor=width*pct(item.start)/100,title=item.title||'',cw=title.length>28?146:title.length>18?134:120;
      card.style.width=cw+'px';
      const desired=Math.max(0,Math.min(width-cw,anchor-cw/2));let chosen=null;
      for(let r=0;r<rows.length;r++){
        let left=desired;const last=rows[r].at(-1);if(last&&left<last.right+gap)left=last.right+gap;
        if(left+cw<=width){chosen={r,left};break}
      }
      if(!chosen){rows.push([]);chosen={r:rows.length-1,left:desired}}
      const top=276+chosen.r*58;card.style.left=chosen.left+'px';card.style.top=top+'px';
      const sx=Math.max(8,Math.min(cw-8,anchor-chosen.left)),stem=top-255;card.style.setProperty('--stem-x',sx+'px');card.style.setProperty('--stem-top',(-stem)+'px');card.style.setProperty('--stem-height',stem+'px');rows[chosen.r].push({left:chosen.left,right:chosen.left+cw})
    });
    const height=360+Math.max(0,rows.length-1)*58;track.style.height=height+'px';const labels=board.querySelector('.ux9-labels');if(labels)labels.style.height=height+'px'
  }

  function openDetail(board,items,idx){
    const item=items[idx];if(!item)return;
    board.querySelectorAll('.ux9-card,.ux9-diamond').forEach(x=>x.classList.remove('active'));
    board.querySelector(`.ux9-card[data-idx="${idx}"]`)?.classList.add('active');board.querySelector(`.ux9-diamond[data-idx="${idx}"]`)?.classList.add('active');
    const detail=board.querySelector('.ux9-detail'),main=board.querySelector('.ux9-detail-main'),side=board.querySelector('.ux9-detail-side');
    const dateLabel=item.end>item.start?`${fmtDate(item.start)} a ${fmtDate(item.end)}`:fmtDate(item.start);
    main.innerHTML=`<div class="ux9-detail-kicker">DETALHE DO MARCO</div><h3>${esc(dateLabel)} · ${esc(item.title||'Marco')}</h3><div class="ux9-meta"><span>Data<b>${esc(fmtDate(item.start)+'/2026')}</b></span><span>Responsável<b>${esc(ownerFor(item.kind))}</b></span><span>Categoria<b>${esc(categoryFor(item))}</b></span><span>Status<b><i class="ux9-status">${esc(statusFor(item))}</i></b></span></div>`;
    side.innerHTML=`<h4>Descrição</h4><p>${esc(item.desc||'Sem descrição complementar.')}</p><h4>Observações</h4><p>${esc(item.value||item.tag||'Sem observações adicionais.')}</p>`;
    detail.classList.add('open');
  }

  function build(w,force=false){
    const d=w.document,t=d.getElementById('timeline');if(!t)return false;
    injectStyles(d);
    const items=normalized(w).slice(0,7);if(!items.length)return false;
    const sig=signature(items);
    let board=t.querySelector('.ux9-board');
    if(board&&board.dataset.signature===sig&&!force){placeCards(board,items);return true}
    if(board)board.remove();
    board=d.createElement('div');board.className='ux9-board';board.dataset.signature=sig;
    board.innerHTML=`<div class="ux9-topline"><span class="ux9-key"><i class="ux9-dot sottelli"></i>Sottelli</span><span class="ux9-key"><i class="ux9-dot mv"></i>MV</span><span class="ux9-key"><i class="ux9-diamond-key"></i>Marco</span><span class="ux9-key"><i class="ux9-period-key"></i>Período/Sprint</span></div><div class="ux9-chart"><div class="ux9-labels"><div class="ux9-label sprints">Sprints</div><div class="ux9-label windows">Janelas</div><div class="ux9-label marks">Marcos</div></div><div class="ux9-track"></div></div><div class="ux9-hint">Clique no losango ou no quadro do marco para ver a explicação.</div><div class="ux9-detail"><div class="ux9-detail-main"></div><div class="ux9-detail-side"></div></div>`;
    t.prepend(board);
    const track=board.querySelector('.ux9-track');
    months.forEach(([name,a,b])=>{const da=parseDM(a),db=parseDM(b),m=d.createElement('div');m.className='ux9-month';m.style.left=pct(da)+'%';m.style.width=(pct(db)-pct(da)+100/TOTAL)+'%';m.innerHTML=`${name}<small>2026</small>`;track.appendChild(m);const line=d.createElement('div');line.className='ux9-gridline';line.style.left=pct(da)+'%';track.appendChild(line)});
    ticks.forEach(x=>{const e=d.createElement('div');e.className='ux9-tick';e.style.left=pct(parseDM(x))+'%';e.textContent=x;track.appendChild(e)});
    sprints.forEach(([name,a,b,current])=>{const e=d.createElement('div');e.className='ux9-sprint'+(current?' current':'');e.style.left=pct(parseDM(a))+'%';e.style.width=Math.max(4,pct(parseDM(b))-pct(parseDM(a)))+'%';e.innerHTML=`${name}<br>${a} – ${b}`;track.appendChild(e)});
    items.filter(x=>x.end>x.start&&(/uat/i.test(x.title||'')||/homologa[cç][aã]o de revenue/i.test(x.title||''))).slice(0,2).forEach(x=>{const e=d.createElement('div');e.className='ux9-window '+x.kind;e.style.left=pct(x.start)+'%';e.style.width=Math.max(5,pct(x.end)-pct(x.start))+'%';e.textContent=`${fmtDate(x.start)} – ${fmtDate(x.end)} · ${ownerFor(x.kind)}${/uat/i.test(x.title||'')?' (UAT)':''}`;track.appendChild(e)});
    const rail=d.createElement('div');rail.className='ux9-rail';track.appendChild(rail);
    items.forEach((item,i)=>{
      const diamond=d.createElement('button');diamond.type='button';diamond.className='ux9-diamond '+item.kind;diamond.style.left=pct(item.start)+'%';diamond.dataset.idx=String(i);diamond.setAttribute('aria-label',`Abrir ${fmtDate(item.start)} ${item.title}`);track.appendChild(diamond);
      const card=d.createElement('button');card.type='button';card.className='ux9-card '+item.kind;card.dataset.idx=String(i);const dateLabel=item.end>item.start?`${fmtDate(item.start)} a ${fmtDate(item.end)}`:fmtDate(item.start);card.innerHTML=`<div class="date">${esc(dateLabel)}</div><div class="title">${esc(item.title||item.value||'Marco')}</div>`;track.appendChild(card);
      const select=()=>openDetail(board,items,i);diamond.addEventListener('click',select);card.addEventListener('click',select)
    });
    placeCards(board,items);
    if(typeof w.ResizeObserver==='function'){const ro=new w.ResizeObserver(()=>placeCards(board,items));ro.observe(track);board.__ux9ResizeObserver=ro}
    return true;
  }

  function install(){
    const w=frame.contentWindow;if(!w||!w.document?.querySelector('#timeline'))return false;
    const ok=build(w,false);
    if(ok&&!w.__ux9Observer){w.__ux9Observer=true;const d=w.document;let timer=null;new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(()=>build(w,false),90)}).observe(d.querySelector('main')||d.body,{childList:true,subtree:true,characterData:true})}
    return ok;
  }

  frame.addEventListener('load',()=>{let tries=0;const timer=setInterval(()=>{if(install()||++tries>30)clearInterval(timer)},250)});
  if(frame.contentDocument?.readyState==='complete')setTimeout(install,50);
})();
