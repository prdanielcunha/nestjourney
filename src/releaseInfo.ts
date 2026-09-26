export const NESTJOURNEY_VERSION = '0.9.0-beta.1' as const

export type ReleaseLocale = 'pt-BR' | 'en' | 'es'

export type NestJourneyReleaseNote = {
  version: string
  date: string
  kind: 'release' | 'hotfix'
  title: Record<ReleaseLocale, string>
  summary: Record<ReleaseLocale, string>
  items: Record<ReleaseLocale, string[]>
}

export const NESTJOURNEY_RELEASES: NestJourneyReleaseNote[] = [
  {
    version: '0.9.0-beta.1',
    date: '2026-09-26',
    kind: 'release',
    title: {
      'pt-BR': 'Beta Premium',
      en: 'Premium Beta',
      es: 'Beta Premium',
    },
    summary: {
      'pt-BR': 'Identidade Digital Premium, navegação por função, tempo real, governança e fundação de produto estabilizada.',
      en: 'Digital Premium identity, role-first navigation, real-time updates, governance, and product foundation stabilization.',
      es: 'Identidad Digital Premium, navegación por función, tiempo real, gobernanza y base del producto estabilizada.',
    },
    items: {
      'pt-BR': [
        'Hoje orientado ao que precisa de cuidado agora.',
        'Visões específicas para CEO, administração, liderança e equipes operacionais.',
        'Atualização em tempo real nas principais áreas da jornada.',
        'Identidade oficial NestJourney aplicada no login, shell, PWA e navegador.',
        'Regras de acesso e cuidado por ausência endurecidas com evidência factual.',
        'Melhorias de performance, acessibilidade WCAG AA e responsividade.',
      ],
      en: [
        'Today is centered on what needs care now.',
        'Dedicated views for CEO, administration, leadership, and operational teams.',
        'Real-time updates across the main journey areas.',
        'Official NestJourney identity across sign-in, shell, PWA, and browser surfaces.',
        'Stronger access and absence-care rules backed by factual evidence.',
        'Performance, WCAG AA accessibility, and responsive improvements.',
      ],
      es: [
        'Hoy está orientado a lo que necesita cuidado ahora.',
        'Vistas específicas para CEO, administración, liderazgo y equipos operativos.',
        'Actualización en tiempo real en las principales áreas de la jornada.',
        'Identidad oficial NestJourney aplicada al acceso, shell, PWA y navegador.',
        'Reglas de acceso y cuidado por ausencia reforzadas con evidencia factual.',
        'Mejoras de rendimiento, accesibilidad WCAG AA y responsividad.',
      ],
    },
  },
  {
    version: '0.8.x',
    date: '2026-09-25',
    kind: 'hotfix',
    title: {
      'pt-BR': 'Correções de identidade e produção',
      en: 'Brand and production fixes',
      es: 'Correcciones de identidad y producción',
    },
    summary: {
      'pt-BR': 'Correção dos assets oficiais da marca e do comportamento de cache do navegador.',
      en: 'Official brand asset and browser cache corrections.',
      es: 'Corrección de los assets oficiales de marca y del caché del navegador.',
    },
    items: {
      'pt-BR': ['Logo oficial no acesso e navegação.', 'Ícones rasterizados verificados em PWA e favicon.'],
      en: ['Official logo on sign-in and navigation.', 'Verified raster icons for PWA and favicon.'],
      es: ['Logo oficial en acceso y navegación.', 'Iconos rasterizados verificados en PWA y favicon.'],
    },
  },
]

export const NESTJOURNEY_IS_BETA = NESTJOURNEY_VERSION.includes('beta')
