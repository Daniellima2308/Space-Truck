# Central de Ajuda e Atendimento Space Truck

Este documento define a visão de produto, UX e arquitetura para a futura Central de Ajuda e Atendimento do Space Truck.

A funcionalidade deve ser tratada como um módulo completo do produto, não apenas como um formulário de contato. O objetivo é oferecer ajuda rápida, atendimento organizado, pedidos de retorno por WhatsApp, chat interno, Bino como assistente e um painel administrativo para gestão da operação.

## Objetivos

- Ajudar o caminhoneiro a resolver dúvidas simples sem precisar abrir atendimento.
- Criar um canal oficial de suporte dentro do app.
- Registrar solicitações em formato de ticket, com protocolo, status e histórico.
- Permitir pedido de atendimento por WhatsApp sem depender da API oficial do WhatsApp na primeira versão.
- Preparar a base para chat interno entre usuário e atendimento.
- Preparar a base para um painel admin capaz de gerenciar suporte, usuários e, no futuro, assinaturas.
- Reduzir spam, abuso e mensagens desnecessárias com validação, limites e ajuda rápida.

## Princípios de produto

- A Central de Ajuda deve gerar entendimento, decisão ou ação prática para o caminhoneiro.
- O usuário não deve sentir que enviou uma mensagem para o vazio.
- Toda solicitação deve ter confirmação clara, protocolo e canal de resposta.
- A ajuda rápida deve vir antes do contato humano sempre que fizer sentido.
- O atendimento humano deve continuar disponível quando o usuário não conseguir resolver sozinho.
- O Bino deve ajudar como guia e triagem, sem inventar respostas técnicas sensíveis.
- O painel admin deve ser separado da experiência normal do caminhoneiro e protegido por permissão real no backend.

## Experiência do usuário

A entrada principal deve ficar em uma área como `Ajuda e Atendimento`, acessível a partir da tela de configurações ou menu principal.

A tela inicial deve apresentar caminhos claros:

- Resolver problema rápido
- Falar com suporte
- Pedir atendimento pelo WhatsApp
- Reportar problema
- Enviar sugestão
- Minhas solicitações

A tela deve ser visualmente simples, com cards grandes, texto curto e linguagem prática.

## Ajuda rápida

A ajuda rápida deve reduzir chamados desnecessários e orientar o usuário com respostas curtas.

Tópicos iniciais sugeridos:

- Não consigo finalizar uma viagem
- Meu lucro ou saldo parece errado
- Como cadastrar um veículo
- Como registrar abastecimento
- Como registrar despesa
- Como funciona comissão
- Problema com rota, distância ou pedágio
- Não consigo fazer login
- Como usar contas a receber
- Como alterar meus dados

Cada tópico deve conter:

- título claro;
- explicação curta;
- passos práticos;
- botão `Isso resolveu?`;
- opção `Não resolveu, falar com suporte`.

Quando o usuário escolher falar com suporte a partir de um tópico, o formulário deve abrir com categoria e contexto já preenchidos.

## Bino como assistente

O Bino deve atuar inicialmente como guia e triagem, não como IA livre.

Funções iniciais do Bino:

- receber o usuário na Central de Ajuda;
- sugerir tópicos rápidos;
- perguntar qual problema o usuário está enfrentando;
- direcionar para o formulário correto;
- explicar o status do atendimento;
- oferecer a opção de falar com atendente.

Fluxo desejado:

1. Usuário entra na Central.
2. Bino pergunta o que está acontecendo.
3. Usuário escolhe categoria ou tópico.
4. Bino mostra ajuda rápida.
5. Se não resolver, Bino direciona para suporte humano.

Evolução futura:

- Bino responder com base em uma base de conhecimento controlada.
- Bino resumir a solicitação antes de abrir o ticket.
- Bino sugerir prioridade ou categoria.

## Tickets de suporte

O atendimento deve ser registrado como ticket.

Tabela sugerida: `support_tickets`.

Antes da implementação, os nomes de campos e valores devem ser comparados com o schema atual para evitar convenções duplicadas. Campos como `status`, `type`, `category`, `priority` e `preferred_channel` devem seguir uma allowlist única entre banco, Edge Functions e frontend.

Campos sugeridos:

- `id`
- `ticket_number`
- `user_id`
- `type`
- `category`
- `title`
- `message`
- `preferred_channel`
- `contact_email`
- `whatsapp_phone`
- `status`
- `priority`
- `source`
- `app_version`
- `device_info`
- `created_at`
- `updated_at`
- `closed_at`

Tipos sugeridos:

- `support`
- `suggestion`
- `bug`
- `whatsapp_request`

Categorias sugeridas:

- `account`
- `trip`
- `freight`
- `fueling`
- `expenses`
- `maintenance`
- `finance`
- `route`
- `bug`
- `suggestion`
- `other`

Canais sugeridos:

- `app`
- `email`
- `whatsapp`

