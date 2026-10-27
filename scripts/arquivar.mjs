// Arquiva uma versao do status report, para que a versao apresentada ao cliente
// nunca mais se perca.
//
//   node scripts/arquivar.mjs --motivo apresentado --rotulo "Status 26/10"
//   node scripts/arquivar.mjs --motivo enviado
//   node scripts/arquivar.mjs --de-git db4c7ed --data 2026-10-17   (reconstrucao)
//
// POR QUE ISTO EXISTE: o painel nao tem historico. O <main> editavel vive numa
// unica linha do Supabase (id=main), sobrescrita a cada save, sem versao nem
// autor; e os numeros do quadro sao lidos do Jira a cada carga da pagina, ou
// seja, mudam sozinhos quando alguem move um card. Resultado: na semana seguinte
// nao existe mais nenhum registro do que foi apresentado. Este script congela os
// tres pedacos de uma vez — numeros do Jira, estado editavel e arquivos de dados
// — dentro de historico/<data>/, e o commit leva para o GitHub.
//
// O que ele NAO captura: a aparencia da pagina. Para isso existe pagina.html,
// gravado a partir do DOM renderizado do painel publicado (ver historico/LEIAME.md).

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const BASE = 'https://nexus-status-command-center.vercel.app';
const DIR = 'historico';
// Todo /data/*.json que os scripts do painel buscam em tempo de execucao. A lista
// veio de: grep -ohE "data/[a-z0-9-]+.json" *.js. Faltar um aqui nao da erro na
// tela congelada: o script simplesmente desiste em silencio. Foi o que aconteceu
// com jira.json ate 27/10 — sem ele, painel() retorna antes de injetar o <style>
// do bloco, e o quadro "Onde o trabalho esta" sai como lista, sem a grade.
const DADOS = ['painel.json', 'esteiras.json', 'riscos.json', 'us-aprovadas.json',
                'jira.json', 'homologacao.json', 'medidas.json', 'metodologia.json',
                'p-9c4e1b7a3f.json'];

// A URL e a chave publishable do Supabase saem do proprio shell.js em vez de
// serem repetidas aqui: chave duplicada e chave que um dia divergi.
function configSupabase() {
  const src = fs.readFileSync('shell.js', 'utf8');
  const url = (src.match(/SB_URL\s*=\s*'([^']+)'/) || [])[1];
  const key = (src.match(/SB_KEY\s*=\s*'([^']+)'/) || [])[1];
  if (!url || !key) throw new Error('nao achei SB_URL/SB_KEY em shell.js');
  return { url, key };
}

function arg(nome, padrao) {
  const i = process.argv.indexOf('--' + nome);
  return i > -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : padrao;
}

async function json(url, headers) {
  const r = await fetch(url, { headers, cache: 'no-store' });
  if (!r.ok) throw new Error(url.replace(/apikey=[^&]*/, 'apikey=***') + ' -> HTTP ' + r.status);
  return r.json();
}

// Uma pasta por versao. Se eu arquivar duas vezes no mesmo dia (apresentou de
// manha, reapresentou corrigido de tarde), a segunda ganha sufixo -2: as duas
// versoes importam, e sobrescrever seria repetir o problema que isto resolve.
function pastaLivre(data) {
  let p = path.join(DIR, data), n = 1;
  while (fs.existsSync(p)) { n++; p = path.join(DIR, data + '-' + n); }
  return p;
}

function commitAtual() {
  try { return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim(); } catch { return null; }
}

