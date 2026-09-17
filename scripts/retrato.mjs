// Monta o retrato executivo do Jira (data/jira.json) a partir de uma lista de
// itens {key,project,type,status,parent,parentName,sprints}. E a mesma regra
// usada pelo sync-jira.mjs; fica separada para poder ser rodada com um dump.
//
//   node scripts/retrato.mjs <itens.json> [lidoEm ISO]

import fs from 'node:fs';

// Etapas do painel executivo. Regras acordadas com o Felipe em 16/09:
//   - Aguardando/Pós Review = QA ja testou, aguardando deploy em UAT (esteira QAStream)
//   - Em Espera/Bloqueado = fora do escopo, backlog de uma possivel fase 2 (nao conta como ativo)
//   - Backlog/refinamento/prototipagem/aprovacao = upstream, nao e desenvolvimento
export const ETAPAS = [
  ['prod',     'Concluído',                        ['Deploy em Prod. realizado', 'PRONTO PARA DEPLOY EM PROD', 'CONCLUÍDO', 'VALIDADO']],
  ['uat',      'Homologação com o cliente',        ['EM HOMOLOGAÇÃO', 'Liberado para deploy']],
  ['testado',  'Testado pelo QA · aguardando UAT', ['Aguardando Review', 'Pós Review']],
  ['qa',       'Em teste QA',                      ['Realizando Deploy em QA', 'PRONTO PARA TESTES', 'EM TESTE QA', 'BUG EM CORREÇÃO']],
  ['dev',      'Em desenvolvimento',               ['Pronto para DEV', 'PRONTO PARA DESENVOLVIMENTO', 'EM DESENVOLVIMENTO']],
  ['upstream', 'Refino / aprovação (upstream)',    ['BACKLOG', 'Em refinamento', 'Em prototipagem', 'EM APROVAÇÃO DO CLIENTE']],
  ['fase2',    'Fora do escopo (fase 2)',          ['Em Espera/Bloqueado']],
  ['cancelado','Cancelado',                        ['Cancelado', 'Bug Bloqueado ou Cancelado']]
];
const ETAPA_DE = {};
for (const [id, , nomes] of ETAPAS) for (const n of nomes) ETAPA_DE[n] = id;

export const FRENTES = { revenue: { nome: 'Revenue Cloud', projeto: 'MVREV' }, central: { nome: 'Central de Projetos', projeto: 'MVPMO' } };

// data/desvio.json (opcional): desvio de cronograma por frente, calculado à mão a partir
// da planilha de sprints (o sync não lê a planilha). Entra no retrato como está.
function lerDesvios() {
  try { return JSON.parse(fs.readFileSync('data/desvio.json', 'utf8')); } catch { return null; }
}

// Central: a MV homologa as US até a Sprint 12; cards 'Pós Review' dessas sprints contam como em homologação (uat).
const HOMOLOG_ATE_SPRINT = { MVPMO: 12 };
const maiorSprint = it => Math.max(-1, ...((it.sprints || []).map(s => +((String(s).match(/\d+/) || [-1])[0]))));

export function retrato(itens, sprints, lidoEm) {
  const desvios = lerDesvios();
  const out = { lidoEm: lidoEm || new Date().toISOString(), etapas: ETAPAS.map(([id, nome]) => ({ id, nome })), desvio: desvios ? { calculadoEm: desvios.calculadoEm, metodo: desvios.metodo } : null, frentes: {} };
  for (const [chave, f] of Object.entries(FRENTES)) {
    const xs = itens.filter(i => i.project === f.projeto && i.type !== 'Subtarefa' && i.type !== 'Épico');
    const zero = () => ({ prod: 0, uat: 0, testado: 0, qa: 0, dev: 0, upstream: 0, fase2: 0, cancelado: 0, semEtapa: [] });
    const tot = zero(), porEpico = {};
    for (const i of xs) {
      let e = ETAPA_DE[i.status];
      const lim = HOMOLOG_ATE_SPRINT[i.project];
      if (e === 'testado' && lim != null && i.status === 'Pós Review' && maiorSprint(i) >= 0 && maiorSprint(i) <= lim) e = 'uat';
      const alvo = i.parent ? (porEpico[i.parent] = porEpico[i.parent] || { key: i.parent, nome: i.parentName || i.parent, total: 0, ...zero() }) : null;
      for (const c of [tot, alvo]) {
        if (!c) continue;
        if (c.total != null) c.total++;
        if (e) c[e]++; else c.semEtapa.push(i.key + ' · ' + i.status);
      }
    }
    // ativos = escopo desta fase: sem cancelados e sem fase 2
    const ativos = xs.length - tot.cancelado - tot.fase2;
    const pct = n => ativos ? Math.round(n / ativos * 1000) / 10 : 0;
    out.frentes[chave] = {
      nome: f.nome, projeto: f.projeto, total: xs.length, ativos, ...tot,
      pctHomologado: pct(tot.prod),                                        // aprovado pelo cliente / concluído
      pctUat: pct(tot.prod + tot.uat),                                     // já chegou ao cliente (UAT ou além)
      pctEntregue: pct(tot.prod + tot.uat),                                // painel: US entregues
      pctDesenvolvido: pct(tot.prod + tot.uat + tot.testado + tot.qa),     // saiu do desenvolvimento
      desvio: desvios?.[chave]?.desvio ?? null,                          // cronograma (data/desvio.json)
      desvioNota: desvios?.[chave]?.nota ?? null,                        // subtítulo do desvio
      sprint: sprints?.[chave] || null,
      epicos: Object.values(porEpico).sort((a, b) => b.total - a.total)
    };
  }
  return out;
}

if (process.argv[1] && process.argv[1].endsWith('retrato.mjs')) {
  const [, , arquivo, lidoEm] = process.argv;
  const itens = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
  const sprints = {
    revenue: { nome: 'Sprint 16 - Final', numero: 16, inicio: '2026-09-09', fim: '2026-09-26' },
    central: { nome: 'Sprint 16', numero: 16, inicio: '2026-09-08', fim: '2026-09-23' }
  };
  const r = retrato(itens, sprints, lidoEm);
  fs.writeFileSync('data/jira.json', JSON.stringify(r, null, 1));
  for (const f of Object.values(r.frentes)) console.log(f.nome, f.total, 'itens, ativos', f.ativos, '|', JSON.stringify({ prod: f.prod, uat: f.uat, testado: f.testado, qa: f.qa, dev: f.dev, upstream: f.upstream, fase2: f.fase2, canc: f.cancelado }), '| entregue', f.pctEntregue + '%', 'UAT', f.pctUat + '%', 'homologado', f.pctHomologado + '%', 'desenvolvido', f.pctDesenvolvido + '%', '| sem etapa:', f.semEtapa.length);
}
