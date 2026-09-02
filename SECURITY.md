# Segurança

Não publique vulnerabilidades em issues. Envie o relato de forma privada pelo recurso **Security advisories** do GitHub, incluindo impacto, passos de reprodução e versão afetada.

## Princípios do produto

- isolamento obrigatório por organização e congregação;
- menor privilégio por função e permissão explícita;
- anotações pastorais acessíveis somente a `owner` e `pastor`;
- associações, convites, cobrança e privilégios alterados somente por backend confiável;
- auditoria somente de acréscimo e exclusão por fluxo de retenção;
- nenhum segredo, dado pastoral ou dado pessoal real no repositório.

Antes de uma implantação Firebase, execute `npm run test:rules`. Mudanças em `firestore.rules` devem ser revisadas e aprovadas antes de chegar à produção.
