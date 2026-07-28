// Crosstalk kestirimi ekranının hesap modeli (spec §7.6).
// Saf: React, DOM ve gösterim bilmez; hata kodu döner, metin üretmez.
//
// DİKKAT — bu ekran spec §7.6'yı UYGULAMIYOR. §7.6 çok iletkenli iletim hattı
// çözümü istiyor (kapasitans matrisi 2B alan çözücüden, L = μ₀ε₀·C₀⁻¹,
// G ≈ ω·tanδ·C, aggressor sinyali FFT → her frekansta e^(−Mℓ) → IFFT).
// Alan çözücü olmadığı için hiçbir adımı yapılamıyor.
//
// Burada yalnızca lib/signalIntegrity.js içindeki mevcut fonksiyonlar çağrılır;
// bu dosyada tek bir denklem tanımlanmaz. Kestirimin sınırlarını ekrana taşımak
// text.js ve index.jsx'in işidir.

import { readForm, fieldsFor, when } from '../../../lib/fields'
import { LENGTH, TIME, VOLTAGE, RESISTANCE } from '../../../lib/units'
import { epsFields, resolveEpsEff, INITIAL_EPS_FORM, psPerMm } from '../../../lib/epsEff'
import { threeWRule, nextCoupling, crosstalk } from '../../../lib/signalIntegrity'

export const REASON_INCOMPLETE = 'incomplete'
export const REASON_EPS = 'eps'
export const REASON_GEOMETRY = 'geometry'
export const REASON_COUPLING = 'coupling'
export const REASON_CROSSTALK = 'crosstalk'

// FEXT modal hız farkına bağlıdır ve hiçbir mevcut motor bunu vermez.
// Bu yüzden modal εeff alanları zorunlu değildir; ayrı bir seçim arkasında
// durur ve yalnızca seçilirse zorunlu olur.
export const FEXT_OFF = 'off'
export const FEXT_ON = 'on'

export const INITIAL_FORM = {
  ...INITIAL_EPS_FORM,

  Zeven: '58',
  Zodd: '45',

  W: '0.2', Wu: 'mm',
  S: '0.4', Su: 'mm',

  len: '50', lenu: 'mm',
  tr: '200', tru: 'ps',
  Vagg: '3.3', Vaggu: 'V',

  fextMode: FEXT_OFF,
  epsOdd: '',
  epsEven: '',
}

const PLAIN = { '': 1 }
const DIM = { mm: LENGTH.mm, 'µm': LENGTH['µm'], um: LENGTH.um, mil: LENGTH.mil }
const LEN = {
  mm: LENGTH.mm, cm: LENGTH.cm, m: LENGTH.m, inch: LENGTH.inch, mil: LENGTH.mil,
}

export const DIM_UNITS = ['mm', 'µm', 'mil']
export const LEN_UNITS = ['mm', 'cm', 'm', 'inch', 'mil']
export const TIME_UNITS = ['ps', 'ns', 'µs']
export const VOLT_UNITS = ['V', 'mV']

// Alan etiketleri `labels` ile çağıran taraftan gelir (geçerli dilde,
// text.js'ten); `lib/` bunları bilmez. εeff alanlarının etiketi de aynı
// sözlükten çevrilir — verilmezse lib'in kendi etiketi kalır.
export function formFields(f, labels = {}) {
  const L = (key) => labels[key] ?? key
  return fieldsFor([
    epsFields(f).map((s) => ({ ...s, label: labels[s.key] ?? s.label })),
    [
      // Birim seçici yok: tek birim `unit` ile sabitlenir, çarpan units.js
      // RESISTANCE tablosundan gelir (yerel çarpan tablosu yazılmaz).
      { key: 'Zeven', label: L('Zeven'), unit: 'Ω', table: RESISTANCE, min: 0 },
      { key: 'Zodd', label: L('Zodd'), unit: 'Ω', table: RESISTANCE, min: 0 },
      // Etiket lib/epsEff.js içindeki epsW alanından ("Hat genişliği (W)") ayrı
      // olmalı: eps_eff geometriden hesaplanırken formda iki genişlik alanı
      // bulunur ve readForm hatayı ada göre bildirir.
      { key: 'W', label: L('W'), unitKey: 'Wu', table: DIM, min: 0 },
      { key: 'S', label: L('S'), unitKey: 'Su', table: DIM, min: 0 },
      { key: 'len', label: L('len'), unitKey: 'lenu', table: LEN, min: 0 },
      { key: 'tr', label: L('tr'), unitKey: 'tru', table: TIME, min: 0 },
      { key: 'Vagg', label: L('Vagg'), unitKey: 'Vaggu', table: VOLTAGE, min: 0 },
    ],
    // Motor bu iki değere ≥ 1 eşiği uygular; alan tanımı da aynı eşiği koyar ki
    // kullanıcı sessizce "FEXT hesaplanmadı" sonucuna düşmesin.
    when(f.fextMode === FEXT_ON, [
      { key: 'epsOdd', label: L('epsOdd'), unit: '', table: PLAIN, min: 1 },
      { key: 'epsEven', label: L('epsEven'), unit: '', table: PLAIN, min: 1 },
    ]),
  ])
}

