# Fluxo de desenvolvimento

Este e o fluxo oficial para mudancas no Space Truck.

## Principios

- O produto e um app de gestao de viagem para caminhoneiros.
- Cada mudanca deve preservar ou melhorar leitura, decisao ou acao pratica para o caminhoneiro.
- O escopo de cada PR deve ser pequeno, revisavel e orientado a um objetivo claro.
- Mudancas de documentacao, limpeza, infraestrutura e produto devem ficar em PRs separadas quando possivel.

## Branches

- Nunca trabalhe direto na `main`.
- Crie uma branch a partir da `main` atualizada.
- Use nomes curtos e descritivos, por exemplo:
  - `docs-environment-guidelines`
  - `chore-repository-cleanup-audit`
  - `fix-trip-km-recalculation`
  - `feat-active-trip-by-vehicle`

## Escopo da PR

Antes de editar, defina:

- objetivo da mudanca;
- arquivos ou areas que podem ser tocados;
- arquivos ou areas proibidos;
- validacoes esperadas.

Durante a implementacao:

- nao misture refatoracao ampla com ajuste funcional;
- nao altere regra de negocio sem pedido explicito;
- nao altere dependencias sem uma PR propria;
- nao remova arquivos legados sem auditoria e validacao previas;
- nao duplique logica de calculo em componentes;
- mantenha separadas as camadas de dados brutos, leituras derivadas e UI.

## Comandos locais

Instale dependencias sempre antes de validar:

```sh
npm ci
```

Desenvolvimento local:

```sh
npm run dev
```

Validacao padrao:

```sh
npm run build
npm run lint
npm test
```

Storybook:

```sh
npm run storybook
npm run build-storybook
```

Use `npm run build-storybook` quando a PR tocar Storybook, componentes documentados ou configuracao relacionada.

## PRs

A descricao da PR deve explicar:

- objetivo;
- arquivos alterados;
- motivo das alteracoes;
- validacoes executadas;
- riscos conhecidos;
- proximos passos.

Para PRs de documentacao:

- nao altere codigo funcional em `src`;
- rode pelo menos `npm run lint`;
- rode `npm run build` quando possivel;
- registre qualquer validacao nao executada e o motivo.

Para PRs funcionais:

- rode `npm run build`, `npm run lint` e `npm test`;
- inclua ou ajuste testes conforme o risco;
- explique qualquer impacto em dados, calculos, autenticacao, Supabase ou fluxo operacional.

## Revisao

Ao revisar uma PR, priorize:

- regressao de regra de negocio;
- impacto na rotina real do caminhoneiro;
- calculos duplicados ou inconsistentes;
- mistura entre dados brutos, leituras derivadas e UI;
- validacoes ausentes;
- escopo maior que o necessario.
