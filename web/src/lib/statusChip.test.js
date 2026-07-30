import { describe, it, expect } from 'vitest'
import { worstLevel, countAtLevel, statusChip } from './statusChip'

// `ui` yerine kimlik-benzeri sahte: hangi metnin seçildiği ve sayının doğru
// geçirildiği görünür olsun.
const ui = {
  statusOk: 'OK',
  statusWarn: (n) => `WARN:${n}`,
  statusDanger: (n) => `DANGER:${n}`,
  statusUnknown: (n) => `UNKNOWN:${n}`,
}

describe('worstLevel', () => {
  it('en kötü seviyeyi döndürür (danger > warn > unknown > ok)', () => {
    expect(worstLevel(['ok', 'warn', 'danger'])).toBe('danger')
    expect(worstLevel(['ok', 'warn'])).toBe('warn')
    expect(worstLevel(['ok', 'unknown'])).toBe('unknown')
    expect(worstLevel(['unknown', 'warn'])).toBe('warn')
    expect(worstLevel(['ok', 'ok'])).toBe('ok')
  })

  it('DFM sözünü de sıralar (warning == warn rütbesi)', () => {
    expect(worstLevel(['ok', 'warning', 'unknown'])).toBe('warning')
    expect(worstLevel(['warning', 'danger'])).toBe('danger')
  })

  it('boş dizide ok, tanınmayan seviye en düşük sayılır', () => {
    expect(worstLevel([])).toBe('ok')
    expect(worstLevel(['saçma', 'ok'])).toBe('ok')
  })
})

describe('countAtLevel', () => {
  it('tam eşit seviyedeki öğe sayısı', () => {
    expect(countAtLevel(['warn', 'warn', 'ok', 'danger'], 'warn')).toBe(2)
    expect(countAtLevel(['ok'], 'danger')).toBe(0)
  })
})

describe('statusChip', () => {
  it('her seviye doğru sınıf + metin verir', () => {
    expect(statusChip('ok', 0, ui)).toEqual({ cls: 'ok', text: 'OK' })
    expect(statusChip('warn', 2, ui)).toEqual({ cls: 'warn', text: 'WARN:2' })
    expect(statusChip('danger', 1, ui)).toEqual({ cls: 'danger', text: 'DANGER:1' })
    expect(statusChip('unknown', 3, ui)).toEqual({ cls: 'unknown', text: 'UNKNOWN:3' })
  })

  it("'warning' (DFM sözü) 'warn' sınıfına köprülenir — eski uyuşmazlık biter", () => {
    expect(statusChip('warning', 2, ui)).toEqual({ cls: 'warn', text: 'WARN:2' })
  })

  it('tanınmayan seviye danger tabanına düşer (sessiz boş çip değil)', () => {
    expect(statusChip('saçma', 1, ui)).toEqual({ cls: 'danger', text: 'DANGER:1' })
  })
})
