# Blueprint de produto e UI/UX: lançamento beta do Space Truck

Este documento transforma a arquitetura de beta gate, landing pública, autenticação, admin e OTP em um plano prático de produto, conteúdo e experiência visual.

Ele deve ser lido junto com:

- `docs/architecture/beta-gate-admin-auth.md`;
- `docs/architecture/beta-gate-admin-auth-hardening.md`;
- `docs/project/assistant-operating-manual.md`;
- `docs/project/assistant-repository-onboarding.md`.

## Objetivo

Planejar como o Space Truck deve aparecer para usuários externos durante o acesso antecipado, sem tratar o app como projeto do zero.

Este blueprint define:

- landing pública;
- fluxo de acesso antecipado;
- campos de captação;
- tela de espera;
- onboarding pós-login;
- painel admin inicial;
- linguagem e copy;
- uso do Bino;
- assets necessários;
- critérios de qualidade;
- sequência de implementação.

## Estado atual considerado

O Space Truck já possui app interno em React/Vite/Supabase/Vercel, com rotas, login, cadastro, `AuthGuard`, `AuthContext`, `AppContext`, workflows e docs de arquitetura.

Hoje, em `src/App.tsx`:

- `/login`, `/register`, `/forgot-password` e `/reset-password` são públicas;
- `/*` entra no `ProtectedApp`;
- dentro do `ProtectedApp`, `/` ainda é o Dashboard protegido;
- rotas internas como `/vehicles`, `/new-trip`, `/history`, `/maintenance`, `/freight-analysis`, `/personal-expenses`, `/px` e `/help` já existem;
- `AppProvider` fica dentro de `AuthGuard`, então o app operacional depende de usuário autenticado.

Ainda não existe:

- landing pública;
- página de acesso antecipado;
- tela de espera `waitlisted`;
- onboarding de beta gate;
- painel admin de usuários/beta;
- layout público de marketing.

Este documento planeja essas partes como evolução do app existente.

## Princípio central

A landing não deve ser um site bonito separado. Ela deve ser a fachada pública do Space Truck.

A pessoa chega, entende a promessa, cria conta ou entra na lista, e depois é conduzida para espera, aprovação e app interno.

Frase-guia: `O Space Truck mostra se a viagem deu lucro de verdade.`

## Experiência desejada

A primeira impressão deve transmitir:

- confiança;
- tecnologia útil;
- realidade da estrada;
- app feito para caminhoneiro;
- controle sem planilha;
- clareza sobre lucro real;
- produto sério, não landing improvisada.

Evitar:

- visual genérico de startup;
- promessa exagerada;
- texto corporativo;
- excesso de cards;
- formulário longo demais;
- caminhão/estrada usado como enfeite sem propósito;
- mockups falsos com dados irreais;
- depoimentos inventados.

## Público prioritário

A comunicação inicial deve falar com:

- caminhoneiro autônomo;
- motorista que controla comissão, fretes e gastos;
- dono de um caminhão ou pequena frota;
- caminhoneiro que hoje usa caderno, WhatsApp, planilha ou memória;
- usuário que quer saber quanto sobrou limpo.

Não tentar vender para transportadora grande no primeiro momento.

O produto deve nascer com alma de boleia.

## Tom de voz

O tom deve ser direto, parceiro, seguro, brasileiro e ligado à estrada sem virar caricatura.

Evitar frases como:

- `o melhor app do Brasil`;
- `revolucionário` sem prova;
- `controle tudo em um clique`;
- `gestão empresarial avançada para transportadores`.

Preferir frases como:

- `Veja se a viagem valeu a pena de verdade.`
- `Controle frete, custos e lucro sem depender de planilha.`
- `O Space Truck ajuda a entender quanto sobrou limpo no fim do trecho.`
- `Menos chute. Mais leitura da operação.`
- `Feito para a rotina real de quem vive na estrada.`

## Fluxo macro

Fluxo ideal do acesso antecipado:

