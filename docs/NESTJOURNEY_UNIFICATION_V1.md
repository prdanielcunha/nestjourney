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

Esses itens poderiam permanecer temporariamente na experiência legada durante a migração. O cutover foi concluído: a experiência principal atual usa o runtime real e o shell role-first; o texto abaixo preserva a sequência histórica de implementação.

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


## 19. Cutover da entrada principal — runtime real

Depois da validação e do primeiro deploy das vertical slices, a entrada principal do NestJourney deixa de abrir automaticamente o shell demonstrativo/local do Raiz e Mesa.

A política de roteamento passa a ser:

- `/` → **Journey Overview**, usando fontes reais e Lens autorizada;
- `/my-today` → inbox operacional factual;
- `/presence-assist` → operação real de Presença;
- `/care-integrity` → operação real de Cuidado;
- `/journey-profile` → projeção factual por pessoa;
- `/groups-runtime` → operação real de grupos;
- `/discipleship-runtime` → operação real de discipulado;
- `/legacy` → shell anterior do Raiz e Mesa, mantido temporariamente para implantação, governança e rollback.

Nenhum dado legado é apagado por esse cutover. A mudança é somente de **front door**: usuários entram primeiro na experiência sustentada por Firestore e pelas Rules centrais.

### Performance e rollback

As experiências são carregadas por `React.lazy`, evitando que o shell legado inteiro seja incluído no bundle inicial da Journey Overview. Isso reduz o custo da entrada principal e mantém o módulo legado isolado.

Durante o cutover, `/legacy` serviu como mecanismo temporário de rollback. Com a consolidação do núcleo real, a rota legada foi retirada da navegação e o roteamento atual está centralizado em `src/routeResolver.ts`, coberto por teste. O histórico de dados não depende da interface legada.


## 20. Implementação corrente — Implementation Runtime V1

A implantação de sete semanas sai do estado local/demonstrativo e entra no runtime real em `/implementation-runtime`.

O conteúdo pastoral versionado segue o **Manual de Implantação Raiz e Mesa 2026**: preparação três a cinco dias antes da Semana 1; ritmo fixo de 40–45 minutos; Semana 1 — Coração, missão e cultura; Semana 2 — Presença e Mesa Aberta; Semana 3 — Cuidado e conexão; Semana 4 — Casa de Paz; Semana 5 — Raiz: discipulado inicial; Semana 6 — Serviço, multiplicação e segurança; Semana 7 — Consolidação, compromisso e envio; lançamento progressivo desde a Semana 2; e passagem para um ciclo de 30/60/90 dias depois da Semana 7.

### Fonte e semântica do progresso

PT-BR preserva o conteúdo-base do manual. EN e ES são traduções do mesmo playbook. O Firestore persiste somente a confirmação operacional de que cada ponto de preparação, ensino ou prática foi realizado.

O percentual mostrado é **progresso de checklist**, não score de saúde da igreja, fidelidade, maturidade ou sucesso ministerial.

O progresso é monotônico nesta V1: cada chave pertence à lista canônica do playbook; cada atualização acrescenta no máximo uma chave; uma chave registrada não é silenciosamente removida; o ciclo só assume `completed` quando as 46 chaves canônicas estiverem registradas; tenant, congregação, playbook, autor e timestamps de criação não podem ser reatribuídos; e o cliente não pode fazer hard delete.

### Lens de implantação

A capability `canManageImplementation` é concedida por padrão a owner/admin/pastor/coordinator ou por permissão explícita, sempre dentro do escopo de congregação.

Journey Overview expõe a implantação somente para essa Lens. Quando não existe ciclo, o estado é “não iniciado”; isso não é tratado como falha da igreja.


## 21. Implementação corrente — Governance Runtime V1

A próxima vertical slice substitui a dependência do shell legado para governança cotidiana e fica disponível em `/governance-runtime`.

Ela é sustentada pelos princípios do Manual Mestre e do blueprint do aplicativo: acesso mínimo necessário, consentimento, correção/revogação/exclusão em fluxo controlado, histórico de alterações, retenção e separação entre operação comum e conteúdo pastoral reservado.

### O que entra nesta V1

