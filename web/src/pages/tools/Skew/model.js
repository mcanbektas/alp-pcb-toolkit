// Diferansiyel skew ve uzunluk eşitleme ekranının hesap modeli (spec §7.5).
// Saf: React, DOM ve gösterim bilmez. Hata kodu döner, metni text.js çevirir.
//
// Hesabın tamamı lib/signalIntegrity.js içindeki skew() fonksiyonundan gelir;
// bu dosyada denklem yoktur.

import { readForm, fieldsFor, when } from '../../../lib/fields'
import { LENGTH, TIME, fromSI } from '../../../lib/units'
import {
  epsFields, resolveEpsEff, epsSolverParams, INITIAL_EPS_FORM, psPerMm,
} from '../../../lib/epsEff'
import { skew } from '../../../lib/signalIntegrity'

export const REASON_INCOMPLETE = 'incomplete'
export const REASON_EPS = 'eps'
// εeff kaynağı alan çözücü ve worker henüz bitirmedi: hata değil, bekleme.
// Ekran hesap yerine "çözücü hesaplıyor" durumunu gösterir (brif 09 F3).
export const REASON_EPS_PENDING = 'eps-pending'

export const LAYER_SAME = 'same'
export const LAYER_DIFFERENT = 'diff'
export const LAYERS = [LAYER_SAME, LAYER_DIFFERENT]

export const INITIAL_FORM = {
  ...INITIAL_EPS_FORM,
  layer: LAYER_SAME,
  lengthP: '50', lengthPu: 'mm',
  lengthN: '48', lengthNu: 'mm',
  // 15 ps varsayılan: 2 mm uzunluk farkı bütçenin içinde kalır ve ekran diğer
  // araçlarla aynı biçimde uyarı seviyesinde açılır. Bütçe değeri bu ekranda
  // üretilmez; gerçek değer alıcının veri sayfasından gelir.
  skewMax: '15', skewMaxu: 'ps',
  // Yalnızca farklı katman seçildiğinde okunur; elle giriş, alt sınır 1
  epsEffN: '3.6',
}

const PLAIN = { '': 1 }
const DIM = { mm: LENGTH.mm, cm: LENGTH.cm, m: LENGTH.m, mil: LENGTH.mil, inch: LENGTH.inch }
// Skew bütçesi ps–ns mertebesindedir; daha büyük birimler bu ekranda sunulmaz
const TIME_SMALL = { ps: TIME.ps, ns: TIME.ns }

// Alan etiketleri `labels` ile çağıran taraftan gelir (geçerli dilde,
// text.js'ten); `lib/` bunları bilmez. εeff alanlarının etiketi de aynı
// sözlükten çevrilir — verilmezse lib'in kendi etiketi kalır.
export function formFields(f, labels = {}) {
  const L = (key) => labels[key] ?? key
  return fieldsFor([
    epsFields(f).map((s) => ({ ...s, label: labels[s.key] ?? s.label })),
    [
      { key: 'lengthP', label: L('lengthP'), unitKey: 'lengthPu', table: DIM, min: 0 },
      { key: 'lengthN', label: L('lengthN'), unitKey: 'lengthNu', table: DIM, min: 0 },
      { key: 'skewMax', label: L('skewMax'), unitKey: 'skewMaxu', table: TIME_SMALL, min: 0 },
    ],
    // Farklı katmanda εeff de farklıdır; motor bunu epsEffN olarak ister.
    when(f.layer === LAYER_DIFFERENT, [
      { key: 'epsEffN', label: L('epsEffN'), unit: '', table: PLAIN, min: 1 },
    ]),
  ])
}

// εeff kaynağı çözücüyken worker'a gidecek iş — ekran useFieldSolver'a
// geçirir. Form eksik/geçersizken null: iş başlatılmaz.
export function solverJob(f, labels = {}) {
  const read = readForm(f, formFields(f, labels))
  if (!read.ok || read.ambiguous.length) return null
  return epsSolverParams(read.values, f)
}

