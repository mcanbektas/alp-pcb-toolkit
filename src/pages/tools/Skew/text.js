// Diferansiyel skew ekranının kullanıcıya görünen metinleri.

import { fmt, fmtEng } from '../../../lib/num'
import { EPS_GEOMETRY, EPS_STRUCT_STRIPLINE } from '../../../lib/epsEff'
import { REASON_EPS, LAYER_SAME, LAYER_DIFFERENT } from './model'

export const LAYER_LABEL = {
  [LAYER_SAME]: 'Aynı katman',
  [LAYER_DIFFERENT]: 'Farklı katman / farklı yapı',
}

export const CHART = {
  x: 'Uzunluk farkı ΔL (mm)',
  y: 'Skew (ps)',
  caption: 'Fiziksel olarak uzun hat sabit tutulur, kısa hat kısaltılıp uzatılır. Aynı katmanda skew uzunluk farkıyla doğru orantılıdır: ΔL küçüldükçe doğrusal olarak sıfıra iner. Kesikli çizgi izin verilen skew bütçesidir; eğri o çizginin altına indiği anda uzunluk farkı bütçenin içindedir. Farklı katman seçildiğinde eğri iki noktada birden ayrışır: ΔL = 0 noktasında sıfırdan başlamaz — kalan fark iki katmanın εeff farkından gelir — ve tek yönlü değildir. Gecikmesi büyük olan hat fiziksel olarak kısa hatsa, ΔL büyüdükçe skew önce DÜŞER, bir minimumdan geçer, sonra yeniden yükselir. O minimumda gecikmeler eşitlenmiştir. Yani farklı katmanda en iyi uzunluk farkı sıfır değildir; sıfıra çekmek skew\'i büyütebilir.',
}

export const METHOD_NOTE =
  'Skew doğrudan iki hattın gecikme farkından hesaplanır; hesabın doğruluğu tümüyle εeff ' +
  'değerinin doğruluğuna bağlıdır. εeff geometriden kapalı formla geldiyse sonuç da kapalı ' +
  'form güven seviyesindedir, alan çözücü sonucu değildir. Bu ekran skew bütçesi üretmez — ' +
  'izin verilen değer dışarıdan girilir.'

// Spec eksikliği açıkça görünür kılınıyor: §7.5'in denklem blokları markdown
// dönüşümünde bozulmuş, tahminle tamamlanmadı. Kullanıcıya dahili kaynak
// gönderilmez; not yöntemi tarif eder.
export const SPEC_NOTE =
  'Bu ekranda gösterilen denklemler hesabın birebir yaptığı işlemlerdir: skew, izin verilen ' +
  'maksimum uzunluk farkı, eklenecek uzunluk ve farklı katman durumu doğrudan iki hattın ' +
  'gecikme farkından türetilir. İfadeler bağımsız bir referans denkleme karşı ' +
  'doğrulanmamıştır; eksik kalan hiçbir adım tahminle tamamlanmadı, kullanılan yazım olduğu ' +
  'gibi gösteriliyor.'

