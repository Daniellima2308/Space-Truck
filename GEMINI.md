# Diretrizes para Gemini

Siga o guia principal de agentes em `AGENTS.md`.

Este arquivo existe apenas para compatibilidade com ferramentas que procuram instrucoes em `GEMINI.md`. Nao duplique regras aqui. Quando uma regra precisar mudar, atualize primeiro `AGENTS.md` e mantenha este arquivo apenas como ponte.

Resumo operacional:

- trabalhe sempre em branch, nunca direto na `main`;
- mantenha o escopo pequeno e alinhado ao pedido;
- nao altere regra de negocio, Supabase, autenticacao ou dependencias sem pedido explicito;
- separe dados brutos, leituras derivadas e UI;
- nao duplique logica de calculo em componentes;
- rode `npm ci` antes das validacoes;
- entregue resumo com arquivos alterados, motivo, comandos, riscos e proximos passos.