async function main() {
  const deGit = arg('de-git');
  const hoje = new Date();
  const dataPadrao = hoje.getFullYear() + '-' + String(hoje.getMonth() + 1).padStart(2, '0') + '-' + String(hoje.getDate()).padStart(2, '0');
  const data = arg('data', dataPadrao);
  const motivo = arg('motivo', 'apresentado');
  const pasta = pastaLivre(data);

  fs.mkdirSync(path.join(pasta, 'dados'), { recursive: true });

  const meta = {
    rotulo: arg('rotulo', 'Status ' + data.split('-').reverse().join('/')),
    motivo,                               // apresentado | enviado | reconstruido
    arquivadoEm: hoje.toISOString(),
    dataDaVersao: data,
    // Numa reconstrucao o commit que importa e o da versao reconstruida, nao o
    // HEAD de hoje: e dele que o montar-pagina.mjs tira o codigo da epoca.
    commit: deGit ? execSync('git rev-parse --short ' + deGit, { encoding: 'utf8' }).trim() : commitAtual(),
    fonteDosNumeros: null,
    avisos: []
  };

  // --- 1. Arquivos de dados -------------------------------------------------
  // Numa reconstrucao vem do commit informado; no arquivamento normal, do disco.
  for (const f of DADOS) {
    let txt = null;
    if (deGit) {
      try { txt = execSync('git show ' + deGit + ':data/' + f, { encoding: 'utf8' }); } catch { }
    } else {
      try { txt = fs.readFileSync(path.join('data', f), 'utf8'); } catch { }
    }
    if (txt) fs.writeFileSync(path.join(pasta, 'dados', f), txt);
    else meta.avisos.push('data/' + f + ' nao encontrado');
  }

  // O painel publicado usa atualizadoEm:"auto" para carimbar o dia em que a
  // pagina e aberta. Numa copia de arquivo isso seria mentira: aberta em marco,
  // a versao de outubro diria marco. Entao a data e resolvida aqui e gravada fixa.
  const painel = JSON.parse(fs.readFileSync(path.join(pasta, 'dados', 'painel.json'), 'utf8'));
  if (String(painel.atualizadoEm || '').toLowerCase() === 'auto') {
    const [a, m, d] = data.split('-').map(Number);
    const dt = new Date(Date.UTC(a, m - 1, d));
    painel.atualizadoEm = String(d).padStart(2, '0') + '/' + String(m).padStart(2, '0') + '/' + a;
    if (painel.semana == null) {
      // Semana ISO: quinta-feira da mesma semana define o ano, como no painel.
      const q = new Date(dt); q.setUTCDate(q.getUTCDate() + 4 - (q.getUTCDay() || 7));
      painel.semana = Math.ceil(((q - Date.UTC(q.getUTCFullYear(), 0, 1)) / 86400000 + 1) / 7);
    }
    painel._congelado = 'atualizadoEm era "auto" no painel publicado; fixado em ' + painel.atualizadoEm + ' ao arquivar.';
    fs.writeFileSync(path.join(pasta, 'dados', 'painel.json'), JSON.stringify(painel, null, 1));
  }
  const esteiras = JSON.parse(fs.readFileSync(path.join(pasta, 'dados', 'esteiras.json'), 'utf8'));
  meta.cabecalho = { atualizadoEm: painel.atualizadoEm, semana: painel.semana || null, sprint: painel.sprint || null };

  // --- 2. Numeros ------------------------------------------------------------
  // Numa versao do dia, a verdade e o /api/jira naquele instante, porque e dele
  // que a tela se alimenta. Numa reconstrucao nao da para voltar no tempo no
  // Jira: fica o que estava publicado nos arquivos, e isso vai declarado.
  const numeros = { capturadoEm: hoje.toISOString(), aoVivo: null, publicado: {} };
  for (const [frente, v] of Object.entries(esteiras.frentes)) {
    numeros.publicado[frente] = {
      lidoEm: v.lidoEm || null,
      linhas: v.esteiras.map(e => ({ nome: e.nome, n: e.n, hab: e.hab || 0, concluido: !!e.concluido, foraEscopo: !!e.foraEscopo }))
    };
  }
  if (deGit) {
    meta.fonteDosNumeros = 'arquivos publicados no commit ' + deGit;
    meta.motivo = 'reconstruido';
    meta.avisos.push('Numeros do quadro reconstruidos dos arquivos; o /api/jira nao tem leitura retroativa, entao o que a tela mostrava naquele dia pode ter diferido em alguns cards.');
  } else {
    try {
      numeros.aoVivo = {};
      for (const frente of Object.keys(esteiras.frentes))
        numeros.aoVivo[frente] = await json(BASE + '/api/jira?frente=' + frente);
      meta.fonteDosNumeros = 'leitura ao vivo de ' + BASE + '/api/jira';
    } catch (e) {
      numeros.aoVivo = null;
      meta.fonteDosNumeros = 'arquivos publicados (o /api/jira nao respondeu)';
      meta.avisos.push('Falha ao ler o /api/jira: ' + e.message);
    }
  }
  fs.writeFileSync(path.join(pasta, 'numeros.json'), JSON.stringify(numeros, null, 1));

  // --- 3. Estado editavel (Supabase) ----------------------------------------
  // E aqui que vivem riscos, proximos passos e resumo da semana escritos a mao.
  // Numa reconstrucao nao existe: a linha ja foi sobrescrita.
  if (deGit) {
    meta.avisos.push('O <main> editavel desta data nao e recuperavel: o Supabase guarda uma linha so, sem versao.');
  } else {
    try {
      const { url, key } = configSupabase();
      const linhas = await json(url + '/rest/v1/status_report_state?id=eq.main&select=payload,updated_at', { apikey: key });
      const row = linhas[0];
      if (row) {
        fs.writeFileSync(path.join(pasta, 'estado-main.html'), String(row.payload && row.payload.main || ''));
        fs.writeFileSync(path.join(pasta, 'estado-completo.json'), JSON.stringify(row, null, 1));
        meta.estadoSalvoEm = row.updated_at;
      } else meta.avisos.push('Supabase respondeu sem a linha id=main');
    } catch (e) {
      meta.avisos.push('Falha ao ler o estado no Supabase: ' + e.message);
    }
  }

  fs.writeFileSync(path.join(pasta, 'meta.json'), JSON.stringify(meta, null, 1));
  fs.writeFileSync(path.join(pasta, 'quadro.html'), quadroHtml(meta, numeros));

  indice();
  console.log('arquivado em ' + pasta);
  if (meta.avisos.length) meta.avisos.forEach(a => console.log('  aviso: ' + a));
  return pasta;
}

