// 2B elektrostatik alan çözücüsü — spec §6.2 ve §6.3. F1 kapsamı: tek uçlu
// microstrip (gerçek bakır kalınlığı dahil) ve simetrik/asimetrik stripline.
//
// Yöntem kararları docs/alan-cozucu-karari.md'dedir ve burada yeniden
// tartışılmaz: tarayıcıda saf JS; düzgün-olmayan (kademeli) dikdörtgen
// ızgarada 5 noktalı FDM (kutu entegrasyonu); enerji → kapasite rotası
//   C' = 2U'/V²,  εeff = C'/C'₀,  Z₀ = 1/(c·√(C'·C'₀))
// ve iki ızgara yoğunluğuyla yakınsama raporu (E_Z, spec §6.3).
//
// Malzeme sınırları (iletken kenarları, dielektrik katman geçişleri) ızgara
// çizgilerine BİRE BİR oturtulur; kutu entegrasyonunda her akı yüzeyi tek
// malzemenin içinden geçer ve yüzeye paralel yarım hücreler alan ağırlıklı
// toplanır. Karardaki "arayüzde harmonik ortalama" bir bağın iki malzemeyi
// kesmesi durumu içindir; sınırlar çizgiye oturduğu için bu durum kurulumda
// hiç oluşmaz (bkz. karar dosyası).
//
// Saf ve senkron: React, DOM, tarayıcı API'si ve kullanıcı metni bilmez.
// Hata durumunda { error: <kod> } döner, cümle döndürmez. Uzun hesabı ana iş
// parçacığından çıkaran Web Worker sarmalayıcısı hooks/useFieldSolver.js'tedir.
//
// Girişler SI: metre, Ω, s. Kapasiteler F/m.

import { C0, EPS0 } from './units'
import { METHOD_FIELD_SOLVER } from './impedance'

export const FS_ERR_INVALID = 'invalid'
export const FS_ERR_NO_CONVERGENCE = 'fs-no-convergence'
export const FS_ERR_GRID = 'fs-grid-too-large'

// §6.3 yakınsama eşikleri: E_Z < 0.2 yüksek, 0.2–1 kabul edilebilir,
// ≥ 1 mesh yetersiz → sonuç warn durumuyla gösterilir, sessizce basılmaz.
export const FS_CONVERGENCE_GOOD_PCT = 0.2
export const FS_CONVERGENCE_WARN_PCT = 1

// Varsayılan ızgara yoğunluğu: en küçük geometrik özellik başına düşen
// hücre sayısı (kaba ızgara). İnce ızgara bunun 1.5 katıdır.
export const FS_DENSITY_DEFAULT = 6

// Duvar mesafesi: en yakın ilgili boyutun katı (karar #7, "≥ 5"). Duyarlılık
// testi bu çarpanı 2×'e çıkarıp Z₀ oynamasının eşiğin altında kaldığını
// doğrular. Stripline'da alan duvara doğru üstel söner ve 5 katı bol bol
// yeter; AÇIK microstrip'te ise alan ~1/r² ile söner ve 5 kat, Z₀'ı ölçülür
// biçimde aşağı çeker (ölçüldü: u=0.5'te ~%1 — karar dosyası). Bu yüzden
// microstrip varsayılanı 15'tir; kademeli ızgarada ek maliyeti küçüktür.
export const FS_WALL_FACTOR_DEFAULT = 5
export const FS_WALL_FACTOR_OPEN = 15

const NODE_CAP = 150000 // emniyet: bu düğüm sayısının üstünde kurulmaz

// İletken kenarındaki alan tekilliği (E ~ r^(-1/2)) yakınsamayı sınırlar;
// kenar çizgilerinde hücre boyu hFine/EDGE_ZOOM'a kadar indirilir. Kademeli
// ızgara sayesinde maliyeti logaritmiktir. Ölçümü karar dosyasında.
const EDGE_ZOOM = 8

// Komşu hücre boyu oranı. SABİT oran yakınsamayı platoya sokar: kenardan r
// uzaklıktaki hücre ~(grow−1)·r boyundadır ve yoğunluktan bağımsız kalır —
// tekillik çevresindeki göreli çözünürlük yoğunlukla hiç artmaz (ölçüldü,
// bkz. karar dosyası). Bu yüzden oran yoğunluğa bağlanır: annulus başına
// göreli hata ~(grow−1)² → O(1/d²) düşer, çizgi sayısı ~d ile büyür.
const GROW_SLOPE = 1.2
const growFor = (d) => 1 + GROW_SLOPE / d

