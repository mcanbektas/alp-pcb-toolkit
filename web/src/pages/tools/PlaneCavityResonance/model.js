// Düzlem kavite rezonansı ve kapasitansı ekranının hesap modeli (REV2 §11).
//
// Saf: React ve DOM bilmez, gösterim biçimi üretmez. Form nesnesini alır,
// SI'ye çevirir, lib/planeCavity.js motorunu çağırır, sonucu ve hata kodunu
// döner. Kullanıcıya gösterilecek metin text.js içindedir.
//
// Bu araçta analiz/sentez modu YOK: REV2 §11 yalnızca ileri yönde
// değerlendirme tarif eder (ters çözüm yok).
//
// REV2 §11.2 girdi listesindeki bakır kalınlığı, frekans aralığı, kondansatör
// sayısı ve kenar koşulu seçeneği BİLİNÇLİ OLARAK forma girmez: motor
// (lib/planeCavity.js) bu dört alanı REV2 §11.3–§11.8 formüllerinin
// hiçbirinde okumuyor. Forma yalnızca compute()'un gerçekten motora
// geçirdiği alanlar girer.
//
// Bu araç mevcut GÜÇ DÜZLEMİ VE PARALEL YOL (`plane.js`, `power-plane` aracı)
// ile KARIŞTIRILMAMALI (REV2 §11 giriş notu, kararlar §8): o araç DC akım
// taşıma ve paralel yol direncini hesaplar; bu ekran geometrik kavite
// rezonansı ve düzlem kapasitansı hesaplar. `power-plane` route'u burada
// kullanılmadı, motoru değiştirilmedi.

import { fieldsFor, readForm, when } from '../../../lib/fields'
import { parseNum } from '../../../lib/num'
import {
  LENGTH, AREA, FREQUENCY, VOLTAGE,
} from '../../../lib/units'
import {
  planeCavityAnalysis, planeCapacitance, lowestCavityResonance,
} from '../../../lib/planeCavity'
import { logspace } from '../../../lib/sweep'

export const REASON_INCOMPLETE = 'incomplete'
export const REASON_MODE_INDEX = 'mode-index'
export const REASON_INVALID = 'invalid'

// planeCavity.js kendi STITCHING_N_OPTIONS'ını dışa aktarmıyor (modül içi
// sabit) ve motor DEĞİŞTİRİLMEDİ; aynı üç değer burada REV2 §11.8'in kendi
// metninden ("10, 20 veya 40 seçilebilmelidir") birebir kopyalanır — motorun
// kendi `STITCHING_N_OPTIONS.includes(n)` denetimiyle aynı küme, sayı burada
// icat edilmedi.
export const STITCHING_N_OPTIONS = [10, 20, 40]

// REV2 §11.9: "İlk 10 veya 20 cavity mode". Üçüncü seçenek (tümü) motorun
// `limit: null` davranışına karşılık gelir.
export const MODE_LIMIT_ALL = 'all'
export const MODE_LIMIT_OPTIONS = ['10', '20', MODE_LIMIT_ALL]

// REV2 §11.10'daki beş grafikten ikisi bu ekranda YOK: mod index heatmap'i
// (repoda heatmap bileşeni yok) ve frekans ekseninde mod işaretleri
// (LineChart'ta dikey referans çizgisi render edilmiyor) — bkz. text.js
// dosya başı notu. Kalan üçü doğrudan REV2 §11.10'un kendi maddeleriyle
// eşleşir: "Plane spacing'e karşı capacitance", "Plane X boyutuna karşı ilk
// mode" ve "Dielektrik sabitine karşı ilk rezonans".
export const SWEEP_D = 'd'
export const SWEEP_A = 'a'
export const SWEEP_EPSR = 'epsR'
export const SWEEP_PARAMS = [SWEEP_D, SWEEP_A, SWEEP_EPSR]

