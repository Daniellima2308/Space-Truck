# Fluxo de desenvolvimento

Este é o fluxo oficial para mudanças no Space Truck.

## Princípios

- O produto é um app de gestão de viagem para caminhoneiros.
- Cada mudança deve preservar ou melhorar leitura, decisão ou ação prática para o caminhoneiro.
- O escopo de cada PR deve ser pequeno, revisável e orientado a um objetivo claro.
- Mudanças de documentação, limpeza, infraestrutura e produto devem ficar em PRs separadas quando possível.

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

- objetivo da mudança;
- arquivos ou áreas que podem ser tocados;
- arquivos ou áreas proibidos;
- validações esperadas.

Durante a implementação:

- não misture refatoração ampla com ajuste funcional;
- não altere regra de negócio sem pedido explícito;
- não altere dependências sem uma PR própria;
- não remova arquivos legados sem auditoria e validação prévias;
- não duplique lógica de cálculo em componentes;
- mantenha separadas as camadas de dados brutos, leituras derivadas e UI.

## Comandos locais

Instale as dependências sempre antes de validar:

```sh
npm ci
```

Desenvolvimento local:

```sh
npm run dev
```

Validação padrão:

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

Use `npm run build-storybook` quando a PR tocar Storybook, componentes documentados ou configuração relacionada.

## PRs

A descrição da PR deve explicar:

- objetivo;
- arquivos alterados;
- motivo das alterações;
- validações executadas;
- riscos conhecidos;
- próximos passos.

Para PRs de documentação:

- não altere código funcional em `src`;
- rode pelo menos `npm run lint`;
- rode `npm run build` quando possível;
- registre qualquer validação não executada e o motivo.

Para PRs funcionais:

- rode `npm run build`, `npm run lint` e `npm test`;
- inclua ou ajuste testes conforme o risco;
- explique qualquer impacto em dados, cálculos, autenticação, Supabase ou fluxo operacional.

## Revisão

Ao revisar uma PR, priorize:

- regressão de regra de negócio;
- impacto na rotina real do caminhoneiro;
- cálculos duplicados ou inconsistentes;
- mistura entre dados brutos, leituras derivadas e UI;
- validações ausentes;
- escopo maior que o necessário.
