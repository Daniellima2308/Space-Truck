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
2. usa o `@playwright/test` oficial em `devDependencies`;
3. instala o navegador Chromium do Playwright;
4. roda `npm run build`;
5. sobe o app com `npm run preview -- --host 127.0.0.1 --port 4173` via `webServer` do Playwright;
6. executa um smoke test simples na rota inicial.

## Dependência oficial

Com a camada validada em PRs anteriores, o `@playwright/test@1.57.0` foi promovido para `devDependencies` oficiais do projeto.

Agora o CI e o ambiente local usam a mesma dependência versionada em `package.json` e `package-lock.json`, sem instalação temporária com `--no-save`.

Para rodar localmente:

```bash
npm ci
npx playwright install chromium
npm run build
npm run test:e2e
```

## Base URL

Por padrão, o Playwright sobe e testa o preview local em `http://127.0.0.1:4173`.

Se `PLAYWRIGHT_BASE_URL` for definida, o teste usa essa URL externa e não tenta subir o `webServer` local. Isso permite validar um preview remoto sem esperar por uma porta local.

## Próximos passos possíveis

Depois que o smoke test estiver estável, os próximos testes devem focar nos fluxos mais críticos:

- abrir app em estado inicial;
- validar leitura básica de telas públicas;
- testar fallback visual sem dados;
- testar fluxo de autenticação mockado, se existir suporte seguro;
- adicionar uma camada de acessibilidade com axe ou pa11y.
