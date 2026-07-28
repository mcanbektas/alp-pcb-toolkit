// PDN hedef empedansı ekranının hesap modeli (spec §8.1, §8.2.3, §8.2.4).
// Saf: React, DOM ve gösterim bilmez; hata kodu döner, metni text.js çevirir.
//
// Hesabın tamamı lib/pdn.js içindeki mevcut fonksiyonlardan gelir. Burada yeni
// denklem yazılmaz: spec'in vermediği bir bağıntı (frekansa bağlı hedef profil,
// VRM modeli, montaj endüktansı terimleri) uydurulmaz.

import { readForm, readRows, fieldsFor, when } from '../../../lib/fields'
import {
  VOLTAGE, CURRENT, CAPACITANCE, INDUCTANCE, FREQUENCY, RESISTANCE, AREA, LENGTH,
} from '../../../lib/units'
import {
  targetImpedance, planeCapacitance, pdnImpedance, loopInductance,
  PDN_ERR_SINGULAR,
} from '../../../lib/pdn'

// İzin verilen gerilim değişiminin kaynağı (spec §8.1 iki yolu da tanımlıyor)
export const SRC_TOLERANCE = 'tol'
export const SRC_DIRECT = 'direct'
export const SOURCES = [SRC_TOLERANCE, SRC_DIRECT]

export const OFF = 'off'
export const ON = 'on'
export const TOGGLES = [OFF, ON]

export const REASON_INCOMPLETE = 'incomplete'
export const REASON_TARGET = 'target'
export const REASON_ROWS = 'rows'
export const REASON_PLANE = 'plane'
export const REASON_CURVE = 'curve'
export const REASON_LOOP = 'loop'
// Motorun kayıpsız kapasitör koruması: ESR = 0 girilirse buraya düşer
export const REASON_ESR_ZERO = PDN_ERR_SINGULAR

// Grafik aralığı — spec §8.2.4 eğrinin hedef çizgisiyle aynı grafikte
// gösterilmesini istiyor. Aralık geniş tutulur: bulk kapasitör bölgesinden
// düzlem/ESL bölgesine kadar.
export const SWEEP_FROM = 1e3 // 1 kHz
export const SWEEP_TO = 1e9 // 1 GHz
const SWEEP_STEPS = 161

export const INITIAL_FORM = {
  // --- Hedef empedans ---
  source: SRC_TOLERANCE,
  Vrail: '1.0', Vrailu: 'V',
  tolerancePct: '3',
  deltaV: '30', deltaVu: 'mV',
  deltaI: '5', deltaIu: 'A',

  // --- PDN eğrisi ---
  curve: ON,
  fOp: '1', fOpu: 'MHz',
  vrmR: '2', vrmRu: 'mΩ',
  vrmL: '100', vrmLu: 'nH',

  caps: [
    { C: '470', Cu: 'µF', ESR: '15', ESRu: 'mΩ', ESL: '5', ESLu: 'nH', n: '4' },
    { C: '10', Cu: 'µF', ESR: '5', ESRu: 'mΩ', ESL: '1.5', ESLu: 'nH', n: '8' },
    { C: '100', Cu: 'nF', ESR: '25', ESRu: 'mΩ', ESL: '0.7', ESLu: 'nH', n: '20' },
  ],

  // --- Düzlem kapasitesi ---
  plane: OFF,
  area: '40', areau: 'cm²',
  d: '0.1', du: 'mm',
  epsR: '4.2',

  // --- Bağlantı loop endüktansı ---
  loop: ON,
  eslComp: '0.8', eslCompu: 'nH',
  Lmount: '0.4', Lmountu: 'nH',
  Lvia: '1.2', Lviau: 'nH',
  Lspread: '0.5', Lspreadu: 'nH',
}

const PLAIN = { '': 1 }
const PCT = { '%': 1 }
// Direnç ve alan çarpanları units.js'ten gelir; yerel çarpan tablosu yazılmaz.
// Ekranda sunulan birimler OHM_UNITS ve alan seçicisinin listesiyle sınırlıdır.

export const CAP_UNITS = ['µF', 'nF', 'pF']
export const OHM_UNITS = ['mΩ', 'Ω']
export const IND_UNITS = ['nH', 'pH']

// Kapasitör bankası satırları. RowList ortak bileşeni satır başına iki sütun
// gösterecek biçimde tanımlı olduğu için banka iki listeye bölünür; ikisi de
// aynı satır dizisini düzenler, satır numaraları birebir örtüşür.
export const CAP_COLUMNS_A = [
  { key: 'C', unitKey: 'Cu', label: 'Kapasite', units: CAP_UNITS },
  { key: 'ESR', unitKey: 'ESRu', label: 'ESR', units: OHM_UNITS },
]

export const CAP_COLUMNS_B = [
  { key: 'ESL', unitKey: 'ESLu', label: 'ESL', units: IND_UNITS },
  { key: 'n', label: 'Adet' },
]

