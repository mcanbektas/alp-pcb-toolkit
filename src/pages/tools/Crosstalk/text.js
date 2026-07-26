// Crosstalk kestirimi ekranının kullanıcıya görünen metinleri.
// Hata kodları ve bulgu seviyeleri burada Türkçeye çevrilir; model.js metin bilmez.

import { fmt, fmtEng } from '../../../lib/num'
import { EPS_GEOMETRY, EPS_STRUCT_STRIPLINE } from '../../../lib/epsEff'
import {
  REASON_EPS, REASON_GEOMETRY, REASON_COUPLING, REASON_CROSSTALK,
} from './model'

// NEXT ve FEXT yüzdesi eşikleri MÜHENDİSLİK YORUMUDUR — docs/spec.md bu sayıları
// vermez. Spec §7.6 bir kabul sınırı tanımlamaz; kabul edilebilir crosstalk
// seviyesi alıcının gürültü bütçesinden çıkar. Aşağıdaki üç bölge yalnızca
// "bakılması gereken yer" işaretidir, geçti/kaldı kararı değildir.
export const NEXT_PCT_WARN = 5
export const NEXT_PCT_DANGER = 15

export const THRESHOLD_NOTE =
  'NEXT ve FEXT yüzdesi için kullanılan %5 ve %15 eşikleri bu ekranın mühendislik yorumudur; ' +
  'docs/spec.md bu sayıları vermez. Gerçek sınır alıcının gürültü bütçesinden çıkar.'

export const METHOD_NOTE =
  'Kestirim modu — spec §7.6\'nın istediği çok iletkenli iletim hattı çözümü UYGULANMADI. ' +
  'Spec kapasitans matrisini 2B alan çözücüden, endüktans matrisini L = μ₀ε₀·C₀⁻¹ ile, ' +
  'iletkenlik matrisini G ≈ ω·tanδ·C ile istiyor; aggressor sinyali FFT ile frekans alanına ' +
  'taşınacak, her frekansta e^(−Mℓ) çözülecek ve IFFT ile NEXT/FEXT dalga biçimi üretilecekti. ' +
  'Alan çözücü olmadığı için bu adımların hiçbiri yapılmadı. Buradaki sayı bir dalga biçimi ' +
  'değil, kaba bir tepe değer kestirimidir.'

export const SOURCE_NOTE =
  'Kullanılan K_b = (Z_even − Z_odd)/(2·(Z_even + Z_odd)), L_sat = t_r/(2·t\'_pd) ve ' +
  'V_FEXT ≈ (Δt/t_r)·V_agg/2 ifadelerinin KAYNAĞI docs/spec.md\'de YOK — sayısal biçimleri ' +
  've geçerlilik aralıkları spec\'ten doğrulanamıyor. Sonucun yöntem alanı bu yüzden ' +
  '`empirical-coupling`, kapalı form sonuçlarının taşıdığı `closed-form` değil. Bu ekranla ' +
  'üretim kararı vermeyin.'

export const THREE_W_NOTE =
  'Spec §7.6\'da birebir tanımlı tek ifade S ≥ 3·W geometrik kontrolüdür ve spec bunun ' +
  'yalnızca görsel bir tasarım kontrolü olduğunu, crosstalk hesabı olmadığını açıkça söyler. ' +
  'Sağlandığında "3W geometrik kuralı sağlandı" denir; "crosstalk yoktur" DENMEZ.'

export const MODAL_EPS_HINT =
  'Bu iki değer diferansiyel çift ekranından ALINAMAZ: o ekran tek bir εeff kullanır, iki modu ' +
  'aynı hızda kabul eder ve bu varsayım altında FEXT özdeş olarak sıfır çıkar — microstrip\'te ' +
  'bu YANLIŞTIR. Değerler 2B alan çözücüden ya da üretici yığın raporundan gelmelidir. ' +
  'Her iki değer de 1\'den küçük olamaz.'

export const CHART = {
  x: 'Paralel uzunluk (mm)',
  y: 'NEXT tepe gerilimi (V)',
  caption:
    'Spec §7.6\'nın çıktı listesi HAT ARALIĞI DUYARLILIK GRAFİĞİ istiyor; burada onun yerine ' +
    'paralel uzunluk taraması çiziliyor. Nedeni: bu ekranda Z_odd ve Z_even kullanıcıdan gelir ' +
    've hat aralığına bağlı bir modelleri yoktur — aralık süpürüldüğünde K_b hiç değişmez, ' +
    'dolayısıyla duyarlılık eğrisi üretilemez. Aralık duyarlılığı için Z_odd/Z_even\'in aralıkla ' +
    'birlikte değişmesi gerekir; o da kapasitans matrisi, yani 2B alan çözücü işidir. ' +
    'Çizilen eğri: paralel uzunluk arttıkça NEXT doğrusal büyür, doyma uzunluğu ' +
    'L_sat = t_r/(2·t\'_pd) noktasından sonra artmaz — daha uzun kuplaj yalnızca darbeyi uzatır, ' +
    'tepesini yükseltmez. Eğrinin sağ tarafındaki düzlük budur. Bu davranış kestirimin ' +
    'varsayımıdır; spec\'in istediği çok iletkenli çözümden gelmez.',
}

