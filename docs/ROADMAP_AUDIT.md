# Auditoria de produto e roadmap — NestJourney

Data da revisão: **20 de setembro de 2026**  
Estado: **núcleo em produção; refinamento premium consolidado**.

## Escopo revisado

A auditoria cruza o produto com os oito documentos Raiz e Mesa 2026 e com as decisões posteriores de produto: NestJourney como SaaS independente, multi-tenant, mobile-first, integrado ao MillionsNest e configurável para outras igrejas.

O princípio permanece: tecnologia deve desaparecer atrás do cuidado. O software organiza fatos e responsabilidades; não cria ranking espiritual, diagnóstico, julgamento de interesse ou prontuário íntimo.

## Cobertura funcional atual

| Área | Requisito consolidado | Evidência no produto | Situação |
| --- | --- | --- | --- |
| SaaS | múltiplas igrejas, unidades e nomes próprios | tenant por organização, escopo por unidade e nomenclaturas configuráveis | Implementado |
| Ecossistema | identidade e organização compartilhadas | Firebase `millionsnest`, membership canônica, entitlement e entrada direta/Hub | Em produção |
| Hoje | “quem precisa de cuidado hoje?” | Action Center por papel, urgência factual e CTA direto | Implementado |
| UX por papel | cada líder vê o que precisa | navegação e atalhos filtrados por capability; Vision só para gestão | Implementado |
| Estados vazios | nunca deixar “e agora?” | estados guiados em Pessoas, Presença, Mesa, Cuidado, Follow-up, Casas, Raiz, Relatórios, Pastoral e Equipe | Implementado |
| Implantação | ciclo de sete semanas | playbook persistido por unidade, prática e progresso | Implementado |
| Presença | visita, retorno e vínculo | sessão, presença/ausência explicitamente confirmadas, visitante mínimo, vínculo governado, correção auditável e cobertura registrada no encerramento | Implementado |
| Ausência → Cuidado | transformar evidência factual em responsabilidade humana sem inferência | ausência confirmada + sessão encerrada/elegível + contato autorizado → Care Promise única, sem responsável até alguém assumir | Implementado |
| Mesa | preparação, convite e participação | checklist, convidados e registro factual de participação | Implementado |
| Pessoas | cadastro mínimo e jornada factual | consentimento, visitas, vínculos, cuidado, grupos e discipulado conforme Lens | Implementado |
| Cuidado | contato em ~24h, máximo 48h | Care Promise, responsável, prazo, resultado e Care Debt | Implementado |
| Follow-up | contato humano com resultado | Resolve Loop, integração segura com Connect e próximo passo estruturado | Implementado |
| Segurança humana | risco exige encaminhamento | marcador pastoral, aviso explícito e ausência de notas íntimas | Implementado |
| Casas | líder, anfitrião, aprendiz, bairro, horário e capacidade | gestão da Casa, roster explícito, pedidos de entrada e encontros | Implementado |
| Casas | ideal 6–10, máximo 12 | política de capacidade e atenção operacional | Implementado |
| Raiz | relação pessoal, sete encontros | discipulador, encontro 1–7, próxima data, pausa/conclusão | Implementado |
| Pastoral | decisão sem prontuário | fila restrita com marcador factual | Implementado |
| Gestão | leitura rápida da operação | Vision com métricas objetivas, comparação entre unidades e Care Debt | Implementado |
| CEO | leitura entre organizações | seletor de organizações habilitadas e inspeção das unidades sem trocar de login | Implementado |
| Simulação | entender experiências por papel | preview somente leitura das responsabilidades na Vision | Implementado |
| Equipe | responsabilidade e escopo | papéis NestJourney sobre membership canônica; membros/convites ficam no Hub | Implementado |
| LGPD | minimização e consentimento | contato opcional, revogação/correção, governança e limites explícitos; revogação bloqueia Connect e encerra contato pendente de forma factual | Implementado |
| Operações de privacidade | tratar solicitações sem edição destrutiva livre | correção e revogação auditadas; exclusão/retenção encaminhadas para execução protegida | Implementado |
| Auditoria | mudanças operacionais rastreáveis | eventos append-only e regras testadas | Implementado |
| Relatórios | indicadores objetivos | pessoas, cuidado, sessões, grupos, Raiz e pastoral sem score espiritual | Implementado |
| Customização | nomes locais | nomes de Recepção, Mesa, Cuidado, Casas e Raiz configuráveis | Implementado |
| PWA | mobile-first | manifest, service worker, Firebase Hosting e navegação com safe area | Em produção |
| Idiomas | PT/EN/ES | interface e orientação contextual nos três idiomas | Implementado |
| Qualidade | gates antes de produção | lint, testes, TypeScript, build, Rules e smoke de Hosting | Automatizado |
| Rules em produção | impedir diferença entre código validado e política ativa | deploy de Firestore Rules ocorre antes do Hosting na promoção de production | Automatizado |
| Resiliência de acesso | evitar login/carregamento infinito | timeout explícito para autenticação e resolução de acesso, retry guiado e fallback para o Hub | Implementado |
| Conectividade | deixar claro quando a rede caiu | aviso global offline sem transformar falha de rede em erro de permissão ou dado | Implementado |
| Recuperação de interface | evitar tela em branco em falha de render | error boundary global com reload e retorno ao Hoje | Implementado |
| Recuperação de rota restrita | impedir becos sem saída ao abrir deep links sem permissão | estado comum com retorno ao Hoje, explicação de acesso, Ajuda e retry quando aplicável | Implementado |

