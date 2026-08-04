// Rezonans ve antirezonans tespiti — prominence tabanlı.
//
// Tepe/çukur araması DOĞRUSAL empedans üzerinde değil dB gösteriminde yapılır.
// Doğrusal eksende 1 Ω → 1.2 Ω sıçraması ile 100 mΩ → 120 mΩ sıçraması aynı
// fiziksel belirginliğe sahiptir ama mutlak farkları 100 kat ayrışır; eşik
// koymak imkânsız hâle gelir. dB farkı ikisinde de aynıdır.
//
// Üç noktalı ham karşılaştırma yetmez: sık örneklenmiş sweep'te tek bir sayısal
// dalgalanma "rezonans" olarak listeye girer. Bu yüzden her aday, komşu ters
// tipteki uç noktaya göre prominence değeriyle ölçülür ve eşiğin altında
// kalanlar DOĞRULANMIŞ listeye alınmaz.

export const PEAKS_ERR_NONPOSITIVE = 'log-axis-nonpositive'
export const PEAKS_ERR_THRESHOLD = 'prominence-threshold-invalid'
export const PEAKS_ERR_LENGTH = 'series-length-invalid'

export const PROMINENCE_DEFAULT_DB = 3
export const PROMINENCE_MIN_DB = 0.5
export const PROMINENCE_MAX_DB = 20

// Aynı fiziksel tepenin birden fazla örnek noktasına yayılması (plato), değerlerin
// TAM eşitliğiyle saptanır. Bağıl bir tolerans kullanmak, dokümanda karşılığı
// olmayan gizli bir parametre eklemek olurdu; gerekirse açık bir seçenek olarak
// eklenir. Tam eşitlikte plato üzerindeki maksimum ile minimum aynı değerdir,
// dolayısıyla "plato empedansı" tanımında belirsizlik kalmaz.
function plateauRuns(db) {
  const runs = []
  let start = 0
  for (let i = 1; i <= db.length; i++) {
    if (i === db.length || db[i] !== db[start]) {
      runs.push({ start, end: i - 1 })
      start = i
    }
  }
  return runs
}

// Bir aday için karşı tipteki en yakın komşuları bulup prominence hesaplar.
//
// Doküman "en yakın DOĞRULANMIŞ lokal minimum" diyor; doğrulama ise prominence'a
// bağlı — tanım kendi kendine dayanıyor. Çözüm, adayların indeks sırasında
// zorunlu olarak tip değiştirmesinden gelir: iki tepe arasında mutlaka bir çukur
// vardır. Bu yüzden referans olarak indeks sırasındaki en yakın ters tipli ADAY
// kullanılır; sonuç deterministiktir ve eşikten bağımsızdır.
function prominenceOf(candidates, i) {
  const self = candidates[i]
  const opposite = self.kind === 'peak' ? 'valley' : 'peak'

  let left = null
  for (let k = i - 1; k >= 0; k--) {
    if (candidates[k].kind === opposite) { left = candidates[k]; break }
  }
  let right = null
  for (let k = i + 1; k < candidates.length; k++) {
    if (candidates[k].kind === opposite) { right = candidates[k]; break }
  }

  // Hiçbir yanda karşı tipte uç yoksa prominence ÖLÇÜLEMEZ. Uydurulmuş bir
  // referans (sweep ucu, sıfır) koymak, ölçülmemiş bir belirginliği ölçülmüş
  // gibi sunardı. null döner ve aday doğrulanmış listeye girmez; grafikte
  // gösterilmesi çağırana kalır.
  if (!left && !right) return null

  const refs = [left, right].filter(Boolean).map((c) => c.db)
  return self.kind === 'peak'
    ? self.db - Math.max(...refs)
    : Math.min(...refs) - self.db
}

// freqs ve magnitudes aynı uzunlukta, magnitudes doğrusal büyüklük (|Z|).
//
// Döner: { peaks, valleys, candidates, threshold } veya { error }
//   peaks / valleys : eşiği geçen, doğrulanmış uç noktalar
//   candidates      : eşikten bağımsız bütün adaylar (grafik işaretlemesi için)
export function findResonances(freqs, magnitudes, opts = {}) {
  const threshold = opts.threshold ?? PROMINENCE_DEFAULT_DB
  if (!Number.isFinite(threshold) || threshold < PROMINENCE_MIN_DB || threshold > PROMINENCE_MAX_DB) {
    return { error: PEAKS_ERR_THRESHOLD }
  }
  if (freqs.length !== magnitudes.length || freqs.length < 3) {
    return { error: PEAKS_ERR_LENGTH }
  }

  const n = magnitudes.length
  const db = new Array(n)
  for (let i = 0; i < n; i++) {
    const m = magnitudes[i]
    if (!(m > 0) || !Number.isFinite(m)) return { error: PEAKS_ERR_NONPOSITIVE }
    db[i] = 20 * Math.log10(m)
  }

  const candidates = []
  for (const { start, end } of plateauRuns(db)) {
    // Sweep'in ilk ve son noktası tek taraflı karşılaştırma nedeniyle uç nokta
    // olarak sınıflandırılmaz: solunda veya sağında komşusu yoktur, dolayısıyla
    // tepe mi yoksa yükselen kenarın kesildiği yer mi olduğu bilinemez.
    if (start === 0 || end === n - 1) continue

    const value = db[start]
    const before = db[start - 1]
    const after = db[end + 1]

    let kind = null
    if (before < value && after < value) kind = 'peak'
    else if (before > value && after > value) kind = 'valley'
    if (!kind) continue

    // Plato: tepe frekansı geometrik merkezdir. Aritmetik ortalama logaritmik
    // eksende platonun ortasına düşmez, yüksek frekans ucuna kayar.
    const freq = start === end ? freqs[start] : Math.sqrt(freqs[start] * freqs[end])

    candidates.push({
      kind,
      startIndex: start,
      endIndex: end,
      freq,
      db: value,
      magnitude: magnitudes[start],
      prominence: null,
    })
  }

  candidates.forEach((c, i) => { c.prominence = prominenceOf(candidates, i) })

  const confirmed = candidates.filter((c) => c.prominence !== null && c.prominence >= threshold)
  return {
    peaks: confirmed.filter((c) => c.kind === 'peak'),
    valleys: confirmed.filter((c) => c.kind === 'valley'),
    candidates,
    threshold,
  }
}