// --- Kademeli ızgara üretimi ---
//
// Bir eksen, kritik çizgilerle (malzeme/iletken sınırları + kutu duvarları)
// aralıklara bölünür. Her kritik çizginin kendi hedef hücre boyu vardır;
// aralık iki ucundan o boylarla başlar ve GROW oranıyla ortaya doğru
// kabalaşarak doldurulur.

function gradedSegment(a, b, ha, hb, hMax, grow) {
  const L = b - a
  const left = []
  const right = []
  let xa = 0
  let xb = 0
  let sa = Math.min(ha, hMax)
  let sb = Math.min(hb, hMax)

  while (xa + sa + xb + sb < L) {
    if (sa <= sb) {
      xa += sa
      left.push(xa)
      sa = Math.min(sa * grow, hMax)
    } else {
      xb += sb
      right.push(xb)
      sb = Math.min(sb * grow, hMax)
    }
  }

  // Ortada kalan boşluk, komşu adımlara yakın boyla eş aralıklı bölünür
  const gap = L - xa - xb
  const n = Math.max(1, Math.round(gap / Math.min(Math.max(sa, sb), hMax)))

  const out = []
  for (const p of left) out.push(a + p)
  for (let k = 1; k < n; k++) out.push(a + xa + (gap * k) / n)
  for (let i = right.length - 1; i >= 0; i--) out.push(b - right[i])
  return out
}

// marks: [{ pos, h }] — pos kritik koordinat, h o çizgideki hedef hücre boyu.
// Çakışan çizgiler birleşir; küçük olan h kazanır.
function buildAxis(marks, hMax, grow) {
  const sorted = [...marks].sort((p, q) => p.pos - q.pos)
  const span = sorted[sorted.length - 1].pos - sorted[0].pos
  const tol = span * 1e-9

  const merged = []
  for (const m of sorted) {
    const last = merged[merged.length - 1]
    if (last && Math.abs(m.pos - last.pos) <= tol) last.h = Math.min(last.h, m.h)
    else merged.push({ pos: m.pos, h: m.h })
  }

  const pts = [merged[0].pos]
  for (let s = 0; s + 1 < merged.length; s++) {
    const A = merged[s]
    const B = merged[s + 1]
    pts.push(...gradedSegment(A.pos, B.pos, A.h, B.h, hMax, grow), B.pos)
  }
  return pts
}

// --- FDM kurulumu ve doğrusal çözüm ---
//
// Düğümler ızgara çizgisi kesişimlerinde, dielektrik hücre bazında sabittir.
// Düğüm (i,j) çevresindeki dört hücreyle kutu entegrasyonu:
//   aE = (ε_SE·Δy_S + ε_NE·Δy_N) / (2·Δx_E)   (diğer yönler simetrik)
// Alan dışı hücre ε = 0 sayılır; bu, o yüzeyden akı geçmemesi (doğal
// Neumann sınırı) demektir. Topraklı kutu duvarları Dirichlet(0) olarak
// sabitlenir; paralel plaka çapası yan duvarları Neumann bırakır.

function cellIndex(nx) {
  return (i, j) => j * (nx - 1) + i
}

