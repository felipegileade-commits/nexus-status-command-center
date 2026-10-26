# Histórico do Status Report

Uma pasta por versão **apresentada ou enviada ao cliente**. Abra `index.html` para a lista.

## Por que isto existe

O painel não guardava histórico. Três coisas se perdiam toda semana:

1. **O texto escrito à mão** (riscos, próximos passos, resumo da semana) vive numa linha
   única do Supabase, `status_report_state` com `id=main`, **sobrescrita a cada save**. Sem
   versão, sem autor, sem volta.
2. **Os números do quadro** são lidos do Jira a cada carregamento da página. Quando alguém
   move um card, o painel muda sozinho — inclusive o painel "da semana passada".
3. **A data do cabeçalho** usa `atualizadoEm: "auto"`, que carimba o dia em que a página é
   aberta. Uma cópia aberta em março diria março.

Resultado: na semana seguinte não existia mais nenhum registro do que foi apresentado.

## O que cada pasta contém

| arquivo | o que é |
|---|---|
| `painel.pdf` | **O relatório impresso como foi apresentado.** É o arquivo para abrir e mandar. |
| `pagina.html` | A tela do painel congelada, em arquivo único, que abre sem internet. Não vai para o git (é reproduzível — veja abaixo). |
| `quadro.html` | Só os números, página leve que abre em qualquer lugar. |
| `numeros.json` | Os números em formato legível por máquina: a resposta crua do `/api/jira` no momento do arquivamento e os valores publicados nos arquivos. É com ele que se compara uma semana com a outra. |
| `estado-main.html` | O `<main>` do Supabase: todo o texto escrito à mão naquela versão. |
| `estado-completo.json` | A linha inteira do Supabase, com `updated_at`. |
| `dados/` | Cópia de `data/*.json` daquele momento. |
| `meta.json` | Quando foi arquivado, por que, o commit do código e as ressalvas da cópia. |

## Como arquivar uma versão

Logo depois de apresentar ou enviar:

```bash
node scripts/arquivar.mjs --motivo apresentado --rotulo "Status 26/10/2026 (semana 44)"
node scripts/montar-pagina.mjs historico/2026-10-26
```

E o PDF, a partir da página congelada (não do site — o site já mudou):

```bash
chrome --headless=new --disable-gpu --allow-file-access-from-files --virtual-time-budget=18000 --no-pdf-header-footer --print-to-pdf="<pasta>/painel.pdf" "file:///<caminho>/<pasta>/pagina.html"
```

`--motivo` aceita `apresentado`, `enviado` ou `reconstruido`. Arquivar duas vezes no mesmo
dia cria `2026-10-26-2`: as duas versões importam.

## Reconstruir uma versão antiga

Se a versão não foi arquivada no dia, dá para reconstruir a partir do git — mas só em parte:

```bash
node scripts/arquivar.mjs --de-git <commit> --data 2026-10-17 --rotulo "Status 17/10/2026"
```

**O que a reconstrução recupera:** os arquivos de dados do commit, e com eles os números
publicados no quadro.
**O que ela não recupera:** o texto escrito à mão (o Supabase já sobrescreveu) e a leitura
do Jira daquele dia (não há consulta retroativa). As ressalvas ficam registradas em
`meta.json` e aparecem em `quadro.html`.

## Como a página congelada funciona

`montar-pagina.mjs` não reimplementa o painel: ele usa os **próprios scripts** do projeto
(`jira.js`, `tema.js`, `timeline.js`, `pendencias.js`, `metodologia.js`), na versão do commit
registrado em `meta.json`, rodando sobre os dados arquivados. Duas adaptações:

- `window.fetch` é trocado por um que responde `/data/*.json` e `/api/jira` com o conteúdo
  arquivado. **Nada sai para a rede** — uma cópia que buscasse dado novo deixaria de ser cópia.
- No site os scripts falam com a página através do iframe `#app`. Na cópia não há iframe: o
  `<main>` já vem gravado no HTML e um `#app` falso aponta para a própria janela. Isso também
  conserta a impressão, que dentro de um iframe sai cortada numa página só.

Por isso `pagina.html` fica fora do git: ela é regenerável a qualquer momento a partir do
commit + dos dados arquivados, e pesa ~450 KB por versão.

## Armadilha já encontrada

`legacy-index.html` menciona a palavra `<main>` dentro de um comentário no `<style>` e num
comentário HTML, **antes** da tag de verdade. Procurar a tag com `indexOf('<main>')` injeta o
estado no meio da folha de estilo e derruba a página inteira — sem erro no console, só uma
tela em branco. O script casa a tag que ocupa a linha inteira.