// `fieldResult`, εeff kaynağı çözücüyken worker'ın BİTMİŞ sonucudur
// (yoksa null → REASON_EPS_PENDING). Diğer kaynaklarda yok sayılır.
export function compute(f, labels = {}, fieldResult = null) {
  const read = readForm(f, formFields(f, labels))
  if (read.ambiguous.length) return { ok: false, ambiguous: read.ambiguous }
  if (!read.ok) return { ok: false, reason: REASON_INCOMPLETE, invalid: read.invalid }

  const eps = resolveEpsEff(read.values, f, fieldResult)
  if (eps.pending) return { ok: false, reason: REASON_EPS_PENDING }
  if (eps.error) return { ok: false, reason: REASON_EPS }

  const v = read.values
  const differentLayer = f.layer === LAYER_DIFFERENT
  const epsEffN = differentLayer ? v.epsEffN : null

  const r = skew({
    lengthP: v.lengthP,
    lengthN: v.lengthN,
    epsEff: eps.epsEff,
    epsEffN,
    skewMax: v.skewMax,
  })
  if (r.error) return { ok: false, reason: REASON_INCOMPLETE }

  // Aynı εeff varsayımıyla çıkan skew — katman farkının payını ayırmak için.
  // Aynı motor, epsEffN olmadan çağrılır.
  const sameEps = differentLayer
    ? skew({ lengthP: v.lengthP, lengthN: v.lengthN, epsEff: eps.epsEff, skewMax: v.skewMax })
    : null

  return {
    ok: true,
    eps,
    // Kullanıcının seçimi: motorun sameLayer alanından ayrıdır. Kullanıcı farklı
    // katman seçip iki εeff'i eşit girerse motor sameLayer=true der; ikisini
    // ayrı tutmak bu durumu görünür kılar.
    differentLayer,
    epsEffN,
    ...r,
    tpdPsPerMmP: psPerMm(r.tpdP),
    tpdPsPerMmN: psPerMm(r.tpdN),
    sameEpsSkew: sameEps && !sameEps.error ? sameEps.skew : null,
    // Eklenecek uzunluk gecikmesi KÜÇÜK olan hatta gider
    addTo: r.delayP === r.delayN ? null : r.delayP > r.delayN ? 'N' : 'P',
  }
}

// Grafik: uzunluk farkına göre skew.
// Gecikmesi değil, fiziksel uzunluğu büyük olan hat sabit tutulur; diğeri
// kısaltılıp uzatılır. Böylece ΔL = r.deltaL noktasında eğri tam olarak
// girilen çalışma noktasından geçer.
export function buildSweep(r) {
  if (!r.ok) return null

  const nIsShort = r.lengthN <= r.lengthP
  const base = nIsShort ? r.lengthP : r.lengthN

  let to = Math.min(Math.max(2 * r.deltaL, 2 * r.maxDeltaL, base / 50), base * 0.98)
  to = Math.max(to, r.deltaL)
  if (!(to > 0)) return null

  const steps = 70
  const rows = []
  for (let i = 0; i < steps; i++) {
    const dl = (to * i) / (steps - 1)
    const short = base - dl
    const lengthP = nIsShort ? base : short
    const lengthN = nIsShort ? short : base

    const a = short > 0
      ? skew({
        lengthP, lengthN,
        epsEff: r.eps.epsEff,
        epsEffN: r.differentLayer ? r.epsEffN : null,
        skewMax: r.skewMax,
      })
      : { error: true }

    const b = r.differentLayer && short > 0
      ? skew({ lengthP, lengthN, epsEff: r.eps.epsEff, skewMax: r.skewMax })
      : null

    rows.push({
      x: fromSI(dl, 'mm', LENGTH),
      y: a.error ? NaN : fromSI(a.skew, 'ps', TIME),
      y2: b ? (b.error ? NaN : fromSI(b.skew, 'ps', TIME)) : null,
    })
  }

  return {
    rows,
    points: rows.map((p) => [p.x, p.y]),
    samePoints: r.differentLayer ? rows.map((p) => [p.x, p.y2]) : [],
    differentLayer: r.differentLayer,
    refs: [{ key: 'budget', y: fromSI(r.skewMax, 'ps', TIME) }],
    marker: {
      x: fromSI(r.deltaL, 'mm', LENGTH),
      y: fromSI(r.skew, 'ps', TIME),
    },
  }
}
