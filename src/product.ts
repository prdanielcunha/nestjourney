export const PRODUCT_ID = 'nestjourney' as const
export const PRODUCT_NAME = 'NestJourney'
export const PRODUCT_DOMAIN = 'https://nestjourney.millionsnest.com'

// Compatibility only: existing pilots may already have entitlements and data under
// the former product identifier. Keep reading them until a server-side migration is complete.
export const LEGACY_PRODUCT_IDS = ['raiz_e_mesa', 'raiz-e-mesa'] as const
export const ACCEPTED_PRODUCT_IDS = [PRODUCT_ID, ...LEGACY_PRODUCT_IDS] as const

// The Firestore namespace is intentionally stable so the rebrand never forks or loses data.
export const STORAGE_NAMESPACE = 'raiz_e_mesa' as const