- visão do papel e das capabilities efetivas que vieram do MillionsNest Hub;
- escopo por congregação;
- fila estruturada de solicitações de `correction`, `consent_revocation`, `deletion_review` e `retention_review`;
- correção limitada a campos operacionais simples (`name`, `phone`, `firstVisit`);
- nenhuma caixa de texto livre para histórias íntimas na fila de privacidade;
- criação atômica de solicitação + evento de auditoria;
- trilha operacional append-only por unidade;
- PT-BR, EN e ES;
- interface mobile-first.

### Papéis e separação de responsabilidades

`canViewGovernance` permite a visão de governança/auditoria para owner, admin, pastor e data_admin, além de permissões explícitas. `canManagePrivacy` fica restrita a owner, admin e data_admin, além de permissões explícitas.

Isso preserva a separação do blueprint: o pastor pode ter visão e encaminhamento sem se tornar automaticamente administrador de solicitações de dados; o administrador de dados cuida de consentimento, correção/exclusão e governança sem ganhar por isso acesso irrestrito a conteúdo pastoral.

Identidade, organização, membership e RBAC continuam canônicos no **MillionsNest Hub**. NestJourney consome o escopo efetivo e não cria um segundo cadastro de usuários/cargos.

### Limite importante da auditoria

A coleção `audit` desta V1 registra eventos de mutação que o produto consegue afirmar de forma append-only. Ela **não é apresentada como uma trilha completa de todos os acessos de leitura**.

Registrar de forma confiável “quem visualizou cada dado sensível” exige uma camada de servidor confiável ou um read proxy/instrumentação equivalente. Registrar isso apenas pelo navegador permitiria omissões e daria uma falsa sensação de conformidade. O produto explicita esse limite na interface.

### Segurança e minimização

Solicitações de privacidade:

- precisam apontar para uma pessoa real da mesma organização e congregação;
- são criadas apenas por uma Lens de governança de dados;
- têm tipo canônico e estado inicial `open`;
- não podem ser atualizadas ou apagadas pelo navegador nesta fase;
- correções aceitam apenas campo permitido e valor novo limitado;
- revogação, exclusão e retenção não aceitam narrativa livre;
- geram um evento de auditoria no mesmo batch.

A execução final de exclusões ou outras mutações destrutivas fica fora do navegador até existir um comando confiável que consiga considerar relacionamentos e políticas de retenção sem deixar referências órfãs.


## 22. Implementação corrente — Pastoral Handoff Runtime V1

O MVP previsto nos materiais do Raiz e Mesa inclui um **pastoral restrito** com somente um marcador de “precisa contato pastoral”; detalhes sensíveis ficam fora do fluxo comum. O Manual de Cuidado e Conexão reforça a mesma fronteira: a equipe registra o necessário e encaminha ao pastor sem transcrever o problema íntimo.

A vertical slice fica disponível em `/pastoral-handoff`.

### Fluxo

Quando um Care Request é encerrado com o outcome `pastoral_handoff`, o mesmo batch:

- resolve o compromisso de Care;
- zera a nota de resolução desse outcome;
- cria um documento determinístico em `pastoralHandoffs/{careRequestId}`;
- registra somente organização, congregação, pessoa, referência ao Care Request, ator, timestamps e estado operacional;
- não armazena motivo livre, diagnóstico, trauma, confissão, história familiar ou pedido detalhado.

A Rules valida o handoff com `getAfter()`: o marcador só pode nascer se o Care Request correspondente estiver sendo resolvido no mesmo write com `resolutionCode = pastoral_handoff` pelo mesmo ator.

### Lens pastoral

`canManagePastoral` é restrita por padrão a owner/pastor e administradores do ecossistema, ou a uma permissão explícita. Um admin comum da organização não recebe acesso pastoral automaticamente.

A equipe de Cuidado pode **criar** o marcador somente como consequência do handoff válido, mas não pode ler a fila reservada.

O pastor pode:

- visualizar somente os marcadores da congregação em seu escopo;
- enxergar quem precisa de contato;
- registrar que o contato pastoral foi realizado;
- não adicionar narrativa ao marcador.

