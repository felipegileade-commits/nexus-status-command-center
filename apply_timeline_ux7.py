from pathlib import Path

p = Path('index.html')
s = p.read_text()

# Start from stable UX5 wrapper and add a new, independent executive timeline.
s = s.replace("frame.src='/legacy-index.html?v=20260908-ux5';", "frame.src='/legacy-index.html?v=20260908-ux7';")

css_marker = "      @media(max-width:980px){#timeline .timeline-detail.open{grid-template-columns:1fr}#timeline .timeline-detail-main{border-right:0;border-bottom:1px solid #24435d}}\n"
css = r'''      /* UX7_EXECUTIVE_TIMELINE */
      #timeline .calendar-board{min-width:0!important;width:100%!important;padding:6px 0 8px!important}
      #timeline .calendar-grid,#timeline .calendar-legend,#timeline .calendar-caption{display:none!important}
      #timeline .timeline-detail{display:none!important}
      #timeline .ux7-shell{min-width:1480px;padding:6px 8px 2px}
      #timeline .ux7-toolbar{display:flex;justify-content:flex-end;gap:22px;align-items:center;padding:0 8px 14px;color:#9eb7c8;font-size:10px}
      #timeline .ux7-toolbar span{display:flex;gap:7px;align-items:center;white-space:nowrap}
      #timeline .ux7-dot{width:10px;height:10px;border-radius:50%;display:inline-block}
      #timeline .ux7-dot.diamond{border-radius:2px;transform:rotate(45deg)}
      #timeline .ux7-grid{display:grid;grid-template-columns:96px repeat(85,minmax(13px,1fr));grid-template-rows:74px 64px 60px 166px;position:relative}
      #timeline .ux7-month{grid-row:1;padding:12px 14px 8px;border-left:1px solid #294b64;border-bottom:1px solid #294b64;background:rgba(7,24,39,.28);font-size:12px;font-weight:800;letter-spacing:.12em;color:#fff}
      #timeline .ux7-month small{display:block;margin-top:3px;color:#7995aa;font-size:9px;letter-spacing:0;font-weight:600}
      #timeline .ux7-month-ticks{display:flex;justify-content:space-between;gap:8px;margin-top:11px;color:#718ca1;font-size:8px;letter-spacing:0;font-weight:500}
      #timeline .ux7-lane-label{grid-column:1;display:flex;align-items:center;padding-left:4px;border-right:1px solid #294b64;color:#d8e7f0;font-size:11px;font-weight:800}
      #timeline .ux7-lane-label.sprints{grid-row:2}.ux7-lane-label.windows{grid-row:3}.ux7-lane-label.marks{grid-row:4}
      #timeline .ux7-sprint{grid-row:2;align-self:center;height:42px;margin:0 5px;border:1px solid #42627a;border-radius:11px;background:#10283e;display:flex;align-items:center;justify-content:center;text-align:center;color:#fff;font-size:10px;font-weight:750;line-height:1.25;box-shadow:0 6px 18px rgba(0,0,0,.08)}
      #timeline .ux7-sprint.current{border-color:#2fd4bf;background:#10383b;box-shadow:0 0 0 1px rgba(47,212,191,.12)}
      #timeline .ux7-window{grid-row:3;align-self:center;height:30px;margin:0 5px;border:1px solid #2fd4bf;border-radius:999px;background:#123b3d;display:flex;align-items:center;justify-content:center;color:#fff;font-size:9px;font-weight:750;white-space:nowrap;overflow:hidden;padding:0 12px}
      #timeline .ux7-window.mv{border-color:#2a9cff;background:#153d63}
      #timeline .ux7-today{grid-row:2/5;align-self:stretch;justify-self:center;width:0;border-left:1px dashed #2fd4bf;z-index:2;position:relative;pointer-events:none;opacity:.9}
      #timeline .ux7-today span{position:absolute;top:60px;left:0;transform:translate(-50%,-50%);background:#2fd4bf;color:#06211e;border-radius:999px;padding:4px 8px;font-size:8px;font-weight:900;white-space:nowrap}
      #timeline .ux7-marklane{grid-column:2/87;grid-row:4;display:grid;grid-template-columns:repeat(85,minmax(13px,1fr));grid-template-rows:36px 124px;position:relative}
      #timeline .ux7-marklane:before{content:"";position:absolute;left:0;right:0;top:18px;height:2px;background:#36536a;z-index:1}
      #timeline .ux7-mark{grid-row:1;align-self:center;justify-self:center;width:18px;height:18px;transform:rotate(45deg);z-index:5;border:2px solid #07111d;box-shadow:0 0 0 1px currentColor;cursor:pointer;transition:transform .15s ease,box-shadow .15s ease}
      #timeline .ux7-mark:hover{transform:rotate(45deg) scale(1.12)}
      #timeline .ux7-mark.selected{box-shadow:0 0 0 2px rgba(255,255,255,.18),0 0 0 5px rgba(47,212,191,.22)}
      #timeline .ux7-mark.orange{background:#ff8d2d;color:#ffb46f}.ux7-mark.teal{background:#2fd4bf;color:#78f1dc}.ux7-mark.blue{background:#2a9cff;color:#8bc8ff}.ux7-mark.green{background:#46dda8;color:#91f3d6}
      #timeline .ux7-stem{grid-row:1/3;justify-self:center;width:1px;height:48px;margin-top:18px;background:#2b6584;opacity:.8;z-index:2}
      #timeline .ux7-card{grid-row:2;align-self:start;min-height:68px;margin:5px 5px 0;padding:10px 12px;border:1px solid #294b64;border-left:3px solid #42627a;border-radius:10px;background:linear-gradient(180deg,#102b43,#0e263b);cursor:pointer;z-index:4;box-shadow:0 10px 22px rgba(0,0,0,.12);transition:transform .15s ease,border-color .15s ease,background .15s ease}
      #timeline .ux7-card:hover{transform:translateY(-2px);border-color:#4a7695;background:linear-gradient(180deg,#123049,#102a40)}
      #timeline .ux7-card.selected{border-color:#2fd4bf;box-shadow:0 0 0 1px rgba(47,212,191,.22),0 10px 22px rgba(0,0,0,.15)}
      #timeline .ux7-card b{display:block;margin:0 0 5px;color:#cfe0eb;font-size:9px;line-height:1.2}
      #timeline .ux7-card span{display:block;color:#fff;font-size:11px;font-weight:750;line-height:1.3}
      #timeline .ux7-card.orange{border-left-color:#ff8d2d}.ux7-card.teal{border-left-color:#2fd4bf}.ux7-card.blue{border-left-color:#2a9cff}.ux7-card.green{border-left-color:#46dda8}
      #timeline .ux7-detail{display:none;margin:14px 8px 2px;border:1px solid #28506e;border-radius:14px;background:linear-gradient(180deg,#0d253a,#091c2d);overflow:hidden;box-shadow:0 14px 32px rgba(0,0,0,.16)}
      #timeline .ux7-detail.open{display:grid;grid-template-columns:1.2fr 1fr}
      #timeline .ux7-detail-main{padding:20px 24px;border-right:1px solid #24435d;position:relative}.ux7-detail-side{padding:20px 24px;background:rgba(8,24,39,.42)}
      #timeline .ux7-detail-kicker{font-size:9px;color:#2fd4bf;text-transform:uppercase;letter-spacing:.12em;font-weight:850;margin-bottom:8px}
      #timeline .ux7-detail h3{font-size:19px;line-height:1.25;margin:0 0 9px;color:#fff}.ux7-detail p{font-size:11px;line-height:1.6;margin:0;color:#bed0dc}
      #timeline .ux7-detail-close{position:absolute;right:16px;top:14px;border:0;background:transparent;color:#b8cbd8;font-size:20px;line-height:1;cursor:pointer}
      #timeline .ux7-hint{display:flex;justify-content:space-between;gap:18px;padding:12px 8px 3px;border-top:1px solid #18364f;color:#829db1;font-size:9px}
      @media(max-width:980px){#timeline .ux7-shell{min-width:1400px}#timeline .ux7-detail.open{grid-template-columns:1fr}#timeline .ux7-detail-main{border-right:0;border-bottom:1px solid #24435d}}
'''
if 'UX7_EXECUTIVE_TIMELINE' not in s:
    if css_marker not in s:
        raise SystemExit('CSS marker not found')
    s = s.replace(css_marker, css + css_marker, 1)

