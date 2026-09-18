export const NESTJOURNEY_PRODUCT_ID = 'nestjourney' as const
export const NESTJOURNEY_STORAGE_KEY = 'raiz_e_mesa' as const

export function journeyProductPath(organizationId: string) {
  const orgId = organizationId.trim()
  if (!orgId) throw new Error('missing_organization_id')
  return `organizations/${orgId}/products/${NESTJOURNEY_STORAGE_KEY}`
}

export function journeyCollectionPath(organizationId: string, collectionName: string) {
  const name = collectionName.trim()
  if (!name || name.includes('/')) throw new Error('invalid_collection_name')
  return `${journeyProductPath(organizationId)}/${name}`
}
