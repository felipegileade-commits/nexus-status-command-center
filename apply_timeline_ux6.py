from pathlib import Path

p = Path('index.html')
s = p.read_text()

if 'UX6_EXECUTIVE_LANES' in s:
    print('UX6 already applied')
    raise SystemExit(0)

s = s.replace("frame.src='/legacy-index.html?v=20260908-ux5';", "frame.src='/legacy-index.html?v=20260908-ux6';")

css_marker = "      @media(max-width:980px){#timeline .timeline-detail.open{grid-template-columns:1fr}#timeline .timeline-detail-main{border-right:0;border-bottom:1px solid #24435d}}\n"
css = r'''      /* UX6_EXECUTIVE_LANES */
      #timeline .calendar-board{min-width:1680px!important;padding:12px 8px 10px!important}
      #timeline .calendar-grid{grid-template-columns:150px repeat(85,minmax(16px,1fr))!important;grid-template-rows:48px 64px 150px!important;border-bottom:1px solid #24445d!important}
      #timeline .cal-sprint-band{grid-row:2/3!important;height:56px!important;margin:4px 5px 0!important;align-self:start!important;border-radius:11px!important;background:rgba(14,40,62,.78)!important}
      #timeline .cal-sprint-band:after{display:none!important}
      #timeline .cal-sprint-title{height:44px!important;margin:6px 8px!important;padding:7px 10px!important;border-radius:10px!important;font-size:10px!important}
      #timeline .cal-row-label{display:none!important}
      #timeline .cal-lane.project{grid-column:2/87!important;grid-template-rows:54px 46px!important;min-height:108px!important;padding-top:0!important;align-self:start!important}
      #timeline .cal-lane.project:before{top:77px!important;height:2px!important;background:#42657f!important;opacity:.95!important}
      #timeline .cal-bar{grid-row:1!important;align-self:center!important;height:30px!important;border-radius:999px!important;z-index:6!important}
      #timeline .cal-mark{grid-row:2!important;align-self:center!important;width:17px!important;height:17px!important;z-index:7!important}
      #timeline .cal-card{display:none!important}
      #timeline .ux6-grid-label{display:flex;align-items:center;justify-content:flex-end;padding-right:14px;color:#c7d7e2;font-size:11px;font-weight:800;letter-spacing:.01em}
      #timeline .ux6-grid-label span{opacity:.95}
      #timeline .ux6-grid-label b{margin-left:7px;color:#6f93ad;font-size:17px;font-weight:400}
      #timeline .ux6-sprint-label{grid-column:1;grid-row:2}
      #timeline .ux6-project-labels{grid-column:1;grid-row:3;display:grid;grid-template-rows:54px 46px}
      #timeline .ux6-project-labels .ux6-grid-label{padding-top:2px}
      #timeline .ux6-milestone-strip{display:grid;gap:12px;padding:12px 8px 4px;align-items:stretch}
      #timeline .ux6-strip-spacer{display:flex;align-items:center;justify-content:flex-end;padding-right:14px;color:#c7d7e2;font-size:11px;font-weight:800}
      #timeline .ux6-strip-spacer b{margin-left:7px;color:#6f93ad;font-size:17px;font-weight:400}
      #timeline .ux6-milestone-card{appearance:none;text-align:left;min-width:0;min-height:72px;border:1px solid #294d68;border-left:3px solid #2fd4bf;border-radius:11px;background:linear-gradient(180deg,#102a40,#0d2438);padding:12px 14px;color:#fff;box-shadow:0 8px 18px rgba(0,0,0,.12);cursor:pointer;transition:transform .15s ease,border-color .15s ease,background .15s ease}
      #timeline .ux6-milestone-card:hover{transform:translateY(-2px);border-color:#4e7895;background:linear-gradient(180deg,#13334c,#102b41)}
      #timeline .ux6-milestone-card.selected{border-color:#2fd4bf;box-shadow:0 0 0 1px rgba(47,212,191,.24),0 10px 24px rgba(0,0,0,.16)}
      #timeline .ux6-milestone-card.orange{border-left-color:#ff8d2d}
      #timeline .ux6-milestone-card.mv{border-left-color:#2a9cff}
      #timeline .ux6-milestone-card.green{border-left-color:#46dda8}
      #timeline .ux6-milestone-date{display:block;color:#f7fbfe;font-size:11px;font-weight:850;margin-bottom:5px;white-space:nowrap}
      #timeline .ux6-milestone-title{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;color:#fff;font-size:12px;font-weight:750;line-height:1.3}
      #timeline .calendar-caption{padding-top:10px!important;margin-top:5px!important}
      #timeline .calendar-caption:before{content:'☝  Clique em um marco para ver a explicação.'!important;margin-bottom:4px!important}
      @media(max-width:1400px){#timeline .calendar-board{min-width:1580px!important}#timeline .calendar-grid{grid-template-columns:135px repeat(85,minmax(15px,1fr))!important}#timeline .ux6-milestone-strip{grid-template-columns:135px repeat(7,minmax(160px,1fr))!important}}
'''
if css_marker not in s:
    raise RuntimeError('CSS marker not found')
s = s.replace(css_marker, css + css_marker, 1)

marker = '    const compactOccupied=[];'
start = s.find(marker)
if start < 0:
    raise RuntimeError('UX5 JS start marker not found')
end_marker = '    getDetailPanel();'
end = s.find(end_marker, start)
if end < 0:
    raise RuntimeError('UX5 JS end marker not found')
end += len(end_marker)

