# Automação de PRs e releases

Este documento descreve a automação adicionada para organizar pull requests, labels e rascunhos de release do Space Truck.

## Objetivo

A automação deste lote não muda nenhuma funcionalidade do app. Ela melhora a leitura do projeto e ajuda o fluxo de revisão:

- validar títulos de PR em formato semântico;
- aplicar labels por arquivos alterados;
- manter um rascunho de release com o histórico das PRs mergeadas;
- reaproveitar o vocabulário de labels já definido em `reviewpad.yml`;
- evitar automações destrutivas, auto-merge ou publicação automática de release.

## Ferramentas configuradas

### Semantic Pull Request

Workflow: `.github/workflows/semantic-pr.yml`

Valida que o título da PR siga o padrão de Conventional Commits:

- `feat: add support ticket history`
- `fix: prevent stale ticket responses`
- `ci: add secrets and YAML validation`
- `docs: add engineering tooling inventory`

Tipos aceitos:

- `build`
- `chore`
- `ci`
- `docs`
- `feat`
- `fix`
- `perf`
- `refactor`
- `revert`
- `test`

Escopo não é obrigatório. Isso mantém o padrão simples para trabalhar pelo celular e evita fricção desnecessária.

### GitHub Labeler

Workflow: `.github/workflows/labeler.yml`

Configuração: `.github/labeler.yml`

O Labeler aplica labels com base nos arquivos alterados. Ele complementa o Reviewpad, mas não substitui o `reviewpad.yml`.

O Reviewpad continua sendo a camada principal para:

- tipo baseado em título;
- tamanho da PR;
- risco por superfície sensível;
- orientação de revisão.

O Labeler entra como reforço simples por caminhos de arquivo, usando os mesmos nomes de labels para evitar vocabulário duplicado.

### Release Drafter

Workflow: `.github/workflows/release-drafter.yml`

Configuração: `.github/release-drafter.yml`

O Release Drafter mantém um rascunho de release atualizado quando PRs são mergeadas na `main`.

Ele não publica release automaticamente. A publicação continua manual, depois de revisão humana.

As categorias usam labels existentes do projeto:

- funcionalidades;
- correções;
- interface e experiência;
- testes e qualidade;
- segurança e banco;
- CI, automação e configuração;
- documentação;
- outros ajustes.

## Decisões de segurança

Os workflows usam permissões mínimas para a função que exercem:

- Semantic PR lê metadados da PR;
- Labeler lê PRs e escreve labels em issues/PRs;
- Release Drafter escreve rascunhos de release.

As Actions externas foram pinadas por SHA e mantêm comentário com a versão de origem.

## O que não foi ativado

Esta etapa não ativa:

- auto-merge;
- publicação automática de release;
- versionamento automático de tags;
- criação automática de changelog versionado no repositório.

Esses pontos podem ser avaliados depois, quando o ciclo de releases do Space Truck estiver mais definido.
