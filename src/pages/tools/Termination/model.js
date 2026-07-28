// Terminasyon hesap ekranının modeli (spec §7.7).
//
// Saf: React, DOM ve kullanıcıya görünen metin bilmez. Hata kodu döner,
// kodu Türkçeye çeviren taraf text.js'tir.
//
// Bütün hesap lib/signalIntegrity.js içindeki mevcut fonksiyonlardan gelir;
// bu dosyada tek bir denklem yazılmaz. Yüzde sapma karşılaştırması da
// lib/eseries.js içindeki errorPct ile yapılır.

import { readForm, fieldsFor, when } from '../../../lib/fields'
import { VOLTAGE, RESISTANCE } from '../../../lib/units'
import { errorPct } from '../../../lib/eseries'
import {
  seriesTermination, parallelTermination, theveninTermination,
  SI_ERR_NEGATIVE_SERIES,
} from '../../../lib/signalIntegrity'

export const TERM_SERIES = 'series'
export const TERM_PARALLEL = 'parallel'
export const TERM_THEVENIN = 'thevenin'
export const TERM_TYPES = [TERM_SERIES, TERM_PARALLEL, TERM_THEVENIN]

// Motorun seri terminasyon fonksiyonu E serisini parametre olarak almıyor;
// adaylar her zaman E24'ten geliyor. Seçim yalnızca Thevenin çiftinde
// etkilidir — bu sınır ekranda açıkça yazılır.
export const SERIES_TERM_ESERIES = 'E24'
export const THEVENIN_ESERIES_OPTIONS = ['E24', 'E96']

export const REASON_INCOMPLETE = 'incomplete'
export const REASON_NEGATIVE_SERIES = SI_ERR_NEGATIVE_SERIES
export const REASON_BIAS = 'bias'

// Terminasyon tipi form alanı değil, ekran state'idir (Segmented ile seçilir).
export const INITIAL_FORM = {
  Z0: '50',
  Rdriver: '20',

  V: '3.3', Vu: 'V',
  // Duty cycle tek birimle girilir: yüzde. Motor 0–1 beklediği için çarpan
  // tablosu 0.01 uygular; ekranda başka bir duty birimi sunulmaz.
  duty: '50',

  Vcc: '3.3', Vccu: 'V',
  Vbias: '1.65', Vbiasu: 'V',
  eseries: 'E24',
}

const DUTY = { '%': 0.01 }

export function formFields(f, type) {
  return fieldsFor([
    [
      // Birim seçici yok: tek birim `unit` ile sabitlenir, çarpan units.js
      // RESISTANCE tablosundan gelir (yerel çarpan tablosu yazılmaz).
      { key: 'Z0', label: 'Hat empedansı (Z₀)', unit: 'Ω', table: RESISTANCE, min: 0 },
    ],
    when(type === TERM_SERIES, [
      // Motor R_driver = 0 durumunu kabul ediyor (ideal gerilim kaynağı)
      {
        key: 'Rdriver', label: 'Sürücü çıkış direnci (R_driver)',
        unit: 'Ω', table: RESISTANCE, min: 0, allowZero: true,
      },
    ]),
    when(type === TERM_PARALLEL, [
      { key: 'V', label: 'Terminasyon gerilimi (V)', unitKey: 'Vu', table: VOLTAGE, min: 0 },
      { key: 'duty', label: 'Duty cycle', unit: '%', table: DUTY, min: 0, max: 1 },
    ]),
    when(type === TERM_THEVENIN, [
      { key: 'Vcc', label: 'Besleme gerilimi (V_cc)', unitKey: 'Vccu', table: VOLTAGE, min: 0 },
      { key: 'Vbias', label: 'Hedef bias gerilimi (V_bias)', unitKey: 'Vbiasu', table: VOLTAGE, min: 0 },
    ]),
  ])
}

