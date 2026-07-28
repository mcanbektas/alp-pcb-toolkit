// PDN hedef empedansı ekranının kullanıcıya görünen metinleri.
// Model yalnızca kod döner; Türkçe karşılıklar burada üretilir.

import { fmt, fmtEng, fmtRes, fmtVolt } from '../../../lib/num'
import {
  SRC_TOLERANCE, SRC_DIRECT, OFF, ON,
  REASON_INCOMPLETE, REASON_TARGET, REASON_ROWS, REASON_PLANE, REASON_CURVE,
  REASON_LOOP, REASON_ESR_ZERO,
} from './model'

export const SOURCE_LABEL = {
  [SRC_TOLERANCE]: 'Ray gerilimi + tolerans %',
  [SRC_DIRECT]: 'Doğrudan izin verilen ΔV',
}

export const TOGGLE_LABEL = {
  [OFF]: 'Hayır',
  [ON]: 'Evet',
}

export const LOOP_TERM_LABEL = {
  component: 'komponent ESL',
  mount: 'montaj (L_mount)',
  via: 'via (L_via)',
  spread: 'düzlem yayılması (L_yayılma)',
}

// Sonuç panelinde her zaman duran yöntem etiketi: hedef sabit ve yataydır.
export const FLAT_TARGET_NOTE =
  'Sabit yatay hedef empedans yaklaşımı — tek bir Z_hedef değeri tüm frekanslar için ' +
  'kullanılır. Frekansa bağlı hedef profil bu araçta YOK: gelişmiş tasarımda böyle bir ' +
  'profil kullanılabilir ama doğrulanmış bir denklemi olmadığı için uydurulmadı.'

// Eğri çizildiğinde eklenen ikinci etiket (spec §8.2.4).
export const MOUNTING_NOTE =
  'PDN eğrisi bağlantı loop endüktansını İÇERMEZ; ESL_komponent + L_mount + L_via + ' +
  'L_yayılma toplamı ayrı değerlendirilir.'

export const CHART = {
  x: 'Frekans (Hz)',
  y: '|Z| (Ω, log ölçek)',
  caption:
    'Her iki eksen de logaritmiktir: |Z| ekseni log₁₀ değeriyle çizilir, eksen ' +
    'etiketleri gerçek empedansı gösterir. Böylece milliohm bölgesindeki davranış ile ' +
    'anti-rezonans tepesi aynı grafikte okunabilir; doğrusal ölçekte tepe ölçeği kendine ' +
    'çeker ve hedefin yakını eksenin dibinde düz çizgiye iner. Kesikli çizgi hedef ' +
    'empedans, işaretli nokta çalışma frekansıdır — çalışma frekansı taranan 1 kHz – ' +
    '1 GHz aralığının dışındaysa işaretçi çizilmez. Sayısal okuma için veri tablosunu açın.',
}

// Çalışma frekansı sabit tarama aralığının dışında kaldığında sonuç tablosunda
// "En kötü nokta" satırının yanına düşen not.
export const FOP_OUTSIDE_NOTE =
  'çalışma frekansı bu aralığın dışında — grafikte işaretçi çizilmedi'

export const CHART_EMPTY =
  'PDN eğrisi çizilmedi. Eğri için soldaki "PDN eğrisini de çiz" seçimini açın; en az ' +
  'bir kapasitör satırı (kapasite, ESR > 0, ESL, adet), bir çalışma frekansı ve ' +
  'isteğe bağlı olarak VRM direnci/endüktansı ile düzlem verisi gerekir. Grafik, ' +
  'eğriyi hedef empedans çizgisiyle aynı eksende gösterir.'

export function reasonText(reason) {
  if (reason === REASON_TARGET) {
    return 'Hedef empedans için pozitif bir ani yük değişimi (ΔI) ve izin verilen gerilim değişimi gerekir. ΔV\'yi ya doğrudan girin ya da ray gerilimi ile tolerans yüzdesinden türetin.'
  }
  if (reason === REASON_ESR_ZERO) {
    return 'Kapasitör satırlarından en az birinde ESR sıfır. Kayıpsız kapasitör bu modelde dejenere: kendi rezonans frekansında empedansı tam sıfır, anti-rezonans tepesi ise sonsuz çıkar ve sonuç fizik değil yuvarlama gürültüsü olur. Her satıra veri sayfasından okunan bir ESR girin (seramikte tipik olarak birkaç mΩ ile birkaç yüz mΩ arası).'
  }
  if (reason === REASON_ROWS) {
    return 'Kapasitör bankası satırlarında eksik veya geçersiz değer var. Her satırda kapasite pozitif, ESR ve ESL negatif olmayan, adet en az 1 olmalı.'
  }
  if (reason === REASON_PLANE) {
    return 'Düzlem kapasitesi için örtüşen alan ve dielektrik kalınlığı pozitif, dielektrik sabiti εr ≥ 1 olmalı.'
  }
  if (reason === REASON_CURVE) {
    return 'PDN eğrisi için çalışma frekansı pozitif olmalı ve en az bir bileşen bulunmalı: kapasitör bankası, VRM (direnç veya endüktans) ya da düzlem kapasitesi.'
  }
  if (reason === REASON_LOOP) {
    return 'Bağlantı loop endüktansı için dört terimden (komponent ESL, L_mount, L_via, L_yayılma) en az biri pozitif olmalı.'
  }
  if (reason === REASON_INCOMPLETE) {
    return 'Tüm zorunlu alanlara pozitif sayısal değer girin. Ondalık için nokta veya virgül kullanabilirsiniz (0.25 = 0,25).'
  }
  return 'Girdileri kontrol edin.'
}

