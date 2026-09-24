import { describe, expect, it } from 'vitest'
import html from '../index.html?raw'
import shellSource from './JourneyShell.tsx?raw'
import { DIGITAL_PREMIUM } from './design-system/digitalPremium'

describe('Digital Premium design contract', () => {
  it('keeps the official NestJourney palette as the product contract', () => {
    expect(DIGITAL_PREMIUM.colors).toEqual({
      navy950: '#06101E',
      navy900: '#081628',
      navy800: '#0D2035',
      navy700: '#122A43',
      accent: '#72D6B0',
      action: '#43C79A',
      text: '#F7FAFC',
      textMuted: '#9EB0C3',
    })
  })

  it('keeps browser, PWA and social metadata wired to NestJourney assets', () => {
    expect(html).toContain(`href="${DIGITAL_PREMIUM.assets.favicon}"`)
    expect(html).toContain(`href="${DIGITAL_PREMIUM.assets.faviconSvg}"`)
    expect(html).toContain(`href="${DIGITAL_PREMIUM.assets.appleTouchIcon}"`)
    expect(html).toContain('href="/manifest.webmanifest"')
    expect(html).toContain(`content="${DIGITAL_PREMIUM.colors.navy950}"`)
    expect(html).toContain('property="og:image"')
    expect(html).toContain('name="twitter:card"')
  })

  it('preserves the full-brand / compact-symbol shell rule', () => {
    expect(shellSource).toContain(DIGITAL_PREMIUM.assets.fullBrand)
    expect(shellSource).toContain(DIGITAL_PREMIUM.assets.symbol)
    expect(DIGITAL_PREMIUM.minTouchTargetPx).toBe(44)
  })

  it('keeps green intentionally limited to accent and strong action roles', () => {
    expect(DIGITAL_PREMIUM.colors.accent).toBe('#72D6B0')
    expect(DIGITAL_PREMIUM.colors.action).toBe('#43C79A')
    expect(DIGITAL_PREMIUM.colors.navy950).not.toBe(DIGITAL_PREMIUM.colors.accent)
    expect(DIGITAL_PREMIUM.colors.navy900).not.toBe(DIGITAL_PREMIUM.colors.action)
  })
})