export function compute(type, f) {
  const read = readForm(f, formFields(f, type))
  if (read.ambiguous.length) return { ok: false, type, ambiguous: read.ambiguous }
  if (!read.ok) return { ok: false, type, reason: REASON_INCOMPLETE, invalid: read.invalid }

  const v = read.values

  if (type === TERM_SERIES) {
    const r = seriesTermination({ Z0: v.Z0, Rdriver: v.Rdriver })

    // Özel ele alınan hata: sonuç yok, ama sürücü ve hat değerleri yorumda
    // kullanılacağı için geri taşınır.
    if (r.error === SI_ERR_NEGATIVE_SERIES) {
      return {
        ok: false, type, reason: REASON_NEGATIVE_SERIES,
        Z0: r.Z0, Rdriver: r.Rdriver, Rs: r.Rs,
      }
    }
    if (r.error) return { ok: false, type, reason: REASON_INCOMPLETE }

    const std = r.nearest.length ? r.nearest[0] : null
    return {
      ok: true, type,
      ...r,
      std,
      eseries: SERIES_TERM_ESERIES,
      // Standart değere kuantalandığında kaynak empedansının Z₀'dan sapması
      stdErrPct: r.withStandard != null ? errorPct(r.withStandard, r.Z0) : null,
    }
  }

  if (type === TERM_PARALLEL) {
    const r = parallelTermination({ Z0: v.Z0, V: v.V, duty: v.duty })
    if (r.error) return { ok: false, type, reason: REASON_INCOMPLETE }
    // Motor Z₀ ve V'yi geri döndürmüyor; grafik ve tablo için taşınır
    return { ok: true, type, ...r, Z0: v.Z0, V: v.V }
  }

  // Motorun alan adı `series` — E serisi adını taşır (E24 / E96)
  const r = theveninTermination({ Z0: v.Z0, Vcc: v.Vcc, Vbias: v.Vbias, series: f.eseries })
  // Motorun tek geçersizlik koşulu bias ≥ V_cc; alan okuma zaten pozitifliği
  // garanti ediyor.
  if (r.error) return { ok: false, type, reason: REASON_BIAS }
  if (!r.standard) return { ok: false, type, reason: REASON_INCOMPLETE }

  return { ok: true, type, ...r }
}

// --- Parametrik grafik: Z₀ taraması (doğrusal) ---
//
// Pencere sabit değil, kullanıcının çalışma noktasına göre kurulur: Z₀/4 … Z₀·4.
// Sabit bir aralık, çalışma noktası dışarıda kaldığında işaretçiyi grafiğin
// dışına düşürürdü — LineChart marker.x'i x ekseni aralığına katmıyor.
const SWEEP_SPAN = 4
const SWEEP_STEPS = 70

// Pencere kenarına yapışmasın diye küçük bir pay; fiziksel bir katsayı değil,
// yalnızca gösterim payıdır.
const SWEEP_EDGE_PAD = 1.25

// Taramanın alt ve üst sınırı. Seri modda R_driver da pencerede kalmalı:
// eğrinin sıfırı kestiği nokta Z₀ = R_driver'dır ve grafiğin anlamı oradadır.
function sweepRange(r) {
  let from = r.Z0 / SWEEP_SPAN
  let to = r.Z0 * SWEEP_SPAN

  if (r.type === TERM_SERIES && r.Rdriver > 0) {
    from = Math.min(from, r.Rdriver / SWEEP_EDGE_PAD)
    to = Math.max(to, r.Rdriver * SWEEP_EDGE_PAD)
  }

  return { from, to }
}

function sweepX(r) {
  const { from, to } = sweepRange(r)
  const xs = []
  for (let i = 0; i < SWEEP_STEPS; i++) {
    xs.push(from + ((to - from) * i) / (SWEEP_STEPS - 1))
  }
  return xs
}

export function buildSweep(r) {
  // Seri terminasyonda sonuç yokken bile eğri anlamlıdır: R_s'nin nerede
  // sıfırı kestiği, hesabın neden yapılamadığını gösterir.
  const drawable = r.ok || (r.type === TERM_SERIES && r.reason === REASON_NEGATIVE_SERIES)
  if (!drawable) return null

  const xs = sweepX(r)

  if (r.type === TERM_SERIES) {
    const points = xs.map((x) => {
      const t = seriesTermination({ Z0: x, Rdriver: r.Rdriver })
      // Motor hata döndürdüğünde de R_s alanını taşıyor; eğri sıfırın altına
      // iner ve seri terminasyonun tanımsız kaldığı bölge görünür.
      return [x, Number.isFinite(t.Rs) ? t.Rs : NaN]
    })
    return {
      type: TERM_SERIES,
      series: [{ key: 'rs', points }],
      refs: [{ key: 'zero', y: 0 }],
      marker: { x: r.Z0, y: r.Rs },
    }
  }

  if (r.type === TERM_PARALLEL) {
    const points = xs.map((x) => {
      const t = parallelTermination({ Z0: x, V: r.V, duty: r.duty })
      return [x, t.error ? NaN : t.Pdc]
    })
    return {
      type: TERM_PARALLEL,
      series: [{ key: 'pdc', points }],
      refs: [],
      marker: { x: r.Z0, y: r.Pdc },
    }
  }

  const rows = xs.map((x) => {
    const t = theveninTermination({ Z0: x, Vcc: r.Vcc, Vbias: r.Vbias, series: r.series })
    return {
      x,
      top: t.error ? NaN : t.ideal.Rtop,
      bottom: t.error ? NaN : t.ideal.Rbottom,
    }
  })

  return {
    type: TERM_THEVENIN,
    series: [
      { key: 'rtop', points: rows.map((p) => [p.x, p.top]) },
      { key: 'rbottom', points: rows.map((p) => [p.x, p.bottom]) },
    ],
    refs: [],
    marker: { x: r.Z0, y: r.ideal.Rtop },
  }
}