// Birimsiz alanlar için ekrana özgü tablo — ReturnPathStitchingVia'daki PLAIN
// ile aynı desen, her ekran kendi kopyasını tutar.
const PLAIN = { '': 1 }

export const INITIAL_FORM = {
  a: '100', au: 'mm',
  b: '100', bu: 'mm',
  d: '0.1', du: 'mm',
  epsR: '4',
  lossTangent: '0.02',
  mMax: '2', nMax: '2',
  modeLimit: '20',

  areaOverride: '', areaOverrideu: 'mm²',
  voltage: '', voltageu: 'V',
  qc: '', qr: '', qLoading: '',

  hasStitching: false,
  targetFrequency: '', targetFrequencyu: 'MHz',
  stitchingN: '20',
  actualStitchingSpacing: '', actualStitchingSpacingu: 'mm',
}

// Etiketler `labels` ile çağıran taraftan gelir (geçerli dilde, text.js'ten);
// `lib/` bunları bilmez. Etiket verilmezse alan anahtarı gösterilir.
export function formFields(f, labels = {}) {
  const L = (key) => labels[key] ?? key
  return fieldsFor([
    [
      { key: 'a', label: L('a'), unitKey: 'au', table: LENGTH, min: 0 },
      { key: 'b', label: L('b'), unitKey: 'bu', table: LENGTH, min: 0 },
      { key: 'd', label: L('d'), unitKey: 'du', table: LENGTH, min: 0 },
      { key: 'epsR', label: L('epsR'), unit: '', table: PLAIN, min: 1 },
      { key: 'lossTangent', label: L('lossTangent'), unit: '', table: PLAIN, min: 0 },
      // Mod indeksi sıfır olabilir (yalnız tek eksende mod aranır) — fields.js
      // varsayılan olarak sıfırı geçersiz sayar, burada açıkça izin verilir.
      { key: 'mMax', label: L('mMax'), unit: '', table: PLAIN, min: 0, allowZero: true },
      { key: 'nMax', label: L('nMax'), unit: '', table: PLAIN, min: 0, allowZero: true },
    ],
    [
      // Örtüşen etkin alan override — motor sıfır/negatif değerde sessizce
      // a·b'ye düşüyor (planeCavity.js: `area > 0 ? area : rectangleArea(...)`);
      // form burada ek bir min sınırı koymaz, motorun kendi geri düşüşüyle
      // çelişmesin diye.
      {
        key: 'areaOverride', label: L('areaOverride'), unitKey: 'areaOverrideu',
        table: AREA, optional: true, allowZero: true,
      },
      // V = 0 fiziksel olarak geçerlidir (motor `voltage >= 0` kabul eder).
      { key: 'voltage', label: L('voltage'), unitKey: 'voltageu', table: VOLTAGE, min: 0, optional: true, allowZero: true },
      { key: 'qc', label: L('qc'), unit: '', table: PLAIN, min: 0, optional: true },
      { key: 'qr', label: L('qr'), unit: '', table: PLAIN, min: 0, optional: true },
      { key: 'qLoading', label: L('qLoading'), unit: '', table: PLAIN, min: 0, optional: true },
    ],
    when(f.hasStitching, [
      { key: 'targetFrequency', label: L('targetFrequency'), unitKey: 'targetFrequencyu', table: FREQUENCY, min: 0 },
      {
        key: 'actualStitchingSpacing', label: L('actualStitchingSpacing'),
        unitKey: 'actualStitchingSpacingu', table: LENGTH, min: 0, optional: true,
      },
    ]),
  ])
}

