// dB, kazanç ve dBm dönüştürücü ekranının kullanıcıya görünen metinleri.
// Hesap kodları burada Türkçeye çevrilir; model.js metin üretmez.

import { fmt, fmtEng, fmtOhm, fmtVolt } from '../../../lib/num'
import {
  MODE_POWER, MODE_VOLTAGE, MODE_DBM,
  DIR_FORWARD, DIR_REVERSE,
  REASON_RATIO, REASON_POWER, REASON_RANGE,
} from './model'

// --- Etiketler ---

export const MODE_LABEL = {
  [MODE_POWER]: 'Güç oranı',
  [MODE_VOLTAGE]: 'Gerilim oranı',
  [MODE_DBM]: 'dBm seviyesi',
}

export const DIR_LABEL = {
  [MODE_POWER]: {
    [DIR_FORWARD]: 'İki güçten dB',
    [DIR_REVERSE]: 'dB değerinden güç oranı',
  },
  [MODE_VOLTAGE]: {
    [DIR_FORWARD]: 'İki gerilimden dB',
    [DIR_REVERSE]: 'dB değerinden gerilim oranı',
  },
  [MODE_DBM]: {
    [DIR_FORWARD]: 'Güçten dBm',
    [DIR_REVERSE]: 'dBm değerinden güç',
  },
}

export const DIR_FIELD_LABEL = 'Dönüşüm yönü'

// --- Grafik ---

export const CHART = {
  ratio: {
    x: 'Oran (P₂/P₁ veya V₂/V₁)',
    y: 'Kazanç (dB)',
    power: 'güç oranı — 10·log₁₀',
    voltage: 'gerilim oranı — 20·log₁₀',
    caption:
      'Aynı sayısal oran, güç için 10·log₁₀ ve gerilim için 20·log₁₀ ile iki farklı dB değeri verir; gerilim eğrisi her zaman güç eğrisinin iki katıdır. İşaretli nokta seçilen moda ait çalışma noktasıdır. Gerilim eğrisi yalnızca giriş ve çıkış empedansları eşitken güç kazancını temsil eder.',
  },
  dbm: {
    x: 'Güç (mW)',
    y: 'Seviye (dBm)',
    series: 'seviye — 10·log₁₀(P_mW)',
    caption:
      'dBm 1 mW referansına göre mutlak seviyedir: gücün her on katı 10 dB, her iki katı 3.01 dB ekler. Logaritmik x ekseninde bağıntı doğrusaldır.',
  },
}

// --- Sabit uyarı metinleri ---

export const METHOD_NOTE =
  'dB bir orandır ve birimsizdir; dBm ise 1 mW referansına göre mutlak bir seviyedir. Kazanç seviyeye eklenebilir (P_çıkış[dBm] = P_giriş[dBm] + G[dB]), ancak iki dBm değeri birbiriyle toplanmaz.'

export const EQUAL_Z_NOTE =
  '20·log₁₀(V₂/V₁) biçimi yalnızca giriş ve çıkış empedansları eşitken güç kazancına eşittir. Empedanslar farklıysa gerilim oranından bulunan dB, güç kazancını vermez; güç oranı doğrudan 10·log₁₀ ile hesaplanmalıdır.'