// ESR ve ESL alan katmanında sıfıra izin verir; sıfır ESR'yi motor
// PDN_ERR_SINGULAR ile reddeder ve ekran bunu anlaşılır bir mesaja çevirir.
const CAP_SPECS = [
  { key: 'C', label: 'Kapasite', unitKey: 'Cu', table: CAPACITANCE, min: 0 },
  { key: 'ESR', label: 'ESR', unitKey: 'ESRu', table: RESISTANCE, min: 0, allowZero: true },
  { key: 'ESL', label: 'ESL', unitKey: 'ESLu', table: INDUCTANCE, min: 0, allowZero: true },
  { key: 'n', label: 'Adet', min: 1 },
]

export const CAP_ROW_LABEL = 'Kapasitör'

export function formFields(f) {
  const fromTol = f.source === SRC_TOLERANCE
  return fieldsFor([
    [
      { key: 'deltaI', label: 'Ani yük değişimi (ΔI)', unitKey: 'deltaIu', table: CURRENT, min: 0 },
    ],
    when(fromTol, [
      { key: 'Vrail', label: 'Ray gerilimi (V_ray)', unitKey: 'Vrailu', table: VOLTAGE, min: 0 },
      { key: 'tolerancePct', label: 'Gerilim toleransı', unit: '%', table: PCT, min: 0 },
    ]),
    when(!fromTol, [
      { key: 'deltaV', label: 'İzin verilen gerilim değişimi (ΔV)', unitKey: 'deltaVu', table: VOLTAGE, min: 0 },
    ]),
    when(f.curve === ON, [
      { key: 'fOp', label: 'Çalışma frekansı', unitKey: 'fOpu', table: FREQUENCY, min: 0 },
      { key: 'vrmR', label: 'VRM çıkış direnci (R)', unitKey: 'vrmRu', table: RESISTANCE, min: 0, optional: true, allowZero: true },
      { key: 'vrmL', label: 'VRM endüktansı (L)', unitKey: 'vrmLu', table: INDUCTANCE, min: 0, optional: true, allowZero: true },
    ]),
    when(f.curve === ON && f.plane === ON, [
      { key: 'area', label: 'Örtüşen düzlem alanı (A)', unitKey: 'areau', table: AREA, min: 0 },
      { key: 'd', label: 'Dielektrik kalınlığı (d)', unitKey: 'du', table: LENGTH, min: 0 },
      { key: 'epsR', label: 'Dielektrik sabiti (εr)', unit: '', table: PLAIN, min: 1 },
    ]),
    when(f.loop === ON, [
      { key: 'eslComp', label: 'Komponent ESL', unitKey: 'eslCompu', table: INDUCTANCE, min: 0, optional: true, allowZero: true },
      { key: 'Lmount', label: 'Montaj endüktansı (L_mount)', unitKey: 'Lmountu', table: INDUCTANCE, min: 0, optional: true, allowZero: true },
      { key: 'Lvia', label: 'Via endüktansı (L_via)', unitKey: 'Lviau', table: INDUCTANCE, min: 0, optional: true, allowZero: true },
      { key: 'Lspread', label: 'Düzlem yayılma endüktansı (L_yayılma)', unitKey: 'Lspreadu', table: INDUCTANCE, min: 0, optional: true, allowZero: true },
    ]),
  ])
}

// Logaritmik frekans taraması. Her noktada motorun kendi fonksiyonu çağrılır;
// ara değerlerde yuvarlama yapılmaz.
function sweepCurve({ caps, vrm, Cplane, Ztarget }) {
  const rows = []
  const bands = []
  let worst = null
  let exceedCount = 0
  let open = null
  let anyInductive = false

  const a = Math.log10(SWEEP_FROM)
  const b = Math.log10(SWEEP_TO)

  for (let i = 0; i < SWEEP_STEPS; i++) {
    const fx = Math.pow(10, a + ((b - a) * i) / (SWEEP_STEPS - 1))
    const z = pdnImpedance({ caps, vrm, Cplane, f: fx })
    const mag = z.error ? NaN : z.mag
    const capsMag = z.error ? NaN : z.capsMag
    const inductive = z.error ? false : z.inductive

    rows.push({ x: fx, y: mag, capsY: Number.isFinite(capsMag) ? capsMag : NaN, inductive })

    if (Number.isFinite(mag)) {
      if (!worst || mag > worst.mag) worst = { f: fx, mag, inductive }
      // Hedefin aşıldığı bitişik bantlar ayrı ayrı toplanır; tek bir
      // "ilk–son" aralığı birden çok tepeyi tek banda benzetirdi.
      if (mag > Ztarget) {
        exceedCount += 1
        if (open) open.to = fx
        else { open = { from: fx, to: fx }; bands.push(open) }
      } else {
        open = null
      }
      if (inductive) anyInductive = true
    } else {
      open = null
    }
  }

  return {
    rows,
    worst,
    bands,
    exceedCount,
    anyInductive,
    total: rows.length,
  }
}

// Paylardan baskın terimin anahtarını verir; metne text.js çevirir.
function dominantShare(shares) {
  return Object.keys(shares).reduce((a, k) => (shares[k] > shares[a] ? k : a))
}

