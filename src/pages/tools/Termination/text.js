// Terminasyon ekranının kullanıcıya görünen metinleri.
//
// Hesap katmanı yalnızca kod ve sayı üretir; Türkçeye çeviri burada yapılır.
// İleride ikinci bir dil gerekirse değişecek tek dosya budur.

import { fmt, fmtRes, fmtPct, fmtVolt, fmtAmp, fmtWatt } from '../../../lib/num'
import {
  TERM_SERIES, TERM_PARALLEL, TERM_THEVENIN,
  REASON_NEGATIVE_SERIES, REASON_BIAS,
  SERIES_TERM_ESERIES,
} from './model'

export const TYPE_LABEL = {
  [TERM_SERIES]: 'Seri',
  [TERM_PARALLEL]: 'Paralel',
  [TERM_THEVENIN]: 'Thevenin',
}

// --- Sapma eşikleri ---
//
// DİKKAT: bu iki eşik MÜHENDİSLİK YORUMUDUR, docs/spec.md §7.7'den GELMEZ.
// Spec standart değere kuantalamanın ne kadar sapma üretebileceğine dair
// hiçbir sınır tanımlamıyor; yalnızca "gerçek bias ile gerçek paralel direnç
// tekrar hesaplanmalıdır" diyor. Kabul edilebilir sapma tasarımın gürültü ve
// gerilim bütçesine bağlıdır. Aşağıdaki değerler yaygın bir başlangıç kabulü
// olarak seçilmiştir ve spec'ten doğrulanamaz.
export const DEV_WARN_PCT = 5
export const DEV_DANGER_PCT = 10

export const DEV_THRESHOLD_NOTE =
  `Sapma eşikleri (%${DEV_WARN_PCT} üzeri uyarı, %${DEV_DANGER_PCT} üzeri sınır dışı) bu ` +
  'ekranın mühendislik yorumudur; kullanılan DC tasarım denklemleri böyle bir sınır ' +
  'tanımlamaz. Kabul edilebilir sapma tasarımın gürültü ve gerilim bütçesine göre değişir.'

function deviationLevel(pct) {
  const a = Math.abs(pct)
  if (!Number.isFinite(a)) return 'warn'
  if (a > DEV_DANGER_PCT) return 'danger'
  if (a > DEV_WARN_PCT) return 'warn'
  return 'ok'
}

// --- Yöntem etiketleri ---

export const METHOD_NOTE =
  'DC tasarım denklemleri. Motor yalnızca kalıcı davranışı hesaplar: ' +
  'yansıma, çınlama, kapasitif yük, sürücü kenar hızı ve sap etkileri modellenmez. ' +
  'Sonuç bir başlangıç değeridir, zaman alanı simülasyonunun yerini tutmaz.'

export const SERIES_ESERIES_NOTE =
  `Seri terminasyonda standart değer adayları yalnızca ${SERIES_TERM_ESERIES} dizisinden ` +
  'geliyor: motorun seri terminasyon fonksiyonu E serisi seçimi kabul etmiyor. E serisi ' +
  'seçimi bu ekranda yalnızca Thevenin çiftinde etkilidir.'

export const THEVENIN_IDC_NOTE =
  'Sürekli akım ve güç İDEAL R_top / R_bottom değerlerinden hesaplanıyor; seçilen standart ' +
  'çiftin gerçek akımı bundan bir miktar farklıdır. Motor bu iki alanı ideal çiftten ' +
  'döndürüyor, bu sınır burada gizlenmiyor.'

export const TYPE_NOTE = {
  [TERM_SERIES]:
    'Seri terminasyon kaynak ucunda eşleme yapar: hattın sonundan dönen yansıma ikinci ' +
    'geçişte sürücü tarafında yutulur. Hat sonunda tek bir alıcı olduğu varsayılır.',
  [TERM_PARALLEL]:
    'Paralel terminasyon yük ucunda eşleme yapar: yansıma alıcı ucunda yutulur, hiç geri ' +
    'dönmez. Bedeli süreklidir — direnç sinyal dursa bile akım çeker.',
  [TERM_THEVENIN]:
    'Thevenin terminasyonu aynı anda iki iş yapar: hattı Z₀ ile eşler ve girişi V_bias ' +
    'seviyesine çeker. İki direnç birbirinden bağımsız seçilemez.',
}

