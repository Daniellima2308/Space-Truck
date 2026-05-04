# Complemento de hardening: beta gate, admin, auth e OTP

Este documento complementa `docs/architecture/beta-gate-admin-auth.md`.

Ele registra decisões de segurança e implementação que devem ser consideradas obrigatórias antes das próximas PRs do beta gate, principalmente PR 2, PR 4, admin e OTP.

Quando houver dúvida entre este complemento e a arquitetura principal, trate este documento como refinamento mais específico, sem contradizer o objetivo geral da arquitetura.

## Objetivo

Fechar pontos críticos antes de começar a implementação:

- estratégia de rotas e redirecionamentos;
- enumeração canônica de status e roles;
- normalização de username;
- backfill obrigatório antes dos guards;
- migração idempotente e segura para admin;
- rate limit de OTP;
- provider mock de OTP controlado;
- retenção, exclusão e anonimização de PII;
- regras para evitar vazamento de dados sensíveis em audit logs.

## 1. Estratégia de rotas e redirecionamentos

A migração para `/app/*` não deve quebrar links antigos.

Hoje o app interno usa rotas planas, como:

- `/vehicles`;
- `/new-trip`;
- `/history`;
- `/maintenance`;
- `/freight-analysis`;
- `/personal-expenses`;
- `/px`.

Se a migração para `/app/*` for feita, a implementação deve incluir uma estratégia explícita de compatibilidade.

### Decisão recomendada

Na primeira fase, manter rotas antigas funcionando e criar aliases ou redirects controlados.

Exemplo conceitual:

```text
/vehicles -> /app/vehicles
/new-trip -> /app/new-trip
/history -> /app/history
/maintenance -> /app/maintenance
/freight-analysis -> /app/freight-analysis
```

### Tipo de redirecionamento

Para SPA em Vercel/React Router, usar redirecionamento compatível com a stack:

- redirect de rota no React Router para navegação interna;
- configuração da Vercel apenas se for necessário resolver links diretos antes do bundle carregar;
- evitar 301 permanente cedo demais, porque a estrutura ainda pode mudar durante beta.

### Regra

Não remover rotas antigas até:

- smoke tests cobrirem a nova estrutura;
- links salvos funcionarem;
- Daniel validar navegação real;
- não houver risco de quebrar preview ou usuários existentes.

## 2. Enumeração canônica de `access_status`

A lista canônica de status de acesso é:

```text
waitlisted
approved
suspended
blocked
deactivated
```

Significado:

- `waitlisted`: usuário cadastrado e aguardando liberação;
- `approved`: usuário autorizado a usar o app completo;
- `suspended`: acesso temporariamente suspenso;
- `blocked`: acesso bloqueado por decisão administrativa;
- `deactivated`: conta desativada, geralmente por solicitação do usuário, política de retenção ou encerramento controlado.

Toda implementação, guard, tipo TypeScript, policy, migration e UI deve usar essa mesma lista.

### Tipo TypeScript recomendado

```ts
export type AccessStatus =
  | 'waitlisted'
  | 'approved'
  | 'suspended'
  | 'blocked'
  | 'deactivated';
```

O `AccessProfile` futuro deve referenciar `AccessStatus`, em vez de repetir uma union incompleta.

## 3. Enumeração canônica de `role`

Lista inicial de roles:

```text
user
admin
```

Roles futuras possíveis, mas não obrigatórias agora:

```text
support
owner
```

### Tipo TypeScript recomendado

```ts
export type AccessRole = 'user' | 'admin';
```

Se `support` ou `owner` forem adicionados, devem entrar em migration própria, com revisão de permissões.

## 4. PostgreSQL Enums versus CHECK constraints

Para `role` e `access_status`, a preferência técnica é usar PostgreSQL Enums quando a equipe estiver confortável com a manutenção de migrations de enum.

Vantagens:

- tipos TypeScript gerados pelo Supabase ficam mais precisos;
- evita strings soltas;
- reduz divergência entre frontend e backend;
- deixa o contrato do banco mais explícito.

Possível direção:

```sql
create type public.access_status as enum (
  'waitlisted',
  'approved',
  'suspended',
  'blocked',
  'deactivated'
);

create type public.access_role as enum (
  'user',
  'admin'
);
```

Se o projeto optar por `CHECK constraints` na primeira versão, documentar o motivo e gerar tipos TypeScript manuais equivalentes em `src/features/access/types.ts`.

A decisão final deve ser tomada antes da PR 2.

## 5. Username normalizado

`username` não pode aceitar variações que pareçam o mesmo usuário.

Exemplo de problema:

```text
Joao
joao
JOAO
```

Esses três não devem virar usuários diferentes.

### Decisão recomendada

Usar uma destas estratégias no banco:

1. `citext` com unique index; ou
2. `text` com lowercase obrigatório e unique index em `lower(username)`.

### Regra de normalização