export function compute(f, labels = {}) {
  const read = readForm(f, formFields(f, labels))
  if (read.ambiguous.length) return { ok: false, ambiguous: read.ambiguous }
  if (!read.ok) return { ok: false, reason: REASON_INCOMPLETE, invalid: read.invalid }

  const eps = resolveEpsEff(read.values, f)
  if (eps.error) return { ok: false, reason: REASON_EPS }

  const v = read.values

  // Spec'te birebir tanımlı tek şey bu geometrik kontroldür (S ≥ 3W).
  const geom = threeWRule({ W: v.W, S: v.S })
  if (geom.error) return { ok: false, reason: REASON_GEOMETRY }

  // K_b ayrıca okunur ki Z_even ≤ Z_odd hatası crosstalk() hatasından
  // ayrı bir neden koduyla bildirilebilsin.
  const coupling = nextCoupling({ Zeven: v.Zeven, Zodd: v.Zodd })
  if (coupling.error) return { ok: false, reason: REASON_COUPLING }

  const fextOn = f.fextMode === FEXT_ON
  const r = crosstalk({
    Zeven: v.Zeven,
    Zodd: v.Zodd,
    epsEff: eps.epsEff,
    tr: v.tr,
    coupledLength: v.len,
    Vagg: v.Vagg,
    epsEffOdd: fextOn ? v.epsOdd : null,
    epsEffEven: fextOn ? v.epsEven : null,
  })
  if (r.error) return { ok: false, reason: REASON_CROSSTALK }

  return {
    ok: true,
    eps,
    geom,
    fextOn,
    W: v.W,
    S: v.S,
    Zeven: v.Zeven,
    Zodd: v.Zodd,
    ...r,
    tpdPsPerMm: psPerMm(eps.tpd),
  }
}

// Grafik: paralel uzunluğa göre NEXT tepe gerilimi.
// Hat aralığı taraması yapılmaz — bu ekranda Z_odd/Z_even kullanıcıdan geliyor
// ve aralığa bağlı bir modeli yok; aralığı süpürmek sahte bir duyarlılık
// eğrisi üretirdi.
export function buildSweep(r) {
  if (!r.ok) return null

  // Tarama penceresi çalışma noktası etrafında sabit çarpanla kapatılır
  // (kardeş ekranlardaki desen: DiffPair merkez/8…merkez*8, CriticalLength
  // t_r/10…t_r*10). L ile L_sat birbirinden uzaklaştığında eksen kontrolsüz
  // açılmasın diye pencere iki dekatla sınırlanır. Doyma referans çizgisi bir
  // y değeri olduğu için pencere ne olursa olsun grafikte görünür kalır.
  const lo = Math.max(Math.min(r.coupledLength, r.Lsat) / 8, r.coupledLength / 100)
  const hi = Math.min(Math.max(r.coupledLength, r.Lsat) * 8, r.coupledLength * 100)
  if (!(lo > 0) || !(hi > lo)) return null

  const steps = 70
  const rows = []
  for (let i = 0; i < steps; i++) {
    const x = Math.pow(10, Math.log10(lo) + ((Math.log10(hi) - Math.log10(lo)) * i) / (steps - 1))
    const e = crosstalk({
      Zeven: r.Zeven, Zodd: r.Zodd, epsEff: r.epsEff,
      tr: r.tr, coupledLength: x, Vagg: r.Vagg,
    })
    rows.push({ x: x * 1e3, y: e.error ? NaN : e.Vnext })
  }

  // Doyma seviyesi de motordan okunur: L = L_sat noktasındaki NEXT gerilimi.
  const sat = crosstalk({
    Zeven: r.Zeven, Zodd: r.Zodd, epsEff: r.epsEff,
    tr: r.tr, coupledLength: r.Lsat, Vagg: r.Vagg,
  })

  return {
    rows,
    points: rows.map((p) => [p.x, p.y]),
    refs: sat.error ? [] : [{ key: 'sat', y: sat.Vnext }],
    marker: { x: r.coupledLength * 1e3, y: r.Vnext },
    LsatMm: r.Lsat * 1e3,
  }
}
