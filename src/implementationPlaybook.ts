import type { AppLocale } from './i18n'

export const RAIZ_E_MESA_IMPLEMENTATION_PLAYBOOK_ID = 'raiz_e_mesa_2026' as const

export interface ImplementationWeek {
  week: number
  title: string
  objective: string
  facilitatorQuote: string
  scriptures: string[]
  teaching: string[]
  practice: string
}

export interface ImplementationPlaybook {
  title: string
  subtitle: string
  progressiveDecision: string
  preparationIntro: string
  preparation: string[]
  rhythm: Array<{ block: string; time: string; objective: string }>
  weeks: ImplementationWeek[]
}

const pt: ImplementationPlaybook = {
  title: 'Implantação Raiz e Mesa',
  subtitle: 'Ciclo pastoral de 7 semanas com treinamento e prática progressiva.',
  progressiveDecision: 'Manter 7 semanas, com lançamento progressivo. Semana 2 já muda o domingo; semana 3 já inicia o cuidado; semana 4 prepara a primeira Casa de Paz; semana 5 já pode abrir os primeiros Raiz quando houver pessoas prontas.',
  preparationIntro: 'O pastor não começa a Semana 1 improvisando. Três a cinco dias antes, o núcleo pastoral prepara o terreno.',
  preparation: [
    'Ler o Manual Mestre.',
    'Definir quem conduz os 40-45 minutos após a fala pastoral.',
    'Escolher provisoriamente 1 coordenador de Presença e 1 de Cuidado por igreja; confirmação final pode acontecer após a Semana 1.',
    'Mapear 4-8 pessoas confiáveis que podem servir.',
    'Definir onde a Mesa Aberta ficará fisicamente.',
    'Definir ferramenta temporária de cadastro/controle com acesso restrito.',
    'Definir a data provável da primeira Casa de Paz piloto.',
  ],
  rhythm: [
    { block: 'Relembrar propósito e oração', time: '4-5 min', objective: 'Cristo e missão antes da tarefa.' },
    { block: 'Fundamento bíblico', time: '7-8 min', objective: 'Por que essa prática existe.' },
    { block: 'Treinamento da semana', time: '15 min', objective: 'Uma habilidade principal.' },
    { block: 'Simulação / caso real', time: '8-10 min', objective: 'Transformar explicação em comportamento.' },
    { block: 'Tarefa da semana + dúvidas', time: '5-7 min', objective: 'Definir o que começa imediatamente.' },
  ],
  weeks: [
    {
      week: 1, title: 'Coração, missão e cultura',
      objective: 'A igreja precisa desejar ser mais parecida com Jesus antes de desejar executar um sistema.',
      facilitatorQuote: 'Nós não estamos começando mais um programa. Estamos reconhecendo algo simples: Deus coloca pessoas diante de nós e queremos aprender a amá-las melhor, apresentá-las a Cristo e caminhar com elas. Raiz e Mesa não leva pessoas por um sistema; coloca pessoas ao lado de pessoas até que criem raízes em Cristo e aprendam a fazer o mesmo por outras.',
      scriptures: ['Mateus 28:18-20', 'João 13:34-35', '1 Tessalonicenses 2:8', 'Colossenses 2:6-7'],
      teaching: ['Explicar o fluxo completo sem detalhar cargos.','Contar 1-2 histórias reais de cuidado, sem expor pessoas.','Ensinar que hospitalidade é vocação da igreja inteira.','Apresentar o compromisso de sete semanas como experiência de formação, não teste de lealdade.'],
      practice: 'Cada participante deve, no próximo culto, aprender o nome de uma pessoa com quem normalmente não conversaria e ficar alguns minutos na comunhão.',
    },
    {
      week: 2, title: 'Presença e Mesa Aberta',
      objective: 'Ensinar o domingo acolhedor e lançar imediatamente a Mesa Aberta.',
      facilitatorQuote: 'Recepcionar não é ficar na porta. É diminuir a ansiedade de quem chega, perceber quem está sozinho e criar uma ponte sem invadir.',
      scriptures: ['Romanos 12:13', '1 Pedro 4:9', 'Atos 2:42-47'],
      teaching: ['Apresentar funções de entrada, salão e vínculo.','Treinar scripts de boas-vindas e escolha de assento.','Treinar convite à Mesa Aberta.','Explicar comportamento no apelo sem pressão.','Definir escala do próximo domingo.'],
      practice: 'No próximo culto, iniciar Mesa Aberta para todos. Fazer debrief de 10 minutos depois.',
    },
    {
      week: 3, title: 'Cuidado e conexão',
      objective: 'Colocar o cuidado de 24-48 horas em funcionamento e ensinar consentimento e limites.',
      facilitatorQuote: 'Nós não coletamos telefone para controlar gente. Pedimos autorização porque queremos continuar disponíveis depois do domingo.',
      scriptures: ['Gálatas 6:2', 'Romanos 12:15', '1 Tessalonicenses 2:8'],
      teaching: ['Treinar pedido de contato opcional.','Treinar primeira mensagem, ausência e pedido de oração.','Explicar quando mensagem vira ligação.','Ensinar LGPD, notas mínimas e encaminhamento pastoral.'],
      practice: 'Todo contato autorizado do próximo culto recebe mensagem em aproximadamente 24 horas e no máximo 48. Revisar respostas na semana seguinte.',
    },
    {
      week: 4, title: 'Casa de Paz',
      objective: 'Ensinar o pequeno ambiente relacional e preparar a primeira Casa piloto.',
      facilitatorQuote: 'Casa de Paz não é um culto menor. É uma mesa menor: Bíblia, conversa, oração e gente aprendendo a caminhar junto.',
      scriptures: ['Atos 2:46', 'Atos 20:20', 'Hebreus 10:24-25'],
      teaching: ['Apresentar tamanho ideal 6-10, máximo 12.','Definir líder, anfitrião e aprendiz.','Treinar convite pessoal e acompanhamento na primeira vez.','Explicar que o conteúdo continua sendo o livro da Casa de Paz já usado pela igreja.','Simular os 50 minutos.'],
      practice: 'Confirmar a equipe da primeira Casa, convidados e data. Realizar piloto na semana 4 ou 5, conforme preparo.',
    },
    {
      week: 5, title: 'Raiz: discipulado inicial',
      objective: 'Treinar pessoas maduras para caminhar pessoalmente com quem demonstra fome espiritual.',
      facilitatorQuote: 'Raiz não é responder todas as perguntas em sete aulas. É abrir a Bíblia com alguém, apresentar Cristo, ouvir, orar e ajudá-lo a começar uma vida de discipulado.',
      scriptures: ['Colossenses 2:6-7', '2 Timóteo 2:2', 'Mateus 28:20'],
      teaching: ['Explicar os sete encontros.','Treinar escuta e perguntas abertas.','Definir quem pode discipular e quem ainda precisa ser formado.','Explicar conexão com o material oficial da OBPC.','Praticar convite ao Raiz.'],
      practice: 'Selecionar apenas pessoas realmente prontas. Se houver candidatos, iniciar 1-2 relações de Raiz; se não houver, não forçar.',
    },
    {
      week: 6, title: 'Serviço, multiplicação e segurança',
      objective: 'Ensinar que servir é fruto da vida em Cristo e que liderança exige caráter.',
      facilitatorQuote: 'Nosso alvo não é ocupar vagas. Queremos que cada pessoa descubra como pode servir a Jesus e ao próximo, e que um dia quem foi cuidado esteja pronto para cuidar de alguém.',
      scriptures: ['1 Pedro 4:10', 'Efésios 4:11-16', '1 Timóteo 3:6', '2 Timóteo 2:2'],
      teaching: ['Separar serviço simples de função sensível.','Explicar critérios para futuro discipulador e líder de Casa.','Treinar limites de aconselhamento, proteção e confidencialidade.','Mostrar como uma Casa saudável gera um aprendiz antes de multiplicar.'],
      practice: 'Cada líder identifica alguém que pode ser formado, sem prometer função. Revisar riscos de sobrecarga.',
    },
    {
      week: 7, title: 'Consolidação, compromisso e envio',
      objective: 'Encerrar o ciclo sem encerrar a cultura. Consolidar donos, ritmos e próximos 90 dias.',
      facilitatorQuote: 'As sete semanas terminam; o modo de viver começa. O sucesso não é saber o manual. É ver uma igreja que percebe pessoas, abre a mesa, cuida, discipula e envia.',
      scriptures: ['João 13:35', 'Atos 2:47', 'Colossenses 2:6-7'],
      teaching: ['Revisar o fluxo inteiro.','Compartilhar histórias reais das semanas anteriores.','Confirmar coordenadores e equipes para 90 dias.','Revisar métricas e falhas.','Orar e comissionar sem promessas de números.'],
      practice: 'Entrar em ciclo de 30/60/90 dias com reuniões curtas e ajustes.',
    },
  ],
}

