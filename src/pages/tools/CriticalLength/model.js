// Kritik hat uzunluğu ekranının hesap modeli (spec §7.4, yan sonuç §7.3).
// Saf: React, DOM ve gösterim bilmez. Hata kodu döner, metni text.js çevirir.
//
// Bütün hesap lib/signalIntegrity.js ve lib/epsEff.js içindeki mevcut
// fonksiyonlardan gelir; burada yeni denklem tanımlanmaz.

import { readForm, fieldsFor } from '../../../lib/fields'
import { LENGTH, TIME, fromSI } from '../../../lib/units'
import { epsFields, resolveEpsEff, INITIAL_EPS_FORM, psPerMm } from '../../../lib/epsEff'
import {
  criticalLength, riseTimeBandwidth,
  CRITICAL_DIVISORS, RISE_TIME_K_MIN, RISE_TIME_K_MAX,
} from '../../../lib/signalIntegrity'

export const REASON_INCOMPLETE = 'incomplete'
export const REASON_EPS = 'eps'
export const REASON_CRITICAL = 'critical'
export const REASON_BANDWIDTH = 'bandwidth'

// Kriter seçenekleri motordan gelir; ekran kendi listesini uydurmaz.
export const DIVISORS = CRITICAL_DIVISORS
export const K_MIN = RISE_TIME_K_MIN
export const K_MAX = RISE_TIME_K_MAX

export const INITIAL_FORM = {
  ...INITIAL_EPS_FORM,
  tr: '500', tru: 'ps',
  divisor: String(CRITICAL_DIVISORS[0]),
  k: String(RISE_TIME_K_MIN),
  // Hat uzunluğu isteğe bağlıdır: boşsa yalnızca eşik gösterilir
  length: '', lengthu: 'mm',
}

const PLAIN = { '': 1 }
const DIM = { mm: LENGTH.mm, cm: LENGTH.cm, m: LENGTH.m, mil: LENGTH.mil, inch: LENGTH.inch }
const RISE = { ps: TIME.ps, ns: TIME.ns, 'µs': TIME['µs'] }

export const LENGTH_UNITS = ['mm', 'cm', 'm', 'mil', 'inch']
export const RISE_UNITS = ['ps', 'ns', 'µs']

export function formFields(f) {
  return fieldsFor([
    epsFields(f),
    [
      { key: 'tr', label: 'Yükselme süresi (t_r)', unitKey: 'tru', table: RISE, min: 0 },
      // Kriter de sayısal alan gibi okunur; ayrıştırma tek kapıdan geçer
      { key: 'divisor', label: 'Kriter böleni', unit: '', table: PLAIN, min: 1 },
      { key: 'k', label: 'Bant genişliği katsayısı (K)', unit: '', table: PLAIN, min: RISE_TIME_K_MIN, max: RISE_TIME_K_MAX },
      { key: 'length', label: 'Hat uzunluğu', unitKey: 'lengthu', table: DIM, min: 0, optional: true },
    ],
  ])
}

export function compute(f) {
  const read = readForm(f, formFields(f))
  if (read.ambiguous.length) return { ok: false, ambiguous: read.ambiguous }
  if (!read.ok) return { ok: false, reason: REASON_INCOMPLETE, invalid: read.invalid }

  const eps = resolveEpsEff(read.values, f)
  if (eps.error) return { ok: false, reason: REASON_EPS }

  const v = read.values

  const cl = criticalLength({
    tr: v.tr,
    epsEff: eps.epsEff,
    divisor: v.divisor,
    length: v.length ?? null,
  })
  if (cl.error) return { ok: false, reason: REASON_CRITICAL }

  // §7.3 yan sonucu: kenar hızının kapladığı yaklaşık spektrum genişliği
  const bw = riseTimeBandwidth({ tr: v.tr, k: v.k })
  if (bw.error) return { ok: false, reason: REASON_BANDWIDTH }

  return {
    ok: true,
    eps,
    ...cl,
    bw,
    hasLength: v.length > 0,
    tpdPsPerMm: psPerMm(cl.tpd),
  }
}

// Grafik: yükselme süresine göre kritik uzunluk, üç kriter için üç seri.
// y ekseni mm — dönüşüm yalnızca birim çevirmedir, yuvarlama değildir.
export function buildSweep(r) {
  if (!r.ok) return null

  // Kritik uzunluk t_r ile doğrusaldır; y ekseni doğrusal olduğu için tarama
  // aralığı iki dekatla sınırlanır, yoksa çalışma noktası eksende ezilir.
  const from = r.tr / 10
  const to = r.tr * 10
  const steps = 70

  const xs = []
  for (let i = 0; i < steps; i++) {
    xs.push(Math.pow(10, Math.log10(from) + ((Math.log10(to) - Math.log10(from)) * i) / (steps - 1)))
  }

  const series = CRITICAL_DIVISORS.map((d) => ({
    divisor: d,
    points: xs.map((tr) => {
      const c = criticalLength({ tr, epsEff: r.eps.epsEff, divisor: d })
      return [tr, c.error ? NaN : fromSI(c.critical, 'mm', LENGTH)]
    }),
  }))

  return {
    series,
    // Hat uzunluğu girildiyse eşik çizgisi olarak çizilir
    refs: r.hasLength
      ? [{ key: 'length', y: fromSI(r.length, 'mm', LENGTH) }]
      : [],
    marker: { x: r.tr, y: fromSI(r.critical, 'mm', LENGTH) },
  }
}
