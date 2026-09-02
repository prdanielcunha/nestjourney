# Raiz e Mesa

SaaS multi-tenant, mobile-first e instalável para implantação de uma cultura de acolhimento, cuidado, pequenos grupos e discipulado em igrejas.

## Produto

Cada organização possui dados isolados, identidade visual, nomes de áreas, unidades, usuários, papéis e escopos próprios. A OBPC Monte Castelo e Industrial é o tenant piloto; nenhuma igreja é fixada na arquitetura.

## MVP

- onboarding da organização e unidades;
- implantação guiada em sete semanas;
- pessoas, consentimento e próximos passos;
- cuidado em 24–48 horas;
- pequenos grupos nos lares;
- discipulado inicial em sete encontros;
- visão pastoral sem gamificação;
- personalização de marca e nomenclaturas;
- RBAC, separação de dados, auditoria e retenção;
- PWA responsiva e instalável.

## Desenvolvimento

```bash
npm install
npm run dev
npm run build
npm run check
npm run test:rules
```

Sem variáveis Firebase, o aplicativo abre em modo de demonstração com dados fictícios persistidos no dispositivo. O Firebase deve ser ativado somente depois de Emulator, testes de Rules e aprovação do ambiente.

## Segurança e governança

As regras seguem o padrão multi-tenant do ecossistema: associação canônica por organização, acesso operacional limitado às congregações atribuídas, privilégios explícitos, anotações pastorais restritas, auditoria imutável e mutações de identidade/cobrança somente por backend confiável. O workflow `Quality` bloqueia regressões de lint, testes, build e Firestore Rules.

O repositório é público e contém somente configuração de exemplo e dados fictícios. Credenciais e dados de pessoas nunca devem ser versionados.
