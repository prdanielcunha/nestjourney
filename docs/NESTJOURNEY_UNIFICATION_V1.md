# NestJourney Unified Journey & Care — versão de unificação

Data: 2026-09-17
Status: decisão de produto e arquitetura para implementação incremental

## 1. Decisão principal

**NestJourney é o produto. Raiz e Mesa é uma implementação ministerial configurável dentro dele.**

Não haverá dois sistemas concorrentes e não haverá recomeço do aplicativo. O que já foi construído para Raiz e Mesa e continua útil passa a compor o Journey & Care Engine do NestJourney.

A regra é:

> preservar o que funciona, separar o que é identidade local do que é capacidade de produto e evoluir por vertical slices auditáveis.

Uma igreja pode continuar chamando sua experiência de **Raiz e Mesa**. Outra pode usar **Café da Família**, **PG**, **Caminho**, **Conexão** ou outros nomes. O motor por trás é NestJourney.

## 2. O que permanece do Raiz e Mesa

| Experiência atual | Papel na versão unificada | Decisão |
| --- | --- | --- |
| Implantação em 7 semanas | Playbook de implantação e formação | **Preservar**. Continua sendo um playbook disponível e pode futuramente coexistir com outros playbooks. |
| Presença + Mesa Aberta | Presence Assist + contexto de hospitalidade | **Evoluir**. A hospitalidade continua; a presença ganha sessão, cobertura, estados verificáveis e auditoria. |
| Pessoas | People / Journey Profile | **Preservar e evoluir**. Cadastro mínimo, consentimento e próximos passos permanecem. |
| Cuidado e Conexão | Follow-up + Care Integrity | **Evoluir**. O prazo de 24–48h vira Care Promise configurável e, quando vencido sem resolução, Care Debt. |
| Casa de Paz | Groups | **Preservar**. Nome é configurável por organização. Líder, anfitrião, aprendiz, capacidade e relatórios mínimos continuam úteis. |
| Raiz | Discipleship / Journey Track | **Preservar**. Os sete encontros continuam como trilha da implementação Raiz e Mesa, sem virar regra universal para outras igrejas. |
| Visão pastoral | Journey Lens / Pastoral Lens | **Evoluir**. Sai de painel fixo e passa a mostrar atenção, contexto e fatos conforme responsabilidade e capability. |
| Governança local | Configuração do domínio Journey | **Reduzir autoridade local**. Nomes, playbooks e preferências permanecem; identidade, membership, RBAC, billing e entitlement continuam autoridade do Hub. |
| Scripts de contato | Templates aprovados / Connect-ready | **Preservar**. Continuam editáveis e futuramente podem ser executados pelo Connect com autorização. |
| Auditoria e retenção | Audit + privacy operations | **Preservar e endurecer**. Registros relevantes são append-only e operações sensíveis seguem política de retenção/privacidade. |

## 3. Separação entre produto e identidade ministerial

O software passa a apresentar duas camadas conceituais:

- **Produto:** NestJourney.
- **Programa/jornada local:** por exemplo, Raiz e Mesa.

Isso resolve o problema de transformar nomenclaturas da OBPC em estrutura fixa do SaaS. O nome do grupo, discipulado, mesa, recepção e cuidado continua configurável.

### Compatibilidade de armazenamento

O namespace Firestore existente `products/raiz_e_mesa` será **preservado durante esta fase**. Renomear a árvore agora criaria migração destrutiva sem ganho funcional.

O código novo usa uma camada de identidade de produto que diferencia:

- `productId = nestjourney` — identidade atual do produto;
- `storageKey = raiz_e_mesa` — chave legada compatível no armazenamento.

Uma futura migração de namespace só será considerada com dual-read/dual-write ou ferramenta idempotente, recovery point e rollback.

## 4. Modelo unificado de jornada

O NestJourney passa a organizar o domínio em capacidades, não em um funil rígido:

1. **People** — pessoa e dados operacionais mínimos.
2. **Presence** — fatos de presença confirmados por pessoa autorizada.
3. **Visitor / Integration** — primeiro contato e próximos passos.
4. **Care** — necessidades explicitamente registradas, responsáveis, prazos e resolução.
5. **Groups** — pequenos grupos/células/Casa de Paz.
6. **Discipleship / Journey Tracks** — Raiz e outras trilhas configuráveis.
7. **Belonging** — vínculos registrados, nunca diagnóstico de solidão.
8. **Pulse** — check-ins voluntários e explícitos.
9. **Safe Voice / Exit** — fases posteriores, com segregação e revisão de privacidade.

A pessoa não é obrigada a passar por todas as etapas em uma ordem fixa. O sistema registra fatos e próximos passos compatíveis com a realidade da igreja e da pessoa.

