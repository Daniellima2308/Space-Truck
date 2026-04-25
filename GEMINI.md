# Diretrizes para Gemini

Siga o guia principal de agentes em `AGENTS.md`.

Este arquivo existe apenas para compatibilidade com ferramentas que procuram instruções em `GEMINI.md`. Não duplique regras aqui. Quando uma regra precisar mudar, atualize primeiro `AGENTS.md` e mantenha este arquivo apenas como ponte.

Resumo operacional:

- trabalhe sempre em branch, nunca direto na `main`;
- mantenha o escopo pequeno e alinhado ao pedido;
- não altere regra de negócio, Supabase, autenticação ou dependências sem pedido explícito;
- separe dados brutos, leituras derivadas e UI;
- não duplique lógica de cálculo em componentes;
- rode `npm ci` antes das validações;
- entregue resumo com arquivos alterados, motivo, comandos, riscos e próximos passos.