// --- Kaynak ve tanım bilgisi (spec §1: "Standart veya kaynak bilgisi") ---
//
// Sağ panelde "Kaynak ve tanımlar" başlığı altında listelenir.
export const SOURCE_NOTES = [
  'Kaynak: docs/spec.md §11.4. Bölüm bu ekranın kullandığı bağıntıların hepsini verir: güç oranı 10·log₁₀(P₂/P₁), gerilim oranı 20·log₁₀(V₂/V₁), ters dönüşümler 10^(G/10) ile 10^(G/20), ve dBm için 10·log₁₀(P_mW), 10^(P_dBm/10), 10^((P_dBm − 30)/10).',
  'Gerilim oranının geçerlilik koşulu kaynak dokümanda başlığın kendisinde yazılıdır: 20·log₁₀(V₂/V₁) biçimi "empedanslar eşitse" güç kazancına eşittir. Koşul sağlanmıyorsa gerilim oranından bulunan sayı bir gerilim oranı olarak doğru kalır ama güç kazancı DEĞİLDİR; o durumda güç kazancı doğrudan 10·log₁₀(P₂/P₁) ile hesaplanmalıdır. Ekran giriş ve çıkış empedanslarını bilmediği için bu koşulu doğrulayamaz — koşulun sağlandığını kullanıcı garanti eder.',
  'dBm kaynak dokümanda 10·log₁₀(P_mW) olarak tanımlıdır. P_mW gücün miliwatt cinsinden değeri olduğu için referans 1 mW\'tır: dBm bir oran değil, bu referansa bağlı MUTLAK bir seviyedir. 0 dBm tam olarak 1 mW demektir; negatif dBm 1 mW\'ın altını gösterir. Aynı bölümdeki P_W = 10^((P_dBm − 30)/10) bağıntısındaki 30 dB, watt ile miliwatt arasındaki 1000 çarpanının dB karşılığıdır.',
  'Buradan çıkan ayrım toplama kuralını belirler: dB birimsiz bir orandır ve bir seviyeye eklenebilir (P_çıkış[dBm] = P_giriş[dBm] + G[dB]), dBm ise seviyedir ve iki seviye birbirine eklenemez.',
  'Referans empedanstaki RMS gerilim §11.4\'ten değil, §9.4\'teki P = V²/R bağıntısından gelir: V_RMS = √(P·Z₀). Kaynak doküman bu ekran için bir referans empedans değeri şart koşmaz; Z₀ kullanıcı girdisidir.',
]

// --- Sayısal geçerlilik aralığı (spec §12: "Geçerlilik aralığı") ---
//
// Sınırların kaynağı convertDecibel.js: ratioGuard() pozitif olmayan oranı
// reddeder, finiteOrRange() sonuç sonlu değilse aralık hatası döner.
// Sayılar çift duyarlıklı kayan noktanın (IEEE-754 binary64) sınırlarıdır.
export const LIMIT_NOTES = [
  'Logaritma yalnızca pozitif argüman için tanımlıdır. Geçerli aralık P₂/P₁ > 0 ve V₂/V₁ > 0\'dır; oran tam sıfır ya da negatifken dB karşılığı yoktur ve hesap yerine hata gösterilir. Sıfır ya da negatif bir oran için sayı üretmek, tanımsız bir sonucu geçerli gibi göstermek olurdu. Aynı kural mutlak seviyede de geçerlidir: P > 0, 0 W için dBm tanımsızdır. Referans empedans için de Z₀ > 0 gerekir.',
  'Ters yönde (dB\'den orana) üst sınır G ≈ 3082.55 dB\'dir: bu değerin üstünde 10^(G/10), çift duyarlıklı kayan noktanın en büyük değerini (1.7977×10³⁰⁸) aşar ve aralık hatası döner. Ekran her iki oranı birlikte ürettiği için bağlayıcı sınır 10·log₁₀ yoludur; 20·log₁₀ yolu tek başına ancak G ≈ 6165.09 dB\'de taşardı. Aynı sınır mutlak seviyede de geçerlidir: P_dBm ≈ 3082.55 dBm.',
  'Alt uçta davranış farklıdır ve hata verilmez: G ≈ −3236.07 dB\'nin altında 10^(G/10) tam sıfıra iner. Sıfır sonlu bir sayı olduğu için aralık kontrolü tetiklenmez ve oran sütununda 0 görünür. Bu bir taşma değil, alt taşmadır — sonuç sıfıra yuvarlanmıştır, gerçekten sıfır değildir.',
  'İleri yönde (güçten dBm\'e) üst sınır P ≈ 1.7977×10³⁰⁵ W\'tır; bunun üstünde gücün miliwatt karşılığı (P / 1 mW) temsil edilemez.',
  'Bu sınırlar fiziksel değil sayısal sınırlardır; denklemden değil, sayının bilgisayarda tutulma biçiminden gelir. Gerçek bir kazanç ya da güç seviyesi bu sınırlara yaklaşmaz — birkaç yüz dB\'yi aşan bir giriş genellikle birim hatasına işaret eder.',
]

// --- Hata kodu → Türkçe ---

