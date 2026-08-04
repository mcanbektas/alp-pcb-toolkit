// Logaritmik frekans dizisi.
//
// Bütün frekans sweep'leri logaritmiktir: PDN ve filtre empedansı on yıllar
// boyunca değişir, doğrusal örnekleme alt dekadları neredeyse hiç örneklemez ve
// düşük frekanstaki rezonans kaçar.
//
// Sözleşmenin parçası: İLK VE SON NOKTA TAM OLARAK f_min ve f_max'tır. Formülü
// uçlarda da hesaplamak 10^log10(x) turunda son bitte kayma bırakıyor
// (f_max = 1e9 için 999999999.9999999); hedef empedans çizgisi ile sweep'in son
// noktası o zaman aynı frekansta buluşmuyor ve rapor ile grafik ayrışıyor.
// Uçlar bu yüzden doğrudan atanır, aradaki noktalar formülden gelir.

export const SWEEP_ERR_NONPOSITIVE = 'log-axis-nonpositive'
export const SWEEP_ERR_RANGE = 'frequency-range-invalid'
export const SWEEP_ERR_POINTS = 'points-invalid'

// Logaritmik olarak eşit aralıklı n nokta.
//
//   f_k = 10^( log10(f_min) + k/(n−1) · [ log10(f_max) − log10(f_min) ] )
//   k = 0, 1, …, n−1
//
// Döner: { values } veya { error }
export function logspace(fMin, fMax, n) {
  if (!Number.isInteger(n) || n < 2) return { error: SWEEP_ERR_POINTS }
  if (!Number.isFinite(fMin) || !Number.isFinite(fMax)) return { error: SWEEP_ERR_RANGE }

  // Sıfır ve negatif değer logaritmik eksende tanımsızdır. Çok küçük ama pozitif
  // değer sıfıra yuvarlanmaz — kullanıcı 1 mHz'den başlatmak isteyebilir.
  if (fMin <= 0 || fMax <= 0) return { error: SWEEP_ERR_NONPOSITIVE }
  if (fMin >= fMax) return { error: SWEEP_ERR_RANGE }

  const lo = Math.log10(fMin)
  const hi = Math.log10(fMax)
  const step = (hi - lo) / (n - 1)

  const values = new Array(n)
  values[0] = fMin
  values[n - 1] = fMax
  for (let k = 1; k < n - 1; k++) {
    values[k] = 10 ** (lo + k * step)
  }
  return { values }
}

// Dekad başına nokta sayısından toplam nokta sayısı. Kullanıcı "dekad başına 50
// nokta" demek istediğinde toplam sayıyı elle hesaplamak zorunda kalmasın diye.
// En az iki nokta döner.
export function pointsPerDecade(fMin, fMax, perDecade) {
  if (fMin <= 0 || fMax <= 0 || !(fMax > fMin) || !(perDecade > 0)) return 2
  const decades = Math.log10(fMax / fMin)
  return Math.max(2, Math.round(decades * perDecade) + 1)
}

// Büyüklüğü dB'ye çevirir. Logaritmik eksende sıfır ve negatif büyüklük
// tanımsızdır; sessizce −Infinity dönmek yerine NaN döner ve çağıran
// SWEEP_ERR_NONPOSITIVE üretir.
export function toDb(magnitude) {
  if (!(magnitude > 0) || !Number.isFinite(magnitude)) return NaN
  return 20 * Math.log10(magnitude)
}
