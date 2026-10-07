import { createNestAiClient, type Locale } from '@millionsnest/ai'
import { auth, getJourneyAppCheckToken } from './firebase'
import type { AppLocale } from './i18n'

export type JourneyFormCandidate = {
  field: string
  value: string | null
  confidence: number
}

export type JourneyFormExtraction = {
  candidates: JourneyFormCandidate[]
  unreadableFields: string[]
  needsHumanReview: true
}

function localeOf(locale: AppLocale): Locale {
  if (locale === 'en') return 'en'
  if (locale === 'es') return 'es'
  return 'pt-BR'
}

function supportedMime(type: string): type is 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' | 'image/bmp' {
  return ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp'].includes(type)
}

async function fileBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const chunk = 0x8000
  let binary = ''
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, Math.min(bytes.length, index + chunk)))
  }
  return btoa(binary)
}

function clientFor(organizationId: string, locale: AppLocale) {
  const user = auth?.currentUser
  if (!user) throw new Error('NESTJOURNEY_AUTH_REQUIRED')
  return createNestAiClient({
    appId: 'nestjourney',
    organizationId,
    locale: localeOf(locale),
    getFirebaseIdToken: async () => user.getIdToken(),
    getAppCheckToken: getJourneyAppCheckToken,
    baseUrl: 'https://ai.millionsnest.com/v1/',
    hubBaseUrl: 'https://www.millionsnest.com/',
  })
}

export async function extractJourneyTeamListImage(input: {
  file: File
  organizationId: string
  congregationId: string
  locale: AppLocale
}): Promise<JourneyFormExtraction> {
  if (!supportedMime(input.file.type)) throw new Error('NESTJOURNEY_IMAGE_TYPE_UNSUPPORTED')
  if (input.file.size <= 0 || input.file.size > 10 * 1024 * 1024) {
    throw new Error('NESTJOURNEY_IMAGE_SIZE_INVALID')
  }

  const response = await clientFor(input.organizationId, input.locale).vision<JourneyFormExtraction>(
    'journey.form.extract',
    {
      fileBase64: await fileBase64(input.file),
      mimeType: input.file.type,
      fileName: input.file.name || 'journey-team-list',
      context: {
        formType: 'team_interest_list',
        congregationId: input.congregationId,
        candidateConvention: {
          field: 'visible person name',
          value: 'comma-separated canonical selected areas',
        },
        allowedAreas: ['presence', 'table', 'care', 'house', 'discipleship', 'support'],
        authority: {
          createsPerson: false,
          imports: false,
          humanReviewRequired: true,
        },
      },
    },
  )

  return response.result
}

export function journeyExtractionToReviewText(extraction: JourneyFormExtraction): string {
  return extraction.candidates
    .filter((candidate) => candidate.field.trim())
    .map((candidate) => {
      const name = candidate.field.trim()
      const value = candidate.value?.trim() || ''
      return value ? `${name} - ${value}` : name
    })
    .join('\n')
}