export function reasonText(reason) {
  switch (reason) {
    case REASON_RATIO:
      return 'Logaritma yalnızca pozitif oran için tanımlıdır. Güç ve gerilim değerleri sıfırdan büyük olmalı; oran sıfır ya da negatif olduğunda dB karşılığı yoktur.'
    case REASON_POWER:
      return 'dBm mutlak güç seviyesidir: güç sıfırdan büyük olmalı, 0 W için dBm tanımsızdır. Referans empedans da pozitif olmalıdır.'
    case REASON_RANGE:
      return 'Girişler geçerli, ancak sonuç kayan nokta aralığının dışına taşıyor: 10^(G/10) yaklaşık G > 3082.55 dB değerinde sayı olarak temsil edilemez (üst sınır 1.7977×10³⁰⁸). İleri yönde aynı sınır güçte P ≈ 1.7977×10³⁰⁵ W olarak karşımıza çıkar. Sonsuz bir değer göstermek yerine hesap durduruldu; daha küçük bir kazanç ya da seviye girin.'
    default:
      return 'Tüm zorunlu alanlara sayısal değer girin. Ondalık için nokta veya virgül kullanabilirsiniz (0.25 = 0,25).'
  }
}

// --- Bulgu → cümle ---

export function commentary(r) {
  if (!r.ok) return []
  const out = []

  if (r.mode === MODE_DBM) {
    out.push({
      level: 'ok',
      text: `${fmtEng(r.W, 'W', 4)} güç, 1 mW referansına göre ${fmt(r.mW, 4)}× oran demektir; 10·log₁₀ ile ${fmt(r.dBm, 4)} dBm.`,
    })
    out.push({
      level: 'ok',
      text: `${fmtOhm(r.Z)} üzerinde bu seviye ${fmtVolt(r.Vrms)} RMS gerilime karşılık gelir. Gerilim tepe değeri değil, etkin (RMS) değerdir.`,
    })
    out.push({
      level: 'warn',
      text: 'RMS gerilim, gücün tamamının referans empedans üzerinde harcandığı varsayımıyla bulunur. Uyumsuz hatta gücün bir kısmı yansır ve gerçek gerilim bu değerden sapar.',
    })
    if (r.dBm > 0) {
      out.push({
        level: 'ok',
        text: 'Seviye 0 dBm üzerinde, yani güç 1 mW referansından büyük. Negatif dBm değerleri 1 mW altını gösterir.',
      })
    } else if (r.dBm < 0) {
      out.push({
        level: 'ok',
        text: 'Seviye 0 dBm altında, yani güç 1 mW referansından küçük. İşaret referansın hangi tarafında olunduğunu söyler.',
      })
    }
    return out
  }

  const gain = r.dB > 0
  const unity = Math.abs(r.dB) < 1e-9

  if (r.mode === MODE_POWER) {
    out.push({
      level: 'ok',
      text: `Güç oranı ${fmt(r.powerRatio, 4)}× → 10·log₁₀ ile ${fmt(r.dB, 4)} dB.`,
    })
    out.push({
      level: 'warn',
      text: `Aynı dB değerinin gerilim oranı karşılığı ${fmt(r.voltageRatio, 4)}×'tir. Bu satır yalnızca giriş ve çıkış empedansları eşitken geçerlidir; empedanslar farklıysa gerilim oranı bu değerden sapar.`,
    })
  } else {
    out.push({
      level: 'ok',
      text: `Gerilim oranı ${fmt(r.voltageRatio, 4)}× → 20·log₁₀ ile ${fmt(r.dB, 4)} dB.`,
    })
    out.push({
      level: 'warn',
      text: `Bu dönüşüm empedansların eşit olduğunu varsayar. Eşitse güç oranı gerilim oranının karesidir: ${fmt(r.voltageRatio, 4)}² = ${fmt(r.powerRatio, 4)}×. Empedanslar farklıysa bu eşitlik bozulur.`,
    })
  }

  if (unity) {
    out.push({
      level: 'ok',
      text: '0 dB birim kazançtır: çıkış girişe eşittir. Sıfır dB "sinyal yok" demek değildir.',
    })
  } else {
    out.push({
      level: 'ok',
      text: gain
        ? `Pozitif dB kazanç demektir: çıkış giriş büyüklüğünün üzerindedir. Güç ${fmt(r.powerRatio, 4)} katına çıkar.`
        : `Negatif dB zayıflama demektir: çıkış giriş büyüklüğünün altındadır. Güç ${fmt(r.powerRatio, 4)} katına iner.`,
    })
  }

  out.push({
    level: 'ok',
    text: 'Aklınızda kalması için: güçte 3.01 dB iki kat, 10 dB on kat; gerilimde 6.02 dB iki kat, 20 dB on kattır.',
  })

  return out
}