Status sugeridos:

- `open`
- `in_review`
- `waiting_contact`
- `answered`
- `closed`

## Chat interno

O chat dentro do app deve começar como atendimento assíncrono, não necessariamente em tempo real.

Tabela sugerida: `support_ticket_messages`.

Campos sugeridos:

- `id`
- `ticket_id`
- `sender_id`
- `sender_role`
- `message`
- `created_at`
- `read_at`

Papéis sugeridos:

- `user`
- `admin`
- `system`
- `bino`

Primeira versão:

- usuário abre ticket;
- usuário envia mensagens adicionais;
- admin responde pelo painel;
- usuário vê respostas dentro do app;
- status do ticket muda conforme atendimento.

Evolução futura:

- Supabase Realtime para mensagens em tempo real;
- indicador de mensagem lida;
- notificações push;
- presença online;
- anexos controlados.

## Atendimento por WhatsApp

Na primeira versão, o Space Truck não precisa usar API oficial do WhatsApp.

Fluxo recomendado:

1. Usuário escolhe `Pedir atendimento pelo WhatsApp`.
2. App solicita número de WhatsApp e consentimento.
3. App cria ticket com canal `whatsapp`.
4. Edge Function envia e-mail para o admin com dados do ticket.
5. E-mail inclui link rápido `https://wa.me/55...`.
6. Admin chama o usuário manualmente.

Esse fluxo entrega atendimento por WhatsApp sem custo e sem complexidade inicial da API oficial.

No futuro, avaliar WhatsApp Business API apenas se houver volume suficiente para justificar custo e complexidade.

## E-mail de suporte

O e-mail oficial de atendimento será:

`contato@spacetruckapp.com`

Secrets esperados no Supabase:

```text
ADMIN_EMAIL=contato@spacetruckapp.com
FROM_EMAIL=Space Truck <contato@spacetruckapp.com>
RESEND_API_KEY=...
```

Recomendação técnica:

- usar provedor transacional, como Resend, para enviar notificações;
- não expor e-mail administrativo ou API key no frontend;
- manter o Supabase como fonte da verdade;
- usar e-mail apenas como notificação e confirmação.

## Painel admin

O painel admin deve ser separado da experiência normal do caminhoneiro.

Primeira versão recomendada:

- rota protegida dentro do mesmo projeto, por exemplo `/admin`;
- acesso apenas para usuários com papel admin;
- proteção real via Supabase/RLS e Edge Functions;
- interface responsiva para uso em desktop, tablet ou celular.

Evolução futura:

- painel separado em `admin.spacetruckapp.com`.

Módulos futuros do painel admin:

- visão geral;
- usuários;
- tickets de suporte;
- chat interno;
- pedidos de WhatsApp;
- sugestões;
- bugs reportados;
- tópicos de ajuda rápida;
- configurações do app;
- planos e assinaturas;
- bloqueios e auditoria.

## Usuários e assinaturas futuras

O admin deve ser pensado para evoluir para controle de assinatura.

Campos futuros possíveis em perfil ou tabela própria:

- `plan`
- `subscription_status`
- `trial_ends_at`
- `billing_provider`
- `billing_customer_id`
- `blocked_at`
- `blocked_reason`

A cobrança não deve ser implementada agora, mas a arquitetura não deve impedir essa evolução.

## Permissões e segurança

Regras obrigatórias:

- usuário precisa estar autenticado para abrir ticket;
- usuário só pode ler os próprios tickets;
- usuário não pode editar status, prioridade ou campos internos;
- admin pode listar, responder e atualizar tickets;
- permissões devem ser aplicadas no Supabase/RLS, não apenas no frontend;
- ações administrativas devem gerar logs.

Tabela futura sugerida: `user_roles`.

Antes de criar essa tabela, a implementação deve revisar o mecanismo de autenticação já usado no projeto e definir uma única fonte de verdade para permissões. Se o app usar claims no JWT, metadados de usuário ou outra tabela existente, `user_roles` deve se alinhar a esse modelo em vez de criar permissões paralelas.

Campos:

- `user_id`
- `role`

Papéis iniciais:

- `user`
- `admin`

Tabela futura sugerida: `admin_audit_logs`.

Campos:

- `id`
- `admin_user_id`
- `action`
- `target_type`
- `target_id`
- `metadata`
- `created_at`

## Anti-spam e abuso

A Edge Function deve validar tudo no servidor.

Regras iniciais:

- mínimo de 10 caracteres por mensagem;
- máximo de 2.000 caracteres por mensagem na primeira versão;
- categorias e canais precisam estar em allowlist;
- WhatsApp obrigatório quando canal for `whatsapp`;
- consentimento obrigatório para pedido de WhatsApp;
- bloquear HTML;
- limitar quantidade de links;
- bloquear mensagens repetidas em curto intervalo;
- máximo de 3 tickets por hora por usuário;
- máximo de 10 tickets por dia por usuário.