func_marker = "  function watchTimeline(w){\n"
func = r'''  function buildExecutiveUX7(w){
    const d=w.document;
    const timeline=d.getElementById('timeline');
    const board=timeline?.querySelector('.calendar-board');
    const source=timeline?.querySelector('.timeline-source');
    if(!timeline||!board||!source)return;
    board.querySelectorAll('.ux7-shell').forEach(x=>x.remove());

    const parseSource=()=>{
      const out=[];
      source.querySelectorAll('.month-group .milestone').forEach(m=>{
        const dateText=m.querySelector('.date-row strong')?.textContent.trim()||'';
        const title=m.querySelector('h3')?.textContent.trim()||'';
        const value=m.querySelector('b')?.textContent.trim()||'';
        const desc=m.querySelector('p')?.textContent.trim()||'';
        const label=m.querySelector('.date-row span')?.textContent.trim()||'';
        const pairs=[...dateText.matchAll(/(\d{1,2})\s+(\d{1,2})/g)].map(x=>({day:+x[1],month:+x[2]}));
        if(!pairs.length)return;
        const start=new Date(2026,pairs[0].month-1,pairs[0].day);
        const end=pairs[1]?new Date(2026,pairs[1].month-1,pairs[1].day):start;
        out.push({dateText,title,value,desc,label,start,end});
      });
      return out;
    };
    const all=parseSource();
    const items=all.filter(x=>x.title&&!/^Sprint\s+\d+/i.test(x.title)&&!/Lucas em Recife/i.test(x.title));
    if(!items.length)return;

    const baseUTC=Date.UTC(2026,7,21);
    const colFor=date=>Math.max(1,Math.min(85,Math.round((Date.UTC(date.getFullYear(),date.getMonth(),date.getDate())-baseUTC)/86400000)+1));
    const fmt=date=>String(date.getDate()).padStart(2,'0')+'/'+String(date.getMonth()+1).padStart(2,'0');
    const displayDate=x=>x.start.getTime()===x.end.getTime()?fmt(x.start):fmt(x.start)+' – '+fmt(x.end);
    const colorFor=x=>{
      if(/Plano de Virada|Desenvolvimento conclu[ií]do/i.test(x.title))return'orange';
      if(/Homologa[cç][aã]o de Revenue|Homologa[cç][aã]o da Central/i.test(x.title))return'blue';
      if(/Entrega final/i.test(x.title))return'green';
      return'teal';
    };
    const major=items.map(x=>({...x,startCol:colFor(x.start),endCol:colFor(x.end),color:colorFor(x)})).sort((a,b)=>a.startCol-b.startCol);

    const shell=d.createElement('div');shell.className='ux7-shell';
    const toolbar=d.createElement('div');toolbar.className='ux7-toolbar';
    const legends=[['#2fd4bf','Sottelli',''],['#2a9cff','MV',''],['#ff8d2d','Marco','diamond'],['#46dda8','Atual','diamond']];
    legends.forEach(([color,label,shape])=>{const el=d.createElement('span');const dot=d.createElement('i');dot.className='ux7-dot '+shape;dot.style.background=color;el.append(dot,d.createTextNode(label));toolbar.appendChild(el)});
    shell.appendChild(toolbar);

    const grid=d.createElement('div');grid.className='ux7-grid';
    const months=[['AGOSTO',2,13,['21/08','24/08','31/08']],['SETEMBRO',13,43,['07/09','14/09','21/09','28/09']],['OUTUBRO',43,74,['05/10','12/10','19/10','26/10']],['NOVEMBRO',74,87,['02/11','09/11','13/11']]];
    months.forEach(([name,start,end,ticks])=>{const m=d.createElement('div');m.className='ux7-month';m.style.gridColumn=`${start}/${end}`;m.innerHTML=`${name}<small>2026</small>`;const t=d.createElement('div');t.className='ux7-month-ticks';ticks.forEach(v=>{const s=d.createElement('span');s.textContent=v;t.appendChild(s)});m.appendChild(t);grid.appendChild(m)});
    [['sprints','Sprints'],['windows','Janelas'],['marks','Marcos']].forEach(([cl,txt])=>{const el=d.createElement('div');el.className='ux7-lane-label '+cl;el.textContent=txt;grid.appendChild(el)});

    const sprintDefs=[['Sprint 15','21/08','07/09',2,20],['Sprint 16','08/09','22/09',20,35],['Sprint 17','23/09','07/10',35,50],['Sprint 18','08/10','22/10',50,65],['Sprint 19','23/10','05/11',65,79],['Sprint 20','06/11','13/11',79,87]];
    const metaDate=d.querySelector('.topbar .meta small')?.textContent.trim()||'08/09/2026';
    const md=metaDate.match(/(\d{2})\/(\d{2})\/(\d{4})/);const current=md?new Date(+md[3],+md[2]-1,+md[1]):new Date(2026,8,8);
    const parseDM=v=>{const [dd,mm]=v.split('/').map(Number);return new Date(2026,mm-1,dd)};
    sprintDefs.forEach(([name,st,en,c1,c2])=>{const el=d.createElement('div');el.className='ux7-sprint';if(current>=parseDM(st)&&current<=parseDM(en))el.classList.add('current');el.style.gridColumn=`${c1}/${c2}`;el.innerHTML=`${name}<br>${st} – ${en}`;grid.appendChild(el)});

    major.filter(x=>x.endCol>x.startCol).forEach(x=>{const el=d.createElement('div');el.className='ux7-window'+(x.color==='blue'?' mv':'');el.style.gridColumn=`${x.startCol+1}/${Math.min(87,x.endCol+2)}`;el.textContent=displayDate(x)+' · '+(x.color==='blue'?'MV':'Sottelli');grid.appendChild(el)});

    const todayCol=colFor(current);if(todayCol>=1&&todayCol<=85){const t=d.createElement('div');t.className='ux7-today';t.style.gridColumn=String(todayCol+1);const badge=d.createElement('span');badge.textContent='Hoje';t.appendChild(badge);grid.appendChild(t)}

    const lane=d.createElement('div');lane.className='ux7-marklane';grid.appendChild(lane);
    let prevEnd=0;const cardMap=new Map();
    major.forEach(x=>{
      const span=x.title.length>42?11:x.title.length>28?10:x.title.length>18?9:8;
      let cs=Math.max(1,x.startCol-Math.max(1,Math.floor(span/3)));cs=Math.max(cs,prevEnd+1);let ce=cs+span;
      if(ce>86){cs=Math.max(prevEnd+1,86-span);ce=cs+span}if(ce>86)ce=86;
      prevEnd=ce;
      const mark=d.createElement('div');mark.className='ux7-mark '+x.color;mark.style.gridColumn=String(x.startCol);
      const stem=d.createElement('div');stem.className='ux7-stem';stem.style.gridColumn=String(x.startCol);
      const card=d.createElement('div');card.className='ux7-card '+x.color;card.style.gridColumn=`${cs}/${ce}`;const date=d.createElement('b');date.textContent=displayDate(x);const title=d.createElement('span');title.textContent=x.title;card.append(date,title);
      const key=x.title+'|'+x.dateText;cardMap.set(key,{x,mark,card});lane.append(mark,stem,card);
    });

    const detail=d.createElement('div');detail.className='ux7-detail';detail.innerHTML='<div class="ux7-detail-main"><button type="button" class="ux7-detail-close" aria-label="Fechar">×</button><div class="ux7-detail-kicker">Detalhe do marco</div><h3></h3><p class="ux7-desc"></p></div><div class="ux7-detail-side"><div class="ux7-detail-kicker">Observações</div><p class="ux7-obs"></p></div>';
    const open=(entry)=>{cardMap.forEach(v=>{v.mark.classList.remove('selected');v.card.classList.remove('selected')});entry.mark.classList.add('selected');entry.card.classList.add('selected');detail.querySelector('h3').textContent=displayDate(entry.x)+' – '+entry.x.title;detail.querySelector('.ux7-desc').textContent=entry.x.desc||entry.x.value||'Sem descrição complementar.';const obs=[entry.x.value,entry.x.label].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).join(' · ');detail.querySelector('.ux7-obs').textContent=obs||'Sem observações adicionais.';detail.classList.add('open');detail.scrollIntoView({behavior:'smooth',block:'nearest'})};
    cardMap.forEach(entry=>{entry.mark.onclick=()=>open(entry);entry.card.onclick=()=>open(entry)});
    detail.querySelector('.ux7-detail-close').onclick=()=>{detail.classList.remove('open');cardMap.forEach(v=>{v.mark.classList.remove('selected');v.card.classList.remove('selected')})};

    const hint=d.createElement('div');hint.className='ux7-hint';hint.innerHTML='<span>☝ Clique em um marco para ver a explicação.</span><span><b>Leitura executiva:</b> sprints, janelas e marcos separados para evitar sobreposição.</span>';
    shell.append(grid,detail,hint);board.prepend(shell);
  }

'''
if 'function buildExecutiveUX7(w)' not in s:
    if func_marker not in s:
        raise SystemExit('watchTimeline marker not found')
    s=s.replace(func_marker,func+func_marker,1)

