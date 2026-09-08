from pathlib import Path

path = Path('index.html')
s = path.read_text(encoding='utf-8')

MARKER = 'UX4_CLICKABLE_MILESTONES'
if MARKER in s:
    print('UX4 already applied')
    raise SystemExit(0)

s = s.replace("frame.src='/legacy-index.html?v=20260908-ux3';", "frame.src='/legacy-index.html?v=20260908-ux4';")

css_anchor = "      #timeline .scrollhint{margin-top:6px;color:#7392a8}\n"
css_extra = r'''      /* UX4_CLICKABLE_MILESTONES */
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
      @media(max-width:980px){#timeline .timeline-detail.open{grid-template-columns:1fr}#timeline .timeline-detail-main{border-right:0;border-bottom:1px solid #24435d}}
'''
if css_anchor not in s:
    raise SystemExit('CSS anchor not found')
s = s.replace(css_anchor, css_anchor + css_extra, 1)

js_anchor = """    const grid=d.querySelector('#timeline .calendar-grid');
    if(grid)grid.style.gridTemplateRows=`48px 64px ${100+rowH*4}px`;
  }
"""
js_extra = r'''    /* UX4_CLICKABLE_MILESTONES */
    function getDetailPanel(){
      let panel=d.querySelector('#timeline .timeline-detail');
      if(panel)return panel;
      panel=d.createElement('div');
      panel.className='timeline-detail';
      panel.innerHTML='<div class="timeline-detail-main"><button class="timeline-detail-close" type="button" aria-label="Fechar">×</button><div class="timeline-detail-kicker">Detalhe do marco</div><h3></h3><p class="timeline-detail-desc"></p></div><div class="timeline-detail-side"><div class="timeline-detail-label">Observações</div><p class="timeline-detail-observation"></p></div>';
      const caption=d.querySelector('#timeline .calendar-caption');
      if(caption)caption.insertAdjacentElement('afterend',panel);
      panel.querySelector('.timeline-detail-close').onclick=()=>{
        panel.classList.remove('open');
        d.querySelectorAll('#timeline .timeline-selected').forEach(x=>x.classList.remove('timeline-selected'));
      };
      return panel;
    }
    const startCol=el=>parseInt(String(el?.style.gridColumn||'').split('/')[0].trim(),10)||0;
    const openDetail=(card,mark)=>{
      if(!card)return;
      d.querySelectorAll('#timeline .timeline-selected').forEach(x=>x.classList.remove('timeline-selected'));
      card.classList.add('timeline-selected');if(mark)mark.classList.add('timeline-selected');
      const panel=getDetailPanel();
      panel.querySelector('h3').textContent=card.dataset.timelineTitle||'Marco do projeto';
      panel.querySelector('.timeline-detail-desc').textContent=card.dataset.timelineDesc||'Sem descrição complementar.';
      panel.querySelector('.timeline-detail-observation').textContent=card.dataset.timelineObs||card.dataset.timelineDesc||'Sem observações adicionais.';
      panel.classList.add('open');
      panel.scrollIntoView({behavior:'smooth',block:'nearest'});
    };
    cards.forEach(card=>{
      card.style.gridRow='3';
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
      card.onclick=()=>{
        const c=startCol(card);
        const mark=marks.map(m=>({m,dist:Math.abs(startCol(m)-c)})).sort((a,b)=>a.dist-b.dist)[0]?.m||null;
        openDetail(card,mark);
      };
    });
    marks.forEach(mark=>{
      mark.style.gridRow='2';
      mark.onclick=()=>{
        const m=startCol(mark);
        const card=cards.map(c=>({c,dist:Math.abs(startCol(c)-m)})).sort((a,b)=>a.dist-b.dist)[0]?.c||null;
        openDetail(card,mark);
      };
    });
    project.style.gridTemplateRows='58px 42px 112px';
    if(grid)grid.style.gridTemplateRows='48px 64px 265px';
    getDetailPanel();
  }
'''
if js_anchor not in s:
    raise SystemExit('JS anchor not found')
s = s.replace(js_anchor, js_anchor[:-4] + js_extra, 1)

path.write_text(s, encoding='utf-8')
print('UX4 patch applied')
