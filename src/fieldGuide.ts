export type FieldGuideUnitProfile = 'cambe' | 'londrina' | 'generic'

export interface FieldGuideTheme {
  id: string
  title: string
  scripture: string
  objective: string
  opening: string
  exposition: string
  questions: string[]
  prayer: string
  nextStep?: string
}

export interface FirstStepsLesson {
  id: string
  title: string
  scripture: string
  opening: string
  transition?: string
  explanation: string
  questions: string[]
  application: string
  prayer: string
  nextStep: string
}

export function resolveFieldGuideUnitProfile(name = '', city = ''): FieldGuideUnitProfile {
  const value = `${name} ${city}`.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  if (value.includes('cambe') || value.includes('monte castelo')) return 'cambe'
  if (value.includes('londrina') || value.includes('industrial')) return 'londrina'
  return 'generic'
}

export function startOfFieldWeek(now = new Date()) {
  const date = new Date(now)
  date.setHours(0, 0, 0, 0)
  const day = date.getDay()
  const delta = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + delta)
  return date
}

export function endOfFieldWeek(now = new Date()) {
  const start = startOfFieldWeek(now)
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  return end
}

export function isInsideFieldWeek(value: string | undefined, now = new Date()) {
  if (!value || Number.isNaN(Date.parse(value))) return false
  const time = Date.parse(value)
  return time >= startOfFieldWeek(now).getTime() && time < endOfFieldWeek(now).getTime()
}

export const FIELD_GUIDE_MONTHLY_RHYTHM = {
  cambe: [
    { when: 'Todo domingo', items: ['Culto', 'Pós-culto com café e comunhão de 10 a 15 minutos', 'Registro de visitantes', 'Identificação de pedidos de oração', 'Repasse no mesmo dia'] },
    { when: 'Segunda ou terça', items: ['Mensagens aos visitantes', 'Contato com ausentes', 'Revisão da lista de oração', 'Alinhamento rápido dos coordenadores'] },
    { when: 'Semana 1', items: ['Reunião curta com líderes', 'Revisão de métricas', 'Ajuste da Equipe Presença'] },
    { when: 'Semana 2', items: ['Mesa de Esperança'] },
    { when: 'Semana 3', items: ['Revisão pastoral', 'Início ou continuidade de Primeiros Passos'] },
    { when: 'Semana 4', items: ['Segunda Mesa de Esperança ou ação Igreja Presente, conforme o momento'] },
    { when: 'Quinzenal', items: ['Primeiros Passos', 'Reunião de ajuste dos coordenadores'] },
  ],
  londrina: [
    { when: 'Todo domingo', items: ['Culto', 'Comunhão breve de 10 minutos', 'Observação de visitantes, isolados e ausentes recentes', 'Repasse no mesmo dia'] },
    { when: 'Segunda ou terça', items: ['Mensagens de cuidado', 'Contato com ausentes', 'Atualização dos registros'] },
    { when: 'Semana 1', items: ['Reunião curta de líderes', 'Reforço da visão de cuidado'] },
    { when: 'Semana 2', items: ['Continuidade do pós-culto e acompanhamento'] },
    { when: 'Semana 3', items: ['Mesa de Esperança mensal ou encontro piloto'] },
    { when: 'Semana 4', items: ['Revisão, oração pelo núcleo e avaliação do clima da igreja'] },
    { when: 'Quinzenal', items: ['Reunião curta com os responsáveis'] },
  ],
  generic: [
    { when: 'Todo domingo', items: ['Culto', 'Comunhão breve pós-culto', 'Registro mínimo e consentido de visitantes', 'Repasse do que precisa de cuidado'] },
    { when: 'Segunda ou terça', items: ['Contatos autorizados', 'Cuidado de ausentes', 'Revisão das pendências'] },
    { when: 'Semanal', items: ['Revisão operacional curta dos responsáveis'] },
    { when: 'Quinzenal', items: ['Ajuste de cultura, carga e próximos passos'] },
    { when: 'Mensal', items: ['Revisão pastoral de métricas, segurança, discipulado e expansão ou freio'] },
  ],
} as const

