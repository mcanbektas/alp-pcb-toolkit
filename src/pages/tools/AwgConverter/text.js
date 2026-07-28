// AWG dönüştürücü ekranının kullanıcıya görünen metinleri.
// Hesap kodları burada Türkçeye çevrilir; model.js hiç cümle üretmez.

import { fmt, fmtPct } from '../../../lib/num'
import {
  REASON_INCOMPLETE, REASON_AWG_RANGE, REASON_DIAMETER_RANGE,
  DIR_AWG, DIR_DIAMETER, SWEEP_D, SWEEP_AREA,
  AWG_MIN, AWG_MAX, AWG_D_MIN, AWG_D_MAX,
  AWG_ERR_TOLERANCE, AWG_REF_GAUGE, AWG_REF_INCH, AWG_RATIO, AWG_STEPS,
} from './model'

// --- Etiketler ---

export const DIR_LABEL = {
  [DIR_AWG]: 'Numaradan çapa',
  [DIR_DIAMETER]: 'Çaptan numaraya',
}

export const SWEEP_LABEL = {
  [SWEEP_D]: 'Çap',
  [SWEEP_AREA]: 'Kesit alanı',
}

export const SWEEP_AXIS = {
  [SWEEP_D]: 'İletken çapı (mm, logaritmik)',
  [SWEEP_AREA]: 'Kesit alanı (mm², logaritmik)',
}

export const SWEEP_CAPTION = {
  [SWEEP_D]: 'Çap logaritmik eksende çizildiğinde numara ile doğrusal bir doğru verir: ölçek geometriktir, aritmetik değil. 6 numara aşağı inmek çapı yaklaşık iki katına çıkarır.',
  [SWEEP_AREA]: 'Kesit alanı çapın karesiyle büyüdüğü için doğrunun eğimi çap grafiğinin yarısı kadardır: 3 numara aşağı inmek kesiti yaklaşık iki katına, 10 numara aşağı inmek yaklaşık on katına çıkarır.',
}

export const CHART = { y: 'AWG numarası' }

// Aralık sınırlarının mm gösterimi — daima dört ondalık.
//
// fmt() sondaki sıfırları attığı için üst sınır "11.684" diye yazılıyordu:
// bu, ondalık ayracından sonra tam üç basamak taşıyan ve uygulamanın kendi
// giriş ayrıştırıcısının belirsiz binlik ayırıcı sayıp reddettiği kalıptır
// (num.js, NUM_ERR_THOUSANDS). Sınırı alana kopyalayan kullanıcı hata alırdı.
// Dört ondalıklı yazım aynı sayıyı bu kalıba düşmeden gösterir.
const mmLimit = (meters) => (meters * 1e3).toFixed(4)

// Giriş alanı ipuçları — sayı taşıdıkları için metin katmanında durur
export const FIELD_HINT = {
  awg: '4/0 için -3, 3/0 için -2, 00 için -1, 0 için 0 yazın. Kesirli ara değer de kabul edilir.',
  d: `Ölçeğin kapsadığı çıplak iletken çapı ${mmLimit(AWG_D_MIN)} mm ile ${mmLimit(AWG_D_MAX)} mm arasıdır. Sınırlar dört ondalıkla yazılır; ondalık ayracından sonra tam üç basamak yazan bir değer binlik ayırıcı sanılıp reddedilir.`,
  tolD: 'Üreticinin verdiği çekme toleransı. Boş bırakılırsa tolerans bandı hiç hesaplanmaz ve yalnızca nominal sonuç gösterilir.',
}

// --- Çekme toleransı (spec §3.4) ---

export const TOLERANCE_CAPTION = 'Çap toleransı (minimum · nominal · maksimum)'

export const TOLERANCE_FIELD_CAPTION = 'Çekme toleransı (isteğe bağlı)'

// Kesitin toleransı neden çapın iki katı — sağ panelde tek cümle.
export const TOLERANCE_SQUARE_NOTE =
  'Kesit alanı çapın karesiyle gittiği için çap toleransı kesitte yaklaşık iki katına çıkar: '
  + 'A(d·(1±t)) = A(d)·(1±t)², yani ±%5 çap toleransı kesitte −%9.75 / +%10.25 demektir. '
  + 'Bant simetrik değildir; üst uç alt uçtan biraz geniştir.'