// --- Grafik ---

export const CHART = {
  [TERM_SERIES]: {
    x: 'Hat empedansı Z₀ (Ω)',
    y: 'Seri direnç R_s (Ω)',
    names: { rs: 'R_s' },
    caption:
      'Sürücü direnci sabitken R_s, Z₀ ile doğrusal artar. Eğrinin sıfırı kestiği nokta ' +
      'Z₀ = R_driver noktasıdır; solunda R_s negatife düşer ve seri terminasyon tanımsız kalır.',
  },
  [TERM_PARALLEL]: {
    x: 'Hat empedansı Z₀ (Ω)',
    y: 'Sürekli DC güç P_dc (W)',
    names: { pdc: 'P_dc' },
    caption:
      'Sürekli güç Z₀ ile ters orantılıdır: 50 Ω\'luk bir hattın terminasyon maliyeti ' +
      '100 Ω\'luk bir hattın iki katıdır. Bu güç duty cycle\'dan bağımsız olarak en kötü ' +
      'durumda sürekli akar.',
  },
  [TERM_THEVENIN]: {
    x: 'Hat empedansı Z₀ (Ω)',
    y: 'Direnç (Ω)',
    names: { rtop: 'R_top', rbottom: 'R_bottom' },
    caption:
      'İki direnç de Z₀ ile doğrusal büyür; oranları sabit kalır çünkü oran yalnızca ' +
      'V_bias / V_cc ile belirlenir. Eğriler arasındaki açıklık bias oranını gösterir — ' +
      'eşit oldukları nokta V_bias = V_cc / 2 durumudur.',
  },
}

export const REF_LABEL = {
  zero: 'R_s = 0 — seri terminasyon sınırı',
}

// --- Hata kodu → metin ---

export function reasonText(reason) {
  switch (reason) {
    case REASON_NEGATIVE_SERIES:
      return 'Sürücü çıkış direnci hat empedansından büyük; seri terminasyon önerilmez ve R_s hesaplanmaz. Daha düşük çıkış empedanslı bir sürücü seçin ya da yük ucunda eşleme yapan bir yöntem (paralel veya Thevenin) kullanın.'
    case REASON_BIAS:
      return 'Hedef bias gerilimi besleme geriliminden küçük olmalı. Bölücü yükseltme yapmaz; V_bias < V_cc olacak şekilde girin.'
    default:
      return 'Tüm zorunlu alanlara pozitif sayısal değer girin. Ondalık için nokta veya virgül kullanabilirsiniz (0.25 = 0,25).'
  }
}

// --- Mühendislik yorumu ---

export function commentary(r) {
  if (!r.ok) {
    // Seri terminasyonun geçersiz kaldığı durum sessizce boş bırakılmaz:
    // hesap gösterilmez ama nedeni danger seviyesinde raporlanır.
    if (r.reason === REASON_NEGATIVE_SERIES) {
      return [
        {
          level: 'danger',
          text: `Sürücü çıkış direnci ${fmtRes(r.Rdriver, 4)}, hat empedansı ise ${fmtRes(r.Z0, 4)}. Sürücü tek başına hattan daha yüksek empedanslı olduğu için eklenecek seri direnç negatif çıkıyor (${fmtRes(r.Rs, 4)}) — seri terminasyon önerilmez, hesap gösterilmiyor.`,
        },
        {
          level: 'warn',
          text: 'Bu durumda kaynak eşlemesi mümkün değildir: ya daha düşük çıkış empedanslı bir sürücü seçilmeli ya da eşleme yük ucuna alınmalıdır (paralel veya Thevenin terminasyon).',
        },
      ]
    }
    return []
  }

  if (r.type === TERM_SERIES) return seriesNotes(r)
  if (r.type === TERM_PARALLEL) return parallelNotes(r)
  return theveninNotes(r)
}

