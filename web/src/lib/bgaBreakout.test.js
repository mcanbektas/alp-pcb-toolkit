import { describe, it, expect } from 'vitest'
import {
  computeBgaBreakout, maxTraceCount, buildBgaSweep,
  VIA_THROUGH, VIA_MICROVIA, VIA_IN_PAD, VIA_TYPES,
  METHOD_GEOMETRIC,
  BGA_ERR_REQUIRED, BGA_ERR_NOT_FINITE, BGA_ERR_NON_POSITIVE, BGA_ERR_NOT_INTEGER,
  BGA_ERR_GEOMETRY, BGA_ERR_VIA_TYPE,
  BGA_VARIANT_LAND_OVER_PITCH, BGA_VARIANT_MASK_CLOSED,
  BGA_WARN_CHANNEL_INSUFFICIENT, BGA_WARN_MASK_WEB_NEGATIVE,
  BGA_WARN_NECK_NON_POSITIVE, BGA_WARN_VIA_PAD_OVER_MAX,
  ASSUMPTION_CENTRED_VIA, ASSUMPTION_NO_FAB_PROFILE,
  CHECK_TRACE_WIDTH, CHECK_CHANNEL, CHECK_VIA_ASPECT, CHECK_VIA_IN_PAD,
  CHECK_LAND_VIA, CHECK_MASK_WEB, CHECK_NECK, CHECK_VIA_DRILL,
} from './bgaBreakout'
import { STATUS_OK, STATUS_DANGER, STATUS_UNKNOWN, UNKNOWN_NO_CAPABILITY } from './dfmCheck'
import { expectErrorShape } from './errorShape.testkit'

const mm = (x) => x * 1e-3

// Elle doğrulanan örnek (brief §12.3):
//
//   P = 0.80 mm, D_L = 0.45 mm, W = 0.10 mm, C = 0.10 mm
//   G          = 0.80 − 0.45 = 0.35 mm
//   W_max,1    = 0.35 − 2×0.10 = 0.15 mm
//   n_max      = floor((0.35 − 0.10) / (0.10 + 0.10)) = floor(1.25) = 1
//   W_max,diag = 0.80×√2 − 0.45 − 0.20 ≈ 0.4813708499 mm

const base = {
  pitch: mm(0.8),
  landDiameter: mm(0.45),
  traceWidth: mm(0.1),
  traceClearance: mm(0.1),
  traceCount: 1,
}

describe('computeBgaBreakout — referans örnek', () => {
  const r = computeBgaBreakout(base)

  it('landler arası boşluğu verir', () => {
    expect(r.valid).toBe(true)
    expect(r.results.gap).toBeCloseTo(mm(0.35), 15)
  })

  it('tek iz için maksimum genişliği verir', () => {
    expect(r.results.maxWidthSingle).toBeCloseTo(mm(0.15), 15)
  })

  it('maksimum iz sayısını verir', () => {
    expect(r.results.nMax).toBe(1)
  })

  it('diyagonal maksimum genişliği verir', () => {
    expect(r.results.maxWidthDiagonal).toBeCloseTo(0.0004813708499, 12)
    expect(r.results.diagPitch).toBeCloseTo(mm(0.8) * Math.SQRT2, 15)
  })

  it('istenen iz sayısının koridor marjını verir', () => {
    // M = G − [nW + (n+1)C] = 0.35 − [0.10 + 0.20] = 0.05 mm
    expect(r.results.channelMargin).toBeCloseTo(mm(0.05), 15)
    expect(r.checks.find((c) => c.id === CHECK_CHANNEL).status).toBe(STATUS_OK)
  })

  it('yöntem tam geometrik bağıntı olarak etiketlenir', () => {
    expect(r.method).toBe(METHOD_GEOMETRIC)
  })
})

describe('computeBgaBreakout — ikinci referans örnek', () => {
  // P = 0.50 mm, D_L = 0.30 mm, W = 0.075 mm, C = 0.075 mm
  //   G = 0.20 mm,  n_max = floor((0.20 − 0.075) / 0.15) = 0
  const r = computeBgaBreakout({
    pitch: mm(0.5),
    landDiameter: mm(0.3),
    traceWidth: mm(0.075),
    traceClearance: mm(0.075),
    traceCount: 1,
  })

  it('koridordan hiç iz geçmez', () => {
    expect(r.results.gap).toBeCloseTo(mm(0.2), 15)
    expect(r.results.nMax).toBe(0)
  })

  it('istenen bir iz koridora sığmaz ve uyarı üretir', () => {
    expect(r.results.channelMargin).toBeLessThan(0)
    expect(r.checks.find((c) => c.id === CHECK_CHANNEL).status).toBe(STATUS_DANGER)
    expect(r.warnings.map((w) => w.code)).toContain(BGA_WARN_CHANNEL_INSUFFICIENT)
  })

  it('sıfır iz istendiğinde koridor kontrolü geçer', () => {
    const zero = computeBgaBreakout({
      pitch: mm(0.5), landDiameter: mm(0.3), traceWidth: mm(0.075),
      traceClearance: mm(0.075), traceCount: 0,
    })
    expect(zero.results.channelMargin).toBeGreaterThan(0)
  })
})