export function toleranceReason(code) {
  switch (code) {
    case AWG_ERR_TOLERANCE:
      return 'Çap toleransı %0 ile %100 arasında olmalı (100 hariç). %100 tolerans alt uçta çapı sıfırlar ve kesit alanı tanımsız kalır.'
    default:
      return 'Tolerans bandı hesaplanamadı; nominal çapın pozitif olması gerekir.'
  }
}

// --- Kullanılan ölçek ve kaynak (spec §1: standart veya kaynak bilgisi) ---

export const SCALE_SOURCE = [
  `Ölçek: AWG geometrik tel ölçüsü tanımı — ${AWG_REF_GAUGE} numaranın çapı ${AWG_REF_INCH} inch ve ardışık iki numara arasındaki çap oranı sabittir. ${AWG_STEPS} adımlık aralık ${AWG_RATIO} katlık çap oranını verir; numara başına oran ${AWG_RATIO}^(1/${AWG_STEPS}) ≈ ${fmt(Math.pow(AWG_RATIO, 1 / AWG_STEPS), 5)}.`,
  'Uzunluk: uluslararası inch tanımı, 1 inch = 25.4 mm (tam). Milimetre, mil ve mikrometre karşılıkları bu tek eşitlikten çıkar.',
  'Kesit alanı yuvarlak ve tek telli iletken varsayımıyla A = π·d²/4 bağıntısından gelir.',
  'Bütün değerler bu tanımlardan hesaplanır; yayınlanmış bir çap tablosu kopyalanmamıştır. Sipariş verirken üreticinin kendi veri sayfasındaki nominal çap ve toleransı esas alın.',
]

// Standart numara gösterimi: 0 ve altı için 1/0 … 4/0 yazımı kullanılır.
export function awgLabel(n) {
  if (!Number.isFinite(n)) return '—'
  if (!Number.isInteger(n)) return fmt(n, 4)
  if (n > 0) return String(n)
  const zeros = 1 - n
  return `${zeros}/0 (${'0'.repeat(zeros)})`
}

// --- Hata kodu → Türkçe ---

export function reasonText(reason) {
  switch (reason) {
    case REASON_AWG_RANGE:
      return `Numara ölçeğin dışında. Geçerli aralık AWG ${awgLabel(AWG_MIN)} ile ${AWG_MAX} arasıdır; 4/0 için -3, 3/0 için -2, 00 için -1, 0 için 0 yazın.`
    case REASON_DIAMETER_RANGE:
      return `Çap ölçeğin dışında. AWG ${awgLabel(AWG_MAX)} ile ${awgLabel(AWG_MIN)} arasındaki çıplak iletken çapları ${mmLimit(AWG_D_MIN)} mm ile ${mmLimit(AWG_D_MAX)} mm arasındadır; bu aralığın dışında sonuç üretilmez.`
    case REASON_INCOMPLETE:
    default:
      return 'Tüm zorunlu alanlara sayısal değer girin. Ondalık için nokta veya virgül kullanabilirsiniz (0.25 = 0,25).'
  }
}

// --- Bulgular ---