export function compute(f) {
  const read = readForm(f, formFields(f))
  if (read.ambiguous.length) return { ok: false, ambiguous: read.ambiguous }
  if (!read.ok) return { ok: false, reason: REASON_INCOMPLETE, invalid: read.invalid }

  const v = read.values
  const fromTol = f.source === SRC_TOLERANCE

  const tgt = targetImpedance({
    Vrail: fromTol ? v.Vrail : null,
    tolerancePct: fromTol ? v.tolerancePct : null,
    deltaV: fromTol ? null : v.deltaV,
    deltaI: v.deltaI,
  })
  if (tgt.error) return { ok: false, reason: REASON_TARGET }

  const curveOn = f.curve === ON
  const planeOn = curveOn && f.plane === ON
  const loopOn = f.loop === ON

  // --- Düzlem kapasitesi (spec §8.2.3) ---
  let plane = null
  if (planeOn) {
    const p = planeCapacitance({ area: v.area, d: v.d, epsR: v.epsR })
    if (p.error) return { ok: false, reason: REASON_PLANE }
    plane = p
  }

  // --- PDN eğrisi (spec §8.2.4) ---
  let curve = null
  if (curveOn) {
    const rows = readRows(f.caps, CAP_SPECS, CAP_ROW_LABEL)
    if (rows.ambiguous.length) return { ok: false, ambiguous: rows.ambiguous }
    if (!rows.ok) return { ok: false, reason: REASON_ROWS, invalid: rows.invalid }

    const caps = rows.rows.map((x) => ({ C: x.C, ESR: x.ESR, ESL: x.ESL, count: x.n }))
    const R = v.vrmR ?? 0
    const L = v.vrmL ?? 0
    const vrm = R > 0 || L > 0 ? { R, L } : null
    const Cplane = plane ? plane.C : 0

    const z = pdnImpedance({ caps, vrm, Cplane, f: v.fOp })
    if (z.error === REASON_ESR_ZERO) return { ok: false, reason: REASON_ESR_ZERO }
    if (z.error) return { ok: false, reason: REASON_CURVE }

    curve = {
      z,
      vrm,
      caps,
      fOp: v.fOp,
      // Tarama aralığı sabittir; çalışma frekansı dışına düşerse grafikte
      // işaretçi çizilemez ve sonuç tablosu bunu ayrıca söyler.
      fOpInSweep: v.fOp >= SWEEP_FROM && v.fOp <= SWEEP_TO,
      capCount: caps.reduce((acc, c) => acc + c.count, 0),
      // Aynı satırda birden çok kapasitör varsa ESL'in 1/N azaldığı varsayılır
      shared: caps.some((c) => c.count > 1),
      sweep: sweepCurve({ caps, vrm, Cplane, Ztarget: tgt.Ztarget }),
    }
  }

  // --- Bağlantı loop endüktansı (spec §8.2.4) ---
  let loop = null
  if (loopOn) {
    const l = loopInductance({
      eslComponent: v.eslComp ?? 0,
      Lmount: v.Lmount ?? 0,
      Lvia: v.Lvia ?? 0,
      Lspread: v.Lspread ?? 0,
    })
    if (l.error) return { ok: false, reason: REASON_LOOP }
    loop = l
  }

  return {
    ok: true,
    ...tgt,
    source: f.source,
    curveOn, planeOn, loopOn,
    plane, curve, loop,
    dominant: loop ? dominantShare(loop.shares) : null,
    belowTarget: curve ? curve.z.mag <= tgt.Ztarget : null,
  }
}

// Logaritmik y ekseni: LineChart y'yi doğrusal ölçekler, PDN empedansı ise
// milliohm ile onlarca ohm arasında birkaç dekat değişir. Model log10 değerini
// üretir, gösterim tarafı 10^y ile geri çevirip birimli yazar — böylece hedef
// çizgisi de anti-rezonans tepesi de aynı grafikte okunabilir kalır.
// Geçersiz nokta NaN'de bırakılır: log10(0) = -Infinity ekseni bozardı.
function log10safe(v) {
  return Number.isFinite(v) && v > 0 ? Math.log10(v) : NaN
}

// Grafik: PDN eğrisi + yalnız kapasitör ağı, hedef empedans referans çizgisiyle
export function buildSweep(r) {
  if (!r.ok || !r.curve) return null

  const rows = r.curve.sweep.rows
  const capPoints = rows.map((p) => [p.x, log10safe(p.capsY)])

  return {
    rows,
    points: rows.map((p) => [p.x, log10safe(p.y)]),
    capPoints,
    hasCaps: capPoints.some((p) => Number.isFinite(p[1])),
    // `real` gerçek değeri taşır; `y` ölçek uzayındadır ve etikete yazılmaz.
    refs: [{ key: 'target', y: log10safe(r.Ztarget), real: r.Ztarget }],
    // Tarama aralığının dışındaki çalışma frekansı için işaretçi üretilmez:
    // çizim alanının dışında kalır ama y eksenini gerdiği için eğriyi ezerdi.
    marker: r.curve.fOpInSweep
      ? { x: r.curve.fOp, y: log10safe(r.curve.z.mag) }
      : null,
  }
}
