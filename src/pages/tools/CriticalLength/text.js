// Kritik hat uzunluğu ekranının kullanıcıya görünen metinleri.
// Hata kodları ve bulgu seviyeleri model.js'ten gelir; Türkçesi burada.

import { fmt, fmtEng } from '../../../lib/num'
import { EPS_GEOMETRY, EPS_STRUCT_STRIPLINE } from '../../../lib/epsEff'
import { REASON_EPS, REASON_CRITICAL, REASON_BANDWIDTH, K_MIN, K_MAX } from './model'

export const CHART = {
  x: 'Yükselme süresi t_r (s)',
  y: 'Kritik uzunluk (mm)',
  caption: 'Kritik uzunluk yükselme süresiyle doğru orantılıdır: kenar hızlandıkça eşik kısalır. Üç eğri aynı yığında üç farklı kriterin verdiği eşiği gösterir — aralarındaki fark üç kata kadar çıkar, yani "kritik uzunluk" tek bir sayı değil, seçilen kritere bağlı bir tasarım eşiğidir.',
}

// Kriter etiketleri — bölen değeri motordaki CRITICAL_DIVISORS listesinden gelir.
export const DIVISOR_LABEL = {
  6: '1/6 — konservatif (t_d ≥ t_r/6)',
  4: '1/4 — orta (t_d ≥ t_r/4)',
  2: '1/2 — gevşek (t_d ≥ t_r/2)',
}

export const DIVISOR_SHORT = {
  6: '1/6 (konservatif)',
  4: '1/4 (orta)',
  2: '1/2 (gevşek)',
}

// Sonuç panelinde .big-result'ın hemen altında duran yöntem etiketleri.
export const METHOD_NOTE =
  'Sonuç yükselme süresi kriterinden gelir: L_crit = c·t_r / (N·√εeff). ' +
  'Bu bir tasarım eşiğidir, mutlak fiziksel sınır değildir — eşiğin altındaki hat da ' +
  'iletim hattıdır, yalnızca yansımaların etkisi çoğu tasarımda ihmal edilebilir sayılır.'

// Spec §7.4 artık aktif olarak sürdürülmeyen bir kılavuz yönteminden de söz
// ediyor. O yöntem bu araçta uygulanmadı; sessizce atlanmıyor, ekranda yazıyor.
export const LEGACY_METHOD_NOTE =
  'Maksimum hat uzunluğu, artık aktif olarak sürdürülmeyen bir kılavuza dayanan frekans ' +
  'alanı yöntemiyle de kestirilebilir. Bu araçta o yöntem UYGULANMADI: buradaki sonuç ' +
  'yalnızca yükselme süresi kriterinden gelir, kılavuz yönteminin sonucuymuş gibi ' +
  'okunmamalıdır.'

// Yorum satırlarının seviyesini belirleyen iki ek eşik spec'te yok; kaynağı
// gizlenmesin diye ekranda .method-note olarak yazılıyor.
export const LEVEL_SOURCE_NOTE =
  'Yorum satırlarının seviyesi hesaplanan eşiğin yanında iki ek orana bakar: ' +
  'L > 2·L_crit "sınırın dışında", eşiğin altında kalan hatlarda L > 0.5·L_crit ' +
  '"sınıra yakın" sayılır. Bu iki oranın yerleşik bir kaynağı YOK — yaygın kriter ' +
  'yalnızca 1/6, 1/4, 1/2 bölenlerini ve L ile L_crit karşılaştırmasını tanımlar. ' +
  '"2 kat" ve "0.5 oranı" bu ' +
  'aracın kendi mühendislik yargısıdır; hesaplanan kritik uzunluğu değiştirmez, yalnızca ' +
  'yorumun vurgusunu belirler.'

