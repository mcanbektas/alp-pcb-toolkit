// AWG dönüştürücü ekranının hesap modeli (spec §11.2).
// Saf: React, DOM ve gösterim bilmez; metin üretmez, kod döner.

import { fieldsFor, readForm, when } from '../../../lib/fields'
import { LENGTH, AREA } from '../../../lib/units'
import {
  wireFromAwg, wireFromDiameter, awgSeries, diameterTolerance,
  AWG_ERR_RANGE, AWG_MIN, AWG_MAX, AWG_D_MIN, AWG_D_MAX,
  AWG_RATIO, AWG_STEPS, AWG_REF_GAUGE, AWG_REF_M, AWG_REF_INCH,
  AWG_ERR_TOLERANCE,
} from '../../../lib/convertAwg'

// Ekranın metin katmanı sınırları da yazabilsin diye yeniden dışa aktarılır
export {
  AWG_MIN, AWG_MAX, AWG_D_MIN, AWG_D_MAX, AWG_RATIO, AWG_STEPS,
  AWG_REF_GAUGE, AWG_REF_INCH, AWG_ERR_TOLERANCE,
}

// Yön: numaradan çapa ya da çaptan numaraya
export const DIR_AWG = 'awg'
export const DIR_DIAMETER = 'diameter'
export const DIRECTIONS = [DIR_AWG, DIR_DIAMETER]

// Grafik taramaları
export const SWEEP_D = 'd'
export const SWEEP_AREA = 'area'
export const SWEEPS = [SWEEP_D, SWEEP_AREA]

// Hesap yapılamadığında dönen kodlar — metne text.js çevirir
export const REASON_INCOMPLETE = 'incomplete'
export const REASON_AWG_RANGE = 'awg-range'
export const REASON_DIAMETER_RANGE = 'diameter-range'

export const INITIAL_FORM = {
  dir: DIR_AWG,
  awg: '24',
  d: '0.5', du: 'mm',
  // Çekme toleransı isteğe bağlıdır; boşken tolerans bandı hiç hesaplanmaz.
  tolD: '',
}

// Numara birimsizdir; çarpan tablosu verilmez, ham sayı okunur.
//
// Birim listesinde mikrometre 'µm' olarak yazılır (spec §3.1). ASCII 'um'
// anahtarı tabloda kalır: eski bir form durumu bu değeri taşıyorsa sessizce
// birim hatasına düşmesin — iki anahtar da aynı çarpanı verir, hesap değişmez.
const DIAM = { mm: LENGTH.mm, 'µm': LENGTH['µm'], um: LENGTH.um, mil: LENGTH.mil, inch: LENGTH.inch }

// Arayüzde gösterilen birim listesi — tabloyla tek kaynaktan eşleşsin diye burada durur.
export const DIAMETER_UNITS = ['mm', 'µm', 'mil', 'inch']

// Tolerans yüzdesi birimsizdir; çarpan uygulanmaz, yüzdeye bölme compute içinde.
const PCT = { '%': 1 }

// Etiketler `labels` ile çağıran taraftan gelir (geçerli dilde, text.js'ten);
// etiket verilmezse alan anahtarı gösterilir.
export function formFields(f, labels = {}) {
  const L = (key) => labels[key] ?? key
  return fieldsFor([
    when(f.dir !== DIR_DIAMETER, [
      // Aralık denetimi compute içinde yapılır ki hata nedeni ayrı kod olsun.
      // 4/0 için -3, 0 için 0 girilebilmesi gerektiğinden sıfır ve negatif serbest.
      { key: 'awg', label: L('awg'), allowZero: true },
    ]),
    when(f.dir === DIR_DIAMETER, [
      { key: 'd', label: L('d'), unitKey: 'du', table: DIAM, min: 0 },
    ]),
    [
      // Üst sınır burada değil, diameterTolerance() içinde denetlenir — sınır
      // tek yerde dursun. Burada yalnızca negatif tolerans elenir.
      { key: 'tolD', label: L('tolD'), unit: '%', table: PCT, min: 0, allowZero: true, optional: true },
    ],
  ])
}

export function compute(f, labels = {}) {
  const read = readForm(f, formFields(f, labels))
  if (read.ambiguous.length) return { ok: false, ambiguous: read.ambiguous }
  if (!read.ok) return { ok: false, reason: REASON_INCOMPLETE, invalid: read.invalid }

  const v = read.values
  const fromAwg = f.dir !== DIR_DIAMETER

  const base = fromAwg ? wireFromAwg(v.awg) : wireFromDiameter(v.d)
  if (base.error === AWG_ERR_RANGE) {
    return { ok: false, reason: fromAwg ? REASON_AWG_RANGE : REASON_DIAMETER_RANGE }
  }
  if (base.error) return { ok: false, reason: REASON_INCOMPLETE }

  // En yakın tam numaranın teli — girilen değerle karşılaştırma için
  const nearest = wireFromAwg(base.awgNearest)

  // Komşu standart numaralar (seçim yaparken karşılaştırma kolaylığı)
  const neighbors = []
  for (let g = base.awgNearest - 2; g <= base.awgNearest + 2; g++) {
    const w = wireFromAwg(g)
    if (w.error) continue
    neighbors.push({ awg: g, d: w.d, area: w.area, dUnits: w.dUnits, aUnits: w.aUnits })
  }

  // Denklemin ara değerleri — teknik detay panelinde gösterilir
  const exponent = (AWG_REF_GAUGE - base.awgExact) / AWG_STEPS
  const factor = base.d / AWG_REF_M

  // Çekme toleransı (spec §3.4) isteğe bağlıdır. Alan boşken null döner ve
  // sonuç paneli bugünkü hâliyle kalır; hata durumunda hesap iptal edilmez,
  // yalnızca tolerans bölümü hata gösterir.
  const tolerance = v.tolD != null ? diameterTolerance(base.d, v.tolD / 100) : null

  return {
    ok: true,
    dir: fromAwg ? DIR_AWG : DIR_DIAMETER,
    awgExact: base.awgExact,
    awgNearest: base.awgNearest,
    standard: Number.isInteger(base.awgExact),
    d: base.d,
    area: base.area,
    dUnits: base.dUnits,
    aUnits: base.aUnits,
    nearest,
    neighbors,
    dDeltaPct: (100 * (base.d - nearest.d)) / nearest.d,
    areaDeltaPct: (100 * (base.area - nearest.area)) / nearest.area,
    exponent,
    factor,
    tolerance,
  }
}

// Grafik: tam numaraların tamamı. Çap (ya da kesit) logaritmik eksende
// çizildiğinde ölçek doğru bir doğruya döner — geometrik tanımın görünür hali.
export function buildSweep(r, param = SWEEP_D) {
  if (!r.ok) return null

  const byArea = param === SWEEP_AREA
  const rows = awgSeries().map((s) => ({
    x: byArea ? s.area / AREA['mm²'] : s.d / LENGTH.mm,
    y: s.awg,
  }))
  if (rows.length === 0) return null

  const markerX = byArea ? r.aUnits.mm2 : r.dUnits.mm

  return {
    param,
    rows,
    points: rows.map((p) => [p.x, p.y]),
    bandPoints: null,
    refs: [],
    marker: Number.isFinite(markerX) ? { x: markerX, y: r.awgExact } : null,
  }
}
