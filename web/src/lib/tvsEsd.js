// TVS ve ESD Koruma Boyutlandırıcısı (REV2 §14).
//
// Merkezî problem clamp voltajının akıma bağlı olmasıdır: gerçek pulse akımını
// bulmak için Thevenin surge modeli (§14.4) ile lineer dynamic resistance
// clamp modelini (§14.5) birlikte çözen bir residual denklemi kurulur:
//
//   F(I) = I − (V_surge − V_clamp(I)) / (R_source + R_series)
//   V_clamp(I) = V_BR + R_dyn·(I − I_T)
//
// Öncelik her zaman analitiktir: model tamamen lineerse (kullanıcı özel bir
// clamp fonksiyonu/tablosu vermediyse) kapalı form kullanılır. Kullanıcı
// doğrusal olmayan bir clamp tablosu/fonksiyonu verirse, ya da lineer modelin
// kapalı formu sonlu değilse (bkz. solveTvsPulseCurrent içindeki not),
// I_min=0 sabit alt sınırlı, üst sınırı en fazla 16 kez ikiye katlayarak
// genişleyen özel bir bisection'a düşülür (§14.5.2/§14.5.3).
//
// solve.js'teki brent/bisection/expandBracket/solveBounded BİLEREK
// kullanılmadı — burada kendi local çözücümüz var, gerekçesi:
//   1) expandBracket tek bir x0 tohumundan hem aşağı hem yukarı simetrik
//      genişler ve x0 > min şartını dayatır (x0 === min iken INVALID döner).
//      Burada ise alt sınır HER ZAMAN tam olarak 0'da sabit kalmalı (asla
//      kaymaz) ve yalnızca üst sınır ikişer katlanarak büyür — I_max
//      başlangıcı 0 çıkabildiği (V_surge ≤ V_BR) için x0>min şartı bu
//      durumda kırılırdı.
//   2) bisection()'ın tek yakınsama ölçütü aralık yarı genişliğidir
//      ((hi−lo)/2 ≤ tol). §14.5.3 ise ÇİFT ölçüt istiyor: mutlak residual
//      (|F(I)|<1e−9 A) VEYA ardışık iki tahmin arasındaki BAĞIL adım
//      (|I_n−I_{n−1}|/max(1,|I_n|)<1e−6). Bu, aralık genişliğinden ayrı bir
//      büyüklük; solve.js'in imzası bu ikinci ölçütü ifade edemiyor.
// Newton–Raphson tek başına kullanılmadı (CLAUDE.md kuralı): kök arama daima
// [0, hi] ile sınırlandırılmış, fiziksel olmayan negatif sonuç üretemeyen bir
// yöntemle yapılır.

export const TVS_ERR_INVALID = 'invalid'
export const TVS_ERR_NO_CONVERGENCE = 'tvs-solver-no-convergence'

export const TVS_WAVEFORM_RECTANGULAR = 'rectangular'
export const TVS_WAVEFORM_TRIANGULAR = 'triangular'
export const TVS_WAVEFORM_CUSTOM = 'custom'

const MAX_EXPANSIONS = 16
const MAX_ITERATIONS = 100
const ABS_TOL = 1e-9
const REL_TOL = 1e-6

// Datasheet'in iki noktasından (V_C, I_PP) ve (V_BR, I_T) dynamic resistance
// (REV2 §14.5, ilk formül). I_PP > I_T şartı yoksa (sıfır/negatif payda)
// tanımsız kabul edilir.
export function dynamicResistance({ vC, vBR, iPP, iT }) {
  if (!Number.isFinite(vC) || !Number.isFinite(vBR) || !Number.isFinite(iPP) || !Number.isFinite(iT)) return NaN
  const dI = iPP - iT
  if (!(dI > 0)) return NaN
  return (vC - vBR) / dI
}

