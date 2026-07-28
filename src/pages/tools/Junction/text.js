// Junction sıcaklığı ve soğutucu ekranının kullanıcıya görünen metinleri.

import { fmt, fmtWatt } from '../../../lib/num'
import {
  MODE_JUNCTION, MODE_HEATSINK, MODE_SURFACE,
  PSI_JT, PSI_JB, COPPER_OFF, COPPER_ON,
  REASON_ENGINE, REASON_TJMAX_LE_TA,
} from './model'

// --- Marj eşiği ---
//
// DİKKAT: bu eşik MÜHENDİSLİK YORUMUDUR, docs/spec.md §8.3 – §8.6'dan GELMEZ.
// thermal.js yalnızca margin ve within üretir, bir eşik tanımlamaz; spec de
// junction sıcaklığı için kabul edilebilir marj sınırı vermez. Aşağıdaki değer
// yaygın bir başlangıç kabulü olarak seçilmiştir ve spec'ten doğrulanamaz.
export const MARGIN_WARN_C = 10

export const MARGIN_THRESHOLD_NOTE =
  `Marj eşiği (${MARGIN_WARN_C} °C altı uyarı) bu ekranın mühendislik yorumudur; ` +
  'kullanılan termal direnç denklemleri böyle bir sınır tanımlamaz. Gereken marj ortam ' +
  'sıcaklığı aralığına, θ değerlerindeki üretim saçılmasına ve komponentin ömür hedefine ' +
  'göre değişir.'

export const MODE_LABEL = {
  [MODE_JUNCTION]: 'Junction (θ_JA)',
  [MODE_HEATSINK]: 'Soğutucu',
  [MODE_SURFACE]: 'Yüzey ölçümü',
}

export const METRIC_LABEL = {
  [PSI_JT]: 'Paket üstünden ölçüm (Ψ_JT)',
  [PSI_JB]: 'Kart üzerinden ölçüm (Ψ_JB)',
}

export const METRIC_SHORT = {
  [PSI_JT]: 'Ψ_JT',
  [PSI_JB]: 'Ψ_JB',
}

export const COPPER_LABEL = {
  [COPPER_OFF]: 'Hesaplama',
  [COPPER_ON]: 'Bakır şerit + dielektrik paralel yolunu ekle',
}

// Sonuç panelinde .method-note olarak durur.
export const THETA_NOTE =
  'θ_JA paketin değişmez fiziksel özelliği DEĞİLDİR. Test kartı, bakır alanı, hava akışı ' +
  've montaj şartlarından etkilenir; katalog değeri üreticinin test kartına aittir. Kendi ' +
  'kartınızda ölçülen değer belirgin biçimde farklı çıkabilir.'

export const PSI_NOTE =
  'Ψ ve θ aynı şey değildir. θ_JC tek boyutlu bir yol direncidir; Ψ_JT ise paketten dışarı ' +
  'kaçan ısının yalnızca bir kısmını gören ampirik bir metriktir. Paket üstünden ölçüm ' +
  'yapıldığında θ_JC doğrudan kullanılmaz — üreticinin Ψ değeri gerekir.'

export const FIRST_ORDER_NOTE =
  'Bakır termal ağı sonucu ilk derece termal ağ tahminidir: yalnızca iletim yolu ' +
  'modellenmiştir.'

export const CHART = {
  [MODE_JUNCTION]: {
    x: 'Güç kaybı P (W)',
    y: 'Junction sıcaklığı T_J (°C)',
    caption: 'T_J güçle doğrusal artar; eğrinin eğimi θ_JA değeridir. Referans çizgi izin verilen T_J,max, işaret ise çalışma noktasıdır.',
  },
  [MODE_HEATSINK]: {
    x: 'Soğutucu direnci θ_SA (°C/W)',
    y: 'Junction sıcaklığı T_J (°C)',
    caption: 'Soğutucu direnci arttıkça T_J doğrusal yükselir. Eğrinin T_J,max çizgisini kestiği yer θ_SA,max değeridir; sağındaki her soğutucu sınırın dışında kalır.',
  },
  [MODE_SURFACE]: {
    x: 'Güç kaybı P (W)',
    y: 'Tahmini junction sıcaklığı T_J (°C)',
    caption: 'Ölçülen yüzey sıcaklığı sabit tutulduğunda tahmin güçle doğrusal artar; eğim Ψ değeridir.',
  },
}

export function chartEmpty(r) {
  if (r.ok && r.mode === MODE_HEATSINK && !r.feasible) {
    return 'Termal bütçe paket ve arayüz direnciyle zaten tükendiği için θ_SA taraması yapılamıyor: hiçbir soğutucu direnci T_J değerini sınırın altına indirmez.'
  }
  return 'Grafik için geçerli girdi gerekli.'
}

