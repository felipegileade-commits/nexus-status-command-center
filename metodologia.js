// Aba "Metodologia": mapa de procedencia dos numeros do painel, lido de
// /data/metodologia.json. Mesma mecanica da aba "Riscos e pendencias" — so no
// editor (index.html), renderizada em tempo de carga com a classe nx-live, para
// o shell.js nao gravar nada disso no estado do Supabase.
//
// Para editar o conteudo, mexa em data/metodologia.json. A aba e de leitura: a
// edicao pelo navegador exigiria gravar no repositorio, o que nenhuma aba faz.
(()=>{
  const frame=document.getElementById('app');
  if(!frame)return;
  if(window.NEXUS_READONLY)return;                       // a aba nao vai para o cliente
  const VERSION=(document.currentScript&&/[?&]v=([^&]+)/.exec(document.currentScript.src)||[])[1]||'';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let dados=null,carregando=null;

  function carregar(){
    if(dados)return Promise.resolve(dados);if(carregando)return carregando;
    carregando=fetch('/data/metodologia.json'+(VERSION?'?v='+VERSION:''),{cache:'no-store'})
      .then(r=>r.ok?r.json():null).catch(()=>null).then(j=>{dados=j;return j});
    return carregando;
  }

  function styles(d){
    if(d.getElementById('nx-met-style'))return;
    const s=d.createElement('style');s.id='nx-met-style';s.textContent=`
      #metodologia .nx-met-busca{display:flex;gap:10px;align-items:center;margin:0 0 18px}
      #metodologia .nx-met-busca input{flex:1;max-width:420px;background:var(--panel2,#0d2337);border:1px solid var(--line,#244662);
        color:var(--text,#fff);border-radius:9px;padding:10px 13px;font-size:13px;font-family:inherit}
      #metodologia .nx-met-busca input::placeholder{color:var(--muted,#8fa7b9)}
      #metodologia .nx-met-busca b{font-size:11px;color:var(--muted,#8fa7b9);font-weight:600;white-space:nowrap}
      #metodologia .nx-met-sec{margin:26px 0 0}
      #metodologia .nx-met-sec>h2{font-size:14px;letter-spacing:.06em;text-transform:uppercase;color:var(--text);margin:0 0 3px}
      #metodologia .nx-met-sec>p.sub{font-size:11.5px;color:var(--muted);margin:0 0 14px}
      #metodologia .nx-met-sec>p.sub code{font-size:11px;color:var(--teal,#2ec4b6)}
      #metodologia .nx-met-grid{display:grid;gap:12px}
      #metodologia .nx-met-card{background:var(--panel,#0b1f33);border:1px solid var(--line,#18364f);border-radius:12px;
        padding:15px 18px;border-left:3px solid var(--line,#18364f)}
      #metodologia .nx-met-card.jira{border-left-color:#4b9fd6}
      #metodologia .nx-met-card.derivado{border-left-color:#8a7bd8}
      #metodologia .nx-met-card.externo{border-left-color:var(--orange,#f08c3a)}
      #metodologia .nx-met-card[hidden]{display:none}
      #metodologia .nx-met-top{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap}
      #metodologia .nx-met-top h3{font-size:14px;font-weight:700;color:var(--text);margin:0;flex:1;min-width:180px}
      #metodologia .nx-met-val{font-size:19px;font-weight:850;color:var(--text);font-variant-numeric:tabular-nums}
      #metodologia .nx-met-tag{font-size:9px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;
        border:1px solid;border-radius:999px;padding:3px 9px;white-space:nowrap}
      #metodologia .jira .nx-met-tag{color:#4b9fd6;border-color:#4b9fd6}
      #metodologia .derivado .nx-met-tag{color:#8a7bd8;border-color:#8a7bd8}
      #metodologia .externo .nx-met-tag{color:var(--orange,#f08c3a);border-color:var(--orange,#f08c3a)}
      #metodologia .nx-met-desc{font-size:12px;color:var(--muted);margin:7px 0 0;line-height:1.5}
      #metodologia .nx-met-formula{font-size:12px;color:var(--text);margin:9px 0 0;line-height:1.5}
      #metodologia .nx-met-formula span{color:var(--muted);font-size:10px;letter-spacing:.06em;text-transform:uppercase;margin-right:8px}
      #metodologia .nx-met-jql{margin:11px 0 0;background:#06172a;border:1px solid var(--line,#18364f);border-radius:9px;overflow:hidden}
      #metodologia .nx-met-jql pre{margin:0;padding:12px 14px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
        font-size:11px;line-height:1.6;color:#9fd6c9;white-space:pre-wrap;word-break:break-word}
      #metodologia .nx-met-acoes{display:flex;gap:8px;padding:0 10px 10px;flex-wrap:wrap}
      #metodologia .nx-met-acoes button,#metodologia .nx-met-acoes a{background:var(--panel2,#0d2337);border:1px solid var(--line,#244662);
        color:var(--muted);border-radius:7px;padding:6px 11px;font-size:10.5px;font-weight:700;cursor:pointer;
        text-decoration:none;font-family:inherit;letter-spacing:.03em}
      #metodologia .nx-met-acoes button:hover,#metodologia .nx-met-acoes a:hover{color:var(--text);border-color:var(--teal,#2ec4b6)}
      #metodologia .nx-met-acoes button.ok{color:var(--teal,#2ec4b6);border-color:var(--teal,#2ec4b6)}
      #metodologia .nx-met-obs{font-size:11.5px;color:var(--muted);margin:11px 0 0;padding:9px 12px;line-height:1.5;
        background:rgba(123,139,154,.08);border-radius:8px}
      #metodologia .externo .nx-met-obs{background:rgba(240,140,58,.09);color:var(--text)}
      #metodologia .nx-met-campos{font-size:10.5px;color:var(--muted);margin:9px 0 0}
      #metodologia .nx-met-campos b{color:var(--muted);font-weight:700;letter-spacing:.06em;text-transform:uppercase;font-size:9px;margin-right:7px}
      #metodologia .nx-met-vazio{font-size:12px;color:var(--muted);padding:20px 0}
      #metodologia .nx-met-legenda{display:flex;gap:18px;flex-wrap:wrap;margin:14px 0 0;font-size:11px;color:var(--muted)}
      #metodologia .nx-met-legenda i{font-style:normal;display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:7px;vertical-align:1px}
      #metodologia .nx-met-conf{margin:22px 0 0;background:var(--panel,#0b1f33);border:1px solid var(--line,#18364f);
        border-radius:12px;padding:16px 18px}
      #metodologia .nx-met-conf h2{font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:var(--text);margin:0 0 4px}
      #metodologia .nx-met-conf p.sub{font-size:11.5px;color:var(--muted);margin:0 0 13px;line-height:1.5}
      #metodologia .nx-met-conf .botoes{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
      #metodologia .nx-met-conf button{background:var(--teal,#2ec4b6);border:0;color:#04121f;border-radius:8px;
        padding:9px 15px;font-size:12px;font-weight:800;cursor:pointer;font-family:inherit}
      #metodologia .nx-met-conf button[disabled]{opacity:.55;cursor:default}
      #metodologia .nx-met-conf button.sec{background:var(--panel2,#0d2337);border:1px solid var(--line,#244662);color:var(--muted)}
      #metodologia .nx-met-conf .estado{font-size:11.5px;color:var(--muted)}
      #metodologia .nx-met-conf table{width:100%;border-collapse:collapse;margin:15px 0 0;font-size:12px}
      #metodologia .nx-met-conf th{text-align:left;font-size:9px;letter-spacing:.08em;text-transform:uppercase;
        color:var(--muted);padding:8px 10px;border-bottom:1px solid var(--line,#18364f)}
      #metodologia .nx-met-conf td{padding:8px 10px;border-bottom:1px solid var(--line,#18364f);color:var(--text)}
      #metodologia .nx-met-conf td.n{font-variant-numeric:tabular-nums;font-weight:700;width:1%;white-space:nowrap}
      #metodologia .nx-met-conf tr.difere td.n.jira{color:var(--orange,#f08c3a)}
      #metodologia .nx-met-conf tr.igual td.n.jira{color:var(--teal,#2ec4b6)}
      #metodologia .nx-met-conf td.obs{font-size:11px;color:var(--muted)}
      #metodologia .nx-met-conf .erro{margin:14px 0 0;padding:11px 13px;border-radius:8px;font-size:11.5px;line-height:1.55;
        background:rgba(240,140,58,.12);color:var(--text)}
      @media(max-width:700px){#metodologia .nx-met-busca{flex-direction:column;align-items:stretch}
        #metodologia .nx-met-busca input{max-width:none}#metodologia .nx-met-val{font-size:17px}}
    `;d.head.appendChild(s);
  }

  // Link para a busca do Jira ja com o JQL aplicado.
  function linkJira(base,prefixo,jql){
    const completo=(prefixo?prefixo+' AND ':'')+jql;
    return base.replace(/\/$/,'')+'/issues/?jql='+encodeURIComponent(completo);
  }

  function cartao(ind,prefixo,instancia,origens){
    const cls=ind.origem||'derivado';
    const rot=(origens[cls]||{}).rotulo||cls;
    const jql=String(ind.jql||'').trim();
    const completo=jql?((prefixo?prefixo+'\n  AND ':'')+jql):'';
    const busca=[ind.nome,ind.desc,jql,ind.obs].join(' ').toLowerCase();
    return `<div class="nx-met-card ${esc(cls)}" data-busca="${esc(busca)}">
      <div class="nx-met-top">
        <h3>${esc(ind.nome||'')}</h3>
        ${ind.valor?`<span class="nx-met-val">${esc(ind.valor)}</span>`:''}
        <span class="nx-met-tag">${esc(rot)}</span>
      </div>
      ${ind.desc?`<p class="nx-met-desc">${esc(ind.desc)}</p>`:''}
      ${ind.formula?`<p class="nx-met-formula"><span>Cálculo</span>${esc(ind.formula)}</p>`:''}
      ${completo?`<div class="nx-met-jql"><pre>${esc(completo)}</pre>
        <div class="nx-met-acoes">
          <button type="button" data-copiar="${esc(completo.replace(/\n\s+/g,' '))}">Copiar JQL</button>
          <a href="${esc(linkJira(instancia,prefixo,jql))}" target="_blank" rel="noopener">Abrir no Jira ↗</a>
        </div></div>`:''}
      ${ind.campos?`<p class="nx-met-campos"><b>Campos</b>${esc(ind.campos)}</p>`:''}
      ${ind.obs?`<p class="nx-met-obs">${esc(ind.obs)}</p>`:''}
    </div>`;
  }

  function render(w,j){
    const d=w.document;styles(d);
    const nav=d.querySelector('.nav'),main=d.querySelector('main');
    if(!nav||!main)return;

    if(!nav.querySelector('[data-view="metodologia"]')){
      const b=d.createElement('button');
      b.type='button';b.dataset.view='metodologia';b.className='nx-live';b.textContent='Metodologia';
      b.onclick=()=>{
        nav.querySelectorAll('button').forEach(x=>x.classList.remove('active'));
        d.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
        b.classList.add('active');
        const v=d.getElementById('metodologia');if(v)v.classList.add('active');
        w.scrollTo({top:0,behavior:'smooth'});
      };
      nav.appendChild(b);
      // os outros botoes precisam desligar esta aba tambem
      nav.querySelectorAll('button:not([data-view="metodologia"])').forEach(x=>x.addEventListener('click',()=>{
        b.classList.remove('active');
        const v=d.getElementById('metodologia');if(v)v.classList.remove('active');
      }));
    }

    let sec=d.getElementById('metodologia');
    if(!sec){sec=d.createElement('section');sec.id='metodologia';sec.className='view nx-live';main.appendChild(sec)}

    const prefixos=j.prefixo||{},origens=j.origens||{};
    const inst=j.instancia||'https://sottelli.atlassian.net';
    const secoes=(j.secoes||[]).map(s=>{
      // O prefixo do JQL depende da frente; a secao de esteiras e topo e da Central.
      const pref=s.id==='visaogeral'?'':(prefixos.central||'');
      const cards=(s.indicadores||[]).map(i=>cartao(i,i.jql&&i.jql.indexOf('project')===0?'':pref,inst,origens)).join('');
      return `<div class="nx-met-sec" data-sec="${esc(s.id)}">
        <h2>${esc(s.nome||'')}</h2>
        <p class="sub">${esc(s.arquivo||'')} · ${esc(s.atualizacao||'')}${pref?` · todo JQL desta seção leva <code>${esc(pref)}</code> na frente`:''}</p>
        <div class="nx-met-grid">${cards}</div>
      </div>`;
    }).join('');

    const legenda=Object.keys(origens).map(k=>{
      const cor=k==='jira'?'#4b9fd6':k==='derivado'?'#8a7bd8':'#f08c3a';
      return `<span><i style="background:${cor}"></i><b>${esc(origens[k].rotulo)}</b> — ${esc(origens[k].desc)}</span>`;
    }).join('');

    sec.innerHTML=`
      <div class="hero-title">
        <div class="eyebrow">Transparência</div>
        <h1>Metodologia</h1>
        <p>De onde vem cada número do painel. Os que saem do Jira trazem o JQL para você conferir; os que não saem dizem qual é a fonte real.</p>
        <p class="nx-stamp" style="color:var(--muted);font-size:11px;margin:6px 0 0">Atualizado em ${esc(j.atualizadoEm||'')} · Instância ${esc(inst)}</p>
      </div>
      <div class="nx-met-legenda">${legenda}</div>
      <div class="nx-met-conf">
        <h2>Conferir com o Jira</h2>
        <p class="sub">Lê o Jira agora e compara com o que está publicado no painel. Não grava nada: mostra onde divergiu para você decidir. O aceite da MV (“Aprovado em UAT”) não entra, porque não sai do Jira.</p>
        <div class="botoes">
          <button type="button" data-conferir="central">Conferir Central</button>
          <button type="button" class="sec" data-conferir="revenue">Conferir Revenue</button>
          <span class="estado"></span>
        </div>
        <div class="resultado"></div>
      </div>
      <div class="nx-met-busca" style="margin-top:22px">
        <input type="search" placeholder="Filtrar indicador por nome, JQL ou observação…" aria-label="Filtrar indicadores">
        <b class="nx-met-conta"></b>
      </div>
      ${secoes}`;

    // Busca: esconde cartoes e secoes vazias.
    const campo=sec.querySelector('.nx-met-busca input'),conta=sec.querySelector('.nx-met-conta');
    const cards=Array.prototype.slice.call(sec.querySelectorAll('.nx-met-card'));
    const filtra=()=>{
      const q=(campo.value||'').toLowerCase().trim();
      let n=0;
      cards.forEach(c=>{const ok=!q||c.dataset.busca.indexOf(q)>=0;c.hidden=!ok;if(ok)n++});
      sec.querySelectorAll('.nx-met-sec').forEach(s=>{
        s.hidden=!Array.prototype.slice.call(s.querySelectorAll('.nx-met-card')).some(c=>!c.hidden);
      });
      conta.textContent=n+(n===1?' indicador':' indicadores');
    };
    campo.addEventListener('input',filtra);filtra();

    // Conferencia com o Jira. Compara a leitura de agora com o que esta em
    // data/esteiras.json; de proposito nao grava nada — "Aprovado em UAT" vem do
    // controle da MV e um sync automatico o sobrescreveria com o numero errado.
    const conf=sec.querySelector('.nx-met-conf');
    const estado=conf.querySelector('.estado'),saida=conf.querySelector('.resultado');
    // Nomes das linhas da esteira que correspondem a cada contagem do endpoint.
    const DE_PARA=[
      ['refinamento','Refinamento','Refinamento · UpStream'],
      ['aprovacaoUS','Aprovação de US','Aprovação de US · UpStream'],
      ['desenvolvimento','Desenvolvimento','Desenvolvimento · DownStream'],
      ['naUAT','Total na UAT',null],
      ['backlog','Backlog de melhorias','Backlog de melhorias']
    ];
    conf.addEventListener('click',ev=>{
      const b=ev.target.closest('[data-conferir]');if(!b)return;
      const frente=b.getAttribute('data-conferir');
      conf.querySelectorAll('[data-conferir]').forEach(x=>x.disabled=true);
      estado.textContent='Perguntando ao Jira…';saida.innerHTML='';
      Promise.all([
        fetch('/api/jira?frente='+encodeURIComponent(frente),{cache:'no-store'}).then(r=>r.json().then(j=>({ok:r.ok,j}))),
        fetch('/data/esteiras.json'+(VERSION?'?v='+VERSION:''),{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null)
      ]).then(([resp,est])=>{
        conf.querySelectorAll('[data-conferir]').forEach(x=>x.disabled=false);
        if(!resp.ok){
          estado.textContent='';
          saida.innerHTML=`<div class="erro"><b>Não deu para ler o Jira.</b><br>${esc(resp.j&&resp.j.mensagem||'Erro desconhecido.')}</div>`;
          return;
        }
        const c=resp.j.contagens||{},der=resp.j.derivados||{};
        const linhas=(est&&est.frentes&&est.frentes[frente]&&est.frentes[frente].esteiras)||[];
        const valor=nome=>{const l=linhas.filter(x=>String(x.nome||'').indexOf(nome)===0)[0];return l?Number(l.n):null};
        const naUATPainel=(()=>{
          const h=valor('Em homologação na UAT'),a=valor('Aprovado em UAT');
          return (h===null||a===null)?null:h+a;
        })();
        const corpo=DE_PARA.map(([chave,rotulo,linha])=>{
          const jira=Number(c[chave]);
          const painel=chave==='naUAT'?naUATPainel:(linha?valor(linha):null);
          const dif=painel===null?null:jira-painel;
          const cls=painel===null?'':(dif===0?'igual':'difere');
          return `<tr class="${cls}">
            <td>${esc(rotulo)}</td>
            <td class="n">${painel===null?'—':painel}</td>
            <td class="n jira">${isNaN(jira)?'—':jira}</td>
            <td class="n">${dif===null?'—':(dif>0?'+'+dif:dif)}</td>
            <td class="obs">${chave==='naUAT'?'soma de homologação + aprovado':''}</td>
          </tr>`;
        }).join('');
        const dt=new Date(resp.j.lidoEm);
        estado.textContent='Lido às '+dt.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
        saida.innerHTML=`<table>
            <thead><tr><th>Linha</th><th>No painel</th><th>No Jira agora</th><th>Dif.</th><th></th></tr></thead>
            <tbody>${corpo}</tbody>
            <tfoot><tr><td><b>Total geral</b></td>
              <td class="n">${linhas.length?linhas.reduce((t,l)=>t+(Number(l.n)||0),0):'—'}</td>
              <td class="n jira">${der.totalGeral??'—'}</td><td class="n"></td><td></td></tr></tfoot>
          </table>
          <div class="erro">${esc(resp.j.aviso||'')}</div>`;
      }).catch(e=>{
        conf.querySelectorAll('[data-conferir]').forEach(x=>x.disabled=false);
        estado.textContent='';
        saida.innerHTML=`<div class="erro"><b>Não deu para ler o Jira.</b><br>${esc(String(e&&e.message||e))}<br>
          Se a resposta foi 404, a função <code>/api/jira</code> ainda não subiu na Vercel.</div>`;
      });
    });

    // Copiar JQL.
    sec.addEventListener('click',ev=>{
      const b=ev.target.closest('[data-copiar]');if(!b)return;
      const txt=b.getAttribute('data-copiar');
      const feito=()=>{const antes=b.textContent;b.textContent='Copiado';b.classList.add('ok');
        setTimeout(()=>{b.textContent=antes;b.classList.remove('ok')},1400)};
      if(w.navigator&&w.navigator.clipboard&&w.navigator.clipboard.writeText){
        w.navigator.clipboard.writeText(txt).then(feito).catch(()=>{});
      }else{
        const t=d.createElement('textarea');t.value=txt;d.body.appendChild(t);t.select();
        try{d.execCommand('copy');feito()}catch(e){}
        d.body.removeChild(t);
      }
    });
  }

  function install(){
    const w=frame.contentWindow;
    if(!w||!w.document||!w.document.querySelector('.nav'))return false;
    carregar().then(j=>{if(j)render(w,j)});
    if(!w.__nxMetObserver){
      w.__nxMetObserver=true;
      const main=w.document.querySelector('main');let t=null;
      if(main)new MutationObserver(()=>{clearTimeout(t);t=setTimeout(()=>{
        try{if(dados&&!w.document.getElementById('metodologia'))render(w,dados)}catch(e){}
      },150)}).observe(main,{childList:true});
    }
    return true;
  }

  frame.addEventListener('load',()=>{let n=0;const t=setInterval(()=>{if(install()||++n>40)clearInterval(t)},250)});
  if(frame.contentDocument?.readyState==='complete')setTimeout(install,50);
})();
