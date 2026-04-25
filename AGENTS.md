# Guia para agentes de IA no Space Truck

Este arquivo e a fonte principal de instrucoes para agentes de IA atuando neste repositorio. Se outro guia local divergir, siga este arquivo e proponha a correcao do guia divergente.

## Contexto do produto

O Space Truck e um app de gestao de viagem para caminhoneiros. Nao trate o produto como um app generico de cadastro.

Toda funcionalidade deve gerar pelo menos uma destas entregas praticas para o caminhoneiro:

- leitura clara da situacao da viagem, do veiculo ou do dinheiro;
- decisao mais facil sobre rota, frete, manutencao, abastecimento ou cobranca;
- acao objetiva dentro do fluxo operacional do caminhoneiro.

## Regras de trabalho

- Sempre trabalhe em uma branch. Nao altere direto a `main`.
- Mantenha o escopo pequeno e alinhado ao pedido atual.
- Nao altere regra de negocio, autenticacao, Supabase, migrations, Edge Functions ou variaveis de ambiente sem pedido explicito.
- Nao altere `package.json`, `package-lock.json` ou dependencias sem pedido explicito.
- Antes de editar, leia o codigo ou documento relacionado e siga os padroes existentes.
- Nao remova arquivos em PRs de auditoria ou documentacao, a menos que isso tenha sido pedido explicitamente.
- Preserve mudancas existentes no workspace que nao sejam suas.

## Arquitetura e implementacao

- Separe dados brutos, leituras derivadas e UI.
- Nao duplique logica de calculo em componentes. Reuse seletores, helpers de dominio ou crie uma abstracao compartilhada quando necessario.
- Componentes devem consumir dados ja preparados sempre que possivel.
- Regras de negocio devem ficar fora de componentes visuais quando puderem ser testadas isoladamente.
- Mudancas em fluxos de viagem, frete, abastecimento, manutencao, veiculos ou financeiro exigem validacao cuidadosa e testes proporcionais ao risco.

## Storybook

- Use o Storybook para componentes base reutilizaveis e padroes reais do app.
- Nao crie telas fake, estados inventados ou stories novas fora do escopo pedido.
- Mantenha a separacao entre primitives e app patterns.
- Ao evoluir Storybook, compare com usos reais, especialmente:
  - `src/components/HamburgerMenu.tsx`
  - `src/pages/Dashboard.tsx`
  - `src/pages/VehiclesPage.tsx`
  - `src/pages/MaintenancePage.tsx`
  - `src/pages/NewTripPage.tsx`
  - `src/components/dashboard/DashboardHistoryPreview.tsx`

## Instalacao e validacao

- Sempre rode `npm ci` antes de validar o projeto.
- Nao confie em `node_modules` parcial.
- Se a instalacao falhar ou ficar incompleta, limpe `node_modules` e reinstale.
- Nao rode comandos automaticos fora do escopo da tarefa.

Validacao padrao antes de finalizar:

```sh
npm run build
npm run lint
npm test
```

Para PRs exclusivamente de documentacao, rode pelo menos:

```sh
npm run lint
```

Quando possivel, rode tambem:

```sh
npm run build
```

Use `npm run build-storybook` quando a mudanca tocar Storybook, componentes documentados ou configuracao relacionada.

## Entrega final

Toda entrega deve incluir:

- arquivos alterados;
- motivo das alteracoes;
- comandos executados e resultado;
- riscos ou pontos que ainda precisam de validacao;
- proximos passos recomendados.
