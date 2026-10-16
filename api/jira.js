// Funcao serverless da Vercel: le o Jira e devolve as contagens que alimentam a
// esteira do painel. Existe para o botao "Conferir com o Jira" do editor poder
// perguntar ao Jira sem que o token saia do servidor — o navegador nunca ve a
// credencial.
//
// Variaveis de ambiente (Vercel > Settings > Environment Variables):
//   JIRA_EMAIL      e-mail da conta Atlassian que gerou o token
//   JIRA_API_TOKEN  token de API (id.atlassian.com > Security > API tokens)
//
// So conta: nenhuma rota aqui escreve no Jira nem no painel. O que fazer com a
// divergencia continua sendo decisao humana — em especial "Aprovado em UAT", que
// NAO sai do Jira e por isso nao aparece como contagem aqui.

const JIRA = 'https://sottelli.atlassian.net';
const TIPOS = '10001,10005';                 // Historia e Habilitador

// Mesma regua da esteira (data/esteiras.json). Nomes com acento nao casam por
// id nesta instancia, entao os status vao por nome, como no JQL que o Felipe confere.
const CONSULTAS = {
  refinamento:   'status in ("EM REFINAMENTO | ESCRITA DE US","Em refinamento","EM ANÁLISE TÉCNICA","Em prototipagem")',
  aprovacaoUS:   'status = "EM APROVAÇÃO DO CLIENTE"',
  desenvolvimento: 'status in ("Pronto para DEV","EM DESENVOLVIMENTO","PRONTO PARA DEPLOY EM QA") OR (status = "Realizando Deploy em QA" AND sprint in openSprints())',
  naUAT:         'status in ("Realizando Deploy em QA","PRONTO PARA TESTES","EM TESTE QA","BUG EM TESTES","Aguardando Review","Pós Review","Liberado para deploy","EM HOMOLOGAÇÃO","BUG","BUG EM CORREÇÃO","PRONTO PARA DEPLOY EM PROD","CONCLUÍDO") AND NOT (status = "Realizando Deploy em QA" AND sprint in openSprints())',
  backlog:       'status = "BACKLOG"',
  // So US no backlog: serve para a conta de controle fechar contra o total do projeto.
  backlogUS:     'status = "BACKLOG"',
  total:         '',
  // Decomposicao da linha de homologacao, para o painel destrinchar sozinho.
  // "Pós Review" E UAT: e a coluna para onde o deploy do Lucas levou as US.
  // Nao e espera para subir — ja subiram, a MV e que ainda nao comecou a testar.
  posReview:     'status = "Pós Review"',
  iniciada:      'status = "EM HOMOLOGAÇÃO"',
  bugAjuste:     'status in ("BUG","BUG EM CORREÇÃO")',
  reteste:       'status = "BUG EM TESTES"',
  liberado:      'status = "Liberado para deploy"',
  validado:      'status in ("PRONTO PARA DEPLOY EM PROD","Deploy em Prod. realizado","CONCLUÍDO")'
};

// Regra do Felipe (16/10): o backlog de melhorias e tudo o que NAO sera entregue ate
// 13/11 — melhoria e ajuste entram aqui, de qualquer tipo de card. Nas demais linhas
// so entram Historia e Habilitador: ali melhoria e ajuste ja feitos nao se contam de
// novo, porque sao a mesma entrega voltando, nao escopo a mais.
const TODOS_OS_TIPOS = new Set(['backlog']);   // backlogUS fica de fora de proposito

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
  const j = await res.json();
  return Number(j.count);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  // Diagnostico: diz o que o servidor esta enxergando, SEM devolver valor nenhum.
  // So presenca e tamanho, para dar para distinguir "nao cadastrou" de "cadastrou
  // no ambiente errado" ou "cadastrou mas nao redeployou".
  const temEmail = !!process.env.JIRA_EMAIL, temToken = !!process.env.JIRA_API_TOKEN;
  if (req.query?.diag) return res.status(200).json({
    JIRA_EMAIL: temEmail ? 'presente (' + process.env.JIRA_EMAIL.length + ' caracteres)' : 'AUSENTE',
    JIRA_API_TOKEN: temToken ? 'presente (' + process.env.JIRA_API_TOKEN.length + ' caracteres)' : 'AUSENTE',
    ambiente: process.env.VERCEL_ENV || '(desconhecido)',
    deployDe: process.env.VERCEL_GIT_COMMIT_SHA ? process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7) : '(desconhecido)',
    commitEm: process.env.VERCEL_GIT_COMMIT_MESSAGE?.slice(0, 60) || '(desconhecido)'
  });

  const h = headers();
  if (!h) return res.status(503).json({
    erro: 'credencial_ausente',
    falta: [!temEmail && 'JIRA_EMAIL', !temToken && 'JIRA_API_TOKEN'].filter(Boolean),
    mensagem: 'O servidor não está enxergando ' +
      (!temEmail && !temToken ? 'nenhuma das duas variáveis' : 'a variável ' + (!temEmail ? 'JIRA_EMAIL' : 'JIRA_API_TOKEN')) +
      '. Confira: (1) estão no projeto certo da Vercel; (2) com o ambiente Production marcado; ' +
      '(3) houve um Redeploy DEPOIS de cadastrar — variável nova só entra no deploy seguinte.'
  });

  const frente = String(req.query?.frente || 'central').toLowerCase();
  const projeto = PROJETO[frente];
  if (!projeto) return res.status(400).json({ erro: 'frente_invalida', mensagem: 'Use frente=central ou frente=revenue.' });

  const base = `project = ${projeto} AND issuetype in (${TIPOS})`;
  const out = { frente, projeto, lidoEm: new Date().toISOString(), contagens: {}, jql: {} };

  try {
    for (const [nome, cond] of Object.entries(CONSULTAS)) {
      const raiz = TODOS_OS_TIPOS.has(nome) ? `project = ${projeto}` : base;
      const jql = cond ? `${raiz} AND (${cond})` : raiz;
      out.jql[nome] = jql;
      out.contagens[nome] = await contar(h, jql);
    }
  } catch (e) {
    return res.status(502).json({ erro: 'jira_falhou', mensagem: String(e.message || e) });
  }

  // O escopo ativo e o que o quadro soma; "naUAT" ainda se divide entre homologacao
  // e aprovado, e essa divisao nao sai daqui (vem do controle da MV).
  const c = out.contagens;
  out.derivados = {
    escopoAtivo: c.refinamento + c.aprovacaoUS + c.desenvolvimento + c.naUAT,
    totalGeral: c.refinamento + c.aprovacaoUS + c.desenvolvimento + c.naUAT + c.backlog,
    // Confere contra o total do projeto usando so US, que e a regua das demais linhas.
    foraDoQuadro: c.total - (c.refinamento + c.aprovacaoUS + c.desenvolvimento + c.naUAT + c.backlogUS)
  };
  out.aviso = 'Aprovado em UAT não sai do Jira: vem do controle de homologação da MV. ' +
              'O número "naUAT" é o total em UAT; a divisão entre homologação e aprovado é decisão humana. ' +
              'O backlog conta todo tipo de card (melhoria e ajuste incluídos); as demais linhas contam só História e Habilitador.';

  return res.status(200).json(out);
}
