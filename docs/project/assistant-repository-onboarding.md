# Protocolo de onboarding profundo do assistente

Este documento define como qualquer novo chat, agente ou assistente deve entrar no projeto Space Truck antes de sugerir, planejar ou executar trabalho.

A regra principal é simples:

> Antes de trabalhar, faça a vistoria completa do caminhão.

O assistente não deve iniciar uma conversa como se o Space Truck fosse uma ideia solta, uma landing page do zero ou um aplicativo sem histórico. O Space Truck já é um produto em evolução, com app existente, rotas, autenticação, Supabase, contexto global, workflows, revisores, documentação, PRs mergeadas e decisões estratégicas.

Este protocolo é obrigatório quando o pedido envolver:

- arquitetura;
- produto;
- UX/UI;
- landing pública;
- beta gate;
- autenticação;
- admin;
- Supabase;
- RLS;
- WhatsApp/SMS/OTP;
- AppContext;
- refatoração;
- PRs;
- revisão de código;
- ferramentas, bots ou CI;
- continuidade de trabalho em chat novo.

## Relação com outros documentos

Leia sempre nesta ordem:

1. `AGENTS.md`;
2. `docs/project/assistant-operating-manual.md`;
3. `docs/project/assistant-repository-onboarding.md`;
4. `docs/engineering/review-operations.md`, quando o assunto for PR, bots, checks ou merge;
5. documentos específicos da área tocada pela tarefa.

O `AGENTS.md` continua sendo a fonte técnica primária para agentes no repositório.

O `assistant-operating-manual.md` define postura, visão de produto e princípios gerais.

Este documento define o protocolo prático de entrada no projeto: o raio-x que o assistente precisa fazer antes de atuar.

## Mentalidade correta

Trate o início de um novo chat como a contratação de um funcionário novo para o Space Truck.

Antes de sugerir solução, esse funcionário precisa entender:

- o que já existe;
- o que já foi decidido;
- o que já foi resolvido;
- quais ferramentas estão configuradas;
- quais riscos já foram identificados;
- quais decisões não devem ser reabertas sem motivo;
- onde estão os pontos frágeis;
- como o produto deve evoluir sem virar bagunça.

Não comece pela resposta.

Comece pela vistoria.

## O que nunca fazer em chat novo

Nunca:

- tratar o Space Truck como projeto do zero;
- sugerir uma landing externa antes de avaliar o app existente;
- sugerir Firebase, Airtable, Google Sheets, Framer, Next.js, Bubble ou outra stack externa como primeira opção sem comparar com React/Vite/Supabase/Vercel já existentes;
- ignorar que o app já tem login, rotas, AuthGuard, AuthContext e AppContext;
- sugerir refazer o app sem necessidade;
- propor solução já rejeitada ou já resolvida em PR anterior;
- assumir que uma feature não existe sem procurar;
- responder genericamente com plano de marketing quando o pedido depende do código atual;
- falar como consultor externo sem entender o repo;
- criar estratégia sem verificar docs e PRs recentes;
- sugerir alterar auth, Supabase, RLS, dependências ou workflows sem examinar arquivos reais.

## Checkpoint obrigatório antes de responder

Antes de responder a pedidos relevantes, o assistente deve montar um checkpoint interno e, quando útil, apresentar um resumo ao Daniel.

O checkpoint deve responder:

1. Quais partes do app já existem?
2. Quais rotas públicas e protegidas existem hoje?
3. Como o login e autenticação estão estruturados hoje?
4. Como o `AppContext` está organizado hoje?
5. Quais dados e domínios principais existem no app?
6. Quais integrações com Supabase existem?
7. Quais docs recentes já definem decisões?
8. Quais PRs recentes já resolveram ou decidiram algo relacionado?
9. Quais ferramentas/checks/bots já estão ativos?
10. O pedido atual é evolução de algo existente ou criação nova?
11. O que não deve ser refeito?
12. Qual é a menor próxima PR segura?

## Raio-x mínimo do repositório

Sempre que o pedido for amplo ou estratégico, o assistente deve inspecionar pelo menos:

- `AGENTS.md`;
- `package.json`;
- `src/App.tsx`;
- `src/context/AuthContext.tsx`;
- `src/context/AppContext.tsx`;
- `src/components/AuthGuard.tsx`;
- `src/integrations/supabase/client.ts`;
- `src/integrations/supabase/types.ts`;
- `src/types.ts` ou tipos principais;
- `src/lib/mappers.ts`;
- `src/lib/offlineQueue.ts`;
- `src/context/mutations/`;
- `src/pages/` relevantes;
- `src/features/` relevantes;
- `supabase/` e migrations, quando houver impacto em banco;
- `.github/workflows/` quando houver impacto em CI;
- docs em `docs/engineering/`, `docs/project/` e `docs/architecture/`, quando existirem.

Se a ferramenta de busca do repo falhar ou estiver incompleta, abrir arquivos diretamente pelos caminhos prováveis antes de concluir.

## Raio-x de PRs e decisões anteriores

Antes de propor algo grande, o assistente deve verificar PRs recentes mergeadas e PRs abertas.

Objetivo:

- evitar repetir trabalho;
- entender o que foi decidido;
- saber quais ferramentas foram configuradas;
- saber quais dívidas técnicas foram assumidas conscientemente;
- não reabrir discussão já encerrada sem motivo.

Verificar, no mínimo:

- PRs abertas;
- últimas PRs mergeadas;
- PRs relacionadas ao tema atual;
- comentários ou summaries dos bots quando forem relevantes.

PRs recentes importantes conhecidas no momento deste documento:

- #148 `docs: add assistant operating manual`: criou o manual operacional do assistente;
- #147 `test: promote Playwright tooling to dev dependencies`: oficializou Playwright e axe como dependências de desenvolvimento;
- #145 `docs: add review operations guide`: criou o ritual de revisão de PRs e classificação de bots;
- #144 `test: add critical accessibility smoke test`: adicionou UI health com axe para violações críticas;
- #143 `test: add Playwright smoke test`: adicionou smoke test E2E básico;
- #142 `ci: add Reviewdog ESLint annotations`: adicionou comentários inline de ESLint;
- #141 `ci: add Danger JS warning review`: adicionou Danger em modo warning;
- #140 `chore: add issue forms and refine PR template`: estruturou issues e template de PR;
- #139 `ci: add release and PR automation`: adicionou automações de PR/release;
- #138 `ci: add secrets and YAML validation`: adicionou Gitleaks e yamllint;
- #137 `ci: configure qodo review guidance`: configurou orientação do Qodo;
- #136 `ci: configure installed repository apps`: documentou/configurou apps e ferramentas;
- #133 `docs: add engineering tooling inventory`: criou inventário de tooling;
- #125 `feat: add support ticket schema`: criou base de tickets de suporte com RLS;
- #120 `feat: add help center shell`: adicionou base visual da Central de Ajuda.

Esta lista pode ficar desatualizada. Use-a como pista, não como verdade final. Sempre confirme o estado atual do GitHub.

## Raio-x de produto

Antes de sugerir produto, o assistente deve entender que o Space Truck é:

- app de gestão de viagem para caminhoneiros;
- ferramenta de leitura operacional;
- produto orientado a lucro real, custos, viagem, frete e rotina de estrada;
- sistema com potencial de beta gate, landing pública, admin e conta única;
- produto com mascote/assistente Bino;
- app que precisa parecer ferramenta de trabalho, não app genérico.

Perguntas obrigatórias:

- Essa ideia resolve dor real ou só adiciona tela?
- Ela ajuda o caminhoneiro a entender, decidir ou agir?
- Ela combina com a realidade da estrada?
- Ela deve ir agora ou depois?
- Ela depende de auth, RLS, admin, OTP ou AppContext?
- Ela precisa de landing/admin ou é app interno?
- Ela já foi discutida antes?

## Raio-x de arquitetura

Antes de sugerir arquitetura, conferir:

- onde está a fonte de verdade;
- onde estão leituras derivadas;
- onde está a UI;
- se a regra está espalhada;
- se a mudança aumentaria o `AppContext`;
- se há risco de duplicar cálculo;
- se envolve Supabase/RLS;
- se precisa de Edge Function;
- se precisa de feature flag;
- se precisa de migração reversível;
- se precisa de teste;
- dependência do `AppContext` em relação ao `AuthContext`.

Não propor refatoração gigante como primeiro passo.

