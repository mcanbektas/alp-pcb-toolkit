import { describe, it, expect } from 'vitest'
import { reportDateStamp } from './reportText'

describe('reportDateStamp', () => {
  it('gün.ay.yıl biçiminde, sıfır dolgulu', () => {
    expect(reportDateStamp(new Date(2026, 6, 29))).toBe('29.07.2026')
  })

  it('tek haneli gün/ay sıfırla dolgulanır', () => {
    expect(reportDateStamp(new Date(2026, 0, 5))).toBe('05.01.2026')
  })
})
