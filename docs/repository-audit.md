# Auditoria inicial do repositório

Esta auditoria registra pontos encontrados na organização inicial do repositório. Nenhum arquivo deve ser removido apenas por estar listado aqui. Cada limpeza precisa de validação e PR própria.

## Candidatos a reescrita, arquivamento ou remoção futura

| Item | Observação | Ação recomendada |
| --- | --- | --- |
| `README.md` | Ainda parece baseado no modelo Lovable e contém instruções genéricas de edição e implantação. | Reescrever em PR futura com foco no Space Truck, configuração local, variáveis de ambiente e fluxo de contribuição. |
| `src/pages/Index.tsx` | Parece uma página antiga de fallback com texto de aplicativo em branco. | Validar rotas e referências antes de remover. Se não for usada, remover em PR própria. |
| `.lovable/plan.md` | Parece plano antigo com mudanças funcionais específicas já fora do escopo desta PR. | Arquivar ou remover em PR própria depois de confirmar que não é usado como referência ativa. |
| `src/lib/storage.ts` | Parece armazenamento legado em `localStorage`, incluindo a chave antiga `estrada-real-data`. | Confirmar se ainda há importações ou dependência de migração local antes de remover. |
| `src/integrations/lovable/index.ts` | Arquivo autogerado de autenticação Lovable. Busca inicial encontrou referência direta apenas no próprio arquivo e na dependência. | Validar fluxo de autenticação atual antes de remover a integração em PR própria. |
| `@lovable.dev/cloud-auth-js` | Dependência associada à integração Lovable. | Remover somente junto da validação de que `src/integrations/lovable/index.ts` não é usado. |
| `bun.lock` | Parece legado se o projeto usa `npm@10`, conforme `packageManager` em `package.json`. | Confirmar decisão oficial por npm e remover em PR própria, sem alterar dependências funcionais. |
| `.replit` | Parece legado se o projeto não usa Replit. | Confirmar se alguém ainda usa Replit antes de remover. |

## Qualidade técnica

| Tema | Observação | Ação recomendada |
| --- | --- | --- |
| TypeScript | A configuração atual parece permissiva para uma base que concentra regras de viagem, frete, manutenção e financeiro. | Endurecer progressivamente em PRs pequenas, acompanhadas por ajustes de tipos e testes. |
| ESLint | As regras devem evoluir de forma incremental para reduzir inconsistências sem bloquear limpezas urgentes. | Adicionar regras aos poucos, com correção no mesmo escopo. |
| Storybook | A estrutura está bem configurada e já possui separação entre componentes base e padrões. | Evoluir depois da limpeza da base, priorizando padrões reais do aplicativo e evitando telas fictícias. |

## Observações da auditoria

- Esta PR não remove arquivos.
- Esta PR não altera código funcional.
- Esta PR não altera dependências.
- Itens ligados a Supabase, autenticação, migrations, Edge Functions ou regra de negócio exigem PR própria e pedido explícito.