// εeff kaynağı ortak bileşenden geliyor; yorum metni bu ekranda da aynı
// terminolojiyi kullanır. Ekranlar arasında paylaşılan durum yoktur.
export function epsSourceNote(eps) {
  if (eps.source !== EPS_GEOMETRY) {
    return {
      level: 'warn',
      text: `εeff = ${fmt(eps.epsEff, 4)} elle girildi. Değerin doğruluğu girene aittir; empedans aracından ya da üretici yığın raporundan alınmalıdır — skew doğrudan bu değerle ölçeklenir.`,
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
    text: `εeff = ${fmt(eps.epsEff, 4)} microstrip geometrisinden kapalı formla hesaplandı (${eps.model}). Bu değer alan çözücüden gelmediği için üretime hazır sayılmaz — buradan türeyen skew ve uzunluk sonuçları da aynı etiketi taşır.`,
  }
}

export function epsRangeNote(eps) {
  if (eps.source !== EPS_GEOMETRY || eps.inRange) return null
  return {
    level: 'danger',
    text: 'Girilen geometri kapalı formun güvenilir aralığının dışında. εeff sapması buradan türeyen tüm gecikme, skew ve uzunluk sonuçlarına geçer.',
  }
}

export function reasonText(reason) {
  if (reason === REASON_EPS) {
    return 'Efektif dielektrik sabiti hesaplanamadı. Elle giriyorsanız değer 1\'den büyük olmalı; geometriden hesaplıyorsanız W, H ve εr değerlerini kontrol edin.'
  }
  return 'Tüm zorunlu alanlara pozitif sayısal değer girin. Ondalık için nokta veya virgül kullanabilirsiniz (0.25 = 0,25).'
}

export function commentary(r) {
  if (!r.ok) return []

  const out = [epsSourceNote(r.eps)]
  const range = epsRangeNote(r.eps)
  if (range) out.push(range)

  // Ana karar: bütçe içinde mi
  out.push({
    level: r.within ? 'ok' : 'danger',
    text: r.within
      ? `Skew ${fmtEng(r.skew, 's', 4)}; izin verilen ${fmtEng(r.skewMax, 's', 4)} bütçesinin içinde.`
      : `Skew ${fmtEng(r.skew, 's', 4)}, izin verilen ${fmtEng(r.skewMax, 's', 4)} bütçesinin dışında. Gecikmesi küçük olan hat uzatılmadan bu çift bütçeyi karşılamaz.`,
  })

  // Eklenecek uzunluk ve hangi hatta ekleneceği
  if (r.addTo === null) {
    out.push({
      level: 'ok',
      text: 'İki hattın gecikmesi eşit; eklenecek uzunluk yok.',
    })
  } else {
    out.push({
      level: 'ok',
      text: `Eşitlemek için ${r.addTo} hattına ${fmtEng(r.addLength, 'm', 4)} eklenmeli. Uzatılacak hat, gecikmesi KÜÇÜK olan hattır — burada ${r.addTo}. Gecikmesi büyük olan ${r.longer} hattına dokunulmaz.`,
    })
  }

  // Bütçenin uzunluk karşılığı. Motor bu sınırı her zaman P hattının t_pd
  // değeriyle hesaplar; farklı katmanda bu ayrım önemlidir.
  out.push({
    level: 'ok',
    text: `${fmtEng(r.skewMax, 's', 3)} bütçesi, P hattının ${fmt(r.tpdPsPerMmP, 4)} ps/mm gecikmesiyle ${fmtEng(r.maxDeltaL, 'm', 4)} uzunluk farkına karşılık gelir.`,
  })

  if (r.differentLayer && !r.sameLayer) {
    // spec §7.5'in açık uyarısı
    out.push({
      level: 'warn',
      text: 'Hatlar farklı katmanda: yalnızca fiziksel uzunluk eşitlemek yeterli olmayabilir. İki katmanın εeff değeri farklıysa eşit uzunluk eşit gecikme demek değildir; bu durumda eşitlenen büyüklük uzunluk değil GECİKME\'dir.',
    })

    out.push({
      level: 'warn',
      text: `P hattı ${fmt(r.tpdPsPerMmP, 4)} ps/mm, N hattı ${fmt(r.tpdPsPerMmN, 4)} ps/mm gecikmeyle ilerliyor. İki hattın birim uzunluk gecikmesi farklı olduğu için uzunlukları tam eşitlemek (ΔL = 0) skew'i sıfırlamaz; grafikte eğrinin ΔL = 0'da sıfırdan başlamaması bunu gösterir.`,
    })

    if (Number.isFinite(r.sameEpsSkew)) {
      out.push({
        level: 'ok',
        text: `Aynı katman varsayılsaydı (iki hat da εeff = ${fmt(r.eps.epsEff, 4)}) aynı uzunluklarla skew ${fmtEng(r.sameEpsSkew, 's', 4)} çıkardı. Aradaki fark tümüyle katman farkından gelir.`,
      })
    }

    out.push({
      level: 'warn',
      text: 'Bütçenin uzunluk karşılığı (maksimum ΔL) motorda P hattının gecikmesiyle hesaplanır; farklı katman seçildiğinde bu sınır yalnızca P hattı için geçerlidir. N hattının kendi uzunluk sınırını motor vermiyor.',
    })

    // Gecikmesi büyük olan hat aynı zamanda fiziksel olarak kısa hatsa, uzunluk
    // farkını sıfıra çekmek skew'i BÜYÜTÜR: skew'in sıfırlandığı nokta sıfır
    // olmayan bir ΔL'dedir. Bu ekranın ayırmak istediği karışım tam olarak budur.
    const longerIsPhysicallyShorter =
      (r.longer === 'P' && r.lengthP < r.lengthN) ||
      (r.longer === 'N' && r.lengthN < r.lengthP)

    if (longerIsPhysicallyShorter) {
      out.push({
        level: 'warn',
        text: `Gecikmesi büyük olan ${r.longer} hattı, fiziksel olarak KISA olan hat. Bu çiftte uzunlukları eşitlemeye çalışmak skew'i büyütür — gecikmelerin eşitlendiği nokta sıfır olmayan bir uzunluk farkındadır. Grafikte eğrinin minimumu orasıdır; eşitleme hedefi ΔL = 0 değil, o minimumdur.`,
      })
    }
  }

  if (r.differentLayer && r.sameLayer) {
    out.push({
      level: 'warn',
      text: 'Farklı katman seçildi ama N hattı için girilen εeff, P hattınınkiyle aynı. Motor bu durumu aynı katman gibi ele alıyor; gerçekten farklı bir katmandaysanız o katmanın εeff değerini girin.',
    })
  }

  if (!r.differentLayer) {
    out.push({
      level: 'ok',
      text: `Aynı katman seçildi: iki hat da ${fmt(r.tpdPsPerMmP, 4)} ps/mm gecikmeyle ilerliyor, bu yüzden uzunluk eşitlemek gecikme eşitlemekle aynı şey. 1 mm uzunluk farkı ${fmt(r.tpdPsPerMmP, 3)} ps skew üretir.`,
    })
  }

  out.push({
    level: 'warn',
    text: 'Uzunluk eşitleme serpantinle yapılıyorsa serpantinin kendi kuplajı devreye girer: yan yana gelen kollar hattın yerel empedansını ve efektif gecikmesini değiştirir, eklenen bakır uzunluğu kadar gecikme eklenmeyebilir. Bu ekran serpantin geometrisini modellemez.',
  })

  out.push({
    level: 'warn',
    text: 'Skew bütçesi bu ekranda üretilmez. İzin verilen maksimum skew, alıcı komponentin veri sayfasından ve protokol dokümanından alınmalıdır; buraya girilen değer bir kabul değil, dışarıdan gelen bir kısıttır.',
  })

  return out
}
