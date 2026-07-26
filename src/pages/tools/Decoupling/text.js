// Decoupling ağı ekranının kullanıcıya görünen metinleri.

import { fmt, fmtEng, fmtRes, fmtVolt } from '../../../lib/num'
import {
  MODE_MIN, MODE_NETWORK, MAX_SERIES,
  REASON_ROWS, REASON_SINGULAR, REASON_INVALID,
} from './model'

export const MODE_LABEL = {
  [MODE_MIN]: 'Minimum kapasite',
  [MODE_NETWORK]: 'Kapasitör ağı',
}

// Sonuç panelinde .method-note olarak durur — sonucun neyi içermediğini
// sonucun yanında söyler.
export const NOTE_MIN =
  'İdeal kapasite — ESR ve ESL etkisini içermez (spec §8.2). Başlangıç noktasıdır, ' +
  'kapasitör seçimi değildir.'

export const NOTE_NETWORK =
  'Seri RLC modeli yalnızca kapasitörün kendisini tanımlar. Montaj pedi, via ve düzlem ' +
  'yayılma endüktansı bu sonuca DAHİL DEĞİLDİR; ayrıca eklenmeli (spec §8.2.4).'

// Minimum kapasite grafiğinin x ekseni bu birimde çizilir. Model SI (V) üretir;
// çarpan units.js VOLTAGE tablosundan fromSI ile gelir. Eksen etiketi ve ölçek
// tek yerden — bu sabitten — beslendiği için sessizce ayrışamaz.
export const CHART_MIN_X_UNIT = 'mV'

export const CHART_MIN = {
  x: `İzin verilen gerilim değişimi ΔV (${CHART_MIN_X_UNIT})`,
  y: 'Minimum ideal kapasite C_min',
  caption:
    'C_min = ΔI·Δt / ΔV — izin verilen ripple daraldıkça gereken kapasite ters orantılı ' +
    'büyür. Eğri ideal kapasitörü gösterir; gerçek kapasitörde ESR ve ESL bu değeri yeterli ' +
    'olmaktan çıkarabilir.',
}

export const CHART_NET = {
  x: 'Frekans',
  y: '|Z| — logaritmik ölçek',
}

// Grafik açıklaması satır sayısına göre değişir: dörtten fazla kapasitör
// satırı varsa hangilerinin çizilmediği söylenir.
//
// Tepe cümlesi UYDURULMAZ: yalnızca modelin ürettiği peak / peakAbove /
// peakWorstSingle alanlarından kurulur. Tepe yoksa tepe cümlesi hiç yazılmaz;
// karşılaştırma yapılamıyorsa (tekil satır empedansı yoksa) karşılaştırma
// iddiası da yazılmaz.
export function netCaption(hidden, peak, peakAbove, peakWorstSingle) {
  const base =
    'Ağ toplam empedansı kompleks admitans toplamından gelir; bu yüzden anti-rezonans ' +
    'tepeleri eğride doğal olarak görünür.'

  let p
  if (!peak) {
    p = ' Tarama aralığında tepe bulunamadı.'
  } else {
    const head = ` En yüksek tepe ${fmtEng(peak.f, 'Hz', 3)} civarında, ${fmtRes(peak.mag, 3)}`
    if (peakWorstSingle == null) {
      p = `${head}; tekil satır empedansıyla karşılaştırılamadı.`
    } else if (peakAbove) {
      p = `${head}; bu tepe tekil satırların o frekanstaki empedansından (${fmtRes(peakWorstSingle, 3)}) yüksek — o bölgede kapasitör eklemek empedansı düşürmez, yükseltebilir.`
    } else {
      p = `${head}; bu tepe tekil satır empedanslarının (en yükseği ${fmtRes(peakWorstSingle, 3)}) altında kaldı.`
    }
  }

  const axis = ' Y ekseni logaritmiktir; etiketler gerçek empedans değerleridir.'
  const h = hidden > 0
    ? ` Grafikte ilk ${MAX_SERIES} kapasitör satırı çizildi; ${hidden} satır çizilmedi (ağ eğrisi hepsini içerir).`
    : ''
  return base + p + axis + h
}