export function reasonText(reason) {
  if (reason === REASON_TJMAX_LE_TA) {
    return 'İzin verilen junction sıcaklığı (T_J,max) ortam sıcaklığından (T_A) büyük olmalı. Eşit veya küçükken komponent hiç güç harcamadan sınırın dışında kalır; çekilebilecek en yüksek güç negatife düşer ve sonuç anlamsız olur. Ortam sıcaklığını düşürün veya sınırı daha yüksek bir komponent seçin.'
  }
  if (reason === REASON_ENGINE) {
    return 'Girilen değerlerle termal model kurulamıyor. Güç pozitif, termal dirençler negatif olmayan sayılar olmalı ve izin verilen junction sıcaklığı ortam sıcaklığından büyük olmalıdır.'
  }
  return 'Tüm zorunlu alanlara sayısal değer girin. Ondalık için nokta veya virgül kullanabilirsiniz (0.25 = 0,25).'
}

// Termal yolun baskın parçası — iyileştirme oradan seçilir
function dominantPath(shares) {
  const list = [
    { key: 'jc', label: 'paket içi yol (θ_JC)', v: shares.jc },
    { key: 'cs', label: 'termal arayüz (θ_CS)', v: shares.cs },
    { key: 'sa', label: 'soğutucu (θ_SA)', v: shares.sa },
  ]
  return list.reduce((a, b) => (b.v > a.v ? b : a))
}