export function reasonText(reason) {
  if (reason === REASON_EPS) {
    return 'Efektif dielektrik sabiti hesaplanamadı. Elle giriyorsanız değer 1\'den büyük olmalı; geometriden hesaplıyorsanız W, H ve εr değerlerini kontrol edin.'
  }
  if (reason === REASON_GEOMETRY) {
    return 'Kuplajlı hat genişliği (W) ve hat aralığı (S) pozitif olmalı; 3W geometrik kontrolü bu iki değerle yapılır.'
  }
  if (reason === REASON_COUPLING) {
    return 'Z_even, Z_odd değerinden büyük olmalı ve ikisi de pozitif olmalı. Kuplajlı bir çiftte even mod empedansı her zaman odd mod empedansından büyüktür; değerleri ters girmiş olabilirsiniz.'
  }
  if (reason === REASON_CROSSTALK) {
    return 'Kestirim için εeff, yükselme süresi, paralel uzunluk ve aggressor gerilimi pozitif olmalı.'
  }
  return 'Tüm zorunlu alanlara pozitif sayısal değer girin. Ondalık için nokta veya virgül kullanabilirsiniz (0.25 = 0,25).'
}

// εeff'in nereden geldiği — beş sinyal bütünlüğü ekranında aynı ifade kullanılır.
function epsSourceNote(eps) {
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
    text: `εeff = ${fmt(eps.epsEff, 4)} microstrip geometrisinden kapalı formla hesaplandı (${eps.model}). Bu değer alan çözücüden gelmediği için üretime hazır sayılmaz; doyma uzunluğu ve NEXT süresi de aynı etiketi taşır.`,
  }
}

function nextLevel(pct) {
  if (pct > NEXT_PCT_DANGER) return 'danger'
  if (pct >= NEXT_PCT_WARN) return 'warn'
  return 'ok'
}

