# Guia para agentes de IA no Space Truck

Este arquivo é a fonte principal de instruções para agentes de IA atuando neste repositório. Se outro guia local divergir, siga este arquivo e proponha a correção do guia divergente.

## Contexto do produto

O Space Truck é um app de gestão de viagem para caminhoneiros. Não trate o produto como um app genérico de cadastro.

Toda funcionalidade deve gerar pelo menos uma destas entregas práticas para o caminhoneiro:

- leitura clara da situação da viagem, do veículo ou do dinheiro;
- decisão mais fácil sobre rota, frete, manutenção, abastecimento ou cobrança;
- ação objetiva dentro do fluxo operacional do caminhoneiro.

## Regras de trabalho

- Sempre trabalhe em uma branch. Não altere direto a `main`.
- Mantenha o escopo pequeno e alinhado ao pedido atual.
- Não altere regra de negócio, autenticação, Supabase, migrations, Edge Functions ou variáveis de ambiente sem pedido explícito.
- Não altere `package.json`, `package-lock.json` ou dependências sem pedido explícito.
- Antes de editar, leia o código ou documento relacionado e siga os padrões existentes.
- Não remova arquivos em PRs de auditoria ou documentação, a menos que isso tenha sido pedido explicitamente.
- Preserve mudanças existentes no workspace que não sejam suas.

## Arquitetura e implementação

- Separe dados brutos, leituras derivadas e UI.
- Não duplique lógica de cálculo em componentes. Reuse seletores, helpers de domínio ou crie uma abstração compartilhada quando necessário.
- Componentes devem consumir dados já preparados sempre que possível.
- Regras de negócio devem ficar fora de componentes visuais quando puderem ser testadas isoladamente.
- Mudanças em fluxos de viagem, frete, abastecimento, manutenção, veículos ou financeiro exigem validação cuidadosa e testes proporcionais ao risco.

## Storybook

- Use o Storybook para componentes base reutilizáveis e padrões reais do app.
- Não crie telas fake, estados inventados ou stories novas fora do escopo pedido.
- Mantenha a separação entre primitives e app patterns.
- Ao evoluir Storybook, compare com usos reais, especialmente:
  - `src/components/HamburgerMenu.tsx`
  - `src/pages/Dashboard.tsx`
  - `src/pages/VehiclesPage.tsx`
  - `src/pages/MaintenancePage.tsx`
  - `src/pages/NewTripPage.tsx`
  - `src/components/dashboard/DashboardHistoryPreview.tsx`

## Instalação e validação

- Sempre rode `npm ci` antes de validar o projeto.
- Não confie em `node_modules` parcial.
- Se a instalação falhar ou ficar incompleta, limpe `node_modules` e reinstale.
- Não rode comandos automáticos fora do escopo da tarefa.

Validação padrão antes de finalizar:

```sh
npm run build
npm run lint
npm test
```

Para PRs exclusivamente de documentação, rode pelo menos:

```sh
npm run lint
```

Quando possível, rode também:

```sh
npm run build
```

Use `npm run build-storybook` quando a mudança tocar Storybook, componentes documentados ou configuração relacionada.

## Entrega final

Toda entrega deve incluir:

- arquivos alterados;
- motivo das alterações;
- comandos executados e resultado;
- riscos ou pontos que ainda precisam de validação;
- próximos passos recomendados.
