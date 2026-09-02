import { useContext } from 'react'
import { EcosystemContext } from './ecosystem-context'

export function useEcosystem() {
  const context = useContext(EcosystemContext)
  if (!context) throw new Error('useEcosystem deve ser usado dentro de EcosystemProvider')
  return context
}