export const WEEKLY_COORDINATOR_AGENDA = [
  { time: '5 min', title: 'Oração', questions: ['Relembrar o foco: ninguém deve chegar e sair sem ser visto, acolhido e encaminhado.'] },
  { time: '10 min', title: 'Revisão do domingo', questions: ['Quem nos visitou?', 'Quem ficou no pós-culto?', 'Quem pareceu mais aberto?', 'Quem quase passou invisível?', 'Onde falhamos?'] },
  { time: '10 min', title: 'Acompanhamento', questions: ['Quem já recebeu mensagem?', 'Quem precisa de ligação?', 'Quem precisa de oração mais próxima?', 'Quem está pronto para ser convidado para a Mesa?'] },
  { time: '10 min', title: 'Mesa e Primeiros Passos', questions: ['Quem convidar?', 'Quem confirmar?', 'Quem acompanhar?', 'Quem está pronto para discipulado?'] },
  { time: '5 min', title: 'Ajustes', questions: ['O que corrigir no próximo domingo?', 'Quem fará o quê?'] },
  { time: '5 min', title: 'Encerramento', questions: ['Senhor, nos dá amor real pelas pessoas e constância no cuidado.'] },
] as const

export const BIWEEKLY_REFINEMENT_QUESTIONS = [
  'Nossa recepção está leve ou mecânica?',
  'O pós-culto está natural ou forçado?',
  'As mensagens estão soando humanas?',
  'A Mesa está leve ou pesada?',
  'Os Primeiros Passos estão claros ou confusos?',
  'Quem está se destacando como futuro apoio?',
  'Quem está sobrecarregado?',
  'Onde estamos complicando o simples?',
] as const

export const PULPIT_LINES = [
  'Se você está nos visitando hoje, seja muito bem-vindo. Queremos que você se sinta à vontade e perceba que há lugar para você aqui.',
  'Daqui a pouco vamos encerrar, e quem puder fique mais 10 minutinhos para um café e comunhão. Queremos cultivar uma igreja de cuidado e proximidade.',
  'Se você precisa de oração, não vá embora carregando tudo sozinho. Estaremos aqui no final para orar com você.',
  'A fé cristã não foi feita para ser vivida à distância. Aos poucos, Deus nos chama para caminhar juntos.',
  'Queremos ser uma igreja bíblica e também profundamente acolhedora.',
  'Crescimento saudável não começa com números; começa com cuidado fiel.',
  'Às vezes a pessoa chega em silêncio, mas com a alma pesada. Que Deus nos ajude a perceber e acolher.',
  'Nossa oração é que ninguém entre e saia daqui sem ser visto com amor.',
  'O evangelho nos dá verdade, mas também nos dá mesa, comunhão e família espiritual.',
  'Se você está em recomeço, saiba que Cristo recebe pessoas cansadas, quebradas e necessitadas.',
  'Que Deus nos livre de sermos um ajuntamento frio e nos faça um povo de graça, verdade e cuidado.',
  'Não queremos apenas reunir pessoas num culto; queremos caminhar com elas em direção a Cristo.',
] as const