// εeff kaynağı ortak bileşenden geliyor; yorum metni de aynı kalıpta olsun ki
// sinyal bütünlüğü ekranlarında aynı ifade kullanılsın.
export function epsSourceNote(eps) {
  if (eps.source !== EPS_GEOMETRY) {
    return {
      level: 'warn',
      text: `εeff = ${fmt(eps.epsEff, 4)} elle girildi. Değerin doğruluğu girene aittir; empedans aracından ya da üretici yığın raporundan alınmalıdır.`,
    }
  }

  if (eps.structure === EPS_STRUCT_STRIPLINE) {
    return {
      level: 'ok',
      text: `Stripline homojen dielektriktedir, εeff = εr = ${fmt(eps.epsEff, 4)}. Geometri bu değeri değiştirmez.`,
    }
  }

  return {
    level: 'warn',
    text: `εeff = ${fmt(eps.epsEff, 4)} microstrip geometrisinden kapalı formla hesaplandı (${eps.model}); aynı geometrinin Z₀ değeri ${fmt(eps.Z0, 4)} Ω. Bu değer alan çözücüden gelmediği için üretime hazır sayılmaz — buradan türeyen kritik uzunluk da aynı etiketi taşır.`,
  }
}

export function epsRangeNote(eps) {
  if (eps.source !== EPS_GEOMETRY || eps.inRange) return null
  return {
    level: 'danger',
    text: 'Girilen geometri kapalı formun güvenilir aralığının dışında. εeff sapması doğrudan kritik uzunluğa geçer: L_crit değeri √εeff ile ters orantılıdır.',
  }
}

export function reasonText(reason) {
  if (reason === REASON_EPS) {
    return 'Efektif dielektrik sabiti hesaplanamadı. Elle giriyorsanız değer 1\'den büyük olmalı; geometriden hesaplıyorsanız W, H ve εr değerlerini kontrol edin.'
  }
  if (reason === REASON_CRITICAL) {
    return 'Kritik uzunluk hesaplanamadı. Yükselme süresi ve kriter böleni pozitif, εeff 1\'den büyük olmalı.'
  }
  if (reason === REASON_BANDWIDTH) {
    return `Yükselme süresi bant genişliği hesaplanamadı. Katsayı K ${fmt(K_MIN, 3)} ile ${fmt(K_MAX, 3)} arasında olmalı.`
  }
  return `Tüm zorunlu alanlara pozitif sayısal değer girin; K katsayısı ${fmt(K_MIN, 3)}–${fmt(K_MAX, 3)} aralığında olmalıdır. Hat uzunluğu isteğe bağlıdır. Ondalık için nokta veya virgül kullanabilirsiniz (0.25 = 0,25).`
}

