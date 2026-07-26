// Yayılma gecikmesi ekranının kullanıcıya görünen metinleri.

import { fmt, fmtEng } from '../../../lib/num'
import { EPS_GEOMETRY, EPS_STRUCT_STRIPLINE } from '../../../lib/epsEff'
import { REASON_EPS } from './model'

export const CHART = {
  x: 'Frekans (Hz)', y: 'Elektriksel uzunluk (°)',
  caption: 'Hat, frekans yükseldikçe dalga boyunun daha büyük bir kesrini kaplar. 90° çeyrek dalga, 180° yarım dalgadır — bu eşitlerde hat rezonans gibi davranır ve sonlandırma kritikleşir.',
}

// εeff kaynağı ortak bileşenden geliyor; yorum metni de ortak olsun ki
// beş sinyal bütünlüğü ekranında aynı ifade kullanılsın.
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
    text: `εeff = ${fmt(eps.epsEff, 4)} microstrip geometrisinden kapalı formla hesaplandı (${eps.model}); aynı geometrinin Z₀ değeri ${fmt(eps.Z0, 4)} Ω. Bu değer alan çözücüden gelmediği için üretime hazır sayılmaz — buradan türeyen sonuçlar da aynı etiketi taşır.`,
  }
}

export function epsRangeNote(eps) {
  if (eps.source !== EPS_GEOMETRY || eps.inRange) return null
  return {
    level: 'danger',
    text: 'Girilen geometri kapalı formun güvenilir aralığının dışında. εeff sapması buradan türeyen tüm gecikme ve uzunluk sonuçlarına geçer.',
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

  out.push({
    level: 'ok',
    text: `Birim uzunluk gecikmesi ${fmt(r.tpdPsPerMm, 4)} ps/mm; ${fmtEng(r.length, 'm', 3)} hat ${fmtEng(r.delay, 's', 4)} gecikme üretir.`,
  })

  out.push({
    level: 'ok',
    text: `Sinyal kartta ${fmtEng(r.vp, 'm/s', 4)} hızla ilerliyor — boşluktaki hızın %${fmt((r.vp / 299792458) * 100, 3)}'i.`,
  })

  out.push({
    level: r.fraction > 0.25 ? 'danger' : r.fraction > 0.1 ? 'warn' : 'ok',
    text: r.fraction > 0.1
      ? `Hat, çalışma frekansında dalga boyunun ${fmt(r.fraction, 4)} katı (${fmt(r.degrees, 4)}°). Bu oranda hat toplu eleman gibi davranmaz; kontrollü empedans ve sonlandırma gerekir.`
      : `Hat, dalga boyunun ${fmt(r.fraction, 4)} katı (${fmt(r.degrees, 4)}°) — elektriksel olarak kısa sayılır.`,
  })

  out.push({
    level: 'ok',
    text: `Bu uzunluk ${fmtEng(r.quarterWaveFreq, 'Hz', 4)} frekansında çeyrek dalga olur; o noktada hattın giriş empedansı uç yükünün tersine döner.`,
  })

  out.push({
    level: 'warn',
    text: 'Dielektrik sabiti frekansla düşer. Geniş bantlı sinyallerde tek bir εeff değeri yeterli değildir; üreticinin frekansa bağlı verisi kullanılmalıdır.',
  })

  return out
}
