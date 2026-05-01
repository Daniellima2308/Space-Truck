# Inventário de ferramentas de engenharia

Este documento é o mapa oficial das ferramentas, conectores, GitHub Apps, Actions e revisores usados no Space Truck.

O objetivo não é instalar ferramentas por volume. O objetivo é transformar cada ferramenta em uma peça útil da esteira: clara, configurada, previsível e com função definida.

## Regras de uso

- Toda ferramenta precisa ter uma função clara: revisar código, explicar PR, proteger segredo, testar, medir cobertura, organizar release, rotular PR ou reduzir risco.
- Ferramentas que comentam em PR devem ser monitoradas quanto a ruído, duplicação e limites do plano gratuito.
- Ferramentas que exigem chave de IA devem usar secret isolado no GitHub e limite de gasto no provedor.
- Nenhuma chave de IA deve ser colocada em código, markdown, YAML público ou comentário de PR.
- GitHub Apps devem ficar limitados ao repositório `Daniellima2308/Space-Truck` sempre que possível.
- Workflows devem usar permissões mínimas, `concurrency`, timeout e `persist-credentials: false` no checkout quando não houver operação git autenticada depois.
- Mudanças de ferramenta devem acontecer em PRs pequenas, com validação e registro neste arquivo.
- Uma ferramenta listada como ativa ou instalada não vira automaticamente bloqueadora. A decisão de bloquear merge depende de sinal consistente, baixo falso positivo, custo entendido e utilidade real para o projeto.

## Diferença entre App instalado, App autorizado e workflow

| Tipo | O que significa | Exemplo | Risco |
| --- | --- | --- | --- |
| GitHub App instalado | O app recebeu acesso ao repositório e pode criar checks, comentários ou PRs. | CodeRabbit, Kody, Renovate, Codecov | Pode comentar demais ou ter permissões amplas. |
| App GitHub autorizado | O usuário fez login via GitHub em um painel externo. | Graphite, Bito, DeepWiki, ferramentas de painel | Pode não estar conectado ao repositório correto. |
| GitHub Action | Roda por YAML dentro de `.github/workflows`. | actionlint, zizmor, Gitleaks, Labeler | Pode quebrar CI ou duplicar validação se mal configurado. |
| Config versionada | Arquivo de regras no repositório. | `reviewpad.yml`, `codecov.yml`, `.bito.yaml` | Pode ficar desatualizada se o painel externo também tiver regras. |
| Self-hosted | Ferramenta operada por nós com tokens e infraestrutura. | PR-Agent self-hosted, ShipItAI self-hosted | Exige custo, segurança, manutenção e observabilidade. |

## Estado atual confirmado no repositório

| Área | Situação |
| --- | --- |
| Guia principal para agentes | `AGENTS.md` existe e é a fonte principal de instruções para agentes de IA. |
| Guia do Gemini | `GEMINI.md` existe como ponte e manda seguir `AGENTS.md`. |
| Reviewpad | `reviewpad.yml` já existe na raiz e está configurado para labels de tipo, área, risco e tamanho. |
| Dependabot | `.github/dependabot.yml` configurado para npm e GitHub Actions. |
| CI principal | `ci.yml` roda lint, build, cobertura e upload para Codecov. |
| Codecov | `codecov.yml` configurado com patch threshold de 1%. |
| CodeQL | Usando default setup do GitHub. Não há workflow avançado versionado para evitar conflito. |
| actionlint | Workflow configurado com Reviewdog. |
| zizmor | Workflow configurado em modo consultivo. |
| Scorecard | Workflow configurado com SARIF e OIDC. |
| Lighthouse, Chromatic, Sonar, Supabase migrations | Workflows existentes endurecidos na PR #132. |

## Diagnóstico sobre Codex review

Até esta auditoria (2026-05-01), não foi encontrado arquivo YAML ou configuração versionada de Codex review no repositório.

