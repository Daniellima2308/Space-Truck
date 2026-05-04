# Blueprint de produto e UI/UX: lançamento beta do Space Truck

Este documento transforma a arquitetura de beta gate, landing, autenticação, admin e OTP em um plano de produto, fluxo, conteúdo e experiência visual.

Ele deve ser lido junto com:

- `docs/architecture/beta-gate-admin-auth.md`;
- `docs/architecture/beta-gate-admin-auth-hardening.md`;
- `docs/project/assistant-operating-manual.md`;
- `docs/project/assistant-repository-onboarding.md`.

## Objetivo

Planejar como o Space Truck deve aparecer para usuários externos durante o acesso antecipado, sem tratar o app como projeto do zero.

O objetivo é definir:

- a landing pública;
- o fluxo de acesso antecipado;
- os campos de captação;
- a tela de espera;
- o onboarding pós-login;
- o painel admin inicial;
- a linguagem, copy e tom;
- o uso do Bino;
- os assets necessários;
- os critérios de qualidade visual;
- a ordem de implementação em PRs pequenas.

## Estado atual considerado

O Space Truck já possui app interno com rotas, login, cadastro, AuthGuard, AuthContext, AppContext, Supabase, workflows e docs de arquitetura.

Hoje, em `src/App.tsx`:

- `/login` é público;
- `/register` é público;
- `/forgot-password` é público;
- `/reset-password` é público;
- `/*` entra no `ProtectedApp`;
- dentro do `ProtectedApp`, `/` hoje é o Dashboard protegido;
- rotas internas como `/vehicles`, `/new-trip`, `/history`, `/maintenance`, `/freight-analysis`, `/personal-expenses`, `/px`, `/help` e outras já existem;
- `AppProvider` fica dentro de `AuthGuard`, então o app operacional depende de usuário autenticado.

Não existe ainda, no estado observado:

- landing pública;
- página de acesso antecipado;
- tela de espera `waitlisted`;
- onboarding de beta gate;
- painel admin de usuários/beta;
- layout público de marketing.

Este blueprint planeja essas partes como evolução do produto existente.

## Princípio central

A landing não deve ser um “site bonito separado”.

Ela deve ser a fachada pública do Space Truck.

A pessoa chega, entende a promessa, cria conta ou entra na lista, e depois é conduzida para espera, aprovação e app interno.

Frase-guia:

> O Space Truck mostra se a viagem deu lucro de verdade.

## O que a experiência precisa transmitir

A primeira impressão deve passar:

- confiança;
- tecnologia útil;
- realidade da estrada;
- app feito para caminhoneiro;
- controle sem planilha;
- clareza sobre lucro real;
- sensação de produto sério, não landing improvisada.

Evitar:

- visual genérico de startup;
- promessa exagerada;
- texto corporativo;
- excesso de cards;
- formulário longo demais;
- caminhão/estrada usado como enfeite sem propósito;
- mockups falsos com dados irreais demais;
- depoimentos inventados.

## Público prioritário do beta

A landing deve falar primeiro com:

- caminhoneiro autônomo;
- motorista que controla comissão, fretes e gastos;
- dono de pequeno número de caminhões;
- caminhoneiro que hoje usa caderno, WhatsApp, planilha ou memória;
- usuário que quer saber quanto sobrou limpo.

Não tentar vender para transportadora grande no primeiro momento.

O produto deve nascer com alma de boleia.

## Tom de voz

Tom recomendado:

- direto;
- parceiro;
- seguro;
- brasileiro;
- ligado à estrada sem caricatura;
- simples, mas profissional;
- confiante sem parecer propaganda forçada.

Evitar frases como:

- “o melhor app do Brasil”;
- “revolucionário” sem prova;
- “controle tudo em um clique”;
- “gestão empresarial avançada para transportadores”.

Preferir frases como:

- “Veja se a viagem valeu a pena de verdade.”
- “Controle frete, custos e lucro sem depender de planilha.”
- “O Space Truck ajuda a entender quanto sobrou limpo no fim do trecho.”
- “Menos chute. Mais leitura da operação.”
- “Feito para a rotina real de quem vive na estrada.”

