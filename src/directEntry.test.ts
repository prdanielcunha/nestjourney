import { describe, expect, it } from 'vitest'
import { productEnabled } from './directEntry'

describe('NestJourney invitation product access', () => {
  it('admits an invited member even if NestJourney is not yet configured for the church', () => {
    expect(productEnabled({ apps: {} }, { journeyRole: 'caregiver' }, false)).toBe(true)
    expect(productEnabled({ apps: { nestjourney: { status: 'not_configured' } } }, { journeyRole: 'member' }, false)).toBe(true)
  })

  it('does not turn an unrelated organization membership into Journey access', () => {
    expect(productEnabled({ apps: {} }, { role: 'member' }, false)).toBe(false)
    expect(productEnabled({ apps: {} }, undefined, false)).toBe(false)
  })

  it('respects explicit product suspension and active product status', () => {
    expect(productEnabled({ apps: { nestjourney: { status: 'suspended' } } }, { journeyRole: 'caregiver' }, false)).toBe(false)
    expect(productEnabled({ apps: { nestjourney: { status: 'inactive' } } }, { journeyRole: 'member' }, false)).toBe(false)
    expect(productEnabled({ apps: { nestjourney: { status: 'active' } } }, { role: 'member' }, false)).toBe(true)
  })

  it('preserves canonical global administrator access', () => {
    expect(productEnabled({ apps: {} }, undefined, true)).toBe(true)
  })
})
