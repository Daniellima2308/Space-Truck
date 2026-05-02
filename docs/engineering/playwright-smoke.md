# Playwright smoke test

Esta automação adiciona uma primeira camada de teste end-to-end para o Space Truck.

## Objetivo

A intenção desta etapa é pequena e controlada: verificar se o app builda, sobe no preview local e renderiza o shell principal sem quebrar.

Este teste não tenta cobrir login, Supabase, fluxos de viagem, despesas ou dashboard completo ainda.

## Arquivos

- Configuração: `playwright.config.ts`
- Teste inicial: `tests/e2e/app-smoke.spec.ts`
- Workflow: `.github/workflows/playwright-smoke.yml`

## Modo atual

O workflow:

1. instala dependências do projeto;
2. instala temporariamente o runner `@playwright/test` no ambiente do CI;
3. instala o navegador Chromium do Playwright;
4. roda `npm run build`;
5. sobe o app com `npm run preview` via `webServer` do Playwright;
6. executa um smoke test simples na rota inicial.

## Decisão sobre dependência

Nesta primeira etapa, o workflow instala `@playwright/test@1.57.0` com `npm install --no-save --ignore-scripts`.

Isso permite que `playwright.config.ts` importe `@playwright/test` sem alterar `package.json` e `package-lock.json` enquanto a gente valida se a camada de smoke test realmente agrega valor sem ruído.

Se os testes se mostrarem úteis, uma próxima PR pode promover `@playwright/test` para `devDependencies` e adicionar scripts oficiais no `package.json`.

## Próximos passos possíveis

Depois que o smoke test estiver estável, os próximos testes devem focar nos fluxos mais críticos:

- abrir app em estado inicial;
- validar leitura básica de telas públicas;
- testar fallback visual sem dados;
- testar fluxo de autenticação mockado, se existir suporte seguro;
- adicionar uma camada de acessibilidade com axe ou pa11y.
