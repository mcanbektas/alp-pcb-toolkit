// Trace hesap motoru.
// İç hesaplar SI birimleriyle yapılır; ampirik ısınma denklemi ise
// tanımı gereği mil² / A / °C birimlerinde çalışır ve bu açıkça belirtilir.

import { OZ_NOMINAL_UM, rhoCuAt } from './units'

// Klasik ampirik iletken ısınma denklemi: I = k · ΔT^0.44 · A^0.725
// A: mil², I: A, ΔT: °C
const K_COEFF = { external: 0.048, internal: 0.024 }

export const MIL = 0.0254 // 1 mil = 0.0254 mm
export const MIL2_TO_MM2 = 0.00064516 // 1 mil² = 0.00064516 mm²

// Bakır ağırlığı → nominal kalınlık (µm) seçenekleri. Kalınlık değerleri
// units.js'teki nominal tablodan gelir; burada ikinci bir kopya tutulmaz.
//
// `Object.keys` tam sayı benzeri anahtarları (1, 2, 3, 4) artan sırada öne
// alır, kalanları arkaya koyar; sıra kullanıcıya gösterildiği için sayısal
// olarak sabitlenir (bkz. copper.js OZ_NOMINAL_ROWS).
export const OZ_TABLE = [
  ...Object.keys(OZ_NOMINAL_UM)
    .map(Number)
    .sort((a, b) => a - b)
    .map((oz) => ({ key: String(oz), label: `${oz} oz (${OZ_NOMINAL_UM[oz]} µm)`, um: OZ_NOMINAL_UM[oz] })),
  // "Özel kalınlık" satırının etiketi saf katmanda dil bilmez: burada anahtarın
  // kendisi durur, ekran `text.fields.ozCustom` ile üzerine yazar (TraceWidth ve
  // PowerPlane bunu yapıyor). Etiket verilmezse alan anahtarı görünür — sessiz
  // boşluk ya da tek dilli cümle yerine teşhis edilebilir bir ad.
  { key: 'custom', label: 'custom', um: null },
]

// Seçim anahtarından nominal kalınlık (m). Özel kalınlık ve tabloda olmayan
// anahtar için NaN döner — sessizce bir değere düşülmez.
export function ozThickness_m(key) {
  const row = OZ_TABLE.find((o) => o.key === key)
  return row?.um != null ? row.um * 1e-6 : NaN
}

// Verilen akım ve sıcaklık artışı için gerekli kesit alanı (mil²)
export function areaForCurrent_mil2(I, dT, layer) {
  const k = K_COEFF[layer]
  return Math.pow(I / (k * Math.pow(dT, 0.44)), 1 / 0.725)
}

// Verilen kesit alanı için maksimum sürekli akım (A)
export function currentForArea(A_mil2, dT, layer) {
  const k = K_COEFF[layer]
  return k * Math.pow(dT, 0.44) * Math.pow(A_mil2, 0.725)
}

export function kCoeff(layer) {
  return K_COEFF[layer]
}

// Sıcaklığa bağlı özdirenç (ohm·m). Tek kaynak units.js'tedir; bu ad
// ekranların mevcut çağrılarını korumak için duruyor.
export const rhoAt = rhoCuAt

// Hat direnci (ohm). Tüm girişler SI: metre.
export function traceResistance(L_m, W_m, t_m, T) {
  return (rhoCuAt(T) * L_m) / (W_m * t_m)
}

// Denklemin kabaca geçerli olduğu aralık için uyarı üretir. Saf katman cümle
// kurmaz: her uyarı bir kod ve uyarıyı doğuran değerle döner
// (`{ code: 'dt-range', dT }`), cümleyi ekranın text.js dosyası yazar.
// Sıra sabittir: önce ΔT, sonra akım.
export function validityWarnings(I, dT) {
  const w = []
  if (dT < 10 || dT > 100) w.push({ code: 'dt-range', dT })
  if (I > 35) w.push({ code: 'i-range', I })
  return w
}
