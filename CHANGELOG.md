# Changelog

## 1.0.0-beta.1 — 2026-09-22

Primeira versão beta com o roadmap funcional 2026 consolidado no NestJourney.

### Experiência
- Home **Hoje** role-first e orientada pela próxima ação real.
- navegação premium unificada em **Hoje · Pessoas · Jornada · Visão · Inteligência · Gestão** conforme permissão.
- continuidade de organização e unidade entre telas.
- experiência segura de CEO para visualizar o produto como outros papéis sem alterar RBAC real.
- mobile com idioma persistente, safe areas e atalhos por responsabilidade.

### Jornada operacional
- Presença, Mesa Aberta, Cuidado & Conexão, Casas de Paz e Raiz revisados individualmente.
- Pessoas centrado no próximo passo registrado.
- Visão executiva/pastoral com sinais de atenção em vez de mural de métricas.
- implantação guiada em 7 semanas, equipe/papéis, relatórios, governança, privacidade e acompanhamento pastoral.

### Roadmap avançado
- **Minha Jornada** opcional para membros.
- **Pulse** voluntário, sem inferência emocional.
- descoberta de Casas e sinalização de interesse.
- atualização de contato protegida.
- **Belonging Graph** baseado apenas em vínculos registrados.
- **Safe Voice** com identidade separada, capability específica e bloqueio de controle por pessoa citada.
- **Exit Intelligence** com motivo opcional, consentimento separado para contato e leitura agregada.
- **Inteligência de Cuidado** com evidências rastreáveis e sem score espiritual.
- construtor de fluxos em linguagem natural limitado a condições objetivas e ações seguras; não envia mensagens automaticamente.

### Fact Foundation
Eventos canônicos append-only agora cobrem:
- VISITOR_REGISTERED
- PRESENCE_SESSION_OPENED
- PRESENCE_CONFIRMED
- PRESENCE_CORRECTED
- FOLLOWUP_CREATED
- FOLLOWUP_COMPLETED
- CARE_REQUESTED
- CARE_ASSIGNED
- CARE_PROMISE_DUE
- CARE_DEBT_OPENED
- CARE_RESOLVED
- JOURNEY_STARTED
- JOURNEY_STEP_COMPLETED
- GROUP_JOINED
- GROUP_LEFT
- EXIT_FEEDBACK_SUBMITTED

### Segurança e privacidade
- isolamento por tenant e unidade preservado.
- diretório de Pessoas não é exposto a membro comum.
- Pulse, Safe Voice e Exit Intelligence separam dado agregado de identidade.
- atualização de contato fica em coleção privada com acesso reduzido.
- regras e fatos canônicos possuem validação no Firestore.
- nenhum fluxo comum aceita prontuário íntimo, diagnóstico ou pontuação espiritual.

### Qualidade
- PT-BR, English e Español.
- lint, testes, TypeScript/Vite build, Firestore Rules e smoke de produção fazem parte do gate.
