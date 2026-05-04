# Notas complementares: rotas legadas e segurança do admin

Este documento complementa `docs/product/beta-launch-blueprint.md`.

Ele fecha decisões levantadas durante a revisão da PR do blueprint de lançamento beta.

## Rotas legadas durante migração para `/app/*`

O blueprint cita algumas rotas antigas como exemplo, mas a estratégia real não deve depender de uma lista manual incompleta.

Hoje o app interno possui várias rotas planas protegidas, como:

- `/vehicles`;
- `/new-trip`;
- `/history`;
- `/maintenance`;
- `/freight-analysis`;
- `/personal-expenses`;
- `/px`;
- `/help`;
- `/perfil`;
- `/operation`;
- `/tools`;
- `/more`.

Antes de migrar o app interno para `/app/*`, a implementação deve confirmar a lista real em `src/App.tsx`.

## Estratégia recomendada

A migração final deve usar uma estratégia de compatibilidade por regra, não apenas redirecionamentos soltos.

Direção recomendada:

- manter novas rotas públicas fora do redirecionamento;
- proteger `/app/*` com guards de acesso;
- criar aliases ou redirects para rotas internas legadas;
- mapear qualquer rota interna antiga conhecida para `/app/...`;
- evitar `301` permanente enquanto o beta ainda estiver validando a estrutura;
- cobrir links diretos, bookmarks e navegação interna;
- validar com Playwright smoke antes de remover aliases.

Rotas públicas que não devem ser capturadas pelo redirect legado:

- `/` quando virar landing pública;
- `/inicio`, se usada como fase intermediária;
- `/acesso-antecipado`;
- `/login`;
- `/entrar`;
- `/register`;
- `/criar-conta`;
- `/forgot-password`;
- `/reset-password`;
- `/aguardando`;
- `/onboarding`;
- `/privacidade`;
- `/termos`;
- `/admin/*`.

Exemplo conceitual:

```text
legacy internal route -> /app/<same-path>
/vehicles -> /app/vehicles
/history -> /app/history
/perfil -> /app/perfil
/operation -> /app/operation
/tools -> /app/tools
/more -> /app/more
/help -> /app/help
/px -> /app/px
```

A decisão exata deve ser feita na PR de migração de rotas, depois de ler o `src/App.tsx` atual.

## Status `waitlisted` versus rota `/aguardando`

`waitlisted` é status interno de acesso.

`/aguardando` é a rota em português que mostra a tela para o usuário autenticado que ainda não foi aprovado.

Regra de nomenclatura:

- banco, tipos e guards podem usar `waitlisted`;
- interface e URL devem usar linguagem brasileira clara, como `/aguardando`;
- evitar criar rota pública `/waitlisted` sem decisão explícita.

## Segurança em alteração de role

A ação `alterar role` é sensível.

O admin inicial deve impedir ou restringir alterações perigosas.

Regras recomendadas:

- um admin não deve remover a própria role sem caminho de recuperação;
- se houver `owner` ou superadmin no futuro, alterar role administrativa deve exigir segunda confirmação;
- não permitir que um admin comum eleve usuário para role superior sem validação server-side;
- role changes devem passar por Edge Function/RPC segura;
- toda alteração de role deve gerar `admin_audit_logs`;
- a UI deve explicar o impacto antes de confirmar.

Copy sugerida para autoproteção:

```text
Você está alterando permissões administrativas. Confirme que não está removendo seu próprio acesso ou deixando o app sem administrador ativo.
```

## Critério de aceite futuro

Antes de mergear uma PR que migre rotas ou altere roles administrativas, validar:

- rotas legadas importantes continuam acessíveis ou redirecionam;
- rotas públicas não são capturadas pelo fallback interno;
- `/aguardando` é usado como rota de espera;
- `waitlisted` permanece apenas como status interno;
- admin não consegue se trancar fora sem proteção;
- alteração de role gera audit log;
- smoke tests cobrem pelo menos um redirect legado e bloqueio de admin para usuário comum.
