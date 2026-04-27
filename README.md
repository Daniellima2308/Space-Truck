# Space Truck

Space Truck é um app de gestão de viagens para caminhoneiros, pensado para apoiar a rotina operacional da estrada com leitura clara, decisão rápida e ação prática.

O projeto não é tratado como um app genérico de cadastro. As telas, dados e fluxos existem para organizar a operação real: acompanhar viagens, entender custos, registrar eventos importantes, controlar recebíveis e manter a frota pronta para rodar.

## Principais áreas do app

- Viagens
- Veículos
- Fretes
- Abastecimentos
- Despesas
- Manutenção
- Contas e recebíveis
- PX Digital
- Storybook e design system

## Stack técnica

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Supabase
- Storybook
- Vitest

## Requisitos

- Node 20.x
- npm 10.x

## Setup local

Instale as dependências a partir do lockfile:

```sh
npm ci
```

Inicie o servidor de desenvolvimento:

```sh
npm run dev
```

## Variáveis de ambiente

Crie um arquivo `.env.local` na raiz do projeto com as variáveis necessárias para o ambiente local.

```sh
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_TOMTOM_API_KEY=
```

`VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` configuram a conexão com o Supabase. `VITE_TOMTOM_API_KEY` deve ser preenchida quando for necessário usar recursos de rotas ou geocoding.

Não versionar valores reais de configuração sensível.

## Comandos úteis

```sh
npm run dev
npm run build
npm run lint
npm test
npm run test:watch
npm run test:coverage
npm run storybook
npm run build-storybook
```

## Fluxo de desenvolvimento

- Trabalhe sempre em uma branch criada a partir da `main` atualizada.
- Mantenha PRs pequenas, com objetivo claro e escopo revisável.
- Valide a mudança antes de abrir a PR.
- Siga as instruções do `AGENTS.md`.
- Consulte `docs/development-workflow.md` para o fluxo oficial do projeto.

## Storybook

O Storybook documenta componentes base e padrões reais usados no app. Ele deve evoluir com o design system do Space Truck, priorizando componentes, estados e composições que representem a experiência real do produto.

Não crie telas fake no Storybook. Novas histórias devem ajudar a validar padrões existentes ou necessidades reais do app.

## Arquivos legados

A auditoria inicial de arquivos e pontos de limpeza está registrada em `docs/repository-audit.md`.

Qualquer remoção, arquivamento ou limpeza estrutural deve acontecer em PR própria, com validação específica e escopo controlado.