export function commentary(r) {
  if (!r.ok) return []
  const out = []

  const shown = r.standard ? `AWG ${awgLabel(r.awgExact)}` : `AWG ${fmt(r.awgExact, 5)}`

  out.push({
    level: 'ok',
    text: `${shown} çıplak iletken çapı ${fmt(r.dUnits.mm, 4)} mm (${fmt(r.dUnits.mil, 4)} mil, ${fmt(r.dUnits.inch, 4)} inch); kesit alanı ${fmt(r.aUnits.mm2, 4)} mm² (${fmt(r.aUnits.mil2, 6)} mil²).`,
  })

  if (r.standard) {
    out.push({
      level: 'ok',
      text: 'Girilen numara ölçekte tam bir basamağa oturuyor; en yakın standart karşılık kendisidir.',
    })
  } else {
    out.push({
      level: Math.abs(r.dDeltaPct) > 2 ? 'warn' : 'ok',
      text: `Değer standart bir basamağa tam oturmuyor. En yakın standart AWG ${awgLabel(r.awgNearest)} çapı ${fmt(r.nearest.dUnits.mm, 4)} mm; fark çapta ${fmtPct(r.dDeltaPct)}, kesitte ${fmtPct(r.areaDeltaPct)}. Sipariş verirken standart basamağı kullanın.`,
    })
  }

  out.push({
    level: 'ok',
    text: 'Ölçek geometriktir: 6 numara aşağı inmek çapı 2.0050 katına, 3 numara aşağı inmek kesiti 2.0050 katına, 10 numara aşağı inmek kesiti 10.16 katına çıkarır. Küçük numara kalın teldir.',
  })

  // Tolerans girilmişse bandın sayısal karşılığı yoruma da girer; boşken bu
  // madde hiç eklenmez ve liste bugünkü hâlinde kalır.
  const tol = r.tolerance
  if (tol && !tol.error && tol.active) {
    out.push({
      level: 'ok',
      text: `±${fmt(tol.tol * 100, 3)} % çekme toleransıyla çap ${fmt(tol.dUnits.min.mm, 4)} … ${fmt(tol.dUnits.max.mm, 4)} mm, kesit ${fmt(tol.aUnits.min.mm2, 4)} … ${fmt(tol.aUnits.max.mm2, 4)} mm² bandına oturur; kesitteki sapma ${fmtPct(tol.area.minPct, 4)} / ${fmtPct(tol.area.maxPct, 4)}. Akım ve direnç hesaplarında kötü durum için alt ucu kullanın.`,
    })
  }

  // Zorunlu uyarı — çıplak iletken (spec §11.2)
  out.push({
    level: 'warn',
    text: 'Bu değerler yalnızca çıplak iletkene aittir. İzolasyonlu telin dış çapı yalıtkan malzemesine, kalınlığına ve sıcaklık sınıfına göre değişir; üreticinin veri tabanından okunmalıdır.',
  })

  if (r.awgExact >= 30) {
    out.push({
      level: 'warn',
      text: `Bu incelikte (${shown}) çekme toleransı ve yüzey işlemi çapın kayda değer bir yüzdesini oluşturur; ölçülen kesit tablodaki değerden sapabilir. Lehimleme ve mekanik dayanım da sınırlayıcı olur.`,
    })
  }

  if (r.awgExact <= 0) {
    out.push({
      level: 'warn',
      text: 'Bu kalınlıkta iletken pratikte çok telli örgüdür. Örgünün bakır kesiti aynı numaranın tek telli kesitine yakın olsa da dış çapı belirgin biçimde büyüktür; kanal, pabuç ve bükülme yarıçapı buna göre seçilir.',
    })
  }

  return out
}

// Sağ paneldeki "Geçerlilik ve varsayımlar" listesinin değişken maddeleri
export function validityNotes(r) {
  const out = [
    'Gösterilen bütün ölçüler çıplak iletkene aittir; izolasyon dış çapı bu hesaba dahil değildir ve üretici veri tabanından alınır.',
    'Ölçek tek telli (solid), yuvarlak kesitli iletken için tanımlıdır. Çok telli örgüde aynı numara benzer bakır kesitini hedefler; dış çap, esneklik ve deri etkisi davranışı farklıdır.',
    `Geçerli aralık AWG ${awgLabel(AWG_MIN)} … ${AWG_MAX}, yani ${mmLimit(AWG_D_MIN)} mm ile ${mmLimit(AWG_D_MAX)} mm arası çap. Aralığın dışında sonuç üretilmez.`,
    'Bu ekran yalnızca geometrik dönüşüm yapar: akım taşıma kapasitesi, direnç, gerilim düşümü ve ısınma bu numaradan çıkarılmaz. Bunlar ortam sıcaklığına, demetlemeye, yalıtkan sınıfına ve kablo uzunluğuna bağlıdır; ayrı hesaplanır.',
  ]

  if (r.ok && r.dir === DIR_DIAMETER) {
    out.push('Ölçülen çap üretim toleransı ve yüzey kaplaması taşır; ölçüyü telin birkaç noktasında alıp ortalamayı kullanın.')
  }

  if (r.ok && r.tolerance && !r.tolerance.error && r.tolerance.active) {
    out.push('Tolerans bandı basit worst-case yaklaşımıdır (spec §3.4): çapın iki ucu alınır, kesit bu uçlardan hesaplanır; olasılık dağılımı varsayılmaz. Tolerans değeri uygulamanın kendi verisi değildir, üreticinin veri sayfasından girilir.')
  }

  return out
}
