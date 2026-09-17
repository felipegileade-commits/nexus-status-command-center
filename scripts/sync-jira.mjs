// Sincroniza do Jira para o painel o que e FATO, e so isso:
//   - sprint atual de cada frente (numero e datas), no rodape das frentes
//   - um retrato dos epicos e da distribuicao por etapa, guardado em payload.jira
//     para o editor exibir como referencia
//   - data/jira.json, o retrato executivo que o painel "Onde estao as entregas"
//     (jira.js) mostra ao cliente; o workflow commita o arquivo quando muda
//
// Nao toca em percentuais, bullets, riscos, proximos passos nem no x/y de cada
// epico: isso e julgamento gerencial e continua manual. Divergencias na lista de
// epicos sao apenas reportadas.
//
// Uso:
//   node scripts/sync-jira.mjs --dry-run          mostra o que mudaria, nao grava
//   node scripts/sync-jira.mjs                    aplica
//   node scripts/sync-jira.mjs --fixture <dir>    le JSON salvos em vez de chamar o Jira
//
// Variaveis de ambiente (segredos do GitHub Actions):
//   JIRA_EMAIL, JIRA_API_TOKEN     token de API da Atlassian (id.atlassian.com)
//   SUPABASE_SERVICE_KEY           chave service_role do projeto (ignora o RLS)

import fs from 'node:fs';
import path from 'node:path';
import { retrato as retratoExecutivo } from './retrato.mjs';

const JIRA_URL = 'https://sottelli.atlassian.net';
const SB_URL = 'https://abxamhsdtqvifzoijklt.supabase.co';
const STATE = SB_URL + '/rest/v1/status_report_state?id=eq.main';

// Tipos e status por ID: nomes com acento nao casam no JQL desta instancia.
const TIPO = { epico: 10000, entrega: [10001, 10002, 10004, 10005, 10212] };
const ETAPA = {
  // antes do fim do desenvolvimento
  inicio: new Set(['BACKLOG', 'Em refinamento', 'Em prototipagem', 'Pronto para DEV', 'EM DESENVOLVIMENTO',
                   'Em Espera/Bloqueado', 'EM APROVAÇÃO DO CLIENTE', 'Cancelado', 'BUG', 'Bug Bloqueado ou Cancelado']),
  // coluna HOMOLOGACAO EM UAT do board QAStream
  uat: new Set(['Liberado para deploy']),
  // depois da homologacao
  prod: new Set(['PRONTO PARA DEPLOY EM PROD', 'CONCLUÍDO'])
};

const FRENTES = {
  revenue: { nome: 'Revenue', projeto: 'MVREV', board: 966 },
  central: { nome: 'Central de Projetos', projeto: 'MVPMO', board: 1239 }
};

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const FIXTURE = args.includes('--fixture') ? args[args.indexOf('--fixture') + 1] : null;

// --- Jira -------------------------------------------------------------------

function jiraHeaders() {
  const { JIRA_EMAIL, JIRA_API_TOKEN } = process.env;
  if (!JIRA_EMAIL || !JIRA_API_TOKEN) throw new Error('JIRA_EMAIL e JIRA_API_TOKEN sao obrigatorios');
  return {
    Authorization: 'Basic ' + Buffer.from(JIRA_EMAIL + ':' + JIRA_API_TOKEN).toString('base64'),
    Accept: 'application/json', 'Content-Type': 'application/json'
  };
}

async function jiraGet(p) {
  const res = await fetch(JIRA_URL + p, { headers: jiraHeaders() });
  if (!res.ok) throw new Error('Jira ' + res.status + ' em ' + p + ': ' + await res.text());
  return res.json();
}

async function jiraSearch(jql, fields) {
  const out = [];
  let nextPageToken;
  do {
    const body = { jql, fields, maxResults: 100, ...(nextPageToken ? { nextPageToken } : {}) };
    const res = await fetch(JIRA_URL + '/rest/api/3/search/jql', { method: 'POST', headers: jiraHeaders(), body: JSON.stringify(body) });
    if (!res.ok) throw new Error('Jira search ' + res.status + ': ' + await res.text());
    const j = await res.json();
    out.push(...(j.issues || []));
    nextPageToken = j.nextPageToken;
  } while (nextPageToken);
  return out;
}

