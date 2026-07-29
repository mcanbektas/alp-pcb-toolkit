import { describe, it, expect } from 'vitest'
import {
  parseNum, parseNumResult,
  fmt, fmtEng, fmtPct, fmtOhm, fmtVolt, fmtWatt, fmtRes, fmtAmp, fmtPow,
  NUM_ERR_EMPTY, NUM_ERR_THOUSANDS, NUM_ERR_INVALID,
} from './num'
// `fmtPct` sayıyı, `commonText(lang).pct` yüzde işaretini yazar. İkisi tek bir
// sözleşmedir, o yüzden eşleşmeleri burada da kilitlenir — saf katmanın kendisi
// hâlâ dil bilmez, yalnızca test iki tarafı yan yana koyar.
import { commonText } from '../data/uiText'

describe('hata kodları', () => {
  it('üç kod birbirinden ayrıdır', () => {
    const codes = [NUM_ERR_EMPTY, NUM_ERR_THOUSANDS, NUM_ERR_INVALID]
    expect(new Set(codes).size).toBe(3)
    expect(codes).toEqual(['empty', 'thousands', 'invalid'])
  })

  // Uyarı metni artık `commonText(lang).thousandsNote(fields)` içindedir; saf
  // katman yalnızca kodu döner, cümleyi kurmaz.
  it('binlik uyarısı iki dilli ve alan adlarını taşır', () => {
    for (const lang of ['tr', 'en']) {
      const note = commonText(lang).thousandsNote(['W'])
      expect(typeof note).toBe('string')
      expect(note).toContain('W')
    }
  })
})

describe('parseNumResult — boş giriş', () => {
  it.each([
    ['boş dize', ''],
    ['yalnızca boşluk', '   '],
    ['null', null],
    ['undefined', undefined],
  ])('%s boş sayılır', (_ad, input) => {
    const r = parseNumResult(input)
    expect(r.error).toBe(NUM_ERR_EMPTY)
    expect(Number.isNaN(r.value)).toBe(true)
  })
})

describe('parseNumResult — geçersiz giriş', () => {
  it.each([
    ['harf', 'abc'],
    ['artı işareti', '+5'],
    ['boşluklu binlik', '1 000'],
    ['Infinity dizesi', 'Infinity'],
    ['mantissasız üs', 'e5'],
    ['eksik üs', '1e'],
    ['çift eksi', '--5'],
    ['yüzde imi', '5%'],
    ['artılı üs', '2e+3'],
  ])('%s geçersizdir', (_ad, input) => {
    const r = parseNumResult(input)
    expect(r.error).toBe(NUM_ERR_INVALID)
    expect(Number.isNaN(r.value)).toBe(true)
  })
})

describe('parseNumResult — belirsiz binlik ayırıcı', () => {
  it.each([
    ['nokta binlik', '1.000'],
    ['virgül binlik', '1,000'],
    ['üç haneli tam kısım', '250,000'],
    ['çift ayırıcı', '1.000.000'],
    ['negatif binlik', '-1.000'],
    ['baştaki/sondaki boşluk kırpılır', '  1.000  '],
    ['üç ayrı ayırıcı grubu', '1.2.3'],
    ['tek haneli tam kısım', '9.999'],
    ['üç haneli tam kısım nokta', '999.999'],
    ['10.000', '10.000'],
  ])('%s binlik hatası verir', (_ad, input) => {
    const r = parseNumResult(input)
    expect(r.error).toBe(NUM_ERR_THOUSANDS)
    expect(Number.isNaN(r.value)).toBe(true)
  })

  it('sıfırla başlayan tam kısım belirsiz sayılmaz', () => {
    expect(parseNumResult('0.250')).toEqual({ value: 0.25, error: null })
    expect(parseNumResult('0.000')).toEqual({ value: 0, error: null })
  })

  it('dört haneli tam kısım belirsiz sayılmaz', () => {
    expect(parseNumResult('1000.000')).toEqual({ value: 1000, error: null })
  })
})