## Estrutura macro da experiência

Fluxo ideal:

1. Visitante acessa `/`.
2. Vê a landing pública.
3. Entende promessa e benefícios.
4. Clica em `Quero acesso antecipado`.
5. Vai para fluxo de cadastro/login.
6. Cria conta ou entra com Google/e-mail.
7. Completa dados mínimos.
8. Fica como `waitlisted`.
9. Vê tela de espera.
10. Daniel aprova pelo admin.
11. Usuário passa para `approved`.
12. Usuário entra no app interno.

## Arquitetura de navegação desejada

### Fase intermediária recomendada

Como hoje `/` é Dashboard protegido, a migração deve ser cuidadosa.

A fase intermediária mais segura é:

- criar landing pública em rota própria primeiro, por exemplo `/inicio` ou `/acesso-antecipado`;
- criar tela de espera `/aguardando`;
- criar admin shell `/admin`;
- validar fluxo;
- só depois decidir mover a landing para `/` e app interno para `/app/*`.

### Fase final desejada

- `/` — landing pública;
- `/acesso-antecipado` — inscrição beta;
- `/login` ou `/entrar` — login;
- `/register` ou `/criar-conta` — cadastro;
- `/aguardando` — espera beta;
- `/onboarding` — completar perfil;
- `/app/*` — app interno aprovado;
- `/admin/*` — painel admin.

### Regra de compatibilidade

Não quebrar rotas antigas sem aliases/redirects.

Rotas antigas como `/vehicles`, `/history`, `/new-trip` e `/maintenance` devem continuar funcionando durante transição ou redirecionar com segurança para `/app/...`.

## Landing pública

### Objetivo da landing

Em poucos segundos, a landing precisa responder:

- o que é o Space Truck;
- para quem é;
- qual dor resolve;
- por que entrar na lista;
- o que acontece depois do cadastro.

### Estrutura recomendada da landing

1. Hero principal;
2. Dor real;
3. Solução do Space Truck;
4. Leituras que o app entrega;
5. Como funciona o acesso antecipado;
6. Prévia do app / mock funcional;
7. Bino como guia;
8. Formulário ou CTA de acesso;
9. Confiança e privacidade;
10. FAQ curto;
11. CTA final.

## Seção 1 — Hero principal

### Objetivo

Capturar atenção e comunicar a promessa principal.

### Headline recomendada

Opção principal:

> Saiba se a viagem deu lucro de verdade.

Variações possíveis:

> Controle frete, custos e lucro sem planilha.

> O copiloto que ajuda a entender sua viagem do começo ao fim.

> Menos chute na boleia. Mais clareza no resultado.

### Subheadline recomendada

> O Space Truck está sendo criado para caminhoneiros controlarem fretes, despesas, manutenção e saldo da viagem com leitura simples e rápida.

Variação mais direta:

> Um app para registrar a viagem, acompanhar os gastos e ver quanto sobrou limpo no fim do trecho.

### CTAs

CTA principal:

> Quero acesso antecipado

CTA secundário:

> Ver como funciona

### Elementos visuais

- fundo escuro premium;
- sensação de estrada/noturno/tecnologia;
- mockup de celular com tela do app;
- Bino pequeno ou em destaque lateral;
- dados realistas de app, sem inventar usuário/depoimento.

### Dados sugeridos no mockup

Usar dados demonstrativos claramente genéricos:

```text
Saldo da viagem: R$ 1.280,00
Fretes concluídos: 15/15
Próxima parada: Uberlândia
Diesel: R$ 2.940,00
Lucro estimado: R$ 1.280,00
```

Evitar dizer que são dados de usuário real.

## Seção 2 — Dor real

### Objetivo

Mostrar que o produto entende a rotina do caminhoneiro.

### Título

> No fim da viagem, nem sempre é fácil saber quanto sobrou.

### Texto

> Frete, diesel, pedágio, alimentação, manutenção, adiantamento, comissão e contas do trecho acabam se misturando. O Space Truck nasce para organizar essa leitura e mostrar o resultado com clareza.

