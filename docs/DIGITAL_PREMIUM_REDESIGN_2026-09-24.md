# NestJourney — Digital Premium redesign

Data: 2026-09-24  
Status: implementação incremental em homologação/PR, sem deploy de produção

## Objetivo

Aplicar a identidade Digital Premium do NestJourney sem alterar as fronteiras de negócio, autorização, tenant isolation, Firestore Rules, dados reais ou contratos de integração.

## Fonte visual

Paleta canônica:

- fundo: `#06101E` / `#081628`
- superfícies: `#0D2035` / `#122A43`
- acento: `#72D6B0`
- ação forte: `#43C79A`
- texto: `#F7FAFC`
- texto secundário: `#9EB0C3`

O verde é reservado a ação, foco, seleção, progresso e estado positivo. A interface não usa gradiente decorativo como linguagem estrutural.

## Decisões de implementação

1. O tema é centralizado em `src/design-system/nestjourney-tokens.css`.
2. Primitivos reutilizáveis vivem em `src/design-system/primitives.css`.
3. CSS legado é migrado para tokens de forma incremental para preservar comportamento e rollback simples.
4. O shell é role-first, com navegação desktop recolhível e navegação móvel dedicada.
5. A organização, o escopo e o papel efetivo permanecem visíveis no contexto do produto.
6. A marca completa é usada onde existe espaço; o símbolo fica reservado a navegação recolhida e espaços pequenos.
7. O runtime continua usando dados reais. Nenhum mock foi introduzido.
8. Atualização em tempo real usa listeners Firestore somente para coleções que a Lens atual pode ler.
9. O navegador não ganha nova autoridade sobre RBAC, billing, entitlement ou resolução de fatos.
10. O PR permanece sem deploy de produção até os gates de qualidade e validação de homologação passarem.

## Assets

A branch instala favicon ICO/SVG, Apple Touch Icon, ícones PWA 192/512, maskable, marca horizontal e metadados Open Graph.

## Realtime

As telas conectadas passam a invalidar e recarregar seu read model quando as coleções relevantes mudam. Isso cobre os fluxos principais de Presença, Mesa, Cuidado, Follow-up, Grupos, Discipulado, Hoje, Pessoas, Visão, Relatórios, Governança, Implantação e Pastoral.

A estratégia é propositalmente simples: `onSnapshot` observa mudanças e dispara refresh debounced do read model existente. Isso reduz risco de duplicar regras de montagem de estado no cliente.

## Acessibilidade e responsividade

- controles principais com alvo mínimo de 44px;
- foco visível;
- suporte a teclado pelos elementos nativos;
- redução de movimento via `prefers-reduced-motion`;
- contraste baseado nos tokens oficiais;
- shell adaptado para desktop/tablet/mobile.

A validação visual final deve cobrir 360, 390, 768, 1024, 1440 e 1920 px em homologação.

## Performance

- rotas continuam carregadas com `React.lazy`;
- sem atrasos artificiais;
- sem nova dependência de UI;
- assets do kit são servidos de `public/`;
- realtime usa debounce curto para agrupar bursts de mudanças.

## Rollback

O trabalho está isolado em `redesign/digital-premium-2026-09-24` e no PR #71. Enquanto não houver merge/deploy de produção, o rollback é simplesmente abandonar/fechar a branch/PR. Nenhuma migração de dados foi adicionada por este redesign.

## Gates

Cada avanço deve manter:

- `npm run lint`
- `npm test`
- `npm run build`
- `npm run test:rules`

O workflow `Quality` executa `npm run check` e os testes de Firestore Rules.