describe('parseNumResult — geçerli giriş', () => {
  it('ondalık virgül ve nokta aynı sonucu verir', () => {
    expect(parseNumResult('0,25').value).toBe(0.25)
    expect(parseNumResult('0.25').value).toBe(0.25)
    expect(parseNumResult('-4,7').value).toBe(-4.7)
  })

  it('üstel gösterimi kabul eder', () => {
    expect(parseNumResult('1e3').value).toBe(1000)
    expect(parseNumResult('1E-3').value).toBe(0.001)
    expect(parseNumResult('1,5e3').value).toBe(1500)
    expect(parseNumResult('1.5e2').value).toBe(150)
  })

  it('eksik tam/ondalık kısma izin verir', () => {
    expect(parseNumResult('.5').value).toBe(0.5)
    expect(parseNumResult('5.').value).toBe(5)
  })

  it('çevresindeki boşluğu kırpar', () => {
    expect(parseNumResult(' 42 ').value).toBe(42)
  })

  it('sıfır ve negatif sıfır geçerlidir', () => {
    expect(parseNumResult('0').value).toBe(0)
    expect(parseNumResult('-0').value).toBe(-0)
  })

  it('sayı türü doğrudan geçer, doğrulanmaz', () => {
    expect(parseNumResult(12)).toEqual({ value: 12, error: null })
    expect(parseNumResult(-3.5)).toEqual({ value: -3.5, error: null })
    // Sayı girdi hiç ayrıştırılmadığı için NaN/Infinity de hatasız döner
    expect(parseNumResult(Infinity)).toEqual({ value: Infinity, error: null })
    expect(parseNumResult(NaN).error).toBeNull()
    expect(Number.isNaN(parseNumResult(NaN).value)).toBe(true)
  })
})

describe('parseNum', () => {
  it('yalnızca değeri döndürür', () => {
    expect(parseNum('4,7')).toBe(4.7)
    expect(Number.isNaN(parseNum('abc'))).toBe(true)
    expect(Number.isNaN(parseNum('1.000'))).toBe(true)
    expect(Number.isNaN(parseNum(''))).toBe(true)
  })
})

describe('fmt', () => {
  it('sonlu olmayan değer için tire döner', () => {
    expect(fmt(NaN)).toBe('—')
    expect(fmt(Infinity)).toBe('—')
    expect(fmt(-Infinity)).toBe('—')
    expect(fmt(undefined)).toBe('—')
    expect(fmt(null)).toBe('—')
    // dize sayı sayılmaz
    expect(fmt('12')).toBe('—')
  })

  it('sıfır sade yazılır', () => {
    expect(fmt(0)).toBe('0')
    expect(fmt(-0)).toBe('0')
  })

  it('sondaki sıfırları ve boş ondalık noktayı atar', () => {
    expect(fmt(1)).toBe('1')
    expect(fmt(100)).toBe('100')
    expect(fmt(1.5)).toBe('1.5')
    expect(fmt(0.5)).toBe('0.5')
    expect(fmt(1234)).toBe('1234')
  })

  it('varsayılan 4 anlamlı basamağa yuvarlar', () => {
    expect(fmt(2 / 3)).toBe('0.6667')
    expect(fmt(1.0004)).toBe('1')
    expect(fmt(9.9999)).toBe('10')
    expect(fmt(100.5)).toBe('100.5')
  })

  it('sig parametresi anlamlı basamağı belirler', () => {
    expect(fmt(2 / 3, 3)).toBe('0.667')
    expect(fmt(2 / 3, 6)).toBe('0.666667')
    expect(fmt(12345.6789, 6)).toBe('12345.7')
    expect(fmt(1.5, 1)).toBe('2')
  })

  it('1e7 ve üstünde üç ondalıklı üstel gösterime geçer', () => {
    expect(fmt(1e7)).toBe('1.000e+7')
    expect(fmt(1e15)).toBe('1.000e+15')
    // eşik altındaki değer de yuvarlanınca üstel çıkabilir
    expect(fmt(12345.6789)).toBe('1.235e+4')
    expect(fmt(123456)).toBe('1.235e+5')
    expect(fmt(-12345.678)).toBe('-1.235e+4')
  })

  it('1e-4 altında üstel gösterime geçer, 1e-4 geçmez', () => {
    expect(fmt(1e-4)).toBe('0.0001')
    expect(fmt(0.0001234)).toBe('0.0001234')
    expect(fmt(9.99e-5)).toBe('9.990e-5')
    expect(fmt(1e-5)).toBe('1.000e-5')
    expect(fmt(1e-15)).toBe('1.000e-15')
  })

  it('negatif değerde işaret korunur', () => {
    expect(fmt(-1)).toBe('-1')
    expect(fmt(-2.5)).toBe('-2.5')
  })
})