Journey Overview mostra a quantidade de encaminhamentos abertos somente para a Lens pastoral. My Today também apresenta o marcador como pendência factual quando essa Lens está disponível.

### Emergências e proteção

O produto não transforma a fila pastoral em canal de emergência. Os manuais determinam encaminhamento imediato em risco de suicídio/autoagressão, violência, abuso, risco infantil, emergência médica, alegação de crime ou situação insegura.

A interface deixa explícito que nesses casos a equipe não deve aguardar o aplicativo: deve acionar o pastor responsável e seguir os protocolos legais e de proteção aplicáveis.

Essa separação evita um erro perigoso de UX: um registro em banco não substitui uma ação humana imediata.


## 23. Implementação corrente — Group Membership Runtime V1

O blueprint do aplicativo define Casas de Paz com **casa, dia, bairro, líder, capacidade, participantes, presença e pedido de entrada**. O Manual Mestre também estabelece que o líder da Casa deve enxergar somente os participantes da sua própria Casa. Esta slice começa a substituir a contagem agregada por vínculos explícitos pessoa → Casa, sem inferir pertencimento.

### Fonte canônica de vínculo

A coleção `groupMemberships` passa a registrar:

- organização e congregação;
- `groupId` e `personId`;
- estado `active` ou `left`;
- quem criou/encerrou o vínculo e quando.

Não há campo de nota livre. Participação em Casa não é usada como indicador de conversão, maturidade, caráter, interesse espiritual ou saúde da pessoa.

O id da associação é determinístico por grupo + pessoa. Isso impede duplicatas silenciosas do mesmo vínculo ativo.

### Roster e escopo

Owner, admin e pastor podem administrar os rosters dentro do escopo de congregação. Um `group_leader` comum só consegue abrir e alterar o roster quando:

- é o `leaderId` daquela Casa; ou
- é o usuário que criou a Casa, como compatibilidade para grupos antigos criados antes de `leaderId` ser preenchido.

Um líder de outra Casa na mesma congregação não recebe a lista de participantes.

A lista é apresentada em uma interface mobile-first de **Gerenciar pessoas**. Owner/admin/pastor podem consultar candidatos operacionais; o líder comum da Casa não navega a lista geral da congregação e trabalha somente com seus participantes e pedidos encaminhados para a Casa.

### Contagem e atomicidade

Adicionar ou encerrar um vínculo ocorre em transação junto com a projeção numérica `groups.participants`.

O repositório do aplicativo atualiza a associação e a projeção `groups.participants` na mesma transação e impede novas entradas quando a capacidade registrada foi atingida.

As Rules mantêm as fronteiras críticas: o vínculo precisa pertencer à mesma congregação da pessoa e da Casa, somente o roster autorizado pode alterá-lo e o navegador não pode fazer hard delete da associação.

Assim, `participants` continua útil para painéis e alertas de capacidade, enquanto o vínculo individual passa a possuir fonte explícita.

### Journey Profile

O Journey Profile prioriza associações ativas de `groupMemberships`.

O antigo `person.groupId` continua apenas como fallback de compatibilidade quando ainda não existe nenhuma associação explícita. O sistema nunca busca um grupo por nome, proximidade, frequência ou outro sinal indireto.

Essa estratégia permite migrar o legado gradualmente sem fabricar participantes que não foram identificados.


## 24. Implementação corrente — Casa Entry Request Runtime V1

O blueprint do aplicativo inclui explicitamente **“pedido de entrada”** no MVP de Casas de Paz. Ele não define um formulário detalhado nem exige justificativa narrativa. Por isso, esta implementação adota a forma mínima necessária para tornar esse próximo passo operacional e auditável sem inventar conteúdo pastoral.

### O que é fonte e o que é decisão de produto

**Fonte:** Casas de Paz possuem pedido de entrada; o MVP é interno para líderes autorizados; acesso deve seguir o mínimo necessário; o líder da Casa enxerga somente o que precisa; o produto deve evitar notas subjetivas e prontuários íntimos.

**Decisão de implementação desta V1:** representar o pedido como um registro estruturado com estado `pending | accepted | declined`, pessoa, Casa, congregação, ator e timestamps. Essa estrutura é uma escolha técnica para operacionalizar o requisito sem adicionar narrativa que os materiais não pedem.

