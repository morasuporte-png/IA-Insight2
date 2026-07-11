# Pipeline de Pesquisa Recorrente - AI Insights

## Fluxo

1. Coletar rascunhos reais:

```bash
node scripts/research-intake.mjs --limit=2
```

2. Revisar a fila:

Abra `research-review.html` via servidor local ou veja `research/drafts.json`.

3. Aprovar um ou mais rascunhos:

```bash
node scripts/approve-drafts.mjs ID_DO_RASCUNHO
```

Ou aprovar todos, se estiver confiante:

```bash
node scripts/approve-drafts.mjs --all
```

4. Publicar aprovados no site:

```bash
node scripts/publish-approved.mjs --max=6
```

5. O script atualiza `content.json` e roda `scripts/update-content.mjs`.

## Arquivos

- `research-sources.json`: fontes monitoradas.
- `research/drafts.json`: rascunhos coletados.
- `research/approved.json`: fila aprovada.
- `research-review.html`: tela visual de revisão.
- `scripts/research-intake.mjs`: coleta RSS.
- `scripts/approve-drafts.mjs`: aprova rascunhos.
- `scripts/publish-approved.mjs`: publica no site.
- `scripts/update-content.mjs`: reconstrói o HTML.

## Regra editorial

Nada deve ir ao site sem passar por revisão humana. O coletor cria rascunhos, não publica diretamente.

## Proximo nivel

- Conectar Google Sheets ou Notion como fila editorial.
- Adicionar resumo com IA para transformar rascunhos em textos mais autorais.
- Adicionar deduplicação semântica por tema.
- Agendar execução diária.


## GitHub Actions

O arquivo .github/workflows/content-automation.yml roda diariamente, coleta fontes, aciona o gestor editorial, publica aprovados e commita as mudanças. A Vercel publica automaticamente cada commit na branch main.