export function commentary(r) {
  if (!r.ok) return []
  const out = []

  // --- §8.3 Junction ---
  if (r.mode === MODE_JUNCTION) {
    out.push({
      level: 'ok',
      text: `T_J = T_A + P·θ_JA = ${fmt(r.Ta, 4)} °C + ${fmtWatt(r.P)}·${fmt(r.thetaJA, 4)} °C/W = ${fmt(r.Tj, 4)} °C; sıcaklık artışı ${fmt(r.rise, 4)} °C.`,
    })

    if (Number.isFinite(r.Pmax)) {
      out.push({
        level: 'ok',
        text: `Bu θ_JA ile çekilebilecek en yüksek güç ${fmtWatt(r.Pmax)}; şu anki güç bunun %${fmt(r.utilisation * 100, 3)} kadarı.`,
      })
    }
  }

  // §8.3'ün açık uyarısı — motorun taşıdığı alana bağlı, her zaman görünür
  if (r.thetaIsBoardDependent) {
    out.push({ level: 'warn', text: THETA_NOTE })
  }

  // --- §8.4 Soğutucu ---
  if (r.mode === MODE_HEATSINK) {
    out.push({
      level: 'ok',
      text: `Termal bütçe (T_J,max − T_A)/P = ${fmt(r.budget, 4)} °C/W; bunun ${fmt(r.thetaJC, 4)} °C/W kadarı pakette, ${fmt(r.thetaCS, 4)} °C/W kadarı termal arayüzde harcanıyor.`,
    })

    if (r.negativeSink) {
      out.push({
        level: 'danger',
        text: `Gereken θ_SA,max = ${fmt(r.thetaSAmax, 4)} °C/W, yani negatif: paket ve arayüz direnci tek başına termal bütçeyi aşıyor. Hiçbir soğutucu bu durumu çözmez — gücü azaltın, hava akışını artırın veya farklı paket seçin.`,
      })
    } else {
      out.push({
        level: 'ok',
        text: `Soğutucu için kalan pay ${fmt(r.thetaSAmax, 4)} °C/W. Katalogdan seçilecek θ_SA bu değerin altında olmalı; üstündeki her soğutucu T_J,max sınırını aştırır.`,
      })
      out.push({
        level: 'warn',
        text: 'Soğutucu katalog değeri belirli bir hava akışı, montaj yönü ve yüzey işlemi içindir. Doğal konveksiyonda ve sıkışık kutuda gerçek θ_SA katalog değerinin üstüne çıkar; termal arayüz malzemesinin montaj basıncı da θ_CS değerini değiştirir.',
      })
    }

    if (r.hasSink && Number.isFinite(r.Tj)) {
      const dom = dominantPath(r.shares)
      out.push({
        level: 'ok',
        text: `Seçilen θ_SA = ${fmt(r.thetaSA, 4)} °C/W ile toplam yol ${fmt(r.thetaTotal, 4)} °C/W ve T_J = ${fmt(r.Tj, 4)} °C.`,
      })
      out.push({
        level: 'ok',
        text: `Termal yolun baskın parçası ${dom.label}: toplam direncin %${fmt(dom.v * 100, 3)} kadarı orada. İyileştirme önce oradan yapılır; diğer parçaları küçültmek sonucu az değiştirir.`,
      })
    } else if (!r.negativeSink) {
      out.push({
        level: 'warn',
        text: 'Soğutucu direnci girilmedi; ekran yalnızca gereken üst sınırı veriyor. Seçilen soğutucunun θ_SA değerini girerseniz T_J, marj ve yol payları da hesaplanır.',
      })
    }
  }

  // --- §8.5 Yüzey ölçümü ---
  if (r.mode === MODE_SURFACE) {
    out.push({
      level: 'ok',
      text: `Ölçülen ${fmt(r.Tsurface, 4)} °C üzerine Ψ·P = ${fmt(r.psi, 4)} °C/W · ${fmtWatt(r.P)} = ${fmt(r.rise, 4)} °C eklenerek T_J ≈ ${fmt(r.Tj, 4)} °C bulundu.`,
    })

    // Spec §8.5 bu ayrımın açıkça anlatılmasını istiyor
    out.push({ level: 'warn', text: PSI_NOTE })

    out.push({
      level: 'warn',
      text: `Kullanılan metrik ${METRIC_SHORT[r.metric]}; motorun sonucu bu değerin bir yol direnci olmadığını taşıyor. Ψ değeri yalnızca üreticinin tanımladığı ölçüm noktasıyla birlikte anlamlıdır — ${r.metric === PSI_JT ? 'paket üstü' : 'kart üzeri'} dışında bir noktadan ölçtüyseniz sonuç geçersizdir.`,
    })

    if (r.within === false) {
      out.push({
        level: 'danger',
        text: `Tahmini T_J = ${fmt(r.Tj, 4)} °C, izin verilen ${fmt(r.TjMax, 4)} °C değerinin üzerinde.`,
      })
    } else if (r.within === true) {
      out.push({
        level: 'ok',
        text: `Tahmini T_J = ${fmt(r.Tj, 4)} °C, izin verilen ${fmt(r.TjMax, 4)} °C değerinin altında.`,
      })
    }
  }

  // --- Marj kontrolü (motorun within/margin alanı olan modlar) ---
  if (Number.isFinite(r.margin)) {
    if (r.within === false) {
      out.push({
        level: 'danger',
        text: `T_J = ${fmt(r.Tj, 4)} °C, izin verilen ${fmt(r.TjMax, 4)} °C sınırının ${fmt(Math.abs(r.margin), 4)} °C üzerinde. Bu haliyle komponent sınırın dışında çalışır.`,
      })
    } else if (r.margin < MARGIN_WARN_C) {
      out.push({
        level: 'warn',
        text: `Marj yalnızca ${fmt(r.margin, 4)} °C. ${MARGIN_WARN_C} °C altındaki marj; ortam sıcaklığındaki dalgalanma, θ değerlerindeki üretim saçılması ve montaj farklarıyla kolayca tükenir. ${MARGIN_THRESHOLD_NOTE}`,
      })
    } else {
      out.push({
        level: 'ok',
        text: `T_J,max sınırına ${fmt(r.margin, 4)} °C marj var.`,
      })
    }
  }

  // --- §8.6 Bakır termal ağı ---
  if (r.copperOn && r.copper) {
    const c = r.copper
    const stripShare = c.eq.shares[0]
    const dielShare = c.eq.shares[1]
    const dominant = stripShare >= dielShare ? 'bakır şerit' : 'dielektrik'

    out.push({
      level: 'ok',
      text: `Bakır şerit ${fmt(c.strip.Rth, 4)} °C/W, dielektrik ${fmt(c.dielectric.Rth, 4)} °C/W; paralel eşdeğer ${fmt(c.eq.Rth, 4)} °C/W ve ΔT = P·R_θ,eq = ${fmt(c.rise.deltaT, 4)} °C.`,
    })

    out.push({
      level: 'ok',
      text: `Isının %${fmt(stripShare * 100, 3)} kadarı bakır şeritten, %${fmt(dielShare * 100, 3)} kadarı dielektrikten geçiyor; baskın yol ${dominant}. Bakır alanını büyütmek yalnızca baskın yol bakırken işe yarar.`,
    })

    out.push({
      level: 'warn',
      // Motor yön iddiası taşımıyor (temperatureRise yalnızca firstOrder + excludes
      // döner) ve spec §8.6 da sapmanın yönünü söylemiyor: listedeki etkilerin bir
      // kısmı sonucu aşağı, bir kısmı yukarı çeker. Yön uydurulmaz.
      text: `${FIRST_ORDER_NOTE} Modelde bulunmayanlar: ${c.rise.excludes.join(', ')}. Bu etkiler sonucu iki yöne de kaydırabilir (paralel ısı yolları düşürür, komşu ısı kaynakları yükseltir); sonucu tasarım kararı için tek başına kullanmayın.`,
    })
  }

  return out
}
