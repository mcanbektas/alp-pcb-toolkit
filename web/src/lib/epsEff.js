// Efektif dielektrik sabiti kaynağı (spec §7.1).
//
// Sinyal bütünlüğü hesaplarının hepsi εeff'e dayanır. Üç kaynak vardır:
//   - elle girilen değer
//   - geometriden kapalı form hesabı (lib/impedance.js çağrılır)
//   - diferansiyel çift geometrisinden ALAN ÇÖZÜCÜ (brif 09 F3): çözücü
//     Web Worker'da koştuğu için sonuç asenkron gelir — resolveEpsEff çözücü
//     SONUCUNU parametre alır, kendisi çözmez. Sonuç yokken { pending: true }
//     döner; ekran hesap yerine "hesaplanıyor" durumu gösterir.
//     Kullanılan değer ODD mod εeff'idir: diferansiyel işaret odd modda
//     yayılır. Even mod değeri de zarfta taşınır (FEXT girdisi).
//
// Ekranlar arasında paylaşılan durum YOKTUR. Her ekran bu modülü kendi içinde
// çağırır; ortak olan alan tanımları ve çözümleme mantığıdır, veri değil.
// Böylece ekranlar birbirine bağlanmaz ama aynı motoru kullanır.
//
// `method` alanı aşağı doğru taşınır: εeff kapalı formdan geldiyse ondan
// türeyen gecikme, skew ve kritik uzunluk sonuçları da o etiketi taşır;
// çözücüden geldiyse `field-solver` etiketi ve E_Z birlikte taşınır.

import { fieldsFor, when } from './fields'
import { LENGTH } from './units'
import { C0 } from './units'
import {
  microstrip, stripline, METHOD_CLOSED_FORM, METHOD_FIELD_SOLVER,
} from './impedance'

export const EPS_MANUAL = 'manual'
export const EPS_GEOMETRY = 'geometry'
// Çözücü kaynağı her ekranda sunulmaz; ekran epsFields/EpsEffFields'e
// { solver: true } geçerek katılır (F3'te yalnız Skew).
export const EPS_SOLVER = 'solver'
export const EPS_SOURCES = [EPS_MANUAL, EPS_GEOMETRY]

export const EPS_STRUCT_MICROSTRIP = 'microstrip'
export const EPS_STRUCT_STRIPLINE = 'stripline'
export const EPS_STRUCTURES = [EPS_STRUCT_MICROSTRIP, EPS_STRUCT_STRIPLINE]

// Alan adları `eps` ön ekiyle tutulur ki ekranın kendi alanlarıyla çakışmasın.
// epsS yalnız çözücü kaynağında okunur (çift aralığı).
export const INITIAL_EPS_FORM = {
  epsSource: EPS_MANUAL,
  epsEffManual: '3.2',
  epsStructure: EPS_STRUCT_MICROSTRIP,
  epsW: '0.2', epsWu: 'mm',
  epsH: '0.2', epsHu: 'mm',
  epsT: '35', epsTu: 'µm',
  epsS: '0.2', epsSu: 'mm',
  epsR: '4.2',
}

const PLAIN = { '': 1 }
const DIM = { mm: LENGTH.mm, 'µm': LENGTH['µm'], um: LENGTH.um, mil: LENGTH.mil }

// Saf katman dil bilmez: etiket olarak alan anahtarı döner. Ekran
// `labels[s.key] ?? s.label` ile kendi çevirisini geçirir; çeviri eksikse
// anahtar görünür — sessizce Türkçeye düşmez.
export function epsFields(f) {
  const geometry = f.epsSource === EPS_GEOMETRY
  const solver = f.epsSource === EPS_SOLVER
  const microstripGeometry = geometry && f.epsStructure === EPS_STRUCT_MICROSTRIP

  return fieldsFor([
    when(!geometry && !solver, [
      { key: 'epsEffManual', label: 'epsEffManual', unit: '', table: PLAIN, min: 1 },
    ]),
    when(geometry || solver, [
      { key: 'epsR', label: 'epsR', unit: '', table: PLAIN, min: 1 },
    ]),
    // Stripline homojen dielektriktedir: εeff = εr, geometri sorulmaz
    when(microstripGeometry, [
      { key: 'epsW', label: 'epsW', unitKey: 'epsWu', table: DIM, min: 0 },
      { key: 'epsH', label: 'epsH', unitKey: 'epsHu', table: DIM, min: 0 },
      { key: 'epsT', label: 'epsT', unitKey: 'epsTu', table: DIM, min: 0, allowZero: true },
    ]),
    // Çözücü kaynağı ÇİFT geometrisi ister: aralık da girilir. Stripline'da
    // da sorulur — modal εeff'ler orada εr'ye eşit çıkar ama Z_odd/Z_even
    // zarfta yine taşınır.
    when(solver, [
      { key: 'epsW', label: 'epsW', unitKey: 'epsWu', table: DIM, min: 0 },
      { key: 'epsS', label: 'epsS', unitKey: 'epsSu', table: DIM, min: 0 },
      { key: 'epsH', label: 'epsH', unitKey: 'epsHu', table: DIM, min: 0 },
      { key: 'epsT', label: 'epsT', unitKey: 'epsTu', table: DIM, min: 0, allowZero: true },
    ]),
  ])
}