export function commentary(r) {
  if (!r.ok) return []

  const out = [epsSourceNote(r.eps)]

  if (r.eps.source === EPS_GEOMETRY && !r.eps.inRange) {
    out.push({
      level: 'danger',
      text: 'Girilen geometri kapalı formun güvenilir aralığının dışında. εeff sapması doyma uzunluğuna ve NEXT süresine doğrudan geçer.',
    })
  }

  // --- NEXT ---
  out.push({
    level: nextLevel(r.nextPct),
    text: `NEXT tepe gerilimi ${fmtEng(r.Vnext, 'V', 4)} — aggressor geriliminin %${fmt(r.nextPct, 4)}'i (K_b = ${fmt(r.Kb, 4)}). ${THRESHOLD_NOTE}`,
  })

  out.push({
    level: 'ok',
    text: r.saturated
      ? `Paralel uzunluk ${fmtEng(r.coupledLength, 'm', 4)}, doyma uzunluğu ${fmtEng(r.Lsat, 'm', 4)} değerinden büyük: kestirime göre NEXT doymuş durumda (ölçek katsayısı ${fmt(r.scale, 4)}). Hattı daha da uzatmak tepe gerilimini artırmaz, yalnızca NEXT darbesini uzatır.`
      : `Paralel uzunluk ${fmtEng(r.coupledLength, 'm', 4)}, doyma uzunluğu ${fmtEng(r.Lsat, 'm', 4)} değerinin altında: NEXT doğrusal ölçekleniyor (ölçek katsayısı ${fmt(r.scale, 4)}). Uzunluğu iki katına çıkarmak tepe gerilimini de yaklaşık iki katına çıkarır.`,
  })

  out.push({
    level: 'ok',
    text: `NEXT darbesinin süresi ${fmtEng(r.nextDuration, 's', 4)} — gidiş dönüş gecikmesi kadar (birim uzunluk gecikmesi ${fmt(r.tpdPsPerMm, 4)} ps/mm).`,
  })

  // --- 3W geometrik kontrolü ---
  if (r.geom.satisfied) {
    out.push({
      level: 'ok',
      text: `3W geometrik kuralı sağlandı: S/W = ${fmt(r.geom.ratio, 4)} ≥ 3. Bu YALNIZCA geometrik bir kontroldür — spec bunun crosstalk hesabı olmadığını açıkça söyler. Sağlanmış olması "crosstalk yoktur" anlamına gelmez; yukarıdaki NEXT kestirimi geçerliliğini korur.`,
    })
  } else {
    out.push({
      level: 'warn',
      text: `3W geometrik kuralı sağlanmadı: S/W = ${fmt(r.geom.ratio, 4)} < 3, gereken aralık ${fmtEng(r.geom.required, 'm', 4)} (girilen ${fmtEng(r.S, 'm', 4)}). Bu geometrik bir uyarıdır; crosstalk seviyesini tek başına belirlemez.`,
    })
  }

  // --- FEXT ---
  if (!r.fext.available) {
    out.push({
      level: 'warn',
      text: 'Far-end crosstalk HESAPLANMADI: odd ve even mod εeff değerleri girilmedi. FEXT modal hız farkına bağlıdır ve bu fark Z_odd/Z_even değerlerinden türetilemez. Diferansiyel çift ekranı tek bir εeff kullanır, iki modu aynı hızda kabul eder; o varsayım altında FEXT özdeş olarak sıfır çıkar ve microstrip\'te bu yanlıştır. Doğru değerler 2B alan çözücüden ya da üretici yığın raporundan gelir. Uydurulmuş bir sayı göstermek yerine boş bırakıldı.',
    })
  } else if (r.fext.homogeneous) {
    out.push({
      level: 'ok',
      text: `Odd ve even mod εeff değerleri eşit (${fmt(r.fext.epsEffOdd, 4)}): modal gecikme farkı sıfır, dolayısıyla FEXT sıfır. Bu bir eksiklik değil — homojen dielektrikte (stripline, gömülü microstrip) iki mod aynı hızda ilerler ve far-end crosstalk fiziksel olarak beklenmez. "Hesaplanamadı" durumundan farklıdır.`,
    })
  } else {
    out.push({
      level: nextLevel(r.fext.fextPct),
      text: `FEXT tepe gerilimi ${fmtEng(r.fext.Vfext, 'V', 4)} — aggressor geriliminin %${fmt(r.fext.fextPct, 4)}'i. Modal gecikme farkı ${fmtEng(r.fext.modalDelayDiff, 's', 4)} (odd εeff ${fmt(r.fext.epsEffOdd, 4)}, even εeff ${fmt(r.fext.epsEffEven, 4)}). Microstrip gibi homojen olmayan dielektrikte FEXT genelde baskın crosstalk türüdür. ${THRESHOLD_NOTE}`,
    })
    if (r.fext.modalDelayDiff >= r.tr) {
      out.push({
        level: 'danger',
        text: `Modal gecikme farkı (${fmtEng(r.fext.modalDelayDiff, 's', 4)}) yükselme süresine (${fmtEng(r.tr, 's', 4)}) eşit ya da ondan büyük. Kullanılan FEXT ifadesi Δt ≪ t_r varsayımıyla yazılmış bir orandır; bu bölgede sonuç anlamını yitirir.`,
      })
    }
  }

  // --- Yöntem ve kaynak ---
  out.push({
    level: 'warn',
    text: `Bu sonuç spec §7.6'nın istediği model DEĞİLDİR. Çok iletkenli iletim hattı çözümü (kapasitans matrisi, e^(−Mℓ), FFT/IFFT) uygulanmadı; sonucun yöntem alanı \`${r.method}\`, çok iletkenli model bayrağı ise ${r.multiconductorModel ? 'evet' : 'hayır'}.`,
  })

  out.push({
    level: 'warn',
    text: 'K_b, L_sat ve V_FEXT ifadelerinin kaynağı docs/spec.md\'de yok. Sayıları spec\'ten doğrulanamadığı için bu ekran kapalı form sonuçlarıyla aynı güven seviyesinde değildir; yığın onayı, gürültü bütçesi kapatma veya kart çıkışı kararı için alan çözücü sonucu ya da ölçüm gerekir.',
  })

  out.push({
    level: 'warn',
    text: `Z_even = ${fmt(r.Zeven, 4)} Ω ve Z_odd = ${fmt(r.Zodd, 4)} Ω elle girildi. Bu değerler diferansiyel çift ekranından geliyorsa onlar da ampirik bir kuplaj katsayısından türemiştir; belirsizlik buradaki NEXT sonucuna doğrudan geçer.`,
  })

  return out
}