// Lineer dynamic resistance clamp modeli: V_clamp(I) = V_BR + R_dyn·(I − I_T).
export function clampVoltageLinear({ vBR, rDyn, iT, current }) {
  if (!Number.isFinite(vBR) || !Number.isFinite(rDyn) || !Number.isFinite(iT) || !Number.isFinite(current)) {
    return NaN
  }
  return vBR + rDyn * (current - iT)
}

// Kullanıcı tanımlı doğrusal olmayan clamp tablosundan (I, V) çiftleriyle
// parçalı doğrusal interpolasyon üreten fabrika. Tablo akıma göre herhangi bir
// sırada verilebilir, fonksiyon önce I'ya göre sıralar. En az iki nokta
// gerekir. Tablo aralığının dışındaki akımlar en yakın uç segmentin eğimiyle
// dışa doğru uzatılır — ani bir düz çizgiye düşüp yanlış bir kök
// bulunmasındansa, en azından tabloyla tutarlı bir eğilim korunur.
export function clampVoltageFromTable(table) {
  const pts = [...table].sort((a, b) => a.i - b.i)
  return function clampVoltage(current) {
    if (!Number.isFinite(current) || pts.length < 2) return NaN
    const first = pts[0]
    const last = pts[pts.length - 1]
    if (current <= first.i) {
      const next = pts[1]
      const slope = (next.v - first.v) / (next.i - first.i)
      return first.v + slope * (current - first.i)
    }
    if (current >= last.i) {
      const prev = pts[pts.length - 2]
      const slope = (last.v - prev.v) / (last.i - prev.i)
      return last.v + slope * (current - last.i)
    }
    for (let k = 0; k < pts.length - 1; k++) {
      const a = pts[k]
      const b = pts[k + 1]
      if (current >= a.i && current <= b.i) {
        const slope = (b.v - a.v) / (b.i - a.i)
        return a.v + slope * (current - a.i)
      }
    }
    return NaN
  }
}

// F(I) = I − (V_surge − V_clamp(I)) / (R_source + R_series). Clamp
// fonksiyonu sonlu olmayan bir değer üretirse (NaN/Infinity) sonuç da NaN
// olur — çağıran bunu "residual NaN/Infinity üretti" hatası olarak okur.
function residualAt(current, vSurge, rTotal, clampFn) {
  const vClamp = clampFn(current)
  if (!Number.isFinite(vClamp)) return NaN
  const value = current - (vSurge - vClamp) / rTotal
  return Number.isFinite(value) ? value : NaN
}

// Sınırlandırılmış bisection (§14.5.2/§14.5.3). I_min=0 SABİT; F(0) ≥ 0 ise
// fiziksel kök zaten I≤0 bölgesindedir ve I=0'a sınırlandırılır (analitik
// yoldaki "sonuç negatifse I=0" kuralının sayısal yoldaki karşılığı — I_min=0
// zaten sabit alt sınır olduğu için bu bir sapma değil, aynı kuralın doğal
// uzantısıdır). F(0) < 0 ise üst sınır I_max'tan başlayarak kök
// kapsanmıyorsa en fazla 16 kez ikiye katlanır.
function solveTvsPulseCurrentBisection({ vSurge, rTotal, vBR, clampFn }) {
  const fLo0 = residualAt(0, vSurge, rTotal, clampFn)
  if (!Number.isFinite(fLo0)) return { error: TVS_ERR_NO_CONVERGENCE }
  if (fLo0 === 0) return { current: 0, method: 'bisection', iterations: 0, expansions: 0, clamped: false }
  if (fLo0 > 0) {
    return { current: 0, method: 'bisection', iterations: 0, expansions: 0, clamped: true }
  }

  let hi = Math.max(0, (vSurge - vBR) / rTotal)
  let fHi = residualAt(hi, vSurge, rTotal, clampFn)
  if (!Number.isFinite(fHi)) return { error: TVS_ERR_NO_CONVERGENCE }

  let expansions = 0
  while (fHi < 0 && expansions < MAX_EXPANSIONS) {
    hi = hi > 0 ? hi * 2 : 1e-12
    fHi = residualAt(hi, vSurge, rTotal, clampFn)
    if (!Number.isFinite(fHi)) return { error: TVS_ERR_NO_CONVERGENCE }
    expansions += 1
  }
  if (fHi < 0) return { error: TVS_ERR_NO_CONVERGENCE, expansions }
  if (fHi === 0) return { current: hi, method: 'bisection', iterations: 0, expansions, clamped: false }

  let lo = 0
  let prevMid = hi
  for (let iter = 1; iter <= MAX_ITERATIONS; iter++) {
    const mid = (lo + hi) / 2
    const fMid = residualAt(mid, vSurge, rTotal, clampFn)
    if (!Number.isFinite(fMid)) return { error: TVS_ERR_NO_CONVERGENCE }

    const absOk = Math.abs(fMid) < ABS_TOL
    const relOk = Math.abs(mid - prevMid) / Math.max(1, Math.abs(mid)) < REL_TOL
    if (absOk || relOk) {
      return { current: mid, method: 'bisection', iterations: iter, expansions, clamped: false }
    }

    if (fMid < 0) {
      lo = mid
    } else {
      hi = mid
    }
    prevMid = mid
  }

  return { error: TVS_ERR_NO_CONVERGENCE, expansions }
}