describe('maxTraceCount', () => {
  it('tam sınırdaki geometriyi kayan nokta gürültüsüne kurban etmez', () => {
    // G − C = 2·(W + C) tam olarak sağlanıyor; 1e-17'lik gürültü sonucu
    // 1'e düşürmemeli.
    const gap = 0.1 + 2 * 0.2
    expect(maxTraceCount(gap, 0.1, 0.1)).toBe(2)
    expect(maxTraceCount(gap - 1e-17, 0.1, 0.1)).toBe(2)
  })

  it('gerçek bir eksiklik gürültü payına sığmaz', () => {
    expect(maxTraceCount(0.1 + 2 * 0.2 - 0.01, 0.1, 0.1)).toBe(1)
  })

  it('negatif sonuç sıfıra sabitlenir', () => {
    expect(maxTraceCount(0.05, 0.1, 0.1)).toBe(0)
    expect(maxTraceCount(-1, 0.1, 0.1)).toBe(0)
  })

  it('geçersiz girdide sıfır döner', () => {
    expect(maxTraceCount(NaN, 0.1, 0.1)).toBe(0)
    expect(maxTraceCount(0.5, 0, 0)).toBe(0)
  })
})

describe('computeBgaBreakout — dog-bone via', () => {
  const withVia = {
    ...base,
    viaPadDiameter: mm(0.45),
    viaDrillDiameter: mm(0.25),
    viaPitch: mm(0.8),
  }

  it('via merkeze konmuşsa land-via mesafesi P/√2 olur', () => {
    const r = computeBgaBreakout(withVia)
    expect(r.results.centredDistance).toBeCloseTo(mm(0.8) / Math.SQRT2, 15)
    expect(r.results.landViaDistance).toBeCloseTo(mm(0.8) / Math.SQRT2, 15)
    expect(r.assumptions).toContain(ASSUMPTION_CENTRED_VIA)
  })

  it('land-via kenar boşluğunu verir', () => {
    // C_land_via = d_LV − (D_L + D_V)/2 = 0.5657 − 0.45 = 0.1157 mm
    const r = computeBgaBreakout(withVia)
    const expected = mm(0.8) / Math.SQRT2 - (mm(0.45) + mm(0.45)) / 2
    expect(r.results.landViaClearance).toBeCloseTo(expected, 15)
    // Neck aynı geometrik mesafedir, clearance ile karıştırılmaz
    expect(r.results.neckLength).toBeCloseTo(expected, 15)
  })

  it('izin verilen en büyük via pad çapını verir', () => {
    // D_V,max = P·√2 − D_L − 2C
    const r = computeBgaBreakout(withVia)
    expect(r.results.maxViaPad).toBeCloseTo(0.0004813708499, 12)
  })

  it('via pad çapı geometrik sınırı aşarsa uyarı verir', () => {
    const r = computeBgaBreakout({ ...withVia, viaPadDiameter: mm(0.6) })
    expect(r.warnings.map((w) => w.code)).toContain(BGA_WARN_VIA_PAD_OVER_MAX)
  })

  it('via-via kenar boşluğu eşit çaplarda P_via − D_V olur', () => {
    const r = computeBgaBreakout(withVia)
    expect(r.results.viaViaClearance).toBeCloseTo(mm(0.8) - mm(0.45), 15)
  })

  it('boyun negatife düşerse uyarı ve danger üretir', () => {
    const r = computeBgaBreakout({ ...withVia, landViaDistance: mm(0.2) })
    expect(r.results.neckLength).toBeLessThan(0)
    expect(r.warnings.map((w) => w.code)).toContain(BGA_WARN_NECK_NON_POSITIVE)
    expect(r.checks.find((c) => c.id === CHECK_NECK).status).toBe(STATUS_DANGER)
    expect(r.assumptions).not.toContain(ASSUMPTION_CENTRED_VIA)
  })

  it('via ölçüleri girilmezse ilgili sonuçlar null kalır', () => {
    const r = computeBgaBreakout(base)
    expect(r.results.landViaClearance).toBeNull()
    expect(r.results.viaViaClearance).toBeNull()
    expect(r.checks.find((c) => c.id === CHECK_LAND_VIA).status).toBe(STATUS_UNKNOWN)
  })
})

