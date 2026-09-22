import type { AppLocale } from './i18n'
import type { JourneyResponsibility } from './journeyExperience'
import type { MyTodayItem, MyTodayKind } from './myToday'

export interface TodayPrimaryAction {
  href: string
  title: string
  body: string
  cta: string
  kind: MyTodayKind | 'mesa_prepare' | 'mesa_pending' | 'role_home'
  urgent: boolean
}

type Copy = {
  now: string
  unitSuffix: string
  items: Record<MyTodayKind, { title: string; body: string; cta: string; href: string }>
  mesaPrepare: { title: string; body: string; cta: string; href: string }
  mesaPending: { title: string; body: string; cta: string; href: string }
  role: Record<JourneyResponsibility, { title: string; body: string; cta: string; href: string }>
}

const copy: Record<AppLocale, Copy> = {
  'pt-BR': {
    now: 'Faça isso agora',
    unitSuffix: 'nesta unidade',
    items: {
      care_debt: { title: 'Resolva um cuidado vencido', body: 'Existe um compromisso de cuidado fora do prazo. Comece por ele e registre o resultado real.', cta: 'Resolver agora', href: '/care-integrity' },
      care_due_soon: { title: 'Há um cuidado vencendo em breve', body: 'O prazo de 24–48h está próximo. Entre em contato antes que isso vire cuidado atrasado.', cta: 'Abrir cuidado', href: '/care-integrity' },
      care_unassigned: { title: 'Defina quem vai cuidar', body: 'Existe cuidado aberto sem responsável. Distribua antes que a pessoa fique sem próximo passo.', cta: 'Distribuir cuidado', href: '/care-integrity' },
      presence_open: { title: 'Continue a sessão do culto', body: 'Há uma sessão de presença aberta. Confirme pessoas, visitantes e vínculos enquanto o contexto está vivo.', cta: 'Abrir Presença', href: '/presence-assist' },
      group_attention: { title: 'Uma Casa precisa de atenção', body: 'A capacidade registrada está próxima do limite. Revise participantes e próximo encontro.', cta: 'Abrir Casa', href: '/groups-runtime' },
      discipleship_next: { title: 'Há um próximo encontro do Raiz', body: 'Abra a relação de discipulado e confirme o encontro registrado antes de seguir para outra tarefa.', cta: 'Abrir Raiz', href: '/discipleship-runtime' },
      pastoral_handoff: { title: 'Existe um contato pastoral pendente', body: 'Há um encaminhamento explícito aguardando decisão ou contato pastoral, sem expor conteúdo sensível.', cta: 'Abrir Pastoral', href: '/pastoral-handoff' },
    },
    mesaPrepare: { title: 'Prepare a próxima Mesa', body: 'Confirme ambiente, anfitriões, acolhimento e itens simples antes do encerramento do culto.', cta: 'Preparar Mesa', href: '/mesa-runtime' },
    mesaPending: { title: 'Registre quem permaneceu na Mesa', body: 'Há convidados aguardando registro de participação e continuidade do vínculo.', cta: 'Abrir Mesa', href: '/mesa-runtime' },
    role: {
      presence_host: { title: 'Prepare Presença para o próximo culto', body: 'Abra a área para conferir a sessão, receber pessoas e registrar vínculos sem burocracia.', cta: 'Ir para Presença', href: '/presence-assist' },
      mesa_team: { title: 'Confira a operação da Mesa', body: 'Revise preparação, convidados e participação para que a comunhão aconteça com simplicidade.', cta: 'Ir para Mesa', href: '/mesa-runtime' },
      caregiver: { title: 'Revise sua fila de cuidado', body: 'Mesmo sem atraso agora, confira contatos atribuídos, respostas e o próximo passo de cada pessoa.', cta: 'Ir para Cuidado', href: '/care-integrity' },
      group_leader: { title: 'Veja sua Casa', body: 'Confira participantes, pedidos de entrada, capacidade e o próximo encontro da Casa sob sua responsabilidade.', cta: 'Abrir minha Casa', href: '/groups-runtime' },
      discipler: { title: 'Veja seus próximos encontros', body: 'Confira quem você acompanha, encontro atual e próxima data antes de encerrar o dia.', cta: 'Abrir Raiz', href: '/discipleship-runtime' },
      coordinator: { title: 'Revise a operação antes que vire pendência', body: 'Use a Visão para distribuir carga, encontrar itens sem responsável e enxergar gargalos da unidade.', cta: 'Abrir Visão', href: '/vision' },
      pastor: { title: 'Veja onde sua decisão pastoral é necessária', body: 'Leia cuidado atrasado, encaminhamentos e jornadas sem próximo passo registrado em uma visão curta da unidade.', cta: 'Abrir Visão', href: '/vision' },
      admin: { title: 'Leia a saúde da organização em poucos segundos', body: 'Compare unidades, carga, cuidados e áreas sem entrar módulo por módulo.', cta: 'Abrir Visão', href: '/vision' },
      ceo: { title: 'Revise o pulso do ecossistema', body: 'A Home mostra o que pede atenção agora. Abra a Visão quando quiser aprofundar organizações, unidades e saúde operacional.', cta: 'Abrir Visão detalhada', href: '/vision' },
      member: { title: 'Abra sua jornada', body: 'Use Pulse, encontre uma Casa, atualize seu contato ou acesse um canal seguro de forma voluntária.', cta: 'Abrir Minha Jornada', href: '/my-journey' },
    },
  },
  en: {
    now: 'Do this now',
    unitSuffix: 'in this campus',
    items: {
      care_debt: { title: 'Resolve overdue care', body: 'A care commitment is overdue. Start there and record the real outcome.', cta: 'Resolve now', href: '/care-integrity' },
      care_due_soon: { title: 'Care is due soon', body: 'The 24–48h promise is close. Reach out before it becomes overdue care.', cta: 'Open care', href: '/care-integrity' },
      care_unassigned: { title: 'Assign someone to care', body: 'An open care item has no owner. Assign it before the person loses a clear next step.', cta: 'Assign care', href: '/care-integrity' },
      presence_open: { title: 'Continue the service session', body: 'A presence session is open. Confirm people, visitors, and relationships while the context is fresh.', cta: 'Open Presence', href: '/presence-assist' },
      group_attention: { title: 'A House needs attention', body: 'Recorded capacity is near the limit. Review participants and the next meeting.', cta: 'Open House', href: '/groups-runtime' },
      discipleship_next: { title: 'A Root meeting is next', body: 'Open the discipleship relationship and confirm the recorded meeting before moving on.', cta: 'Open Root', href: '/discipleship-runtime' },
      pastoral_handoff: { title: 'Pastoral contact is pending', body: 'An explicit handoff is waiting for pastoral contact or decision without exposing sensitive content.', cta: 'Open Pastoral', href: '/pastoral-handoff' },
    },
    mesaPrepare: { title: 'Prepare the next Table', body: 'Confirm environment, hosts, welcome, and simple supplies before the service ends.', cta: 'Prepare Table', href: '/mesa-runtime' },
    mesaPending: { title: 'Record who stayed at the Table', body: 'Guests are waiting for a participation record and relationship continuity.', cta: 'Open Table', href: '/mesa-runtime' },
    role: {
      presence_host: { title: 'Prepare Presence for the next service', body: 'Open the area to check the session, welcome people, and record relationships without bureaucracy.', cta: 'Go to Presence', href: '/presence-assist' },
      mesa_team: { title: 'Check the Table operation', body: 'Review preparation, guests, and participation so community can happen simply.', cta: 'Go to Table', href: '/mesa-runtime' },
      caregiver: { title: 'Review your care queue', body: 'Even with no overdue item, check assigned contacts, responses, and each person’s next step.', cta: 'Go to Care', href: '/care-integrity' },
      group_leader: { title: 'Open your House', body: 'Review participants, entry requests, capacity, and the next meeting for the group you lead.', cta: 'Open my House', href: '/groups-runtime' },
      discipler: { title: 'Review your next meetings', body: 'Check who you accompany, current meeting, and next date before closing the day.', cta: 'Open Root', href: '/discipleship-runtime' },
      coordinator: { title: 'Review operations before work becomes debt', body: 'Use Vision to distribute load, find unassigned work, and spot unit bottlenecks.', cta: 'Open Vision', href: '/vision' },
      pastor: { title: 'See where pastoral decision is needed', body: 'Read overdue care, handoffs, and journeys without a recorded next step in one concise campus view.', cta: 'Open Vision', href: '/vision' },
      admin: { title: 'Read organization health in seconds', body: 'Compare campuses, workload, care, and areas without opening every module.', cta: 'Open Vision', href: '/vision' },
      ceo: { title: 'Review the ecosystem pulse', body: 'Home shows what needs attention now. Open Vision when you want a deeper read across organizations, campuses, and operational health.', cta: 'Open detailed Vision', href: '/vision' },
      member: { title: 'Open your journey', body: 'Use Pulse, find a House, update your contact, or access a safe channel voluntarily.', cta: 'Open My Journey', href: '/my-journey' },
    },
  },
  es: {
    now: 'Haz esto ahora',
    unitSuffix: 'en esta sede',
    items: {
      care_debt: { title: 'Resuelve un cuidado vencido', body: 'Hay un compromiso de cuidado fuera de plazo. Empieza por él y registra el resultado real.', cta: 'Resolver ahora', href: '/care-integrity' },
      care_due_soon: { title: 'Hay un cuidado por vencer', body: 'El plazo de 24–48h está cerca. Contacta antes de que se convierta en cuidado atrasado.', cta: 'Abrir cuidado', href: '/care-integrity' },
      care_unassigned: { title: 'Define quién va a cuidar', body: 'Existe un cuidado abierto sin responsable. Asígnalo antes de que la persona quede sin próximo paso.', cta: 'Distribuir cuidado', href: '/care-integrity' },
      presence_open: { title: 'Continúa la sesión del culto', body: 'Hay una sesión de presencia abierta. Confirma personas, visitantes y vínculos mientras el contexto está fresco.', cta: 'Abrir Presencia', href: '/presence-assist' },
      group_attention: { title: 'Una Casa necesita atención', body: 'La capacidad registrada está cerca del límite. Revisa participantes y próximo encuentro.', cta: 'Abrir Casa', href: '/groups-runtime' },
      discipleship_next: { title: 'Hay un próximo encuentro de Raíz', body: 'Abre la relación de discipulado y confirma el encuentro registrado antes de seguir.', cta: 'Abrir Raíz', href: '/discipleship-runtime' },
      pastoral_handoff: { title: 'Hay un contacto pastoral pendiente', body: 'Existe una derivación explícita esperando contacto o decisión pastoral sin exponer contenido sensible.', cta: 'Abrir Pastoral', href: '/pastoral-handoff' },
    },
    mesaPrepare: { title: 'Prepara la próxima Mesa', body: 'Confirma ambiente, anfitriones, recepción y elementos simples antes del cierre del culto.', cta: 'Preparar Mesa', href: '/mesa-runtime' },
    mesaPending: { title: 'Registra quién permaneció en la Mesa', body: 'Hay invitados esperando registro de participación y continuidad del vínculo.', cta: 'Abrir Mesa', href: '/mesa-runtime' },
    role: {
      presence_host: { title: 'Prepara Presencia para el próximo culto', body: 'Abre el área para revisar la sesión, recibir personas y registrar vínculos sin burocracia.', cta: 'Ir a Presencia', href: '/presence-assist' },
      mesa_team: { title: 'Revisa la operación de la Mesa', body: 'Comprueba preparación, invitados y participación para que la comunión ocurra con sencillez.', cta: 'Ir a Mesa', href: '/mesa-runtime' },
      caregiver: { title: 'Revisa tu fila de cuidado', body: 'Aunque no haya retraso ahora, revisa contactos asignados, respuestas y el próximo paso de cada persona.', cta: 'Ir a Cuidado', href: '/care-integrity' },
      group_leader: { title: 'Abre tu Casa', body: 'Revisa participantes, solicitudes de entrada, capacidad y el próximo encuentro de la Casa que lideras.', cta: 'Abrir mi Casa', href: '/groups-runtime' },
      discipler: { title: 'Revisa tus próximos encuentros', body: 'Comprueba a quién acompañas, encuentro actual y próxima fecha antes de cerrar el día.', cta: 'Abrir Raíz', href: '/discipleship-runtime' },
      coordinator: { title: 'Revisa la operación antes de que se vuelva deuda', body: 'Usa Visión para distribuir carga, encontrar elementos sin responsable y detectar cuellos de botella.', cta: 'Abrir Visión', href: '/vision' },
      pastor: { title: 'Ve dónde hace falta una decisión pastoral', body: 'Lee cuidado atrasado, derivaciones y jornadas sin próximo paso registrado en una vista breve de la sede.', cta: 'Abrir Visión', href: '/vision' },
      admin: { title: 'Lee la salud de la organización en segundos', body: 'Compara sedes, carga, cuidados y áreas sin entrar módulo por módulo.', cta: 'Abrir Visión', href: '/vision' },
      ceo: { title: 'Revisa el pulso del ecosistema', body: 'La Home muestra lo que requiere atención ahora. Abre Visión cuando quieras profundizar en organizaciones, sedes y salud operativa.', cta: 'Abrir Visión detallada', href: '/vision' },
      member: { title: 'Abre tu jornada', body: 'Usa Pulse, encuentra una Casa, actualiza tu contacto o accede voluntariamente a un canal seguro.', cta: 'Abrir Mi Jornada', href: '/my-journey' },
    },
  },
}

function actionForItem(locale: AppLocale, item: MyTodayItem): TodayPrimaryAction {
  const base = copy[locale].items[item.kind]
  return { ...base, kind: item.kind, urgent: item.priority <= 2 }
}

export function buildTodayPrimaryAction(input: {
  locale: AppLocale
  responsibility: JourneyResponsibility
  items: MyTodayItem[]
  mesaPreparationPending: boolean
  mesaPendingCount: number
}): TodayPrimaryAction {
  if (input.responsibility === 'mesa_team' && input.mesaPreparationPending) {
    return { ...copy[input.locale].mesaPrepare, kind: 'mesa_prepare', urgent: true }
  }
  const first = input.items[0]
  if (first) return actionForItem(input.locale, first)
  if (input.mesaPreparationPending) return { ...copy[input.locale].mesaPrepare, kind: 'mesa_prepare', urgent: true }
  if (input.mesaPendingCount > 0) return { ...copy[input.locale].mesaPending, kind: 'mesa_pending', urgent: false }
  return { ...copy[input.locale].role[input.responsibility], kind: 'role_home', urgent: false }
}

export function todayActionKicker(locale: AppLocale) {
  return copy[locale].now
}
