# Validação de secrets e YAML

Este documento explica a camada de validação adicionada para secrets e arquivos YAML no Space Truck.

## Objetivo

Adicionar uma proteção versionada no repositório para:

- detectar vazamento acidental de secrets;
- validar arquivos YAML fora dos workflows;
- complementar GitGuardian, Semgrep, Snyk, Socket, CodeQL e os demais revisores;
- reduzir risco de configuração quebrada entrando na `main`.

## Gitleaks

O Gitleaks roda pelo workflow:

`.github/workflows/gitleaks.yml`

Ele usa:

`.gitleaks.toml`

Função principal:

- procurar tokens, chaves, senhas, credenciais e padrões sensíveis;
- rodar em PRs, push na `main` e agendamento semanal;
- manter a Action pinada por SHA, seguindo a política de supply chain do projeto.

Arquivos gerados e artefatos são ignorados para reduzir ruído, como `dist`, `coverage`, `storybook-static`, `node_modules` e tipos gerados do Supabase.

## yamllint

O yamllint roda pelo workflow:

`.github/workflows/yamllint.yml`

Ele usa:

`.yamllint.yml`

Função principal:

- validar arquivos `.yml` e `.yaml`;
- complementar `actionlint`, que é específico para GitHub Actions;
- evitar configuração YAML quebrada, mal indentada ou inconsistente.

## Relação com os required checks

Como a branch `main` usa checks obrigatórios, o workflow de yamllint roda em toda PR. Em push na `main`, ele roda apenas quando arquivos YAML mudam.

O workflow do Gitleaks roda em toda PR porque vazamento de secret pode acontecer em qualquer tipo de arquivo.

## Próximos passos

- Observar a primeira execução do Gitleaks para verificar falso positivo.
- Ajustar allowlists apenas quando houver falso positivo real e justificado.
- Avaliar StepSecurity Harden-Runner em PR futura.
