# Nexus · Status Command Center

Painel executivo do Projeto Nexus. Mostra o cronograma, o progresso por frente
(Revenue Cloud e Central de Projetos) e o resumo semanal de atividades, riscos e
impedimentos. O status é editável pelo próprio painel e compartilhado entre todos
que abrem a URL.

**Produção:** https://nexus-status-command-center.vercel.app

## Arquivos

| Arquivo | Papel |
| --- | --- |
| `index.html` | Casca da aplicação. Carrega o app num `<iframe>`, injeta os ajustes visuais do cronograma e sincroniza o estado com o Supabase. |
| `legacy-index.html` | O app em si: markup das três abas, CSS e a lógica do editor de status e da impressão. |
| `timeline.js` | Renderizador do cronograma executivo (setembro → novembro): sprints, janelas de trabalho, marcos clicáveis e painel de detalhe. |

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
chave), mas o `PATCH` grava direto na linha `id=main`. **Confirmar se a policy
RLS da tabela restringe escrita**; se estiver aberta, qualquer pessoa com o link
consegue sobrescrever o status compartilhado.

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