Busca manual realizada em 2026-05-01, com escopo voltado a workflows e configurações versionadas do repositório, não encontrou integração versionada de Codex review. As referências encontradas para `codex`, antes da criação deste inventário, estavam em documentação e artefatos locais ignorados, não em workflow ou comando versionado de revisão.

Conclusão operacional:

- O comportamento atual do Codex review parece depender do GitHub App/conector da OpenAI e/ou da interface do próprio GitHub/ChatGPT, não de um YAML do repositório.
- O comando `@codex review` não deve ser tratado como confiável até existir documentação oficial ou evidência de que esse comando é suportado pelo app instalado.
- Se o Codex demora ou revisa apenas algumas PRs, isso provavelmente está ligado a fila, elegibilidade do app, permissões, plano, limitação de produto ou gatilhos internos, não a uma configuração ausente no repo.
- Próxima ação recomendada: acompanhar uma PR nova depois deste inventário e registrar se o Codex comenta automaticamente, em qual momento, e se existe algum botão/manual trigger no painel do app.

## Inventário mestre

### Revisores IA

| Ferramenta | Status | Como roda | Config no repo | Próxima ação | Observação |
| --- | --- | --- | --- | --- | --- |
| Gemini Code Assist | Ativo | GitHub App / review em PR | `GEMINI.md` como ponte | Manter `GEMINI.md` alinhado ao `AGENTS.md` | Já integrado ao fluxo. |
| Codex / OpenAI | Ativo, mas comportamento irregular | GitHub App/conector | Nenhum YAML encontrado | Monitorar próxima PR e documentar gatilhos reais | `@codex review` ainda não é confiável no fluxo atual. |
| CodeRabbit | Ativo | GitHub App | Sem config versionada nesta auditoria | Avaliar arquivo de instruções/config se o app suportar | Já comenta e cria status. |
| Kody | Ativo | GitHub App | Config parece estar no painel | Revisar painel da Kodus/Kody e verificar se há repo-level config | Na PR #132 apareceu com bug, performance, security e business logic ativos. |
| Qodo | Ativo com cota gratuita | GitHub App | Possível `.pr_agent.toml` se usar PR-Agent/Qodo Merge | Criar config para gastar melhor a cota e padronizar foco | Na PR #132 parou por limite mensal gratuito. |
| Sourcery | Ativo | GitHub App | Config principalmente no painel | Revisar idioma, severidade e comentários automáticos | Já gerou guia de revisão. |
| Codacy | Ativo | GitHub App / checks | Config no painel e possivelmente arquivo próprio | Revisar regras, severidade e duplicação com ESLint/Sonar | Evitar excesso de ruído. |
| LlamaPReview | Ativo | GitHub App | Não identificado | Monitorar nas próximas PRs | Útil como revisor adicional. |
| diffray | Ativo | GitHub App | Não identificado | Monitorar comentários e falsos positivos | Atua como reviewer multiagente. |
| Korbit | Instalado | GitHub App | Config no painel | Validar primeira PR e ajustar escopo | Reviewer IA adicional. |
| Code Review AI | Instalado | GitHub App | Config no painel | Validar limite grátis e qualidade dos comentários | Pode ter limite mensal baixo. |
| DeepSource | Instalado | GitHub App / painel | Possível `.deepsource.toml` | Criar ou confirmar config versionada | Precisa evitar duplicar regras com Sonar/Codacy. |
| Bito | Instalado | GitHub App / painel | Recomendada `.bito.yaml` | Criar config repo-level | Bom para resumo e review contextual. |
| Greptile | Instalado/autorizado | GitHub App / painel | Não identificado | Validar se indexou o repo e se comenta PR | Pode ajudar com entendimento contextual. |
| Octopus Review | Instalado/autorizado | GitHub App / painel | Não identificado | Validar comportamento em PR real | Ferramenta nova; observar ruído. |
| Komment AI | Instalado/autorizado | GitHub App / painel | Não identificado | Validar se é útil ou redundante | Ainda sem uso confirmado. |
| HackerOne Code | Instalado/autorizado | GitHub App / painel | Não identificado | Avaliar foco de segurança | Pode sobrepor Semgrep/Snyk/GitGuardian. |
| Presubmit | Pendente de workflow | GitHub Action/self-hosted leve | Precisa workflow e secret `LLM_API_KEY` | Planejar custo e criar PR própria | Não é Marketplace simples. |
| Gito | Pendente de workflow | GitHub Action/local | Precisa workflow e secret `LLM_API_KEY` | Planejar provider e custo | Não apareceu como App comum. |
| PR-Agent self-hosted | Pendente avançado | Action/App self-hosted | `.pr_agent.toml` recomendado | Fazer só após política de API key | Envolve token/custo/manutenção. |
| ShipItAI | Pendente avançado | Hosted ou self-hosted | A confirmar | Avaliar depois dos configs básicos | Pode exigir infra. |
| Git AutoReview | Opcional local | Extensão VS Code | Não se aplica | Usar como revisão manual, não PR bot | Não substitui reviewer automático. |
| CodeMouse | Pendente por custo/chave | GitHub App/BYOK | A confirmar | Avaliar custo antes de instalar | Se pedir API key, tratar como custo extra fora do ChatGPT Plus. |
| Rope | Pendente | GitHub App | Possível `rope.yaml` | Avaliar instalação e limite grátis | Reviewer IA adicional. |
| ReviewScope | Pendente/instalável | GitHub App | A confirmar | Avaliar limite grátis/BYOK | Pode exigir chave dependendo do plano. |