// Çözücü kaynağının worker işi — useFieldSolver sözleşmesiyle aynı adlar.
// values, readForm'dan geçmiş SI değerlerdir; kaynak çözücü değilse null.
export function epsSolverParams(values, f) {
  if (f.epsSource !== EPS_SOLVER) return null
  return {
    kind: 'pair',
    structure: f.epsStructure === EPS_STRUCT_STRIPLINE
      ? EPS_STRUCT_STRIPLINE
      : EPS_STRUCT_MICROSTRIP,
    W: values.epsW,
    S: values.epsS,
    height: values.epsH,
    t: values.epsT,
    epsR: values.epsR,
  }
}

/**
 * Okunmuş değerlerden εeff üretir.
 *
 * `fieldResult`, kaynak EPS_SOLVER olduğunda useFieldSolver'ın BİTMİŞ
 * sonucudur (fieldDifferentialPair zarfı). Henüz yoksa { pending: true }
 * döner — sayı uydurulmaz; hata taşıyorsa { error } aşağı iletilir.
 *
 * @returns {{ epsEff, source, structure, method, model, inRange, Z0, tpd }}
 *   veya { error } veya { pending: true, source: EPS_SOLVER }
 */
export function resolveEpsEff(values, f, fieldResult = null) {
  if (f.epsSource === EPS_SOLVER) {
    if (!fieldResult) return { pending: true, source: EPS_SOLVER }
    if (fieldResult.error) return { error: fieldResult.error }
    return {
      // Diferansiyel işaret odd modda yayılır; hız/gecikme odd εeff'ten
      epsEff: fieldResult.epsEffOdd,
      source: EPS_SOLVER,
      structure: fieldResult.structure,
      method: METHOD_FIELD_SOLVER,
      model: fieldResult.model,
      inRange: true,
      Z0: null,
      tpd: fieldResult.tpdOdd,
      // Zarfın FEXT/rapor için taşıdığı ekler
      epsEffOdd: fieldResult.epsEffOdd,
      epsEffEven: fieldResult.epsEffEven,
      Zodd: fieldResult.Zodd,
      Zeven: fieldResult.Zeven,
      convergence: fieldResult.convergence,
    }
  }

  if (f.epsSource !== EPS_GEOMETRY) {
    const epsEff = values.epsEffManual
    if (!(epsEff >= 1)) return { error: 'invalid' }
    return {
      epsEff,
      source: EPS_MANUAL,
      structure: null,
      // Elle girilen değerin yöntemi kullanıcıya aittir; motor iddiası yoktur
      method: null,
      model: null,
      inRange: true,
      Z0: null,
      tpd: Math.sqrt(epsEff) / C0,
    }
  }

  if (f.epsStructure === EPS_STRUCT_STRIPLINE) {
    // Homojen dielektrik — geometriye bağlı değil
    const epsEff = values.epsR
    if (!(epsEff >= 1)) return { error: 'invalid' }
    return {
      epsEff,
      source: EPS_GEOMETRY,
      structure: EPS_STRUCT_STRIPLINE,
      method: METHOD_CLOSED_FORM,
      model: 'homogeneous-dielectric',
      inRange: true,
      Z0: null,
      tpd: Math.sqrt(epsEff) / C0,
    }
  }

  const r = microstrip({ W: values.epsW, H: values.epsH, t: values.epsT, epsR: values.epsR })
  if (r.error) return { error: r.error }

  return {
    epsEff: r.epsEff,
    source: EPS_GEOMETRY,
    structure: EPS_STRUCT_MICROSTRIP,
    method: r.method,
    model: r.model,
    inRange: r.inRange,
    Z0: r.Z0,
    tpd: r.tpd,
    u: r.u,
  }
}

// --- Ortak yayılma yardımcıları (spec §7.1, §7.2) ---

// Birim uzunluk başına gecikme (s/m)
export const delayPerLength = (epsEff) => Math.sqrt(epsEff) / C0

// ps/mm — sinyal bütünlüğü ekranlarının ortak gösterim birimi
export const psPerMm = (tpd) => tpd * 1e9

// Yayılma hızı (m/s)
export const phaseVelocity = (epsEff) => C0 / Math.sqrt(epsEff)

// Toplam gecikme (s)
export const propagationDelay = (length, epsEff) => length * delayPerLength(epsEff)

// Uzunluğa karşılık gelen gecikmeden uzunluk (m)
export const lengthForDelay = (delay, epsEff) => delay / delayPerLength(epsEff)

// Stripline dışında da kullanılan pratik yaklaşım kontrolü:
// t'pd ≈ 3.33564·√εeff ps/mm — motorun sonucuyla aynı olmalıdır.
export const PRACTICAL_PS_PER_MM = 3.33564
