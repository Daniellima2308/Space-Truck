# Política de review do Qodo

Este documento explica como o Space Truck usa o Qodo Merge / PR-Agent.

## Objetivo

O Qodo deve atuar como revisor de apoio, com foco em achados realmente úteis para o produto e para a segurança do app.

Ele não deve competir com todos os outros bots nem transformar comentários genéricos em bloqueio.

## Configuração versionada

A configuração local fica em:

`.pr_agent.toml`

Ela define:

- resposta em português do Brasil;
- revisão de testes;
- revisão de segurança;
- labels de segurança e esforço;
- limite de achados em 8 itens para reduzir ruído sem esconder problemas importantes;
- instruções extras alinhadas ao `AGENTS.md` e ao Space Truck;
- arquivos gerados e artefatos ignorados.

## Foco esperado nos reviews

O Qodo deve priorizar:

- bugs reais;
- segurança e permissões;
- Supabase, Auth, secrets e dados sensíveis;
- regras de viagem, frete, custos, lucro e manutenção;
- separação entre dados brutos, leitura derivada e UI;
- performance, offline-first e sincronização;
- UX de caminhoneiro, com leitura rápida, dark mode e botões acessíveis;
- testes quando a mudança mexer em lógica ou fluxo crítico.

## O que não queremos

Evitar:

- comentários cosméticos sem impacto;
- duplicação de comentários já feitos por outros bots;
- exagerar risco em PRs só de documentação ou configuração;
- bloquear merge por melhoria opcional.

## Arquivos ignorados

O Qodo ignora artefatos gerados e arquivos de baixo valor para revisão semântica, como `dist`, `coverage`, `storybook-static`, `node_modules`, tipos gerados do Supabase e `package-lock.json`.

O `package-lock.json` fica fora do Qodo para economizar cota e evitar ruído. Atualizações de dependências continuam cobertas por Dependabot, Renovate, Snyk, Socket, Semgrep, CodeQL/Code Scanning quando aplicável e revisão humana das PRs de dependência.

Se uma PR de dependência apresentar comportamento suspeito, a análise deve focar no manifesto, changelog, checks de segurança e impacto real no app, não em comentar linha por linha do lockfile.

## Observação sobre cota gratuita

O Qodo pode ter limite mensal no plano gratuito. A configuração busca reduzir ruído e orientar o bot para gastar revisão com pontos importantes.

Se a cota acabar, o fluxo deve continuar com os outros revisores e checks obrigatórios.
