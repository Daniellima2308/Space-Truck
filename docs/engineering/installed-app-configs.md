# Configurações dos apps instalados

Este documento registra as configurações versionadas adicionadas para apps já instalados no Space Truck.

## Objetivo

Reduzir configuração invisível em painéis externos e deixar regras importantes dentro do repositório, revisáveis por PR.

## Configurações adicionadas nesta etapa

| Ferramenta | Arquivo | Função | Decisão |
| --- | --- | --- | --- |
| Bito | `.bito.yaml` | Revisão IA de PR com contexto do Space Truck | Usar `AGENTS.md` como guideline principal e reduzir ruído com modo `essential`. |
| DeepSource | `.deepsource.toml` | Análise JavaScript/TypeScript/React e secrets | Declarar React, TypeScript, Vitest e excluir artefatos gerados. |
| Renovate | `renovate.json` | Atualização de GitHub Actions pinadas por SHA | Focar somente em `github-actions` para não duplicar o Dependabot em npm. |
| Dependabot | `.github/dependabot.yml` | Atualização de dependências npm | Manter npm no Dependabot e remover GitHub Actions para evitar PRs duplicadas. |

## Divisão de responsabilidades

### Dependabot

Dependabot continua responsável por dependências npm do app:

- `dependencies`;
- `devDependencies`;
- agrupamento de produção e desenvolvimento;
- janela semanal na segunda-feira de manhã.

### Renovate

Renovate fica responsável por GitHub Actions:

- atualização de Actions pinadas por SHA;
- agrupamento de updates menores/patch/digest;
- major updates separadas;
- sem automerge por enquanto;
- dashboard de dependências para revisão manual.

Essa divisão evita dois robôs abrindo PRs para a mesma coisa.

## Política para Bito

Bito deve ajudar na revisão, não virar bloqueador principal de merge.

Configuração escolhida:

- usa `AGENTS.md` como guideline principal;
- ignora artefatos gerados e lockfile;
- ignora PRs draft;
- ignora PRs com labels `skip-bito`, `dependencies` e `automated`;
- não posta como `Request changes` automaticamente;
- usa `suggestion_mode: essential` para reduzir comentários repetidos.

## Política para DeepSource

DeepSource deve complementar Sonar, Codacy, Semgrep e Snyk sem duplicar tudo.

Configuração escolhida:

- analyzer `javascript` com React;
- dialect `typescript`;
- ambientes `browser`, `nodejs` e `vitest`;
- analyzer `secrets` ativo;
- exclusão de `coverage`, `dist`, `storybook-static` e tipos gerados do Supabase.

## Próximos passos

- Observar a primeira PR depois do merge para ver se Bito, DeepSource e Renovate reconhecem os arquivos.
- Ajustar o inventário mestre se algum bot sugerir naming ou configuração mais precisa.
- Avaliar `.pr_agent.toml` para Qodo/PR-Agent em PR separada.
- Avaliar hardening futuro da Supabase CLI, fixando versão em vez de `latest`.