describe('fmtEng — SI ön ek eşikleri', () => {
  it.each([
    [1e-15, '0.001 p'],
    [1e-14, '0.01 p'],
    [1e-13, '0.1 p'],
    [1e-12, '1 p'],
    [1e-11, '10 p'],
    [22e-12, '22 p'],
    [1e-9, '1 n'],
    [5e-7, '500 n'],
    [1e-6, '1 µ'],
    [4.7e-6, '4.7 µ'],
    [1e-4, '100 µ'],
    [1e-3, '1 m'],
    [0.001234, '1.234 m'],
    [0.047, '47 m'],
    [0.5, '500 m'],
    [0.9999, '999.9 m'],
    [1, '1'],
    [3.3, '3.3'],
    [999, '999'],
    [999.9, '999.9'],
    [1000, '1 k'],
    [1000.1, '1 k'],
    [1234, '1.234 k'],
    [4700, '4.7 k'],
    [47000, '47 k'],
    [470000, '470 k'],
    [1e6, '1 M'],
    [1.5e6, '1.5 M'],
    [123456789, '123.5 M'],
    [1e9, '1 G'],
  ])('fmtEng(%p) → %p', (input, expected) => {
    expect(fmtEng(input)).toBe(expected)
  })

  it('p altındaki değerler p ön ekinde kalır, yeni ön ek uydurulmaz', () => {
    expect(fmtEng(1e-13, 'F')).toBe('0.1 pF')
    expect(fmtEng(1e-18, 'F')).toBe('1.000e-6 pF')
  })

  it('G üstünde T ön eki yoktur, G ölçeğinde kalır', () => {
    expect(fmtEng(1e12, 'Ω')).toBe('1000 GΩ')
    expect(fmtEng(1e13, 'Ω')).toBe('1.000e+4 GΩ')
  })
})

describe('fmtEng — sıfır, negatif, sonlu olmayan', () => {
  it('sıfır ölçeklenmez ve ön ek almaz', () => {
    expect(fmtEng(0)).toBe('0')
    expect(fmtEng(0, 'Ω')).toBe('0 Ω')
    expect(fmtEng(-0, 'A')).toBe('0 A')
  })

  it('negatif değerde işaret ve ön ek birlikte gelir', () => {
    expect(fmtEng(-1)).toBe('-1')
    expect(fmtEng(-2.2e-6, 'A')).toBe('-2.2 µA')
    expect(fmtEng(-4700, 'Ω')).toBe('-4.7 kΩ')
  })

  it('sonlu olmayan değer için tire döner', () => {
    expect(fmtEng(NaN)).toBe('—')
    expect(fmtEng(Infinity, 'Ω')).toBe('—')
    expect(fmtEng(-Infinity)).toBe('—')
    expect(fmtEng(undefined)).toBe('—')
  })
})

describe('fmtEng — birim ve anlamlı basamak', () => {
  it('birim ön ekle birleşir, ön ek yokken fazla boşluk bırakmaz', () => {
    expect(fmtEng(4700, 'Ω')).toBe('4.7 kΩ')
    expect(fmtEng(3.3, 'V')).toBe('3.3 V')
    expect(fmtEng(3.3)).toBe('3.3')
    expect(fmtEng(1, '')).toBe('1')
  })

  it('sig anlamlı basamağı kısaltır', () => {
    expect(fmtEng(1234, 'Ω', 3)).toBe('1.23 kΩ')
    expect(fmtEng(1234, 'Ω', 2)).toBe('1.2 kΩ')
    expect(fmtEng(123456789, 'Ω', 3)).toBe('123 MΩ')
    expect(fmtEng(2 / 3, 'A', 3)).toBe('667 mA')
  })

  it('düşük sig ölçekli değeri üstel gösterime itebilir', () => {
    expect(fmtEng(0.9999, 'Ω', 3)).toBe('1.00e+3 mΩ')
    expect(fmtEng(999.9, 'Ω', 3)).toBe('1.00e+3 Ω')
  })
})