- visitante acessa a área pública;
- entende promessa e benefícios;
- clica em `Quero acesso antecipado`;
- cria conta ou entra com Google/e-mail;
- completa dados mínimos;
- fica como `waitlisted`;
- vê a tela de espera;
- Daniel aprova pelo admin;
- usuário passa para `approved`;
- usuário entra no app interno.

## Navegação recomendada

### Fase intermediária

Como hoje `/` é Dashboard protegido, a migração deve ser cuidadosa.

A fase intermediária mais segura é:

- criar landing pública primeiro em `/inicio` ou `/acesso-antecipado`;
- criar tela de espera em `/aguardando`;
- criar admin shell em `/admin`;
- validar fluxo;
- só depois decidir mover landing para `/` e app interno para `/app/*`.

### Fase final

Estrutura final desejada:

- `/` como landing pública;
- `/acesso-antecipado` como inscrição beta;
- `/login` ou `/entrar` como login;
- `/register` ou `/criar-conta` como cadastro;
- `/aguardando` como espera beta;
- `/onboarding` como completar perfil;
- `/app/*` como app interno aprovado;
- `/admin/*` como painel admin.

Rotas antigas como `/vehicles`, `/history`, `/new-trip` e `/maintenance` devem continuar funcionando durante transição ou redirecionar com segurança para `/app/...`.

## Landing pública

A landing precisa responder rapidamente:

- o que é o Space Truck;
- para quem é;
- qual dor resolve;
- por que entrar na lista;
- o que acontece depois do cadastro.

Estrutura recomendada:

- hero principal;
- dor real;
- solução do Space Truck;
- leituras que o app entrega;
- como funciona o acesso antecipado;
- prévia do app ou mock funcional;
- Bino como guia;
- formulário ou CTA de acesso;
- confiança e privacidade;
- FAQ curto;
- CTA final.

## Hero principal

Headline principal recomendada: `Saiba se a viagem deu lucro de verdade.`

Variações possíveis:

- `Controle frete, custos e lucro sem planilha.`
- `O copiloto que ajuda a entender sua viagem do começo ao fim.`
- `Menos chute na boleia. Mais clareza no resultado.`

Subheadline recomendada:

`O Space Truck está sendo criado para caminhoneiros controlarem fretes, despesas, manutenção e saldo da viagem com leitura simples e rápida.`

CTA principal: `Quero acesso antecipado`

CTA secundário: `Ver como funciona`

Elementos visuais:

- fundo escuro premium;
- sensação de estrada/noturno/tecnologia;
- mockup de celular com tela do app;
- Bino pequeno ou em destaque lateral;
- dados demonstrativos e legíveis.

Dados sugeridos para mockup:

```text
Saldo da viagem: R$ 1.280,00
Fretes concluídos: 15/15
Próxima parada: Uberlândia
Diesel: R$ 2.940,00
Lucro estimado: R$ 1.280,00
```

## Seções da landing

### Dor real

Título: `No fim da viagem, nem sempre é fácil saber quanto sobrou.`

Texto: `Frete, diesel, pedágio, alimentação, manutenção, adiantamento, comissão e contas do trecho acabam se misturando. O Space Truck nasce para organizar essa leitura e mostrar o resultado com clareza.`

Cards sugeridos:

- `Frete entra, gasto sai`: saber o que realmente ficou no bolso depois de tudo.
- `Despesa espalhada`: diesel, pedágio, comida e manutenção ficam perdidos em anotação, recibo e conversa.
- `Decisão no escuro`: sem leitura do custo, fica mais difícil saber se o próximo frete compensa.

### Solução

Título: `O Space Truck organiza a operação e mostra o resultado.`

Texto: `Registre viagem, frete e despesas. O app transforma esses dados em leitura prática: saldo, lucro, custo por km, gastos principais e histórico.`

Benefícios principais:

- controle de viagens;
- fretes e recebimentos;
- despesas da estrada;
- lucro real da viagem;
- manutenção e lembretes;
- histórico para comparar trechos;
- base futura para alertas e inteligência.

