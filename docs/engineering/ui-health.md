# UI health smoke test

Esta automação adiciona uma checagem pequena de saúde visual e acessibilidade para o Space Truck.

## Objetivo

A intenção desta etapa é detectar problemas críticos de acessibilidade na tela inicial de entrada, sem transformar a esteira em uma barreira barulhenta.

O teste usa Playwright para abrir o app em um navegador real e `@axe-core/playwright` para analisar a tela renderizada.

## Escopo atual

O teste cobre apenas a rota inicial `/`, que hoje exibe a tela de entrada/autenticação.

Ele valida que:

- o título da página contém `Space Truck`;
- o app renderiza a tela de entrada real;
- não existem violações de acessibilidade com impacto `critical`.

## Correção aplicada

A primeira execução encontrou uma violação crítica real na meta tag viewport:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
```

Esse padrão bloqueia zoom em dispositivos móveis, o que prejudica usuários que precisam ampliar a interface.

A configuração foi corrigida para:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

## Por que somente impacto `critical`?

Acessibilidade é importante, mas uma primeira camada muito rígida pode gerar muitos avisos antes de o app ter uma estratégia completa de design system, contraste, foco, labels e navegação por teclado.

Por isso, esta PR começa apenas com violações críticas. Assim a esteira pega problemas graves sem travar o produto por ajustes menores que precisam ser tratados com planejamento.

No futuro, podemos evoluir para:

- bloquear violações `serious`;
- auditar mais rotas;
- testar navegação por teclado;
- validar foco visível;
- exigir nomes acessíveis em botões e campos;
- criar critérios específicos para dark mode.

## Arquivos

- Teste: `tests/e2e/accessibility-smoke.spec.ts`
- Workflow: `.github/workflows/ui-health.yml`

## Dependências oficiais

Com a camada estabilizada, `@playwright/test@1.57.0` e `@axe-core/playwright@4.10.2` foram promovidos para `devDependencies` oficiais do projeto.

Com isso, o CI e o ambiente local passam a usar versões travadas no `package.json` e no `package-lock.json`, sem instalações temporárias com `--no-save`.

Para rodar localmente:

```bash
npm ci
npx playwright install --with-deps chromium
npm run build
npm run test:a11y
```
