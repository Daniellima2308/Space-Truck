# Auditoria do repositório

Esta auditoria registra pontos encontrados na organização do repositório e orienta próximas limpezas ou melhorias. Nenhum item deve ser alterado apenas por estar listado aqui. Cada mudança precisa de escopo próprio, validação proporcional e PR separada.

## Já resolvido

| Item | Situação |
| --- | --- |
| `README.md` | Reescrito para representar o projeto Space Truck, com setup local, variáveis de ambiente, comandos úteis, fluxo de desenvolvimento e referência ao Storybook. |
| Ambiente Codespaces/Node | Padronizado com `.nvmrc`, `.node-version` e `.devcontainer/devcontainer.json` usando Node 20. |
| Artefatos locais de ferramentas | `.gitignore` ignora `.codex`, `.codex/` e temporários `vitest.config.ts.timestamp-*.mjs`. |
| `src/pages/Index.tsx` | Removido por ser uma página antiga de fallback sem uso na rota raiz atual. |
| `.lovable/plan.md` | Removido por ser um plano antigo da Lovable que não deve orientar o trabalho atual. |
| `src/lib/storage.ts` | Removido por ser um helper legado de `localStorage` sem uso ativo. |
| `src/integrations/lovable/index.ts` | Removido por ser uma integração Lovable autogerada sem uso ativo no login atual. |
| `@lovable.dev/cloud-auth-js` | Removido de `package.json` e `package-lock.json` após a remoção da integração Lovable. |
| `.replit` | Removido por ser configuração legada do Replit fora do fluxo atual do projeto. |
| `bun.lock` | Removido porque o projeto está padronizado em npm e usa `package-lock.json` como lockfile oficial. |

## Próximos pontos de melhoria técnica

| Tema | Observação | Ação recomendada |
| --- | --- | --- |
| TypeScript | A configuração atual ainda é permissiva para uma base que concentra regras de viagem, frete, manutenção e financeiro. | Endurecer progressivamente em PRs pequenas, acompanhadas por ajustes de tipos e testes. |
| ESLint | As regras devem evoluir de forma incremental para reduzir inconsistências sem bloquear limpezas urgentes. | Adicionar regras aos poucos, com correção no mesmo escopo. |
| Edge Functions | Funções como rota, pedágio e contato precisam de revisão de autenticação, custo e configuração de ambiente. | Revisar em PRs próprias, sem misturar com limpeza de arquivos. |
| `send-contact-email` | Ainda usa marca/e-mail antigo em código. | Mover e-mail administrativo para configuração de ambiente e alinhar textos com Space Truck. |
| `routeApi.ts` | Possui logs de diagnóstico sempre ativos. | Colocar logs atrás de flag de debug ou limitar a ambiente de desenvolvimento. |
| Supabase client | Usa variáveis de ambiente diretamente. | Criar validação amigável para falha clara quando variáveis obrigatórias estiverem ausentes. |
| `AppContext.tsx` | Ainda concentra carregamento de dados, sincronização offline, cache e provider. | Separar `fetchAppData` e sincronização offline em módulos próprios, em PRs pequenas. |
| Storybook | A estrutura está bem configurada e já possui separação entre componentes base e padrões. | Evoluir depois da limpeza da base, priorizando padrões reais do aplicativo e evitando telas fictícias. |

## Observações da auditoria

- Esta auditoria é um mapa de trabalho, não autorização automática para alterar arquivos.
- Cada mudança deve acontecer em PR própria, com escopo pequeno e validação proporcional.
- Itens ligados a Supabase, autenticação, migrations, Edge Functions ou regra de negócio exigem PR própria e pedido explícito.
