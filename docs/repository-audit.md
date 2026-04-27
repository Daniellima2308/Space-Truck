# Auditoria inicial do repositório

Esta auditoria registra pontos encontrados na organização inicial do repositório. Nenhum arquivo deve ser removido apenas por estar listado aqui. Cada limpeza precisa de validação e PR própria.

## Já resolvido

| Item | Situação |
| --- | --- |
| `README.md` | Reescrito para representar o projeto Space Truck, com setup local, variáveis de ambiente, comandos úteis, fluxo de desenvolvimento e referência ao Storybook. |
| Ambiente Codespaces/Node | Padronizado com `.nvmrc`, `.node-version` e `.devcontainer/devcontainer.json` usando Node 20. |
| Artefatos locais de ferramentas | `.gitignore` já ignora `.codex`, `.codex/` e temporários `vitest.config.ts.timestamp-*.mjs`. |

## Candidatos a reescrita, arquivamento ou remoção futura

| Item | Observação | Ação recomendada |
| --- | --- | --- |
| `src/pages/Index.tsx` | Página antiga de fallback com texto de aplicativo em branco. A rota raiz atual aponta para `Dashboard`, não para `Index`. | Remover em PR própria após validação de referências, build, lint e testes. |
| `.lovable/plan.md` | Plano antigo com mudanças funcionais específicas, algumas já superadas pelo estado atual do app. | Remover ou arquivar em PR própria depois de confirmar que não é usado como referência ativa. |
| `src/lib/storage.ts` | Armazenamento legado em `localStorage`, incluindo a chave antiga `estrada-real-data`. A base atual usa Supabase e cache/offline queue. | Confirmar ausência de importações e remover em PR própria com build, lint e testes. |
| `src/integrations/lovable/index.ts` | Arquivo autogerado de autenticação Lovable. O login atual usa Supabase diretamente. | Validar ausência de uso e remover a integração em PR própria. |
| `@lovable.dev/cloud-auth-js` | Dependência associada à integração Lovable. | Remover junto da integração Lovable, atualizando `package-lock.json` em PR própria. |
| `bun.lock` | Parece legado se o projeto usa `npm@10`, conforme `packageManager` em `package.json`. | Confirmar decisão oficial por npm e remover em PR própria, sem alterar dependências funcionais. |
| `.replit` | Parece legado se o projeto não usa Replit. Também contém configuração de ambiente que não deve ser mantida como fonte ativa do projeto. | Remover se Replit não for usado; se for usado, corrigir e mover valores de ambiente para configuração privada da plataforma. |

## Pontos de melhoria técnica

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

- Esta auditoria é um mapa de trabalho, não autorização automática para remover arquivos.
- Cada remoção deve acontecer em PR própria, com escopo pequeno e validação proporcional.
- Itens ligados a Supabase, autenticação, migrations, Edge Functions ou regra de negócio exigem PR própria e pedido explícito.
