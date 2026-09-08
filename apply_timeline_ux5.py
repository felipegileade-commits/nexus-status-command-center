from pathlib import Path

p = Path('index.html')
s = p.read_text()

s = s.replace("frame.src='/legacy-index.html?v=20260908-ux4';", "frame.src='/legacy-index.html?v=20260908-ux5';")

css_marker = "      #timeline .timeline-detail-close:hover{color:#fff}\n"
css_insert = """      #timeline .timeline-detail-close:hover{color:#fff}\n      /* UX5_COLLISION_FREE_COMPACT */\n      #timeline .cal-lane.project{grid-template-rows:58px 42px 68px 68px!important}\n      #timeline .cal-card{min-height:54px!important;max-height:58px!important;height:58px!important;padding:9px 11px!important;border-radius:10px!important;border-left-width:3px!important;display:block!important;overflow:hidden!important}\n      #timeline .cal-card b{display:-webkit-box!important;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:11px!important;line-height:1.25!important;margin:0!important;white-space:normal!important}\n      #timeline .cal-card.timeline-selected{transform:translateY(-1px)}\n"""
if 'UX5_COLLISION_FREE_COMPACT' not in s:
    s = s.replace(css_marker, css_insert, 1)

marker = '    /* UX4_CLICKABLE_MILESTONES */'
pos = s.index(marker)
start = s.index('    cards.forEach(card=>{', pos)
end = s.index('    marks.forEach(mark=>{', start)
new_cards = r'''    const compactOccupied=[];
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
        openDetail(card,mark);
      };
    });
'''
s = s[:start] + new_cards + s[end:]

old_tail = "    project.style.gridTemplateRows='58px 42px 112px';\n    if(grid)grid.style.gridTemplateRows='48px 64px 265px';"
new_tail = "    const compactRows=Math.max(1,compactOccupied.length);\n    project.style.gridTemplateRows=`58px 42px repeat(${compactRows},68px)`;\n    if(grid)grid.style.gridTemplateRows=`48px 64px ${100+compactRows*68}px`;"
s = s.replace(old_tail, new_tail, 1)

p.write_text(s)