### Cards de dor

Card 1:

Título: `Frete entra, gasto sai`

Texto: `O problema é saber o que realmente ficou no bolso depois de tudo.`

Card 2:

Título: `Despesa espalhada`

Texto: `Diesel, pedágio, comida e manutenção ficam perdidos em anotação, recibo e conversa.`

Card 3:

Título: `Decisão no escuro`

Texto: `Sem leitura do custo, fica mais difícil saber se o próximo frete compensa.`

## Seção 3 — Solução

### Título

> O Space Truck organiza a operação e mostra o resultado.

### Texto

> Registre viagem, frete e despesas. O app transforma esses dados em leitura prática: saldo, lucro, custo por km, gastos principais e histórico.

### Benefícios principais

- controle de viagens;
- fretes e recebimentos;
- despesas da estrada;
- lucro real da viagem;
- manutenção e lembretes;
- histórico para comparar trechos;
- base futura para alertas e inteligência.

## Seção 4 — Leituras do app

### Objetivo

Mostrar que Space Truck não é só cadastro.

### Título

> Não é só anotar. É entender a viagem.

### Blocos de leitura

Bloco 1 — `Lucro real`

> Veja quanto sobrou depois de descontar os principais custos.

Bloco 2 — `Custo por km`

> Entenda se o trecho está rodando pesado ou saudável.

Bloco 3 — `Gastos que mais pesam`

> Veja onde o dinheiro está indo: diesel, pedágio, alimentação, manutenção e outros.

Bloco 4 — `Histórico de viagens`

> Compare viagens e aprenda quais trechos compensam mais.

Bloco 5 — `Manutenção`

> Use os km da viagem para manter o caminhão no radar.

## Seção 5 — Como funciona o acesso antecipado

### Título

> Estamos liberando o acesso aos poucos.

### Texto

> O Space Truck está sendo preparado para uso real na estrada. Quem entrar na lista poderá ser chamado para testar antes do lançamento geral.

### Passos

1. `Entre na lista`

Texto: `Informe seus dados principais e o que mais quer controlar no app.`

2. `Aguarde a liberação`

Texto: `O acesso será liberado aos poucos para manter qualidade e ouvir os primeiros usuários.`

3. `Teste na rotina real`

Texto: `Use o app em viagens reais e ajude a deixar o Space Truck mais certeiro.`

## Seção 6 — Bino como guia

### Objetivo

Usar Bino como identidade e apoio de clareza, não decoração solta.

### Papel do Bino

Bino deve aparecer como copiloto/assistente do Space Truck.

Usos recomendados:

- explicar o acesso antecipado;
- aparecer próximo ao CTA;
- aparecer na tela de espera;
- aparecer no onboarding;
- futuramente explicar leituras da viagem.

### Texto com Bino

> O Bino vai te ajudar a entender os números da viagem sem complicar.

Variação:

> O Bino entra como copiloto para transformar frete, gasto e saldo em leitura simples.

### Regras visuais

Manter Bino exatamente como identidade oficial:

- mesmo rosto;
- mesma máscara facial;
- mesmos olhos e bico;
- mesma paleta;
- mesma silhueta;
- sem redesenhar;
- sem acessórios aleatórios;
- sem expressão exagerada.

## Seção 7 — Formulário de acesso antecipado

### Princípio

O formulário deve ser curto o suficiente para converter, mas inteligente o bastante para gerar aprendizado.

### Campos mínimos recomendados

1. Nome ou apelido;
2. WhatsApp;
3. E-mail;
4. Cidade/UF base;
5. Perfil;
6. Principal interesse;
7. Consentimento WhatsApp.

### Perfil

Opções:

- autônomo;
- motorista empregado;
- agregado;
- dono de 1 caminhão;
- dono de pequena frota;
- outro.

### Principal interesse

Opções:

- lucro da viagem;
- controle de despesas;
- fretes e recebimentos;
- manutenção;
- histórico de viagens;
- PX Digital;
- tudo isso;
- outro.

### Campo opcional de dor

Pergunta:

> Hoje, qual é a maior dificuldade para controlar suas viagens?