describe('computeBgaBreakout — solder mask', () => {
  it('mask açıklığı ve web genişliği', () => {
    // D_mask = 0.45 + 2×0.05 = 0.55 mm ; W_web = 0.80 − 0.55 = 0.25 mm
    const r = computeBgaBreakout({ ...base, maskExpansion: mm(0.05) })
    expect(r.results.maskOpening).toBeCloseTo(mm(0.55), 15)
    expect(r.results.maskWeb).toBeCloseTo(mm(0.25), 15)
  })

  it('negatif web uyarı üretir ama hesabı durdurmaz', () => {
    const r = computeBgaBreakout({ ...base, maskExpansion: mm(0.2) })
    expect(r.valid).toBe(true)
    expect(r.results.maskWeb).toBeCloseTo(mm(-0.05), 15)
    expect(r.warnings.map((w) => w.code)).toContain(BGA_WARN_MASK_WEB_NEGATIVE)
  })

  it('mask ile tanımlı pad için negatif genişleme kabul edilir', () => {
    const r = computeBgaBreakout({ ...base, maskExpansion: mm(-0.05) })
    expect(r.results.maskOpening).toBeCloseTo(mm(0.35), 15)
  })

  it('açıklığı kapatan genişleme geometri hatasıdır', () => {
    const r = computeBgaBreakout({ ...base, maskExpansion: mm(-0.5) })
    expect(r.error).toBe(BGA_ERR_GEOMETRY)
    expect(r.variant).toBe(BGA_VARIANT_MASK_CLOSED)
    expectErrorShape(r, 'mask-closed')
  })
})

describe('computeBgaBreakout — üretici profili', () => {
  it('profil yokken profile bağlı kontroller unknown döner', () => {
    const r = computeBgaBreakout(base)
    expect(r.checks.find((c) => c.id === CHECK_TRACE_WIDTH).status).toBe(STATUS_UNKNOWN)
    expect(r.assumptions).toContain(ASSUMPTION_NO_FAB_PROFILE)
  })

  it('BGA alanına özel sınır varsa genel sınırın önüne geçer', () => {
    const r = computeBgaBreakout({
      ...base,
      hasProfile: true,
      limits: { minTraceWidth: mm(0.15), minBgaTraceWidth: mm(0.09) },
    })
    const c = r.checks.find((x) => x.id === CHECK_TRACE_WIDTH)
    expect(c.required).toBeCloseTo(mm(0.09), 15)
    expect(c.status).toBe(STATUS_OK)
  })

  it('mikroviada lazer delik ve mikrovia aspect sınırı kullanılır', () => {
    const r = computeBgaBreakout({
      ...base,
      viaType: VIA_MICROVIA,
      viaDrillDiameter: mm(0.1),
      viaDepth: mm(0.1),
      hasProfile: true,
      limits: {
        minMechanicalDrill: mm(0.2),
        minLaserDrill: mm(0.075),
        maxPthAspectRatio: 8,
        maxMicroviaAspectRatio: 1,
      },
    })
    expect(r.checks.find((c) => c.id === CHECK_VIA_DRILL).required).toBeCloseTo(mm(0.075), 15)
    expect(r.results.viaAspect).toBeCloseTo(1, 12)
    expect(r.checks.find((c) => c.id === CHECK_VIA_ASPECT).required).toBe(1)
  })

  it('via-in-pad kabiliyeti tanımlı değilse karar verilmez', () => {
    const r = computeBgaBreakout({ ...base, viaType: VIA_IN_PAD, hasProfile: true, limits: {} })
    const c = r.checks.find((x) => x.id === CHECK_VIA_IN_PAD)
    expect(c.status).toBe(STATUS_UNKNOWN)
    expect(c.variant).toBe(UNKNOWN_NO_CAPABILITY)
  })

  it('via-in-pad desteklenmiyorsa danger döner', () => {
    const r = computeBgaBreakout({
      ...base, viaType: VIA_IN_PAD, hasProfile: true, limits: { viaInPadSupported: false },
    })
    expect(r.checks.find((x) => x.id === CHECK_VIA_IN_PAD).status).toBe(STATUS_DANGER)
  })

  it('via-in-pad istenmiyorsa kontrol konu dışıdır', () => {
    const r = computeBgaBreakout({ ...base, viaType: VIA_THROUGH })
    expect(r.checks.find((x) => x.id === CHECK_VIA_IN_PAD).status).toBe(STATUS_OK)
  })

  it('mask web sınırı verilince değerlendirilir', () => {
    const r = computeBgaBreakout({
      ...base, maskExpansion: mm(0.05), hasProfile: true, limits: { minSolderMaskWeb: mm(0.1) },
    })
    expect(r.checks.find((c) => c.id === CHECK_MASK_WEB).status).toBe(STATUS_OK)
  })
})

