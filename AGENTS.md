# Regras para agentes de código — NestJourney

O NestJourney opera em **modo autônomo**. Leia e siga `docs/OPENCLAW_AUTONOMY.md` antes de executar trabalho relevante.

## Segurança e arquitetura

- Preserve o isolamento multi-tenant; toda entidade de negócio pertence a uma organização.
- Nunca use dados pessoais, pastorais ou credenciais reais em código, testes, prompts, logs ou demonstrações.
- Não afrouxe `firestore.rules` para corrigir uma falha de interface.
- Associações, convites, cobrança, privilégios e retenção são operações exclusivas de backend confiável.
- Registros pastorais permanecem restritos a `owner` e `pastor`.
- Prefira exclusão lógica e operações reversíveis; logs de auditoria são imutáveis.
- Quando capacidades compartilhadas estiverem envolvidas, o MillionsNest Hub continua sendo a autoridade para identidade, organizações, memberships, RBAC, billing e entitlements.

## Autonomia operacional

- O usuário não é gargalo de aprovação para trabalho rotineiro.
- OpenClaw pode instalar CLIs/dependências, alterar código/configuração, operar Git/GitHub, Vercel e Firebase, criar PRs, mesclar, promover para produção, executar smoke tests e fazer rollback, conforme `docs/OPENCLAW_AUTONOMY.md`.
- Mudanças devem ser pequenas, testáveis, auditáveis e reversíveis sempre que possível.
- Antes de operações destrutivas/estruturais em dados de produção, preserve um recovery point verificável.
- Não crie novos custos, planos pagos, compras de créditos ou compromissos recorrentes sem autorização explícita do usuário.

## Roteamento de modelos

- **Luna por padrão** para trabalho rotineiro e de baixo/médio risco.
- **Terra** quando houver complexidade real entre módulos, Firebase, RBAC/multi-tenant ou refatoração relevante.
- **Sol** somente para arquitetura, segurança, incidentes difíceis, estratégia de migração ou revisão independente de alto risco.
- Máximo de 2 tentativas materialmente semelhantes por tier antes de considerar escalada.
- Não mantenha modelo caro ativo para tarefas rotineiras após resolver a parte difícil.

## Quality gate e revisão

- Antes de concluir: `npm run check`.
- Para mudanças em Rules/segurança/acesso a dados: `npm run test:rules` e Emulator antes do deploy sensível sempre que aplicável.
- Alterações de segurança, banco, Rules, RBAC ou infraestrutura sensível exigem **revisão independente por outro agente**, não revisão humana obrigatória.
- O agente executor não dá a aprovação técnica final da própria mudança sensível.
- Após promoção: smoke test e inspeção de erros/logs.
- Em regressão de produção: rollback automático para o último estado conhecido como bom antes de uma nova tentativa.