export const MESA_DE_ESPERANCA: FieldGuideTheme[] = [
  {
    id: 'mesa-1', title: 'Quando a alma está cansada', scripture: 'Mateus 11:28-30',
    objective: 'Acolher pessoas cansadas e mostrar Cristo como descanso da alma.',
    opening: 'Hoje vamos conversar sobre algo muito real: o cansaço da alma. Nem sempre estamos cansados só fisicamente; às vezes o coração está carregado, a mente está pesada e a vida parece difícil de sustentar.',
    exposition: 'Jesus não chama os fortes e autossuficientes. Ele chama os cansados e sobrecarregados. O descanso que Cristo oferece não é fuga da vida, mas alívio profundo em Sua presença.',
    questions: ['O que mais pesa sua alma hoje?', 'O que significa para você ouvir que Jesus chama os cansados?', 'Em que área você mais precisa de descanso do Senhor?'],
    prayer: 'Senhor, Tu conheces os pesos escondidos em cada coração. Dá descanso, alívio e esperança. Ensina-nos a levar a Ti aquilo que não conseguimos carregar sozinhos.',
    nextStep: 'Convidar para voltar na próxima Mesa.',
  },
  {
    id: 'mesa-2', title: 'Deus ainda ouve oração?', scripture: 'Lucas 11:1-13',
    objective: 'Reacender confiança na oração.',
    opening: 'Muita gente ora só em momentos extremos. Outros até querem orar, mas sentem bloqueio. Hoje vamos olhar para a forma como Jesus nos ensina a nos aproximar de Deus.',
    exposition: 'Jesus apresenta Deus como Pai, não como alguém distante. Oração não é performance espiritual; é aproximação, dependência e perseverança.',
    questions: ['Sua vida de oração hoje é fácil ou difícil?', 'O que mais te impede de orar com constância?', 'Em que área você mais precisa buscar o Senhor?'],
    prayer: 'Pai, ensina-nos a orar, a confiar em Ti e a derramar diante de Ti o nosso coração com sinceridade.',
  },
  {
    id: 'mesa-3', title: 'Como lidar com ansiedade', scripture: 'Filipenses 4:4-9',
    objective: 'Mostrar a resposta bíblica para a ansiedade.',
    opening: 'Ansiedade é uma das grandes lutas do nosso tempo. Não se vence com frases vazias, mas com um coração redirecionado em Deus.',
    exposition: 'Paulo não ignora as aflições. Ele mostra um caminho: oração, gratidão, mente guardada e foco no que agrada a Deus.',
    questions: ['O que mais tem roubado sua paz?', 'Como você costuma reagir quando a ansiedade aperta?', 'O que o texto te chama a fazer?'],
    prayer: 'Senhor, guarda nossa mente e coração em Cristo. Tira de nós o desespero e nos ensina a entregar a Ti nossas inquietações.',
  },
  {
    id: 'mesa-4', title: 'O que Deus faz com a culpa?', scripture: 'Salmo 32',
    objective: 'Mostrar perdão, confissão e restauração.',
    opening: 'Há culpas que as pessoas carregam em silêncio. Hoje vamos olhar para o que a Palavra mostra sobre culpa, confissão e perdão.',
    exposition: 'Davi mostra que ocultar o pecado corrói. Mas também mostra que a graça de Deus restaura quando há confissão sincera.',
    questions: ['Por que é tão difícil abrir o coração diante de Deus?', 'Você já viveu culpa silenciosa?', 'O que esse texto ensina sobre perdão?'],
    prayer: 'Senhor, dá-nos sinceridade diante de Ti. Onde houver culpa, traz arrependimento, perdão e restauração.',
  },
  {
    id: 'mesa-5', title: 'Recomeços da graça', scripture: 'João 21',
    objective: 'Mostrar que Cristo restaura quem falhou.',
    opening: 'Às vezes a pessoa não precisa só de conselho; precisa de recomeço. E Jesus sabe lidar com gente que falhou.',
    exposition: 'Pedro falhou profundamente, mas Jesus não o descartou. O Senhor o confrontou, restaurou e recolocou em caminho.',
    questions: ['Em que área você mais precisa de recomeço?', 'O que te impede de crer na restauração de Deus?', 'O que Jesus faz com Pedro nesse texto?'],
    prayer: 'Senhor, restaura áreas feridas da nossa vida e dá-nos graça para recomeçar debaixo da Tua misericórdia.',
  },
  {
    id: 'mesa-6', title: 'Esperança em dias difíceis', scripture: 'Romanos 8:31-39',
    objective: 'Fortalecer fé em meio às lutas.',
    opening: 'Esperança cristã não é negação da dor. É convicção de que, mesmo em meio à dor, Deus permanece conosco.',
    exposition: 'Nada pode separar o povo de Deus do amor de Cristo. As aflições existem, mas não anulam a fidelidade do Senhor.',
    questions: ['O que mais te abala em dias difíceis?', 'Qual frase desse texto mais te fortalece?', 'O que significa, na prática, não ser separado do amor de Deus?'],
    prayer: 'Senhor, firma nosso coração quando tudo parecer instável. Faz-nos descansar no Teu amor inabalável.',
  },
  {
    id: 'mesa-7', title: 'Família, feridas e graça', scripture: 'Colossenses 3:12-15',
    objective: 'Trabalhar graça e perdão nos relacionamentos.',
    opening: 'Grande parte das dores da vida passa pelos relacionamentos. A Palavra nos ensina a viver com graça, perdão e mansidão.',
    exposition: 'Paulo não descreve uma convivência idealizada, mas uma convivência tratada pela graça. Perdão e mansidão não são fraqueza; são frutos de Cristo em nós.',
    questions: ['Em que relacionamento você mais precisa de graça?', 'O que esse texto confronta em nós?', 'O que significa revestir-se dessas virtudes?'],
    prayer: 'Senhor, cura nossas relações e ensina-nos a viver com mansidão, perdão e amor.',
  },
  {
    id: 'mesa-8', title: 'O que é seguir Jesus de verdade?', scripture: 'Marcos 8:34-38',
    objective: 'Mostrar discipulado real.',
    opening: 'Muita gente tem simpatia por Jesus, mas seguir Jesus é mais profundo do que admiração.',
    exposition: 'Seguir Jesus envolve renúncia, entrega e prioridade. Não é um complemento da vida; é o centro.',
    questions: ['O que geralmente as pessoas pensam que é seguir Jesus?', 'O que esse texto mostra sobre discipulado real?', 'O que Cristo está pedindo de nós?'],
    prayer: 'Senhor, livra-nos de uma fé superficial e ensina-nos a seguir-Te com sinceridade.',
  },
  {
    id: 'mesa-9', title: 'Quando o medo toma conta', scripture: 'Salmo 56',
    objective: 'Tratar medo à luz da confiança em Deus.',
    opening: 'O medo paralisa, confunde e rouba paz. Mas a Palavra nos mostra um caminho de confiança mesmo em meio à fragilidade.',
    exposition: 'Davi não finge coragem plena; ele leva seu medo a Deus. Isso já é um ensino poderoso.',
    questions: ['O que mais te causa medo hoje?', 'Como você reage ao medo?', 'O que esse texto mostra sobre confiar no Senhor?'],
    prayer: 'Senhor, visita-nos em nossos medos e fortalece nossa confiança em Ti.',
  },
  {
    id: 'mesa-10', title: 'Quando a vida sai do controle', scripture: 'Provérbios 3:5-6',
    objective: 'Ensinar confiança e dependência.',
    opening: 'Há fases em que a vida parece escapar das nossas mãos. Nesses momentos, a tendência é desespero ou controle excessivo.',
    exposition: 'Confiar no Senhor não é passividade; é reconhecer que Ele enxerga melhor do que nós e guia nossos caminhos.',
    questions: ['Em que área você tem mais dificuldade de confiar?', 'O que significa não se apoiar no próprio entendimento?', 'Como esse texto te confronta hoje?'],
    prayer: 'Senhor, ensina-nos a confiar em Ti quando não entendemos o caminho.',
  },
  {
    id: 'mesa-11', title: 'O amor que recebe o filho que volta', scripture: 'Lucas 15:11-24',
    objective: 'Mostrar o coração do Pai para recomeços.',
    opening: 'Talvez alguém aqui se veja mais como alguém que se afastou do que como alguém que está perto. Esse texto é precioso porque revela o coração do Pai.',
    exposition: 'O filho volta quebrado, mas o pai corre, recebe e restaura. A graça de Deus não ignora o pecado, mas triunfa acolhendo o arrependido.',
    questions: ['O que mais te chama atenção nessa história?', 'Em que parte dessa parábola você se identifica hoje?', 'O que essa passagem mostra sobre o coração de Deus?'],
    prayer: 'Pai, atrai para Ti os corações cansados, afastados e feridos. Dá-nos arrependimento e esperança.',
  },
  {
    id: 'mesa-12', title: 'Uma vida firmada em Cristo', scripture: 'Colossenses 2:6-7',
    objective: 'Estimular firmeza e continuidade.',
    opening: 'Começar é importante, mas permanecer é essencial. Hoje vamos olhar para o que significa ser enraizado e firmado em Cristo.',
    exposition: 'A vida cristã saudável não é só emoção momentânea. É raiz, firmeza, crescimento e gratidão.',
    questions: ['O que ajuda uma pessoa a permanecer firme?', 'O que mais costuma enfraquecer sua caminhada?', 'Como podemos ser mais enraizados em Cristo?'],
    prayer: 'Senhor, aprofunda nossas raízes em Ti e dá-nos perseverança.',
  },
]

