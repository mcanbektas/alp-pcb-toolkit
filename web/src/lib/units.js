// Birim dönüşümleri (spec §3.1).
//
// Tüm hesaplar dahili olarak SI ile yapılır; bu modül yalnızca arayüzdeki
// birimi SI'ye ve SI'yi gösterim birimine çevirir. Ara değerlerde yuvarlama
// yapılmaz — buradaki fonksiyonlar sadece çarpar/böler.

// --- Temel sabitler ---
export const INCH_M = 0.0254 // 1 inch = 25.4 mm
export const MIL_M = 2.54e-5 // 1 mil = 0.001 inch
export const C0 = 299792458 // ışık hızı, m/s
export const EPS0 = 8.8541878128e-12 // F/m
export const MU0 = 1.25663706212e-6 // H/m
export const ETA0 = 376.730313668 // serbest uzay dalga empedansı, Ω
export const K_B = 1.380649e-23 // Boltzmann sabiti, J/K — ADC sampling capacitor
// termal gürültüsü (kT/C) için. Tanım gereği tam değerdir, ölçülmüş bir sabit değil.

// Bakır
export const RHO_CU_20 = 1.724e-8 // Ω·m @ 20 °C
export const ALPHA_CU = 0.00393 // 1/°C
export const K_CU = 385 // W/(m·K) — spec §5.2: 385–400 aralığının alt ucu
// Aynı aralığın üst ucu. Literatür bakır için 385–400 W/(m·K) veriyor ve iki
// uç arasındaki fark termal dirençte doğrudan görünür (%3.9). Varsayılan alt
// uç (konservatif) kalır; ekran hangi ucun kullanıldığını seçtirir ve sonuçta
// yazar. Sabit araç dosyasına gömülmez, tek kaynak burasıdır.
export const K_CU_HIGH = 400 // W/(m·K)
export const K_CU_RANGE = [K_CU, K_CU_HIGH]
export const DENSITY_CU = 8960 // kg/m³

// FR-4 (tipik; üreticiye göre değişir)
export const K_FR4 = 0.3 // W/(m·K)

// --- Çarpan tabloları: birim → SI ---
// Kullanım: value_SI = value * FACTOR[unit]

export const LENGTH = { m: 1, cm: 1e-2, mm: 1e-3, um: 1e-6, µm: 1e-6, mil: MIL_M, inch: INCH_M }
export const AREA = { 'm²': 1, 'cm²': 1e-4, 'mm²': 1e-6, 'µm²': 1e-12, 'mil²': MIL_M * MIL_M }
export const CURRENT = { A: 1, mA: 1e-3, µA: 1e-6, kA: 1e3 }
export const VOLTAGE = { V: 1, mV: 1e-3, µV: 1e-6, kV: 1e3 }
export const RESISTANCE = { Ω: 1, mΩ: 1e-3, µΩ: 1e-6, kΩ: 1e3, MΩ: 1e6 }
export const CAPACITANCE = { F: 1, mF: 1e-3, µF: 1e-6, nF: 1e-9, pF: 1e-12 }
export const CHARGE = { C: 1, mC: 1e-3, µC: 1e-6, nC: 1e-9, pC: 1e-12 } // MOSFET gate charge (Q_g, Q_gd)
export const INDUCTANCE = { H: 1, mH: 1e-3, µH: 1e-6, nH: 1e-9, pH: 1e-12 }
export const FREQUENCY = { Hz: 1, kHz: 1e3, MHz: 1e6, GHz: 1e9 }
export const TIME = { s: 1, ms: 1e-3, µs: 1e-6, ns: 1e-9, ps: 1e-12 }
export const POWER = { W: 1, mW: 1e-3, µW: 1e-6, kW: 1e3 }
export const ENERGY = { J: 1, mJ: 1e-3, µJ: 1e-6, nJ: 1e-9 } // MOSFET E_oss (datasheet)
export const THERMAL_R = { '°C/W': 1, 'K/W': 1 }

// Tabloya göre SI'ye çevirir. Bilinmeyen birim NaN döner — sessizce 1 kabul
// edilmez, çünkü bu sessiz bir birim hatası olurdu.
export function toSI(value, unit, table) {
  const f = table[unit]
  return f === undefined ? NaN : value * f
}

export function fromSI(valueSI, unit, table) {
  const f = table[unit]
  return f === undefined ? NaN : valueSI / f
}

// --- Bakır ağırlığı ↔ kalınlık (spec §4.1.2) ---
//
// Yoğunluktan türetilen kalınlık: bir ons bakır bir square foot'a yayılırsa
//   m_A = 0.0283495 kg / 0.092903 m² ≈ 0.30515 kg/m²
//   t   = m_A / 8960 ≈ 34.06 µm
// Endüstri nominal tabloları 1 oz için genellikle ~35 µm verir. Fark; nominal
// folyo tanımları, yuvarlama ve üretim sürecinden gelir. İkisi de sunulur —
// hangisinin kullanıldığı ekranda belirtilmelidir.

const OZ_KG = 0.0283495231
const FT2_M2 = 0.09290304

// Bakır ağırlığından (oz/ft²) yoğunluk üzerinden kalınlık (m)
export function copperThicknessFromWeight(oz) {
  const mA = (oz * OZ_KG) / FT2_M2 // kg/m²
  return mA / DENSITY_CU
}

// Nominal endüstri tablosu (spec §4.1.2). µm cinsinden.
export const OZ_NOMINAL_UM = {
  0.5: 17.5,
  1: 35,
  1.5: 52.5,
  2: 70,
  3: 105,
  4: 140,
}

// --- Sıcaklığa bağlı bakır özdirenci ---
export function rhoCuAt(T_C) {
  return RHO_CU_20 * (1 + ALPHA_CU * (T_C - 20))
}

// --- Uzunluk kısayolları (sık kullanıldığı için) ---
export const mmToM = (x) => x * 1e-3
export const mToMm = (x) => x * 1e3
export const milToMm = (x) => x * 0.0254
export const mmToMil = (x) => x / 0.0254
export const umToM = (x) => x * 1e-6
export const mToUm = (x) => x * 1e6
