// Bakır kalınlığı dönüştürücü ekranının hesap modeli (spec §4.1.2, §4.1.3, §4.3).
// Saf: React, DOM ve gösterim bilmez.

import { readForm, fieldsFor, when } from '../../../lib/fields'
import { LENGTH } from '../../../lib/units'
import {
  nominalThickness, derivedThickness, allUnits,
  finishedThickness, crossSection, trapezoidArea,
} from '../../../lib/copper'
import { sheetResistance } from '../../../lib/plane'
import { OZ_NOMINAL_UM } from '../../../lib/units'

export const SOURCE_WEIGHT = 'weight'
export const SOURCE_THICKNESS = 'thickness'
export const SOURCES = [SOURCE_WEIGHT, SOURCE_THICKNESS]

export const REASON_INCOMPLETE = 'incomplete'
export const REASON_ETCH = 'etch'

export const OZ_OPTIONS = Object.keys(OZ_NOMINAL_UM).map(Number)

export const INITIAL_FORM = {
  source: SOURCE_WEIGHT,
  oz: '1',
  thickness: '35', thicknessu: 'um',

  layer: 'external',
  plating: '25',

  W: '0.25', Wu: 'mm',
  etch: '0',

  T: '20',
}

const TEMP = { '°C': 1 }
const PCT = { '%': 1 }
const WIDTH = { mm: LENGTH.mm, mil: LENGTH.mil }
const THICK = { um: LENGTH.um, mm: LENGTH.mm, mil: LENGTH.mil, inch: LENGTH.inch }

export function formFields(f) {
  return fieldsFor([
    when(f.source === SOURCE_WEIGHT, [
      { key: 'oz', label: 'Bakır ağırlığı', unit: 'oz', table: { oz: 1 }, min: 0 },
    ]),
    when(f.source === SOURCE_THICKNESS, [
      { key: 'thickness', label: 'Kalınlık', unitKey: 'thicknessu', table: THICK, min: 0 },
    ]),
    [
      { key: 'plating', label: 'Kaplama kalınlığı', unit: 'um', table: LENGTH, min: 0, allowZero: true },
      { key: 'W', label: 'Yol genişliği', unitKey: 'Wu', table: WIDTH, min: 0 },
      { key: 'etch', label: 'Aşındırma oranı', unit: '%', table: PCT, min: 0, allowZero: true },
      { key: 'T', label: 'Sıcaklık', unit: '°C', table: TEMP, allowZero: true },
    ],
  ])
}

export function compute(f) {
  const read = readForm(f, formFields(f))
  if (read.ambiguous.length) return { ok: false, ambiguous: read.ambiguous }
  if (!read.ok) return { ok: false, reason: REASON_INCOMPLETE, invalid: read.invalid }

  const v = read.values
  if (v.etch >= 100) return { ok: false, reason: REASON_ETCH }

  // Kaynak: ya bakır ağırlığı ya doğrudan kalınlık
  const starting = f.source === SOURCE_WEIGHT ? nominalThickness(v.oz) : v.thickness
  if (!(starting > 0)) return { ok: false, reason: REASON_INCOMPLETE }

  const oz = f.source === SOURCE_WEIGHT ? v.oz : null
  // v.plating readForm tarafından µm'den metreye çevrilmiş olarak gelir
  const finished = finishedThickness({ starting, plating: v.plating, layer: f.layer })
  if (finished.error) return { ok: false, reason: REASON_INCOMPLETE }

  const rect = crossSection({ t: finished.finished, W: v.W })
  const trap = trapezoidArea({ t: finished.finished, Wbottom: v.W, etchFactor: v.etch / 100 })
  if (trap.error) return { ok: false, reason: REASON_ETCH }

  return {
    ok: true,
    source: f.source,
    oz,
    layer: f.layer,
    starting,
    plating: finished.plating,
    finished: finished.finished,
    platingShare: finished.platingShare,
    // Nominal tablo ile yoğunluktan türetilen değer birlikte sunulur
    nominal: oz != null ? nominalThickness(oz) : null,
    derived: oz != null ? derivedThickness(oz) : null,
    units: {
      starting: allUnits(starting),
      finished: allUnits(finished.finished),
    },
    W: v.W,
    rect,
    trap,
    etch: v.etch,
    T: v.T,
    Rsheet: sheetResistance(finished.finished, v.T),
    // Trapez kesitin dirence etkisi — alan azaldıkça direnç artar
    RsheetTrap: rect.area > 0 ? sheetResistance(finished.finished, v.T) * (rect.area / trap.area) : NaN,
  }
}

// Grafik: bakır ağırlığına göre kare direnci
export function buildSweep(r) {
  if (!r.ok) return null

  // İmlecin x'i koşulsuz olarak BİTMİŞ kalınlıktan türetilir.
  //
  // Eğri y = R_□(nominalThickness(oz)) bağıntısından çizilir, imlecin y'si ise
  // R_□(bitmiş kalınlık)'tır. Ağırlık kaynağında x olarak ham `r.oz` girişi
  // kullanılınca bu iki kalınlık farklı oluyordu: `r.oz` yalnızca folyoyu
  // anlatır, kaplamayı içermez. Varsayılan formda (1 oz folyo + 25 µm kaplama)
  // imleç eğrinin belirgin biçimde altına düşüyordu.
  //
  // `units.finished.ozNominal = t_bitmiş / (35 µm)` nominal kuralın tersidir ve
  // nominal tablo değerleri tam olarak 35·oz olduğundan
  //   nominalThickness(markerOz) === t_bitmiş
  // olur; yani imleç her iki kaynakta da eğrinin tam üstüne oturur.
  const markerOz = r.units.finished?.ozNominal ?? NaN

  // Tarama aralığı çalışma noktasını her zaman kapsar. LineChart x eksenini
  // yalnızca seri noktalarından türettiği için, sabit 0.25–6 oz aralığının
  // dışında kalan bir çalışma noktası (ör. 10 oz ağır bakır) grafiğin dışına
  // düşüp görünmez oluyordu.
  const spans = Number.isFinite(markerOz) && markerOz > 0
  const from = spans ? Math.min(0.25, markerOz * 0.8) : 0.25
  const to = spans ? Math.max(6, markerOz * 1.2) : 6

  const steps = 60
  const xs = []
  for (let i = 0; i < steps; i++) xs.push(from + ((to - from) * i) / (steps - 1))

  // Çalışma noktasının x'i örnek noktalardan biri yapılır. Eğri 1/t biçiminde
  // olduğu için düzgün aralıklı örnekleme sol uçta kabadır; iki örnek arasını
  // birleştiren doğru parçası eğrinin altında kalır ve imleç ince bakırda
  // çizgiden ayrık görünürdü. Tam bu x'te bir örnek olunca imleç çizilen
  // poligonun üstünde durur.
  if (spans && !xs.some((x) => Math.abs(x - markerOz) <= 1e-12 * Math.max(1, markerOz))) {
    // Aralık tanımı gereği from < markerOz < to, yani ekleme yeri her zaman var;
    // yine de bulunamazsa dizi sıralı kalsın diye ekleme yapılmaz.
    const at = xs.findIndex((x) => x > markerOz)
    if (at > 0) xs.splice(at, 0, markerOz)
  }

  const rows = xs.map((oz) => ({ x: oz, y: sheetResistance(nominalThickness(oz), r.T) }))

  return {
    rows,
    points: rows.map((p) => [p.x, p.y]),
    marker: { x: markerOz, y: sheetResistance(r.finished, r.T) },
    refs: [],
  }
}
