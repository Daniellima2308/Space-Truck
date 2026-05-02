# Reviewdog ESLint

Esta automação adiciona comentários inline de ESLint em pull requests usando Reviewdog.

## Objetivo

O CI já roda `npm run lint:quality` e continua sendo a fonte principal de validação.

O Reviewdog entra como camada de leitura rápida: quando o ESLint encontrar algo em linhas adicionadas pela PR, ele pode comentar diretamente no diff. Isso ajuda a entender o problema sem precisar abrir o log completo do CI.

## Modo atual

O workflow está em modo não bloqueante:

- `fail_level: none`
- `level: warning`
- `filter_mode: added`

Isso significa que ele deve orientar, mas não travar o merge sozinho.

## Arquivo

Workflow: `.github/workflows/reviewdog-eslint.yml`

## Segurança

Permissões no workflow:

- workflow: `contents: read`
- job: `contents: read` e `pull-requests: write`

A permissão de escrita fica restrita ao job que precisa comentar na PR.

O workflow instala dependências com `npm ci --ignore-scripts` para evitar execução de lifecycle scripts em pull requests.

## Escopo escolhido

Esta primeira etapa cobre apenas ESLint nos arquivos do app em `src`.

O CI continua responsável por rodar a validação completa com `npm run lint:quality`.

Markdownlint, stylelint e yamllint podem ganhar Reviewdog depois, se os comentários forem úteis e não gerarem ruído demais.