### Leituras do app

Título: `Não é só anotar. É entender a viagem.`

Blocos recomendados:

- `Lucro real`: veja quanto sobrou depois de descontar os principais custos.
- `Custo por km`: entenda se o trecho está rodando pesado ou saudável.
- `Gastos que mais pesam`: veja onde o dinheiro está indo.
- `Histórico de viagens`: compare viagens e aprenda quais trechos compensam mais.
- `Manutenção`: use os km da viagem para manter o caminhão no radar.

### Como funciona o acesso antecipado

Título: `Estamos liberando o acesso aos poucos.`

Texto: `O Space Truck está sendo preparado para uso real na estrada. Quem entrar na lista poderá ser chamado para testar antes do lançamento geral.`

Passos:

- `Entre na lista`: informe seus dados principais e o que mais quer controlar no app.
- `Aguarde a liberação`: o acesso será liberado aos poucos para manter qualidade e ouvir os primeiros usuários.
- `Teste na rotina real`: use o app em viagens reais e ajude a deixar o Space Truck mais certeiro.

## Bino

Bino deve aparecer como copiloto/assistente do Space Truck, não como decoração solta.

Usos recomendados:

- explicar o acesso antecipado;
- aparecer próximo ao CTA;
- aparecer na tela de espera;
- aparecer no onboarding;
- futuramente explicar leituras da viagem.

Texto sugerido: `O Bino vai te ajudar a entender os números da viagem sem complicar.`

Regras visuais:

- manter o mesmo rosto;
- manter a mesma máscara facial;
- manter olhos, bico, paleta e silhueta;
- não redesenhar;
- não adicionar acessórios aleatórios;
- não usar expressão exagerada.

## Formulário de acesso antecipado

O formulário deve ser curto o suficiente para converter e inteligente o bastante para gerar aprendizado.

Campos mínimos:

- nome ou apelido;
- WhatsApp;
- e-mail;
- cidade/UF base;
- perfil;
- principal interesse;
- consentimento WhatsApp.

Opções de perfil:

- autônomo;
- motorista empregado;
- agregado;
- dono de um caminhão;
- dono de pequena frota;
- outro.

Opções de principal interesse:

- lucro da viagem;
- controle de despesas;
- fretes e recebimentos;
- manutenção;
- histórico de viagens;
- PX Digital;
- tudo isso;
- outro.

Campo opcional de dor: `Hoje, qual é a maior dificuldade para controlar suas viagens?`

Texto de consentimento: `Aceito receber mensagens sobre o acesso antecipado e lançamento do Space Truck pelo WhatsApp/e-mail.`

## Tela de sucesso

Título: `Você entrou na lista de acesso antecipado. 🚛`

Texto principal: `Agora é só aguardar a liberação. Estamos preparando o Space Truck para funcionar bem na rotina real da estrada.`

Texto complementar: `Quando seu acesso for aprovado, você será avisado pelo canal informado.`

CTAs possíveis:

- `Entrar na minha conta`;
- `Atualizar meus dados`;
- `Voltar para início`.

## Tela de espera `/aguardando`

A tela atende usuário autenticado, mas ainda não aprovado.

Estrutura:

- status visual claro;
- mensagem principal;
- dados cadastrados;
- opção de atualizar WhatsApp/e-mail;
- explicação do processo;
- Bino como apoio;
- logout discreto;
- link para privacidade/termos.

Copy principal:

- título: `Seu acesso está na fila de liberação.`
- texto: `Você já está na lista do Space Truck. Estamos liberando aos poucos para garantir qualidade, segurança e uma experiência boa para quem usa na estrada.`
- mensagem com Bino: `Enquanto isso, o Bino fica de olho no seu cadastro. Assim que seu acesso for aprovado, você será avisado.`

Estados necessários:

- `waitlisted`: aguardando aprovação, dados principais e CTA para atualizar contato;
- `suspended`: acesso temporariamente suspenso e orientação genérica para suporte;
- `blocked`: acesso indisponível, mensagem genérica e canal de contato;
- erro de perfil: mensagem de falha, tentar novamente, logout e suporte.

## Onboarding pós-login

O onboarding completa perfil mínimo antes do app completo ou da espera.

Etapas recomendadas:

- identidade: nome/apelido, username futuro e avatar opcional;
- contato: telefone/WhatsApp, consentimento e e-mail vindo do auth;
- perfil de estrada: tipo de motorista, cidade/UF base, tipo de caminhão/carroceria e principal interesse;
- confirmação: resumo, aviso de lista de espera e CTA para concluir.

Para Google login, oferecer criação de senha sem bloquear conversão imediatamente.

Texto sugerido: `Você entrou com Google. Depois, se quiser, pode criar uma senha do Space Truck para entrar também por e-mail, telefone ou usuário.`

## Login e cadastro

Login não deve parecer só barreira. Ele deve explicar por que a conta existe.

Copy no login:

- título: `Entre no Space Truck`;
- subtexto: `Acesse suas viagens, custos, fretes e leituras da operação.`;
- CTA Google: `Entrar com Google`;
- CTA e-mail: `Entrar com e-mail`;
- link: `Ainda não tem conta? Entrar na lista de acesso antecipado`.

Copy no cadastro:

- título: `Crie sua conta e entre na lista`;
- subtexto: `Seu cadastro ajuda a liberar o acesso aos poucos e melhorar o Space Truck com caminhoneiros reais.`

## Painel admin inicial

Objetivo: dar ao Daniel controle do beta sem mexer manualmente no banco.

Rotas futuras:

- `/admin`;
- `/admin/users`;
- `/admin/beta-applications`;
- `/admin/audit-logs`.

Métricas do dashboard:

- total na lista;
- aguardando aprovação;
- aprovados;
- suspensos/bloqueados;
- novos cadastros dos últimos sete dias;
- principais interesses dos inscritos.

Lista de usuários:

- nome;
- e-mail;
- WhatsApp;
- status;
- role;
- perfil;
- principal interesse;
- data de cadastro;
- ações.

Filtros:

- status;
- role;
- UF;
- perfil;
- interesse;
- data.

Ações:

- aprovar;
- suspender;
- bloquear;
- ver detalhes;
- alterar status com motivo;
- copiar contato;
- abrir ticket/suporte futuramente.

Ações perigosas precisam de confirmação clara:

- bloquear;
- suspender;
- alterar role;
- reativar;
- marcar telefone como verificado.

## Admin audit log

O audit log deve ser simples e consultável.

Campos visuais:

- data/hora;
- ação;
- admin responsável;
- usuário afetado;
- status anterior;
- novo status;
- motivo.

Nunca mostrar segredo, token, OTP ou dado sensível bruto.

## Design visual

Direção estética:

- dark mode premium;
- fundo escuro com profundidade;
- contraste bom;
- amarelo/dourado como acento de ação;
- tons ligados à estrada, noite, painel e tecnologia;
- cards escuros com bordas suaves;
- botões grandes e fáceis de tocar;
- linguagem mobile-first.

A landing deve parecer:

- confiável;
- moderna;
- robusta;
- feita por quem entende caminhoneiro;
- mais ferramenta de trabalho do que propaganda.

Evitar:

- excesso de gradiente;
- neon exagerado;
- imagens genéricas de caminhão sem propósito;
- mockup impossível de ler;
- texto pequeno demais;
- contraste ruim;
- CTAs escondidos.

## Assets necessários

Essenciais para primeira versão:

- logo Space Truck em boa qualidade;
- versão horizontal e compacta do logo;
- Bino oficial em pose neutra/amigável;
- mockup de celular com tela do app;
- ícones simples para lucro, despesa, viagem, manutenção e histórico;
- background abstrato/estrada escura;
- favicon/app icon, se ainda não estiver pronto.

