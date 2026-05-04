# Arquitetura: landing pública, beta gate, autenticação, admin e OTP

Este documento define a direção arquitetural para transformar o Space Truck em um produto com área pública, lista de acesso antecipado, app protegido, painel admin e base preparada para verificação por WhatsApp/SMS/OTP.

A proposta parte do app existente. Não é um plano para criar um site separado do zero.

## Objetivo

Criar uma arquitetura segura e evolutiva para:

- usar a rota pública do produto como landing page do Space Truck;
- captar usuários interessados no acesso antecipado;
- criar ou vincular uma conta real do Space Truck;
- controlar quem entra no app completo;
- permitir que usuários novos fiquem em espera até aprovação;
- dar ao Daniel um painel admin para aprovar, suspender, bloquear e acompanhar usuários;
- preparar login e verificação por e-mail, Google, telefone, username e WhatsApp/SMS OTP;
- manter o app interno protegido por autenticação, status de acesso, RLS e ações server-side seguras.

## Não objetivos desta etapa

Esta etapa não implementa código de produção.

Esta etapa não altera Supabase, migrations, Edge Functions, dependências, rotas ou workflows.

Esta etapa não cria a landing visual.

Esta etapa não cria o painel admin visual.

Esta etapa não ativa cobrança, envio real de SMS ou envio real de WhatsApp.

Esta etapa não refatora o `AppContext`.

O objetivo agora é definir a fundação para que as próximas PRs sejam pequenas, seguras e coerentes.

## Estado atual observado

O app atual já possui uma base real em React, TypeScript, Vite, Supabase e Vercel.

O roteamento principal está em `src/App.tsx`.

Hoje existem rotas públicas para:

- `/login`;
- `/register`;
- `/forgot-password`;
- `/reset-password`.

O restante das rotas cai dentro de `ProtectedApp`, que é protegido por `AuthGuard`.

Dentro do `ProtectedApp`, o `AppProvider` envolve as rotas internas. Isso significa que o `AppContext` depende do usuário autenticado pelo `AuthContext`.

O `AuthContext` hoje expõe:

- `user`;
- `session`;
- `loading`;
- `signOut`.

Ele ainda não expõe perfil de acesso, role, status de beta, onboarding ou permissões.

O `AuthGuard` hoje bloqueia usuário não autenticado e redireciona para `/login`. Ele também possui bypass de dev preview quando `VITE_ENABLE_DEV_PREVIEW=true`.

A tabela `profiles` já existe, mas atualmente contém apenas campos como:

- `user_id`;
- `display_name`;
- `avatar_url`;
- `phone`;
- `has_seen_tutorial`;
- `personal_expenses_enabled`;
- timestamps.

Ela ainda não possui:

- `username`;
- `role`;
- `access_status`;
- `phone_verified`;
- `whatsapp_opt_in`;
- `preferred_otp_channel`;
- `onboarding_completed`.

Também já existe `support_tickets`, com campos de WhatsApp, consentimento e canal preferido. Isso pode ser reaproveitado futuramente no painel admin, mas não substitui a arquitetura de acesso/beta.

O `AppContext` concentra bastante responsabilidade: busca dados do usuário autenticado, cache offline, sync offline, estados de despesas pessoais e mutations por domínio. A arquitetura de beta gate deve evitar aumentar esse contexto.

## Princípios de decisão

### 1. Produto único, não site solto

A landing pública deve ser parte do próprio produto Space Truck.

A pessoa entra no domínio do Space Truck, entende o produto, cria conta ou entra na lista, e depois passa pelo fluxo de espera/aprovação.

Evitar criar um site separado sem necessidade.

### 2. Segurança real, não esconder botão

Não basta esconder links ou menus.

A proteção deve existir em camadas:

- route guards no front;
- status de acesso no perfil;
- RLS nas tabelas;
- Edge Functions/RPC para ações sensíveis;
- audit logs;
- segredos apenas no servidor;
- feature flags para recursos pagos ou sensíveis.

### 3. Usuário novo vira conta real

A captação não deve ser apenas uma planilha de leads.

A direção preferida é que a pessoa crie uma conta do Space Truck e nasça com status `waitlisted`, até ser liberada por admin.

Isso permite transformar lista de espera em base real de usuários.

### 4. OTP preparado, mas desligado por padrão