### Entendimento de repo e PR

| Ferramenta | Status | Como roda | Config no repo | Próxima ação | Observação |
| --- | --- | --- | --- | --- | --- |
| DeepWiki | Instalado/autorizado | Indexação externa | Não precisa inicialmente | Confirmar se o Space Truck foi indexado | Ajuda a entender arquitetura. |
| Reviewable | Instalado | Painel externo GitHub | Não precisa | Validar uso nas próximas PRs | Bom para leitura profunda de review. |
| Graphite | Instalado/autorizado | App/painel/stacked PRs | Não precisa inicialmente | Confirmar repo e AI reviews | Pode ajudar com stack e entendimento. |
| What The Diff | Ativo | GitHub App | Não identificado | Monitorar resumos | Ajuda a resumir e entender o conteúdo de PRs. |
| DiffLens | Ativo | GitHub App/painel | Não identificado | Monitorar valor real | Foco em visualização/entendimento de diff. |
| Release Drafter | Pendente de workflow | GitHub Action | Precisa `.github/release-drafter.yml` e workflow | Configurar depois da proteção da main | Útil quando houver releases organizados. |
| Reviewpad | Ativo/configurado | GitHub App + `reviewpad.yml` | `reviewpad.yml` existe | Validar se o app está rodando em PR nova | Pode estar em transição; monitorar. |
| GitHub Labeler | Pendente | GitHub Action | Precisa config de labels | Avaliar se complementa ou duplica Reviewpad | Talvez Reviewpad já cubra boa parte. |
| Semantic Pull Request | Pendente | GitHub Action/App equivalente | Precisa workflow/config | Adicionar para padronizar títulos | Ajuda release/changelog. |
| PR Template | Ativo | Arquivo do repo | `.github/pull_request_template.md` existe | Melhorar conforme uso real | Já criado na PR #132. |
| Issue Forms | Pendente | Arquivos YAML em `.github/ISSUE_TEMPLATE` | Precisa criar forms | Criar quando o fluxo de issues estiver claro | Útil para bugs, feature e dívida técnica. |
| Danger JS | Pendente | GitHub Action | Precisa config e workflow | Planejar regras não duplicadas | Bom para comentários contextuais. |
| Reviewdog | Parcialmente ativo | GitHub Action | actionlint já usa Reviewdog | Expandir seletivamente | Não instalar todas as actions; usar só stack real. |

### Segurança

