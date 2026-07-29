// Sınırlandırılmış kök arama.
//
// Ters hesaplarda Newton–Raphson tek başına kullanılmaz: başlangıç noktasına
// bağlı olarak negatif genişlik, negatif aralık gibi fiziksel olmayan sonuçlara
// yakınsayabilir (spec §3.3). Buradaki iki yöntem de aramayı [a, b] aralığına
// hapseder, dolayısıyla sonuç her zaman fiziksel olarak geçerli sınırlar içinde
// kalır.

export const SOLVE_ERR_NO_BRACKET = 'no-bracket'
export const SOLVE_ERR_NO_CONVERGE = 'no-converge'
export const SOLVE_ERR_INVALID = 'invalid'

const DEFAULTS = { tol: 1e-12, maxIter: 200 }

// Nesne yayılımı, değeri undefined olan anahtarı da taşır ve varsayılanı ezer.
// Çağıran { tol: undefined } geçtiğinde varsayılan korunmalı.
function options(opts) {
  return {
    tol: opts.tol ?? DEFAULTS.tol,
    maxIter: opts.maxIter ?? DEFAULTS.maxIter,
  }
}

// F(a) ve F(b) zıt işaretli mi? Kök aralığa hapsedilmiş demektir.
function brackets(fa, fb) {
  return Number.isFinite(fa) && Number.isFinite(fb) && fa * fb <= 0
}

// Aralık geçerli mi? a === b'ye izin verilir: expandBracket, F(x0) tam sıfır
// olduğunda kökü daha ilk adımda yakalamış olur ve [x0, x0] döner. Bu bozuk bir
// aralık değil, yakınsamış bir köktür. Sıfır olup olmadığını brackets() karara
// bağlar — F(a) sıfır değilse dejenere aralıkta kök yoktur ve NO_BRACKET döner,
// asla uydurma bir değer dönmez.
function invalidRange(a, b) {
  return !Number.isFinite(a) || !Number.isFinite(b) || a > b
}

// Brent yöntemi: ters kuadratik interpolasyon + güvenlik için bisection'a düşme.
// Bisection'ın garantili yakınsamasını korur, çoğu durumda ondan çok daha hızlıdır.
// Döner: { value, iterations, method } veya { error }
export function brent(F, a, b, opts = {}) {
  const { tol, maxIter } = options(opts)
  if (invalidRange(a, b)) return { error: SOLVE_ERR_INVALID }

  let fa = F(a)
  let fb = F(b)
  if (!brackets(fa, fb)) return { error: SOLVE_ERR_NO_BRACKET }

  // Kök tam sınırdaysa erken dön. Dejenere aralık (a === b) da buraya düşer:
  // brackets() ancak F(a) tam sıfırken doğru olduğu için sonuç kökün kendisidir.
  if (fa === 0) return { value: a, iterations: 0, method: 'brent' }
  if (fb === 0) return { value: b, iterations: 0, method: 'brent' }

  // b her zaman şu ana kadarki en iyi tahmin olsun (|fb| <= |fa|)
  if (Math.abs(fa) < Math.abs(fb)) {
    ;[a, b] = [b, a]
    ;[fa, fb] = [fb, fa]
  }

  let c = a
  let fc = fa
  let d = b - a
  let e = d

  for (let i = 1; i <= maxIter; i++) {
    // c, b'den farklı işarette kalmalı
    if (fb * fc > 0) {
      c = a
      fc = fa
      d = b - a
      e = d
    }
    if (Math.abs(fc) < Math.abs(fb)) {
      a = b; b = c; c = a
      fa = fb; fb = fc; fc = fa
    }

    const delta = 2 * Number.EPSILON * Math.abs(b) + tol / 2
    const m = (c - b) / 2
    if (Math.abs(m) <= delta || fb === 0) {
      return { value: b, iterations: i, method: 'brent' }
    }

    if (Math.abs(e) < delta || Math.abs(fa) <= Math.abs(fb)) {
      // İnterpolasyon güvenilmez → bisection
      d = m
      e = m
    } else {
      const s = fb / fa
      let p
      let q
      if (a === c) {
        // Sekant
        p = 2 * m * s
        q = 1 - s
      } else {
        // Ters kuadratik interpolasyon
        const r = fb / fc
        const t = fa / fc
        p = s * (2 * m * t * (t - r) - (b - a) * (r - 1))
        q = (t - 1) * (r - 1) * (s - 1)
      }
      if (p > 0) q = -q
      p = Math.abs(p)

      if (2 * p < Math.min(3 * m * q - Math.abs(delta * q), Math.abs(e * q))) {
        e = d
        d = p / q
      } else {
        d = m
        e = m
      }
    }

    a = b
    fa = fb
    b += Math.abs(d) > delta ? d : (m > 0 ? delta : -delta)
    fb = F(b)
    if (!Number.isFinite(fb)) return { error: SOLVE_ERR_INVALID }
  }

  return { error: SOLVE_ERR_NO_CONVERGE }
}