WhatsApp/SMS OTP deve ser previsto na arquitetura, mas não deve enviar mensagens reais durante desenvolvimento ou preview.

O envio real só deve acontecer quando houver decisão explícita, provider configurado, consentimento, rate limit e controle de custo.

### 5. PRs pequenas e reversíveis

Não implementar landing, admin, RLS, OTP, login unificado e refatoração do AppContext em uma PR só.

Esta arquitetura deve guiar uma sequência de PRs pequenas.

## Vocabulário do domínio

### Landing pública

Tela pública inicial do Space Truck, sem exigir login, voltada para explicar o app e captar acesso antecipado.

### Beta gate

Camada de controle que separa usuários cadastrados de usuários autorizados a usar o app completo.

### Access profile

Perfil de acesso do usuário, derivado de `profiles`, contendo status, role, onboarding e dados de contato.

### Access status

Estado que define se o usuário pode entrar no app completo.

### Role

Nível de permissão operacional do usuário, como usuário comum ou admin.

### Waitlisted

Usuário cadastrado e aguardando liberação.

### Approved

Usuário autorizado a usar o app completo.

### Admin

Usuário autorizado a acessar painel administrativo e executar ações sensíveis.

### OTP

Código de verificação enviado por canal controlado, como SMS ou WhatsApp.

## Modelo de rotas proposto

### Rotas públicas

As rotas públicas não exigem autenticação.

Proposta:

- `/` — landing pública do Space Truck;
- `/acesso-antecipado` — página ou fluxo de inscrição no beta;
- `/login` ou `/entrar` — login;
- `/register` ou `/criar-conta` — cadastro;
- `/forgot-password` — recuperação de senha;
- `/reset-password` — redefinição de senha;
- `/privacidade` — aviso de privacidade, quando criado;
- `/termos` — termos de uso, quando criado.

### Rotas autenticadas sem aprovação completa

Essas rotas exigem login, mas não exigem `approved`.

Proposta:

- `/onboarding` — completar perfil básico;
- `/aguardando` — tela de espera do acesso antecipado;
- `/perfil-basico` — ajuste de dados mínimos, se necessário.

### Rotas protegidas do app

Essas rotas exigem usuário autenticado e `access_status = approved`.

Direção futura:

- `/app` — dashboard principal;
- `/app/vehicles`;
- `/app/new-trip`;
- `/app/trip/ativa`;
- `/app/trip/:id`;
- `/app/freight-analysis`;
- `/app/history`;
- `/app/operation`;
- `/app/tools`;
- `/app/more`;
- `/app/help`;
- `/app/maintenance`;
- `/app/personal-expenses`;
- `/app/px`.

A mudança de rotas deve ser gradual. Hoje o app interno usa rotas sem prefixo `/app`, como `/vehicles`, `/new-trip`, `/history` e outras. Não migrar tudo de uma vez sem plano de compatibilidade.

### Rotas admin

Rotas administrativas exigem autenticação, `role = admin` e, futuramente, MFA para ações sensíveis.

Proposta:

- `/admin` — visão geral;
- `/admin/users` — lista e gestão de usuários;
- `/admin/beta-applications` — pedidos de acesso antecipado;
- `/admin/audit-logs` — histórico de ações;
- `/admin/settings` — feature flags e parâmetros operacionais futuros;
- `/admin/support` — integração futura com tickets de suporte.

## Fluxo de acesso proposto

### Visitante não logado

1. Entra em `/`.
2. Vê a landing pública.
3. Clica em `Quero acesso antecipado`.
4. Vai para cadastro/login.
5. Cria conta ou entra com Google.
6. Completa onboarding mínimo.
7. Fica em `waitlisted`.
8. Vê `/aguardando`.

### Usuário waitlisted

1. Está autenticado.
2. Tenta entrar no app completo.
3. Guard de acesso detecta `access_status = waitlisted`.
4. Redireciona para `/aguardando`.
5. Não acessa dados internos do app via UI.
6. RLS também deve impedir acesso indevido a dados internos, quando a política for ajustada.

### Usuário approved

1. Está autenticado.
2. Tem `access_status = approved`.
3. Entra no app completo.
4. Pode acessar dados próprios conforme RLS.

### Usuário suspended

1. Está autenticado.
2. Tem `access_status = suspended`.
3. Vê tela explicando que o acesso está temporariamente suspenso.
4. Não acessa app completo.