Esse campo pode ser opcional para não travar conversão.

### Consentimento

Texto sugerido:

> Aceito receber mensagens sobre o acesso antecipado e lançamento do Space Truck pelo WhatsApp/e-mail.

Esse consentimento precisa ser registrado se houver contato via WhatsApp.

## Tela de sucesso após inscrição

### Objetivo

Confirmar o cadastro sem parecer erro ou fim seco.

### Título

> Você entrou na lista de acesso antecipado. 🚛

### Texto

> Agora é só aguardar a liberação. Estamos preparando o Space Truck para funcionar bem na rotina real da estrada.

### Texto complementar

> Quando seu acesso for aprovado, você será avisado pelo canal informado.

### CTA

- `Entrar na minha conta`;
- `Atualizar meus dados`;
- `Voltar para início`.

## Tela de espera `/aguardando`

### Objetivo

Atender usuário autenticado, mas ainda não aprovado.

### Estrutura

- status visual claro;
- mensagem principal;
- dados cadastrados;
- opção de atualizar WhatsApp/e-mail;
- explicação do processo;
- Bino como apoio;
- logout discreto;
- link para privacidade/termos.

### Copy principal

Título:

> Seu acesso está na fila de liberação.

Texto:

> Você já está na lista do Space Truck. Estamos liberando aos poucos para garantir qualidade, segurança e uma experiência boa para quem usa na estrada.

Mensagem com Bino:

> Enquanto isso, o Bino fica de olho no seu cadastro. Assim que seu acesso for aprovado, você será avisado.

### Estados da tela

#### `waitlisted`

Mostrar:

- aguardando aprovação;
- dados principais;
- CTA para atualizar contato.

#### `suspended`

Mostrar:

- acesso temporariamente suspenso;
- orientação genérica para suporte;
- sem detalhes sensíveis.

#### `blocked`

Mostrar:

- acesso indisponível;
- mensagem genérica;
- canal de contato.

#### erro de perfil

Mostrar:

- “Não conseguimos carregar seu status agora.”
- tentar novamente;
- logout;
- suporte.

## Onboarding pós-login

### Objetivo

Completar perfil mínimo antes de colocar o usuário no app completo ou na espera.

### Etapas recomendadas

Etapa 1 — Identidade

Campos:

- nome/apelido;
- username, se a feature já existir;
- foto/avatar opcional futuramente.

Etapa 2 — Contato

Campos:

- telefone/WhatsApp;
- consentimento WhatsApp;
- e-mail já vindo do auth quando existir.

Etapa 3 — Perfil de estrada

Campos:

- tipo de motorista;
- cidade/UF base;
- tipo de caminhão/carroceria, se fizer sentido;
- principal interesse no Space Truck.

Etapa 4 — Confirmação

Mostrar:

- resumo;
- aviso de lista de espera;
- CTA para concluir.

### Se entrou com Google

Após Google, o app pode oferecer criar senha do Space Truck, mas não deve bloquear conversão imediatamente.

Texto sugerido:

> Você entrou com Google. Depois, se quiser, pode criar uma senha do Space Truck para entrar também por e-mail, telefone ou usuário.

## Login e cadastro

### Princípio

Login não deve parecer só uma barreira. Ele deve explicar por que a conta existe.

### Copy no login

Título:

> Entre no Space Truck

Subtexto:

> Acesse suas viagens, custos, fretes e leituras da operação.

CTA Google:

> Entrar com Google

CTA e-mail:

> Entrar com e-mail

Link:

> Ainda não tem conta? Entrar na lista de acesso antecipado

### Copy no cadastro

Título:

> Crie sua conta e entre na lista

Subtexto:

> Seu cadastro ajuda a liberar o acesso aos poucos e melhorar o Space Truck com caminhoneiros reais.

## Painel admin inicial

### Objetivo

Dar ao Daniel controle do beta sem mexer manualmente no banco.

### Rotas futuras

- `/admin`;
- `/admin/users`;
- `/admin/beta-applications`;
- `/admin/audit-logs`.

### Dashboard admin

Métricas principais:

- total na lista;
- aguardando aprovação;
- aprovados;
- suspensos/bloqueados;
- novos cadastros dos últimos 7 dias;
- principais interesses dos inscritos.

### Lista de usuários

Colunas:

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

### Detalhe de usuário

Blocos:

- dados principais;
- status de acesso;
- respostas de captação;
- histórico de ações;
- tickets de suporte, se existir;
- ações administrativas.

### Regras UX de segurança

Ações perigosas precisam de confirmação:

- bloquear;
- suspender;
- alterar role;
- reativar;
- marcar telefone como verificado.

O botão de aprovação pode ser mais rápido, mas ainda deve mostrar feedback claro.

### Copy de confirmação

Aprovar usuário:

> Liberar acesso para este usuário?

Suspender usuário:

> Suspender acesso temporariamente?

Bloquear usuário:

> Bloquear acesso? Esta ação impede o usuário de entrar no app completo.

Alterar role:

> Alterar permissões deste usuário? Use apenas quando tiver certeza.

## Admin audit log — UX

O audit log deve ser simples e consultável.

Campos visuais:

- data/hora;
- ação;
- admin responsável;
- usuário afetado;
- status anterior;
- novo status;
- motivo.

Não mostrar segredo, token, OTP ou dado sensível bruto.

## Design visual

### Direção estética

- dark mode premium;
- fundo escuro com profundidade;
- contraste bom;
- amarelo/dourado como acento de ação;
- tons ligados à estrada, noite, painel e tecnologia;
- cards escuros com bordas suaves;
- botões grandes e fáceis de tocar;
- linguagem mobile-first.

### Sensação desejada

A landing deve parecer:

- confiável;
- moderna;
- robusta;
- feita por quem entende caminhoneiro;
- mais ferramenta de trabalho do que propaganda.

### Evitar

- excesso de gradiente;
- neon exagerado;
- imagens genéricas de caminhão sem propósito;
- mockup impossível de ler;
- texto pequeno demais;
- contraste ruim;
- CTAs escondidos.

## Assets necessários

### Essenciais para primeira versão

- logo Space Truck em boa qualidade;
- versão horizontal e compacta do logo;
- Bino oficial em pose neutra/amigável;
- mockup de celular com tela do app;
- ícones simples para lucro, despesa, viagem, manutenção e histórico;
- background abstrato/estrada escura;
- favicon/app icon, se ainda não estiver pronto.

### Assets futuros

- Bino explicando algo importante;
- Bino em alerta;
- Bino apontando para telefone/app;
- mockups de telas reais do app;
- vídeo curto de lançamento;
- imagens para Instagram/reels;
- versão Open Graph para compartilhamento.

## Uso de dados em mockups

Pode usar dados demonstrativos, mas não fingir que são dados reais.

Preferir números críveis:

```text
Frete: R$ 6.500,00
Diesel: R$ 2.940,00
Pedágio: R$ 420,00
Outras despesas: R$ 860,00
Saldo estimado: R$ 1.280,00
```

Evitar:

- faturamento absurdo;
- “milhares de caminhoneiros” sem prova;
- depoimentos inventados;
- avaliações falsas.

## FAQ público

Perguntas recomendadas:

### O Space Truck já está disponível?

> Estamos preparando o acesso antecipado. Alguns usuários serão liberados aos poucos para testar o app na rotina real da estrada.

### Preciso pagar para entrar na lista?

> Não. Entrar na lista de acesso antecipado não tem custo.

### O app é para autônomo ou empresa?

> A primeira versão é pensada principalmente para caminhoneiros autônomos, motoristas que controlam seus gastos e pequenos donos de caminhão.

### Vou receber mensagem no WhatsApp?

> Somente se você autorizar. Usaremos o contato para avisar sobre acesso antecipado e lançamento.

### O app calcula lucro automaticamente?

> A ideia é registrar frete e despesas para mostrar leituras como saldo, custo e resultado da viagem.

## Mensagens automáticas futuras

Esta parte não precisa ser implementada agora, mas deve guiar o texto futuro.

### Boas-vindas à lista