describe('fmtPct', () => {
  it('işaret her zaman yazılır', () => {
    expect(fmtPct(1)).toBe('+1')
    expect(fmtPct(0.5)).toBe('+0.5')
    expect(fmtPct(100)).toBe('+100')
  })

  it('negatifte tipografik eksi (U+2212) kullanılır', () => {
    expect(fmtPct(-1)).toBe('−1')
    expect(fmtPct(-0.5)).toBe('−0.5')
    expect(fmtPct(-12.345)).toBe('−12.3')
  })

  it('sıfır ve negatif sıfır artı işareti alır', () => {
    expect(fmtPct(0)).toBe('+0')
    expect(fmtPct(-0)).toBe('+0')
  })

  it('varsayılan 3 anlamlı basamak kullanır', () => {
    expect(fmtPct(12.345)).toBe('+12.3')
    expect(fmtPct(12.345, 4)).toBe('+12.35')
    expect(fmtPct(2.5, 1)).toBe('+3')
  })

  it('uç değerlerde üstel gösterime düşer', () => {
    expect(fmtPct(1e-5)).toBe('+1.000e-5')
    expect(fmtPct(-1e-5)).toBe('−1.000e-5')
    expect(fmtPct(1e8)).toBe('+1.000e+8')
  })

  it('sonlu olmayan değer için tire döner', () => {
    expect(fmtPct(NaN)).toBe('—')
    expect(fmtPct(Infinity)).toBe('—')
  })

  // Yüzde işaretini saf katman yazmaz: işaretin yeri dile göre değişir ve tek
  // yetkili yer `commonText(lang).pct`. Aksi hâlde aynı sayfada iki biçim çıkar.
  it('yüzde işaretini kendisi yazmaz', () => {
    expect(fmtPct(12.345)).not.toContain('%')
    expect(fmtPct(-12.345)).not.toContain('%')
    expect(fmtPct(0)).not.toContain('%')
  })

  it('ondalık ayırıcı iki dilde de noktadır', () => {
    // Mühendislik çıktısı kopyalanıp başka araca yapıştırılır; virgüle dönmez.
    expect(fmtPct(12.345)).toBe('+12.3')
    expect(commonText('tr').pct(fmtPct(12.345))).toContain('12.3')
    expect(commonText('en').pct(fmtPct(12.345))).toContain('12.3')
  })

  it('işaret sayıya bitişik kalır, yüzde işaretini dil yerleştirir', () => {
    expect(commonText('tr').pct(fmtPct(3.2))).toBe('%+3.2')
    expect(commonText('en').pct(fmtPct(3.2))).toBe('+3.2%')
    expect(commonText('tr').pct(fmtPct(-12.5))).toBe('%−12.5')
    expect(commonText('en').pct(fmtPct(-12.5))).toBe('−12.5%')
  })

  it('sonlu olmayan değere yüzde işareti takılmaz', () => {
    expect(commonText('tr').pct(fmtPct(NaN))).toBe('—')
    expect(commonText('en').pct(fmtPct(Infinity))).toBe('—')
  })
})

describe('fmtOhm / fmtVolt / fmtWatt — 1 birimin altı mili ölçekte', () => {
  it.each([
    [0.5, '500 mΩ', '500 mV', '500 mW'],
    [0.999, '999 mΩ', '999 mV', '999 mW'],
    [0.0475, '47.5 mΩ', '47.5 mV', '47.5 mW'],
    [0.001, '1 mΩ', '1 mV', '1 mW'],
    [1e-4, '0.1 mΩ', '0.1 mV', '0.1 mW'],
    [-0.5, '-500 mΩ', '-500 mV', '-500 mW'],
  ])('%p mili ölçekte yazılır', (v, ohm, volt, watt) => {
    expect(fmtOhm(v)).toBe(ohm)
    expect(fmtVolt(v)).toBe(volt)
    expect(fmtWatt(v)).toBe(watt)
  })

  it('sıfır da mili ölçekte yazılır (fmtEng aksine)', () => {
    expect(fmtOhm(0)).toBe('0 mΩ')
    expect(fmtVolt(0)).toBe('0 mV')
    expect(fmtWatt(0)).toBe('0 mW')
  })

  it('1 birim ve üstü temel birimde kalır', () => {
    expect(fmtOhm(1)).toBe('1 Ω')
    expect(fmtVolt(1.0001)).toBe('1 V')
    expect(fmtWatt(999)).toBe('999 W')
    expect(fmtOhm(-2.5)).toBe('-2.5 Ω')
  })

  it('büyük değerde ön ek yerine üstel gösterim kullanır', () => {
    expect(fmtOhm(1e6)).toBe('1.000e+6 Ω')
    expect(fmtVolt(1e8)).toBe('1.000e+8 V')
    expect(fmtWatt(1e6)).toBe('1.000e+6 W')
  })

  it('sonlu olmayan değer için tire döner', () => {
    expect(fmtOhm(NaN)).toBe('—')
    expect(fmtVolt(-Infinity)).toBe('—')
    expect(fmtWatt(Infinity)).toBe('—')
  })
})

describe('fmtRes / fmtAmp / fmtPow — fmtEng kısayolları', () => {
  it('birimi otomatik ekler', () => {
    expect(fmtRes(4700)).toBe('4.7 kΩ')
    expect(fmtAmp(0.0025)).toBe('2.5 mA')
    expect(fmtPow(0.125)).toBe('125 mW')
    expect(fmtPow(1500)).toBe('1.5 kW')
    expect(fmtPow(2.5e-6)).toBe('2.5 µW')
    expect(fmtAmp(1.5)).toBe('1.5 A')
  })

  it('sıfırı ve tireyi fmtEng gibi ele alır', () => {
    expect(fmtRes(0)).toBe('0 Ω')
    expect(fmtAmp(0)).toBe('0 A')
    expect(fmtRes(NaN)).toBe('—')
  })

  it('sig parametresini fmtEng’e geçirir', () => {
    expect(fmtRes(1234, 3)).toBe('1.23 kΩ')
    expect(fmtAmp(1234, 2)).toBe('1.2 kA')
  })
})
