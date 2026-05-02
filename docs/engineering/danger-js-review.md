# Danger JS warning review

Esta automação adiciona uma camada leve de revisão automática em pull requests do Space Truck.

## Objetivo

O Danger JS atua como um conferente de carga antes da PR seguir viagem. Ele não substitui CI, revisores IA, Reviewpad, CodeRabbit, Qodo, Kody, Codacy, Octopus ou revisão humana.

O papel dele é apontar esquecimentos comuns no corpo da PR:

- PR muito grande;
- mudança em GitHub Actions sem explicar permissões ou Actions pinadas;
- mudança em Supabase/Auth sem explicar risco, RLS, migração ou segurança;
- mudança visual sem mencionar preview, print, Storybook, Chromatic, dark mode ou UX;
- mudança em código sem validação descrita;
- alteração em `package.json` sem `package-lock.json`, ou o contrário;
- PR sem seções importantes do template.

## Modo atual

O Danger está em modo **warning-only**.

Isso significa que ele deve orientar, mas não bloquear merge. Se um aviso não fizer sentido, a decisão correta é explicar o motivo na PR.

## Arquivos

- Workflow: `.github/workflows/danger.yml`
- Regras: `.github/dangerfile.cjs`

## Segurança

O workflow roda em `pull_request`, não em `pull_request_target`, para reduzir risco ao lidar com código de PR.

Permissões configuradas:

- `contents: read`
- `pull-requests: write`

A permissão de escrita em PR é necessária para comentar o resultado da revisão.

## Decisões de escopo

Esta primeira versão não usa `fail()` e não deve travar merge.

Se no futuro os avisos ficarem confiáveis e úteis, algumas regras podem virar bloqueios. Isso deve ser feito com cuidado, em PR separada, para não transformar a esteira em burocracia pesada.
