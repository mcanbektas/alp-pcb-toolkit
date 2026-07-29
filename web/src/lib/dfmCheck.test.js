import { describe, it, expect } from 'vitest'
import {
  checkLimit, checkCapability, decidingMinimum, worstStatus, summarizeChecks,
  STATUS_OK, STATUS_WARNING, STATUS_DANGER, STATUS_UNKNOWN,
  SOURCE_FAB_PROFILE, SOURCE_USER_RULE, SOURCE_STANDARD_PROFILE,
  DIRECTION_MIN, DIRECTION_MAX,
  UNKNOWN_NO_LIMIT, UNKNOWN_NO_ACTUAL, UNKNOWN_NOT_FINITE, UNKNOWN_NO_CAPABILITY,
  DEFAULT_WARN_PERCENT,
} from './dfmCheck'

// Elle doğrulanan marj örnekleri (brief §3 ve §12.1):
//
//   actual = 1.65, required = 1.50, yön 'min'
//   margin        = 1.65 - 1.50 = 0.15
//   marginPercent = 100 × 0.15 / 1.50 = %10
//   uyarı marjı %10 → marginPercent < 10 değil, tam eşit → ok
//
//   actual = 1.55, required = 1.50
//   margin = 0.05, marginPercent ≈ %3.333 → %10'un altında → warning
//
//   actual = 1.40, required = 1.50
//   margin = -0.10 → danger

describe('checkLimit — yön min', () => {
  it('sınırı ve uyarı marjını sağlayan değer ok döner', () => {
    const c = checkLimit({
      id: 'clearance', actual: 1.65, required: 1.5,
      source: SOURCE_USER_RULE, warnPercent: 10,
    })
    expect(c.status).toBe(STATUS_OK)
    expect(c.margin).toBeCloseTo(0.15, 12)
    expect(c.marginPercent).toBeCloseTo(10, 9)
    expect(c.source).toBe(SOURCE_USER_RULE)
    expect(c.direction).toBe(DIRECTION_MIN)
  })

  it('sınırı sağlayıp uyarı marjının altında kalan değer warning döner', () => {
    const c = checkLimit({ id: 'clearance', actual: 1.55, required: 1.5, warnPercent: 10 })
    expect(c.status).toBe(STATUS_WARNING)
    expect(c.margin).toBeCloseTo(0.05, 12)
    expect(c.marginPercent).toBeCloseTo(10 / 3, 9)
  })

  it('sınırın altındaki değer danger döner', () => {
    const c = checkLimit({ id: 'clearance', actual: 1.4, required: 1.5, warnPercent: 10 })
    expect(c.status).toBe(STATUS_DANGER)
    expect(c.margin).toBeCloseTo(-0.1, 12)
    expect(c.marginPercent).toBeCloseTo(-100 / 15, 9)
  })

  it('tam sınırdaki değer marjsızdır: uyarı bandı varsa warning', () => {
    const c = checkLimit({ id: 'clearance', actual: 1.5, required: 1.5, warnPercent: 10 })
    expect(c.margin).toBe(0)
    expect(c.marginPercent).toBe(0)
    expect(c.status).toBe(STATUS_WARNING)
  })

  it('uyarı marjı verilmezse yalnızca sınır kontrolü yapılır', () => {
    const c = checkLimit({ id: 'clearance', actual: 1.5, required: 1.5, warnPercent: null })
    expect(c.status).toBe(STATUS_OK)
  })
})

describe('checkLimit — yön max', () => {
  // Aspect ratio gibi tavan kontrollerinde artı marj yine "iyi" demektir:
  // margin = required - actual = 8 - 6 = 2, yüzde = 100 × 2 / 8 = %25
  it('tavanın altındaki değer ok döner ve marj ters yönde hesaplanır', () => {
    const c = checkLimit({
      id: 'aspectRatio', actual: 6, required: 8,
      direction: DIRECTION_MAX, warnPercent: 10,
    })
    expect(c.status).toBe(STATUS_OK)
    expect(c.margin).toBe(2)
    expect(c.marginPercent).toBe(25)
  })

  it('tavanı aşan değer danger döner', () => {
    const c = checkLimit({ id: 'aspectRatio', actual: 10, required: 8, direction: DIRECTION_MAX })
    expect(c.status).toBe(STATUS_DANGER)
    expect(c.margin).toBe(-2)
    expect(c.marginPercent).toBe(-25)
  })
})

