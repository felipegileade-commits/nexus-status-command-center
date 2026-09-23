# Nexus · Status Command Center

Painel executivo do Projeto Nexus. Mostra o cronograma, o progresso por frente
(Revenue Cloud e Central de Projetos) e o resumo semanal de atividades, riscos e
impedimentos. O status é editável pelo próprio painel e compartilhado entre todos
que abrem a URL.

**Produção:** https://nexus-status-command-center.vercel.app

## Arquivos

| Arquivo | Papel |
| --- | --- |
| `index.html` | Página de edição. Define `NEXUS_READONLY=false` e carrega o shell. |
| `view.html` | Página do cliente, somente leitura. Define `NEXUS_READONLY=true`. |
| `shell.js` | Carrega o app num `<iframe>`, injeta os ajustes visuais do cronograma e sincroniza o estado com o Supabase. Compartilhado pelas duas páginas. |
| `legacy-index.html` | O app em si: markup das três abas, CSS e a lógica do editor de status e da impressão. |
| `timeline.js` | Renderizador do cronograma executivo (setembro → novembro): sprints, janelas de trabalho, marcos clicáveis e painel de detalhe. Marca a linha "Hoje", os marcos já passados (✓) e o marco em curso pela data. |
| `jira.js` | Painel "Onde estão as entregas": posição dos itens de cada frente na esteira (concluído → homologação → testes QA → desenvolvimento), lido de `data/jira.json`. Também calcula o cartão "Próximo marco" pela data de hoje. |
| `data/jira.json` | Retrato executivo do Jira. Gerado por `scripts/sync-jira.mjs` (workflow) ou por `scripts/retrato.mjs` a partir de um dump de itens. |
| `data/us-aprovadas.json` | Lista das US aprovadas na homologação por frente (Revenue e Central), com a base de cada aprovação, e das ajustadas que aguardam reteste. Alimenta a aba "US Aprovadas" (`node scripts/us-aprovadas.mjs` regrava a aba no `legacy-index.html`, com filtro por frente). Nas frentes com `controlaIndicador: true` — hoje só Revenue — a lista também define o indicador "homologado" no retrato: card em produção fora da lista conta como em homologação. A Central mantém o indicador vindo direto do Jira. Atualizar a cada rodada de homologação. |

## Os dois links

- **Edição** — `/` (ou `/index.html`): mostra "Editar status", "+ Adicionar etapa" e "✎ Editar", e grava no Supabase.
- **Cliente** — `/view.html`: mesma leitura, sem nenhum caminho de edição. Esconde os três botões e o drawer do editor por CSS no `<head>` do iframe (a restauração do estado troca o `innerHTML` do `<main>`, então esconder só no DOM não bastaria) e substitui `openEditor`, `saveCurrentEditor` e `persistState` por no-ops. Imprimir relatório continua disponível.

Importante: isso impede a edição **pela interface**, não no servidor. Ver a pendência abaixo.

Não há build nem dependências: são três arquivos estáticos servidos direto. O
deploy é automático na Vercel a cada push na `main`.

## Rodando localmente

Qualquer servidor estático serve, desde que sirva a raiz do repositório — o
`index.html` referencia `/legacy-index.html` e `/timeline.js` por caminho
absoluto, então abrir o arquivo direto pelo `file://` não funciona.

```bash
npx serve .
```

## Como o estado é salvo

O estado fica numa única linha (`id=main`) da tabela `status_report_state` no
Supabase. Ao abrir, o `index.html` busca essa linha e injeta o HTML salvo no
`<main>` do app. Ao clicar em **Editar status** e salvar, o `persistState` do app
é redirecionado para gravar de volta no Supabase, e todo mundo passa a ver a
versão nova.

Consequência prática: a edição é destrutiva e global. Não há histórico de
versões — a última gravação vence.

## Pendência conhecida