### Usuário blocked

1. Está autenticado ou tenta login.
2. Tem `access_status = blocked`.
3. Não acessa app completo.
4. Pode receber mensagem genérica de bloqueio/contato com suporte.

### Admin

1. Está autenticado.
2. Tem `role = admin`.
3. Pode acessar `/admin`.
4. Pode aprovar, suspender, bloquear ou alterar status conforme permissões.
5. Toda ação sensível deve gerar audit log.

## Modelo de status

Campo proposto: `profiles.access_status`.

Valores recomendados:

- `waitlisted` — padrão para novos usuários durante beta fechado;
- `approved` — liberado para usar o app completo;
- `suspended` — acesso temporariamente suspenso;
- `blocked` — acesso bloqueado;
- `deactivated` — conta desativada, se necessário no futuro.

Regra inicial:

- em ambiente beta fechado, todo usuário novo nasce `waitlisted`;
- usuários criados antes da migração precisam ser tratados por backfill controlado;
- Daniel/admin precisa ser marcado como `admin` e `approved` em etapa segura.

## Modelo de roles

Campo proposto: `profiles.role`.

Valores iniciais:

- `user` — usuário comum;
- `admin` — usuário com acesso ao painel admin.

Valores futuros possíveis:

- `support` — suporte limitado;
- `owner` — superadmin, se houver necessidade real.

Não criar roles demais no começo.

## Modelo de dados proposto

### Evolução de `profiles`

A tabela `profiles` já existe e deve ser evoluída gradualmente.

Campos propostos:

```text
username text unique null
role text not null default 'user'
access_status text not null default 'waitlisted'
phone_verified boolean not null default false
whatsapp_opt_in boolean not null default false
preferred_otp_channel text not null default 'none'
onboarding_completed boolean not null default false
approved_at timestamptz null
approved_by uuid null
suspended_at timestamptz null
blocked_at timestamptz null
access_status_reason text null
```

Observações:

- `phone` já existe e pode ser reaproveitado;
- `display_name` já existe e pode ser reaproveitado;
- `username` precisa de normalização e unicidade;
- `role` e `access_status` devem ter CHECK constraints;
- `approved_by` pode referenciar `auth.users`, mas avaliar simplicidade e compatibilidade;
- não guardar segredo, token ou OTP em `profiles`.

### Nova tabela `beta_applications`

Esta tabela registra a intenção de acesso antecipado e dados de captação.

Campos propostos:

```text
id uuid primary key
user_id uuid null
name text null
email text null
phone text null
whatsapp_opt_in boolean not null default false
city text null
state text null
driver_profile text null
truck_type text null
main_interest text null
main_pain text null
source text not null default 'landing'
status text not null default 'new'
metadata jsonb not null default '{}'
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Valores possíveis para `status`:

- `new`;
- `linked_to_user`;
- `approved`;
- `rejected`;
- `archived`.

Essa tabela é diferente de `profiles`.

`profiles` controla acesso.

`beta_applications` registra a captação e respostas do interesse inicial.

### Nova tabela `admin_audit_logs`

Registra ações administrativas sensíveis.

Campos propostos:

```text
id uuid primary key
actor_user_id uuid not null
target_user_id uuid null
action text not null
metadata jsonb not null default '{}'
created_at timestamptz not null default now()
```

Ações iniciais:

- `user.approved`;
- `user.suspended`;
- `user.blocked`;
- `user.role_changed`;
- `user.access_status_changed`;
- `beta_application.status_changed`;
- `phone.marked_verified`;
- `feature_flag.changed`.

Não expor audit logs para usuário comum.

### Nova tabela futura `verification_attempts`

Só criar quando for implementar OTP mock/real.

Campos possíveis:

```text
id uuid primary key
user_id uuid null
phone text not null
channel text not null
provider text not null
status text not null
attempt_count integer not null default 0
last_sent_at timestamptz null
verified_at timestamptz null
metadata jsonb not null default '{}'
created_at timestamptz not null default now()
```

Essa tabela ajuda a auditar tentativas, rate limit e custos.

## Login e conta única

O objetivo é manter uma única conta por usuário.

O identificador principal deve continuar sendo `auth.users.id`.

`profiles.user_id` conecta o usuário de auth aos dados do app.

### Login com e-mail e senha

Fluxo padrão:

1. usuário cria conta com e-mail e senha;
2. Supabase Auth confirma e-mail conforme configuração;
3. app cria/atualiza `profiles`;
4. usuário completa onboarding;
5. usuário fica `waitlisted` até aprovação.

### Login com Google

Fluxo recomendado:

1. usuário entra com Google;
2. app cria/atualiza `profiles`;
3. app solicita completar perfil: nome, username, telefone/WhatsApp e consentimento;
4. app oferece criar senha do Space Truck;
5. se criar senha, essa senha deve ficar vinculada à mesma conta;
6. se pular, usuário continua podendo entrar com Google;
7. usuário fica `waitlisted` até aprovação.

Não bloquear conversão exigindo senha imediatamente após Google, a menos que isso seja decisão explícita em etapa futura.

### Login com telefone e senha

Fluxo futuro:

1. usuário informa telefone;
2. app valida formato;
3. telefone fica em `profiles.phone`;
4. `phone_verified` só vira true após verificação;
5. login por telefone + senha só deve ser habilitado quando o fluxo estiver seguro.

### Login com username e senha

Supabase Auth não oferece login nativo por `username`.

Se for implementado, precisa ser camada customizada segura.

Opções futuras:

- Edge Function/RPC para resolver username para identidade de login sem expor enumeração;
- estratégia de username vinculado a e-mail/telefone principal;
- respostas genéricas para evitar descobrir se username existe;
- rate limit e logs.

Não implementar username login consultando `profiles` diretamente no front.

## Estratégia de OTP WhatsApp/SMS

### Objetivo

Preparar a arquitetura para verificação de telefone por SMS ou WhatsApp, sem gerar cobrança durante desenvolvimento.

### Campos de banco/perfil

- `profiles.phone` — número informado;
- `profiles.phone_verified` — número confirmado;
- `profiles.whatsapp_opt_in` — consentimento para WhatsApp;
- `profiles.preferred_otp_channel` — preferência: `sms`, `whatsapp`, `email` ou `none`.

### Variáveis de ambiente conceituais

- `ENABLE_PHONE_OTP=false` por padrão;
- `ENABLE_WHATSAPP_OTP=false` por padrão;
- `OTP_PROVIDER=mock` em dev/preview;
- `OTP_PROVIDER=twilio` ou outro provider apenas quando ativado.

### Regras

- preview nunca deve enviar SMS/WhatsApp real por padrão;
- produção também não envia se a flag estiver desligada;
- segredo de provider nunca fica no front;
- envio real deve passar por Edge Function ou serviço seguro;
- código OTP não deve ficar exposto no cliente;
- precisa de rate limit por telefone, usuário e IP quando possível;
- precisa de cooldown para reenvio;
- precisa de logs de tentativa;
- precisa de mensagem genérica para evitar enumeração;
- precisa de consentimento claro para WhatsApp/SMS.

### Provider mock

O primeiro provider deve ser mock/controlado.

Objetivo:

- permitir testar UI e fluxo sem custo;
- evitar chamadas reais em preview;
- permitir desenvolvimento incremental;
- preparar contrato antes de integrar Twilio/WhatsApp/SMS real.

O mock não deve ser inseguro em produção.

Se usado em produção, deve ficar desligado ou restrito a admins/testes internos.

## RLS e proteção de dados

RLS precisa proteger o app mesmo que alguém tente chamar Supabase diretamente pelo cliente.

### Regras gerais

Usuário comum:

- lê e escreve apenas dados onde `user_id = auth.uid()`;
- não lê usuários de outros perfis;
- não altera `role`;
- não altera `access_status`;
- não lê audit logs.

Usuário `waitlisted`:

- pode ler seu perfil básico;
- pode atualizar dados permitidos de onboarding;
- pode criar/atualizar sua aplicação beta, se permitido;
- não deve acessar dados operacionais do app completo.

Usuário `approved`:

- acessa app completo;
- lê/escreve apenas seus dados operacionais;
- segue políticas existentes por `user_id`.

Admin:

- pode listar perfis para painel admin apenas por política segura ou função server-side;
- ações sensíveis devem passar por Edge Function/RPC com validação;
- deve gerar audit log.

### Tabelas que exigem atenção

- `profiles`;
- `vehicles`;
- `trips`;
- `freights`;
- `fuelings`;
- `expenses`;
- `personal_expenses`;
- `maintenance_services`;
- `support_tickets`;
- `beta_applications`;
- `admin_audit_logs`;
- `verification_attempts`, quando existir.

### Cuidado com policies

Evitar policies amplas como solução rápida.

Preferir políticas pequenas, claras e testáveis.

Separar leitura do próprio usuário, atualização do próprio perfil e ações admin.

## Edge Functions e ações sensíveis

Nem toda ação deve ser feita direto do front.

### Deve passar por Edge Function ou RPC segura

- aprovar usuário;
- suspender usuário;
- bloquear usuário;
- alterar role;
- marcar telefone como verificado manualmente;
- enviar OTP real;
- validar OTP real;
- reenviar convite em massa;
- exportar dados administrativos;
- alterar feature flags sensíveis.

### Regras para Edge Functions

- validar JWT;
- carregar perfil do actor;
- verificar `role = admin` quando necessário;
- nunca confiar apenas no payload do cliente;
- usar service role apenas no ambiente server-side;
- registrar audit log;
- retornar mensagens seguras e genéricas quando necessário.

## Painel admin

### Objetivo inicial

Dar ao Daniel controle operacional do beta sem depender de mexer manualmente no banco.

### Versão inicial do admin

Funcionalidades mínimas:

- ver total de usuários por status;
- listar usuários;
- filtrar por `waitlisted`, `approved`, `suspended`, `blocked`;
- buscar por nome, e-mail, telefone ou username;
- ver detalhe básico do usuário;
- aprovar usuário;
- suspender usuário;
- bloquear usuário;
- ver applications de beta;
- registrar audit log.

### Versão futura

- reenviar convite;
- controlar feature flags;
- ver tickets de suporte;
- conectar com WhatsApp/e-mail;
- ver métricas de captação;
- exportações controladas;
- ações em lote com confirmação.

### UX do admin

O admin deve ser funcional antes de ser sofisticado.

Priorizar:

- clareza;
- filtros rápidos;
- confirmação em ações perigosas;
- auditabilidade;
- pouca poluição visual;
- responsividade mobile/tablet.

## Landing pública

A landing pública deve vender a promessa do Space Truck sem parecer site genérico.

### Objetivo

Explicar o produto, gerar confiança e captar acesso antecipado.

### Mensagem central

A landing deve comunicar algo próximo de:

> O Space Truck mostra se a viagem deu lucro de verdade.

### Seções recomendadas

- hero com promessa principal;
- dor real do caminhoneiro;
- solução do Space Truck;
- leituras que o app entrega: frete, custos, diesel, saldo, lucro, manutenção;
- como funciona o acesso antecipado;
- formulário ou CTA de cadastro;
- seção com Bino explicando o beta;
- aviso honesto de produto em construção;
- consentimento e privacidade.

### Campos de captação

Campos mínimos:

- nome;
- WhatsApp;
- consentimento WhatsApp;
- e-mail;
- cidade/UF;
- perfil: autônomo, empregado, agregado, dono de frota;
- principal interesse: lucro da viagem, despesas, manutenção, recebimentos, PX Digital, outro.

Não começar com formulário longo demais.

O onboarding pós-cadastro pode coletar mais dados.

## Tela de espera

Usuário `waitlisted` deve ver uma tela clara e útil.

Objetivos:

- confirmar que entrou na lista;
- explicar que o acesso será liberado aos poucos;
- permitir atualizar WhatsApp/e-mail;
- mostrar status;
- talvez permitir responder uma pergunta curta de pesquisa;
- evitar sensação de erro ou app quebrado.

Mensagem possível:

> Você está na lista de acesso antecipado do Space Truck. Estamos liberando aos poucos para garantir que o app funcione bem na rotina da estrada.

## Onboarding pós-login

Após login/cadastro, antes do app completo, o usuário deve completar dados mínimos.

Campos iniciais:

- display name;
- username, quando a feature existir;
- telefone/WhatsApp;
- consentimento de contato;
- perfil de caminhoneiro;
- principal dor.

Se entrou com Google, pode ser oferecida criação de senha do app.

Se não completar onboarding obrigatório, o usuário fica em rota de onboarding e não no app completo.

## Feature flags

Flags conceituais:

```text
ENABLE_BETA_GATE=true
ENABLE_PUBLIC_LANDING=true
ENABLE_ADMIN_PANEL=false
ENABLE_PHONE_OTP=false
ENABLE_WHATSAPP_OTP=false
OTP_PROVIDER=mock
ENABLE_USERNAME_LOGIN=false
```

Essas flags não precisam ser todas implementadas na primeira PR.

Elas documentam a direção de controle.

Separar flags públicas de flags secretas.

Nunca colocar segredo em variável `VITE_`.

## Impacto no frontend

### AuthContext

Deve evoluir de sessão simples para expor também o perfil de acesso.

Possível direção futura:

```ts
type AccessProfile = {
  userId: string;
  role: 'user' | 'admin';
  accessStatus: 'waitlisted' | 'approved' | 'suspended' | 'blocked';
  onboardingCompleted: boolean;
  phone?: string | null;
  phoneVerified: boolean;
  whatsappOptIn: boolean;
};
```

O `AuthContext` ou um hook em `src/features/access/` pode carregar esse perfil.

A decisão final deve evitar inflar o `AuthContext` demais.

### AuthGuard

Hoje o `AuthGuard` só verifica login.

Ele deve evoluir para uma composição de guards:

- `AuthGuard` — exige autenticação;
- `AccessGuard` — exige `approved`;
- `AdminGuard` — exige `admin`;
- `OnboardingGuard` — exige onboarding completo para app interno.

Evitar um guard gigante com todas as regras misturadas.

### AppContext

Não adicionar beta gate dentro do `AppContext`.

Acesso, role, onboarding e status devem ficar em domínio próprio, provavelmente:

```text
src/features/access/
  hooks/
  services/
  types.ts
