# NestJourney no ecossistema MillionsNest

## Decisão

NestJourney é um **spoke** independente do Hub MillionsNest. “Raiz e Mesa” é uma metodologia configurada dentro do NestJourney para as igrejas piloto, não a identidade do software.

O Hub continua como autoridade exclusiva para identidade, organizações, memberships, cobrança, entitlements e papéis globais. O Firebase compartilhado `millionsnest` oferece Auth, persistência e Rules sem criar uma autoridade paralela.

## Identidade canônica

| Item | Valor |
|---|---|
| Produto | NestJourney |
| App ID novo | `nestjourney` |
| Domínio | `nestjourney.millionsnest.com` |
| Marca-mãe | MillionsNest |
| Programa piloto | Raiz e Mesa |
| Namespace legado estável | `products/raiz_e_mesa` |

O cliente e o Hub aceitam temporariamente `raiz_e_mesa` e `raiz-e-mesa` em handoffs, memberships e entitlements. Toda nova concessão deve usar `nestjourney`. A remoção dos aliases exige migração server-side auditada e não deve ser feita pelo navegador.

## Dados compartilhados

| Caminho canônico | Responsabilidade |
|---|---|
| `users/{uid}` | perfil e papel global |
| `organizations/{orgId}` | igreja, marca e apps contratados |
| `organizations/{orgId}/members/{uid}` | associação, papel, permissões e unidades |
| `organization_members/{uid}_{orgId}` | compatibilidade durante migração |
| `subscriptions/{orgId}` | assinatura consolidada, escrita por webhook |

## Dados exclusivos do produto

Os dados operacionais continuam em:

`organizations/{orgId}/products/raiz_e_mesa/...`

Manter o namespace evita duas fontes de verdade e preserva dados existentes. Subcoleções atuais: `congregations`, `people`, `groups`, `groupMeetings`, `discipleships`, `presence`, `joinRequests`, `teamAssignments`, `pastoral`, `settings`, `implementation`, `audit` e `retentionRequests`.

## Configuração por igreja

Cada organização configura:

- nome da metodologia ou programa;
- recepção/presença;
- mesa/convivência;
- cuidado/conexão;
- pequenos grupos;
- discipulado inicial;
- cores, unidades e responsáveis.

Os rótulos são apresentação; IDs de domínio e permissões permanecem estáveis. Assim, renomear “Casa de Paz” para “PG” não rompe dados, auditoria ou integrações.

## Fluxo comercial e de acesso

1. A igreja cria uma conta no MillionsNest.
2. O Hub cria ou reutiliza a organização e as memberships.
3. A contratação habilita `apps.nestjourney.status` via backend/webhook idempotente.
4. O Hub emite handoff curto para `appId: nestjourney`.
5. NestJourney valida produto, usuário, organização e expiração antes de autenticar o token.
6. Leituras e escritas permanecem limitadas ao tenant, papel e unidades.

O cliente não cria memberships, não concede planos e não altera entitlements.

## Gate de segurança

Este repositório mantém Rules do domínio para Emulator. A versão de produção é incorporada no repositório central MillionsNest, testada em conjunto com os outros produtos e publicada somente após revisão independente.