O padrão preferido é PR pequena, com objetivo claro e reversível.

## Raio-x de autenticação e acesso

Antes de mexer ou sugerir auth, verificar:

- `AuthContext`;
- `AuthGuard`;
- rotas em `src/App.tsx`;
- páginas de login/registro/reset;
- configuração do Supabase client;
- tabelas `profiles` e políticas existentes, se houver;
- fluxo atual de login com e-mail/Google, se implementado;
- dependência do AppContext em relação ao AuthContext.

Direção estratégica já alinhada:

- conta única do Space Truck;
- login por Google, e-mail, telefone e futuramente username;
- Google pode pedir criação de senha do app depois do login;
- telefone pode existir sem estar verificado;
- WhatsApp/SMS OTP deve ficar preparado, mas desligado por padrão até ativação real;
- username login não é nativo do Supabase e exige implementação customizada segura;
- usuários novos podem nascer como `waitlisted`;
- usuários aprovados entram como `approved`;
- admin deve controlar liberação.

Nunca tratar auth como simples tela visual.

Auth é produto, segurança, banco e UX ao mesmo tempo.

## Raio-x de landing pública e beta gate

Antes de propor landing, lembrar:

A decisão estratégica não é criar um site solto separado.

A direção preferida é transformar o app existente em um produto com área pública e área protegida:

- `/` como landing pública;
- `/acesso-antecipado` para captação;
- `/login` ou `/entrar` para autenticação;
- `/aguardando` para usuário na lista;
- `/app/*` para app real protegido;
- `/admin/*` para painel admin.

O novo chat não deve sugerir automaticamente:

- site separado;
- Framer;
- Firebase;
- Airtable;
- Google Sheets;
- Next.js;
- automação externa de leads.

Essas opções podem ser discutidas, mas só depois de comparar com o app atual e explicar por que seriam melhores.

Como padrão, a solução deve partir de React/Vite/Supabase/Vercel já existentes.

## Raio-x do admin

Antes de sugerir admin, verificar:

- se já existe área admin;
- se existe `profiles` com role/status;
- se existem Edge Functions;
- se existem policies de RLS;
- se existe audit log;
- se há suporte tickets ou help center que podem conectar com admin.

O admin desejado deve permitir:

- listar usuários;
- buscar por nome, e-mail, telefone e username;
- aprovar beta;
- suspender/bloquear;
- alterar status;
- ver respostas de captação;
- futuramente controlar flags e comunicações;
- registrar audit logs.

Ações sensíveis não devem usar `service_role` no front.

## Raio-x de WhatsApp/SMS/OTP

Antes de propor WhatsApp/SMS, lembrar:

- não existe WhatsApp/SMS gratuito real para produção em escala;
- pode existir trial ou crédito, mas produção cobra por uso;
- a arquitetura pode ficar pronta sem disparar mensagens reais;
- usar feature flags e provider mock em dev/preview;
- ativar provider real somente quando Daniel decidir;
- nunca expor segredo de Twilio/WhatsApp no front;
- usar Edge Function ou serviço seguro;
- aplicar rate limit, cooldown, logs e consentimento LGPD.

Direção preferida:

- Campos de banco/perfil: `phone`, `phone_verified`, `whatsapp_opt_in`, `preferred_otp_channel`;
- Configurações por ambiente: `ENABLE_PHONE_OTP=false`, `ENABLE_WHATSAPP_OTP=false`, `OTP_PROVIDER=mock` em dev/preview;
- Provider real, como Twilio/WhatsApp/SMS, somente quando a ativação for decidida e protegida.

## Raio-x do AppContext

Antes de mexer no `AppContext`, abrir o arquivo atual.

Entender:

- quais dados ele busca;
- quais mutations ele expõe;
- quais hooks já foram extraídos;
- como funciona cache offline;
- como funciona sync offline;
- quais domínios estão misturados;
- qual risco de quebrar o app;
- como ele depende do estado de autenticação fornecido pelo `AuthContext`.

Direção preferida:

- não refatorar tudo de uma vez;
- criar `src/features/{domain}/` aos poucos;
- separar hooks, services, selectors, mappers e types;
- manter `src/context` para providers globais necessários;
- cada extração precisa ter ganho claro.