### Fluxo

A coleção `groupEntryRequests` registra somente:

- organização e congregação;
- `groupId` e `personId`;
- nome operacional da pessoa para a Lens do líder da Casa;
- estado `pending`, `accepted` ou `declined`;
- quem encaminhou e quando;
- quem resolveu e quando.

Não existe campo de “motivo”, “perfil”, “nível espiritual”, observação livre ou justificativa da recusa.

Owner/admin/pastor podem encaminhar uma pessoa já cadastrada para uma Casa dentro do mesmo escopo. Um `group_leader` comum não recebe a lista geral de candidatos da congregação; ele vê os participantes já vinculados e os pedidos que foram roteados explicitamente para a sua Casa.

### Aceite e vínculo

Aceitar um pedido não é apenas mudar um status visual.

O repositório resolve o pedido em transação junto com o vínculo `groupMemberships` e a projeção numérica `groups.participants`. A capacidade registrada é verificada antes da entrada.

As Rules também exigem que um pedido marcado como `accepted` termine o mesmo write com uma associação ativa pessoa → Casa compatível com organização, congregação, grupo e pessoa. Isso evita a afirmação “aceito” sem a fonte operacional correspondente.

### Recusa

Recusar encerra o pedido em `declined` sem armazenar motivo.

A ausência de justificativa é intencional: o blueprint pede pedido de entrada, não um prontuário de avaliação da pessoa. Se alguma situação exigir cuidado pastoral, ela deve usar a Lens pastoral apropriada em vez de contaminar o fluxo de Casa com narrativa sensível.

Pedidos resolvidos não são apagados pelo navegador e não voltam para `pending`. Um novo encaminhamento futuro nasce como um novo registro, preservando o evento anterior.


## 25. Implementação corrente — First Contact / Follow-up Runtime V1

Esta vertical slice fecha uma lacuna entre **Visitor Registration**, **Care Integrity** e a futura execução pelo **MillionsNest Connect**.

Os materiais do Raiz e Mesa orientam que o primeiro contato aconteça rapidamente — preferencialmente por volta de 24 horas e, como limite operacional inicial, até 48 horas — respeitando autorização de contato, registrando somente que o contato aconteceu e qual é o próximo passo. O blueprint atual do NestJourney também descreve a sequência visitante → responsável → primeiro contato → resultado → próximo passo e inclui os fatos canônicos `FOLLOWUP_CREATED` e `FOLLOWUP_COMPLETED`.

### Fronteira entre NestJourney e Connect

O NestJourney é autoridade sobre:

- a tarefa de acompanhamento;
- responsável;
- prazo;
- vínculo com a Care Promise de origem;
- resultado estruturado;
- próxima ação operacional derivada;
- evidência e fatos canônicos.

O NestJourney **não afirma que enviou WhatsApp, SMS, e-mail ou ligação** nesta V1.

A execução de comunicação pertence ao MillionsNest Connect. Enquanto a integração Connect não estiver ligada a este fluxo, a interface orienta o responsável a usar um canal autorizado e depois registrar somente o resultado humano observado.

Assim, uma mensagem preparada ou enviada futuramente pelo Connect não será confundida com “necessidade resolvida”.

### Fonte factual

Um acompanhamento de primeiro contato só pode nascer quando existe:

- Care Request aberto do tipo `first_contact`;
- responsável explicitamente atribuído;
- pessoa da mesma congregação;
- consentimento de contato registrado;
- telefone disponível;
- prazo herdado da Care Promise.

O id é determinístico por Care Request: `first-contact-{careRequestId}`.

A criação grava no mesmo batch o documento de acompanhamento e o fato `FOLLOWUP_CREATED`. O fato aponta para `followup:{id}` como evidência.

### Resultado estruturado

A V1 não possui caixa de texto livre no resultado. Os resultados canônicos desta slice são:

- `responded` — respondeu;
- `prayer_requested` — pediu oração;
- `group_interest` — demonstrou interesse em grupo;
- `declined_contact` — não deseja contato;
- `invalid_contact` — dado de contato inválido;
- `no_response` — não houve resposta registrada.

