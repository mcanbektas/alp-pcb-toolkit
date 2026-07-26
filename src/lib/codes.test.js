import { describe, it, expect } from 'vitest'
import {
  decodeColorBands, encodeColorBands, resistanceAtTemp,
  decodeSmd, decodeCapacitor,
  CODE_ERR_FORMAT, CODE_ERR_DIGIT, CODE_ERR_RANGE,
} from './codes'

describe('spec §13 Test 5 — direnç kodu', () => {
  it('472 → 4.7 kΩ', () => {
    const r = decodeSmd('472')
    expect(r.error).toBeUndefined()
    expect(r.ohms).toBe(4700)
    expect(r.kind).toBe('3-digit')
  })
})

describe('renk bantları', () => {
  it('4 bant: sarı-mor-kırmızı-altın → 4.7 kΩ ±5 %', () => {
    const r = decodeColorBands(['yellow', 'violet', 'red', 'gold'])
    expect(r.ohms).toBe(4700)
    expect(r.tolerance).toBe(5)
    expect(r.min).toBeCloseTo(4465, 6)
    expect(r.max).toBeCloseTo(4935, 6)
  })

  it('5 bant: kahve-siyah-siyah-kahve-kahve → 1 kΩ ±1 %', () => {
    const r = decodeColorBands(['brown', 'black', 'black', 'brown', 'brown'])
    expect(r.ohms).toBe(1000)
    expect(r.tolerance).toBe(1)
  })

  it('6. bant sıcaklık katsayısını taşır', () => {
    const r = decodeColorBands(['brown', 'black', 'black', 'brown', 'brown', 'red'])
    expect(r.tcr).toBe(50)
    // R(T) = R₂₅·[1 + TCR·10⁻⁶·(T − 25)]
    expect(resistanceAtTemp(r.ohms, r.tcr, 125)).toBeCloseTo(1005, 9)
  })

  it('altın rakam bandı olarak kullanılamaz', () => {
    const r = decodeColorBands(['gold', 'violet', 'red', 'gold'])
    expect(r.error).toBe(CODE_ERR_DIGIT)
  })

  it('değerden renge ve geri dönünce aynı değeri verir', () => {
    const enc = encodeColorBands(4700, 5, 4)
    expect(enc.bands).toEqual(['yellow', 'violet', 'red', 'gold'])
    expect(decodeColorBands(enc.bands).ohms).toBe(4700)
  })

  it('renklerle temsil edilemeyen tolerans hata döner', () => {
    expect(encodeColorBands(4700, 3, 4).error).toBe(CODE_ERR_RANGE)
  })
})

describe('SMD kodları', () => {
  it('4 haneli: 4701 → 4.7 kΩ', () => {
    expect(decodeSmd('4701').ohms).toBe(4700)
  })

  it('R işareti ondalık ayracıdır', () => {
    expect(decodeSmd('4R7').ohms).toBeCloseTo(4.7, 12)
    expect(decodeSmd('R22').ohms).toBeCloseTo(0.22, 12)
  })

  it('sıfır ohm jumper tanınır', () => {
    for (const c of ['0', '00', '000', '0000']) {
      const r = decodeSmd(c)
      expect(r.ohms).toBe(0)
      expect(r.kind).toBe('zero')
    }
  })

  it('EIA-96: 01A → 100 Ω, 96F → 97.6 MΩ', () => {
    expect(decodeSmd('01A').ohms).toBeCloseTo(100, 9)
    expect(decodeSmd('96F').ohms).toBeCloseTo(97.6e6, 0)
  })

  it('EIA-96 çarpan harfleri doğru ölçekler', () => {
    expect(decodeSmd('01B').ohms).toBeCloseTo(1000, 9)
    expect(decodeSmd('01X').ohms).toBeCloseTo(10, 9)
    expect(decodeSmd('01Z').ohms).toBeCloseTo(0.1, 9)
  })

  it('üretici alias\'ı yalnızca üretici profilinde kabul edilir', () => {
    expect(decodeSmd('01H').error).toBe(CODE_ERR_FORMAT)
    const r = decodeSmd('01H', { profile: 'manufacturer' })
    expect(r.ohms).toBeCloseTo(1000, 9)
    expect(r.aliasUsed).toBe(true)
  })

  it('tanınmayan kod hata döner, tahmin üretmez', () => {
    const r = decodeSmd('4K7X')
    expect(r.error).toBe(CODE_ERR_FORMAT)
    expect(r.ohms).toBeUndefined()
  })
})

describe('kondansatör kodları', () => {
  it('104 → 100 nF', () => {
    const r = decodeCapacitor('104')
    expect(r.pF).toBe(100000)
    expect(r.nF).toBeCloseTo(100, 9)
    expect(r.uF).toBeCloseTo(0.1, 12)
  })

  it('tolerans harfi sınırları verir', () => {
    const r = decodeCapacitor('104K')
    expect(r.tolerance).toBe(10)
    expect(r.min).toBeCloseTo(90000, 6)
    expect(r.max).toBeCloseTo(110000, 6)
  })

  it('Z asimetrik tolerans olarak işaretlenir', () => {
    const r = decodeCapacitor('104Z')
    expect(r.tolerance).toBeNull()
    expect(r.toleranceNote).toMatch(/80/)
  })

  it('geçersiz biçim hata döner', () => {
    expect(decodeCapacitor('10').error).toBe(CODE_ERR_FORMAT)
    expect(decodeCapacitor('104Q').error).toBe(CODE_ERR_FORMAT)
  })
})