## UX final consolidada

### Hoje

A tela não é um dashboard genérico. Ela responde primeiro **o que fazer agora**.

Exemplos:

- cuidado vencido → resolver;
- Care Promise próximo do prazo → contatar;
- sessão aberta → continuar Presença;
- Mesa não preparada → preparar;
- Casa próxima da capacidade → revisar;
- encontro do Raiz registrado → abrir relação;
- encaminhamento pastoral → abrir fila restrita.

Quando a fila está limpa, a tela não inventa pendência: recomenda o próximo movimento normal daquele papel.

### Mobile

A navegação principal foi reduzida ao essencial. Itens sem autorização não são usados como atalhos. Perfis operacionais recebem acesso direto à própria frente; liderança recebe Visão.

A barra respeita safe area, os formulários evitam zoom involuntário no iOS e os alvos de toque foram ampliados.

### Visão de liderança

Admin, pastor e CEO conseguem mudar de unidade e ler rapidamente:

- pessoas;
- cuidados abertos;
- Care Debt;
- cuidados sem responsável;
- maior carga;
- jornadas sem próximo passo factual;
- sessões abertas;
- grupos;
- relações ativas do Raiz;
- encaminhamentos pastorais;
- auditoria disponível.

CEO pode trocar de organização habilitada e inspecionar suas unidades sem simular membership local.

## Deliberações preservadas

Continuam deliberadamente fora do escopo do NestJourney:

- financeiro, dízimos e ofertas;
- streaming;
- escala de louvor;
- rede social;
- chat irrestrito;
- gamificação;
- ranking de líderes;
- “nível espiritual”;
- IA aconselhando pastoralmente de forma autônoma;
- prontuário de trauma, confissão, saúde ou vida íntima.

Esses itens não são “pendências”; são limites do produto.

## Definition of Done do núcleo 2026

O núcleo é considerado pronto quando:

1. cada responsabilidade sabe onde começar;
2. nenhuma ação principal exige navegar por tentativa e erro;
3. estado vazio explica o próximo passo;
4. CEO/Admin/Pastor têm leitura de gestão;
5. escopo e RBAC impedem acesso indevido;
6. dados sensíveis permanecem minimizados;
7. PT/EN/ES continuam funcionais;
8. desktop e mobile usam a mesma verdade de produto;
9. `npm run check` e `npm run test:rules` passam;
10. produção é promovida por CI e o domínio oficial passa no smoke test;
11. autenticação e resolução de acesso não podem deixar o usuário indefinidamente em loading;
12. perda de conexão precisa ser comunicada sem inventar estado operacional;
13. uma falha de render precisa oferecer recuperação explícita em vez de tela em branco;
14. um deep link sem permissão precisa explicar o limite do papel e oferecer uma saída segura, sem deixar o usuário preso;
15. correção ou revogação de dados pessoais precisa nascer de solicitação estruturada, ser auditável e não permitir edição solta do cadastro;
16. as Firestore Rules validadas pelo CI precisam ser promovidas antes do frontend que depende delas;
17. ausência só pode originar cuidado quando for explicitamente confirmada, vier de sessão encerrada com cobertura elegível e houver autorização de contato;
18. revogação de autorização precisa bloquear qualquer abertura de canal e oferecer encerramento factual do compromisso, sem tentativa de contato.

Depois desse ponto, novas entregas são evolução de produto orientada por uso real — não correção de uma arquitetura incompleta.
