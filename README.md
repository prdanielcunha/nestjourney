# NestJourney

NestJourney é o SaaS multi-tenant, mobile-first e instalável do ecossistema MillionsNest para acolhimento, cuidado, pequenos grupos e discipulado em igrejas. **Raiz e Mesa** permanece como o método/ministério piloto da OBPC; não é o nome do software.

Produção: `https://nestjourney.millionsnest.com`

## Produto

O objetivo do NestJourney é impedir que pessoas sejam esquecidas sem transformar cuidado pastoral em funil de vendas ou prontuário.

Cada organização possui dados isolados, unidades, nomenclaturas, usuários, papéis e escopos próprios. A OBPC Monte Castelo e Industrial é o tenant piloto; nenhuma igreja é fixada na arquitetura.

A experiência é role-first:

- **Hoje** mostra o que depende da pessoa agora;
- **Pessoas** mostra a jornada factual permitida;
- **Áreas** contém somente as frentes operacionais relevantes;
- **Visão** é destinada a coordenação, pastor, admin e CEO;
- **Mais** concentra gestão, implantação, relatórios, governança, configurações e ajuda conforme permissão.

## Núcleo funcional

- implantação guiada em sete semanas;
- Presença e registro mínimo de visitantes;
- Mesa e vínculo;
- cuidado em 24–48 horas com Care Promise e Care Debt;
- follow-up humano com resultado estruturado;
- Casas/grupos e pedidos de entrada;
- Raiz/discipulado inicial em sete encontros;
- marcador pastoral restrito;
- visão executiva por organização/unidade;
- personalização de nomenclaturas;
- PT-BR, English e Español;
- RBAC, separação multi-tenant, auditoria e governança;
- PWA responsiva e instalável.

## Desenvolvimento

```bash
npm install
npm run dev
npm run check
npm run test:rules
```

`npm run check` executa lint, testes e build.

A produção usa o Firebase compartilhado do ecossistema MillionsNest. Em desenvolvimento local, copie `.env.example` para `.env.local` e informe `VITE_FIREBASE_*`; sem configuração válida o gate de sessão bloqueia a entrada.

## Segurança e governança

O Hub é autoridade para identidade, organizações, memberships, papéis globais, billing e entitlements. O NestJourney usa esses fatos e mantém seu domínio em:

`organizations/{orgId}/products/raiz_e_mesa`

O identificador interno é preservado por compatibilidade histórica.

As regras e os testes seguem o padrão multi-tenant: escopo por organização/unidade, privilégios explícitos, marcador pastoral restrito, auditoria e mutações protegidas.

O workflow `Quality` bloqueia regressões de lint, testes, build e Firestore Rules. A branch `production` publica o target Firebase Hosting e executa smoke test no domínio oficial.

O gate de sessão também é limitado por tempo: falhas de rede ou resolução de acesso não deixam o usuário preso indefinidamente em carregamento. A interface oferece retry explícito, fallback seguro para o Hub e aviso global quando o dispositivo fica offline.

Consulte:

- [Arquitetura do ecossistema](docs/ECOSYSTEM_ARCHITECTURE.md)
- [Auditoria de produto e roadmap](docs/ROADMAP_AUDIT.md)

O repositório é público. Credenciais e dados reais de pessoas nunca devem ser versionados.