export function commentary(r) {
  if (!r.ok) return []
  const out = []

  // --- Hedef empedans ---
  out.push({
    level: 'ok',
    text: `Hedef empedans Z_hedef = ${fmtRes(r.Ztarget, 4)}; izin verilen gerilim değişimi ${fmtVolt(r.deltaV)} ile ani yük değişimi ${fmtEng(r.deltaI, 'A', 4)} oranından geldi.`,
  })

  out.push({
    level: 'ok',
    text: r.fromTolerance
      ? `ΔV ray geriliminden türetildi: ${fmtVolt(r.Vrail)} × %${fmt(r.tolerancePct, 3)} = ${fmtVolt(r.deltaV)}.`
      : `ΔV doğrudan girildi (${fmtVolt(r.deltaV)}); ray gerilimi ve tolerans yüzdesi bu hesaba girmedi.`,
  })

  out.push({
    level: 'warn',
    text: 'Bu hedef SABİT YATAY bir yaklaşımdır: bütün frekanslarda tek bir Z_hedef geçerli sayılır. Gelişmiş tasarımda frekansa bağlı hedef profil kullanılabilir; böyle bir profilin doğrulanmış bir denklemi olmadığı için araçta uygulanmadı ve hafızadan tamamlanmadı.',
  })

  // --- Düzlem kapasitesi ---
  if (r.plane) {
    out.push({
      level: 'ok',
      text: `Düzlem kapasitesi C_düzlem = ${fmtEng(r.plane.C, 'F', 4)} (A/d oranından). Bu kapasite düşük endüktanslıdır ve eğrinin yüksek frekans ucunda etkilidir.`,
    })
    out.push({
      level: 'warn',
      text: 'Düzlem kapasitesi kenar saçılmasını İÇERMEYEN paralel plaka denklemidir: yalnızca A/d oranını görür. Gerçek kapasite bu değerin biraz üzerindedir; küçük alan / kalın dielektrik durumunda fark büyür.',
    })
  }

  // --- PDN eğrisi ---
  if (r.curve) {
    const c = r.curve
    const s = c.sweep

    out.push({
      level: r.belowTarget ? 'ok' : 'danger',
      text: r.belowTarget
        ? `Çalışma frekansı ${fmtEng(c.fOp, 'Hz', 4)} noktasında |Z_PDN| = ${fmtRes(c.z.mag, 4)}, hedefin (${fmtRes(r.Ztarget, 4)}) altında.`
        : `Çalışma frekansı ${fmtEng(c.fOp, 'Hz', 4)} noktasında |Z_PDN| = ${fmtRes(c.z.mag, 4)} ve hedefi (${fmtRes(r.Ztarget, 4)}) AŞIYOR. Bu frekansta yük akımı sıçraması izin verilen ΔV'den büyük bir dalgalanma üretir.`,
    })

    if (!s.worst) {
      out.push({
        level: 'warn',
        text: 'Frekans taraması bu girdilerle sonuç üretmedi; eğri yalnızca çalışma frekansındaki tek nokta ile değerlendirildi.',
      })
    } else if (s.exceedCount === 0) {
      out.push({
        level: 'ok',
        text: `Taranan 1 kHz – 1 GHz aralığının tamamında eğri hedefin altında kaldı; en yüksek nokta ${fmtRes(s.worst.mag, 4)} @ ${fmtEng(s.worst.f, 'Hz', 4)}.`,
      })
    } else {
      const all = s.exceedCount === s.total
      const list = s.bands
        .map((b) => `${fmtEng(b.from, 'Hz', 3)} – ${fmtEng(b.to, 'Hz', 3)}`)
        .join('; ')
      out.push({
        level: all ? 'danger' : 'warn',
        text: all
          ? `Eğri taranan 1 kHz – 1 GHz aralığının tamamında hedefin üzerinde. En kötü nokta ${fmtRes(s.worst.mag, 4)} @ ${fmtEng(s.worst.f, 'Hz', 4)} — hedefin ${fmt(s.worst.mag / r.Ztarget, 3)} katı.`
          : `Eğri hedefi ${s.bands.length === 1 ? 'şu bantta' : `${fmt(s.bands.length, 2)} ayrı bantta`} aşıyor: ${list}. En kötü nokta ${fmtRes(s.worst.mag, 4)} @ ${fmtEng(s.worst.f, 'Hz', 4)} — hedefin ${fmt(s.worst.mag / r.Ztarget, 3)} katı. Bu bantlarda ani yük değişimi izin verilen ΔV'den büyük dalgalanma üretir.`,
      })
    }

    if (c.z.inductive || s.anyInductive) {
      out.push({
        level: 'warn',
        text: `ANTİ-REZONANS UYARISI: ağ ${c.z.inductive ? 'çalışma frekansında' : 'taranan aralığın bir bölümünde'} ENDÜKTİF davranıyor. Endüktif bölgede paralel kapasite eklemek empedansı DÜŞÜRMEZ; eklenen kapasite mevcut endüktansla bir paralel rezonans kurar ve tam o frekansta bir TEPE üretir. Sezgiye aykırıdır: "daha çok kapasitör her zaman daha iyi" doğru değildir. Çözüm kapasite eklemek değil, endüktansı (montaj, via, yayılma) küçültmek ya da tepeyi sönümleyecek ESR'li bir kapasitör seçmektir.`,
      })
    } else {
      out.push({
        level: 'ok',
        text: 'Taranan aralıkta ağ endüktif bölgeye girmedi; bu aralıkta paralel kapasite eklemek empedansı beklendiği gibi düşürür.',
      })
    }

    if (c.z.losslessPlane) {
      out.push({
        level: 'warn',
        text: 'Düzlem KAYIPSIZ modellendi: eğriye yalnızca jωC terimi olarak girer. Kayıpsız düzlemin ürettiği anti-rezonans tepesi sönümsüzdür; gerçek düzlemde dielektrik ve bakır kaybı vardır ve gerçek tepe buradakinden ALÇAKTIR. Bu eğrideki tepe yüksekliğini üst sınır olarak okuyun.',
      })
    }

    out.push({
      level: 'warn',
      text: 'Eğri, kapasitörlerin bağlantı loop endüktansını İÇERMEZ; bu endüktans eğriye girmeyen, ayrı toplanan bir terimdir. Gerçek eğri, montaj ve via endüktansı yüzünden yüksek frekansta buradakinden daha yüksektir.',
    })

    if (c.shared) {
      out.push({
        level: 'warn',
        text: `Bankada aynı satırda birden çok kapasitör var (toplam ${fmt(c.capCount, 4)} adet). Model, N adet kapasitörün ESL'ini 1/N ile ölçekler; bu yalnızca her kapasitörün BAĞIMSIZ ve eşit bir bağlantı yolu varsa geçerlidir. Ortak via veya ortak dar bir bağlantı varsa ESL 1/N azalmaz ve gerçek empedans daha yüksek çıkar.`,
      })
    }

    out.push({
      level: 'warn',
      text: 'VRM için doğrulanmış bir model YOK. Burada girilen değerlerle R + jωL alındı; ωL endüktif reaktansın tanımıdır, uydurulmuş bir VRM modeli değildir. Gerçek VRM kontrol döngüsünün bant genişliği bu basit modelde yoktur.',
    })
  } else {
    out.push({
      level: 'ok',
      text: 'PDN eğrisi çizilmedi; ekran yalnızca hedef empedansı veriyor. Hedefin karşılanıp karşılanmadığını görmek için VRM, kapasitör bankası ve düzlem verisiyle eğriyi açın; eğri hedef çizgisiyle aynı grafikte gösterilir.',
    })
  }

  // --- Bağlantı loop endüktansı ---
  if (r.loop) {
    out.push({
      level: 'ok',
      text: `Bağlantı loop endüktansı toplamı L_loop = ${fmtEng(r.loop.total, 'H', 4)}; baskın terim ${LOOP_TERM_LABEL[r.dominant]}, payı %${fmt(r.loop.shares[r.dominant] * 100, 3)}. Empedansı düşürmek için önce bu terime dokunun.`,
    })
    out.push({
      level: 'warn',
      text: 'Bu toplam PDN eğrisine DAHİL DEĞİLDİR ve ayrı değerlendirilmelidir. Loop endüktansı, kapasitörün veri sayfasındaki ESL değerinden bağımsız olarak yüksek frekansta empedansın gerçek tabanını belirler.',
    })
    out.push({
      level: 'warn',
      text: 'Dört terim yalnızca TOPLANIR; L_mount, L_via ve L_yayılma için bu araçta bir denklem YOK. Bu değerler kullanıcıdan ya da alan çözücüden gelir; araç bunları hesaplamaz, yalnızca toplar ve payları gösterir.',
    })
  }

  return out
}