describe('computeBgaBreakout — geçersiz girdiler', () => {
  const bad = [
    ['adım eksik', { ...base, pitch: null }, BGA_ERR_REQUIRED],
    ['adım sıfır', { ...base, pitch: 0 }, BGA_ERR_NON_POSITIVE],
    ['land NaN', { ...base, landDiameter: NaN }, BGA_ERR_NOT_FINITE],
    ['iz genişliği negatif', { ...base, traceWidth: mm(-0.1) }, BGA_ERR_NON_POSITIVE],
    ['iz sayısı tam sayı değil', { ...base, traceCount: 1.5 }, BGA_ERR_NOT_INTEGER],
    ['iz sayısı negatif', { ...base, traceCount: -1 }, BGA_ERR_NOT_INTEGER],
    ['via türü tanınmıyor', { ...base, viaType: 'buried-x' }, BGA_ERR_VIA_TYPE],
    ['negatif via pad', { ...base, viaPadDiameter: mm(-0.2) }, BGA_ERR_NON_POSITIVE],
  ]

  it.each(bad)('%s reddedilir', (_label, input, code) => {
    const r = computeBgaBreakout(input)
    expect(r.error).toBe(code)
    expect(r.valid).toBeUndefined()
    expectErrorShape(r, _label)
  })

  it('land adımdan büyükse açık geometri hatası döner', () => {
    const r = computeBgaBreakout({ ...base, landDiameter: mm(0.9) })
    expect(r.error).toBe(BGA_ERR_GEOMETRY)
    expect(r.variant).toBe(BGA_VARIANT_LAND_OVER_PITCH)
    expectErrorShape(r, 'land-over-pitch')
  })

  it('via türü listesi hata yükünde bildirilir', () => {
    expect(computeBgaBreakout({ ...base, viaType: 'x' }).allowed).toEqual(VIA_TYPES)
  })

  it('sonuçlarda NaN ya da Infinity bulunmaz', () => {
    const r = computeBgaBreakout({
      ...base, viaPadDiameter: mm(0.4), viaDrillDiameter: mm(0.2),
      viaPitch: mm(0.8), viaDepth: mm(1.6), maskExpansion: mm(0.05),
    })
    for (const v of Object.values(r.results)) {
      if (typeof v === 'number') expect(Number.isFinite(v)).toBe(true)
    }
  })
})

describe('buildBgaSweep', () => {
  it('adım büyüdükçe tek iz genişliği artar', () => {
    const pts = buildBgaSweep(base, 'pitch', mm(0.4), mm(1.2), 21)
    expect(pts.length).toBeGreaterThan(0)
    for (let i = 1; i < pts.length; i += 1) {
      expect(pts[i].y).toBeGreaterThan(pts[i - 1].y)
      expect(pts[i].yDiagonal).toBeGreaterThan(pts[i - 1].yDiagonal)
    }
    // Diyagonal kanal her zaman daha geniştir
    expect(pts.every((p) => p.yDiagonal > p.y)).toBe(true)
  })

  it('land çapı büyüdükçe koridor marjı düşer', () => {
    const pts = buildBgaSweep(base, 'landDiameter', mm(0.2), mm(0.7), 21)
    for (let i = 1; i < pts.length; i += 1) {
      expect(pts[i].yMargin).toBeLessThan(pts[i - 1].yMargin)
    }
  })

  it('geometrisi geçersiz olan nokta üretilmez, uydurulmaz', () => {
    // Land adımı aşınca hesap hata döner; o noktalar diziye girmez.
    const pts = buildBgaSweep(base, 'landDiameter', mm(0.2), mm(1.2), 21)
    expect(pts.every((p) => p.x < mm(0.8))).toBe(true)
  })

  it('geçersiz sweep parametreleri boş dizi döner', () => {
    expect(buildBgaSweep(base, 'pitch', NaN, 1, 10)).toEqual([])
    expect(buildBgaSweep(base, 'pitch', 0, 1, 1)).toEqual([])
  })
})