// Bisection: en yavaş ama en dayanıklı yöntem. F sürekli değilse veya
// gürültülüyse Brent'in interpolasyonu tökezleyebilir; bu her zaman yakınsar.
export function bisection(F, a, b, opts = {}) {
  const { tol, maxIter } = options(opts)
  if (invalidRange(a, b)) return { error: SOLVE_ERR_INVALID }

  let lo = a
  let hi = b
  let flo = F(lo)
  const fhi = F(hi)
  if (!brackets(flo, fhi)) return { error: SOLVE_ERR_NO_BRACKET }

  // Kök tam sınırdaysa erken dön. Bu şart: aşağıdaki daraltma `flo * fmid < 0`
  // ile karar veriyor ve F(lo) sıfırken bu çarpım hiçbir zaman negatif olmadığı
  // için alt sınır sürekli yukarı kayar — kök elde varken sessizce kaybedilir.
  // Dejenere aralık (a === b) da buraya düşer; brackets() ancak F(a) tam
  // sıfırken doğru olduğundan sonuç kökün kendisidir.
  if (flo === 0) return { value: lo, iterations: 0, method: 'bisection' }
  if (fhi === 0) return { value: hi, iterations: 0, method: 'bisection' }

  for (let i = 1; i <= maxIter; i++) {
    const mid = (lo + hi) / 2
    const fmid = F(mid)
    if (!Number.isFinite(fmid)) return { error: SOLVE_ERR_INVALID }
    if (fmid === 0 || (hi - lo) / 2 <= tol) {
      return { value: mid, iterations: i, method: 'bisection' }
    }
    if (flo * fmid < 0) {
      hi = mid
    } else {
      lo = mid
      flo = fmid
    }
  }

  return { error: SOLVE_ERR_NO_CONVERGE }
}

// Kökü içeren bir aralık aramak için: x0'dan başlayıp aralığı geometrik olarak
// genişletir. Aramanın fiziksel sınırları [min, max] ile kapatılır — bu sınırların
// dışına asla çıkılmaz, dolayısıyla negatif genişlik gibi sonuçlar üretilemez.
export function expandBracket(F, x0, { factor = 1.6, maxIter = 60, min = 0, max = Infinity } = {}) {
  if (!Number.isFinite(x0) || x0 <= min || x0 >= max) return { error: SOLVE_ERR_INVALID }

  let lo = x0
  let hi = x0
  let flo = F(lo)
  let fhi = flo
  if (!Number.isFinite(flo)) return { error: SOLVE_ERR_INVALID }

  for (let i = 0; i < maxIter; i++) {
    // İlk turda lo === hi === x0'dır; brackets() burada ancak F(x0) tam sıfırken
    // doğru olur. O hâlde dönen [x0, x0] "genişletilemedi" değil, "kök zaten
    // elde" demektir; brent/bisection bu dejenere aralığı kök olarak kabul eder.
    if (brackets(flo, fhi)) return { a: lo, b: hi }

    // Sınıra dayanmadıkça iki yöne de aç
    const nextLo = Math.max(min + (x0 - min) * 1e-9, lo / factor)
    const nextHi = Math.min(max, hi * factor)
    if (nextLo === lo && nextHi === hi) break

    if (nextLo !== lo) {
      lo = nextLo
      flo = F(lo)
      if (!Number.isFinite(flo)) return { error: SOLVE_ERR_INVALID }
      if (brackets(flo, fhi)) return { a: lo, b: hi }
    }
    if (nextHi !== hi) {
      hi = nextHi
      fhi = F(hi)
      if (!Number.isFinite(fhi)) return { error: SOLVE_ERR_INVALID }
    }
  }

  return { error: SOLVE_ERR_NO_BRACKET }
}

// Yaygın kullanım: F(x) = Y(x) − Y_hedef kökünü fiziksel sınırlar içinde çöz.
// Aralık verilmezse x0 çevresinde aranır. Brent tökezlerse bisection'a düşer.
export function solveBounded(F, { x0, a, b, min = 0, max = Infinity, tol, maxIter } = {}) {
  let lo = a
  let hi = b
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
    const br = expandBracket(F, x0, { min, max })
    if (br.error) return { error: br.error }
    lo = br.a
    hi = br.b
  }

  const r = brent(F, lo, hi, { tol, maxIter })
  if (!r.error) return r
  if (r.error === SOLVE_ERR_NO_BRACKET) return r
  return bisection(F, lo, hi, { tol, maxIter })
}
