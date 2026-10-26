// Monta pagina.html: uma copia da tela do painel como ela estava numa versao
// arquivada, em arquivo unico, que abre sem internet, sem Supabase e sem Jira.
//
//   node scripts/montar-pagina.mjs historico/2026-10-26
//
// COMO FUNCIONA: a copia usa os proprios scripts do painel (jira.js, tema.js,
// timeline.js...), na versao do commit registrado em meta.json, rodando sobre os
// dados congelados em dados/ e numeros.json. Nao e um print nem uma reimplementacao:
// e o painel de verdade alimentado pelo arquivo.
//
// Duas adaptacoes foram necessarias:
//   1. window.fetch e substituido por um que responde /data/*.json e /api/jira
//      com o conteudo arquivado. Nada sai para a rede.
//   2. No site, os scripts leem a pagina por dentro de um iframe (#app) e o
//      shell.js e quem preenche o <main> com o estado do Supabase. Na copia nao
//      ha iframe: o <main> ja vem gravado no HTML e um objeto #app falso aponta
//      contentWindow/contentDocument para a propria janela. Isso tambem conserta
//      a impressao, que num iframe sai cortada numa pagina so.

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const pasta = process.argv[2];
if (!pasta) { console.error('uso: node scripts/montar-pagina.mjs historico/<data>'); process.exit(1); }

const meta = JSON.parse(fs.readFileSync(path.join(pasta, 'meta.json'), 'utf8'));
const numeros = JSON.parse(fs.readFileSync(path.join(pasta, 'numeros.json'), 'utf8'));
const commit = meta.commit || 'HEAD';