function seriesNotes(r) {
  const out = []

  out.push({
    level: 'ok',
    text: `Gereken seri direnç R_s = Z₀ − R_driver = ${fmtRes(r.Rs, 4)}. Sürücü direnci ile toplam kaynak empedansı ${fmtRes(r.total, 4)} olur ve hattın ${fmtRes(r.Z0, 4)} değerine oturur.`,
  })

  if (!r.std) {
    out.push({
      level: 'ok',
      text: 'R_s sıfır çıktı: sürücü çıkış direnci zaten hat empedansına eşit, ayrıca seri direnç gerekmez. Yine de üretim toleransı ve sıcaklık sürücü direncini kaydırır; ölçümle doğrulayın.',
    })
  } else {
    out.push({
      level: deviationLevel(r.stdErrPct),
      text: `En yakın ${r.eseries} değeri ${fmtRes(r.std.value, 4)} (hedeften ${fmtPct(r.std.errorPct)}). Bu standart değerle kaynak empedansı ${fmtRes(r.withStandard, 4)} olur ve Z₀'dan ${fmtPct(r.stdErrPct)} kayar — kuantalama doğrudan kaynak eşlemesini bozar, artan fark hat sonundan dönen dalganın bir kısmını ikinci kez yansıtır.`,
    })

    out.push({
      level: 'warn',
      text: `Seçilen direncin üretim toleransı bu sapmanın üzerine biner: kuantalama farkı (${fmtPct(r.stdErrPct)}) ile tolerans bandı aynı yöne düşerse kaynak empedansı daha da uzaklaşır. Dar toleranslı bir değer seçmek kuantalama sapmasını düzeltmez.`,
    })
  }

  out.push({
    level: 'warn',
    text: 'Seri terminasyon tek yük içindir. Hat üzerinde dallanma ya da birden fazla alıcı varsa ara noktalarda yarım genlikli bir basamak görünür; bu topolojide seri terminasyon doğru seçim değildir.',
  })

  out.push({
    level: 'ok',
    text: 'Sürekli DC güç kaybı yoktur: seri direnç yalnızca geçiş anında akım taşır. Paralel ve Thevenin yöntemlerinden ayrıldığı temel nokta budur.',
  })

  out.push({ level: 'warn', text: SERIES_ESERIES_NOTE })
  out.push({ level: 'warn', text: DEV_THRESHOLD_NOTE })

  out.push({
    level: 'warn',
    text: 'Bu ekran DC eşleme hesabı yapar. Gerçek kenar davranışı (yansıma, çınlama, basamak) yalnızca zaman alanı simülasyonu veya ölçümle doğrulanabilir.',
  })

  return out
}

function parallelNotes(r) {
  const out = []

  out.push({
    level: 'ok',
    text: `R_T = Z₀ = ${fmtRes(r.RT, 4)}. Hat yük ucunda eşlendiği için gelen dalga sonlandırıcıda yutulur, kaynağa geri dönmez.`,
  })

  out.push({
    level: 'warn',
    text: `DC güç kaybı SÜREKLİDİR: terminasyon direnci ${fmtVolt(r.V)} altında ${fmtAmp(r.Idc)} çeker ve ${fmtWatt(r.Pdc)} dağıtır. Bu güç sinyal dursa bile akar — paralel terminasyonun bedeli budur ve seri terminasyonda yoktur.`,
  })

  out.push({
    level: 'ok',
    text: `Duty cycle %${fmt(r.duty * 100, 4)} ile ortalama güç ${fmtWatt(r.Pavg)}. Ortalama değer yalnızca ısınma bütçesi içindir; direnç paketi en kötü durumdaki sürekli ${fmtWatt(r.Pdc)} değerine göre seçilmelidir.`,
  })

  out.push({
    level: 'warn',
    text: `Aynı hattın onlarca kopyası varsa bu güç doğrudan çarpılır: her sonlandırılmış hat ${fmtWatt(r.Pdc)} ekler. Yüksek hızlı veri yollarında paralel terminasyonun toplam maliyeti bu çarpımdır.`,
  })

  out.push({
    level: 'warn',
    text: 'Motor tek bir gerilim alır: V, terminasyon direnci üzerinde kalan sürekli gerilim farkıdır. Direnç toprağa değil ayrı bir terminasyon rayına çekiliyorsa girilen değer bu farkı yansıtmalıdır — aksi halde güç olduğundan büyük ya da küçük çıkar.',
  })

  out.push({
    level: 'ok',
    text: `R_T = Z₀ tasarım serbestliği bırakmaz; değişebilen tek şey gerilim ve duty cycle'dır. Hat empedansı düştükçe güç artar: Z₀ yarıya inerse ${fmtWatt(r.Pdc)} iki katına çıkar.`,
  })

  out.push({
    level: 'warn',
    text: 'Bu ekran DC eşleme ve güç hesabı yapar. Gerçek kenar davranışı (yansıma, çınlama, basamak) yalnızca zaman alanı simülasyonu veya ölçümle doğrulanabilir.',
  })

  return out
}