# Make watch logic idempotent and also observe source timeline changes.
start=s.index('  function watchTimeline(w){')
end=s.index('  function applySeed(w,seed){',start)
watch=r'''  function watchTimeline(w){
    installTimelineUX(w);
    const project=w.document.querySelector('#timeline .cal-lane.project');
    if(project&&project.dataset.uxObserved!=='1'){
      project.dataset.uxObserved='1';let timer=null;
      const obs=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(()=>installTimelineUX(w),25)});
      obs.observe(project,{childList:true,subtree:true});
    }
    const source=w.document.querySelector('#timeline .timeline-source');
    if(source&&source.dataset.ux7Observed!=='1'){
      source.dataset.ux7Observed='1';let timer2=null;
      const obs2=new MutationObserver(()=>{clearTimeout(timer2);timer2=setTimeout(()=>buildExecutiveUX7(w),35)});
      obs2.observe(source,{childList:true,subtree:true,characterData:true});
    }
  }

'''
s=s[:start]+watch+s[end:]

# Build the independent timeline after the legacy calendar has rendered.
needle='    getDetailPanel();\n  }\n\n  function buildExecutiveUX7(w)'
if needle in s:
    s=s.replace(needle,'    getDetailPanel();\n    buildExecutiveUX7(w);\n  }\n\n  function buildExecutiveUX7(w)',1)
else:
    raise SystemExit('installTimelineUX end marker not found')

# Do not persist generated UX7 markup to Supabase; rebuild it from canonical timeline-source.
cap="    const d=w.document,clone=d.querySelector('main').cloneNode(true);\n"
if "clone.querySelectorAll('.ux7-shell')" not in s:
    if cap not in s: raise SystemExit('capture marker not found')
    s=s.replace(cap,cap+"    clone.querySelectorAll('.ux7-shell').forEach(x=>x.remove());\n",1)

p.write_text(s)