// Pagina legivel com os numeros congelados — abre offline, sem depender do Jira
// nem do Supabase. E o minimo para responder "o que eu apresentei naquele dia".
function quadroHtml(meta, numeros) {
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const NOME = { central: 'Central de Projetos', revenue: 'Revenue Cloud' };
  const blocos = Object.entries(numeros.publicado).map(([frente, v]) => {
    const vivo = numeros.aoVivo && numeros.aoVivo[frente];
    const escopo = vivo ? vivo.escopoAtivo : v.linhas.filter(l => !l.foraEscopo).reduce((a, l) => a + (+l.n || 0), 0);
    const linhas = v.linhas.map(l => {
      const pct = l.foraEscopo || !escopo ? '&mdash;' : Math.round((+l.n || 0) / escopo * 100) + '%';
      return '<tr><td class="n">' + esc(l.n) + '</td><td class="p">' + pct + '</td><td>' + esc(l.nome) +
        (l.foraEscopo ? ' <span class="tag">fora da base do percentual</span>' : '') + '</td></tr>';
    }).join('');
    const vivoTxt = vivo ? '<p class="fonte">Leitura do Jira no momento do arquivamento: ' +
      Object.entries(vivo.linhas).map(([k, n]) => esc(k) + ' ' + esc(n)).join(' &middot; ') +
      ' &middot; escopo ativo ' + esc(vivo.escopoAtivo) + ' &middot; total ' + esc(vivo.totalGeral) + '</p>' : '';
    return '<section><h2>' + esc(NOME[frente] || frente) + '</h2>' +
      '<table><tbody>' + linhas + '</tbody></table>' +
      '<p class="fonte">Publicado nos arquivos, lido em ' + esc(v.lidoEm || 'data nao registrada') +
      '. Escopo ativo usado no percentual: ' + esc(escopo) + '.</p>' + vivoTxt + '</section>';
  }).join('');
  const sprint = meta.cabecalho && meta.cabecalho.sprint || {};
  return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>' + esc(meta.rotulo) + '</title><style>' +
    ':root{--fg:#17222e;--mut:#5b6b7b;--line:#dfe5ec;--bg:#fff;--card:#f6f8fa;--ac:#0b5fff}' +
    '@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--fg:#e8edf3;--mut:#9aa8b6;--line:#2a3542;--bg:#121820;--card:#1a2230;--ac:#6fa0ff}}' +
    'body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.55 "Segoe UI",system-ui,sans-serif;padding:32px 16px}' +
    '.w{max-width:820px;margin:0 auto}h1{font-size:22px;margin:0 0 4px}h2{font-size:16px;margin:28px 0 8px}' +
    '.sub{color:var(--mut);font-size:13px;margin:0 0 20px}' +
    'table{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--line);border-radius:8px;overflow:hidden}' +
    'td{padding:9px 12px;border-bottom:1px solid var(--line)}tr:last-child td{border-bottom:0}' +
    '.n{width:64px;text-align:right;font-weight:700;font-variant-numeric:tabular-nums}' +
    '.p{width:64px;text-align:right;color:var(--mut);font-variant-numeric:tabular-nums}' +
    '.tag{color:var(--mut);font-size:12px}.fonte{color:var(--mut);font-size:12.5px;margin:8px 0 0}' +
    '.av{border-left:3px solid var(--ac);background:var(--card);padding:10px 14px;margin:24px 0 0;font-size:13px}' +
    '</style></head><body><div class="w">' +
    '<h1>' + esc(meta.rotulo) + '</h1>' +
    '<p class="sub">Versao ' + esc(meta.motivo) + ' &middot; cabecalho do painel: ' + esc(meta.cabecalho && meta.cabecalho.atualizadoEm) +
    ' &middot; Central ' + esc(sprint.central || '-') + ' &middot; Revenue ' + esc(sprint.revenue || '-') +
    '<br>Arquivado em ' + esc(meta.arquivadoEm) + (meta.commit ? ' &middot; commit ' + esc(meta.commit) : '') + '</p>' +
    blocos +
    (meta.avisos.length ? '<div class="av"><strong>Ressalvas desta copia</strong><ul>' +
      meta.avisos.map(a => '<li>' + esc(a) + '</li>').join('') + '</ul></div>' : '') +
    '</div></body></html>';
}

