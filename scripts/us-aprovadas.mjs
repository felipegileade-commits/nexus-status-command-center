// Gera a aba "US Aprovadas" do painel a partir de data/us-aprovadas.json e grava
// o HTML em legacy-index.html, entre os marcadores <!-- us-aprovadas:inicio --> e
// <!-- us-aprovadas:fim -->. A aba fica fora do <main> (que e persistido no
// Supabase), entao e so codigo: a cada rodada de homologacao, atualize o JSON e rode
//
//   node scripts/us-aprovadas.mjs
//
// O mesmo JSON e lido pelo scripts/retrato.mjs: so as US da lista contam como
// homologadas no indicador de Revenue.

import fs from 'node:fs';

const DADOS = 'data/us-aprovadas.json';
const PAGINA = 'legacy-index.html';
const INICIO = '<!-- us-aprovadas:inicio -->', FIM = '<!-- us-aprovadas:fim -->';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = k => +String(k).split('-')[1];
const pct = (a, b) => (Math.round(a / b * 1000) / 10).toFixed(1).replace('.', ',') + '%';

export function render(d) {
  const ap = [...d.aprovadas].sort((a, b) => num(a.key) - num(b.key));
  const re = [...(d.reteste || [])].sort((a, b) => num(a.key) - num(b.key));
  const porForma = {};
  for (const a of ap) porForma[a.forma] = (porForma[a.forma] || 0) + 1;
  const kpi = (n, l) => `<div class="ua-kpi"><strong>${esc(n)}</strong><span>${esc(l)}</span></div>`;
  const chip = (id, l, n) => `<button type="button" class="ua-chip${id === 'todas' ? ' active' : ''}" data-forma="${id}">${esc(l)} <b>${n}</b></button>`;
  const linha = (a, i) => `<tr data-forma="${esc(a.forma)}" data-busca="${esc((a.key + ' ' + a.titulo + ' ' + a.sprint).toLowerCase())}">
        <td class="ua-n">${i + 1}</td><td class="ua-key">${esc(a.key)}</td><td class="ua-titulo">${esc(a.titulo)}</td><td>${esc(a.tipo)}</td><td class="ua-sprint">${esc(a.sprint)}</td><td class="ua-base"><span class="ua-tag ua-${esc(a.forma)}">${esc(d.formas[a.forma] || a.forma)}</span><small>${esc(a.base)}</small></td></tr>`;
  const reLinha = (r, i) => `<tr><td class="ua-n">${i + 1}</td><td class="ua-key">${esc(r.key)}</td><td class="ua-titulo">${esc(r.titulo)}</td><td>${esc(r.tipo)}</td><td class="ua-sprint">${esc(r.sprint)}</td><td class="ua-base"><small>${esc(r.situacao)}</small></td></tr>`;

  return `${INICIO}
<section id="aprovadas" class="view ua-view">
  <div class="hero-title"><div class="eyebrow">REVENUE · HOMOLOGAÇÃO</div><h1>US Aprovadas</h1><p>Histórias de Revenue aprovadas na homologação, com a base de cada aprovação. Lista revisada com o time de Transformação Digital da MV e atualizada a cada rodada de homologação.</p></div>
  <div class="ua-kpis">
    ${kpi(ap.length, 'US aprovadas')}${kpi(pct(ap.length, d.escopo), `homologado (${ap.length} de ${d.escopo} US do escopo)`)}${kpi(porForma.mv || 0, 'aprovadas pela MV na homologação')}${kpi((porForma.hab || 0) + (porForma.cfg || 0), 'habilitadores e configurações técnicas')}${kpi(porForma.prod || 0, 'validada em produção')}${kpi(re.length, 'ajustadas · aguardam reteste')}
  </div>
  <div class="section">
    <div class="section-title"><div><div class="eyebrow">${esc(d.rodada.toUpperCase())}</div><h2>Histórias aprovadas</h2></div><p>${esc(d.fonte)}</p></div>
    <div class="ua-tools">
      <input type="search" class="ua-busca" placeholder="Buscar por código, título ou sprint" aria-label="Buscar história">
      <div class="ua-chips">${chip('todas', 'Todas', ap.length)}${Object.entries(d.formas).map(([id, l]) => chip(id, l, porForma[id] || 0)).join('')}</div>
    </div>
    <div class="ua-wrap"><table class="ua-table">
      <thead><tr><th>#</th><th>US</th><th>Título</th><th>Tipo</th><th>Sprint</th><th>Base da aprovação</th></tr></thead>
      <tbody>${ap.map(linha).join('')}</tbody>
    </table><p class="ua-vazio" hidden>Nenhuma história corresponde ao filtro.</p></div>
  </div>
  <div class="section">
    <div class="section-title"><div><div class="eyebrow">PRÓXIMA RODADA</div><h2>Ajustadas · aguardam reteste</h2></div><p>Correções já feitas pela Sottelli e disponíveis em UAT. Entram na lista de aprovadas depois do reteste da MV, em agenda exclusiva com o PMO.</p></div>
    <div class="ua-wrap"><table class="ua-table">
      <thead><tr><th>#</th><th>US</th><th>Título</th><th>Tipo</th><th>Sprint</th><th>Situação</th></tr></thead>
      <tbody>${re.map(reLinha).join('')}</tbody>
    </table></div>
  </div>
  <div class="footer"><span>Projeto Nexus · US aprovadas · Revenue</span><span>${esc(d.rodada)} · Posição de ${esc(d.posicao)}</span></div>
</section>
<script>
// Filtro da aba "US Aprovadas": busca livre + chip por base da aprovação.
(function(){
  var sec=document.getElementById('aprovadas');if(!sec)return;
  var busca=sec.querySelector('.ua-busca'),chips=sec.querySelectorAll('.ua-chip'),linhas=sec.querySelectorAll('.ua-table tbody tr[data-forma]'),vazio=sec.querySelector('.ua-vazio'),forma='todas';
  function aplica(){var t=(busca.value||'').trim().toLowerCase(),n=0;
    linhas.forEach(function(tr){var ok=(forma==='todas'||tr.dataset.forma===forma)&&(!t||tr.dataset.busca.indexOf(t)>=0);tr.hidden=!ok;if(ok)n++});
    if(vazio)vazio.hidden=n>0}
  busca.addEventListener('input',aplica);
  chips.forEach(function(c){c.addEventListener('click',function(){chips.forEach(function(x){x.classList.remove('active')});c.classList.add('active');forma=c.dataset.forma;aplica()})});
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
  console.log(`${d.aprovadas.length} aprovadas, ${(d.reteste || []).length} em reteste · ${pct(d.aprovadas.length, d.escopo)} de ${d.escopo}`);
}
