# Arquitetura no ecossistema MillionsNest

## Decisão

O Raiz e Mesa é um **spoke** do Hub MillionsNest. Todos os produtos compartilham o projeto Firebase `millionsnest`, mas somente o Hub é autoridade para identidade, organizações, associações, cobrança e direitos de acesso.

## Dados compartilhados

| Caminho canônico | Responsabilidade |
| --- | --- |
| `users/{uid}` | perfil e papel global |
| `organizations/{orgId}` | igreja, marca e apps contratados |
| `organizations/{orgId}/members/{uid}` | associação, papel, permissões e unidades |
| `organization_members/{uid}_{orgId}` | compatibilidade durante migração |
| `subscriptions/{orgId}` | assinatura consolidada, escrita por webhook |

## Dados exclusivos do produto

Todo dado operacional fica no namespace:

`organizations/{orgId}/products/raiz_e_mesa/...`

Subcoleções: `congregations`, `people`, `groups`, `discipleships`, `pastoral`, `audit` e `retentionRequests`. Assim, identidade e tenant são reutilizados sem misturar o domínio do produto com MusicScale, NestFinance ou futuros apps.

## Direito de acesso

O Hub grava `organizations/{orgId}.apps.raiz_e_mesa.status` como `active` ou `trialing` depois da contratação. O cliente nunca concede a si mesmo assinatura, associação ou permissão.

## Fonte das regras

Este repositório mantém regras completas apenas para o emulador e testes do domínio. Ele deliberadamente não possui `firebase.json` nem workflow de deploy de Rules. A versão para produção deve ser incorporada e testada no repositório central MillionsNest, preservando as regras dos demais produtos.

## Fluxo comercial

1. A igreja cria uma única conta no MillionsNest.
2. O Hub cria ou reutiliza `organizationId` e associações.
3. A compra habilita `apps.raiz_e_mesa` via backend/webhook idempotente.
4. O Hub emite um handoff assinado, de uso curto, vinculado ao usuário, igreja e aplicativo.
5. O Raiz e Mesa autentica o token no mesmo Firebase e remove o contexto da URL.
6. Leituras e escritas ficam limitadas ao tenant, papel e unidades do usuário.

## Persistência do produto

Pessoas, presenças, Casas, encontros, discipulados, solicitações e auditoria usam documentos independentes. Configurações e o progresso da implantação usam documentos próprios. O modo de demonstração continua isolado no navegador e nunca é enviado automaticamente para uma igreja real.

O cliente não cria memberships, não habilita planos e não altera entitlements. Essas operações continuam exclusivas do Hub e do backend confiável.
5. O app lê somente o tenant ativo e o namespace do produto.