export function commentary(r) {
  if (!r.ok) return []

  const out = [epsSourceNote(r.eps)]
  const range = epsRangeNote(r.eps)
  if (range) out.push(range)

  out.push({
    level: 'ok',
    text: `Seçilen kriter ${DIVISOR_SHORT[r.divisor] ?? `1/${fmt(r.divisor, 3)}`}: kritik uzunluk ${fmtEng(r.critical, 'm', 4)}. Birim uzunluk gecikmesi ${fmt(r.tpdPsPerMm, 4)} ps/mm.`,
  })

  // Kriterin ne kadar belirleyici olduğunu üç değeri yan yana koyarak göster
  const spread = r.byDivisor.map((b) => `1/${fmt(b.divisor, 2)} → ${fmtEng(b.critical, 'm', 3)}`).join(', ')
  const widest = r.byDivisor.reduce((a, b) => (b.critical > a.critical ? b : a))
  const tightest = r.byDivisor.reduce((a, b) => (b.critical < a.critical ? b : a))

  out.push({
    level: 'warn',
    text: `Aynı yığın ve aynı yükselme süresiyle üç kriter üç farklı eşik veriyor: ${spread}. En gevşek kriter en konservatifin ${fmt(widest.critical / tightest.critical, 3)} katı uzunluk veriyor — "kritik uzunluk" tek bir fiziksel sayı değildir, hangi kriterin seçildiğine bağlıdır.`,
  })

  out.push({
    level: 'warn',
    text: 'Bu kriter mutlak fiziksel sınır değil, tasarım eşiğidir. Eşiğin altındaki hat iletim hattı olmaktan çıkmaz; yalnızca yansımaların etkisi çoğu tasarımda ihmal edilebilir kabul edilir. Saat, reset ve hızlı kenarlı kontrol hatlarında eşiğin altında da sonlandırma gerekebilir.',
  })

  if (r.hasLength) {
    // "2 kat" eşiği spec §7.4'ten gelmez; spec yalnızca L > L_crit
    // karşılaştırmasını tanımlar. Bu aracın mühendislik yargısı —
    // kullanıcıya LEVEL_SOURCE_NOTE ile yazılıyor.
    const level = r.ratio > 2 ? 'danger' : r.ratio > 1 ? 'warn' : 'ok'
    out.push({
      level,
      text: r.transmissionLine
        ? `Hat uzunluğu ${fmtEng(r.length, 'm', 4)}, kritik uzunluğun ${fmt(r.ratio, 4)} katı — seçilen kritere göre iletim hattı gibi davranıyor. Kontrollü empedans, sonlandırma ve dönüş yolu sürekliliği değerlendirilmelidir.`
        : `Hat uzunluğu ${fmtEng(r.length, 'm', 4)}, kritik uzunluğun ${fmt(r.ratio, 4)} katı — seçilen kriterin altında kalıyor. Bu kriterle hat toplu eleman gibi ele alınabilir.`,
    })

    out.push({
      level: 'ok',
      text: `Hat gecikmesi ${fmtEng(r.delay, 's', 4)}; yükselme süresinin ${fmt(r.delayFraction, 4)} katı. Kriter bu oranın 1/${fmt(r.divisor, 2)} = ${fmt(1 / r.divisor, 4)} değerini aşmasını eşik sayıyor.`,
    })

    // "0.5 oranı" da spec'te değil, bu aracın yargısı — bkz. LEVEL_SOURCE_NOTE.
    if (!r.transmissionLine && r.ratio > 0.5) {
      out.push({
        level: 'warn',
        text: 'Hat eşiğin altında ama sınıra yakın. Yığın toleransı, εeff belirsizliği veya sürücünün veri sayfasındakinden hızlı çıkan gerçek kenarı bu payı kolayca yer.',
      })
    }
  } else {
    out.push({
      level: 'ok',
      text: 'Hat uzunluğu girilmedi; yalnızca eşik hesaplandı. Karşılaştırma, gecikme oranı ve "iletim hattı gibi davranıyor mu" satırları için hat uzunluğunu girin.',
    })
  }

  out.push({
    level: 'warn',
    text: `Yükselme süresi bant genişliği f_BW = ${fmtEng(r.bw.fBW, 'Hz', 4)} (K = ${fmt(r.bw.k, 3)}). Bu değer VERİ HIZI DEĞİLDİR; sürücü kenarının kapladığı yaklaşık spektrum genişliğidir. Yığın, via ve dielektrik kayıp değerlendirmesi saat frekansına göre değil bu frekansa göre yapılır.`,
  })

  // Oran yalnızca K büyütüldüğünde bilgi taşır; K = K_MIN iken 1 katıdır.
  out.push({
    level: 'ok',
    text: r.bw.k > K_MIN
      ? `K = ${fmt(K_MIN, 3)} birinci dereceden eşdeğer sistem içindir; daha geniş spektral içerik tahmini için ${fmt(K_MAX, 3)}'e kadar seçilebilir. Seçilen K = ${fmt(r.bw.k, 3)} ile f_BW, ${fmt(K_MIN, 3)} katsayısına göre ${fmt(r.bw.k / K_MIN, 4)} katına çıkar.`
      : `K = ${fmt(K_MIN, 3)} seçili: aralığın en dar ucu, birinci dereceden eşdeğer sistem katsayısı. f_BW bu katsayıyla en düşük değerini alır; daha geniş spektral içerik tahmini için ${fmt(K_MAX, 3)}'e kadar yükseltilebilir ve f_BW aynı oranda büyür.`,
  })

  out.push({
    level: 'warn',
    text: 'Kritik uzunluk yükselme süresine bağlıdır, saat frekansına değil. Veri sayfasındaki tipik t_r değeri genellikle iyimserdir: aynı sürücü hızlı köşe (fast corner) koşulunda daha keskin kenar üretir ve eşik kısalır. Elinizde en hızlı kenarla hesaplayın.',
  })

  out.push({
    level: 'warn',
    text: LEGACY_METHOD_NOTE,
  })

  return out
}