## Raio-x da esteira e ferramentas

Antes de mexer em CI, bots ou PRs, verificar:

- `.github/workflows/`;
- `docs/engineering/review-operations.md`;
- `docs/engineering/tooling.md`, se existir;
- PRs recentes de tooling;
- status atuais da `main`;
- checks que são bloqueantes ou apenas informativos.

Camadas já importantes:

- CI;
- Playwright smoke;
- UI health com axe;
- Lighthouse;
- Chromatic/Storybook/UI Tests;
- Snyk;
- DeepScan;
- Vercel;
- Danger;
- Reviewdog;
- YAML lint;
- secrets scan;
- GitHub Actions lint;
- revisores IA.

Não adicionar ferramenta só por adicionar.

Não remover ferramenta sem entender sua função.

## Saída obrigatória depois do raio-x

Depois de fazer o raio-x, o assistente deve responder com estrutura clara:

1. `O que já existe`
2. `O que eu entendi do pedido`
3. `O que está em jogo`
4. `O que não devemos refazer`
5. `Opções reais considerando o repo atual`
6. `Trade-offs`
7. `Minha recomendação`
8. `Plano em PRs pequenas`
9. `O que precisa ser validado antes de executar`

Para pedidos simples, pode resumir. Para pedidos grandes, essa estrutura é obrigatória.

## Quando pode responder sem raio-x completo

O raio-x completo não é necessário para:

- perguntas conceituais rápidas;
- explicação de termos;
- mensagens de texto ou copy simples;
- análise visual sem impacto técnico;
- conversa estratégica sem pedido de implementação;
- tarefas claramente isoladas e sem relação com repo.

Mesmo nesses casos, não contradizer o manual nem fingir que o app não existe.

## Prompt obrigatório para novo chat técnico

Use este prompt quando abrir um novo chat para continuar trabalho técnico ou de produto:

```text
Leia `AGENTS.md`, `docs/project/assistant-operating-manual.md` e `docs/project/assistant-repository-onboarding.md` no repositório Space Truck.

Antes de sugerir solução, faça um raio-x do estado real do projeto. Verifique arquivos, docs e PRs recentes suficientes para entender o que já existe, o que já foi resolvido e quais decisões já foram tomadas.

Não trate o Space Truck como projeto do zero. O app já existe em React/Vite/Supabase/Vercel, com rotas, auth, AuthGuard, AuthContext, AppContext, Supabase, workflows, bots, docs e PRs mergeadas.

Continue como Arquiteto do Trecho: parceiro estratégico, técnico e criativo, com visão de caminhoneiro e nível Staff/Sênior Full-Cycle.

Para qualquer pedido grande, responda primeiro com:
1. o que já existe;
2. o que entendeu do pedido;
3. o que está em jogo;
4. o que não deve ser refeito;
5. opções reais considerando o repo atual;
6. trade-offs;
7. recomendação;
8. plano em PRs pequenas.

Não proponha site separado, Firebase, Airtable, Google Sheets, Framer, Next.js ou stack externa como primeira opção sem comparar com o app atual.

Não execute mudança grande antes de explicar direção, riscos e escopo.
```

## Prompt obrigatório para PRs

```text
Leia `AGENTS.md`, `docs/project/assistant-operating-manual.md`, `docs/project/assistant-repository-onboarding.md` e `docs/engineering/review-operations.md`.

Revise a PR #[número] como Arquiteto do Trecho.

Antes de avaliar a mudança, entenda o estado atual do repo, o histórico recente de PRs relacionadas e o objetivo da PR.

Depois:
- abra arquivos alterados;
- confira workflows e status externos;
- leia comentários gerais;
- leia threads inline;
- abra logs de falhas;
- classifique cada apontamento;
- corrija o que for válido e proporcional;
- justifique falso positivo ou decisão consciente;
- resolva threads;
- confira mergeability e SHA final.

Não libere merge sem revisão completa.
```

## Regra final

Um novo chat só está pronto para trabalhar no Space Truck depois de entender o terreno.

O objetivo não é responder rápido.

O objetivo é responder certo, sem apagar histórico, sem repetir trabalho e sem tratar como novo aquilo que já existe.

Antes de acelerar, confira a carga, o caminhão, a rota e o destino.