- armazenar sempre em lowercase;
- remover espaços nas pontas;
- bloquear espaços internos se o padrão escolhido for username simples;
- permitir apenas caracteres definidos pelo produto;
- validar tamanho mínimo e máximo;
- nunca usar username como segredo.

Exemplo conceitual:

```sql
username text null,
constraint profiles_username_lowercase check (username = lower(username))
```

ou:

```sql
create extension if not exists citext;
username citext unique null
```

### Frontend

O frontend deve mostrar o username normalizado antes de salvar.

Erros devem ser genéricos o suficiente para não facilitar enumeração em fluxo de login.

## 6. Backfill obrigatório antes dos guards

Este é o ponto mais crítico da implementação.

A PR 4 de guards de acesso não pode ser mergeada/ativada em produção antes de o backfill da PR 2 estar aplicado e verificado.

### Regra obrigatória

Antes de ativar `AccessGuard` bloqueando usuários não `approved`, confirmar:

- colunas `role` e `access_status` existem em produção;
- Daniel/admin está como `role = admin`;
- Daniel/admin está como `access_status = approved`;
- usuários existentes foram tratados conforme decisão do projeto;
- query de verificação foi executada;
- login real do Daniel foi testado;
- dev preview não mascara erro de produção.

### Ordem segura

1. PR 2 cria schema e backfill.
2. Deploy da PR 2 é concluído.
3. Banco de produção é verificado.
4. Daniel/admin é confirmado como `admin` + `approved`.
5. Só depois PR 4 pode ativar guards rígidos.

### Risco evitado

Sem isso, um guard novo pode trancar o Daniel e usuários existentes fora do app.

## 7. Migração idempotente para PR 2

A migration de `profiles` deve ser idempotente sempre que possível.

Isso significa:

- não falhar se uma coluna já existir;
- usar `alter table ... add column if not exists` quando aplicável;
- atualizar defaults com cuidado;
- fazer backfill em transação;
- deixar claro como reverter ou corrigir;
- tratar o admin principal explicitamente.

### Admin principal

A migration ou script operacional precisa receber/usar o UUID do usuário admin principal com extremo cuidado.

Recomendação:

- não hardcodar UUID sensível em documentação pública sem necessidade;
- usar variável operacional ou instrução controlada;
- registrar no plano de deploy que o admin precisa ser atualizado na mesma janela da migration;
- executar validação pós-migration.

Exemplo conceitual:

```sql
begin;

alter table public.profiles
  add column if not exists role public.access_role not null default 'user',
  add column if not exists access_status public.access_status not null default 'approved';

update public.profiles
set role = 'admin', access_status = 'approved'
where user_id = '<ADMIN_USER_UUID>';

commit;
```

O default `approved` durante a migration pode ser mais seguro para não bloquear usuários existentes. Depois, novos cadastros podem nascer `waitlisted` pela lógica de aplicação ou por segunda migration controlada.

## 8. Estratégia de default para usuários existentes e novos

Há duas necessidades diferentes:

- usuários existentes não devem ser bloqueados acidentalmente;
- usuários novos durante beta fechado devem nascer `waitlisted`.

### Decisão recomendada

Fase 1, migration:

- adicionar `access_status` com default seguro para não bloquear produção;
- backfill de usuários existentes;
- confirmar admin.

Fase 2, aplicação:

- novos cadastros criados pelo fluxo de beta recebem `waitlisted` explicitamente.

Fase 3, endurecimento:

- se fizer sentido, alterar default do banco para `waitlisted` depois que o fluxo estiver validado.

Não assumir que um único default resolve os dois cenários.

## 9. Rate limit de OTP

OTP pode gerar custo e abuso.

Rate limit por IP ajuda, mas não deve ser a principal defesa. IP pode variar, ser compartilhado ou mascarado.

### Camadas obrigatórias

Prioridade 1:

- limite por telefone;
- limite por usuário autenticado, quando existir;
- limite por sessão/fluxo.

Prioridade 2:

- limite por IP;
- proteção contra padrões distribuídos;
- CAPTCHA/Turnstile se houver abuso.

### Valores iniciais recomendados

Valores para começar, ajustáveis por telemetria:

```text
Máximo 3 envios por telefone a cada 10 minutos.
Máximo 5 envios por telefone por dia.
Máximo 3 validações incorretas por telefone a cada 10 minutos.
Cooldown mínimo de 60 segundos entre reenvios.
Bloqueio temporário de 30 minutos após excesso de tentativas.
```

Para usuário autenticado:

```text
Máximo 5 tentativas de OTP por usuário por dia.
Máximo 3 erros seguidos antes de bloqueio temporário.
```

Esses números devem ficar em configuração server-side, não no front.

## 10. Provider mock de OTP

O provider mock deve ser padronizado para testes e previews.

### Objetivo

Permitir testar o fluxo sem enviar SMS/WhatsApp real.

### Regras

