import { describe, expect, it } from 'vitest'
import html from '../index.html?raw'
import shellSource from './JourneyShell.tsx?raw'
import gateSource from './EcosystemSessionGate.tsx?raw'
import { DIGITAL_PREMIUM } from './design-system/digitalPremium'

function channel(value: number) {
  const normalized = value / 255
  return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
}

function luminance(hex: string) {
  const value = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16))
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function contrast(foreground: string, background: string) {
  const [bright, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a)
  return (bright + 0.05) / (dark + 0.05)
}

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
    expect(html).toContain(`href="${DIGITAL_PREMIUM.assets.appleTouchIcon}"`)
    expect(html).toContain('href="/manifest.webmanifest"')
    expect(html).toContain(`content="${DIGITAL_PREMIUM.colors.navy950}"`)
    expect(html).toContain(`content="${DIGITAL_PREMIUM.assets.socialImage}"`)
    expect(html).toContain('name="twitter:card"')
  })

  it('preserves the full-brand / compact-symbol shell rule', () => {
    expect(shellSource).toContain(DIGITAL_PREMIUM.assets.fullBrand)
    expect(shellSource).toContain(DIGITAL_PREMIUM.assets.symbol)
    expect(gateSource).toContain(DIGITAL_PREMIUM.assets.fullBrand)
    expect(gateSource).not.toContain('/icon.svg')
    expect(gateSource).not.toContain('#c79a57')
    expect(gateSource).not.toContain('#090a09')
    expect(DIGITAL_PREMIUM.minTouchTargetPx).toBe(44)
  })

  it('proves WCAG AA contrast for canonical text and action combinations', () => {
    const backgrounds = [
      DIGITAL_PREMIUM.colors.navy950,
      DIGITAL_PREMIUM.colors.navy900,
      DIGITAL_PREMIUM.colors.navy800,
      DIGITAL_PREMIUM.colors.navy700,
    ]

    for (const background of backgrounds) {
      expect(contrast(DIGITAL_PREMIUM.colors.text, background)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(DIGITAL_PREMIUM.colors.textMuted, background)).toBeGreaterThanOrEqual(4.5)
    }

    expect(contrast(DIGITAL_PREMIUM.colors.navy950, DIGITAL_PREMIUM.colors.action)).toBeGreaterThanOrEqual(4.5)
  })

  it('keeps green intentionally limited to accent and strong action roles', () => {
    expect(DIGITAL_PREMIUM.colors.accent).toBe('#72D6B0')
    expect(DIGITAL_PREMIUM.colors.action).toBe('#43C79A')
    expect(DIGITAL_PREMIUM.colors.navy950).not.toBe(DIGITAL_PREMIUM.colors.accent)
    expect(DIGITAL_PREMIUM.colors.navy900).not.toBe(DIGITAL_PREMIUM.colors.action)
  })
})
