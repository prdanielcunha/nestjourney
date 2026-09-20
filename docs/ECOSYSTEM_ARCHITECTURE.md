# Arquitetura do NestJourney no ecossistema MillionsNest

Atualizado em **20 de setembro de 2026**.

## Decisão canônica

O NestJourney é um **spoke** do MillionsNest Hub. O software pode ser aberto pelo domínio próprio/PWA, mas identidade, organizações, associações, papéis globais, cobrança e entitlements continuam canônicos no Hub.

Raiz e Mesa é o método/ministério piloto da OBPC. O produto permanece independente: nomes como Mesa Aberta, Casa de Paz e Raiz podem ser personalizados sem alterar o modelo de dados ou as regras de acesso.

## Dados compartilhados

| Caminho canônico | Responsabilidade |
| --- | --- |
| `users/{uid}` | identidade e papel global |
| `organizations/{orgId}` | organização, marca e apps habilitados |
| `organizations/{orgId}/members/{uid}` | associação, papel, permissões e escopo de unidades |
| `organization_members/{uid}_{orgId}` | compatibilidade durante migração |
| `subscriptions/{orgId}` | assinatura consolidada, escrita por backend confiável |

## Dados exclusivos do produto

O domínio operacional permanece isolado em:

`organizations/{orgId}/products/raiz_e_mesa/...`

O identificador interno `raiz_e_mesa` é mantido por compatibilidade de dados; o nome público do produto é **NestJourney**.

Entre as coleções operacionais estão congregações/unidades, pessoas, presença, Mesa, cuidado, grupos, discipulado, implantação, fatos, auditoria, governança e encaminhamentos pastorais.

## Autorização

Autenticação prova identidade. Ela não concede autorização por si só.

A autorização efetiva considera:

- papel global do ecossistema;
- membership canônica da organização;
- papel organizacional;
- papel/responsabilidade do NestJourney;
- escopo de unidades;
- capabilities explícitas;
- entitlement do produto.

CEO/global admin não depende de membership local para a visão de ecossistema. Usuários operacionais recebem somente as capacidades e unidades necessárias para a responsabilidade atribuída.

## Entrada no aplicativo

O NestJourney suporta:

1. entrada pelo Hub;
2. entrada direta pelo domínio/PWA com Google/Firebase;
3. recuperação de conta/contexto quando a identidade autenticada não possui uma organização NestJourney válida.

Os dois caminhos convergem para a mesma verdade de autorização.

## Produção

Frontend/PWA é publicado em Firebase Hosting no projeto compartilhado `millionsnest`.

Domínio oficial:

`https://nestjourney.millionsnest.com`

A branch `production` dispara o workflow **Firebase Hosting Deploy**, que:

- autentica por Workload Identity Federation;
- instala a árvore travada pelo lockfile;
- executa `npm run check`;
- publica somente o target Hosting `nestjourney`;
- executa smoke test no domínio Firebase e no domínio oficial.

O arquivo `firebase.json` deste repositório configura **Hosting**. Ele não publica Firestore Rules em produção.

## Firestore Rules

Este repositório mantém as regras e os testes necessários para certificar o domínio NestJourney em emulador. O workflow **Quality** executa `npm run test:rules`.

Mudanças de regras compartilhadas que afetem o Firebase de produção precisam preservar o contrato dos demais produtos do ecossistema e seguir a governança central. Corrigir interface nunca é motivo para afrouxar isolamento multi-tenant.

## Privacidade

O produto armazena fatos operacionais mínimos. Conteúdo íntimo, confissões, diagnóstico, trauma e narrativas pastorais detalhadas não pertencem ao fluxo comum.

Encaminhamento pastoral registra o fato de que contato pastoral é necessário, sem transformar o NestJourney em prontuário.

## Navegação e UX canônicas

A experiência atual é role-first:

- **Hoje** — ação principal e pendências factuais do usuário;
- **Pessoas** — Lens da jornada quando o papel possui acesso;
- **Áreas** — somente frentes operacionais relevantes ao papel;
- **Visão** — coordenação, pastor, admin e CEO;
- **Mais** — implantação, equipe, relatórios, governança, configurações e ajuda conforme permissão.

No mobile a barra inferior permanece curta e se adapta ao papel, sem expor atalhos que terminam em telas de “sem acesso”.

A antiga rota `/journey-overview` é mantida apenas como alias de compatibilidade para **Visão**.