Assets futuros:

- Bino explicando algo importante;
- Bino em alerta;
- Bino apontando para telefone/app;
- mockups de telas reais do app;
- vídeo curto de lançamento;
- imagens para Instagram/reels;
- versão Open Graph para compartilhamento.

## FAQ público

Perguntas recomendadas:

- `O Space Truck já está disponível?`
- `Preciso pagar para entrar na lista?`
- `O app é para autônomo ou empresa?`
- `Vou receber mensagem no WhatsApp?`
- `O app calcula lucro automaticamente?`

Respostas devem ser honestas, sem prometer disponibilidade geral antes da hora e sem inventar números de usuários.

## Mensagens automáticas futuras

Boas-vindas à lista:

```text
Bem-vindo à lista de acesso antecipado do Space Truck 🚛
Você entrou no grupo dos primeiros caminhoneiros que vão acompanhar a chegada do app.
Estamos criando o Space Truck para ajudar na leitura da viagem: frete, custos, despesas, manutenção e quanto sobra de verdade no fim do trecho.
Quando seu acesso for liberado, avisaremos por aqui.
```

Aprovação de acesso:

```text
Seu acesso ao Space Truck foi liberado 🚛
Agora você já pode entrar no app e começar a testar as ferramentas de controle de viagem, frete, despesas e lucro.
```

Lembrete de cadastro incompleto:

```text
Falta pouco para entrar na lista do Space Truck.
Complete seus dados para que possamos liberar seu acesso quando chegar sua vez.
```

## Critérios de qualidade

Antes de aprovar a landing visual, conferir:

- promessa acima da dobra;
- CTA principal claro;
- formulário curto;
- visual bom no celular;
- contraste adequado;
- texto sem genericidade;
- nenhuma promessa falsa;
- Bino sem redesenho;
- mockup legível;
- LGPD/consentimento visível;
- performance preservada;
- acessibilidade básica preservada.

Antes de liberar admin inicial, conferir:

- usuário comum não acessa admin;
- lista de usuários tem filtros úteis;
- ações perigosas pedem confirmação;
- toda ação sensível gera audit log;
- token/OTP/segredo não aparece em tela;
- funciona no tablet/celular;
- Daniel aprova usuário sem mexer no banco.

## Plano de implementação recomendado

Sequência recomendada:

- PR A: criar este blueprint de produto/UI/UX;
- PR B: implementar access model e migrations;
- PR C: criar domínio `src/features/access`;
- PR D: criar tela `/aguardando`;
- PR E: criar landing pública inicial em rota segura;
- PR F: criar formulário de acesso antecipado;
- PR G: criar onboarding pós-login;
- PR H: criar admin shell;
- PR I: criar admin users/actions com audit logs;
- PR J: ajustar testes e rota final.

## Decisões pendentes

Antes de codar a landing, Daniel precisa validar:

- primeira landing em `/inicio`, `/acesso-antecipado` ou já em `/`;
- cadastro beta account-first ou lead sem conta;
- texto principal final do hero;
- Bino na primeira versão ou depois;
- formulário com campo de dor aberta ou só opções;
- admin aprovando manualmente todo mundo ou liberando teste interno;
- tela de espera com atualização de contato já na primeira versão.

## Recomendação objetiva

A melhor sequência é:

- implementar modelo de acesso e backfill seguro;
- criar domínio de acesso no frontend;
- criar tela de espera;
- criar landing em rota segura;
- conectar formulário/cadastro;
- criar admin inicial;
- só depois migrar `/` para landing e app para `/app/*`.

Isso reduz risco de quebrar o app atual e evita trancar o Daniel fora da própria boleia.

## Regra final

O beta não é só marketing.

Ele é o primeiro radar real do Space Truck.

Cada tela precisa captar usuários, explicar o produto e proteger o app interno, sem perder a identidade principal: ajudar o caminhoneiro a entender a viagem, cuidar da operação e decidir melhor.