// Doğrusal sistem çözücüsü. Karar #6 "SOR ile başla, ölç" dedi; ölçüldü ve
// SOR ELENDİ: kademeli ızgaranın aşırı hücre oranları (kenarda ~1 µm, dışta
// ~1 mm) sistemi kötü koşullar ve SOR binlerce süpürme ister (t=35 µm
// microstrip: ~12 000 yineleme, ~2.3 s — karar dosyasındaki ölçüm). Yerine
// Jacobi ön-koşullu eşlenik gradyan (PCG): aynı stencil, saf JS, yineleme
// sayısı ~√κ ile ölçeklenir. Sistem simetrik pozitif tanımlı (kutu
// entegrasyonu bakışımlı katsayı verir), CG'nin şartı sağlanır.
//
// Sabit düğümler arama uzayının dışındadır: p yön vektörü sabitlerde hep 0
// kalır, pot içindeki sabit değerler artığa (r) sağ taraf olarak girer.
function solveGrid({ xs, ys, eps, fixed, pot, tol, maxIterFactor = 30 }) {
  const nx = xs.length
  const ny = ys.length
  const N = nx * ny
  const cix = cellIndex(nx)
  const cEps = (i, j) => (i < 0 || j < 0 || i >= nx - 1 || j >= ny - 1 ? 0 : eps[cix(i, j)])

  const aE = new Float64Array(N)
  const aW = new Float64Array(N)
  const aN = new Float64Array(N)
  const aS = new Float64Array(N)
  const diag = new Float64Array(N)

  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const idx = j * nx + i
      if (fixed[idx]) continue
      const dxW = i > 0 ? xs[i] - xs[i - 1] : 0
      const dxE = i < nx - 1 ? xs[i + 1] - xs[i] : 0
      const dyS = j > 0 ? ys[j] - ys[j - 1] : 0
      const dyN = j < ny - 1 ? ys[j + 1] - ys[j] : 0

      const eSW = cEps(i - 1, j - 1)
      const eSE = cEps(i, j - 1)
      const eNW = cEps(i - 1, j)
      const eNE = cEps(i, j)

      const e = dxE > 0 ? (eSE * dyS + eNE * dyN) / (2 * dxE) : 0
      const w = dxW > 0 ? (eSW * dyS + eNW * dyN) / (2 * dxW) : 0
      const n = dyN > 0 ? (eNW * dxW + eNE * dxE) / (2 * dyN) : 0
      const s = dyS > 0 ? (eSW * dxW + eSE * dxE) / (2 * dyS) : 0

      const d = e + w + n + s
      if (d === 0) {
        // Bütün komşu hücreleri alan dışı kalan yalıtık düğüm (Neumann köşesi):
        // denklemi yok, potansiyeli sonucu etkilemez — sabitlenir.
        fixed[idx] = 1
        continue
      }
      aE[idx] = e
      aW[idx] = w
      aN[idx] = n
      aS[idx] = s
      diag[idx] = d
    }
  }

  // Serbest düğüm listesi — bütün PCG döngüleri yalnız bunların üstünde koşar
  let nFree = 0
  const free = new Int32Array(N)
  for (let idx = 0; idx < N; idx++) if (!fixed[idx]) free[nFree++] = idx
  if (nFree === 0) return { iterations: 0 }

  const r = new Float64Array(N)
  const p = new Float64Array(N) // sabit düğümlerde daima 0
  const Ap = new Float64Array(N)

  // r = b − A·pot (sabit komşu değerleri pot içinden okunur)
  const residual = () => {
    for (let k = 0; k < nFree; k++) {
      const idx = free[k]
      r[idx] =
        aE[idx] * pot[idx + 1] + aW[idx] * pot[idx - 1] +
        aN[idx] * pot[idx + nx] + aS[idx] * pot[idx - nx] -
        diag[idx] * pot[idx]
    }
  }
  residual()

  // Durdurma ölçütü SOR'unkiyle aynı anlamda: ön-koşullu artığın (Jacobi
  // adım büyüklüğünün) en büyüğü tol altına insin
  const converged = () => {
    let m = 0
    for (let k = 0; k < nFree; k++) {
      const idx = free[k]
      const v = Math.abs(r[idx] / diag[idx])
      if (v > m) m = v
    }
    return m < tol
  }

  let rz = 0
  for (let k = 0; k < nFree; k++) {
    const idx = free[k]
    const z = r[idx] / diag[idx]
    p[idx] = z
    rz += r[idx] * z
  }

  const maxIter = Math.max(200, maxIterFactor * Math.max(nx, ny))
  for (let iter = 0; iter < maxIter; iter++) {
    // Yakınsama kontrolü de bir tam geçiştir; her yinelemede değil,
    // dörtte bir sıklıkta yapılır (maliyet ölçümüyle seçildi)
    if (iter % 4 === 0 && converged()) return { iterations: iter }

    let pAp = 0
    for (let k = 0; k < nFree; k++) {
      const idx = free[k]
      const v =
        diag[idx] * p[idx] -
        aE[idx] * p[idx + 1] - aW[idx] * p[idx - 1] -
        aN[idx] * p[idx + nx] - aS[idx] * p[idx - nx]
      Ap[idx] = v
      pAp += p[idx] * v
    }
    if (!(pAp > 0)) break // sayısal bozulma — aşağıda hata

    const alpha = rz / pAp
    for (let k = 0; k < nFree; k++) {
      const idx = free[k]
      pot[idx] += alpha * p[idx]
      r[idx] -= alpha * Ap[idx]
    }

    let rzNew = 0
    for (let k = 0; k < nFree; k++) {
      const idx = free[k]
      rzNew += (r[idx] * r[idx]) / diag[idx]
    }
    const beta = rzNew / rz
    rz = rzNew
    for (let k = 0; k < nFree; k++) {
      const idx = free[k]
      p[idx] = r[idx] / diag[idx] + beta * p[idx]
    }

    // Biriken yuvarlama hatasına karşı artık ara sıra baştan hesaplanır
    if ((iter + 1) % 50 === 0) residual()
  }
  return converged() ? { iterations: maxIter } : { error: FS_ERR_NO_CONVERGENCE }
}