/**
 * TVS clamp çözücü (REV2 §14.4/§14.5, kararlar §3.2). Kaynak sınırlı pulse
 * akımını bulur.
 *
 * `clampVoltage` verilmezse model `vBR + rDyn·(I − iT)` lineer clamp'iyle
 * kurulur ve ÖNCELİKLE analitik kapalı form denenir:
 *
 *   I = (V_surge − V_BR + R_dyn·I_T) / (R_source + R_series + R_dyn)
 *
 * Payda (R_source+R_series+R_dyn) pozitif ve sonuç sonluysa bu değer
 * kullanılır (negatifse 0'a sınırlandırılır). Payda ≤ 0 ise (örn. çok
 * negatif R_dyn — foldback benzeri bir eğri) kapalı form tanımsız/monoton
 * olmayabileceğinden, aynı lineer clamp fonksiyonuyla sayısal yola düşülür.
 *
 * `clampVoltage` bir fonksiyon olarak verilirse (örn. `clampVoltageFromTable`
 * çıktısı) model doğrusal olmayan kabul edilir ve doğrudan sayısal yol
 * kullanılır — `rDyn`/`iT` bu durumda okunmaz.
 */
export function solveTvsPulseCurrent({
  vSurge, rSource, rSeries = 0,
  vBR, rDyn = 0, iT = 0,
  clampVoltage = null,
}) {
  if (!Number.isFinite(vSurge)) return { error: TVS_ERR_INVALID }
  if (!(rSource >= 0) || !(rSeries >= 0)) return { error: TVS_ERR_INVALID }
  const rTotal = rSource + rSeries
  if (!(rTotal > 0)) return { error: TVS_ERR_INVALID }
  if (!Number.isFinite(vBR)) return { error: TVS_ERR_INVALID }

  const nonlinear = typeof clampVoltage === 'function'

  if (!nonlinear) {
    if (!Number.isFinite(rDyn) || !Number.isFinite(iT)) return { error: TVS_ERR_INVALID }
    const denom = rTotal + rDyn
    if (denom > 0) {
      const analytic = (vSurge - vBR + rDyn * iT) / denom
      if (Number.isFinite(analytic)) {
        const current = analytic < 0 ? 0 : analytic
        return { current, method: 'analytic', clamped: analytic < 0 }
      }
    }
    // denom ≤ 0 ya da sonuç sonlu değil: TAM AYNI lineer modeli (aynı
    // vBR/rDyn/iT) sayısal yolla çöz — bkz. yukarıdaki JSDoc notu.
  }

  const clampFn = nonlinear ? clampVoltage : (current) => clampVoltageLinear({ vBR, rDyn, iT, current })
  return solveTvsPulseCurrentBisection({ vSurge, rTotal, vBR, clampFn })
}

