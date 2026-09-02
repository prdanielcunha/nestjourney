# Contribuindo

1. Crie uma branch a partir de `main`.
2. Não adicione dados reais de pessoas, igrejas, tokens ou arquivos `.env`.
3. Execute `npm run check` e `npm run test:rules`.
4. Abra um pull request explicando impacto funcional, segurança multi-tenant e evidências de teste.

Mudanças de esquema devem manter `organizationId` imutável, considerar escopo por congregação e incluir migração reversível. Exclusões de dados de pessoas devem usar pedido de retenção e processamento confiável, nunca exclusão direta do cliente.
