// Kompleks sayı ve empedans aritmetiği.
//
// PDN, EMC filtre ve stitching kondansatörü hesaplarının tamamı frekans başına
// kompleks çözüm ister: empedans BÜYÜKLÜKLERİ toplanarak paralel ağ hesabı
// yapılmaz. Büyüklük toplamı, kolların faz farkını yok sayar ve tam da aramak
// istediğimiz şeyi — antirezonans tepesini — silip süpürür. Bu modül o çözümün
// aritmetik tabanıdır.
//
// Kapsam bilinçli olarak dar: yalnız aritmetik. ESR + jωESL + 1/(jωC) gibi
// DEVRE modelleri buraya girmez, onları kullanan motor dosyasında durur —
// yoksa "saf aritmetik" katmanı sessizce devre kütüphanesine dönüşür.
//
// Gösterim: { re, im }. Hata durumunda hata kodu değil NaN bileşeni döner;
// bu katman tek bir bölme kadar küçük ve her çağrıda nesne ayrıştırmak
// sweep içinde binlerce kez ödenirdi. NaN'ın grafiğe ULAŞMAMASI çağıranın
// sorumluluğudur (spec: grafik katmanına NaN/Infinity gönderilmez).

export const ZERO = Object.freeze({ re: 0, im: 0 })
export const ONE = Object.freeze({ re: 1, im: 0 })

export function complex(re, im = 0) {
  return { re, im }
}

// Kutupsaldan karteziyene. Faz radyandır.
export function fromPolar(mag, phase) {
  return { re: mag * Math.cos(phase), im: mag * Math.sin(phase) }
}

export function add(a, b) {
  return { re: a.re + b.re, im: a.im + b.im }
}

export function sub(a, b) {
  return { re: a.re - b.re, im: a.im - b.im }
}

export function mul(a, b) {
  return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re }
}

// Gerçek sayıyla ölçekleme. Z/N gibi yerlerde tam kompleks bölme yapmaya gerek
// yok; hem daha ucuz hem de sanal bileşende gereksiz yuvarlama üretmiyor.
export function scale(a, k) {
  return { re: a.re * k, im: a.im * k }
}

// Smith (1962) algoritması. Naif (ac+bd)/(c²+d²) formülü, PDN'de karşılaşılan
// büyüklük aralığında taşar: pF mertebesinde bir kol GHz'de 1/(ωC) → çok küçük,
// nH mertebesinde bir kol aynı frekansta ωL → çok büyük değer üretir ve
// c²+d² ara terimi Infinity'ye kaçar. Bölenin büyük olan bileşenine göre
// normalize etmek bunu önler.
export function div(a, b) {
  const { re: c, im: d } = b
  if (c === 0 && d === 0) return { re: NaN, im: NaN }

  if (Math.abs(c) >= Math.abs(d)) {
    const r = d / c
    const den = c + d * r
    return { re: (a.re + a.im * r) / den, im: (a.im - a.re * r) / den }
  }
  const r = c / d
  const den = c * r + d
  return { re: (a.re * r + a.im) / den, im: (a.im * r - a.re) / den }
}

export function inv(a) {
  return div(ONE, a)
}

// Math.hypot taşma/alt taşma yapmadan çalışır: sqrt(re²+im²) formülü
// 1e200 mertebesinde Infinity, 1e-200 mertebesinde 0 dönerdi.
export function abs(a) {
  return Math.hypot(a.re, a.im)
}

// Faz, radyan, (−π, π]. atan2 çeyrek bilgisini korur.
export function arg(a) {
  return Math.atan2(a.im, a.re)
}

export function isFiniteComplex(a) {
  return Number.isFinite(a.re) && Number.isFinite(a.im)
}

// Seri bağlı kolların toplam empedansı. Boş liste = kısa devre (0 Ω), çünkü
// hiç eleman yoksa toplam da sıfırdır.
export function series(list) {
  let re = 0
  let im = 0
  for (const z of list) {
    re += z.re
    im += z.im
  }
  return { re, im }
}

// Paralel bağlı kolların toplam empedansı: Y_total = Σ 1/Z_k, Z_total = 1/Y.
//
// İkişer ikişer (Z1·Z2)/(Z1+Z2) uygulamak yerine admitans toplamı kullanılır;
// spec'in PDN rotası da bunu ister ve çok kollu ağda ara sonuçların yuvarlama
// hatasını biriktirmez.
export function parallel(list) {
  if (list.length === 0) return { re: Infinity, im: 0 } // açık devre

  let re = 0
  let im = 0
  for (const z of list) {
    // İdeal kısa devre bir kol tüm ağı kısa devre eder; 1/0 = Infinity üzerinden
    // gitmek NaN üretirdi (Infinity − Infinity). Doğrudan sonucu döndür.
    if (z.re === 0 && z.im === 0) return { re: 0, im: 0 }
    const y = inv(z)
    re += y.re
    im += y.im
  }
  return inv({ re, im })
}