Nenhum deles significa fé, conversão, interesse espiritual, humor, caráter ou afastamento.

`no_response` significa somente isso: **não há resposta registrada naquela tentativa/processo**.

### Próxima ação determinística

A aplicação projeta uma próxima ação operacional simples, sem LLM:

- respondeu → nenhuma ação automática;
- pediu oração → abrir cuidado de oração;
- interesse em grupo → avaliar próximo passo em Grupos;
- não deseja contato → nenhuma insistência automática;
- contato inválido → revisar dado de contato;
- sem resposta → revisão manual.

Nesta V1, essa projeção direciona a interface para o módulo apropriado; ela não cria silenciosamente uma nova ação irreversível.

### Fechamento da Care Promise

Concluir o acompanhamento ocorre atomicamente com:

1. `followups.status = completed`;
2. resultado e próxima ação estruturados;
3. Care Request de origem resolvido com código compatível;
4. fato `FOLLOWUP_COMPLETED`;
5. fato `CARE_RESOLVED`.

As Firestore Rules validam que resultado, próxima ação e resolução da Care Promise são compatíveis entre si e que a fonte foi atualizada no mesmo write.

Por isso, o sistema não pode gravar “contato concluído” apenas porque alguém abriu a tela ou preparou uma mensagem.

### UX e migração do fluxo existente

Care Integrity continua sendo a fila de compromissos e Care Debt.

Quando um `first_contact` já possui responsável, sua ação principal deixa de ser uma resolução genérica e passa a abrir o **Follow-up Runtime**. Outros tipos de Care Request continuam usando o fluxo de outcome do Care Integrity.

Isso preserva o que já funcionava e especializa somente o fluxo que possui requisitos próprios de primeiro contato.


## 26. Implementação corrente — Resolve Loop V1 com MillionsNest Connect

A primeira integração operacional entre **NestJourney** e **MillionsNest Connect** fecha o ciclo entre uma pendência factual e uma ação humana sem transferir a autoridade do cuidado para o canal de comunicação.

### Fluxo

1. um Care Request de `first_contact` atribuído ao responsável gera o Follow-up factual;
2. o NestJourney envia ao Hub apenas um destino allow-listed contendo o id opaco do Follow-up;
3. o Hub faz o handoff autenticado para o Connect, sem colocar nome, telefone ou narrativa pastoral na URL;
4. o Connect pede ao Hub, server-to-server e com o mesmo Firebase bearer transitório, a projeção mínima necessária;
5. o Hub revalida organização, entitlement do NestJourney, capability de Care, congregação, owner do Follow-up, consentimento, pessoa e Care Request de origem;
6. o Connect apresenta um roteiro de primeiro contato baseado no Manual de Cuidado e Conexão e abre o composer do WhatsApp;
7. o usuário retorna ao NestJourney, que continua sendo a autoridade para registrar o outcome estruturado e resolver a Care Promise.

### Fronteira de verdade

**Abrir um rascunho no WhatsApp não é envio e não é resolução.**

Esta V1 não possui confirmação de entrega pelo provider e, portanto, o Connect não grava `message_sent`, não conclui a Care Promise e não fabrica evidência de contato. O outcome só existe quando o responsável volta ao NestJourney e registra o que observou.

A URL de handoff contém somente o id do Follow-up. Nome e telefone são liberados para a superfície autenticada do Connect somente depois da revalidação server-side e não entram nos logs da boundary.

### Roteiro ministerial

O texto sugerido preserva a intenção do Manual de Cuidado e Conexão Raiz e Mesa 2026: agradecer a presença, comunicar acolhimento, dizer que a pessoa pode contar com a igreja e oferecer oração. O usuário pode ajustar a saudação antes de abrir o canal.

A interface não oferece campo para transcrever confissão, diagnóstico, trauma, conflito familiar ou detalhes íntimos.

### Rollback e independência

O Follow-up continua funcional mesmo sem o Connect: o registro de outcome permanece no NestJourney. A integração é um acelerador da execução do contato, não uma nova fonte de verdade e não altera o modelo Firestore canônico do Follow-up.
