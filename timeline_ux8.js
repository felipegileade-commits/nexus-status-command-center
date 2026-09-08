(()=>{
  const frame=document.getElementById('app');
  if(!frame)return;
  const DAY=86400000;
  const START=new Date('2026-08-17T00:00:00');
  const END=new Date('2026-11-13T00:00:00');
  const totalDays=Math.round((END-START)/DAY);
  const fmtDate=(d)=>`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
  const parseDM=(s)=>{
    const m=String(s||'').match(/(\d{1,2})\D+(\d{1,2})/);
    if(!m)return null;
    return new Date(2026,Number(m[2])-1,Number(m[1]));
  };
  const pct=(d)=>Math.max(0,Math.min(100,((d-START)/DAY)/totalDays*100));
  const esc=(s)=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const kindFor=(item)=>{
    const t=`${item.label||''} ${item.tag||''} ${item.title||''} ${item.value||''} ${item.desc||''}`.toLowerCase();
    if(/entrega final|encerramento|conclus[aã]o final/.test(t))return 'final';
    if(/homologa[cç][aã]o de revenue|\bmv\b/.test(t))return 'mv';
    if(/central de projetos/.test(t)&&/homologa/.test(t))return 'mv';
    if(/sottelli|uat|ajustes|bugs/.test(t))return 'sottelli';
    return 'milestone';
  };
  const colorName=(kind)=>kind==='mv'?'MV':kind==='sottelli'?'Sottelli':kind==='final'?'Projeto Nexus':'Marco';
  const statusFor=(item)=>{
    const t=`${item.tag||''} ${item.title||''}`.toLowerCase();
    if(/entregue|conclu|final/.test(t))return 'Concluído';
    if(/uat|homologa|andamento/.test(t))return 'Em andamento';
    return 'Planejado';
  };
  const categoryFor=(item)=>{
    const t=(item.title||'').toLowerCase();
    if(/homologa/.test(t))return 'Homologação';
    if(/uat|teste/.test(t))return 'Testes';
    if(/ajuste|bug/.test(t))return 'Ajustes';
    if(/entrega|conclu/.test(t))return 'Desenvolvimento';
    return 'Planejamento';
  };
  const months=[
    ['AGOSTO','2026-08-17','2026-08-31'],
    ['SETEMBRO','2026-09-01','2026-09-30'],
    ['OUTUBRO','2026-10-01','2026-10-31'],
    ['NOVEMBRO','2026-11-01','2026-11-13']
  ];
  const sprints=[
    ['Sprint 15','21/08','07/09','current'],['Sprint 16','08/09','22/09',''],['Sprint 17','23/09','07/10',''],
    ['Sprint 18','08/10','22/10',''],['Sprint 19','23/10','05/11',''],['Sprint 20','06/11','13/11','']
  ];
  const tickDates=['17/08','24/08','31/08','07/09','14/09','21/09','28/09','05/10','12/10','19/10','26/10','02/11','09/11','13/11'];

  function readItems(w){
    try{
      if(typeof w.readTimelineItems==='function')return w.readTimelineItems();
    }catch(e){}
    const d=w.document,items=[];
    d.querySelectorAll('#timeline .timeline-source .month-group').forEach(g=>{
      const month=g.querySelector('.month-header strong')?.textContent||'';
      g.querySelectorAll('.milestone-card').forEach(card=>{
        const raw=card.querySelector('.date-row strong')?.textContent||'';
        const nums=raw.match(/\d+/g)||[];
        const dateText=nums.length>=2?`${String(nums[0]).padStart(2,'0')}/${String(nums[1]).padStart(2,'0')}`:'';
        let endText=dateText;
        if(nums.length>=4)endText=`${String(nums[2]).padStart(2,'0')}/${String(nums[3]).padStart(2,'0')}`;
        items.push({month,dateText:dateText+(endText!==dateText?` — ${endText}`:''),label:card.querySelector('.date-row span')?.textContent||'',tag:card.querySelector('.tag')?.textContent||'',title:card.querySelector('h3')?.textContent||'',value:card.querySelector('b')?.textContent||'',desc:card.querySelector('p')?.textContent||''});
      });
    });
    return items;
  }

  function normalizeItems(w){
    return readItems(w).map(item=>{
      const raw=String(item.dateText||'');
      const parts=raw.split(/\s+[—–-]\s+/);
      const start=parseDM(parts[0]);
      const end=parseDM(parts[1]||parts[0]);
      return {...item,start,end,kind:kindFor(item)};
    }).filter(x=>x.start && !/^sprint\s+\d+/i.test((x.title||'').trim()) && !/lucas em recife/i.test(x.title||''))
      .sort((a,b)=>a.start-b.start);
  }

  function windowItems(items){
    return items.filter(x=>x.end>x.start && (/uat/i.test(x.title||'') || /homologa[cç][aã]o de revenue/i.test(x.title||''))).slice(0,2);
  }

  function injectStyles(d){
    if(d.getElementById('ux8-style'))return;
    const s=d.createElement('style');
    s.id='ux8-style';
    s.textContent=`
      #timeline .calendar-board{display:none!important}
      #timeline{padding-top:2px!important}
      #timeline .ux8-board{min-width:1260px;color:#f5f8fb;padding:8px 8px 2px}
      #timeline .ux8-topline{display:flex;align-items:center;justify-content:flex-end;gap:22px;margin:0 6px 14px;color:#9eb6c8;font-size:10px}
      #timeline .ux8-key{display:flex;align-items:center;gap:7px}.ux8-dot{width:10px;height:10px;border-radius:50%;display:inline-block}.ux8-dot.sottelli{background:#2fd4bf}.ux8-dot.mv{background:#2a9cff}.ux8-diamond-key{width:11px;height:11px;transform:rotate(45deg);background:#ff8d2d;display:inline-block}.ux8-period-key{width:14px;height:11px;border:1px solid #4b7aa0;border-radius:3px;display:inline-block;background:#10283e}
      #timeline .ux8-chart{display:grid;grid-template-columns:82px 1fr;gap:0;border-top:1px solid #17344d;border-bottom:1px solid #17344d}
      #timeline .ux8-labels{position:relative;height:370px;border-right:1px solid #27465e;color:#fff;font-size:11px;font-weight:800}
      #timeline .ux8-label{position:absolute;left:4px;display:flex;align-items:center;gap:7px}.ux8-label:after{content:'›';color:#88a9be;font-size:18px}.ux8-label.sprints{top:108px}.ux8-label.windows{top:178px}.ux8-label.marks{top:244px}
      #timeline .ux8-track{position:relative;height:370px;overflow:visible;background:linear-gradient(180deg,rgba(8,27,43,.35),rgba(8,27,43,.15))}
      #timeline .ux8-month{position:absolute;top:0;height:58px;padding:13px 14px;border-left:1px solid #24465f;border-bottom:1px solid #24465f;font-size:12px;font-weight:900;letter-spacing:.11em}.ux8-month small{display:block;color:#9cb3c3;letter-spacing:0;font-size:10px;margin-top:2px}
      #timeline .ux8-gridline{position:absolute;top:58px;bottom:0;width:1px;background:rgba(51,84,108,.20)}
      #timeline .ux8-tick{position:absolute;top:62px;color:#91aabd;font-size:9px;transform:translateX(-50%);white-space:nowrap}.ux8-tick:after{content:'';display:block;width:1px;height:10px;background:#4b6b83;margin:4px auto 0}
      #timeline .ux8-sprint{position:absolute;top:98px;height:44px;border:1px solid #3d6380;border-radius:10px;background:#10283e;display:flex;align-items:center;justify-content:center;text-align:center;font-size:10px;font-weight:800;line-height:1.3;box-shadow:0 6px 16px rgba(0,0,0,.12)}.ux8-sprint.current{border-color:#2fd4bf;background:rgba(18,72,69,.72)}
      #timeline .ux8-window{position:absolute;top:166px;height:36px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 12px}.ux8-window.sottelli{background:rgba(15,92,84,.68);border:1px solid #2fd4bf}.ux8-window.mv{background:rgba(24,69,112,.85);border:1px solid #2a9cff}
      #timeline .ux8-rail{position:absolute;left:0;right:0;top:246px;height:2px;background:#41637b}
      #timeline .ux8-diamond{position:absolute;top:237px;width:18px;height:18px;transform:translateX(-50%) rotate(45deg);border:2px solid #071b2a;background:#ff8d2d;box-shadow:0 0 0 1px #ffb36e;cursor:pointer;z-index:6}.ux8-diamond.sottelli{background:#2fd4bf;box-shadow:0 0 0 1px #8cebdc}.ux8-diamond.mv{background:#2a9cff;box-shadow:0 0 0 1px #8bc8ff}.ux8-diamond.final{background:#46dda8;box-shadow:0 0 0 1px #94f0d1}.ux8-diamond.active{box-shadow:0 0 0 2px #fff,0 0 0 5px rgba(47,212,191,.25)}
      #timeline .ux8-card{position:absolute;top:279px;height:66px;width:150px;border-radius:9px;border:1px solid #31526a;border-left:3px solid #ff8d2d;background:linear-gradient(180deg,#102a40,#0d2336);padding:9px 11px;color:#fff;cursor:pointer;box-shadow:0 10px 22px rgba(0,0,0,.14);z-index:5}.ux8-card:before{content:'';position:absolute;top:-31px;left:var(--stem-x);height:31px;width:1px;background:#41637b}.ux8-card.sottelli{border-left-color:#2fd4bf}.ux8-card.mv{border-left-color:#2a9cff}.ux8-card.final{border-left-color:#46dda8}.ux8-card:hover,.ux8-card.active{border-color:#4d7b99;transform:translateY(-2px)}.ux8-card .date{font-size:10px;font-weight:900;color:#dfeaf1;margin-bottom:4px}.ux8-card .title{font-size:11px;font-weight:800;line-height:1.25;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
      #timeline .ux8-detail{margin:14px 0 6px;border:1px solid #28506e;border-radius:12px;background:linear-gradient(180deg,#0c2438,#081c2d);display:grid;grid-template-columns:1.15fr 1fr;overflow:hidden}.ux8-detail-main{padding:18px 22px}.ux8-detail-side{padding:18px 22px;border-left:1px solid #23435d;background:rgba(5,18,30,.28)}.ux8-detail-kicker{font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:#2fd4bf;font-weight:900;margin-bottom:7px}.ux8-detail h3{margin:0 0 13px;font-size:20px}.ux8-meta{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;border-top:1px solid #1e3b53;padding-top:13px}.ux8-meta span{font-size:9px;color:#83a1b5}.ux8-meta b{display:block;color:#fff;font-size:10px;margin-top:4px}.ux8-detail-side h4{margin:0 0 7px;color:#91aabd;font-size:9px;text-transform:uppercase;letter-spacing:.08em}.ux8-detail-side p{margin:0 0 14px;color:#c1d2dd;font-size:11px;line-height:1.55}.ux8-status{display:inline-block;border-radius:999px;padding:4px 9px;background:#16483f;color:#7ff0ce}
      #timeline .ux8-card:nth-of-type(n){transition:transform .12s ease,border-color .12s ease}
      @media(max-width:980px){#timeline .ux8-board{min-width:1180px}#timeline .ux8-detail{grid-template-columns:1fr}.ux8-detail-side{border-left:0;border-top:1px solid #23435d}}
    `;
    d.head.appendChild(s);
  }

  function build(w){
    const d=w.document,t=d.getElementById('timeline');
    if(!t)return;
    injectStyles(d);
    const items=normalizeItems(w);
    if(!items.length)return;
    let board=t.querySelector('.ux8-board');
    if(board)board.remove();
    board=d.createElement('div');board.className='ux8-board';
    board.innerHTML=`<div class="ux8-topline"><span class="ux8-key"><i class="ux8-dot sottelli"></i>Sottelli</span><span class="ux8-key"><i class="ux8-dot mv"></i>MV</span><span class="ux8-key"><i class="ux8-diamond-key"></i>Marco</span><span class="ux8-key"><i class="ux8-period-key"></i>Período/Sprint</span></div><div class="ux8-chart"><div class="ux8-labels"><div class="ux8-label sprints">Sprints</div><div class="ux8-label windows">Janelas</div><div class="ux8-label marks">Marcos</div></div><div class="ux8-track"></div></div><div class="ux8-detail"><div class="ux8-detail-main"></div><div class="ux8-detail-side"></div></div>`;
    t.prepend(board);
    const track=board.querySelector('.ux8-track');
    months.forEach(([name,a,b])=>{
      const da=new Date(a+'T00:00:00'),db=new Date(b+'T00:00:00');
      const m=d.createElement('div');m.className='ux8-month';m.style.left=pct(da)+'%';m.style.width=(pct(db)-pct(da)+100/totalDays)+'%';m.innerHTML=`${name}<small>2026</small>`;track.appendChild(m);
      const line=d.createElement('div');line.className='ux8-gridline';line.style.left=pct(da)+'%';track.appendChild(line);
    });
    tickDates.forEach(x=>{const dt=parseDM(x);const e=d.createElement('div');e.className='ux8-tick';e.style.left=pct(dt)+'%';e.textContent=x;track.appendChild(e)});
    sprints.forEach(([name,a,b,cur])=>{const da=parseDM(a),db=parseDM(b);const e=d.createElement('div');e.className='ux8-sprint '+cur;e.style.left=pct(da)+'%';e.style.width=Math.max(4,pct(db)-pct(da))+'%';e.innerHTML=`${name}<br>${a} – ${b}`;track.appendChild(e)});
    windowItems(items).forEach(item=>{const e=d.createElement('div');e.className='ux8-window '+item.kind;e.style.left=pct(item.start)+'%';e.style.width=Math.max(5,pct(item.end)-pct(item.start))+'%';e.textContent=`${fmtDate(item.start)} – ${fmtDate(item.end)} · ${colorName(item.kind)}${/uat/i.test(item.title||'')?' (UAT)':''}`;track.appendChild(e)});
    const rail=d.createElement('div');rail.className='ux8-rail';track.appendChild(rail);
    const visible=items.slice(0,7);
    visible.forEach((item,i)=>{
      const x=pct(item.start);
      const diamond=d.createElement('button');diamond.type='button';diamond.className='ux8-diamond '+item.kind;diamond.style.left=x+'%';diamond.setAttribute('aria-label',`${fmtDate(item.start)} ${item.title}`);track.appendChild(diamond);
      const card=d.createElement('button');card.type='button';card.className='ux8-card '+item.kind;card.dataset.idx=String(i);card.innerHTML=`<div class="date">${esc(item.dateText||fmtDate(item.start))}</div><div class="title">${esc(item.title||item.value||'Marco')}</div>`;track.appendChild(card);
      diamond.addEventListener('click',()=>select(i));card.addEventListener('click',()=>select(i));
    });

    const placeCards=()=>{
      const cards=[...track.querySelectorAll('.ux8-card')];
      const width=track.clientWidth||1200,gap=10;
      let prevRight=0;
      const placed=[];
      cards.forEach((card,i)=>{
        const item=visible[i],anchor=width*pct(item.start)/100,cw=card.offsetWidth||150;
        let left=Math.max(0,Math.min(width-cw,anchor-cw/2));
        if(left<prevRight+gap)left=prevRight+gap;
        placed.push({card,item,anchor,cw,left});prevRight=left+cw;
      });
      let overflow=Math.max(0,(placed.at(-1)?.left||0)+(placed.at(-1)?.cw||0)-width);
      if(overflow){
        for(let i=placed.length-1;i>=0;i--){
          placed[i].left=Math.max(0,placed[i].left-overflow);
          if(i<placed.length-1){const maxLeft=placed[i+1].left-gap-placed[i].cw;placed[i].left=Math.min(placed[i].left,maxLeft)}
        }
      }
      placed.forEach(p=>{p.card.style.left=p.left+'px';p.card.style.setProperty('--stem-x',Math.max(8,Math.min(p.cw-8,p.anchor-p.left))+'px')});
    };
    const select=(idx)=>{
      const item=visible[idx];if(!item)return;
      board.querySelectorAll('.ux8-card,.ux8-diamond').forEach(x=>x.classList.remove('active'));
      const card=board.querySelector(`.ux8-card[data-idx="${idx}"]`);if(card)card.classList.add('active');
      const ds=[...board.querySelectorAll('.ux8-diamond')];if(ds[idx])ds[idx].classList.add('active');
      const main=board.querySelector('.ux8-detail-main'),side=board.querySelector('.ux8-detail-side');
      main.innerHTML=`<div class="ux8-detail-kicker">MARCO</div><h3>${esc(item.dateText||fmtDate(item.start))} – ${esc(item.title||'Marco')}</h3><div class="ux8-meta"><span>Data<b>${esc(fmtDate(item.start)+'/2026')}</b></span><span>Responsável<b>${esc(colorName(item.kind))}</b></span><span>Categoria<b>${esc(categoryFor(item))}</b></span><span>Status<b><i class="ux8-status">${esc(statusFor(item))}</i></b></span></div>`;
      side.innerHTML=`<h4>Descrição</h4><p>${esc(item.desc||item.value||'Sem descrição complementar.')}</p><h4>Observações</h4><p>${esc(item.value||item.tag||'Sem observações adicionais.')}</p>`;
    };
    requestAnimationFrame(()=>{placeCards();select(Math.min(1,visible.length-1));});
    if(!board.dataset.resizeBound){board.dataset.resizeBound='1';w.addEventListener('resize',()=>requestAnimationFrame(placeCards));}
  }

  function install(){
    const w=frame.contentWindow;
    if(!w||!w.document?.querySelector('#overview .timeline-panel'))return;
    build(w);
    if(!w.__ux8Observer){
      w.__ux8Observer=true;
      const src=w.document.querySelector('#timeline .timeline-source');
      if(src){new MutationObserver(()=>setTimeout(()=>build(w),50)).observe(src,{childList:true,subtree:true,characterData:true})}
    }
  }
  frame.addEventListener('load',()=>{
    let count=0;
    const timer=setInterval(()=>{install();if(++count>20)clearInterval(timer)},350);
  });
  if(frame.contentDocument?.readyState==='complete')setTimeout(install,50);
})();