// C'/ε₀ — bağ enerjisi toplamı. Ayrıklaştırmayla BİRE BİR aynı katsayılar
// kullanılır (ΣgΔV², V = 1 V): enerji, çözülen sistemin kendi ikinci dereceden
// formudur; ayrık çözümle tutarlıdır ve ayrıca gradyan kurmak gerekmez.
function linkEnergySum(xs, ys, eps, pot) {
  const nx = xs.length
  const ny = ys.length
  const cix = cellIndex(nx)
  const cEps = (i, j) => (i < 0 || j < 0 || i >= nx - 1 || j >= ny - 1 ? 0 : eps[cix(i, j)])

  let sum = 0
  // x yönlü bağlar
  for (let j = 0; j < ny; j++) {
    const dyS = j > 0 ? ys[j] - ys[j - 1] : 0
    const dyN = j < ny - 1 ? ys[j + 1] - ys[j] : 0
    const row = j * nx
    for (let i = 0; i < nx - 1; i++) {
      const g = (cEps(i, j - 1) * dyS + cEps(i, j) * dyN) / (2 * (xs[i + 1] - xs[i]))
      const dv = pot[row + i + 1] - pot[row + i]
      sum += g * dv * dv
    }
  }
  // y yönlü bağlar
  for (let j = 0; j < ny - 1; j++) {
    const dy = ys[j + 1] - ys[j]
    const row = j * nx
    for (let i = 0; i < nx; i++) {
      const dxW = i > 0 ? xs[i] - xs[i - 1] : 0
      const dxE = i < nx - 1 ? xs[i + 1] - xs[i] : 0
      const g = (cEps(i - 1, j) * dxW + cEps(i, j) * dxE) / (2 * dy)
      const dv = pot[row + nx + i] - pot[row + i]
      sum += g * dv * dv
    }
  }
  return sum
}

// Kaba ızgara çözümünü ince ızgaraya bilinear aktarır (yalnız serbest
// düğümlere; sabitler kendi değerinde kalır). SOR yinelemesinin en yavaş
// bileşeni düşük frekanslı hatadır; kaba çözüm onu baştan giderir ve ince
// ızgara yineleme sayısı büyük ölçüde düşer (ölçümü karar dosyasında).
function mapAxis(fine, coarse) {
  const idx = new Int32Array(fine.length)
  const frac = new Float64Array(fine.length)
  let k = 0
  for (let i = 0; i < fine.length; i++) {
    const x = fine[i]
    while (k < coarse.length - 2 && coarse[k + 1] < x) k++
    idx[i] = k
    const d = coarse[k + 1] - coarse[k]
    frac[i] = d > 0 ? Math.min(1, Math.max(0, (x - coarse[k]) / d)) : 0
  }
  return { idx, frac }
}

function seedFromCoarse(seed, xs, ys, pot, fixed) {
  const nx = xs.length
  const ny = ys.length
  const cnx = seed.xs.length
  const mx = mapAxis(xs, seed.xs)
  const my = mapAxis(ys, seed.ys)
  for (let j = 0; j < ny; j++) {
    const j0 = my.idx[j]
    const fy = my.frac[j]
    for (let i = 0; i < nx; i++) {
      const idx = j * nx + i
      if (fixed[idx]) continue
      const i0 = mx.idx[i]
      const fx = mx.frac[i]
      const p00 = seed.pot[j0 * cnx + i0]
      const p10 = seed.pot[j0 * cnx + i0 + 1]
      const p01 = seed.pot[(j0 + 1) * cnx + i0]
      const p11 = seed.pot[(j0 + 1) * cnx + i0 + 1]
      pot[idx] = (1 - fy) * ((1 - fx) * p00 + fx * p10) + fy * ((1 - fx) * p01 + fx * p11)
    }
  }
}