A chave publishable do Supabase está no cliente (é o esperado para esse tipo de
chave), mas o `PATCH` grava direto na linha `id=main` e a policy RLS da tabela
aceita escrita anônima. Na prática: qualquer pessoa que conheça a URL do Supabase
e a chave — ambas visíveis no `shell.js` — consegue sobrescrever o status, mesmo
usando apenas `view.html`. O modo somente leitura remove a edição da interface,
que resolve o acidente, não o acesso deliberado.

Fechar isso exige restringir `UPDATE` no RLS e autenticar quem edita (Supabase
Auth na página de edição, ou uma edge function com segredo). Enquanto não for
feito, `view.html` é uma barreira de conveniência.

## Edição simultânea (merge por bloco)

O estado é um documento único, mas o `shell.js` evita que um editor apague o
outro. Cada aba guarda o `updated_at` e o conteúdo da versão que carregou; o
`PATCH` só grava se o banco ainda estiver nessa versão (filtro
`updated_at=eq.<versão carregada>`, atômico). Se outra pessoa salvou antes:

1. O shell lê a versão nova e encaixa nela **só o bloco que esta aba editou** — a
   aba do drawer aberta ao salvar: Dados gerais (data/semana), Visão Geral,
   Cronograma, Revenue Cloud ou Central de Projetos. Visão Geral e relatório de
   impressão são recalculados a partir das frentes a cada carga, então não
   precisam entrar no merge.
2. Grava a versão mesclada, recarrega a página e avisa ("seu bloco X foi
   encaixado na versão dela").
3. Se as duas edições caíram no **mesmo bloco**, não há merge honesto: avisa,
   descarta a edição local e recarrega. A pessoa refaz só aquele bloco.

Chaves extras do payload (ex.: `jira`, gravado pelo sync) são preservadas no
save. Para testar sem gravar, o editor expõe `window.__nexusMerge.mesclar(local,
novo, bloco)`.

## Convenção de versão dos assets

`index.html` referencia os assets com um parâmetro de versão
(`/timeline.js?v=...`) para furar o cache da CDN. Ao mudar `timeline.js` ou
`legacy-index.html`, incremente esse valor nas duas referências no topo e no
rodapé do `index.html`.

## Histórico

O cronograma passou por várias iterações (UX4 a UX11) aplicadas por scripts de
patch e workflows do GitHub Actions. Esse maquinário foi removido — ele reescrevia
o `index.html` automaticamente e chegou a deixar chamadas quebradas em produção.
As pontas dos branches de preview estão preservadas nas tags `archive/*`.

## Sincronização com o Jira

`scripts/sync-jira.mjs` lê os projetos MVREV e MVPMO e grava no painel apenas o
que é fato: a sprint ativa de cada frente (rodapé "Sprint N/M"), um retrato em
`payload.jira` — itens por etapa, story points, épicos e divergências entre a
lista do painel e a do Jira — e o `data/jira.json` que alimenta o painel "Onde
estão as entregas" na Visão Geral (o workflow commita o arquivo quando muda).
As etapas do painel estão em `scripts/retrato.mjs` (`ETAPAS`): é lá que se
ajusta a qual coluna cada status do Jira pertence. O editor mostra esse retrato como "Referência do
Jira" na aba de cada frente. Percentuais, textos e o `x/y` dos épicos continuam
manuais: são julgamento, não dado. O cartão "Próximo marco" da Visão Geral é
calculado pela data (primeiro marco do cronograma a partir de hoje) — o valor
digitado no editor é sobrescrito ao carregar.

O job `.github/workflows/sync-jira.yml` roda toda segunda às 07h (Brasília) e
sob demanda em Actions → "Sincronizar Jira" → Run workflow (por padrão em
dry-run, só mostra o que mudaria). Precisa dos segredos `JIRA_EMAIL`,
`JIRA_API_TOKEN` e `SUPABASE_SERVICE_KEY`. A chave de serviço ignora o RLS —
é o único caminho de escrita fora do editor logado, e nunca deve sair dos
segredos do GitHub.

Detalhe de método: nomes de tipo e status com acento não casam no JQL desta
instância; o script usa IDs numéricos.