- só funciona quando `OTP_PROVIDER=mock`;
- não chama API externa;
- registra tentativa em log seguro;
- nunca deve ficar aberto para abuso em produção;
- pode aceitar números de teste controlados;
- o código fixo de teste só pode ser usado em ambiente de desenvolvimento/preview.

### Números de teste

Definir lista explícita de números de teste, por exemplo:

```text
+5500000000000
+5599999999999
```

Código fixo permitido apenas em mock:

```text
123456
```

Nunca usar esse código fixo com provider real.

## 11. Retenção, exclusão, anonimização e LGPD

A captação coleta PII, como nome, e-mail, telefone, cidade/UF, perfil do motorista e interesse.

A arquitetura precisa prever retenção e exclusão desde o início.

### Campos recomendados em `beta_applications`

Adicionar na implementação futura:

```text
pii_retention_until timestamptz null
deleted_at timestamptz null
anonymized_at timestamptz null
```

Ou registrar ações em `metadata.pii_actions` quando for mais simples, desde que exista padrão documentado.

### Política inicial sugerida

- leads não convertidos: revisar/anonimizar após 12 meses sem interação;
- usuários convertidos: manter enquanto houver conta ativa e necessidade operacional;
- usuários que pedirem exclusão: iniciar fluxo DSAR e anonimizar/excluir dados conforme obrigação legal e segurança;
- audit logs administrativos: reter por período maior, mas sem PII excessiva.

### DSAR

DSAR significa solicitação do titular dos dados, como pedir acesso, correção ou exclusão.

Fluxo recomendado:

1. usuário solicita acesso/correção/exclusão por canal oficial;
2. app/admin verifica identidade do solicitante;
3. admin registra solicitação;
4. ação é executada com segurança;
5. `admin_audit_logs` registra ação sem vazar dados sensíveis;
6. usuário recebe confirmação.

### Purge/anonimização

A implementação futura pode usar:

- job agendado;
- Edge Function chamada por agenda;
- rotina manual admin no começo;
- SQL controlado para anonimizar PII vencida.

A primeira versão não precisa automatizar tudo, mas precisa não impedir esse caminho.

## 12. Regras para `admin_audit_logs.metadata`

`metadata jsonb` é útil, mas pode virar vazamento de dados se usado sem critério.

### Proibido registrar

Nunca registrar em audit log:

- senha;
- OTP bruto;
- token JWT;
- refresh token;
- service role key;
- access token;
- segredo de provider;
- raw credentials;
- payload completo de usuário sem necessidade;
- documentos ou dados sensíveis não necessários.

### Chaves proibidas

Qualquer metadata deve bloquear ou redigir chaves como:

```text
password
senha
otp
token
secret
service_role
access_token
refresh_token
raw_credentials
authorization
api_key
```

### Chaves permitidas inicialmente

```text
reason
previous_status
next_status
previous_role
next_role
resource_id
source
request_id
ip_hash
user_agent_summary
feature_flag
```

Preferir `ip_hash` em vez de IP bruto quando possível.

### Política de redação

Se algum valor suspeito aparecer, substituir por:

```text
<REDACTED>
```

A validação pode começar em application-layer nas Edge Functions e evoluir para trigger/check no banco se necessário.

## 13. Canonicalização no frontend

Tipos futuros em `src/features/access/types.ts` devem usar definições únicas.

Exemplo:

```ts
export type AccessStatus =
  | 'waitlisted'
  | 'approved'
  | 'suspended'
  | 'blocked'
  | 'deactivated';

export type AccessRole = 'user' | 'admin';

export type AccessProfile = {
  userId: string;
  role: AccessRole;
  accessStatus: AccessStatus;
  onboardingCompleted: boolean;
  phone?: string | null;
  phoneVerified: boolean;
  whatsappOptIn: boolean;
};
```

Não repetir unions manualmente em vários arquivos.

## 14. Decisões que ficam travadas antes da PR 2

Antes de implementar a PR 2, decidir:

1. usar PostgreSQL Enums ou CHECK constraints;
2. estratégia de default/backfill de usuários existentes;
3. forma de identificar o admin principal sem expor dado sensível;
4. se novos usuários nascerão `waitlisted` via app logic ou default do banco;
5. estratégia inicial de username: `citext` ou lowercase check;
6. se `beta_applications` aceitará lead anônimo sem conta ou será account-first.

## 15. Decisões que ficam travadas antes da PR 4

Antes de ativar guards rígidos:

1. backfill de produção concluído;
2. Daniel/admin confirmado como `admin` + `approved`;
3. usuários existentes tratados;
4. smoke test de login aprovado;
5. comportamento de dev preview validado;
6. rota `/aguardando` pronta ou fallback seguro definido.

## Regra final

O beta gate só deve bloquear acesso depois que o banco estiver preparado, o admin estiver confirmado e o caminho de recuperação estiver claro.

A segurança precisa proteger o produto sem trancar o dono fora da boleia.
