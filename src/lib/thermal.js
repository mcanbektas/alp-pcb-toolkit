// Termal hesaplar — junction sıcaklığı, soğutucu ve bakır termal ağı
// (spec §8.3 – §8.6).
//
// Girişler SI: W, °C, °C/W, m, m².
//
// Sıcaklık birimi °C olarak tutulur; tüm bağıntılar sıcaklık FARKI üzerinden
// çalıştığı için Kelvin'e çevirmek sonucu değiştirmez (spec §8.3 – §8.5 da
// °C ile yazılmıştır). Termal direnç için °C/W ve K/W aynı büyüklüktür.

import { K_CU, K_FR4 } from './units'

export const THERMAL_ERR_INVALID = 'invalid'
export const THERMAL_ERR_NEGATIVE_SINK = 'negative-sink'

// --- §8.3 Junction sıcaklığı ---
//
// T_J = T_A + P·θ_JA
// P_max = (T_J,max − T_A) / θ_JA
//
// Referans (spec §13 Test 4): T_A = 40 °C, P = 2 W, θ_JA = 30 °C/W → T_J = 100 °C.
//
// UYARI (spec §8.3): θ_JA paketin değişmez fiziksel özelliği DEĞİLDİR. Test
// PCB'si, bakır alanı, hava akışı ve montaj şartlarından etkilenir. Sonuç bunu
// alan olarak taşır ki arayüz gizlemesin.
export function junctionTemperature({ Ta, P, thetaJA, TjMax = null }) {
  if (!(P >= 0) || !(thetaJA > 0) || !Number.isFinite(Ta)) {
    return { error: THERMAL_ERR_INVALID }
  }

  const rise = P * thetaJA
  const Tj = Ta + rise

  const out = {
    Tj, Ta, P, thetaJA, rise,
    // θ_JA montaj ve ortam bağımlıdır; katalog değeri test kartına aittir
    thetaIsBoardDependent: true,
  }

  if (Number.isFinite(TjMax)) {
    out.TjMax = TjMax
    out.margin = TjMax - Tj
    out.within = Tj <= TjMax
    // Verilen θ_JA ile çekilebilecek en yüksek güç
    out.Pmax = (TjMax - Ta) / thetaJA
    out.utilisation = out.Pmax > 0 ? P / out.Pmax : Infinity
  }

  return out
}

// --- §8.4 Soğutucu ---
//
// T_J = T_A + P·(θ_JC + θ_CS + θ_SA)
// Gerekli maksimum soğutucu direnci:
//   θ_SA,max = (T_J,max − T_A)/P − θ_JC − θ_CS
//
// Sonuç negatifse hiçbir soğutucu yetmez: güç azaltılmalı, hava akışı
// artırılmalı veya farklı paket seçilmelidir (spec §8.4).
export function heatsink({ Ta, P, thetaJC, thetaCS, TjMax, thetaSA = null }) {
  if (!(P > 0) || !(thetaJC >= 0) || !(thetaCS >= 0) || !Number.isFinite(Ta) || !Number.isFinite(TjMax)) {
    return { error: THERMAL_ERR_INVALID }
  }
  if (!(TjMax > Ta)) {
    return { error: THERMAL_ERR_INVALID }
  }

  const budget = (TjMax - Ta) / P
  const thetaSAmax = budget - thetaJC - thetaCS

  const out = {
    thetaSAmax,
    budget,
    Ta, P, thetaJC, thetaCS, TjMax,
    // Paket + arayüz tek başına bütçeyi yiyorsa soğutucu seçimi çözmez
    feasible: thetaSAmax > 0,
  }

  if (!(thetaSAmax > 0)) {
    out.error = THERMAL_ERR_NEGATIVE_SINK
    return out
  }

  if (thetaSA >= 0) {
    const thetaTotal = thetaJC + thetaCS + thetaSA
    out.thetaSA = thetaSA
    out.thetaTotal = thetaTotal
    out.Tj = Ta + P * thetaTotal
    out.margin = TjMax - out.Tj
    out.within = out.Tj <= TjMax
    // Yolun hangi parçasının baskın olduğu — iyileştirme buradan seçilir
    out.shares = {
      jc: thetaJC / thetaTotal,
      cs: thetaCS / thetaTotal,
      sa: thetaSA / thetaTotal,
    }
  }

  return out
}