// --- Tek ızgarada tam analiz: dielektrikli + vakum çözümü ---
//
// spec: {
//   xMarks, yMarks: [{ pos, h }]
//   hMax: en büyük hücre boyu
//   epsAt(xc, yc): hücre merkezinin bağıl geçirgenliği
//   conductors: [{ x1, x2, y1, y2, V }] — dikdörtgen; y1 === y2 sıfır
//     kalınlıklı iletken çizgisidir
//   box: { left, right, top, bottom } — true → Dirichlet(0) duvar
//   tol: SOR durdurma eşiği (V ölçeği 1)
// }
function analyzeGrid(spec) {
  const xs = buildAxis(spec.xMarks, spec.hMax, spec.grow)
  const ys = buildAxis(spec.yMarks, spec.hMax, spec.grow)
  const nx = xs.length
  const ny = ys.length
  if (nx < 4 || ny < 4) return { error: FS_ERR_INVALID }
  if (nx * ny > NODE_CAP) return { error: FS_ERR_GRID }

  const spanTolX = (xs[nx - 1] - xs[0]) * 1e-9
  const spanTolY = (ys[ny - 1] - ys[0]) * 1e-9

  // Hücre geçirgenlikleri (bağıl; ε₀ en sonda çarpılır)
  const eps = new Float64Array((nx - 1) * (ny - 1))
  const cix = cellIndex(nx)
  for (let j = 0; j < ny - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      eps[cix(i, j)] = spec.epsAt((xs[i] + xs[i + 1]) / 2, (ys[j] + ys[j + 1]) / 2)
    }
  }

  // Sabit düğümler: kutu duvarları + iletkenler
  const fixed = new Uint8Array(nx * ny)
  const pot = new Float64Array(nx * ny)
  const box = spec.box
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const wall =
        (i === 0 && box.left) || (i === nx - 1 && box.right) ||
        (j === 0 && box.bottom) || (j === ny - 1 && box.top)
      if (wall) fixed[j * nx + i] = 1 // V = 0
    }
  }
  for (const c of spec.conductors) {
    for (let j = 0; j < ny; j++) {
      if (ys[j] < c.y1 - spanTolY || ys[j] > c.y2 + spanTolY) continue
      for (let i = 0; i < nx; i++) {
        if (xs[i] < c.x1 - spanTolX || xs[i] > c.x2 + spanTolX) continue
        const idx = j * nx + i
        fixed[idx] = 1
        pot[idx] = c.V
      }
    }
  }

  // Dielektrikli çözüm; varsa kaba ızgara çözümü tohum olur
  if (spec.seed) seedFromCoarse(spec.seed.diel, xs, ys, pot, fixed)
  const r1 = solveGrid({ xs, ys, eps, fixed, pot, tol: spec.tol })
  if (r1.error) return r1
  const Cd = EPS0 * linkEnergySum(xs, ys, eps, pot)
  const potD = pot.slice()

  // Vakum çözümü: aynı geometri, ε = 1. Tohum: kaba vakum çözümü, yoksa
  // aynı ızgaranın dielektrikli çözümü — sınır koşulları aynı, çözüm yakın.
  if (spec.seed) seedFromCoarse(spec.seed.vac, xs, ys, pot, fixed)
  const epsV = new Float64Array((nx - 1) * (ny - 1)).fill(1)
  const r2 = solveGrid({ xs, ys, eps: epsV, fixed, pot, tol: spec.tol })
  if (r2.error) return r2
  const Cv = EPS0 * linkEnergySum(xs, ys, epsV, pot)

  if (!(Cd > 0) || !(Cv > 0)) return { error: FS_ERR_INVALID }

  return {
    C: Cd,
    Cvac: Cv,
    Z0: 1 / (C0 * Math.sqrt(Cd * Cv)),
    epsEff: Cd / Cv,
    nx, ny,
    iterations: r1.iterations + r2.iterations,
    grids: { xs, ys, potD, potV: pot },
  }
}