const translations: Record<Exclude<AppLocale,'pt-BR'>, ImplementationPlaybook> = {
  en: {
    title:'Raiz e Mesa Implementation', subtitle:'A 7-week pastoral cycle with progressive training and practice.',
    progressiveDecision:'Keep the 7 weeks with progressive rollout. Week 2 already changes Sunday; week 3 starts care; week 4 prepares the first Casa de Paz; week 5 may open the first Raiz relationships when people are ready.',
    preparationIntro:'The pastor does not begin Week 1 by improvising. Three to five days before, the pastoral core prepares the ground.',
    preparation:['Read the Master Manual.','Define who leads the 40-45 minutes after the pastoral message.','Provisionally choose 1 Presence coordinator and 1 Care coordinator per church; final confirmation may happen after Week 1.','Map 4-8 trustworthy people who may serve.','Define where Mesa Aberta will physically take place.','Define a temporary registration/control tool with restricted access.','Define the likely date of the first Casa de Paz pilot.'],
    rhythm:[{block:'Recall purpose and pray',time:'4-5 min',objective:'Christ and mission before the task.'},{block:'Biblical foundation',time:'7-8 min',objective:'Why this practice exists.'},{block:'Weekly training',time:'15 min',objective:'One main skill.'},{block:'Simulation / real case',time:'8-10 min',objective:'Turn explanation into behavior.'},{block:'Weekly task + questions',time:'5-7 min',objective:'Define what begins immediately.'}],
    weeks:[
      {week:1,title:'Heart, mission, and culture',objective:'The church needs to desire to become more like Jesus before desiring to execute a system.',facilitatorQuote:'We are not starting another program. We are recognizing something simple: God places people before us, and we want to learn to love them better, introduce them to Christ, and walk with them. Raiz e Mesa does not move people through a system; it places people beside people until they take root in Christ and learn to do the same for others.',scriptures:pt.weeks[0].scriptures,teaching:['Explain the full flow without detailing roles.','Share 1-2 real care stories without exposing people.','Teach that hospitality is the calling of the whole church.','Present the seven-week commitment as a formation experience, not a loyalty test.'],practice:'At the next service, each participant should learn the name of someone they would not normally speak with and spend a few minutes in fellowship.'},
      {week:2,title:'Presence and Mesa Aberta',objective:'Teach a welcoming Sunday and launch Mesa Aberta immediately.',facilitatorQuote:'Welcoming is not just standing at the door. It is reducing the anxiety of the person arriving, noticing who is alone, and building a bridge without intruding.',scriptures:pt.weeks[1].scriptures,teaching:['Present entrance, room, and connection roles.','Practice welcome scripts and helping someone choose a seat.','Practice the Mesa Aberta invitation.','Explain behavior during the altar call without pressure.','Define the roster for next Sunday.'],practice:'At the next service, start Mesa Aberta for everyone. Hold a 10-minute debrief afterward.'},
      {week:3,title:'Care and connection',objective:'Put 24-48 hour care into operation and teach consent and boundaries.',facilitatorQuote:'We do not collect phone numbers to control people. We ask permission because we want to remain available after Sunday.',scriptures:pt.weeks[2].scriptures,teaching:['Practice asking for optional contact permission.','Practice the first message, absence check-in, and prayer request.','Explain when a message becomes a phone call.','Teach LGPD, minimal notes, and pastoral handoff.'],practice:'Every authorized contact from the next service receives a message in approximately 24 hours and no later than 48. Review responses the following week.'},
      {week:4,title:'Casa de Paz',objective:'Teach the small relational environment and prepare the first pilot Casa.',facilitatorQuote:'Casa de Paz is not a smaller church service. It is a smaller table: Bible, conversation, prayer, and people learning to walk together.',scriptures:pt.weeks[3].scriptures,teaching:['Present the ideal size of 6-10, maximum 12.','Define leader, host, and apprentice.','Practice personal invitation and first-time follow-up.','Explain that the content remains the Casa de Paz book already used by the church.','Simulate the 50 minutes.'],practice:'Confirm the first Casa team, guests, and date. Run the pilot in week 4 or 5, according to readiness.'},
      {week:5,title:'Raiz: initial discipleship',objective:'Train mature people to walk personally with those who demonstrate spiritual hunger.',facilitatorQuote:'Raiz is not answering every question in seven classes. It is opening the Bible with someone, presenting Christ, listening, praying, and helping them begin a life of discipleship.',scriptures:pt.weeks[4].scriptures,teaching:['Explain the seven meetings.','Practice listening and open questions.','Define who may disciple and who still needs formation.','Explain the connection with the official OBPC material.','Practice the invitation to Raiz.'],practice:'Select only people who are truly ready. If there are candidates, begin 1-2 Raiz relationships; if there are not, do not force it.'},
      {week:6,title:'Service, multiplication, and safety',objective:'Teach that serving is fruit of life in Christ and that leadership requires character.',facilitatorQuote:'Our goal is not to fill vacancies. We want each person to discover how they can serve Jesus and their neighbor, and that one day the person who was cared for may be ready to care for someone else.',scriptures:pt.weeks[5].scriptures,teaching:['Separate simple service from sensitive roles.','Explain criteria for future disciplers and Casa leaders.','Train counseling boundaries, protection, and confidentiality.','Show how a healthy Casa develops an apprentice before multiplying.'],practice:'Each leader identifies someone who may be formed, without promising a role. Review overload risks.'},
      {week:7,title:'Consolidation, commitment, and sending',objective:'End the cycle without ending the culture. Consolidate ownership, rhythms, and the next 90 days.',facilitatorQuote:'The seven weeks end; the way of life begins. Success is not knowing the manual. It is seeing a church that notices people, opens the table, cares, disciples, and sends.',scriptures:pt.weeks[6].scriptures,teaching:['Review the entire flow.','Share real stories from previous weeks.','Confirm coordinators and teams for 90 days.','Review metrics and failures.','Pray and commission without promising numbers.'],practice:'Enter a 30/60/90-day cycle with short meetings and adjustments.'},
    ],
  },
  es: {
    title:'Implementación Raiz e Mesa', subtitle:'Ciclo pastoral de 7 semanas con entrenamiento y práctica progresiva.',
    progressiveDecision:'Mantener 7 semanas, con lanzamiento progresivo. La semana 2 ya cambia el domingo; la semana 3 inicia el cuidado; la semana 4 prepara la primera Casa de Paz; la semana 5 ya puede abrir los primeros Raiz cuando haya personas preparadas.',
    preparationIntro:'El pastor no comienza la Semana 1 improvisando. Tres a cinco días antes, el núcleo pastoral prepara el terreno.',
    preparation:['Leer el Manual Maestro.','Definir quién conduce los 40-45 minutos después de la palabra pastoral.','Elegir provisionalmente 1 coordinador de Presencia y 1 de Cuidado por iglesia; la confirmación final puede ocurrir después de la Semana 1.','Mapear 4-8 personas confiables que puedan servir.','Definir dónde estará físicamente Mesa Aberta.','Definir una herramienta temporal de registro/control con acceso restringido.','Definir la fecha probable de la primera Casa de Paz piloto.'],
    rhythm:[{block:'Recordar propósito y oración',time:'4-5 min',objective:'Cristo y misión antes de la tarea.'},{block:'Fundamento bíblico',time:'7-8 min',objective:'Por qué existe esta práctica.'},{block:'Entrenamiento de la semana',time:'15 min',objective:'Una habilidad principal.'},{block:'Simulación / caso real',time:'8-10 min',objective:'Transformar explicación en comportamiento.'},{block:'Tarea de la semana + dudas',time:'5-7 min',objective:'Definir lo que comienza inmediatamente.'}],
    weeks:[
      {week:1,title:'Corazón, misión y cultura',objective:'La iglesia necesita desear parecerse más a Jesús antes de desear ejecutar un sistema.',facilitatorQuote:'No estamos comenzando otro programa. Estamos reconociendo algo simple: Dios pone personas delante de nosotros y queremos aprender a amarlas mejor, presentarles a Cristo y caminar con ellas. Raiz e Mesa no lleva personas por un sistema; pone personas al lado de personas hasta que echen raíces en Cristo y aprendan a hacer lo mismo por otras.',scriptures:pt.weeks[0].scriptures,teaching:['Explicar el flujo completo sin detallar cargos.','Contar 1-2 historias reales de cuidado, sin exponer a personas.','Enseñar que la hospitalidad es vocación de toda la iglesia.','Presentar el compromiso de siete semanas como experiencia de formación, no prueba de lealtad.'],practice:'En el próximo culto, cada participante debe aprender el nombre de una persona con quien normalmente no hablaría y pasar algunos minutos en comunión.'},
      {week:2,title:'Presencia y Mesa Aberta',objective:'Enseñar un domingo acogedor y lanzar inmediatamente Mesa Aberta.',facilitatorQuote:'Recibir no es quedarse en la puerta. Es disminuir la ansiedad de quien llega, percibir quién está solo y crear un puente sin invadir.',scriptures:pt.weeks[1].scriptures,teaching:['Presentar funciones de entrada, salón y vínculo.','Entrenar guiones de bienvenida y elección de asiento.','Entrenar la invitación a Mesa Aberta.','Explicar el comportamiento durante el llamado sin presión.','Definir la escala del próximo domingo.'],practice:'En el próximo culto, iniciar Mesa Aberta para todos. Hacer un debrief de 10 minutos después.'},
      {week:3,title:'Cuidado y conexión',objective:'Poner en funcionamiento el cuidado de 24-48 horas y enseñar consentimiento y límites.',facilitatorQuote:'No recogemos teléfonos para controlar gente. Pedimos autorización porque queremos seguir disponibles después del domingo.',scriptures:pt.weeks[2].scriptures,teaching:['Entrenar la solicitud opcional de contacto.','Entrenar el primer mensaje, ausencia y pedido de oración.','Explicar cuándo un mensaje se convierte en llamada.','Enseñar LGPD, notas mínimas y derivación pastoral.'],practice:'Todo contacto autorizado del próximo culto recibe un mensaje en aproximadamente 24 horas y como máximo 48. Revisar las respuestas la semana siguiente.'},
      {week:4,title:'Casa de Paz',objective:'Enseñar el pequeño ambiente relacional y preparar la primera Casa piloto.',facilitatorQuote:'Casa de Paz no es un culto más pequeño. Es una mesa más pequeña: Biblia, conversación, oración y gente aprendiendo a caminar junta.',scriptures:pt.weeks[3].scriptures,teaching:['Presentar el tamaño ideal 6-10, máximo 12.','Definir líder, anfitrión y aprendiz.','Entrenar invitación personal y acompañamiento en la primera vez.','Explicar que el contenido sigue siendo el libro de Casa de Paz ya usado por la iglesia.','Simular los 50 minutos.'],practice:'Confirmar el equipo de la primera Casa, invitados y fecha. Realizar el piloto en la semana 4 o 5, según la preparación.'},
      {week:5,title:'Raiz: discipulado inicial',objective:'Entrenar personas maduras para caminar personalmente con quienes demuestran hambre espiritual.',facilitatorQuote:'Raiz no es responder todas las preguntas en siete clases. Es abrir la Biblia con alguien, presentar a Cristo, escuchar, orar y ayudarlo a comenzar una vida de discipulado.',scriptures:pt.weeks[4].scriptures,teaching:['Explicar los siete encuentros.','Entrenar escucha y preguntas abiertas.','Definir quién puede discipular y quién todavía necesita formación.','Explicar la conexión con el material oficial de la OBPC.','Practicar la invitación a Raiz.'],practice:'Seleccionar solamente personas realmente preparadas. Si hay candidatos, iniciar 1-2 relaciones de Raiz; si no los hay, no forzar.'},
      {week:6,title:'Servicio, multiplicación y seguridad',objective:'Enseñar que servir es fruto de la vida en Cristo y que el liderazgo exige carácter.',facilitatorQuote:'Nuestro objetivo no es ocupar vacantes. Queremos que cada persona descubra cómo puede servir a Jesús y al prójimo, y que un día quien fue cuidado esté preparado para cuidar a alguien.',scriptures:pt.weeks[5].scriptures,teaching:['Separar servicio simple de función sensible.','Explicar criterios para futuro discipulador y líder de Casa.','Entrenar límites de consejería, protección y confidencialidad.','Mostrar cómo una Casa saludable genera un aprendiz antes de multiplicar.'],practice:'Cada líder identifica a alguien que pueda ser formado, sin prometer una función. Revisar riesgos de sobrecarga.'},
      {week:7,title:'Consolidación, compromiso y envío',objective:'Cerrar el ciclo sin cerrar la cultura. Consolidar responsables, ritmos y los próximos 90 días.',facilitatorQuote:'Las siete semanas terminan; el modo de vivir comienza. El éxito no es saber el manual. Es ver una iglesia que percibe personas, abre la mesa, cuida, discipula y envía.',scriptures:pt.weeks[6].scriptures,teaching:['Revisar el flujo completo.','Compartir historias reales de las semanas anteriores.','Confirmar coordinadores y equipos para 90 días.','Revisar métricas y fallas.','Orar y comisionar sin promesas de números.'],practice:'Entrar en un ciclo de 30/60/90 días con reuniones breves y ajustes.'},
    ],
  },
}

