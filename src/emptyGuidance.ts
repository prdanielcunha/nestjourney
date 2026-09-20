import type { AppLocale } from './i18n'

export type EmptyGuidanceKey =
  | 'areas_none'
  | 'people_none'
  | 'groups_none'
  | 'discipleship_none'
  | 'care_attention_clear'
  | 'care_open_none'
  | 'care_resolved_none'
  | 'presence_no_session'
  | 'presence_no_people'
  | 'mesa_no_session'
  | 'mesa_no_people'
  | 'reports_no_data'
  | 'pastoral_open_clear'
  | 'pastoral_resolved_none'
  | 'team_no_members'

export interface EmptyGuidanceText {
  title: string
  body: string
  primary: string
  secondary?: string
}

const copy: Record<AppLocale, Record<EmptyGuidanceKey, EmptyGuidanceText>> = {
  'pt-BR': {
    areas_none:{title:'Nenhuma área operacional foi atribuída a você',body:'Seu acesso está válido, mas ainda não existe uma responsabilidade operacional. Abra a Ajuda para entender o fluxo ou peça a um administrador para definir sua função.',primary:'Abrir Ajuda',secondary:'Voltar ao Hoje'},
    people_none:{title:'Ainda não há pessoas nesta unidade',body:'O fluxo começa na Presença: registre quem chegou e somente os dados necessários. Depois o histórico permitido aparece aqui automaticamente.',primary:'Abrir Presença',secondary:'Ver Áreas'},
    groups_none:{title:'Nenhuma Casa foi criada nesta unidade',body:'Comece com uma Casa simples: líder, anfitrião, horário e capacidade. Depois vincule pessoas e registre os encontros reais.',primary:'Criar primeira Casa',secondary:'Ver implantação'},
    discipleship_none:{title:'Nenhum acompanhamento do Raiz está ativo',body:'Quando houver vínculo e desejo de caminhar, inicie uma relação e conduza os sete encontros sem transformar discipulado em checklist de maturidade.',primary:'Iniciar primeiro Raiz',secondary:'Ver Pessoas'},
    care_attention_clear:{title:'Nenhuma pendência de cuidado agora',body:'Não há Care Debt, prazo próximo ou cuidado sem responsável neste filtro. Continue acompanhando sua fila sem inventar urgências.',primary:'Ver cuidados abertos',secondary:'Voltar ao Hoje'},
    care_open_none:{title:'Nenhum cuidado aberto nesta unidade',body:'Se alguém autorizou contato ou pediu acompanhamento, registre um compromisso com prazo, responsável e próximo passo. Caso contrário, não há nada a criar.',primary:'Novo cuidado',secondary:'Voltar ao Hoje'},
    care_resolved_none:{title:'Ainda não há cuidados concluídos',body:'Os resultados aparecem aqui quando um cuidado aberto recebe um desfecho factual. Não é necessário preencher histórico artificialmente.',primary:'Ver cuidados abertos',secondary:'Voltar ao Hoje'},
    presence_no_session:{title:'Abra a sessão deste culto para começar',body:'A sessão organiza confirmação de presença, visitantes e vínculos deste encontro. Não marcado continua como não verificado.',primary:'Abrir sessão',secondary:'Voltar ao Hoje'},
    presence_no_people:{title:'Nenhuma pessoa neste escopo ainda',body:'Se alguém chegou agora, cadastre o visitante com o mínimo necessário e registre presença. A lista cresce a partir de fatos reais.',primary:'Cadastrar visitante',secondary:'Abrir Ajuda'},
    mesa_no_session:{title:'A Mesa depende da sessão do culto',body:'Abra primeiro a sessão em Presença. Depois a equipe da Mesa consegue preparar o ambiente, registrar convites e participação real.',primary:'Abrir Presença',secondary:'Voltar ao Hoje'},
    mesa_no_people:{title:'Nenhuma pessoa disponível para a Mesa',body:'Os nomes vêm da Presença desta unidade. Registre visitantes e presença primeiro; depois volte para convidar ou registrar participação.',primary:'Abrir Presença',secondary:'Voltar ao Hoje'},
    reports_no_data:{title:'Ainda não há fatos suficientes para relatório',body:'Não crie métricas manualmente. Conforme Presença, Cuidado, Casas e Raiz forem usados, a visão de gestão se forma a partir dos registros reais.',primary:'Abrir Hoje',secondary:'Ver implantação'},
    pastoral_open_clear:{title:'Nenhum encaminhamento pastoral aberto',body:'Isto é uma boa notícia operacional: não há marcador explícito aguardando contato pastoral nesta unidade. Continue pela Visão ou pelo Hoje.',primary:'Abrir Visão',secondary:'Voltar ao Hoje'},
    pastoral_resolved_none:{title:'Ainda não há encaminhamentos concluídos',body:'Quando um marcador pastoral for atendido, o histórico factual aparecerá aqui sem armazenar conteúdo íntimo da conversa.',primary:'Ver pendentes',secondary:'Abrir Visão'},
    team_no_members:{title:'Nenhum membro ativo foi encontrado',body:'Convites, membros e cargos continuam no MillionsNest Hub. Adicione ou ative a pessoa lá e volte para atribuir a responsabilidade operacional do NestJourney.',primary:'Abrir membros no Hub',secondary:'Voltar ao Hoje'},
  },
  en: {
    areas_none:{title:'No operational area is assigned to you yet',body:'Your access is valid, but no operational responsibility is assigned. Open Help to understand the flow or ask an administrator to define your responsibility.',primary:'Open Help',secondary:'Back to Today'},
    people_none:{title:'There are no people in this campus yet',body:'The journey starts in Presence: record who arrived and only the data that is necessary. Permitted history will then appear here automatically.',primary:'Open Presence',secondary:'View Areas'},
    groups_none:{title:'No House has been created in this campus',body:'Start with one simple House: leader, host, schedule, and capacity. Then link people and record real meetings.',primary:'Create first House',secondary:'View implementation'},
    discipleship_none:{title:'No active Root relationship yet',body:'When there is relationship and willingness to walk together, start a relation and guide the seven meetings without turning discipleship into a maturity score.',primary:'Start first Root',secondary:'View People'},
    care_attention_clear:{title:'No care attention is needed right now',body:'There is no Care Debt, near deadline, or unassigned care in this filter. Keep following the queue without inventing urgency.',primary:'View open care',secondary:'Back to Today'},
    care_open_none:{title:'No open care in this campus',body:'If someone authorized contact or asked for follow-up, create a commitment with deadline, owner, and next step. Otherwise there is nothing to create.',primary:'New care',secondary:'Back to Today'},
    care_resolved_none:{title:'No completed care yet',body:'Outcomes appear here after open care receives a factual resolution. There is no need to manufacture history.',primary:'View open care',secondary:'Back to Today'},
    presence_no_session:{title:'Open this service session to begin',body:'The session organizes attendance confirmation, visitors, and relationships for this gathering. Unmarked remains unverified.',primary:'Open session',secondary:'Back to Today'},
    presence_no_people:{title:'No people in this scope yet',body:'If someone just arrived, add the visitor with the minimum necessary data and record presence. The list grows from real facts.',primary:'Add visitor',secondary:'Open Help'},
    mesa_no_session:{title:'The Table depends on the service session',body:'Open the Presence session first. Then the Table team can prepare the environment and record real invitations and participation.',primary:'Open Presence',secondary:'Back to Today'},
    mesa_no_people:{title:'No people are available for the Table',body:'Names come from Presence for this campus. Record visitors and attendance first, then return to invite or record participation.',primary:'Open Presence',secondary:'Back to Today'},
    reports_no_data:{title:'There are not enough facts for reporting yet',body:'Do not create metrics manually. As Presence, Care, Houses, and Root are used, the management view forms from real records.',primary:'Open Today',secondary:'View implementation'},
    pastoral_open_clear:{title:'No open pastoral handoff',body:'This is operationally healthy: no explicit marker is waiting for pastoral contact in this campus. Continue through Vision or Today.',primary:'Open Vision',secondary:'Back to Today'},
    pastoral_resolved_none:{title:'No completed handoff yet',body:'When a pastoral marker is handled, the factual history will appear here without storing intimate conversation content.',primary:'View pending',secondary:'Open Vision'},
    team_no_members:{title:'No active members were found',body:'Invites, members, and organization roles remain in MillionsNest Hub. Add or activate the person there, then return to assign a NestJourney responsibility.',primary:'Open Hub members',secondary:'Back to Today'},
  },
  es: {
    areas_none:{title:'Todavía no tienes un área operativa asignada',body:'Tu acceso es válido, pero no existe una responsabilidad operativa asignada. Abre Ayuda para entender el flujo o pide a un administrador que defina tu función.',primary:'Abrir Ayuda',secondary:'Volver a Hoy'},
    people_none:{title:'Todavía no hay personas en esta sede',body:'La jornada comienza en Presencia: registra quién llegó y solo los datos necesarios. Después el historial permitido aparece aquí automáticamente.',primary:'Abrir Presencia',secondary:'Ver Áreas'},
    groups_none:{title:'No se creó ninguna Casa en esta sede',body:'Empieza con una Casa simple: líder, anfitrión, horario y capacidad. Después vincula personas y registra encuentros reales.',primary:'Crear primera Casa',secondary:'Ver implementación'},
    discipleship_none:{title:'No hay acompañamientos de Raíz activos',body:'Cuando exista vínculo y deseo de caminar, inicia una relación y conduce los siete encuentros sin convertir el discipulado en una puntuación de madurez.',primary:'Iniciar primer Raíz',secondary:'Ver Personas'},
    care_attention_clear:{title:'No hay pendientes de cuidado ahora',body:'No hay Care Debt, plazo próximo ni cuidado sin responsable en este filtro. Continúa acompañando tu fila sin inventar urgencias.',primary:'Ver cuidados abiertos',secondary:'Volver a Hoy'},
    care_open_none:{title:'No hay cuidados abiertos en esta sede',body:'Si alguien autorizó contacto o pidió acompañamiento, registra un compromiso con plazo, responsable y próximo paso. Si no, no hay nada que crear.',primary:'Nuevo cuidado',secondary:'Volver a Hoy'},
    care_resolved_none:{title:'Todavía no hay cuidados concluidos',body:'Los resultados aparecen aquí cuando un cuidado abierto recibe un desenlace factual. No es necesario fabricar historial.',primary:'Ver cuidados abiertos',secondary:'Volver a Hoy'},
    presence_no_session:{title:'Abre la sesión de este culto para empezar',body:'La sesión organiza confirmación de presencia, visitantes y vínculos de este encuentro. Sin marcar permanece no verificado.',primary:'Abrir sesión',secondary:'Volver a Hoy'},
    presence_no_people:{title:'Todavía no hay personas en este alcance',body:'Si alguien acaba de llegar, registra al visitante con los datos mínimos y confirma presencia. La lista crece a partir de hechos reales.',primary:'Registrar visitante',secondary:'Abrir Ayuda'},
    mesa_no_session:{title:'La Mesa depende de la sesión del culto',body:'Abre primero la sesión en Presencia. Después el equipo de Mesa puede preparar el ambiente y registrar invitaciones y participación real.',primary:'Abrir Presencia',secondary:'Volver a Hoy'},
    mesa_no_people:{title:'No hay personas disponibles para la Mesa',body:'Los nombres vienen de Presencia de esta sede. Registra visitantes y presencia primero y luego vuelve para invitar o registrar participación.',primary:'Abrir Presencia',secondary:'Volver a Hoy'},
    reports_no_data:{title:'Todavía no hay hechos suficientes para informes',body:'No crees métricas manualmente. A medida que Presencia, Cuidado, Casas y Raíz se usen, la visión de gestión se forma con registros reales.',primary:'Abrir Hoy',secondary:'Ver implementación'},
    pastoral_open_clear:{title:'No hay derivaciones pastorales abiertas',body:'Es una buena señal operativa: no hay marcador explícito esperando contacto pastoral en esta sede. Continúa por Visión o Hoy.',primary:'Abrir Visión',secondary:'Volver a Hoy'},
    pastoral_resolved_none:{title:'Todavía no hay derivaciones concluidas',body:'Cuando un marcador pastoral sea atendido, el historial factual aparecerá aquí sin almacenar contenido íntimo de la conversación.',primary:'Ver pendientes',secondary:'Abrir Visión'},
    team_no_members:{title:'No se encontraron miembros activos',body:'Invitaciones, miembros y cargos siguen en MillionsNest Hub. Agrega o activa a la persona allí y vuelve para asignar su responsabilidad en NestJourney.',primary:'Abrir miembros en Hub',secondary:'Volver a Hoy'},
  },
}

export function emptyGuidance(locale: AppLocale, key: EmptyGuidanceKey) {
  return copy[locale][key]
}