## 5. Presence: como a versão nova funciona

Cada culto/evento pode abrir uma **Presence Session** com organização, congregação, referência do evento, horário de abertura e quantidade esperada no escopo de checagem.

Cada pessoa fica em um dos estados:

- `present_confirmed` — alguém autorizado confirmou que a pessoa estava presente;
- `absent_confirmed` — opcional, somente quando existe processo confiável para confirmar ausência;
- `unverified` — não foi possível verificar.

**Não marcado nunca vira ausente.**

A sessão calcula cobertura a partir do universo esperado. Sinais de ausência só podem usar sessões fechadas e com cobertura mínima configurada. Correções são novos registros append-only, apontando para o registro corrigido.

A experiência antiga de hospitalidade não é descartada. Informações como anfitrião de vínculo, convite/participação na Mesa e oferta de contato continuam pertencendo ao contexto de acolhimento; não devem ser misturadas com o significado factual de presença.

## 6. Visitante e primeiro contato

O cadastro rápido preserva a lógica do Raiz e Mesa:

- nome;
- congregação;
- telefone somente quando houver finalidade/consentimento aplicável;
- autorização de contato;
- data de primeira visita;
- responsável/próximo passo quando definido.

Ao registrar visitante novo, o sistema pode emitir `VISITOR_REGISTERED`. Se ele for reconhecido na sessão, também emite a evidência de presença correspondente.

O primeiro contato continua com a cultura de aproximadamente 24h e no máximo 48h no playbook Raiz e Mesa, mas tecnicamente passa a ser representado por **Care Promise** configurável. A plataforma não assume que todas as igrejas usarão exatamente o mesmo SLA.

## 7. Care Promise, Care Debt e resolução

- **Care Request:** necessidade explicitamente registrada por pessoa ou líder autorizado.
- **Care Promise:** compromisso operacional com prazo, owner e evidência de origem.
- **Care Debt:** Promise vencida sem resolução registrada.
- **Resolution:** resultado estruturado, com `evidenceRef`; mensagem enviada não é automaticamente resolução.

O sistema mede primeiro se a organização cumpriu o cuidado que prometeu. Ele não tenta avaliar fé, interesse espiritual, motivação ou estado emocional.

## 8. Fatos canônicos e Intelligence

A versão unificada passa a emitir fatos canônicos com:

- `eventId` idempotente;
- `eventType`;
- `occurredAt` e `recordedAt`;
- `organizationId`;
- `actorId` quando aplicável;
- `subjectRef`;
- `sourceApp = nestjourney`;
- `scope`;
- `evidenceRef`;
- `sensitivity`;
- `version`;
- payload mínimo.

Regra permanente: **NO SOURCE → NO CLAIM**.

O Intelligence pode resumir ou sugerir ações sobre fatos autorizados, mas não transforma ausência de dado em diagnóstico.

## 9. RBAC e Lenses

O Hub continua autoridade para identidade, organização, membership, entitlement e RBAC.

O NestJourney aplica capability + scope no domínio. Exemplos:

- voluntário de presença: sessão atual e pessoas necessárias à checagem;
- integração/cuidado: visitantes e tarefas do escopo permitido;
- líder de grupo: pessoas e operações do grupo atribuído;
- discipulador: jornadas atribuídas;
- pastoral care: Care Requests explicitamente autorizados;
- pastor/admin: visão ampliada conforme capability, sem acesso automático a todo conteúdo confidencial apenas pelo título do papel.

A experiência futura do Hub usará Lenses. Dentro do NestJourney, as telas continuam especializadas no trabalho de Journey & Care.

## 10. O que não será levado adiante como regra estrutural

Algumas decisões antigas eram corretas para o piloto Raiz e Mesa, mas não devem limitar o produto:

- fluxo único obrigatório `Culto → Mesa → Casa → Raiz` para todas as igrejas;
- nomes fixos de ministério;
- papel demonstrativo escolhido manualmente como fonte de autorização;
- persistência principal em `localStorage`;
- labels de prazo como fonte de verdade;
- dashboard pastoral baseado em interpretação subjetiva;
- qualquer score espiritual ou inferência de afastamento.

Esses itens podem permanecer temporariamente na experiência legada enquanto a substituição equivalente não estiver completa.

## 11. Migração incremental

### Fase atual — compatibilidade + Presence real

- manter UI e fluxos Raiz e Mesa funcionando;
- manter namespace Firestore legado;
- restaurar/usar handoff seguro do Hub;
- adicionar contratos de facts e Care Integrity;
- persistir Presence Sessions e Presence Checks;
- emitir facts de Presence/Visitor em batch atômico quando houver evidência;
- criar Presence Assist mobile-first como experiência nova isolada e reversível.