```

O `AppContext` pode continuar cuidando dos dados operacionais até refatorações futuras.

## Impacto no backend/Supabase

### Migrations esperadas em fases futuras

1. adicionar campos de acesso em `profiles`;
2. criar `beta_applications`;
3. criar `admin_audit_logs`;
4. ajustar RLS de `profiles`;
5. ajustar RLS de dados operacionais para considerar `approved`, se necessário;
6. criar functions/RPC para admin;
7. criar tabela de OTP somente quando a implementação do fluxo iniciar.

### Backfill

Usuários existentes precisam ser tratados.

Opções:

- marcar todos existentes como `approved`;
- marcar somente Daniel/admin como `approved` e revisar demais;
- criar script/migration com critérios claros.

Recomendação inicial:

- Daniel/admin deve ser `admin` + `approved`;
- usuários existentes reais devem ser avaliados antes de bloquear.

Não fazer mudança que trave o próprio Daniel fora do app.

## Testes e validação

### Testes manuais necessários no futuro

- visitante vê landing;
- visitante consegue ir para cadastro;
- usuário novo vira `waitlisted`;
- waitlisted cai em `/aguardando`;
- waitlisted não entra no app completo;
- approved entra no app;
- admin entra no painel;
- user comum não entra no admin;
- dev preview continua controlado;
- logout funciona;
- reset password continua funcionando.

### Playwright futuro

Adicionar smoke tests gradualmente:

- landing renderiza;
- login page renderiza;
- waitlisted guard redireciona corretamente, com mock controlado;
- admin guard bloqueia usuário comum;
- app smoke continua válido para usuário aprovado/mock.

### Segurança

Validar:

- RLS de profiles;
- RLS de beta_applications;
- RLS de admin_audit_logs;
- nenhuma secret key no front;
- Edge Functions exigem JWT;
- admin actions geram audit log;
- OTP real não dispara em preview.

## Plano de implementação por PRs

### PR 1 — arquitetura

Criar este documento.

Sem código runtime.

### PR 2 — modelo de acesso em profiles

Adicionar campos controlados em `profiles`:

- `role`;
- `access_status`;
- `phone_verified`;
- `whatsapp_opt_in`;
- `preferred_otp_channel`;
- `onboarding_completed`.

Adicionar constraints e RLS mínima.

Definir backfill seguro.

### PR 3 — feature access/profile no frontend

Criar domínio:

```text
src/features/access/
```

Carregar `AccessProfile`.

Expor hooks sem inflar `AppContext`.

### PR 4 — guards de acesso

Adicionar `AccessGuard`, `AdminGuard` e/ou `OnboardingGuard`.

Manter comportamento atual para usuários existentes até migration/backfill estar seguro.

### PR 5 — tela de espera

Criar `/aguardando`.

Usuário `waitlisted` cai nela.

### PR 6 — landing pública inicial

Transformar `/` em landing pública ou criar transição controlada.

Mover app interno para `/app` apenas se houver plano de compatibilidade.

Alternativa intermediária: manter app interno em `/*` temporariamente e criar landing em rota específica até migração final.

### PR 7 — beta applications

Criar tabela e fluxo de inscrição.

Conectar cadastro com application.

### PR 8 — admin shell

Criar `/admin` e `/admin/users`.

Somente admin acessa.

Sem ações perigosas no front direto.

### PR 9 — admin actions + audit logs

Aprovar/suspender/bloquear via Edge Function/RPC.

Registrar logs.

### PR 10 — OTP mock

Criar contrato de verificação e provider mock.

Sem envio real.

### PR 11 — provider real de OTP desligado por padrão

Adicionar integração real, como Twilio/WhatsApp/SMS, mas atrás de flags.

Não ativar envio real sem decisão explícita.

### PR 12 — refino de rotas e testes E2E

Atualizar smoke tests, UI health e testes de guards.

## Riscos principais

### Trancar o próprio admin fora do app

Mitigação:

- backfill seguro;
- feature flag;
- rota/admin bootstrap controlada;
- validar login do Daniel antes de merge de guards rígidos.

### Achar que front-end guard é segurança suficiente

Mitigação:

- RLS;
- Edge Functions;
- audit logs;
- service role apenas server-side.

### Inflar ainda mais o AppContext

Mitigação:

- criar `src/features/access/`;
- manter acesso/auth fora do AppContext;
- refatorar gradualmente.

### Gerar cobrança de WhatsApp/SMS sem querer

Mitigação:

- flags desligadas por padrão;
- provider mock em preview;
- provider real só server-side;
- logs e rate limit.

### Quebrar rotas existentes

Mitigação:

- migração gradual;
- aliases temporários;
- testes Playwright;
- plano de compatibilidade.

## Decisões explícitas

1. A landing deve nascer dentro do produto existente, não como site separado por padrão.
2. Usuários novos devem poder virar contas reais do Space Truck.
3. O status inicial durante beta fechado deve ser `waitlisted`.
4. O acesso ao app completo deve depender de `approved`.
5. O admin deve controlar aprovação e bloqueio por painel, não por mexida manual no banco.
6. OTP WhatsApp/SMS deve ser preparado, mas envio real fica desligado por padrão.
7. Username login é futuro e exige implementação customizada segura.
8. `service_role` nunca deve ir para o front.
9. AppContext não deve receber responsabilidades de beta gate/admin.
10. Implementação deve ser feita em PRs pequenas.

## Questões em aberto

Estas decisões ainda precisam ser validadas antes de codar:

1. A rota interna final será `/app/*` ou manteremos rotas atuais com landing em outra rota por transição?
2. Usuários existentes serão automaticamente `approved`?
3. Quais campos serão obrigatórios no onboarding inicial?
4. O cadastro de acesso antecipado exigirá conta imediatamente ou permitirá lead sem conta?
5. Admin inicial será só Daniel ou haverá `support` futuramente?
6. MFA para admin entra antes ou depois do admin inicial?
7. Primeiro OTP real será SMS ou WhatsApp?
8. Qual provider será usado quando ativar envio real?
9. Quais métricas o painel admin deve mostrar na primeira versão?
10. O Bino entra já na landing/tela de espera ou no blueprint visual seguinte?

## Próximo documento recomendado

Após aprovação desta arquitetura, criar um blueprint de produto/UI/UX:

```text
docs/product/beta-launch-blueprint.md
```

Esse blueprint deve definir:

- estrutura visual da landing;
- copy principal;
- seções;
- CTAs;
- formulário;
- tela de espera;
- onboarding;
- admin inicial;
- uso do Bino;
- assets necessários;
- critérios de qualidade visual e mobile.

## Regra final

A arquitetura do beta gate deve proteger o app e acelerar o aprendizado com usuários reais.

Ela não deve virar gambiarra visual, nem travar o produto em uma refatoração gigante.

O caminho certo é abrir a fachada para captação, manter o pátio protegido e liberar a entrada aos poucos, com controle, rastreabilidade e segurança.
