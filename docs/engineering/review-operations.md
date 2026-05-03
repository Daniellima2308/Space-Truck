# Operação de revisão do Space Truck

Este documento define como a esteira de revisão deve ser usada no Space Truck.

A ideia não é ter várias ferramentas instaladas apenas para gerar status verde. Cada ferramenta precisa cumprir uma função clara, ajudar a encontrar problemas reais e reduzir risco sem transformar cada pull request em barulho.

## Objetivo

Quando uma PR for aberta, a revisão deve avaliar três coisas ao mesmo tempo:

1. se a mudança resolve o problema certo;
2. se o código, a arquitetura e a UX respeitam os princípios do Space Truck;
3. se as ferramentas de automação trabalharam corretamente.

O padrão esperado é: ferramenta útil, sinal claro, ruído controlado e decisão registrada.

## Camadas atuais

### CI

Função: validar a saúde geral do projeto.

O CI continua sendo a revisão pesada de build, lint, testes e cobertura. Quando ele falhar, a falha deve ser investigada antes de qualquer merge.

Modo atual: bloqueante quando configurado como check obrigatório.

### Danger JS

Função: conferir higiene e contexto da PR.

O Danger deve apontar PR grande demais, descrição incompleta, mudança sensível sem explicação ou validação ausente.

Modo atual: warning-only.

Uso esperado: orientar e melhorar contexto, sem travar merge sozinho.

### Reviewdog ESLint

Função: comentar achados de ESLint diretamente no diff.

Ele deve ajudar o revisor a encontrar problemas de código nas linhas alteradas, sem obrigar a abrir logs grandes.

Modo atual: não bloqueante.

Uso esperado: comentário útil em linha adicionada. Ruído ou comentário duplicado deve ser calibrado.

### Playwright smoke

Função: garantir que o app builda, sobe no preview local e carrega a tela inicial.

Ele não valida fluxo completo. O papel dele é detectar tela branca, crash inicial, erro básico de renderização ou quebra da entrada do app.

Modo atual: smoke test automatizado em PR com `@playwright/test` oficial em `devDependencies`.

### UI health

Função: detectar violações críticas de acessibilidade na tela inicial.

Modo atual: bloqueia apenas impacto `critical`, com `@playwright/test` e `@axe-core/playwright` oficiais em `devDependencies`.

Uso esperado: pegar problemas graves sem gerar uma enxurrada de avisos. A evolução para `serious`, mais rotas, foco visível e navegação por teclado deve acontecer em PRs futuras e com cuidado.

### Lighthouse

Função: observar qualidade web, performance, práticas recomendadas e acessibilidade em nível de página.

Modo atual: check automatizado de qualidade web em PR.

Uso esperado: tratar regressões relevantes. Nem todo aviso deve virar bloqueio imediato; alguns precisam virar tarefa técnica planejada.

### Chromatic / Storybook / UI Tests

Função: proteger componentes e regressões visuais.

Modo atual: publicação e validação visual automatizadas em PR.

Uso esperado: conferir mudanças visuais, Storybook e diferenças de UI antes de mergear alteração de interface.

### Segurança

Inclui Snyk, CodeQL, GitGuardian, Gitleaks, Semgrep, OpenSSF Scorecard, Harden-Runner, zizmor e actionlint, conforme estiverem configurados.

Função: reduzir risco de vulnerabilidade, segredo vazado, workflow perigoso e dependência problemática.

Modo atual: combinação de checks automatizados, auditorias de workflow e revisões de segurança conforme disponibilidade de cada ferramenta.

Uso esperado: falha de segurança deve ser investigada com prioridade. Falso positivo deve ser justificado.

### Revisores IA e análise de PR

Inclui CodeRabbit, Kody, Codacy, Gemini Code Assist, Octopus, Sourcery, LlamaPReview (Llama PR Review), Codex, Qodo e outros revisores habilitados.

Função: ampliar a visão sobre código, testes, arquitetura, segurança, documentação e possíveis regressões.

Modo atual: múltiplos revisores habilitados, com leitura humana obrigatória antes de aceitar qualquer sugestão.

Uso esperado: os comentários devem ser lidos e classificados como:

- problema real;
- melhoria válida, mas fora do escopo;
- falso positivo;
- decisão consciente;
- ruído recorrente que precisa de ajuste de configuração.

Ter muitos revisores não significa aceitar todas as sugestões nem tratar todos com o mesmo peso. A revisão final deve priorizar sinal útil, reduzir duplicidade e ajustar ferramentas que gerarem ruído recorrente.

## Ritual para revisar uma PR

Quando alguém pedir "revise e analise a PR", o processo deve ser:

1. entender o objetivo da PR;
2. abrir os arquivos alterados;
3. conferir todos os workflows e status externos;
4. abrir comentários gerais dos bots;
5. abrir threads inline;
6. abrir logs de checks que falharam;
7. classificar cada apontamento;
8. corrigir o que for válido e proporcional ao escopo;
9. justificar falso positivo ou decisão consciente;
10. resolver threads atendidas ou justificadas;
11. conferir se a PR está pronta para integração (mergeability) final;
12. liberar como pronta somente quando tudo estiver revisado.

## Critério para corrigir ou não corrigir

Corrigir na mesma PR quando:

- o problema é real;
- a correção é pequena;
- a correção está dentro do objetivo da PR;
- a mudança reduz risco sem abrir novo escopo grande.

Registrar como decisão consciente quando:

- a sugestão é válida, mas pertence a uma evolução futura;
- a mudança aumentaria demais o escopo;
- a ferramenta está certa no conceito, mas o momento não é adequado.

Marcar como falso positivo quando:

- o check passou e o comentário não reflete o código atual;
- a ferramenta não considera uma configuração existente;
- o comentário foi baseado em estado antigo da PR;
- a sugestão contradiz uma decisão já documentada.

## Sinais de ferramenta mal calibrada

Uma ferramenta precisa de ajuste quando:

- comenta sempre a mesma coisa sem utilidade;
- duplica exatamente outro bot;
- falha sem problema real;
- exige mudança fora do escopo repetidamente;
- gera bloqueio sem explicar caminho de correção;
- fica silenciosa em PRs onde deveria aparecer.

Nesses casos, o ajuste deve ser feito em PR própria sempre que possível.

## Evolução planejada

Próximos passos possíveis para melhorar a utilidade da esteira:

- revisar periodicamente versões de Playwright e axe para manter compatibilidade;
- evoluir scripts E2E e acessibilidade conforme ampliação de cobertura;
- expandir UI health para violações `serious` quando o ruído estiver controlado;
- adicionar testes de teclado e foco visível;
- expandir Playwright para fluxos reais do app;
- revisar ferramentas que só aparecem como status, mas não entregam comentário útil;
- reduzir duplicidade entre revisores IA quando houver ruído.

## Regra principal

A esteira deve trabalhar a favor do produto.

Se uma ferramenta ajuda a manter o Space Truck mais confiável, seguro e fácil de evoluir, ela fica. Se atrapalha, grita demais ou não entrega valor, ela deve ser calibrada ou removida.