export const PRIMEIROS_PASSOS: FirstStepsLesson[] = [
  {
    id: 'passo-1', title: 'Sua história e a graça de Deus', scripture: 'Efésios 2:1-10',
    opening: 'Hoje eu queria primeiro te ouvir um pouco. Antes de falar do texto, me conta: como tem sido sua caminhada com Deus até aqui?',
    transition: 'Obrigado por abrir um pouco do seu coração. Vamos olhar para um texto que mostra como a graça de Deus entra na história real de pessoas como nós.',
    explanation: 'Esse texto mostra três coisas muito fortes. Primeiro, que o ser humano precisa de Deus profundamente. Segundo, que Deus age por graça e misericórdia. Terceiro, que Ele não apenas perdoa, mas dá novo propósito.',
    questions: ['O que mais te chamou atenção no texto?', 'Em que parte você mais se vê?', 'O que significa para você ser alcançado pela graça?'],
    application: 'A vida cristã não começa porque ficamos bons o suficiente. Ela começa porque Deus teve misericórdia.',
    prayer: 'Senhor, obrigado pela Tua graça. Visita o coração desta pessoa, trazendo clareza, consolo e fé.',
    nextStep: 'Até nosso próximo encontro, leia esse texto mais uma vez e ore agradecendo a Deus por Sua graça.',
  },
  {
    id: 'passo-2', title: 'Quem é Jesus e o evangelho', scripture: '1 Coríntios 15:1-4',
    opening: 'No encontro passado falamos sobre graça. Hoje vamos falar sobre o centro da nossa fé: Jesus e o evangelho.',
    explanation: 'O evangelho não é uma ideia genérica de Deus. O evangelho é a boa notícia de que Cristo morreu pelos nossos pecados, foi sepultado e ressuscitou. É por isso que existe perdão, reconciliação e nova vida.',
    questions: ['Quem é Jesus para você hoje?', 'O que você entende por evangelho?', 'O que ainda parece confuso nessa mensagem?'],
    application: 'A fé cristã não se sustenta em sentimentos soltos. Ela se sustenta em Cristo e em Sua obra.',
    prayer: 'Senhor, dá-nos clareza sobre quem Tu és e sobre a beleza do evangelho.',
    nextStep: 'Durante a semana, leia Marcos 1 e anote o que mais te chama atenção sobre Jesus.',
  },
  {
    id: 'passo-3', title: 'Arrependimento, fé e nova vida', scripture: '2 Coríntios 5:17',
    opening: 'Hoje vamos falar sobre o que significa responder ao evangelho.',
    explanation: 'Quando alguém é unido a Cristo, não recebe apenas uma religião nova; recebe nova vida. Isso envolve arrependimento, fé e um novo caminho.',
    questions: ['O que arrependimento significa para você?', 'Há algo que Deus já está confrontando em sua vida?', 'O que é nova vida em Cristo?'],
    application: 'Arrependimento não é só remorso. É mudança de direção diante de Deus.',
    prayer: 'Senhor, dá-nos arrependimento sincero e fé verdadeira.',
    nextStep: 'Ore durante a semana pedindo ao Senhor que mostre áreas que precisam ser entregues a Ele.',
  },
  {
    id: 'passo-4', title: 'Bíblia, oração e igreja', scripture: 'Atos 2:42-47',
    opening: 'Hoje vamos falar dos pilares da caminhada cristã.',
    explanation: 'Esse texto mostra uma vida cristã saudável com quatro marcas: Palavra, oração, comunhão e perseverança. A fé não amadurece no isolamento.',
    questions: ['Como está sua relação com a Bíblia hoje?', 'O que te dificulta orar?', 'O que esse texto ensina sobre vida em comunidade?'],
    application: 'Crescer na fé exige hábitos e também exige caminhar com o povo de Deus.',
    prayer: 'Senhor, firma-nos na Tua Palavra, ensina-nos a orar e a valorizar a comunhão.',
    nextStep: 'Separe 10 minutos por dia nesta semana para Bíblia e oração.',
  },
  {
    id: 'passo-5', title: 'Lutas, santificação e perseverança', scripture: 'Romanos 8:1-14',
    opening: 'A vida cristã é real, e por isso inclui lutas. Hoje vamos conversar sobre isso sem idealização.',
    explanation: 'Quem está em Cristo não vive sem batalha, mas também não vive sem esperança. O Espírito Santo nos ajuda a mortificar o pecado e andar em novidade de vida.',
    questions: ['Em que área você mais percebe luta hoje?', 'O que mais te desanima?', 'O que esse texto mostra sobre viver no Espírito?'],
    application: 'Santificação é um processo real, às vezes lento, mas sustentado pela graça de Deus.',
    prayer: 'Senhor, fortalece-nos nas lutas e faz-nos andar pelo Teu Espírito.',
    nextStep: 'Escolha uma área específica para apresentar ao Senhor em oração diária.',
  },
  {
    id: 'passo-6', title: 'Serviço, comunhão e próximo passo', scripture: '1 Pedro 4:10-11',
    opening: 'Hoje vamos fechar essa primeira etapa olhando para o próximo passo na vida da igreja.',
    explanation: 'Deus não nos chama apenas para receber; Ele também nos chama a servir. A vida cristã amadurece em comunhão, perseverança e serviço.',
    questions: ['O que Deus já começou a fazer em você nesses encontros?', 'Onde você percebe desejo de crescer mais?', 'Que tipo de próximo passo faria sentido agora?'],
    application: 'O próximo passo pode ser continuar sendo discipulado, participar da Mesa com mais constância, firmar presença na igreja e começar um serviço simples.',
    prayer: 'Senhor, confirma aquilo que estás fazendo e guia o próximo passo desta pessoa com sabedoria.',
    nextStep: 'Definir um caminho concreto: continuar discipulado, servir em algo simples, manter Mesa ou consolidar vida congregacional.',
  },
]