const doCommit = (arq) => execSync('git show ' + commit + ':' + arq, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

// --- 1. Os dados congelados, como o fetch falso vai responder ----------------
const dadosDir = path.join(pasta, 'dados');
const respostas = {};
for (const f of fs.readdirSync(dadosDir))
  respostas['/data/' + f] = fs.readFileSync(path.join(dadosDir, f), 'utf8');
if (numeros.aoVivo)
  for (const [frente, payload] of Object.entries(numeros.aoVivo))
    respostas['/api/jira?frente=' + frente] = JSON.stringify(payload);

// --- 2. O HTML do app, com o <main> arquivado por dentro ---------------------
let app = doCommit('legacy-index.html');
const estado = (() => {
  try { return fs.readFileSync(path.join(pasta, 'estado-main.html'), 'utf8'); } catch { return null; }
})();
if (estado && estado.trim()) {
  // A tag <main> de verdade e a que ocupa a linha inteira. Procurar por
  // indexOf('<main>') cai num comentario: o legacy-index.html cita "<main>" no
  // texto do <style> e num comentario HTML, antes da tag real — e injetar ali
  // escreve o estado dentro da folha de estilo e derruba a pagina toda.
  const abre = /^[ \t]*<main>[ \t]*$/m.exec(app);
  if (!abre) throw new Error('nao achei a tag <main> no legacy-index.html');
  const fecha = /^[ \t]*<\/main>[ \t]*$/m.exec(app.slice(abre.index));
  if (!fecha) throw new Error('nao achei o </main> no legacy-index.html');
  const ini = abre.index + abre[0].length;
  const fim = abre.index + fecha.index;
  app = app.slice(0, ini) + '\n' + estado + '\n' + app.slice(fim);
} else {
  console.log('  aviso: sem estado-main.html arquivado; a copia mostra o HTML base, sem os textos escritos a mao');
}

// --- 3. Os scripts do painel, na versao do commit ----------------------------
const SCRIPTS = ['tema.js', 'timeline.js', 'jira.js', 'pendencias.js', 'metodologia.js'];
const codigos = SCRIPTS.map(s => {
  try { return { nome: s, src: doCommit(s) }; }
  catch { console.log('  aviso: ' + s + ' nao existe no commit ' + commit); return null; }
}).filter(Boolean);

// --- 4. O preambulo: fetch falso e o #app que aponta para a propria janela ---
const preambulo = `
<div id="app" hidden></div>
<script>
window.NEXUS_READONLY=true;
window.NEXUS_ARQUIVO=${JSON.stringify({ rotulo: meta.rotulo, dataDaVersao: meta.dataDaVersao, arquivadoEm: meta.arquivadoEm })};
(function(){
  // Respostas congeladas. Qualquer URL fora desta lista devolve 404 de proposito:
  // uma copia de arquivo que silenciosamente buscasse dado novo deixaria de ser copia.
  var R=${JSON.stringify(respostas)};
  function achar(u){
    u=String(u);
    if(R[u])return R[u];
    var limpa=u.replace(/^https?:\\/\\/[^/]+/,'').replace(/[?&]v=[^&]*/,'');
    if(R[limpa])return R[limpa];
    for(var k in R){ if(limpa===k||limpa.indexOf(k)===0)return R[k]; }
    return null;
  }
  window.fetch=function(u){
    var corpo=achar(u&&u.url?u.url:u);
    if(corpo==null)return Promise.resolve(new Response('',{status:404,statusText:'fora do arquivo'}));
    return Promise.resolve(new Response(corpo,{status:200,headers:{'Content-Type':'application/json'}}));
  };
  // Os scripts do painel falam com a pagina atraves de #app.contentWindow. Aqui
  // nao ha iframe, entao #app aponta para esta mesma janela.
  var alvo=document.getElementById('app');
  Object.defineProperty(alvo,'contentWindow',{get:function(){return window}});
  Object.defineProperty(alvo,'contentDocument',{get:function(){return document}});
  // Sem shell.js, o botao de edicao do drawer nao tem para onde salvar.
  var css=document.createElement('style');
  css.textContent='#editBtn,#saveBtn,#drawerBackdrop,#loginBtn,.nx-edit-only{display:none !important}'
    +'@media print{#nx-arquivo{display:none}}'
    +'#nx-arquivo{position:fixed;left:0;right:0;bottom:0;z-index:9999;background:#0b1b2b;color:#cfe0ef;'
    +'font:12px Inter,Segoe UI,Arial,sans-serif;padding:6px 12px;text-align:center;opacity:.95}';
  document.head.appendChild(css);
  // No site, o jira.js so monta o painel quando o iframe dispara 'load'. Sem
  // iframe esse evento nunca chega e a pagina fica com os numeros estaticos que
  // estavam gravados no <main>. Disparamos na mao assim que a janela carrega.
  window.addEventListener('load',function(){
    try{alvo.dispatchEvent(new Event('load'))}catch(e){}
  });
  document.addEventListener('DOMContentLoaded',function(){
    var f=document.createElement('div');
    f.id='nx-arquivo';
    f.textContent='Copia arquivada \\u2014 '+window.NEXUS_ARQUIVO.rotulo+' \\u2014 congelada em '
      +String(window.NEXUS_ARQUIVO.arquivadoEm).slice(0,10)+'. Os numeros nao se atualizam.';
    document.body.appendChild(f);
  });
})();
</script>`;

// --- 5. Junta tudo num arquivo so --------------------------------------------
// O preambulo entra antes dos scripts do painel, porque eles leem #app e fetch
// no momento em que carregam.
const bloco = preambulo + codigos.map(c =>
  '<script>/* ' + c.nome + ' @ ' + commit + ' */\n' + c.src + '\n</script>').join('\n');

const fechaBody = app.lastIndexOf('</body>');
const saida = fechaBody > -1 ? app.slice(0, fechaBody) + bloco + '\n' + app.slice(fechaBody) : app + bloco;

const destino = path.join(pasta, 'pagina.html');
fs.writeFileSync(destino, saida);
console.log('montado ' + destino + '  (' + Math.round(saida.length / 1024) + ' KB, commit ' + commit + ')');
