// Funcao serverless da Vercel: le o Jira e devolve as contagens que alimentam a
// esteira do painel. O token fica no servidor — o navegador nunca ve a credencial.
//
// Variaveis de ambiente (Vercel > Settings > Environment Variables):
//   JIRA_EMAIL      e-mail da conta Atlassian que gerou o token
//   JIRA_API_TOKEN  token de API (id.atlassian.com > Security > API tokens)
//
// So conta: nenhuma rota aqui escreve no Jira nem no painel.
//
// REGUA (fechada com o Felipe e o Gabriel em 16/10/2026)
//
// Tipos: Historia (10001), Habilitador (10005) e Melhoria (10212). O Gabriel pediu o
// habilitador junto das duas consultas que ele usa; Bug e Tarefa ficam de fora porque
// sao a mesma entrega voltando, nao escopo a mais.
//
// Linhas do quadro, cada uma somando colunas do board:
//   Refinamento        = em refino + backlog tecnico
//   Aprovacao de US    = aguardando aprovacao do cliente
//   Desenvolvimento    = a esteira de DownStream inteira
//   Em homologacao UAT = liberado + iniciado + bug/ajuste + reteste
//   Aprovado em UAT    = aprovado em UAT + validado
//   Backlog melhorias  = a coluna de backlog de melhorias
//
// O backlog NAO entra na base do percentual: ele nao e escopo a entregar.

const JIRA = 'https://sottelli.atlassian.net';
const TIPOS = '10001,10005,10212';   // Historia, Habilitador, Melhoria

// Cada chave e uma COLUNA do board. O painel soma as colunas em linhas (ver DERIVADOS).
const COLUNAS = {
  // UpStream
  refino:        'status in ("Em refinamento","EM REFINAMENTO | ESCRITA DE US")',
  backlogTecnico:'status in ("EM ANÁLISE TÉCNICA","Em prototipagem")',
  aprovacaoUS:   'status = "EM APROVAÇÃO DO CLIENTE"',
  // DownStream (a esteira inteira, sem filtro de sprint)
  desenvolvimento:'status in ("Pronto para DEV","EM DESENVOLVIMENTO","PRONTO PARA DEPLOY EM QA","Realizando Deploy em QA")',
  // Homologacao
  liberado:      'status = "Pós Review"',
  iniciado:      'status = "EM HOMOLOGAÇÃO"',
  bugAjuste:     'status in ("BUG","BUG EM CORREÇÃO")',
  reteste:       'status = "BUG EM TESTES"',
  aprovadoUat:   'status = "Liberado para deploy"',
  // CONCLUIDO saiu da regua: nao e coluna de Validado no board, e um card que passe
  // por la voltaria a divergir (a MVPMO-508 ja saiu de CONCLUIDO para Pos Review).
  validado:      'status in ("PRONTO PARA DEPLOY EM PROD","Deploy em Prod. realizado")',
  // Fora do escopo
  backlog:       'status = "BACKLOG"',
  // Controle
  total:         ''
};

const PROJETO = { central: 'MVPMO', revenue: 'MVREV' };

function headers() {
  const email = process.env.JIRA_EMAIL, token = process.env.JIRA_API_TOKEN;
  if (!email || !token) return null;
  return {
    Authorization: 'Basic ' + Buffer.from(email + ':' + token).toString('base64'),
    Accept: 'application/json',
    'Content-Type': 'application/json'
  };
}

