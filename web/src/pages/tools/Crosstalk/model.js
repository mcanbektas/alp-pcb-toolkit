// Crosstalk kestirimi ekranının hesap modeli (spec §7.6).
// Saf: React, DOM ve gösterim bilmez; hata kodu döner, metin üretmez.
//
// DİKKAT — bu ekran spec §7.6'yı UYGULAMIYOR. §7.6 çok iletkenli iletim hattı
// çözümü istiyor (kapasitans matrisi 2B alan çözücüden, L = μ₀ε₀·C₀⁻¹,
// G ≈ ω·tanδ·C, aggressor sinyali FFT → her frekansta e^(−Mℓ) → IFFT).
// Alan çözücü F2'den beri kapasitans matrisini VERİYOR; uygulanmayan kısım
// FFT'li çok iletkenli dalga biçimi rotasıdır ve brif 09 F3.1'e göre de bu
// fazın kapsamı değildir — istenirse ayrı brif.
//
// F3: FEXT'in modal εeff girdisi artık çözücüden de gelebilir (fextMode
// 'solver'): çift geometrisi worker'da çözülür, modal değerler kestirime
// buradan akar. Kestirimin kendisi (K_b, L_sat, V_FEXT) değişmedi.
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

// FEXT modal hız farkına bağlıdır; değerler ya elle girilir ('on' — alan
// çözücü raporundan/üretici verisinden) ya da çift geometrisi verilip
// çözücüden hesaplatılır ('solver', F3). Kapalı formdan türetilmez.
export const FEXT_OFF = 'off'
export const FEXT_ON = 'on'
export const FEXT_SOLVER = 'solver'

export const FEXT_STRUCT_MICROSTRIP = 'microstrip'
export const FEXT_STRUCT_STRIPLINE = 'stripline'
export const FEXT_STRUCTURES = [FEXT_STRUCT_MICROSTRIP, FEXT_STRUCT_STRIPLINE]

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
  // Çözücü kaynağının çift geometrisi: W ve S ekrandaki kuplaj alanlarından
  // gelir (aynı çift), yalnız düşey yığın burada sorulur.
  fextStructure: FEXT_STRUCT_MICROSTRIP,
  fextH: '0.2', fextHu: 'mm',
  fextT: '35', fextTu: 'µm',
  fextEpsR: '4.2',
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
    // Çözücü kaynağı: çiftin düşey yığını. W ve S yukarıdaki kuplaj
    // alanlarından okunur — iki ayrı geometri girilmez, kestirimin 3W
    // kontrolüyle çözücü aynı çifti görür.
    when(f.fextMode === FEXT_SOLVER, [
      { key: 'fextH', label: L('fextH'), unitKey: 'fextHu', table: DIM, min: 0 },
      { key: 'fextT', label: L('fextT'), unitKey: 'fextTu', table: DIM, min: 0, allowZero: true },
      { key: 'fextEpsR', label: L('fextEpsR'), unit: '', table: PLAIN, min: 1 },
    ]),
  ])
}

// FEXT kaynağı çözücüyken worker'a gidecek iş — ekran useFieldSolver'a
// geçirir. Form eksik/geçersizken null: iş başlatılmaz.
export function fextSolverJob(f, labels = {}) {
  if (f.fextMode !== FEXT_SOLVER) return null
  const read = readForm(f, formFields(f, labels))
  if (!read.ok || read.ambiguous.length) return null
  const v = read.values
  return {
    kind: 'pair',
    structure: f.fextStructure === FEXT_STRUCT_STRIPLINE
      ? FEXT_STRUCT_STRIPLINE
      : FEXT_STRUCT_MICROSTRIP,
    W: v.W,
    S: v.S,
    height: v.fextH,
    t: v.fextT,
    epsR: v.fextEpsR,
  }
}

// `fieldResult`, FEXT kaynağı çözücüyken worker'ın BİTMİŞ sonucudur
// (fieldDifferentialPair zarfı; yoksa null). Modal εeff'ler oradan akar;
// çözüm sürerken FEXT "hesaplanıyor" durumundadır, sayı uydurulmaz.
export function compute(f, labels = {}, fieldResult = null) {
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

  const solverMode = f.fextMode === FEXT_SOLVER
  const solverPair = solverMode && fieldResult && !fieldResult.error ? fieldResult : null
  const modalOdd = f.fextMode === FEXT_ON ? v.epsOdd : solverPair ? solverPair.epsEffOdd : null
  const modalEven = f.fextMode === FEXT_ON ? v.epsEven : solverPair ? solverPair.epsEffEven : null

  const r = crosstalk({
    Zeven: v.Zeven,
    Zodd: v.Zodd,
    epsEff: eps.epsEff,
    tr: v.tr,
    coupledLength: v.len,
    Vagg: v.Vagg,
    epsEffOdd: modalOdd,
    epsEffEven: modalEven,
  })
  if (r.error) return { ok: false, reason: REASON_CROSSTALK }

  return {
    ok: true,
    eps,
    geom,
    fextOn: f.fextMode !== FEXT_OFF,
    fextMode: f.fextMode,
    // Çözücü zarfı yorum/rapor için taşınır: modal değerlerin kaynağı,
    // E_Z ve girilen Z_odd/Z_even ile tutarlılık karşılaştırması buradan.
    solverPair,
    fextSolverError: solverMode && fieldResult && fieldResult.error ? fieldResult.error : null,
    fextPending: solverMode && !fieldResult,
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
