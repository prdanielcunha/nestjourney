# NestJourney

Plataforma multi-tenant, mobile-first e instalável para igrejas acompanharem jornadas de acolhimento, cuidado, comunidade e formação sem transformar pessoas em leads ou números.

- **Produto:** NestJourney
- **Marca-mãe:** MillionsNest
- **Domínio oficial:** [nestjourney.millionsnest.com](https://nestjourney.millionsnest.com)
- **Metodologia piloto:** Raiz e Mesa

## Produto e metodologia

NestJourney é a plataforma vendável. Cada organização possui dados isolados, identidade, unidades, usuários, papéis, escopos, nomes e metodologia próprios. “Raiz e Mesa” continua sendo o programa inicial da OBPC Monte Castelo e Industrial, configurado dentro da plataforma.

Uma igreja pode usar nomes como “Café da Família”, “PG”, “Caminho” ou qualquer nomenclatura própria. Os nomes configurados aparecem nos menus, etapas, implantação, mensagens e visão pastoral.

## Núcleo atual

- onboarding da organização e unidades;
- implantação guiada em sete semanas;
- pessoas, consentimento e próximos passos;
- cuidado em 24–48 horas;
- convivência e mesa;
- pequenos grupos;
- discipulado inicial;
- visão pastoral sem gamificação;
- personalização do programa, cores e nomenclaturas;
- RBAC, separação de dados, auditoria e retenção;
- PWA responsiva e instalável.

Ausentes, batismos, membresia, formação, voluntariado, famílias, jornadas personalizadas e automações pertencem à evolução do NestJourney e não alteram o núcleo de cuidado do MVP.

## Desenvolvimento

```bash
npm install
npm run dev
npm run build
npm run check
npm run test:rules
```

Sem variáveis Firebase, o aplicativo abre em demonstração com dados fictícios persistidos no dispositivo. Com a configuração pública do cliente, usa o mesmo Firebase Authentication do MillionsNest, resolve a organização e o papel do usuário e sincroniza o namespace do produto.

O Hub abre o NestJourney por handoff assinado de curta duração (`ecosystem_ctx`). O identificador canônico é `nestjourney`; os identificadores anteriores continuam aceitos temporariamente para não interromper pilotos existentes.

## Segurança e compatibilidade

As regras seguem o padrão multi-tenant do ecossistema: associação canônica por organização, escopo por congregação, menor privilégio, dados pastorais restritos, auditoria imutável e mutações de identidade/cobrança somente por backend confiável.

Para evitar perda ou duplicação durante a mudança de marca, o caminho Firestore permanece temporariamente em `organizations/{orgId}/products/raiz_e_mesa`. Esse é um detalhe interno compatível, não o nome comercial do produto. Entitlements novos usam `apps.nestjourney`; os aliases anteriores são somente leitura de compatibilidade.

Consulte [a arquitetura do ecossistema](docs/ECOSYSTEM_ARCHITECTURE.md) e [a auditoria do roadmap](docs/ROADMAP_AUDIT.md).

O repositório é público e contém somente configuração pública de cliente, exemplos e dados fictícios. Credenciais administrativas e dados reais de pessoas nunca são versionados.