function theveninNotes(r) {
  const out = []
  const s = r.standard

  out.push({
    level: 'ok',
    text: `İdeal çift R_top = ${fmtRes(r.ideal.Rtop, 4)}, R_bottom = ${fmtRes(r.ideal.Rbottom, 4)} (a = V_bias / V_cc = ${fmt(r.ideal.a, 4)}). Bu çiftin paralel eşdeğeri tam olarak Z₀ = ${fmtRes(r.Z0, 4)} verir ve bölücü tam olarak ${fmtVolt(r.Vbias)} bias üretir.`,
  })

  out.push({
    level: 'warn',
    text: `Standart değere kuantalamak HEM empedansı HEM bias'ı birden kaydırır. Seçilen ${r.series} çifti ${fmtRes(s.Rtop, 4)} / ${fmtRes(s.Rbottom, 4)}: iki direnç bağımsız değildir, birini düzeltmek diğerini bozar. Motor bu yüzden iki sapmanın toplamını en küçükleyen çifti seçiyor.`,
  })

  out.push({
    level: deviationLevel(s.zErr),
    text: `Empedans sapması: gerçekleşen paralel direnç ${fmtRes(s.Rpar, 4)}, hedef Z₀ ${fmtRes(r.Z0, 4)} — sapma ${fmtPct(s.zErr)}. Eşlemedeki bu fark hat sonunda kalıcı bir yansıma bırakır.`,
  })

  out.push({
    level: deviationLevel(s.vErr),
    text: `Bias sapması: gerçekleşen bias ${fmtVolt(s.bias)}, hedef ${fmtVolt(r.Vbias)} — sapma ${fmtPct(s.vErr)}. Bu kayma alıcının eşik gerilimine göre gürültü payını asimetrik hale getirir.`,
  })

  out.push({
    level: 'warn',
    text: `Sürekli akım V_cc'den SÜREKLİ çekilir: ${fmtAmp(r.Idc)}, yani ${fmtWatt(r.Pdc)}. Sürücü hiç anahtarlamasa bile bu akım akar; her Thevenin sonlandırılmış hat besleme bütçesine bu kadar ekler.`,
  })

  out.push({ level: 'warn', text: THEVENIN_IDC_NOTE })

  out.push({
    level: 'warn',
    text: 'İki direncin toleransı da sonuca girer ve birbirinden bağımsızdır: en kötü durumda biri üst, diğeri alt uçta olur; empedans ve bias sapmaları bu ekranda gösterilenden büyük olabilir. Toleransın etkisi motorda hesaplanmıyor.',
  })

  out.push({ level: 'warn', text: DEV_THRESHOLD_NOTE })

  out.push({
    level: 'warn',
    text: 'Bu ekran DC eşleme ve bias hesabı yapar. Gerçek kenar davranışı (yansıma, çınlama, basamak) yalnızca zaman alanı simülasyonu veya ölçümle doğrulanabilir.',
  })

  return out
}
