// Monta o retrato executivo do Jira (data/jira.json) a partir de uma lista de
// itens {key,project,type,status,parent,parentName,sprints}. E a mesma regra
// usada pelo sync-jira.mjs; fica separada para poder ser rodada com um dump.
//
//   node scripts/retrato.mjs <itens.json> [lidoEm ISO]

import fs from 'node:fs';

export const ETAPAS = [
  ['prod', 'Concluído',            ['Deploy em Prod. realizado', 'PRONTO PARA DEPLOY EM PROD', 'CONCLUÍDO', 'VALIDADO']],
  ['uat',  'Homologação (cliente)', ['EM HOMOLOGAÇÃO', 'Liberado para deploy']],
  ['qa',   'Testes QA',            ['Realizando Deploy em QA', 'PRONTO PARA TESTES', 'EM TESTE QA', 'Aguardando Review', 'Pós Review', 'BUG EM CORREÇÃO']],
  ['dev',  'Desenvolvimento / fila', ['BACKLOG', 'Em refinamento', 'Em prototipagem', 'EM APROVAÇÃO DO CLIENTE', 'Pronto para DEV', 'PRONTO PARA DESENVOLVIMENTO', 'EM DESENVOLVIMENTO', 'Em Espera/Bloqueado']],
  ['cancelado', 'Cancelado',       ['Cancelado', 'Bug Bloqueado ou Cancelado']]
];
const ETAPA_DE = {};
for (const [id, , nomes] of ETAPAS) for (const n of nomes) ETAPA_DE[n] = id;

export const FRENTES = { revenue: { nome: 'Revenue Cloud', projeto: 'MVREV' }, central: { nome: 'Central de Projetos', projeto: 'MVPMO' } };

export function retrato(itens, sprints, lidoEm) {
  const out = { lidoEm: lidoEm || new Date().toISOString(), etapas: ETAPAS.map(([id, nome]) => ({ id, nome })), frentes: {} };
  for (const [chave, f] of Object.entries(FRENTES)) {
    const xs = itens.filter(i => i.project === f.projeto && i.type !== 'Subtarefa' && i.type !== 'Épico');
    const zero = () => ({ prod: 0, uat: 0, qa: 0, dev: 0, cancelado: 0, bloqueado: 0, semEtapa: [] });
    const tot = zero(), porEpico = {};
    for (const i of xs) {
      const e = ETAPA_DE[i.status];
      const alvo = i.parent ? (porEpico[i.parent] = porEpico[i.parent] || { key: i.parent, nome: i.parentName || i.parent, total: 0, ...zero() }) : null;
      for (const c of [tot, alvo]) {
        if (!c) continue;
        if (c.total != null) c.total++;
        if (e) c[e]++; else c.semEtapa.push(i.key + ' · ' + i.status);
        if (i.status === 'Em Espera/Bloqueado') c.bloqueado++;
      }
    }
    const ativos = xs.length - tot.cancelado;
    out.frentes[chave] = {
      nome: f.nome, projeto: f.projeto, total: xs.length, ativos, ...tot,
      pctConcluido: ativos ? Math.round(tot.prod / ativos * 1000) / 10 : 0,
      pctHomologado: ativos ? Math.round((tot.prod + tot.uat) / ativos * 1000) / 10 : 0,
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
  for (const f of Object.values(r.frentes)) console.log(f.nome, f.total, 'itens |', JSON.stringify({ prod: f.prod, uat: f.uat, qa: f.qa, dev: f.dev, bloq: f.bloqueado, canc: f.cancelado }), '| concluído', f.pctConcluido + '%', '| sem etapa:', f.semEtapa.length);
}
