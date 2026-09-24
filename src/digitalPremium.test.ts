import { describe, expect, it } from 'vitest'
import tokens from './design-system/nestjourney-tokens.css?inline'
import globalCss from './index.css?inline'
import shellSource from './JourneyShell.tsx?raw'
import html from '../index.html?raw'

describe('Digital Premium design contract', () => {
  it('keeps the official NestJourney palette centralized in semantic tokens', () => {
    const palette = tokens.toLowerCase()

    expect(palette).toContain('--nj-navy-950:#06101e')
    expect(palette).toContain('--nj-navy-900:#081628')
    expect(palette).toContain('--nj-navy-800:#0d2035')
    expect(palette).toContain('--nj-navy-700:#122a43')
    expect(palette).toContain('--nj-mint-500:#72d6b0')
    expect(palette).toContain('--nj-mint-600:#43c79a')
    expect(palette).toContain('--nj-text:#f7fafc')
    expect(palette).toContain('--nj-text-muted:#9eb0c3')
  })

  it('keeps browser, PWA and social metadata wired to NestJourney assets', () => {
    expect(html).toContain('href="/favicon.ico"')
    expect(html).toContain('href="/favicon.svg"')
    expect(html).toContain('href="/apple-touch-icon.png"')
    expect(html).toContain('href="/manifest.webmanifest"')
    expect(html).toContain('content="#06101E"')
    expect(html).toContain('property="og:image"')
    expect(html).toContain('name="twitter:card"')
  })

  it('preserves the full-brand / compact-symbol shell rule and mobile accessibility guardrails', () => {
    expect(shellSource).toContain('/brand/nestjourney-horizontal-light')
    expect(shellSource).toContain('/brand/nestjourney-symbol.svg')
    expect(globalCss).toContain('button{min-height:44px}')
    expect(globalCss).toContain('@media(prefers-reduced-motion:reduce)')
    expect(globalCss).toContain('focus-visible')
  })

  it('does not reintroduce the pre-redesign gold/brown theme in the global theme files', () => {
    const themeSurface = [globalCss, tokens].join('\n').toLowerCase()

    expect(themeSurface).not.toContain('#c79a57')
    expect(themeSurface).not.toContain('#090a09')
  })
})