// --- İki yoğunluklu koşum ve ortak sonuç zarfı ---
//
// Her sonuç iki ızgara yoğunluğuyla üretilir (karar #8, spec §6.3 sözleşme).
// Kullanıcıya giden sayı İNCE ızgaradan; E_Z yapısal alanda taşınır, eşik
// yorumu ekranındır (dilsiz kural).
const CG_TOL = 1e-7

function solveTwoDensities(buildSpec, density, extra) {
  const dCoarse = Math.max(2, Math.round(density))
  const dFine = Math.max(dCoarse + 2, Math.round(dCoarse * 1.5))

  const coarse = analyzeGrid(buildSpec(dCoarse))
  if (coarse.error) return coarse
  const fineSpec = buildSpec(dFine)
  fineSpec.seed = {
    diel: { xs: coarse.grids.xs, ys: coarse.grids.ys, pot: coarse.grids.potD },
    vac: { xs: coarse.grids.xs, ys: coarse.grids.ys, pot: coarse.grids.potV },
  }
  const fine = analyzeGrid(fineSpec)
  if (fine.error) return fine

  const coarsePct = (100 * Math.abs(fine.Z0 - coarse.Z0)) / fine.Z0

  return {
    Z0: fine.Z0,
    epsEff: fine.epsEff,
    method: METHOD_FIELD_SOLVER,
    model: 'fdm-sor-energy',
    C: fine.C,
    Cvac: fine.Cvac,
    tpd: Math.sqrt(fine.epsEff) / C0, // s/m
    convergence: { coarsePct },
    mesh: {
      coarse: { nx: coarse.nx, ny: coarse.ny, iterations: coarse.iterations, Z0: coarse.Z0 },
      fine: { nx: fine.nx, ny: fine.ny, iterations: fine.iterations },
    },
    ...extra,
  }
}

// --- Yapılar ---

/**
 * Yüzey microstrip — alt referans düzlemi, dielektrik, üstte hava.
 * Bakır kalınlığı GERÇEK geometri olarak çözülür (kapalı formun t
 * düzeltmesi değil): hat, [H, H+t] arasında dikdörtgen iletkendir.
 *
 * @param {number} W  hat genişliği (m)
 * @param {number} H  dielektrik yüksekliği (m)
 * @param {number} t  bakır kalınlığı (m); 0 → sıfır kalınlıklı iletken çizgisi
 * @param {number} epsR
 */
export function fieldMicrostrip({
  W, H, t = 0, epsR,
  density = FS_DENSITY_DEFAULT,
  wallFactor = FS_WALL_FACTOR_OPEN,
}) {
  if (!(W > 0) || !(H > 0) || !(t >= 0) || !(epsR >= 1)) {
    return { error: FS_ERR_INVALID }
  }

  const margin = wallFactor * Math.max(H + t, W)
  const halfX = W / 2 + margin
  const top = H + t + margin
  const minFeature = Math.min(W, H, t > 0 ? t : Infinity)

  const buildSpec = (d) => {
    const hFine = minFeature / d
    const hEdge = hFine / EDGE_ZOOM // iletken kenarı/köşesi: tekillik
    // En büyük hücre saçak alanının uzunluk ölçeğiyle sınırlıdır: alan hat
    // kenarından ~H ölçeğinde söner; duvar kenarında bile hücre bundan
    // büyükse sönüm bölgesi kaba örneklenir ve hata yoğunluktan bağımsız
    // bir platoya takılır (ölçümü karar dosyasında).
    const hWall = margin / 3
    const yMarks = [
      { pos: 0, h: H / d }, // referans düzlem: alan düzgün, ölçek H
      { pos: H, h: hEdge },
      { pos: top, h: hWall },
    ]
    if (t > 0) yMarks.push({ pos: H + t, h: hEdge })
    return {
      xMarks: [
        { pos: -halfX, h: hWall },
        { pos: -W / 2, h: hEdge },
        { pos: W / 2, h: hEdge },
        { pos: halfX, h: hWall },
      ],
      yMarks,
      hMax: margin / 3,
      epsAt: (xc, yc) => (yc < H ? epsR : 1),
      conductors: [{ x1: -W / 2, x2: W / 2, y1: H, y2: H + t, V: 1 }],
      // Alt duvar referans düzlemin kendisidir; kutu topraklıdır (karar #7)
      box: { left: true, right: true, top: true, bottom: true },
      grow: growFor(d),
      tol: CG_TOL,
    }
  }

  return solveTwoDensities(buildSpec, density, {
    structure: 'microstrip',
    thicknessIncluded: t > 0,
  })
}

