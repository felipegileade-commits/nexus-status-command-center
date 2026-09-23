// Gera a aba "US Aprovadas" do painel a partir de data/us-aprovadas.json e grava
// o HTML em legacy-index.html, entre os marcadores <!-- us-aprovadas:inicio --> e
// <!-- us-aprovadas:fim -->. A aba fica fora do <main> (que e persistido no
// Supabase), entao e so codigo: a cada rodada de homologacao, atualize o JSON e rode
//
//   node scripts/us-aprovadas.mjs
//
// O mesmo JSON e lido pelo scripts/retrato.mjs, mas so nas frentes com
// controlaIndicador: true (Revenue): nessas, card em producao fora da lista conta
// como em homologacao. A Central mantem o indicador vindo direto do Jira.

import fs from 'node:fs';

const DADOS = 'data/us-aprovadas.json';
const PAGINA = 'legacy-index.html';
const INICIO = '<!-- us-aprovadas:inicio -->', FIM = '<!-- us-aprovadas:fim -->';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = k => +String(k).split('-')[1];
const pct = (a, b) => (Math.round(a / b * 1000) / 10).toFixed(1).replace('.', ',') + '%';

export function render(d) {
  const frentes = Object.entries(d.frentes);                       // [id, frente]
  const todas = frentes.flatMap(([id, f]) => f.aprovadas.map(a => ({ ...a, frente: id, frenteNome: f.nome })));
  const reteste = frentes.flatMap(([id, f]) => (f.reteste || []).map(a => ({ ...a, frente: id, frenteNome: f.nome })));
  const ordem = Object.keys(d.frentes);                            // frentes na ordem do JSON
  const ordena = xs => [...xs].sort((a, b) => a.frente === b.frente ? num(a.key) - num(b.key) : ordem.indexOf(a.frente) - ordem.indexOf(b.frente));
  const conta = (xs, forma) => xs.filter(a => a.forma === forma).length;

  // Um conjunto de KPIs por seleção de frente (trocados pelo filtro; nada é calculado no navegador).
  const kpi = (n, l) => `<div class="ua-kpi"><strong>${esc(n)}</strong><span>${esc(l)}</span></div>`;
  const kpisFrente = ([id, f]) => {
    const a = f.aprovadas, tec = conta(a, 'hab') + conta(a, 'cfg');
    return `<div class="ua-kpis" data-kpi="${id}" hidden>${kpi(a.length, 'US aprovadas')}${kpi(pct(a.length, f.escopo), `homologado (${a.length} de ${f.escopo} US do escopo)`)}${kpi(conta(a, 'mv') + conta(a, 'mv1'), 'aprovadas pela MV na homologação')}${kpi(tec, 'habilitadores e configurações técnicas')}${kpi(conta(a, 'prod'), 'validada em produção')}${kpi((f.reteste || []).length, 'ajustadas · aguardam reteste')}</div>`;
  };
  const kpisTodas = `<div class="ua-kpis" data-kpi="todas">${kpi(todas.length, 'US aprovadas nas duas frentes')}${frentes.map(([, f]) => kpi(pct(f.aprovadas.length, f.escopo), `${f.nome} · ${f.aprovadas.length} de ${f.escopo} US`)).join('')}${kpi(conta(todas, 'mv') + conta(todas, 'mv1'), 'aprovadas pela MV na homologação')}${kpi(conta(todas, 'hab') + conta(todas, 'cfg'), 'habilitadores e configurações técnicas')}${kpi(reteste.length, 'ajustadas · aguardam reteste')}</div>`;

  const chipFrente = (id, l, n) => `<button type="button" class="ua-chip ua-chip-frente${id === 'todas' ? ' active' : ''}" data-frente="${id}">${esc(l)} <b>${n}</b></button>`;
  const chipForma = (id, l) => `<button type="button" class="ua-chip ua-chip-forma${id === 'todas' ? ' active' : ''}" data-forma="${id}">${esc(l)} <b data-n>0</b></button>`;
  const linha = a => `<tr data-frente="${esc(a.frente)}" data-forma="${esc(a.forma)}" data-busca="${esc((a.key + ' ' + a.titulo + ' ' + a.sprint + ' ' + a.frenteNome).toLowerCase())}">
        <td class="ua-n"></td><td class="ua-key">${esc(a.key)}</td><td class="ua-titulo">${esc(a.titulo)}</td><td class="ua-frente">${esc(a.frenteNome)}</td><td>${esc(a.tipo)}</td><td class="ua-sprint">${esc(a.sprint)}</td><td class="ua-base"><span class="ua-tag ua-${esc(a.forma)}">${esc(d.formas[a.forma] || a.forma)}</span><small>${esc(a.base)}</small></td></tr>`;
  const reLinha = r => `<tr data-frente="${esc(r.frente)}" data-busca="${esc((r.key + ' ' + r.titulo + ' ' + r.sprint).toLowerCase())}"><td class="ua-n"></td><td class="ua-key">${esc(r.key)}</td><td class="ua-titulo">${esc(r.titulo)}</td><td class="ua-frente">${esc(r.frenteNome)}</td><td>${esc(r.tipo)}</td><td class="ua-sprint">${esc(r.sprint)}</td><td class="ua-base"><small>${esc(r.situacao)}</small></td></tr>`;

  const fontes = frentes.map(([, f]) => `<div class="ua-fonte"><b>${esc(f.nome)}</b> · ${esc(f.rodada)}<small>${esc(f.fonte)}</small></div>`).join('');
  const formasUsadas = Object.entries(d.formas).filter(([id]) => todas.some(a => a.forma === id));

  return `${INICIO}
<section id="aprovadas" class="view ua-view">
  <div class="hero-title"><div class="eyebrow">HOMOLOGAÇÃO · REVENUE E CENTRAL DE PROJETOS</div><h1>US Aprovadas</h1><p>Histórias aprovadas na homologação, com a base de cada aprovação. Use o filtro por frente para ver Revenue, Central de Projetos ou as duas juntas. Lista atualizada a cada rodada de homologação.</p></div>
  ${kpisTodas}${frentes.map(kpisFrente).join('')}
  <div class="section">
    <div class="section-title"><div><div class="eyebrow">POSIÇÃO DE ${esc(d.posicao)}</div><h2>Histórias aprovadas</h2></div><div class="ua-fontes">${fontes}</div></div>
    <div class="ua-tools">
      <div class="ua-chips ua-frentes">${chipFrente('todas', 'Todas as frentes', todas.length)}${frentes.map(([id, f]) => chipFrente(id, f.nome, f.aprovadas.length)).join('')}</div>
      <input type="search" class="ua-busca" placeholder="Buscar por código, título ou sprint" aria-label="Buscar história">
      <div class="ua-chips ua-formas">${chipForma('todas', 'Todas as bases')}${formasUsadas.map(([id, l]) => chipForma(id, l)).join('')}</div>
    </div>
    <div class="ua-wrap"><table class="ua-table">
      <thead><tr><th>#</th><th>US</th><th>Título</th><th>Frente</th><th>Tipo</th><th>Sprint</th><th>Base da aprovação</th></tr></thead>
      <tbody>${ordena(todas).map(linha).join('')}</tbody>
    </table><p class="ua-vazio" hidden>Nenhuma história corresponde ao filtro.</p></div>
  </div>
  <div class="section" id="uaReteste">
    <div class="section-title"><div><div class="eyebrow">PRÓXIMA RODADA</div><h2>Ajustadas · aguardam reteste</h2></div><p>Correções já feitas pela Sottelli e disponíveis em UAT. Entram na lista de aprovadas depois do reteste da MV, em agenda exclusiva com o PMO.</p></div>
    <div class="ua-wrap"><table class="ua-table">
      <thead><tr><th>#</th><th>US</th><th>Título</th><th>Frente</th><th>Tipo</th><th>Sprint</th><th>Situação</th></tr></thead>
      <tbody>${ordena(reteste).map(reLinha).join('')}</tbody>
    </table><p class="ua-vazio" hidden>Nenhuma história em reteste nesta frente.</p></div>
  </div>
  <div class="footer"><span>Projeto Nexus · US aprovadas · Revenue e Central de Projetos</span><span>Posição de ${esc(d.posicao)}</span></div>
</section>
<script>
// Filtro da aba "US Aprovadas": frente + base da aprovação + busca livre.
// A frente também troca o bloco de KPIs e recalcula a contagem dos chips de base.
(function(){
  var sec=document.getElementById('aprovadas');if(!sec)return;
  var busca=sec.querySelector('.ua-busca'),reteste=sec.querySelector('#uaReteste');
  var cFrente=[].slice.call(sec.querySelectorAll('.ua-chip-frente')),cForma=[].slice.call(sec.querySelectorAll('.ua-chip-forma'));
  var linhas=[].slice.call(sec.querySelectorAll('.ua-table tbody tr'));
  var frente='todas',forma='todas';
  function daFrente(tr){return frente==='todas'||tr.dataset.frente===frente}
  function aplica(){
    var t=(busca.value||'').trim().toLowerCase();
    sec.querySelectorAll('.ua-kpis').forEach(function(k){k.hidden=k.dataset.kpi!==frente});
    cForma.forEach(function(c){
      var f=c.dataset.forma,n=0;
      linhas.forEach(function(tr){if(tr.dataset.forma&&daFrente(tr)&&(f==='todas'||tr.dataset.forma===f))n++});
      c.querySelector('[data-n]').textContent=n;c.hidden=n===0&&f!=='todas';
      if(c.hidden&&forma===f){forma='todas';cForma[0].classList.add('active');c.classList.remove('active')}
    });
    sec.querySelectorAll('.ua-table').forEach(function(tab){
      var n=0,corpo=tab.querySelector('tbody');
      [].slice.call(corpo.rows).forEach(function(tr){
        var ok=daFrente(tr)&&(!tr.dataset.forma||forma==='todas'||tr.dataset.forma===forma)&&(!t||tr.dataset.busca.indexOf(t)>=0);
        tr.hidden=!ok;if(ok)tr.cells[0].textContent=++n;
      });
      var vazio=tab.parentNode.querySelector('.ua-vazio');if(vazio)vazio.hidden=n>0;
    });
    if(reteste)reteste.hidden=!linhas.some(function(tr){return !tr.dataset.forma&&daFrente(tr)});
  }
  function liga(chips,campo,set){chips.forEach(function(c){c.addEventListener('click',function(){chips.forEach(function(x){x.classList.remove('active')});c.classList.add('active');set(c.dataset[campo]);aplica()})})}
  liga(cFrente,'frente',function(v){frente=v;forma='todas';cForma.forEach(function(x){x.classList.remove('active')});cForma[0].classList.add('active')});
  liga(cForma,'forma',function(v){forma=v});
  busca.addEventListener('input',aplica);
  aplica();
})();
<\/script>
${FIM}`;
}

if (process.argv[1] && process.argv[1].endsWith('us-aprovadas.mjs')) {
  const d = JSON.parse(fs.readFileSync(DADOS, 'utf8'));
  let s = fs.readFileSync(PAGINA, 'utf8');
  const a = s.indexOf(INICIO), b = s.indexOf(FIM);
  if (a < 0 || b < 0) throw new Error('marcadores us-aprovadas não encontrados em ' + PAGINA);
  s = s.slice(0, a) + render(d) + s.slice(b + FIM.length);
  fs.writeFileSync(PAGINA, s);
  for (const [, f] of Object.entries(d.frentes))
    console.log(`${f.nome}: ${f.aprovadas.length} aprovadas (${pct(f.aprovadas.length, f.escopo)} de ${f.escopo}), ${(f.reteste || []).length} em reteste`);
}
