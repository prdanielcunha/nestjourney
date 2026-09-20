import type { LucideIcon } from 'lucide-react'
import { ArrowRight } from 'lucide-react'
import './GuidedEmptyState.css'

export interface GuidedEmptyAction {
  label: string
  href?: string
  onClick?: () => void
  disabled?: boolean
}

export function GuidedEmptyState({
  icon: Icon,
  title,
  body,
  primary,
  secondary,
  compact = false,
}: {
  icon: LucideIcon
  title: string
  body: string
  primary?: GuidedEmptyAction
  secondary?: GuidedEmptyAction
  compact?: boolean
}) {
  const renderAction = (action: GuidedEmptyAction, kind: 'primary' | 'secondary') => {
    if (action.href) {
      return <a className={'guided-empty-action ' + kind} href={action.href} aria-disabled={action.disabled || undefined}>
        {action.label}<ArrowRight size={14}/>
      </a>
    }
    return <button className={'guided-empty-action ' + kind} type="button" disabled={action.disabled} onClick={action.onClick}>
      {action.label}<ArrowRight size={14}/>
    </button>
  }

  return <div className={'guided-empty-state'+(compact?' compact':'')}>
    <span className="guided-empty-icon"><Icon size={20}/></span>
    <div className="guided-empty-copy"><strong>{title}</strong><p>{body}</p></div>
    {primary||secondary?<div className="guided-empty-actions">
      {primary?renderAction(primary,'primary'):null}
      {secondary?renderAction(secondary,'secondary'):null}
    </div>:null}
  </div>
}