describe('checkLimit — değerlendirilemeyen durumlar', () => {
  it('sınır tanımlı değilse unknown döner, ok değil', () => {
    const c = checkLimit({ id: 'annularRing', actual: 0.1, required: null })
    expect(c.status).toBe(STATUS_UNKNOWN)
    expect(c.variant).toBe(UNKNOWN_NO_LIMIT)
    expect(c.margin).toBeNull()
    expect(c.marginPercent).toBeNull()
  })

  it('gerçek değer yoksa unknown döner', () => {
    const c = checkLimit({ id: 'annularRing', actual: null, required: 0.1 })
    expect(c.status).toBe(STATUS_UNKNOWN)
    expect(c.variant).toBe(UNKNOWN_NO_ACTUAL)
  })

  it('sonlu olmayan değer unknown döner; NaN/Infinity dışarı sızmaz', () => {
    for (const bad of [NaN, Infinity, -Infinity]) {
      const c = checkLimit({ id: 'x', actual: bad, required: 1 })
      expect(c.status).toBe(STATUS_UNKNOWN)
      expect(c.variant).toBe(UNKNOWN_NOT_FINITE)
      expect(c.actual).toBeNull()
    }
    const c = checkLimit({ id: 'x', actual: 1, required: NaN })
    expect(c.status).toBe(STATUS_UNKNOWN)
  })

  it('sınır sıfırsa yüzdesel marj hesaplanmaz ama mutlak marj çalışır', () => {
    const c = checkLimit({ id: 'gap', actual: 0.2, required: 0, warnPercent: 10 })
    expect(c.marginPercent).toBeNull()
    expect(c.margin).toBe(0.2)
    expect(c.status).toBe(STATUS_OK)
    expect(Number.isFinite(c.margin)).toBe(true)
  })
})

describe('checkLimit — kayan nokta gürültüsü', () => {
  // 0.8 - 0.45 = 0.35000000000000003; buradan 0.35 çıkarınca marj
  // 2.8e-17 yerine bazı yollarda negatif çıkabilir. Gürültü, sınırın altına
  // düşmek değildir: bağıl pay danger'ı engeller.
  it('bağıl pay içindeki negatif gürültü danger üretmez', () => {
    const actual = 0.8 - 0.45
    const c = checkLimit({ id: 'channel', actual, required: 0.35, warnPercent: null })
    expect(c.status).toBe(STATUS_OK)

    const c2 = checkLimit({ id: 'channel', actual: 0.35, required: 0.8 - 0.45, warnPercent: null })
    expect(c2.status).toBe(STATUS_OK)
    expect(c2.margin).toBeLessThan(0)
  })

  it('gerçek bir eksiklik gürültü payına sığmaz', () => {
    const c = checkLimit({ id: 'channel', actual: 0.3499, required: 0.35 })
    expect(c.status).toBe(STATUS_DANGER)
  })
})

describe('checkCapability', () => {
  it('tasarım yeteneği istemiyorsa kontrol konu dışıdır', () => {
    const c = checkCapability({ id: 'viaInPad', required: false, supported: null })
    expect(c.status).toBe(STATUS_OK)
  })

  it('profil bayrağı tanımsızsa unknown döner — false ile aynı değildir', () => {
    const c = checkCapability({ id: 'viaInPad', required: true, supported: null })
    expect(c.status).toBe(STATUS_UNKNOWN)
    expect(c.variant).toBe(UNKNOWN_NO_CAPABILITY)
  })

  it('bayrak false ise danger, true ise ok döner', () => {
    expect(checkCapability({ id: 'viaInPad', required: true, supported: false }).status)
      .toBe(STATUS_DANGER)
    expect(checkCapability({ id: 'viaInPad', required: true, supported: true }).status)
      .toBe(STATUS_OK)
  })
})