/**
 * Stripline — iki referans düzlemi arasında hat. h1 verilmezse hat tam
 * ortadadır (simetrik); verilirse alt düzlem ile hat alt yüzü arasındaki
 * mesafedir (asimetrik).
 *
 * @param {number} W  hat genişliği (m)
 * @param {number} b  düzlemler arası mesafe (m)
 * @param {number} t  bakır kalınlığı (m)
 * @param {number} epsR
 * @param {number} [h1]  alt düzlem → hat alt yüzü (m)
 */
export function fieldStripline({
  W, b, t = 0, epsR, h1 = null,
  density = FS_DENSITY_DEFAULT,
  wallFactor = FS_WALL_FACTOR_DEFAULT,
}) {
  if (!(W > 0) || !(b > 0) || !(t >= 0) || !(epsR >= 1)) {
    return { error: FS_ERR_INVALID }
  }
  const hBottom = h1 == null ? (b - t) / 2 : h1
  const hTop = b - hBottom - t
  // Hat düzleme değerse yapı kısa devredir — hata, tahmin değil
  if (!(hBottom > 0) || !(hTop > 0)) return { error: FS_ERR_INVALID }

  const margin = wallFactor * Math.max(W, b)
  const halfX = W / 2 + margin
  const minFeature = Math.min(W, hBottom, hTop, t > 0 ? t : Infinity)

  const buildSpec = (d) => {
    const hFine = minFeature / d
    const hEdge = hFine / EDGE_ZOOM // iletken kenarı/köşesi: tekillik
    const hWall = margin / 3
    const yMarks = [
      { pos: 0, h: hBottom / d }, // referans düzlemler: alan düzgün
      { pos: hBottom, h: hEdge },
      { pos: b, h: hTop / d },
    ]
    if (t > 0) yMarks.push({ pos: hBottom + t, h: hEdge })
    return {
      xMarks: [
        { pos: -halfX, h: hWall },
        { pos: -W / 2, h: hEdge },
        { pos: W / 2, h: hEdge },
        { pos: halfX, h: hWall },
      ],
      yMarks,
      hMax: margin / 3,
      epsAt: () => epsR, // homojen dielektrik
      conductors: [{ x1: -W / 2, x2: W / 2, y1: hBottom, y2: hBottom + t, V: 1 }],
      box: { left: true, right: true, top: true, bottom: true },
      grow: growFor(d),
      tol: CG_TOL,
    }
  }

  return solveTwoDensities(buildSpec, density, {
    structure: 'stripline',
    thicknessIncluded: t > 0,
    symmetric: h1 == null || Math.abs(hBottom - hTop) <= b * 1e-9,
  })
}

/**
 * Paralel plaka — doğrulama rejiminin 1. analitik çapası (test amaçlı).
 * Yan duvarlar Neumann bırakılır: saçak alanı bastırılır, alan tekdüzedir ve
 * ayrık çözüm C = ε·W/d değerini ızgaradan bağımsız, makine hassasiyetine
 * yakın vermelidir. Çözücünün aritmetiğini tek başına sınar.
 */
export function parallelPlateCapacitance({ W, d, epsR = 1, density = 8 }) {
  if (!(W > 0) || !(d > 0) || !(epsR >= 1)) return { error: FS_ERR_INVALID }

  const h = Math.min(W, d) / density
  const spec = {
    xMarks: [{ pos: 0, h }, { pos: W, h }],
    yMarks: [{ pos: 0, h }, { pos: d, h }],
    hMax: Math.max(W, d) / 4,
    epsAt: () => epsR,
    conductors: [
      { x1: 0, x2: W, y1: 0, y2: 0, V: 0 },
      { x1: 0, x2: W, y1: d, y2: d, V: 1 },
    ],
    box: { left: false, right: false, top: false, bottom: false }, // yanlar Neumann
    grow: 1.4,
    tol: CG_TOL,
  }
  const r = analyzeGrid(spec)
  if (r.error) return r
  return { C: r.C, Cvac: r.Cvac, epsEff: r.epsEff, nx: r.nx, ny: r.ny }
}
