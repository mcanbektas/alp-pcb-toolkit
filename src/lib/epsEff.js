// Efektif dielektrik sabiti kaynağı (spec §7.1).
//
// Sinyal bütünlüğü hesaplarının hepsi εeff'e dayanır. İki kaynak vardır:
//   - elle girilen değer
//   - geometriden hesap (lib/impedance.js çağrılır)
//
// Ekranlar arasında paylaşılan durum YOKTUR. Her ekran bu modülü kendi içinde
// çağırır; ortak olan alan tanımları ve çözümleme mantığıdır, veri değil.
// Böylece ekranlar birbirine bağlanmaz ama aynı motoru kullanır.
//
// `method` alanı aşağı doğru taşınır: εeff kapalı formdan geldiyse ondan
// türeyen gecikme, skew ve kritik uzunluk sonuçları da o etiketi taşır.

import { fieldsFor, when } from './fields'
import { LENGTH } from './units'
import { C0 } from './units'
import { microstrip, stripline, METHOD_CLOSED_FORM } from './impedance'

export const EPS_MANUAL = 'manual'
export const EPS_GEOMETRY = 'geometry'
export const EPS_SOURCES = [EPS_MANUAL, EPS_GEOMETRY]

export const EPS_STRUCT_MICROSTRIP = 'microstrip'
export const EPS_STRUCT_STRIPLINE = 'stripline'
export const EPS_STRUCTURES = [EPS_STRUCT_MICROSTRIP, EPS_STRUCT_STRIPLINE]

// Alan adları `eps` ön ekiyle tutulur ki ekranın kendi alanlarıyla çakışmasın.
export const INITIAL_EPS_FORM = {
  epsSource: EPS_MANUAL,
  epsEffManual: '3.2',
  epsStructure: EPS_STRUCT_MICROSTRIP,
  epsW: '0.2', epsWu: 'mm',
  epsH: '0.2', epsHu: 'mm',
  epsT: '35', epsTu: 'µm',
  epsR: '4.2',
}

const PLAIN = { '': 1 }
const DIM = { mm: LENGTH.mm, 'µm': LENGTH['µm'], um: LENGTH.um, mil: LENGTH.mil }

export function epsFields(f) {
  const geometry = f.epsSource === EPS_GEOMETRY
  const microstripGeometry = geometry && f.epsStructure === EPS_STRUCT_MICROSTRIP

  return fieldsFor([
    when(!geometry, [
      { key: 'epsEffManual', label: 'Efektif dielektrik sabiti (εeff)', unit: '', table: PLAIN, min: 1 },
    ]),
    when(geometry, [
      { key: 'epsR', label: 'Dielektrik sabiti (εr)', unit: '', table: PLAIN, min: 1 },
    ]),
    // Stripline homojen dielektriktedir: εeff = εr, geometri sorulmaz
    when(microstripGeometry, [
      { key: 'epsW', label: 'Hat genişliği (W)', unitKey: 'epsWu', table: DIM, min: 0 },
      { key: 'epsH', label: 'Dielektrik yüksekliği (H)', unitKey: 'epsHu', table: DIM, min: 0 },
      { key: 'epsT', label: 'Bakır kalınlığı (t)', unitKey: 'epsTu', table: DIM, min: 0, allowZero: true },
    ]),
  ])
}

/**
 * Okunmuş değerlerden εeff üretir.
 *
 * @returns {{ epsEff, source, structure, method, model, inRange, Z0, tpd }}
 *   veya { error }
 */
export function resolveEpsEff(values, f) {
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