export function compute(f, labels = {}) {
  const read = readForm(f, formFields(f, labels))
  if (read.ambiguous.length) return { ok: false, ambiguous: read.ambiguous }
  if (!read.ok) return { ok: false, reason: REASON_INCOMPLETE, invalid: read.invalid }

  const v = read.values

  // fields.js tam sayı zorunluluğu denetlemez (bkz. lib/fields.js) — mod
  // indeksleri burada denetlenir, motora kesirli/negatif değer geçmez
  // (ReturnPathStitchingVia'daki stitchingViaCount deseniyle aynı gerekçe).
  if (!Number.isInteger(v.mMax) || !Number.isInteger(v.nMax) || v.mMax < 0 || v.nMax < 0) {
    return { ok: false, reason: REASON_MODE_INDEX }
  }

  const modeLimit = f.modeLimit === MODE_LIMIT_ALL ? null : parseNum(f.modeLimit)
  const stitchingN = f.hasStitching ? parseNum(f.stitchingN) : null

  const result = planeCavityAnalysis({
    a: v.a, b: v.b, d: v.d, epsR: v.epsR, lossTangent: v.lossTangent,
    area: v.areaOverride,
    mMax: v.mMax, nMax: v.nMax, modeLimit,
    voltage: v.voltage,
    qc: v.qc, qr: v.qr, qLoading: v.qLoading,
    targetFrequency: f.hasStitching ? v.targetFrequency : null,
    stitchingN,
    actualStitchingSpacing: f.hasStitching ? v.actualStitchingSpacing : null,
  })
  if (result.error) return { ok: false, reason: REASON_INVALID }

  return {
    ok: true,
    a: v.a, b: v.b, d: v.d, epsR: v.epsR, lossTangent: v.lossTangent,
    mMax: v.mMax, nMax: v.nMax, modeLimit,
    qc: v.qc, qr: v.qr, qLoading: v.qLoading,
    hasStitching: f.hasStitching,
    stitchingN,
    ...result,
  }
}

// Taranan parametrenin sınırları — mevcut değerin çevresinde, geometrik
// (a/d) ve dielektrik (εr) büyüklükler için ayrı ayrı (VoltageDivider'daki
// sweepRange deseniyle aynı gerekçe: anlamlı aralık tasarıma göre değişir).
function sweepRange(r, param) {
  if (param === SWEEP_D) return { from: r.d / 20, to: r.d * 20 }
  if (param === SWEEP_A) return { from: r.a / 20, to: r.a * 20 }
  return { from: Math.max(1.0001, r.epsR / 3), to: r.epsR * 3 } // SWEEP_EPSR — εr birin altına inemez
}

// Grafik: motor sabit bir sweep üretmiyor (bkz. dosya başı SWEEP_PARAMS notu).
// Üç grafik de burada, mevcut a/d/epsR değerinin çevresinde, motorun zaten
// dışa aktardığı saf fonksiyonlarla (planeCapacitance, lowestCavityResonance)
// taranır — ReturnPathStitchingVia/VoltageDivider'daki "sweep motora değil
// ekrana ait" deseniyle aynı, planeCavity.js'e dokunulmadı.
export function buildSweep(r, param) {
  if (!r.ok) return null

  const { from, to } = sweepRange(r, param)
  const { values } = logspace(from, to, 70)
  if (!values) return null

  if (param === SWEEP_D) {
    const rows = values.map((d) => ({ x: d, y: planeCapacitance({ epsR: r.epsR, area: r.area, d }) }))
    return {
      param, rows, points: rows.map((p) => [p.x, p.y]), marker: { x: r.d, y: r.capacitance },
    }
  }

  if (param === SWEEP_A) {
    const rows = values.map((a) => ({ x: a, y: lowestCavityResonance({ a, b: r.b, epsR: r.epsR }) }))
    return {
      param, rows, points: rows.map((p) => [p.x, p.y]), marker: { x: r.a, y: r.lowestResonance },
    }
  }

  const rows = values.map((epsR) => ({ x: epsR, y: lowestCavityResonance({ a: r.a, b: r.b, epsR }) }))
  return {
    param: SWEEP_EPSR, rows, points: rows.map((p) => [p.x, p.y]), marker: { x: r.epsR, y: r.lowestResonance },
  }
}
