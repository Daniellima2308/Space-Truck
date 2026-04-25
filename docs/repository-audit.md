# Auditoria inicial do repositorio

Esta auditoria registra pontos encontrados na organizacao inicial do repositorio. Nenhum arquivo deve ser removido apenas por estar listado aqui. Cada limpeza precisa de validacao e PR propria.

## Candidatos a reescrita, arquivamento ou remocao futura

| Item | Observacao | Acao recomendada |
| --- | --- | --- |
| `README.md` | Ainda parece baseado no template Lovable e contem instrucoes genericas de edicao/deploy. | Reescrever em PR futura com foco no Space Truck, setup local, variaveis de ambiente e fluxo de contribuicao. |
| `src/pages/Index.tsx` | Parece fallback antigo com texto de app em branco. | Validar rotas e referencias antes de remover. Se nao for usado, remover em PR propria. |
| `.lovable/plan.md` | Parece plano antigo com mudancas funcionais especificas ja fora do escopo desta PR. | Arquivar ou remover em PR propria depois de confirmar que nao e usado como referencia ativa. |
| `src/lib/storage.ts` | Parece storage legado em `localStorage`, incluindo chave antiga `estrada-real-data`. | Confirmar se ainda ha importacoes ou dependencia de migracao local antes de remover. |
| `src/integrations/lovable/index.ts` | Arquivo auto-gerado de autenticacao Lovable. Busca inicial encontrou referencia direta apenas no proprio arquivo e na dependencia. | Validar fluxo de autenticacao atual antes de remover a integracao em PR propria. |
| `@lovable.dev/cloud-auth-js` | Dependencia associada a integracao Lovable. | Remover somente junto da validacao de que `src/integrations/lovable/index.ts` nao e usado. |
| `bun.lock` | Parece legado se o projeto usa `npm@10`, conforme `packageManager` em `package.json`. | Confirmar decisao oficial por npm e remover em PR propria, sem alterar dependencias funcionais. |
| `.replit` | Parece legado se o projeto nao usa Replit. | Confirmar se alguem ainda usa Replit antes de remover. |

## Qualidade tecnica

| Tema | Observacao | Acao recomendada |
| --- | --- | --- |
| TypeScript | A configuracao atual parece permissiva para uma base que concentra regras de viagem, frete, manutencao e financeiro. | Endurecer progressivamente em PRs pequenas, acompanhadas por ajustes de tipos e testes. |
| ESLint | As regras devem evoluir de forma incremental para reduzir inconsistencias sem bloquear limpezas urgentes. | Adicionar regras aos poucos, com correcao no mesmo escopo. |
| Storybook | A estrutura esta bem configurada e ja possui separacao entre componentes base e patterns. | Evoluir depois da limpeza da base, priorizando padroes reais do app e evitando telas fake. |

## Observacoes da auditoria

- Esta PR nao remove arquivos.
- Esta PR nao altera codigo funcional.
- Esta PR nao altera dependencias.
- Itens ligados a Supabase, autenticacao, migrations, Edge Functions ou regra de negocio exigem PR propria e pedido explicito.