| Ferramenta | Status | Como roda | Config no repo | Próxima ação | Observação |
| --- | --- | --- | --- | --- | --- |
| Dependabot | Ativo | GitHub nativo | `.github/dependabot.yml` | Monitorar PRs semanais | Já cobre npm e GitHub Actions. |
| Renovate | Instalado | GitHub App | Precisa `renovate.json` | Configurar para não brigar com Dependabot | Usar com regras bem definidas. |
| CodeQL | Ativo | GitHub default setup | Sem workflow avançado | Manter default por enquanto | Evita conflito advanced/default. |
| GitGuardian | Instalado | GitHub App | Painel externo | Confirmar escopo e alertas | Secrets. |
| Gitleaks | Pendente | GitHub Action / Reviewdog | Precisa workflow | Configurar com cuidado para não duplicar GitGuardian | Útil como defesa versionada. |
| Socket | Instalado | GitHub App | Painel externo | Avaliar se precisa Action adicional | Dependências maliciosas. |
| Semgrep | Instalado | GitHub App/painel | Pode ter config | Revisar regras e idioma | SAST. |
| Snyk | Ativo nos checks | App/check externo | Painel externo | Monitorar ruído | Segurança de dependências. |
| OpenSSF Scorecard | Ativo | GitHub Action | `.github/workflows/scorecard.yml` | Observar resultados e score | Postura de segurança. |
| StepSecurity Harden-Runner | Pendente | GitHub Action | Precisa inserir nos workflows | Planejar PR dedicada | Requer cuidado em cada job. |
| zizmor | Ativo consultivo | GitHub Action | `.github/workflows/zizmor.yml` | Endurecer gradualmente | Já audita workflows. |
| actionlint | Ativo | GitHub Action + Reviewdog | `.github/workflows/actionlint.yml` | Manter | Valida YAML de Actions. |

### Testes, cobertura e qualidade visual

| Ferramenta | Status | Como roda | Config no repo | Próxima ação | Observação |
| --- | --- | --- | --- | --- | --- |
| Vitest | Ativo | npm script | `test`, `test:coverage` | Manter cobertura crescendo | Base de testes unitários. |
| Codecov | Ativo | GitHub Action + App | `codecov.yml` | Monitorar comentários e thresholds | Patch threshold em 1%. |
| Playwright | Pendente | npm + workflow | Precisa dependência, config e workflow | Adicionar quando houver fluxos críticos estáveis | E2E pode ser pesado. |
| SonarQube Cloud | Ativo | Workflow + painel | `sonar-project.properties` e `.github/workflows/sonar.yml` | Monitorar quality gate | Já roda em PR. |
| Lighthouse | Ativo | Workflow | `.github/workflows/lighthouse.yml` | Manter budgets coerentes | Performance/acessibilidade web. |
| Chromatic | Ativo | Workflow + App | `.github/workflows/chromatic.yml` | Manter stories reais | Visual regression. |
| axe/pa11y | Pendente | npm + workflow | Precisa config | Adicionar depois em PR própria | Acessibilidade automatizada. |

### Dependências e limpeza

| Ferramenta | Status | Como roda | Config no repo | Próxima ação | Observação |
| --- | --- | --- | --- | --- | --- |
| Dependabot version updates | Ativo | GitHub nativo | `.github/dependabot.yml` | Monitorar | Já configurado. |
| Renovate | Instalado, falta config | GitHub App | `renovate.json` recomendado | Definir divisão com Dependabot | Evitar PR duplicada. |
| Knip | Pendente | npm script/workflow | Precisa dependência/config | Adicionar após estabilizar dependências | Detecta exports/arquivos mortos. |
| Bundlewatch/size-limit | Pendente | npm + workflow | Precisa config | Escolher um, não os dois inicialmente | Controla tamanho do bundle. |
| dependency-cruiser/Madge | Pendente | npm + workflow | Precisa config | Começar com dependency-cruiser ou Madge, não ambos | Ajuda arquitetura e dependências circulares. |

### YAML, docs, CSS e lint

