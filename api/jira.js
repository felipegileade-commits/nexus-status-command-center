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
  const j = await res.json();
  return Number(j.count);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const h = headers();
  if (!h) return res.status(503).json({
    erro: 'credencial_ausente',
    mensagem: 'Faltam JIRA_EMAIL e JIRA_API_TOKEN nas variáveis de ambiente da Vercel. ' +
              'Settings → Environment Variables, depois um novo deploy para valer.'
  });

  const frente = String(req.query?.frente || 'central').toLowerCase();
  const projeto = PROJETO[frente];
  if (!projeto) return res.status(400).json({ erro: 'frente_invalida', mensagem: 'Use frente=central ou frente=revenue.' });

  const base = `project = ${projeto} AND issuetype in (${TIPOS})`;
  const out = { frente, projeto, lidoEm: new Date().toISOString(), contagens: {}, jql: {} };

  try {
    for (const [nome, cond] of Object.entries(CONSULTAS)) {
      const jql = cond ? `${base} AND (${cond})` : base;
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
    foraDoQuadro: c.total - (c.refinamento + c.aprovacaoUS + c.desenvolvimento + c.naUAT + c.backlog)
  };
  out.aviso = 'Aprovado em UAT não sai do Jira: vem do controle de homologação da MV. ' +
              'O número "naUAT" é o total em UAT; a divisão entre homologação e aprovado é decisão humana.';

  return res.status(200).json(out);
}