async function lerJira() {
  if (FIXTURE) {
    const ler = f => JSON.parse(fs.readFileSync(path.join(FIXTURE, f), 'utf8'));
    return { epicos: ler('epicos.json'), itens: ler('itens.json'), sprints: ler('sprints.json') };
  }
  const projetos = Object.values(FRENTES).map(f => f.projeto).join(',');
  const epicos = await jiraSearch(`project in (${projetos}) AND issuetype = ${TIPO.epico}`, ['summary', 'project']);
  const itens = await jiraSearch(`project in (${projetos}) AND issuetype in (${TIPO.entrega.join(',')})`,
                                 ['parent', 'status', 'project', 'issuetype', 'customfield_10024', 'customfield_10020']);
  const sprints = {};
  for (const [chave, f] of Object.entries(FRENTES)) {
    const j = await jiraGet(`/rest/agile/1.0/board/${f.board}/sprint?state=active`);
    sprints[chave] = (j.values || [])[0] || null;
  }
  return { epicos, itens, sprints };
}

// --- Supabase ---------------------------------------------------------------

function sbHeaders() {
  const k = process.env.SUPABASE_SERVICE_KEY;
  if (!k) throw new Error('SUPABASE_SERVICE_KEY e obrigatoria');
  return { apikey: k, Authorization: 'Bearer ' + k, 'Content-Type': 'application/json' };
}

async function lerPayload() {
  if (FIXTURE) return JSON.parse(fs.readFileSync(path.join(FIXTURE, 'payload.json'), 'utf8'));
  const res = await fetch(STATE + '&select=payload', { headers: sbHeaders() });
  if (!res.ok) throw new Error('Supabase ' + res.status + ': ' + await res.text());
  return (await res.json())[0].payload;
}

async function gravarPayload(payload) {
  if (FIXTURE) { fs.writeFileSync(path.join(FIXTURE, 'payload.out.json'), JSON.stringify(payload, null, 1)); return; }
  const res = await fetch(STATE + '&select=updated_at', {
    method: 'PATCH', headers: { ...sbHeaders(), Prefer: 'return=representation' },
    body: JSON.stringify({ payload, updated_at: new Date().toISOString() })
  });
  const rows = res.ok ? await res.json() : [];
  if (!res.ok || !rows.length) throw new Error('Supabase nao gravou: ' + res.status + ' ' + (res.ok ? '(zero linhas)' : await res.text()));
}

// --- Calculo ----------------------------------------------------------------