### Próxima fase — Journey real

- substituir `localStorage` por repositórios Firestore por módulo;
- criar Care Request/Promise/Debt persistidos;
- converter follow-up antigo em outcome estruturado;
- ligar grupos e discipulado ao Journey Profile sem apagar modelos atuais;
- criar read model `journeyOverview` e `myToday` quando as fontes estiverem confiáveis.

### Depois — Resolve Loop

- Next Best Ministry Action;
- deep link para ação;
- Connect prepara/realiza comunicação permitida;
- outcome confirma resolução;
- Hub recebe projeções agregadas por Lens.

## 12. Critérios de segurança para substituir uma tela antiga

Uma tela/fluxo legado só pode ser substituído quando a nova versão tiver:

1. paridade das capacidades úteis;
2. dados reais e tenant isolation;
3. RBAC positivo e negativo testados;
4. estados loading/empty/error;
5. PT-BR/EN/ES;
6. mobile e desktop validados;
7. auditoria/evidence refs;
8. rollback claro;
9. zero perda de dados;
10. smoke test do fluxo principal.

Até esse gate, a evolução acontece ao redor da experiência existente, não em seu lugar.

## 13. Definição curta da versão unificada

**NestJourney é o Journey & Care Engine do MillionsNest. Ele transforma o que o Raiz e Mesa já fazia bem — acolher, acompanhar, conectar, discipular e não esquecer pessoas — em um produto multi-igreja, configurável e orientado por fatos verificáveis. A tecnologia registra o cuidado, organiza responsabilidades e ajuda a fechar lacunas; ela não interpreta a espiritualidade das pessoas.**


## 14. Implementação corrente — Care Integrity V1

A segunda vertical slice da unificação é **Care Integrity**, disponível de forma paralela e reversível em `/care-integrity`.

Ela implementa:

- `careRequests` reais no Firestore, vinculados a pessoa e congregação;
- Care Promise com prazo factual de 1 a 168 horas;
- default Raiz e Mesa de 48h para primeiro contato autorizado, preservando a orientação pastoral de realizar o contato aproximadamente em 24h e no máximo em 48h;
- fila sem responsável para pedidos originados no cadastro de visitante;
- ação explícita de **assumir cuidado** por usuário com capability de Care;
- limite visual de carga com referência inicial de 8–10 acompanhamentos leves por cuidador na semana;
- Care Debt derivado deterministicamente de `dueAt + ausência de resolução`;
- resolução estruturada com outcome e nota operacional curta;
- transições de Care persistidas como fonte operacional monotônica; os facts canônicos `CARE_REQUESTED`, `CARE_ASSIGNED` e `CARE_RESOLVED` ficam reservados à projeção confiável/server-side nesta fase;
- bloqueio de edição silenciosa de prazo, troca de tenant, troca de congregação e hard delete;
- segregação de escopo por congregação e capability;
- PT-BR, EN e ES;
- regra de minimização: a fila não é prontuário e não deve armazenar diagnósticos, traumas, violência, confissões, sexualidade ou detalhes familiares.

### Automação do primeiro contato

Quando um visitante é cadastrado no Presence Assist **com autorização de contato**, o mesmo batch passa a criar um Care Request de `first_contact` com Promise de 48 horas e sem responsável definido. Isso preserva o fluxo Raiz e Mesa sem atribuir automaticamente o cuidado ao voluntário que fez o cadastro.

A equipe de Cuidado vê a pendência, assume explicitamente a responsabilidade e registra o resultado. Assim, o sistema mede o compromisso da organização — não a espiritualidade da pessoa.

### Limite desta fase

`CARE_REQUESTED`, `CARE_ASSIGNED`, `CARE_RESOLVED`, `CARE_PROMISE_DUE` e `CARE_DEBT_OPENED` continuam previstos no contrato canônico, mas a vertical slice do navegador persiste apenas a fonte operacional de Care. A projeção desses facts fica reservada a processo confiável/server-side. O estado de dívida é calculado deterministicamente para a experiência atual, evitando que o navegador ou o relógio do dispositivo do usuário se tornem autoridade do Fact Stream.


## 15. Implementação corrente — Journey Profile V1

A terceira vertical slice é o **Journey Profile**, disponível em `/journey-profile`.

O objetivo não é construir um CRM de pessoas nem um prontuário pastoral. O Profile é uma **projeção factual de jornada** que reúne, para uma pessoa autorizada a consultar aquele escopo:

- cadastro mínimo de People;
- primeira visita e quantidade de visitas/presenças já registradas;
- autorização de contato;
- Care Requests abertos, vencidos e resolvidos;
- vínculo de grupo somente quando existe `groupId` explícito;
- relação de discipulado somente quando existe documento de `discipleships`;
- acesso condicionado à Lens/capability do usuário.

A regra central continua sendo **NO SOURCE → NO CLAIM**. O Profile não tenta inferir grupo por nome, discipulado por proximidade, afastamento por falta de presença, interesse espiritual, maturidade, humor ou qualquer outro estado subjetivo.

### Lenses e minimização

O Profile consulta somente as fontes que a Lens atual pode ler. Por exemplo, alguém de Cuidado pode enxergar People e Care dentro do escopo permitido sem receber automaticamente acesso a dados de discipulado fora de sua responsabilidade.

A ausência de fonte é exibida como **não registrado**, nunca como conclusão negativa sobre a pessoa.

## 16. Implementação corrente — My Today V1

A quarta vertical slice é **My Today**, disponível em `/my-today`.

Ela funciona como uma inbox operacional cross-module e prioriza somente itens derivados de registros objetivos:

- Care Debt;
- Care Promise vencendo em breve;
- Care Request ainda sem responsável;
- Presence Session aberta;
- grupo com ocupação factual igual ou superior a 85% da capacidade registrada;
- próximo passo explícito de uma relação de discipulado ativa.

A ordenação é determinística e não usa score espiritual ou IA interpretativa. Quando o usuário não tem capability para uma fonte, essa fonte simplesmente não entra na Lens.

### O que My Today não faz

My Today não tenta responder “quem está frio”, “quem perdeu interesse”, “quem está desanimado” ou “quem precisa de discipulado” com base em sinais indiretos. Ele mostra somente compromissos e estados operacionais já registrados, com deep links para Presence Assist, Care Integrity e Journey Profile.

Essa slice prepara o produto para o futuro **Resolve Loop**, no qual uma ação recomendada só poderá existir quando houver uma fonte de verdade e uma operação concreta que possa fechar a pendência.


## 17. Implementação corrente — Groups Runtime V1

A quinta vertical slice é **Groups Runtime**, disponível em `/groups-runtime`.

Ela começa a retirar Groups/Casa de Paz da persistência demonstrativa e leva a operação para o Firestore real, mantendo o nome do produto genérico e deixando a nomenclatura ministerial para configuração da organização.

A slice implementa:

- leitura de grupos reais por organização e congregação;
- criação de grupo com nome, líder, anfitrião, aprendiz, bairro, frequência/dia, horário e capacidade;
- atualização monotônica do documento do grupo, preservando tenant e congregação;
- contagem operacional de participantes;
- sinal factual de atenção quando `participants / capacity >= 85%`;
- capability `canManageGroups` e escopo por congregação;
- PT-BR, EN e ES;
- interface mobile-first paralela à experiência legada.

A ocupação não é tratada como score de saúde espiritual, qualidade do líder ou sucesso ministerial. Nesta fase ela é apenas um dado operacional registrado.

### Limite desta fase

A associação pessoa → grupo ainda não é inferida por nome ou proximidade. O Journey Profile só mostra vínculo individual quando existe uma fonte explícita. Uma estrutura canônica de membership de grupos pode ser adicionada posteriormente sem transformar contagem agregada em lista presumida de participantes.

## 18. Implementação corrente — Discipleship Runtime V1

A sexta vertical slice é **Discipleship Runtime**, disponível em `/discipleship-runtime`.

Ela persiste no Firestore as relações que antes existiam principalmente na experiência legada:

- pessoa explicitamente vinculada à relação;
- discipulador identificado por `disciplerId`;
- encontro atual de 1 a 7 para o playbook Raiz e Mesa;
- status `active`, `paused` ou `completed`;
- próximo passo explícito;
- registro factual de conclusão do encontro;
- ação de pausar e retomar;
- escopo do discipulador: ele só lê e altera relações atribuídas a si, salvo Lens administrativa;
- PT-BR, EN e ES.

O ciclo de sete encontros continua sendo uma característica do playbook **Raiz e Mesa**, não uma regra universal do NestJourney. Futuras Journey Tracks poderão ter outros comprimentos e estruturas.

### Integração com My Today e Journey Profile

My Today passa a levar diretamente para Groups Runtime quando a atenção vem de capacidade e para Discipleship Runtime quando existe próximo passo explícito de discipulado.

Journey Profile e My Today continuam consumidores de fontes; eles não criam fatos subjetivos. Concluir um encontro significa somente que aquele encontro foi registrado como concluído — não que o sistema avaliou maturidade ou transformação espiritual.
