// Via özellikleri ekranının kullanıcıya görünen metinleri.

import { fmt, fmtEng, fmtOhm, fmtAmp, fmtVolt, fmtPow, fmtRes } from '../../../lib/num'
import { REASON_PAD, BASIS_DRILL } from './model'

export const BASIS_LABEL = {
  [BASIS_DRILL]: 'matkap çapı',
  finished: 'bitmiş delik çapı',
}

export const CHART = {
  x: 'Paralel via sayısı', y: 'Gerilim düşümü (V)',
  caption: 'Paralel via sayısı arttıkça düşüm 1/n ile azalır; ilk birkaç via en çok kazancı sağlar. Referans çizgi izin verilen düşümdür.',
}

export function reasonText(reason) {
  if (reason === REASON_PAD) {
    return 'Padstack geometrisi tutarsız: pad çapı matkap çapından, antipad çapı da pad çapından büyük olmalı.'
  }
  return 'Tüm zorunlu alanlara pozitif sayısal değer girin. Ondalık için nokta veya virgül kullanabilirsiniz (0.25 = 0,25).'
}

export function commentary(r) {
  if (!r.ok) return []
  const out = []

  out.push({
    level: 'ok',
    text: `Barrel kesiti ${fmt(r.area * 1e6, 4)} mm²; ${fmt(r.T, 3)} °C'de tek via direnci ${fmtOhm(r.R)}.`,
  })

  out.push({
    level: Math.abs(r.thinErrorPct) > 10 ? 'warn' : 'ok',
    text: Math.abs(r.thinErrorPct) > 10
      ? `Kaplama kalınlığı delik çapının %${fmt(r.ratio * 100, 3)}'i. Bu oranda ince kaplama yaklaşımı alanı %${fmt(Math.abs(r.thinErrorPct), 3)} eksik gösterir; hesapta tam halka alanı kullanıldı.`
      : `İnce kaplama yaklaşımı bu geometride %${fmt(Math.abs(r.thinErrorPct), 3)} sapıyor; hesapta yine de tam halka alanı kullanıldı.`,
  })

  if (r.mode === 'syn') {
    out.push({
      level: 'ok',
      text: `Gereken via sayısı ${r.N}: akım kısıtı ${r.Ncurrent}, gerilim düşümü kısıtı ${r.Nvoltage}, kullanıcı alt sınırı ${r.limits.Nmin}. En kısıtlayıcı olan belirledi.`,
    })
    out.push({
      level: r.VdropParallel <= r.limits.VdropMax ? 'ok' : 'danger',
      text: `${r.N} viayla düşüm ${fmtVolt(r.VdropParallel)}; sınır ${fmtVolt(r.limits.VdropMax)}.`,
    })
  } else {
    out.push({
      level: 'ok',
      text: `Tek via üzerinde ${fmtAmp(r.I, 3)} için düşüm ${fmtVolt(r.Vdrop)}, güç kaybı ${fmtPow(r.Ploss, 3)}.`,
    })
  }

  out.push({
    level: r.ring.breakout ? 'danger' : r.ring.worst < 0.05e-3 ? 'warn' : 'ok',
    text: r.ring.breakout
      ? `Worst-case annular ring sıfırın altında (${fmtEng(r.ring.worst, 'm', 3)}) — delik pad kenarını kırar. Pad çapını büyütün veya delik toleransını sıkın.`
      : `Nominal annular ring ${fmtEng(r.ring.nominal, 'm', 3)}, toleranslar sonrası ${fmtEng(r.ring.worst, 'm', 3)}.`,
  })

  out.push({
    level: r.aspect.ratio > 10 ? 'danger' : r.aspect.ratio > 8 ? 'warn' : 'ok',
    text: r.aspect.ratio > 8
      ? `Aspect ratio ${fmt(r.aspect.ratio, 3)} (${BASIS_LABEL[r.aspect.basis]} üzerinden). Bu orandan sonra kaplama delik ortasında incelir; üreticinizin sınırını teyit edin.`
      : `Aspect ratio ${fmt(r.aspect.ratio, 3)} (${BASIS_LABEL[r.aspect.basis]} üzerinden).`,
  })

  out.push({
    level: 'ok',
    text: `Yaklaşık tek iletken self-endüktansı ${fmtEng(r.L, 'H', 3)}, pad-antipad kapasitesi ${fmtEng(r.C, 'F', 3)}.`,
  })

  if (r.disc) {
    out.push({
      level: 'ok',
      text: `Bu parazitiklerin oluşturduğu süreksizlik empedansı ${fmtRes(r.disc.Z, 3)}, gecikme ${fmtEng(r.disc.delay, 's', 3)}.`,
    })
  }

  out.push({
    level: 'warn',
    text: 'Endüktans değeri izole tek iletken içindir. Yüksek hızda belirleyici olan sinyal ve dönüş yolunun oluşturduğu loop endüktansıdır; dönüş viası uzaksa gerçek değer bunun katları olur.',
  })

  out.push({
    level: 'danger',
    text: 'Via akım kapasitesi yalnızca barrel DC direncinden belirlenemez. Bağlı bakır katmanlar, termal yapı ve komşu vialar sonucu belirgin biçimde değiştirir.',
  })

  return out
}
