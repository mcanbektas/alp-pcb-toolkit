// Kompleks sayı dönüşümleri — dikdörtgensel ↔ polar (spec §11.6).
//
//   Dikdörtgensel:  Z = R + jX
//   Büyüklük:       |Z| = √(R² + X²)
//   Faz:            φ = tan⁻¹(X / R)
//   Polar biçim:    Z = |Z| ∠ φ
//   Ters dönüşüm:   R = |Z|·cos φ ,  X = |Z|·sin φ
//
// Empedans bağlamında R gerçel bileşen, X reaktanstır: X > 0 endüktif,
// X < 0 kapasitif, X = 0 saf dirençlidir.
//
// Saf modül: React, DOM ve kullanıcıya görünen metin bilmez. Hata durumunda
// kod döner; kodu Türkçeye çeviren tek yer ekranın text.js dosyasıdır.

export const COMPLEX_ERR_INVALID = 'invalid'
export const COMPLEX_ERR_UNDEFINED_PHASE = 'undefined-phase'
export const COMPLEX_ERR_NEGATIVE_MAGNITUDE = 'negative-magnitude'

export const KIND_INDUCTIVE = 'inductive'
export const KIND_CAPACITIVE = 'capacitive'
export const KIND_RESISTIVE = 'resistive'

const isNum = (x) => Number.isFinite(x)

// Bir bileşen, büyüklüğe göre bu orandan küçükse sayısal artıktır: cos(π/2)
// tam sıfır değil 6.1e-17 döner ve saf reaktans "endüktif + çok küçük direnç"
// gibi sınıflandırılırdı. Eşik YALNIZCA sınıflandırmada kullanılır; döndürülen
// sayısal değerler asla kırpılmaz veya yuvarlanmaz.
const NEGLIGIBLE = 1e-12

export const degToRad = (deg) => (deg * Math.PI) / 180
export const radToDeg = (rad) => (rad * 180) / Math.PI

// |Z| = √(R² + X²). Math.hypot ara karelerde taşma/alt taşma üretmez;
// sonuç matematiksel olarak karekök ifadesiyle aynıdır.
export function magnitudeOf(R, X) {
  return isNum(R) && isNum(X) ? Math.hypot(R, X) : NaN
}

// φ = tan⁻¹(X / R) — hesapta DAİMA Math.atan2(X, R) kullanılır.
// Math.atan(X / R) yalnızca (−90°, +90°) aralığını döndürebildiği için R < 0
// olan ikinci ve üçüncü çeyrekte açıyı 180° yanlış verir: R = −3, X = 4 için
// gerçek açı 126.87° iken atan(−1.333) = −53.13° çıkar; R = −3, X = −4 için
// gerçek açı −126.87° iken atan(1.333) = +53.13° çıkar. Ayrıca R = 0'da
// sıfıra bölme üretir. atan2 iki bileşenin işaretini ayrı ayrı gördüğü için
// doğru çeyreği seçer ve R = 0 durumunu da doğru çözer.
export function phaseOf(R, X) {
  return isNum(R) && isNum(X) ? Math.atan2(X, R) : NaN
}

// Sınıflandırma için sayısal artığı sıfıra çeker (döndürülen değeri değil).
function snap(v, mag) {
  return Math.abs(v) <= NEGLIGIBLE * mag ? 0 : v
}

// X > 0 endüktif, X < 0 kapasitif, X = 0 saf dirençli.
export function reactanceKind(X, mag = Math.abs(X)) {
  if (!isNum(X) || !isNum(mag)) return null
  const x = snap(X, mag)
  if (x > 0) return KIND_INDUCTIVE
  if (x < 0) return KIND_CAPACITIVE
  return KIND_RESISTIVE
}

// Kompleks düzlemde çeyrek: 1..4. Bileşenlerden biri sıfırsa (eksen üzeri) 0.
export function quadrantOf(R, X, mag = Math.hypot(R, X)) {
  if (!isNum(R) || !isNum(X) || !isNum(mag)) return 0
  const r = snap(R, mag)
  const x = snap(X, mag)
  if (r > 0 && x > 0) return 1
  if (r < 0 && x > 0) return 2
  if (r < 0 && x < 0) return 3
  if (r > 0 && x < 0) return 4
  return 0
}

/**
 * Dikdörtgensel → polar.  Z = R + jX  →  |Z| ∠ φ
 * @returns {{ R, X, magnitude, phase, phaseDeg, phasePrincipal, phasePrincipalDeg, kind, quadrant }
 *           | { error }}
 */
export function rectToPolar({ R, X }) {
  if (!isNum(R) || !isNum(X)) {
    return { error: COMPLEX_ERR_INVALID }
  }

  const mag = Math.hypot(R, X)

  // R = 0 ve X = 0 iken vektörün yönü yoktur. Math.atan2(0, 0) sıfır döndürür
  // ama bu bir açı değil, dilin varsayılan değeridir; faz tanımsız sayılır.
  if (mag === 0) {
    return { error: COMPLEX_ERR_UNDEFINED_PHASE }
  }

  const phase = phaseOf(R, X)

  return {
    R,
    X,
    magnitude: mag,
    phase,
    phaseDeg: radToDeg(phase),
    // atan2 zaten ana değeri döndürür; alanlar iki dönüşümde aynı isimde olsun diye tekrarlanır
    phasePrincipal: phase,
    phasePrincipalDeg: radToDeg(phase),
    kind: reactanceKind(X, mag),
    quadrant: quadrantOf(R, X, mag),
  }
}

/**
 * Polar → dikdörtgensel.  |Z| ∠ φ  →  R + jX   (φ radyan cinsinden verilir)
 * @returns {{ R, X, magnitude, phase, phaseDeg, phasePrincipal, phasePrincipalDeg, kind, quadrant }
 *           | { error }}
 */
export function polarToRect({ magnitude, phase }) {
  if (!isNum(magnitude) || !isNum(phase)) {
    return { error: COMPLEX_ERR_INVALID }
  }
  if (magnitude < 0) {
    return { error: COMPLEX_ERR_NEGATIVE_MAGNITUDE }
  }
  // |Z| = 0 iken R = X = 0 çıkar; bu nokta da yön taşımaz, fazı tanımsızdır.
  if (magnitude === 0) {
    return { error: COMPLEX_ERR_UNDEFINED_PHASE }
  }

  const R = magnitude * Math.cos(phase)
  const X = magnitude * Math.sin(phase)

  // Girilen açı (−180°, +180°] dışındaysa eşdeğer ana değeri atan2 verir:
  // 270° girişi −90° olarak da okunabilir, iki gösterim aynı vektördür.
  const principal = Math.atan2(X, R)

  return {
    R,
    X,
    magnitude,
    phase,
    phaseDeg: radToDeg(phase),
    phasePrincipal: principal,
    phasePrincipalDeg: radToDeg(principal),
    kind: reactanceKind(X, magnitude),
    quadrant: quadrantOf(R, X, magnitude),
  }
}