new_js = r'''    const originalStartCol=card=>{
      if(!card.dataset.uxOriginalColumn)card.dataset.uxOriginalColumn=String(card.style.gridColumn||'');
      return parseInt(card.dataset.uxOriginalColumn.split('/')[0].trim(),10)||startCol(card)||1;
    };
    const prepareCard=card=>{
      if(card.dataset.uxCompact==='1'&&card.dataset.timelineTitle)return;
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
    };
    cards.forEach(prepareCard);
    marks.forEach(mark=>mark.style.gridRow='2');
    bars.forEach(bar=>bar.style.gridRow='1');
    project.style.gridTemplateRows='54px 46px';
    if(grid)grid.style.gridTemplateRows='48px 64px 150px';

    let sprintLabel=d.querySelector('#timeline .ux6-sprint-label');
    if(!sprintLabel){
      sprintLabel=d.createElement('div');
      sprintLabel.className='ux6-grid-label ux6-sprint-label';
      sprintLabel.innerHTML='<span>Sprints</span><b>›</b>';
      grid.appendChild(sprintLabel);
    }
    let projectLabels=d.querySelector('#timeline .ux6-project-labels');
    if(!projectLabels){
      projectLabels=d.createElement('div');
      projectLabels.className='ux6-project-labels';
      projectLabels.innerHTML='<div class="ux6-grid-label"><span>Janelas</span><b>›</b></div><div class="ux6-grid-label"><span>Marcos</span><b>›</b></div>';
      grid.appendChild(projectLabels);
    }

    let strip=d.querySelector('#timeline .ux6-milestone-strip');
    if(strip)strip.remove();
    strip=d.createElement('div');
    strip.className='ux6-milestone-strip';
    const sortedCards=cards.slice().sort((a,b)=>originalStartCol(a)-originalStartCol(b));
    strip.style.gridTemplateColumns=`150px repeat(${Math.max(1,sortedCards.length)},minmax(170px,1fr))`;
    const spacer=d.createElement('div');
    spacer.className='ux6-strip-spacer';
    spacer.innerHTML='<span>Detalhes</span><b>›</b>';
    strip.appendChild(spacer);

    const splitHeadline=raw=>{
      const text=String(raw||'').trim();
      let idx=text.indexOf(' · ');
      if(idx<0)idx=text.indexOf(' - ');
      if(idx<0)return {date:'',title:text};
      return {date:text.slice(0,idx).trim(),title:text.slice(idx+3).trim()};
    };
    const nearestMark=card=>{
      const c=originalStartCol(card);
      return marks.map(m=>({m,dist:Math.abs(startCol(m)-c)})).sort((a,b)=>a.dist-b.dist)[0]?.m||null;
    };
    const setSelectedButton=btn=>{
      d.querySelectorAll('#timeline .ux6-milestone-card.selected').forEach(x=>x.classList.remove('selected'));
      if(btn)btn.classList.add('selected');
    };
    sortedCards.forEach(card=>{
      const parts=splitHeadline(card.dataset.timelineTitle||card.querySelector('b')?.textContent||'');
      const btn=d.createElement('button');
      btn.type='button';
      btn.className='ux6-milestone-card';
      if(card.classList.contains('mv'))btn.classList.add('mv');
      else if(card.classList.contains('final')||card.classList.contains('sottelli'))btn.classList.add('green');
      else btn.classList.add('orange');
      btn.innerHTML='<span class="ux6-milestone-date"></span><span class="ux6-milestone-title"></span>';
      btn.querySelector('.ux6-milestone-date').textContent=parts.date;
      btn.querySelector('.ux6-milestone-title').textContent=parts.title||card.dataset.timelineTitle||'Marco';
      btn.onclick=()=>{setSelectedButton(btn);openDetail(card,nearestMark(card));};
      strip.appendChild(btn);
    });
    const caption=d.querySelector('#timeline .calendar-caption');
    if(caption)caption.insertAdjacentElement('beforebegin',strip);
    else d.querySelector('#timeline .calendar-board')?.appendChild(strip);

    marks.forEach(mark=>{
      mark.onclick=()=>{
        const m=startCol(mark);
        const card=sortedCards.map(c=>({c,dist:Math.abs(originalStartCol(c)-m)})).sort((a,b)=>a.dist-b.dist)[0]?.c||null;
        const idx=sortedCards.indexOf(card);
        const btn=idx>=0?strip.querySelectorAll('.ux6-milestone-card')[idx]:null;
        setSelectedButton(btn);
        openDetail(card,mark);
      };
    });
    const detailPanel=getDetailPanel();
    const closeBtn=detailPanel.querySelector('.timeline-detail-close');
    if(closeBtn&&!closeBtn.dataset.ux6Bound){
      const originalClose=closeBtn.onclick;
      closeBtn.onclick=()=>{if(originalClose)originalClose();setSelectedButton(null);};
      closeBtn.dataset.ux6Bound='1';
    }
    getDetailPanel();'''

s = s[:start] + new_js + s[end:]

capture_marker = "    const d=w.document,clone=d.querySelector('main').cloneNode(true);\n"
capture_insert = "    const d=w.document,clone=d.querySelector('main').cloneNode(true);\n    clone.querySelectorAll('.ux6-grid-label,.ux6-project-labels,.ux6-milestone-strip,.timeline-detail').forEach(x=>x.remove());\n"
if capture_marker not in s:
    raise RuntimeError('capture marker not found')
s = s.replace(capture_marker, capture_insert, 1)

# Static safety checks before writing.
required = [
    'UX6_EXECUTIVE_LANES',
    'ux6-milestone-strip',
    'grid-template-columns:150px repeat(85,minmax(16px,1fr))',
    "project.style.gridTemplateRows='54px 46px'",
    "clone.querySelectorAll('.ux6-grid-label,.ux6-project-labels,.ux6-milestone-strip,.timeline-detail')"
]
for token in required:
    if token not in s:
        raise RuntimeError(f'missing expected token: {token}')

p.write_text(s)
print('UX6 patch applied successfully')
