import { describe, expect, it } from 'vitest'
import { journeyExtractionToReviewText, type JourneyFormExtraction } from './nestAi'

describe('NestAI Journey form extraction boundary', () => {
  it('turns only explicit AI candidates into deterministic review text', () => {
    const extraction: JourneyFormExtraction = {
      candidates: [
        { field: 'Beatriz', value: 'table, care', confidence: 0.97 },
        { field: 'Lucas', value: 'support', confidence: 0.91 },
        { field: '  ', value: 'presence', confidence: 0.4 },
      ],
      unreadableFields: ['row_3.name'],
      needsHumanReview: true,
    }

    expect(journeyExtractionToReviewText(extraction)).toBe(
      'Beatriz - table, care\nLucas - support',
    )
  })

  it('keeps a visible name even when no area was confidently extracted', () => {
    const extraction: JourneyFormExtraction = {
      candidates: [
        { field: 'Jacilda', value: null, confidence: 0.63 },
      ],
      unreadableFields: ['Jacilda.areas'],
      needsHumanReview: true,
    }

    expect(journeyExtractionToReviewText(extraction)).toBe('Jacilda')
  })
})