export function reasonText(reason) {
  if (reason === REASON_SINGULAR) {
    return 'Her kapasitör satırı için ESR > 0 girin. Kayıpsız kapasitör kendi rezonans frekansında sıfır empedans verir, anti-rezonans tepesi ise sonsuza gider; bu yüzden sonuç üretilmez. Üretici veri sayfasındaki ESR değerini kullanın.'
  }
  if (reason === REASON_ROWS) {
    return 'Kapasitör satırlarındaki kapasite ve adet alanlarına pozitif değer girin; ESR ve ESL negatif olamaz. Ondalık için nokta veya virgül kullanabilirsiniz (0.25 = 0,25).'
  }
  if (reason === REASON_INVALID) {
    return 'Girdi hesap motoru tarafından reddedildi: kapasite, süre, gerilim değişimi, frekans ve adet pozitif olmalıdır.'
  }
  return 'Tüm zorunlu alanlara pozitif sayısal değer girin. Ondalık için nokta veya virgül kullanabilirsiniz (0.25 = 0,25).'
}

export function commentary(r) {
  if (!r.ok) return []
  return r.mode === MODE_MIN ? minNotes(r) : networkNotes(r)
}

function minNotes(r) {
  const out = []

  out.push({
    level: 'ok',
    text: `Minimum ideal kapasite ${fmtEng(r.C, 'F', 4)}; ani olayda çekilen yük ΔQ = ΔI·Δt = ${fmtEng(r.charge, 'C', 4)} ve bu yük ${fmtVolt(r.deltaV)} gerilim değişimiyle karşılanır.`,
  })

  out.push({
    level: 'warn',
    text: `Bu değer ESR ve ESL etkisini İÇERMEZ (motorun bildirdiği alan: ESR/ESL dahil = ${r.includesEsrEsl ? 'evet' : 'hayır'}). Gerçek kapasitörde ESR akım basamağında anlık bir gerilim düşümü üretir, ESL ise akımın hızlı değişimine direnir; ikisi de gerçek ripple'ı bu hesabın üstüne çıkarır.`,
  })

  out.push({
    level: 'warn',
    text: 'C_min bir BAŞLANGIÇ NOKTASIDIR, kapasitör seçimi değildir. Seçim, seçilen kapasitörün kendi ESR/ESL değerleriyle ve bağlantı endüktansıyla birlikte frekans alanında doğrulanmalıdır — kapasitör ağı modu bunun içindir.',
  })

  out.push({
    level: 'warn',
    text: 'Decoupling değeri işlemci clock frekansından tek başına seçilmez (spec §16 kritik uyarılar). Ani akım, izin verilen ripple, ESR, ESL ve bağlantı endüktansı birlikte değerlendirilir.',
  })

  out.push({
    level: 'ok',
    text: `Geçiş süresi ${fmtEng(r.deltaT, 's', 4)} kısaldıkça gereken kapasite azalır, ancak aynı yükün daha kısa sürede aktarılması gerekir; o bölgede sınırı kapasite değil, bağlantı endüktansı belirler.`,
  })

  return out
}