> Bem-vindo à lista de acesso antecipado do Space Truck 🚛
>
> Você entrou no grupo dos primeiros caminhoneiros que vão acompanhar a chegada do app. Estamos criando o Space Truck para ajudar na leitura da viagem: frete, custos, despesas, manutenção e quanto sobra de verdade no fim do trecho.
>
> Quando seu acesso for liberado, avisaremos por aqui.

### Aprovação de acesso

> Seu acesso ao Space Truck foi liberado 🚛
>
> Agora você já pode entrar no app e começar a testar as ferramentas de controle de viagem, frete, despesas e lucro.

### Lembrete de cadastro incompleto

> Falta pouco para entrar na lista do Space Truck.
>
> Complete seus dados para que possamos liberar seu acesso quando chegar sua vez.

## Critérios de qualidade antes de implementar visual

Antes de aprovar a landing visual, conferir:

- a promessa aparece acima da dobra;
- CTA principal é claro;
- formulário é curto;
- visual funciona no celular;
- contraste é bom;
- não há texto genérico demais;
- não há promessa falsa;
- Bino não foi redesenhado;
- mockup tem dados legíveis;
- LGPD/consentimento está visível;
- performance não foi prejudicada;
- acessibilidade básica está preservada.

## Critérios de qualidade do admin

Antes de liberar admin inicial, conferir:

- admin comum não é acessível por usuário comum;
- lista de usuários tem filtros úteis;
- ações perigosas pedem confirmação;
- toda ação sensível gera audit log;
- não aparece token/OTP/segredo em tela;
- funciona no tablet/celular;
- Daniel consegue aprovar usuário sem mexer no banco.

## Plano de implementação recomendado

### PR A — Blueprint de produto/UI/UX

Criar este documento.

Sem código runtime.

### PR B — Access model e migrations

Seguir arquitetura/hardening:

- adicionar campos em `profiles`;
- decidir Enums vs CHECK;
- backfill seguro;
- admin aprovado;
- tipos canônicos.

### PR C — domínio `src/features/access`

Criar hooks, types e services de acesso.

Não inflar `AppContext`.

### PR D — tela de espera

Criar `/aguardando` e estados visuais.

### PR E — landing pública inicial em rota segura

Criar landing inicial sem mover `/` ainda, se for mais seguro.

Possível rota inicial:

- `/inicio`; ou
- `/acesso-antecipado`.

Depois validar migração de `/`.

### PR F — formulário de acesso antecipado

Criar fluxo de captação/account-first ou beta application.

### PR G — onboarding pós-login

Coletar perfil mínimo.

### PR H — admin shell

Criar `/admin` visual, protegido.

### PR I — admin users/actions

Aprovar, suspender, bloquear com audit logs.

### PR J — testes e rota final

Ajustar Playwright, smoke, UI health e migração gradual para `/app/*`.

## Decisões que ainda precisam do Daniel

Antes de codar a landing:

1. A primeira landing será em `/inicio`, `/acesso-antecipado` ou já em `/`?
2. O cadastro beta deve exigir conta imediatamente ou aceitar lead sem conta?
3. Qual será o texto principal final do hero?
4. Bino entra na primeira versão ou depois?
5. O formulário terá campo de dor aberta ou só opções?
6. Admin inicial precisa aprovar manualmente todo mundo ou alguns usuários entram direto como teste interno?
7. A tela de espera deve permitir atualizar contato já na primeira versão?

## Recomendação objetiva

A melhor sequência é:

1. implementar modelo de acesso e backfill seguro;
2. criar domínio de acesso no frontend;
3. criar tela de espera;
4. criar landing em rota segura;
5. conectar formulário/cadastro;
6. criar admin inicial;
7. só depois migrar `/` para landing e app para `/app/*`.

Isso reduz risco de quebrar o app atual e evita trancar o Daniel fora da própria boleia.

## Regra final

O beta não é só marketing.

Ele é o primeiro radar real do Space Truck.

Cada tela precisa captar usuários, explicar o produto e proteger o app interno, sem perder a identidade principal: ajudar o caminhoneiro a entender a viagem, cuidar da operação e decidir melhor.