async function contar(h, jql) {
  const res = await fetch(JIRA + '/rest/api/3/search/approximate-count', {
    method: 'POST', headers: h, body: JSON.stringify({ jql })
  });
  if (!res.ok) throw new Error('Jira respondeu ' + res.status + ' em: ' + jql.slice(0, 80));
  return Number((await res.json()).count);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  // O painel do cliente e o editor vivem no mesmo dominio, entao nao ha CORS a abrir.

  const temEmail = !!process.env.JIRA_EMAIL, temToken = !!process.env.JIRA_API_TOKEN;
  if (req.query?.diag) return res.status(200).json({
    JIRA_EMAIL: temEmail ? 'presente (' + process.env.JIRA_EMAIL.length + ' caracteres)' : 'AUSENTE',
    JIRA_API_TOKEN: temToken ? 'presente (' + process.env.JIRA_API_TOKEN.length + ' caracteres)' : 'AUSENTE',
    ambiente: process.env.VERCEL_ENV || '(desconhecido)',
    deployDe: process.env.VERCEL_GIT_COMMIT_SHA ? process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7) : '(desconhecido)'
  });

  const h = headers();
  if (!h) return res.status(503).json({
    erro: 'credencial_ausente',
    falta: [!temEmail && 'JIRA_EMAIL', !temToken && 'JIRA_API_TOKEN'].filter(Boolean),
    mensagem: 'O servidor não está enxergando ' +
      (!temEmail && !temToken ? 'nenhuma das duas variáveis' : 'a variável ' + (!temEmail ? 'JIRA_EMAIL' : 'JIRA_API_TOKEN')) +
      '. Confira: (1) estão no projeto certo da Vercel; (2) com o ambiente Production marcado; ' +
      '(3) houve um Redeploy DEPOIS de cadastrar.'
  });

  const frente = String(req.query?.frente || 'central').toLowerCase();
  const projeto = PROJETO[frente];
  if (!projeto) return res.status(400).json({ erro: 'frente_invalida', mensagem: 'Use frente=central ou frente=revenue.' });

  const base = `project = ${projeto} AND issuetype in (${TIPOS})`;
  // Mesmo recorte so com habilitador, para o botao "Ocultar habilitadores" ter o que
  // descontar: sem isso ele fica na tela sem efeito.
  const baseHab = `project = ${projeto} AND issuetype = 10005`;
  const out = { frente, projeto, lidoEm: new Date().toISOString(), colunas: {}, colunasHab: {}, jql: {} };

  try {
    const nomes = Object.keys(COLUNAS);
    const monta = (raiz, n) => COLUNAS[n] ? `${raiz} AND (${COLUNAS[n]})` : raiz;
    const vals = await Promise.all(nomes.map(n => {
      out.jql[n] = monta(base, n);
      return contar(h, out.jql[n]);
    }));
    const habs = await Promise.all(nomes.map(n => contar(h, monta(baseHab, n))));
    nomes.forEach((n, i) => { out.colunas[n] = vals[i]; out.colunasHab[n] = habs[i]; });
  } catch (e) {
    return res.status(502).json({ erro: 'jira_falhou', mensagem: String(e.message || e) });
  }

  // As linhas do quadro, cada uma somando as colunas que o Felipe definiu.
  const c = out.colunas;
  const linhas = {
    refinamento:    c.refino + c.backlogTecnico,
    aprovacaoUS:    c.aprovacaoUS,
    desenvolvimento: c.desenvolvimento,
    homologacao:    c.liberado + c.iniciado + c.bugAjuste + c.reteste,
    aprovado:       c.aprovadoUat + c.validado,
    backlog:        c.backlog
  };
  out.linhas = linhas;
  // Quantos de cada linha sao habilitador, para o botao de ocultar refazer a conta.
  const ch = out.colunasHab;
  out.linhasHab = {
    refinamento:    ch.refino + ch.backlogTecnico,
    aprovacaoUS:    ch.aprovacaoUS,
    desenvolvimento: ch.desenvolvimento,
    homologacao:    ch.liberado + ch.iniciado + ch.bugAjuste + ch.reteste,
    aprovado:       ch.aprovadoUat + ch.validado,
    backlog:        ch.backlog
  };
  // Base do percentual: o escopo a entregar, SEM o backlog de melhorias.
  out.escopoAtivo = linhas.refinamento + linhas.aprovacaoUS + linhas.desenvolvimento
                  + linhas.homologacao + linhas.aprovado;
  out.totalGeral = out.escopoAtivo + linhas.backlog;
  out.foraDoQuadro = c.total - out.totalGeral;   // em espera, bloqueadas ou canceladas

  return res.status(200).json(out);
}
