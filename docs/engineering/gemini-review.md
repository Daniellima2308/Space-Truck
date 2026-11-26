# Revisão automática com Gemini

O workflow **Gemini code review** utiliza a API oficial do Google Gemini.
O modelo padrão é Gemini 3.5 Flash-Lite, com opção de nível gratuito conforme
a cota da conta. O revisor é consultivo e não altera arquivos nem mescla PRs.

## Configuração

1. Crie uma chave em <https://aistudio.google.com/apikey>.
2. Em Settings > Secrets and variables > Actions, crie o repository secret
   GEMINI_API_KEY. Nunca cole a chave em uma PR ou arquivo.
3. Opcionalmente, crie a variável de repositório GEMINI_REVIEW_MODEL para
   selecionar outro modelo Gemini compatível com generateContent.

## Uso

Após a integração deste workflow na main, as PRs não draft de colaboradores
do próprio repositório serão revisadas ao abrir, reabrir ou atualizar.
Para revisar manualmente uma PR aberta, comente @gemini-cli /review ou
/gemini review. Somente proprietários, membros e colaboradores podem
usar o comando. Também é possível usar Actions > Gemini code review >
Run workflow na main e informar o número da PR.

PRs de forks são ignoradas. PRs de bots, incluindo Dependabot, não são
revisadas automaticamente; um colaborador pode solicitar manualmente
a revisão de uma PR do próprio repositório.

## Segurança e limites

- O workflow lê o script e AGENTS.md da base confiável, nunca do head da PR.
- A API recebe apenas patches selecionados do GitHub; não recebe a chave
  do GitHub, variáveis de ambiente, arquivos locais ou ferramentas de execução.
- Arquivos sensíveis e lockfiles são excluídos. Os filtros de credenciais
  são uma proteção adicional, não uma garantia de detecção de segredos.
- A entrada é limitada a 100 arquivos e 100.000 caracteres de patches.
  A revisão informa exclusões e não substitui os testes.
- O resultado é publicado como um único comentário consultivo, atualizado
  nas novas revisões. Não é um check obrigatório para merge.
- O plano gratuito pode usar os dados enviados para melhorar os produtos
  do Google. Não envie código confidencial nem segredos.
- Sem chave, o workflow registra um aviso e não chama a API. Falhas de
  autenticação ou de cota ficam visíveis no log, sem imprimir credenciais.

Referência: <https://aistudio.google.com/docs/models/gemini-3.5-flash-lite>.
