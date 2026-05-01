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
- limite de achados para reduzir ruído;
- instruções extras alinhadas ao Space Truck;
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

## Observação sobre cota gratuita

O Qodo pode ter limite mensal no plano gratuito. A configuração busca reduzir ruído e orientar o bot para gastar revisão com pontos importantes.

Se a cota acabar, o fluxo deve continuar com os outros revisores e checks obrigatórios.