// Indice do arquivo. Reconstruido do zero a cada arquivamento, lendo as pastas:
// assim ele nunca diverge do que existe em disco.
function indice() {
  const versoes = fs.readdirSync(DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => {
      try { return { pasta: d.name, ...JSON.parse(fs.readFileSync(path.join(DIR, d.name, 'meta.json'), 'utf8')) }; }
      catch { return null; }
    })
    .filter(Boolean)
    .sort((a, b) => String(b.dataDaVersao).localeCompare(String(a.dataDaVersao)));

  fs.writeFileSync(path.join(DIR, 'index.json'), JSON.stringify(versoes, null, 1));

  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const itens = versoes.map(v => {
    const temPagina = fs.existsSync(path.join(DIR, v.pasta, 'pagina.html'));
    const links = ['<a href="' + esc(v.pasta) + '/quadro.html">Numeros</a>'];
    if (temPagina) links.unshift('<a href="' + esc(v.pasta) + '/pagina.html">Painel como estava</a>');
    return '<li><div class="t">' + esc(v.rotulo) + ' <span class="m">' + esc(v.motivo) + '</span></div>' +
      '<div class="m">' + esc(v.dataDaVersao) + (v.estadoSalvoEm ? ' &middot; estado de ' + esc(v.estadoSalvoEm) : '') +
      (v.avisos && v.avisos.length ? ' &middot; ' + v.avisos.length + ' ressalva(s)' : '') + '</div>' +
      '<div class="l">' + links.join(' &middot; ') + '</div></li>';
  }).join('');

  fs.writeFileSync(path.join(DIR, 'index.html'),
    '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Versoes do Status Report</title><style>' +
    ':root{--fg:#17222e;--mut:#5b6b7b;--line:#dfe5ec;--bg:#fff;--card:#f6f8fa}' +
    '@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--fg:#e8edf3;--mut:#9aa8b6;--line:#2a3542;--bg:#121820;--card:#1a2230}}' +
    'body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.55 "Segoe UI",system-ui,sans-serif;padding:32px 16px}' +
    '.w{max-width:720px;margin:0 auto}h1{font-size:22px;margin:0 0 4px}' +
    '.sub{color:var(--mut);font-size:13px;margin:0 0 22px}ul{list-style:none;padding:0;margin:0}' +
    'li{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:12px 14px;margin:0 0 10px}' +
    '.t{font-weight:600}.m{color:var(--mut);font-size:12.5px;font-weight:400}.l{margin-top:6px;font-size:13px}' +
    '</style></head><body><div class="w"><h1>Versoes do Status Report</h1>' +
    '<p class="sub">Uma entrada por versao apresentada ou enviada ao cliente. ' + versoes.length + ' versao(oes) arquivada(s).</p>' +
    '<ul>' + itens + '</ul></div></body></html>');
}

main().catch(e => { console.error('falhou: ' + e.message); process.exit(1); });