// Compara nomes ignorando acento, pontuacao, sufixos entre parenteses e
// conectivos: "Gestao de Visoes de Calendarios" e "Gestao de Visoes e
// Calendarios" sao o mesmo epico, so grafia.
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/\([^)]*\)/g, '').replace(/[^a-z0-9 ]/g, ' ')
  .split(/\s+/).filter(w => w && !['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'as', 'os', 'em', 'na', 'no', 'para'].includes(w))
  .map(w => w.replace(/(oes|ao|s)$/, '')).join(' ').trim();
const dm = iso => { const d = new Date(iso); return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`; };
const numeroSprint = nome => { const m = /sprint\s*(\d+)/i.exec(nome || ''); return m ? Number(m[1]) : null; };

function secao(html, id) {
  const i = html.indexOf(`id="${id}"`); if (i < 0) return null;
  const j = html.indexOf('<section', i + 5);
  return { ini: i, fim: j < 0 ? html.length : j, txt: html.slice(i, j < 0 ? html.length : j) };
}

function epicosDoPainel(sec) {
  return [...sec.matchAll(/<div class="num">(\d+)<\/div>\s*<div>([^<]*)<\/div>\s*<strong>([^<]*)<\/strong>/g)]
    .map(m => ({ n: Number(m[1]), nome: m[2].trim(), fracao: m[3].trim() }));
}

function retrato(chave, jira) {
  const f = FRENTES[chave];
  const epicos = jira.epicos.filter(e => e.fields.project.key === f.projeto)
    .map(e => ({ key: e.key, nome: e.fields.summary.trim() }));
  const porEpico = {};
  let total = 0, pts = 0;
  const etapas = { inicio: 0, meio: 0, uat: 0, prod: 0 };
  for (const it of jira.itens) {
    if (it.fields.project.key !== f.projeto) continue;
    const st = it.fields.status?.name, sp = Number(it.fields.customfield_10024) || 0;
    const etapa = ETAPA.inicio.has(st) ? 'inicio' : ETAPA.uat.has(st) ? 'uat' : ETAPA.prod.has(st) ? 'prod' : 'meio';
    total++; pts += sp; etapas[etapa]++;
    const pai = it.fields.parent?.key;
    if (pai) { porEpico[pai] = porEpico[pai] || { itens: 0, pts: 0, uatOuProd: 0 }; porEpico[pai].itens++; porEpico[pai].pts += sp; if (etapa === 'uat' || etapa === 'prod') porEpico[pai].uatOuProd++; }
  }
  const s = jira.sprints[chave];
  return {
    sprint: s ? { nome: s.name, numero: numeroSprint(s.name), inicio: s.startDate, fim: s.endDate } : null,
    itens: total, pontos: pts, etapas,
    epicos: epicos.map(e => ({ ...e, ...(porEpico[e.key] || { itens: 0, pts: 0, uatOuProd: 0 }) }))
  };
}

function driftEpicos(painel, jira) {
  const jn = new Map(jira.map(e => [norm(e.nome), e]));
  const pn = new Map(painel.map(e => [norm(e.nome), e]));
  const casar = (a, mapa) => mapa.get(a) || [...mapa.entries()].find(([k]) => k.includes(a) || a.includes(k))?.[1] || null;
  return {
    soNoJira: jira.filter(e => !casar(norm(e.nome), pn)).map(e => e.key + ' · ' + e.nome),
    soNoPainel: painel.filter(e => !casar(norm(e.nome), jn)).map(e => e.n + ' · ' + e.nome)
  };
}

function atualizarRodape(html, chave, sprint, log) {
  if (!sprint || sprint.numero == null) return html;
  const sec = secao(html, chave); if (!sec) return html;
  const re = /(<div class="front-foot">\s*<span>)Sprint\s+(\d+)\s*\/\s*(\d+)(<\/span>)/;
  const m = re.exec(sec.txt); if (!m) { log.push(`${FRENTES[chave].nome}: rodape "Sprint N/M" nao encontrado`); return html; }
  const atual = Number(m[2]), totalPlanejado = Number(m[3]);
  const total = Math.max(totalPlanejado, sprint.numero);
  if (atual === sprint.numero && total === totalPlanejado) { log.push(`${FRENTES[chave].nome}: rodape ja em Sprint ${atual}/${total}`); return html; }
  const novo = sec.txt.replace(re, `$1Sprint ${sprint.numero}/${total}$4`);
  log.push(`${FRENTES[chave].nome}: rodape Sprint ${atual}/${totalPlanejado} -> Sprint ${sprint.numero}/${total}` +
           (total !== totalPlanejado ? ' (Jira ja passou do total planejado)' : ''));
  return html.slice(0, sec.ini) + novo + html.slice(sec.fim);
}

// --- Main -------------------------------------------------------------------

const jira = await lerJira();
const payload = await lerPayload();
let html = payload.main;
const log = [];
const snapshot = { lidoEm: new Date().toISOString(), frentes: {} };

for (const chave of Object.keys(FRENTES)) {
  const r = retrato(chave, jira);
  const sec = secao(html, chave);
  const drift = sec ? driftEpicos(epicosDoPainel(sec.txt), r.epicos) : { soNoJira: [], soNoPainel: [] };
  snapshot.frentes[chave] = { ...r, drift };
  html = atualizarRodape(html, chave, r.sprint, log);
  log.push(`${FRENTES[chave].nome}: ${r.itens} itens, ${r.pontos} pts | inicio ${r.etapas.inicio} · meio ${r.etapas.meio} · UAT ${r.etapas.uat} · prod ${r.etapas.prod}`);
  if (drift.soNoJira.length) log.push(`  epicos so no Jira: ${drift.soNoJira.join(' | ')}`);
  if (drift.soNoPainel.length) log.push(`  epicos so no painel: ${drift.soNoPainel.join(' | ')}`);
}

// Retrato executivo para o painel do cliente (data/jira.json)
const itensPlanos = jira.itens.map(it => ({
  key: it.key, project: it.fields.project.key, type: it.fields.issuetype?.name || '', status: it.fields.status?.name || '',
  parent: it.fields.parent?.key || null, parentName: it.fields.parent?.fields?.summary || null,
  sprints: (it.fields.customfield_10020 || []).map(s => s.name)
}));
const sprintsExec = {};
for (const chave of Object.keys(FRENTES)) { const s = snapshot.frentes[chave].sprint; sprintsExec[chave] = s ? { nome: s.nome, numero: s.numero, inicio: s.inicio, fim: s.fim } : null; }
const exec = retratoExecutivo(itensPlanos, sprintsExec, snapshot.lidoEm);
for (const f of Object.values(exec.frentes)) log.push(`${f.nome}: painel -> concluído ${f.prod} · homologação ${f.uat} · QA ${f.qa} · dev/fila ${f.dev} (${f.bloqueado} bloq.) · cancelado ${f.cancelado}` + (f.semEtapa.length ? ` · SEM ETAPA: ${f.semEtapa.join(', ')}` : ''));

console.log(log.join('\n'));
if (DRY) { console.log('\n(dry-run: nada gravado)'); process.exit(0); }
fs.mkdirSync('data', { recursive: true });
fs.writeFileSync('data/jira.json', JSON.stringify(exec, null, 1) + '\n');
await gravarPayload({ ...payload, main: html, jira: snapshot });
console.log('\nGravado (Supabase + data/jira.json).');
