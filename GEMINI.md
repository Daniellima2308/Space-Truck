# Space Truck - Diretrizes para Agentes de IA

Este é um app de gestão de viagem para caminhoneiros. Não o trate como um app genérico de cadastro.

## 🚀 Mandatos Principais

1. **Utilidade Prática:** Toda funcionalidade deve gerar leitura, decisão ou ação prática para o caminhoneiro.
2. **Fidelidade ao Produto:** Não invente UI, fluxos ou padrões que não existam no app real. Use a UI real como única fonte de verdade.
3. **Reuso e Consistência:** Antes de criar ou alterar componentes, procure usos reais no projeto.
4. **Integridade de Infraestrutura:** Não altere Supabase, autenticação, banco de dados ou variáveis de ambiente sem necessidade clara e explícita.
5. **Estabilidade de Negócio:** Não altere regras de negócio sem pedido explícito do usuário.

## 📚 Storybook

- **Foundation:** Apenas componentes base reutilizáveis (primitives).
- **App Patterns:** Padrões reais e recorrentes do app.
- **Proibições:** 
  - Não criar telas fake ou estados inventados.
  - Não misturar primitives com patterns.
- **Auditoria:** Compare mudanças com estas referências:
  - `src/components/HamburgerMenu.tsx`
  - `src/pages/Dashboard.tsx`
  - `src/pages/VehiclesPage.tsx`
  - `src/pages/MaintenancePage.tsx`
  - `src/pages/NewTripPage.tsx`
  - `src/components/dashboard/DashboardHistoryPreview.tsx`

## 🧪 Validação e Qualidade

Sempre rode os seguintes comandos quando fizer sentido (antes de finalizar a tarefa):
- `npm run lint`
- `npm test`
- `npm run build-storybook`
- `npm run build`

*Dica: Sempre rode `npm ci` antes de validar se houver mudanças em dependências.*

## 📝 Resumo de Alterações

Toda entrega deve incluir um resumo com:
1. Arquivos alterados.
2. Motivo das alterações.
3. Riscos identificados.
4. Próximos passos recomendados.