| Ferramenta | Status | Como roda | Config no repo | Próxima ação | Observação |
| --- | --- | --- | --- | --- | --- |
| actionlint | Ativo | Workflow | `.github/workflows/actionlint.yml` | Manter | GitHub Actions. |
| zizmor | Ativo | Workflow | `.github/workflows/zizmor.yml` | Endurecer depois | Segurança dos workflows. |
| yamllint | Pendente | GitHub Action | Precisa workflow/config | Adicionar para YAML fora de Actions | Complementa actionlint. |
| markdownlint-cli2 | Ativo via npm script | `npm run lint:md` | Script existe | Criar workflow dedicado se necessário | Já está no `lint:quality`. |
| stylelint | Ativo via npm script | `npm run lint:css` | Script existe | Avaliar config formal | Já está no `lint:quality`. |
| ESLint progressivo | Parcial | npm script | `npm run lint` | Evoluir regras em PRs pequenas | Não endurecer tudo de uma vez. |
| Reviewdog ESLint | Pendente | GitHub Action | Precisa workflow | Adicionar se comentários inline forem úteis | Pode duplicar CI; usar com cuidado. |

## Ordem recomendada de execução

### Lote 1 — inventário e proteção

1. ✅ Criar inventário inicial nesta PR.
2. Proteger a branch `main` com checks obrigatórios.
3. Criar PR dedicada para pinagem de GitHub Actions por commit SHA.

### Lote 2 — configurar apps já instalados

1. Bito: criar `.bito.yaml` com foco em PRs pequenas, segurança, UI/UX e lógica de domínio.
2. DeepSource: avaliar ou criar `.deepsource.toml`.
3. Renovate: criar `renovate.json` sem duplicar Dependabot.
4. Reviewpad: validar execução real e ajustar `reviewpad.yml` se necessário.
5. Qodo/PR-Agent: criar `.pr_agent.toml` se fizer sentido para controlar foco e custo.
6. Kody, Sourcery, Codacy, CodeRabbit: revisar painéis e instruções.

### Lote 3 — workflows de segurança e qualidade

1. Gitleaks.
2. StepSecurity Harden-Runner.
3. yamllint.
4. Release Drafter.
5. Labeler ou ajuste de Reviewpad para substituir Labeler.
6. Semantic PR.
7. Danger JS.

### Lote 4 — testes e arquitetura

1. Playwright para fluxos críticos.
2. axe/pa11y para acessibilidade.
3. Knip para código morto.
4. size-limit ou Bundlewatch.
5. dependency-cruiser ou Madge.

### Lote 5 — revisores com IA por BYOK/self-hosted

1. Definir política de API keys: provedor, limite de gasto, secret, rotação e escopo.
2. Só depois configurar Presubmit, Gito, PR-Agent self-hosted, ShipItAI self-hosted, ReviewScope BYOK, CodeMouse BYOK ou similares.

## Política para chaves de IA

ChatGPT Plus não deve ser tratado como saldo de API. Ferramentas que pedem OpenAI API key, Gemini API key, Anthropic API key ou outro provedor normalmente geram cobrança separada.

Antes de usar qualquer ferramenta BYOK:

- criar chave exclusiva para o Space Truck;
- guardar apenas em GitHub Secrets ou painel seguro da ferramenta;
- colocar limite de gasto no provedor quando disponível;
- nunca usar chave pessoal ampla em repositório público;
- documentar neste arquivo qual ferramenta usa qual secret, sem revelar valor;
- preferir ferramentas gratuitas sem BYOK enquanto a esteira ainda está sendo estabilizada.

## Critério para não transformar o repo em ruído

Uma ferramenta pode estar instalada e ainda assim ficar em observação. Ela só deve virar bloqueadora quando:

- seus alertas forem consistentes;
- o falso positivo estiver baixo;
- o custo/limite gratuito estiver entendido;
- houver dono claro para agir sobre os comentários;
- ela não duplicar outra ferramenta com resultado pior.

No Space Truck, qualidade alta não significa aceitar todo alerta automaticamente. Significa saber qual alerta importa para a segurança, estabilidade e experiência real do caminhoneiro.
