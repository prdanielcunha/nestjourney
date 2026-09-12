# Auditoria do roadmap — NestJourney

Data da revisão: 3 de setembro de 2026.

## Escopo revisado

A auditoria compara o software com o Blueprint do Aplicativo, Manual Mestre, implantação em sete semanas e os manuais de Presença, Mesa Aberta, Cuidado e Conexão, Casa de Paz e Raiz. Esses materiais formam o template inicial **Raiz e Mesa**; a plataforma reutilizável é **NestJourney**.

## Matriz de cobertura

| Área | Requisito consolidado | Evidência no produto | Situação |
|---|---|---|---|
| Produto | Plataforma vendável independente da metodologia | Marca NestJourney, domínio próprio e programa por organização | Implementado |
| Customização | “Mesa”, “Casa”, “Raiz”, “Conexão” e demais áreas renomeáveis | Nomes configuráveis aplicados a menus, etapas, implantação e mensagens | Implementado |
| SaaS | Qualquer igreja, unidades e identidade próprias | Organização, congregações, cores e nomenclaturas configuráveis | Implementado |
| Ecossistema | Conta compartilhada no MillionsNest | Firebase Auth, handoff, memberships e entitlement `nestjourney` com aliases legados | Implementado em código; Rules centrais exigem gate |
| Compatibilidade | Rebrand sem perda de dados | Namespace Firestore legado mantido e aliases aceitos | Implementado |
| Implantação | Ciclo completo de sete semanas | Tarefas, prática real, ritmo de 40–45 min e progresso persistido | Implementado |
| Presença | Primeira visita, retorno e anfitrião de vínculo | Registro e histórico por pessoa, data, tipo, unidade e anfitrião | Implementado |
| Mesa/convivência | Convite sem pressão e participação simples | Indicadores e linguagem sem avaliação subjetiva | Implementado |
| Pessoas | Cadastro mínimo, responsável e próximo passo | Consentimento opcional, jornada, filtros, busca e painel individual | Implementado |
| Cuidado | Contato em aproximadamente 24h, máximo 48h | Pendências, prazo, responsável, conclusão e próxima ação | Implementado |
| Mensagens | Sugestão contextual editável | Variações por etapa, copiar, apagar e abrir no WhatsApp | Implementado |
| Grupos | Liderança, local, agenda, capacidade e pedidos | Cartões, fila de entrada, relatórios e alertas | Implementado |
| Discipulado | Relação individual, encontros e carga saudável | Acompanhamentos, mapa, progresso e limites | Implementado |
| Pastoral | Saúde sem ranking ou “nível espiritual” | Indicadores agregados e encaminhamentos restritos | Implementado |
| Perfis | Pastor, coordenação, cuidado, grupo, discipulador e dados | Navegação por papel, escopo por unidade e Rules RBAC | Implementado |
| LGPD | Minimização, consentimento, correção e exclusão | Revogação, solicitações administrativas e auditoria | Implementado |
| Auditoria | Histórico imutável e pastoral restrito | Interface e Firestore Rules | Implementado |
| PWA | Mobile-first e instalável | Manifesto, service worker, ícone e layouts responsivos | Implementado |
| Marca | Interface dark premium | Tokens dark, ouro discreto e identidade NestJourney | Implementado |
| Qualidade | Proteção contra regressões | Lint, TypeScript, build, testes de domínio e Rules Emulator | Implementado |

## Evolução do produto

O nome NestJourney comporta as próximas jornadas sem diluir o MVP:

- ausentes e reaproximação;
- batismos e membresia;
- formação e voluntariado;
- famílias;
- jornadas personalizadas;
- automações responsáveis.

Esses módulos entram em fases posteriores com modelo de dados, papéis, consentimento, auditoria e critérios de aceite próprios. Não devem ser simulados como “campos extras” no cadastro de visitante.

## Limites preservados

O núcleo não inclui finanças, streaming, rede social, gamificação, pontuação espiritual, aconselhamento por IA nem prontuário com confissão, trauma ou saúde.

## Gate externo de produção

Antes de habilitar dados reais, as Rules centrais precisam passar pelo Emulator e pela revisão independente exigida pelo ecossistema. A Vercel recebe somente configuração pública do cliente; nenhuma chave administrativa entra no repositório.