export const implementationPlaybooks: Record<AppLocale, ImplementationPlaybook> = { 'pt-BR': pt, ...translations }

export const IMPLEMENTATION_PREPARATION_KEYS = pt.preparation.map((_, index) => `prep.${index + 1}`)
export const IMPLEMENTATION_WEEK_KEYS = pt.weeks.flatMap((week) => [
  ...week.teaching.map((_, index) => `week.${week.week}.teach.${index + 1}`),
  `week.${week.week}.practice`,
])
export const IMPLEMENTATION_REQUIRED_KEYS = [...IMPLEMENTATION_PREPARATION_KEYS, ...IMPLEMENTATION_WEEK_KEYS]

export function implementationWeekForProgress(completedKeys: string[]) {
  const completed = new Set(completedKeys)
  if (!IMPLEMENTATION_PREPARATION_KEYS.every((key) => completed.has(key))) return 1
  for (const week of pt.weeks) {
    const keys = IMPLEMENTATION_WEEK_KEYS.filter((key) => key.startsWith(`week.${week.week}.`))
    if (!keys.every((key) => completed.has(key))) return week.week
  }
  return 7
}

export function implementationProgress(completedKeys: string[]) {
  const allowed = new Set(IMPLEMENTATION_REQUIRED_KEYS)
  const done = new Set(completedKeys.filter((key) => allowed.has(key))).size
  return { done, total: IMPLEMENTATION_REQUIRED_KEYS.length, percent: Math.round(done / IMPLEMENTATION_REQUIRED_KEYS.length * 100) }
}

export function implementationWeekKeys(week: number) {
  return IMPLEMENTATION_WEEK_KEYS.filter((key) => key.startsWith(`week.${week}.`))
}