// Peak pulse power (REV2 §14.6): P_peak = V_clamp · I_PP.
export function peakPulsePower({ vClamp, iPP }) {
  if (!(vClamp >= 0) || !(iPP >= 0)) return NaN
  return vClamp * iPP
}

// Pulse energy (REV2 §14.6). Dalga şekli verilmemişse dikdörtgen (en
// muhafazakâr, en büyük enerji) varsayılır; kullanıcı tanımlı katsayı
// (`waveform: 'custom'`) için `kw` zorunludur.
export function pulseEnergy({ vClamp, iPP, tp, waveform = TVS_WAVEFORM_RECTANGULAR, kw = null }) {
  if (!(vClamp > 0) || !(iPP > 0) || !(tp > 0)) return NaN
  if (waveform === TVS_WAVEFORM_TRIANGULAR) return 0.5 * vClamp * iPP * tp
  if (waveform === TVS_WAVEFORM_CUSTOM) {
    if (!(kw > 0)) return NaN
    return kw * vClamp * iPP * tp
  }
  return vClamp * iPP * tp
}

// PCB bağlantı endüktansının ürettiği ek overshoot (REV2 §14.7): V_L = L_path·di/dt.
export function pathInductanceOvershoot({ lPath, didt }) {
  if (!Number.isFinite(lPath) || !(lPath >= 0) || !Number.isFinite(didt)) return NaN
  return lPath * didt
}

// IC üzerinde görülebilecek yaklaşık peak (REV2 §14.7): V_IC,peak ≈ V_clamp + V_L.
export function icPeakVoltage({ vClamp, vL }) {
  if (!Number.isFinite(vClamp) || !Number.isFinite(vL)) return NaN
  return vClamp + vL
}

// TVS junction capacitance + source impedance yaklaşık kutup (REV2 §14.8):
// f_-3dB ≈ 1 / (2π·R_source·C_TVS).
export function capacitanceCutoffFrequency({ rSource, cTvs }) {
  if (!(rSource > 0) || !(cTvs > 0)) return NaN
  return 1 / (2 * Math.PI * rSource * cTvs)
}

/**
 * Bütün TVS/ESD değerlendirmesi: clamp çözücü + güç/enerji/overshoot/
 * capacitance kutbu. Gerilimler volt, dirençler ohm, akımlar amper, süreler
 * saniye, endüktans henry, capacitance farad, di/dt A/s.
 *
 * Opsiyonel bloklar (enerji, overshoot, capacitance kutbu) ilgili girdiler
 * verilmezse `null` döner — uydurma varsayılan kurulmaz (Adım 2 kararı).
 */
export function tvsEsdProtectionPlan({
  vSurge, rSource, rSeries = 0,
  vBR, rDyn = 0, iT = 0,
  clampVoltage = null,
  tp = null, waveform = TVS_WAVEFORM_RECTANGULAR, kw = null,
  lPath = null, didt = null,
  cTvs = null,
}) {
  const solved = solveTvsPulseCurrent({ vSurge, rSource, rSeries, vBR, rDyn, iT, clampVoltage })
  if (solved.error) return { error: solved.error }

  const clampFn = typeof clampVoltage === 'function'
    ? clampVoltage
    : (current) => clampVoltageLinear({ vBR, rDyn, iT, current })
  const vClamp = clampFn(solved.current)

  const overshoot = (lPath !== null && didt !== null)
    ? (() => {
      const vL = pathInductanceOvershoot({ lPath, didt })
      return { vL, icPeak: icPeakVoltage({ vClamp, vL }) }
    })()
    : null

  return {
    ok: true,
    solver: solved,
    vClamp,
    peakPower: peakPulsePower({ vClamp, iPP: solved.current }),
    energy: tp !== null ? pulseEnergy({ vClamp, iPP: solved.current, tp, waveform, kw }) : null,
    overshoot,
    capacitanceCutoffHz: cTvs !== null ? capacitanceCutoffFrequency({ rSource, cTvs }) : null,
  }
}
