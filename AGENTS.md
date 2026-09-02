# Regras para agentes de código

- Preserve o isolamento multi-tenant; toda entidade de negócio pertence a uma organização.
- Nunca use dados pessoais, pastorais ou credenciais reais em código, testes ou demonstrações.
- Não afrouxe `firestore.rules` para corrigir uma falha de interface.
- Associações, convites, cobrança, privilégios e retenção são operações exclusivas de backend confiável.
- Registros pastorais permanecem restritos a `owner` e `pastor`.
- Prefira exclusão lógica e pedidos de retenção; logs de auditoria são imutáveis.
- Antes de concluir: `npm run check` e `npm run test:rules`.
- Alterações de segurança ou banco exigem pull request e revisão humana antes da produção.
