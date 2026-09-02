export interface EcosystemHandoff {
  appId: 'raiz_e_mesa'
  orgId: string
  userId: string
  customToken: string
  expiresAt: number
  supportMode: boolean
  protocolVersion: '1.0.0'
}

function hasUnsafeTenantCharacter(value: string) {
  return [...value].some((character) => {
    const code = character.charCodeAt(0)
    return character === '/' || character === '\\' || code < 32 || code === 127
  })
}

export function parseEcosystemHandoff(encoded: string, now = Date.now()): EcosystemHandoff | null {
  if (!encoded || encoded.length > 24_000) return null
  try {
    const candidate = JSON.parse(atob(encoded)) as Partial<EcosystemHandoff>
    if (candidate.appId !== 'raiz_e_mesa' || candidate.protocolVersion !== '1.0.0') return null
    if (typeof candidate.orgId !== 'string' || !candidate.orgId || candidate.orgId.length > 256) return null
    if (candidate.orgId === '.' || candidate.orgId === '..' || hasUnsafeTenantCharacter(candidate.orgId)) return null
    if (typeof candidate.userId !== 'string' || !candidate.userId || candidate.userId.length > 256) return null
    if (typeof candidate.customToken !== 'string' || !candidate.customToken || candidate.customToken.length > 16_384) return null
    if (typeof candidate.expiresAt !== 'number' || candidate.expiresAt <= now || candidate.expiresAt > now + 600_000) return null
    if (typeof candidate.supportMode !== 'boolean') return null
    return candidate as EcosystemHandoff
  } catch {
    return null
  }
}