Esses limites podem ser ajustados depois com base no uso real.

## Retenção e custo no Supabase

Mensagens de texto não devem pesar de forma relevante no Supabase, mas a retenção precisa ser definida desde a primeira versão.

Política inicial sugerida:

- tickets ativos devem ser mantidos enquanto estiverem abertos ou em análise;
- tickets fechados devem ficar disponíveis por 24 meses;
- mensagens de atendimento devem seguir o mesmo prazo do ticket;
- dados de contato sensíveis, como WhatsApp, devem ser revisados para anonimização ou remoção após 24 meses do fechamento;
- registros de auditoria administrativa devem ser mantidos por no mínimo 24 meses;
- mudanças futuras nessa política devem ser documentadas antes de aplicação em produção.

Cuidados:

- não aceitar anexos na primeira versão;
- limitar tamanho de mensagem;
- evitar logs grandes;
- indexar `user_id`, `status` e `created_at`;
- definir rotina futura para arquivar, anonimizar ou remover dados expirados.

O Supabase deve ser a fonte da verdade. E-mail e WhatsApp são canais de notificação ou atendimento, não a base principal.

## Migração de dados legados

Antes de ativar `support_tickets` como fonte principal, é necessário decidir o destino dos dados existentes em `support_messages` e `suggestions`.

Estratégia recomendada:

- criar `support_tickets` sem remover as tabelas legadas;
- fazer backfill em script único ou migration controlada, transformando linhas de `support_messages` e `suggestions` em tickets;
- preservar `user_id`, mensagem original e datas disponíveis;
- mapear `support_messages` para `type = support` e `suggestions` para `type = suggestion`;
- evitar duplicidade usando combinação de `user_id`, mensagem normalizada, tipo e data de criação;
- manter tabelas legadas em modo somente leitura durante a verificação;
- escrever novos atendimentos apenas em `support_tickets` após a virada;
- validar contagens antes e depois do backfill;
- manter rollback simples: reverter escrita para o fluxo antigo enquanto as tabelas legadas continuarem intactas.

As tabelas legadas só devem ser removidas em PR futura, depois de validação explícita do histórico migrado.

## Fases de implementação

### Fase 1: Planejamento e base de UX

- Criar documentação da feature.
- Definir fluxos principais.
- Definir tabelas e permissões antes de implementar.

### Fase 2: Central de Ajuda visual

- Criar tela principal de Ajuda e Atendimento.
- Criar cards de caminhos principais.
- Criar tópicos de ajuda rápida em arquivo local.
- Remover botões soltos de suporte/sugestão da tela de configurações.

### Fase 3: Banco de tickets

- Criar migration de `support_tickets`.
- Criar policies/RLS.
- Criar tipos TypeScript.
- Criar protocolo de ticket.
- Definir estratégia de migração/backfill de `support_messages` e `suggestions` para o novo modelo unificado.
- Definir regra de convivência temporária: tabelas legadas em leitura e escrita nova apenas em `support_tickets`.

### Fase 4: Edge Function de criação de ticket

- Criar ou evoluir função para abrir ticket.
- Validar payload.
- Aplicar anti-spam básico.
- Enviar notificação por e-mail.
- Retornar protocolo para o app.

### Fase 5: WhatsApp manual

- Adicionar canal `whatsapp`.
- Validar telefone e consentimento.
- Enviar e-mail para admin com link `wa.me`.

### Fase 6: Minhas solicitações

- Listar tickets do usuário.
- Mostrar status, protocolo, categoria e canal.
- Abrir detalhe do ticket.

### Fase 7: Chat assíncrono

- Criar tabela de mensagens do ticket.
- Permitir usuário enviar mensagens adicionais.
- Permitir admin responder.
- Mostrar histórico dentro do app.

### Fase 8: Painel admin mínimo

- Criar rota `/admin` protegida.
- Listar tickets.
- Filtrar por status e categoria.
- Responder tickets.
- Atualizar status.

### Fase 9: Bino guiado

- Adicionar Bino como guia da Central.
- Criar respostas controladas.
- Direcionar usuário para ajuda rápida ou atendimento.

### Fase 10: Evoluções futuras

- IA do Bino com base de conhecimento controlada.
- Painel admin completo.
- Assinaturas e planos.
- WhatsApp Business API.
- Notificações push.
- Anexos controlados.

## Fora de escopo inicial

- WhatsApp Business API oficial.
- IA livre respondendo suporte sem base controlada.
- Anexos, áudio, imagens ou vídeo.
- Painel financeiro completo.
- Sistema de assinatura pago.
- Notificações push.

## Decisão recomendada

Começar com uma Central de Ajuda bem estruturada, tickets, ajuda rápida, pedido manual de WhatsApp e base para chat/admin.

Isso entrega valor real rápido, evita complexidade prematura e prepara o Space Truck para crescer como produto profissional.