function networkNotes(r) {
  const out = []

  out.push({
    level: 'ok',
    text: `${fmtEng(r.f, 'Hz', 4)} frekansında ağ empedansı ${fmtRes(r.mag, 4)}; direnç bileşeni ${fmtRes(r.re, 4)}, reaktans ${fmtRes(r.im, 4)}. Ağda toplam ${fmt(r.count, 4)} kapasitör var.`,
  })

  r.items.forEach((it, i) => {
    const tag = `Satır ${i + 1} (${fmtEng(it.C, 'F', 3)} × ${fmt(it.count, 3)})`

    // ESL alanı zorunludur; boş bırakılan satır zaten reddedilir. Buraya
    // yalnızca kullanıcı ESL'ye açıkça 0 yazdığında düşülür.
    if (it.srf == null) {
      out.push({
        level: 'warn',
        text: `${tag}: ESL sıfır girildiği için kendi rezonans frekansı tanımsız — ESL'si olmayan ideal kapasitör hiçbir frekansta rezonansa girmez, empedansı frekans arttıkça düşmeye devam eder. Gerçek kapasitörün ESL'si sıfır olamaz ve kapasitör SRF üstünde endüktif davranır; üretici verisindeki gerçek ESL girilmeden bu satırın yüksek frekans davranışı temsil edilmiş sayılmaz.`,
      })
      return
    }

    const above = it.single?.aboveSrf
    out.push({
      level: above ? 'warn' : 'ok',
      text: above
        ? `${tag}: kendi rezonans frekansı ${fmtEng(it.srf, 'Hz', 4)}; değerlendirme frekansı bunun ÜSTÜNDE. Kapasitör bu frekansta ENDÜKTİF davranır — decoupling işlevi görmez, empedansı ${fmtRes(it.group?.mag ?? NaN, 4)} olarak ESL'si belirler.`
        : `${tag}: kendi rezonans frekansı ${fmtEng(it.srf, 'Hz', 4)}; değerlendirme frekansı bunun altında, kapasitif bölgede. Bu frekanstaki satır empedansı ${fmtRes(it.group?.mag ?? NaN, 4)}.`,
    })
  })

  if (r.peak) {
    out.push({
      level: 'warn',
      text: `Anti-rezonans tepesi ${fmtEng(r.peak.f, 'Hz', 4)} civarında: ağ empedansı orada ${fmtRes(r.peak.mag, 4)} değerine çıkıyor${r.peakWorstSingle != null ? `, aynı frekansta en yüksek tekil satır empedansı ise ${fmtRes(r.peakWorstSingle, 4)}` : ''}. Farklı değerli kapasitörler paralelken birinin endüktif, diğerinin kapasitif olduğu bölgede paralel rezonans oluşur ve empedans TEPE yapar${r.peakAbove ? '; tepe tek tek kapasitörlerin empedansından yüksektir' : ''}. Taramada ${fmt(r.peakCount, 3)} tepe bulundu.`,
    })
  } else {
    out.push({
      level: 'ok',
      text: '1 kHz – 1 GHz taramasında anti-rezonans tepesi bulunamadı. Tek tip kapasitörde tepe beklenmez; farklı değerler eklendiğinde aralarındaki bölgede tepe oluşur.',
    })
  }

  out.push({
    level: r.inductive ? 'warn' : 'ok',
    text: r.inductive
      ? 'Ağ bu frekansta ENDÜKTİF (reaktans pozitif). Endüktif bölgede paralel eklenen her yeni kapasite yeni bir anti-rezonans tepesi üretebilir; empedansı düşürmesi garanti değildir.'
      : 'Ağ bu frekansta kapasitif (reaktans negatif); kapasite eklemek empedansı bu bölgede düşürür.',
  })

  out.push({
    level: 'warn',
    text: `ESR/N ve ESL/N ölçeklemesi yalnızca kapasitörlerin bağımsız ve eşit bağlantı yolları varsa geçerlidir (spec §8.2.2). Ortak via veya ortak dar bir bağlantı varsa ESL tam olarak 1/N azalmaz. Motorun bildirdiği ideal paylaşım varsayımı: ${r.idealSharing ? 'evet' : 'hayır'} — bu bir varsayım bildirimidir, yerleşimin doğrulaması değildir.`,
  })

  out.push({
    level: 'warn',
    text: 'Sonuç yalnızca kapasitörlerin kendisini içerir. Montaj pedi, via ve düzlem yayılma endüktansı toplam bağlantı loop endüktansına eklenmelidir (spec §8.2.4); o hesap PDN ekranındadır ve yüksek frekansta baskın terim genellikle odur.',
  })

  out.push({
    level: 'warn',
    text: 'Decoupling değeri işlemci clock frekansından tek başına seçilmez (spec §16 kritik uyarılar). Ani akım, izin verilen ripple, ESR, ESL ve bağlantı endüktansı birlikte değerlendirilir.',
  })

  if (r.aboveCount > 0) {
    out.push({
      level: 'warn',
      text: `${fmt(r.aboveCount, 3)} satır değerlendirme frekansında kendi rezonans frekansının üstünde. Bu satırlar o frekansta kapasitör gibi değil, endüktans gibi davranır; ihtiyaç duyulan bant için daha küçük değerli ve daha düşük ESL'li kapasitör gerekir.`,
    })
  }

  return out
}
