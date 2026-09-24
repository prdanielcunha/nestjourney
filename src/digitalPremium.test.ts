import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '..')
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')

describe('Digital Premium design contract', () => {
  it('keeps the official NestJourney palette centralized in semantic tokens', () => {
    const tokens = read('src/design-system/nestjourney-tokens.css').toLowerCase()

    expect(tokens).toContain('--nj-navy-950:#06101e')
    expect(tokens).toContain('--nj-navy-900:#081628')
    expect(tokens).toContain('--nj-navy-800:#0d2035')
    expect(tokens).toContain('--nj-navy-700:#122a43')
    expect(tokens).toContain('--nj-mint-500:#72d6b0')
    expect(tokens).toContain('--nj-mint-600:#43c79a')
    expect(tokens).toContain('--nj-text:#f7fafc')
    expect(tokens).toContain('--nj-text-muted:#9eb0c3')
  })

  it('keeps browser, PWA and social metadata wired to NestJourney assets', () => {
    const html = read('index.html')
    const manifest = JSON.parse(read('public/manifest.webmanifest')) as {
      background_color: string
      theme_color: string
      icons: Array<{ src: string; sizes: string; purpose: string }>
    }

    expect(html).toContain('href="/favicon.ico"')
    expect(html).toContain('href="/favicon.svg"')
    expect(html).toContain('href="/apple-touch-icon.png"')
    expect(html).toContain('content="#06101E"')
    expect(html).toContain('property="og:image"')

    expect(manifest.background_color).toBe('#06101E')
    expect(manifest.theme_color).toBe('#06101E')
    expect(manifest.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({ src: '/pwa/icon-192.png', sizes: '192x192', purpose: 'any' }),
      expect.objectContaining({ src: '/pwa/icon-512.png', sizes: '512x512', purpose: 'any' }),
      expect.objectContaining({ src: '/pwa/maskable-icon-192.png', purpose: 'maskable' }),
      expect.objectContaining({ src: '/pwa/maskable-icon-512.png', purpose: 'maskable' }),
    ]))
  })

  it('preserves the full-brand / compact-symbol shell rule and mobile accessibility guardrails', () => {
    const shell = read('src/JourneyShell.tsx')
    const globalCss = read('src/index.css')

    expect(shell).toContain('/brand/nestjourney-horizontal-light')
    expect(shell).toContain('/brand/nestjourney-symbol.svg')
    expect(globalCss).toContain('button{min-height:44px}')
    expect(globalCss).toContain('@media(prefers-reduced-motion:reduce)')
    expect(globalCss).toContain('focus-visible')
  })

  it('does not reintroduce the pre-redesign gold/brown theme in the global theme files', () => {
    const themeSurface = [
      read('src/index.css'),
      read('src/JourneyShell.css'),
      read('src/design-system/nestjourney-tokens.css'),
    ].join('\n').toLowerCase()

    expect(themeSurface).not.toContain('#c79a57')
    expect(themeSurface).not.toContain('#090a09')
  })
})