export const FIELD_GUIDE_SIMPLICITY_RULES = [
  'Não inventar mais reuniões do que o necessário.',
  'Não colocar gente demais em cada frente.',
  'Não transformar cada visitante em “caso”.',
  'Não burocratizar o cuidado.',
  'Não tentar crescer por empolgação; crescer por constância.',
  'Poucas coisas, feitas bem, toda semana.',
] as const

export const FIELD_GUIDE_LOCAL_STRUCTURE = {
  cambe: {
    title: 'Cambé · Monte Castelo',
    team: ['1 coordenador Equipe Presença', '3 a 5 pessoas na Equipe Presença', '1 coordenador Cuidado e Conexão', '2 ou 3 pessoas de apoio', '1 líder da Mesa', '1 apoio da Mesa', 'supervisão pastoral geral', '1 discipulador em formação além da supervisão'],
    flow: ['Domingo: visitante chega, é acolhido, fica no café e autoriza contato', 'Segunda: recebe mensagem', 'Na quinzena: é convidado para a Mesa', 'Depois: participa, demonstra abertura e entra em Primeiros Passos quando fizer sentido', 'Depois: pode começar a servir em algo simples'],
  },
  londrina: {
    title: 'Londrina · Industrial',
    team: ['1 coordenador Equipe Presença', '3 ou 4 pessoas de apoio', '1 coordenador Cuidado e Conexão', '2 pessoas de apoio', 'pastor ou casal maduro na Mesa', 'supervisão pastoral de Primeiros Passos'],
    flow: ['Domingo: pessoa é acolhida, fica alguns minutos se possível e recebe oração ou conversa', 'Segunda/terça: recebe mensagem de cuidado', 'Depois: volta ou responde bem', 'Mais adiante: convite para Mesa piloto', 'Depois: se houver abertura, entra em Primeiros Passos'],
    note: 'Londrina pede mais paciência cultural e menos aceleração.',
  },
} as const

export const FIELD_GUIDE_FINAL_LOGIC = 'Transformar presença em pertencimento, pertencimento em discipulado e discipulado em vida compartilhada.'