// --- §8.5 Ölçülen yüzey sıcaklığından junction tahmini ---
//
// T_J ≈ T_top   + Ψ_JT·P     (paket üstünden ölçüm)
// T_J ≈ T_board + Ψ_JB·P     (kart üzerinden ölçüm)
//
// Ψ ve θ AYNI ŞEY DEĞİLDİR (spec §8.5). θ_JC tek boyutlu bir yol direncidir;
// Ψ_JT ise paketten dışarı kaçan ısının yalnızca bir kısmını gören ampirik bir
// metriktir. Paket üstü ölçümde θ_JC DOĞRUDAN KULLANILMAZ. Sonuç bu ayrımı
// `metric` alanıyla taşır; arayüz açıklamak zorundadır.
export const PSI_JT = 'psi-jt'
export const PSI_JB = 'psi-jb'

export function junctionFromSurface({ Tsurface, P, psi, metric = PSI_JT }) {
  if (!(P >= 0) || !(psi >= 0) || !Number.isFinite(Tsurface)) {
    return { error: THERMAL_ERR_INVALID }
  }
  if (metric !== PSI_JT && metric !== PSI_JB) {
    return { error: THERMAL_ERR_INVALID }
  }

  const rise = psi * P
  return {
    Tj: Tsurface + rise,
    Tsurface, P, psi, metric, rise,
    // Ψ bir yol direnci değildir; θ ile değiştirilemez
    isPathResistance: false,
  }
}

// --- §8.6 PCB bakır termal ağı ---
//
// Bakır şerit boyunca iletim:  R_θ = L / (k_Cu · W · t)
// FR-4 üzerinden dikey iletim: R_θ = H / (k_FR4 · A)
// Paralel yollar:              R_θ,eq = [ Σ 1/R_θ,i ]⁻¹
// Sıcaklık artışı:             ΔT = P · R_θ,eq
//
// Bu hesap YALNIZCA iletim yolunu modeller. Konveksiyon, radyasyon, karmaşık
// ısı yayılımı, paket iç yapısı, yakındaki sıcak komponentler ve bakır
// poligonun iki boyutlu spreading etkisi YOKTUR (spec §8.6). Sonuç bu yüzden
// "ilk derece termal ağ tahmini" olarak sunulur — `firstOrder: true`.
//
// Modelde bulunmayan mekanizmalar KOD olarak bildirilir; kodu okunabilir bir ada
// çeviren taraf ekranın text.js dosyasıdır. Sabitler dışa aktarılır ki tüketici
// dizeyi elle yazmasın.
export const EXCLUDE_CONVECTION = 'convection'
export const EXCLUDE_RADIATION = 'radiation'
export const EXCLUDE_SPREADING = 'spreading'
export const EXCLUDE_PACKAGE_INTERNALS = 'package-internals'
export const EXCLUDE_NEIGHBOURING_SOURCES = 'neighbouring-sources'

export const THERMAL_EXCLUDES = [
  EXCLUDE_CONVECTION,
  EXCLUDE_RADIATION,
  EXCLUDE_SPREADING,
  EXCLUDE_PACKAGE_INTERNALS,
  EXCLUDE_NEIGHBOURING_SOURCES,
]

export function copperStripResistance({ L, W, t }) {
  if (!(L > 0) || !(W > 0) || !(t > 0)) {
    return { error: THERMAL_ERR_INVALID }
  }
  return {
    Rth: L / (K_CU * W * t),
    L, W, t,
    k: K_CU,
    path: 'copper-strip',
  }
}

export function dielectricResistance({ H, area, k = K_FR4 }) {
  if (!(H > 0) || !(area > 0) || !(k > 0)) {
    return { error: THERMAL_ERR_INVALID }
  }
  return {
    Rth: H / (k * area),
    H, area, k,
    path: 'dielectric',
  }
}

// Paralel ısı yolları — elektriksel paralel dirençle aynı bağıntı
export function parallelThermalPaths(resistances) {
  if (!Array.isArray(resistances) || resistances.length === 0) {
    return { error: THERMAL_ERR_INVALID }
  }
  if (resistances.some((r) => !(r > 0))) {
    return { error: THERMAL_ERR_INVALID }
  }

  const conductance = resistances.reduce((a, r) => a + 1 / r, 0)
  const Rth = 1 / conductance

  return {
    Rth,
    conductance,
    paths: resistances.length,
    // Hangi yolun ne kadar ısı taşıdığı — iletkenlik payı
    shares: resistances.map((r) => 1 / r / conductance),
  }
}

export function temperatureRise({ P, Rth }) {
  if (!(P >= 0) || !(Rth > 0)) {
    return { error: THERMAL_ERR_INVALID }
  }
  return {
    deltaT: P * Rth,
    P, Rth,
    // İletim dışı hiçbir mekanizma yok (spec §8.6)
    firstOrder: true,
    // Kopya döner; çağıran listeyi değiştirse motorun sabiti bozulmasın
    excludes: [...THERMAL_EXCLUDES],
  }
}