describe('decidingMinimum', () => {
  // Brief §12.1: profil 1.25 (rakım düzeltilmiş), üretici 0.20, kullanıcı 1.50
  // → en büyüğü seçilir: 1.50, belirleyici kaynak kullanıcı kuralı.
  it('en büyük minimumu ve kaynağını seçer', () => {
    const d = decidingMinimum([
      { value: 1.25, source: SOURCE_STANDARD_PROFILE },
      { value: 0.2, source: SOURCE_FAB_PROFILE },
      { value: 1.5, source: SOURCE_USER_RULE },
    ])
    expect(d.value).toBe(1.5)
    expect(d.source).toBe(SOURCE_USER_RULE)
  })

  it('tanımsız kaynaklar seçime katılmaz', () => {
    const d = decidingMinimum([
      { value: null, source: SOURCE_STANDARD_PROFILE },
      { value: undefined, source: SOURCE_USER_RULE },
      { value: 0.2, source: SOURCE_FAB_PROFILE },
    ])
    expect(d.value).toBe(0.2)
    expect(d.source).toBe(SOURCE_FAB_PROFILE)
  })

  it('hiçbir kaynak tanımlı değilse sıfır değil null döner', () => {
    const d = decidingMinimum([{ value: null, source: SOURCE_FAB_PROFILE }])
    expect(d.value).toBeNull()
    expect(d.source).toBeNull()
    expect(decidingMinimum([]).value).toBeNull()
  })

  it('sonlu olmayan aday seçime katılmaz', () => {
    const d = decidingMinimum([
      { value: Infinity, source: SOURCE_STANDARD_PROFILE },
      { value: 0.3, source: SOURCE_FAB_PROFILE },
    ])
    expect(d.value).toBe(0.3)
  })
})

describe('worstStatus / summarizeChecks', () => {
  const mk = (status) => ({ id: status, status })

  it('en kötü durumu döner', () => {
    expect(worstStatus([mk(STATUS_OK), mk(STATUS_WARNING)])).toBe(STATUS_WARNING)
    expect(worstStatus([mk(STATUS_OK), mk(STATUS_UNKNOWN), mk(STATUS_DANGER)])).toBe(STATUS_DANGER)
    expect(worstStatus([mk(STATUS_OK), mk(STATUS_UNKNOWN)])).toBe(STATUS_UNKNOWN)
    expect(worstStatus([mk(STATUS_OK)])).toBe(STATUS_OK)
  })

  it('boş listede ok değil unknown döner', () => {
    expect(worstStatus([])).toBe(STATUS_UNKNOWN)
    expect(worstStatus(null)).toBe(STATUS_UNKNOWN)
  })

  it('durum sayımını ve toplamı döner', () => {
    const s = summarizeChecks([mk(STATUS_OK), mk(STATUS_OK), mk(STATUS_UNKNOWN), mk(STATUS_DANGER)])
    expect(s[STATUS_OK]).toBe(2)
    expect(s[STATUS_UNKNOWN]).toBe(1)
    expect(s[STATUS_DANGER]).toBe(1)
    expect(s[STATUS_WARNING]).toBe(0)
    expect(s.worst).toBe(STATUS_DANGER)
    expect(s.total).toBe(4)
  })
})

describe('uyarı marjı varsayılanı', () => {
  it('gizli eşik değil, açık bir başlangıç değeridir', () => {
    expect(DEFAULT_WARN_PERCENT).toBe(10)
    // Motor kendiliğinden uygulamaz: geçirilmediğinde uyarı bandı yoktur.
    const c = checkLimit({ id: 'x', actual: 1.001, required: 1 })
    expect(c.status).toBe(STATUS_OK)
  })
})
