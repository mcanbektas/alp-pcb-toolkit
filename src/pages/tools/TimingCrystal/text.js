// RC/RL ve kristal ekranının kullanıcıya görünen metinleri.

import { fmt, fmtEng, fmtRes, fmtAmp, fmtVolt, fmtPct } from '../../../lib/num'
import {
  TOOL_RC, TOOL_RL, TOOL_CRYSTAL,
  MODE_SYNTHESIS,
  REASON_NO_SOLUTION, REASON_STRAY, REASON_PIN,
} from './model'

export const TOOL_LABEL = {
  [TOOL_RC]: 'RC zaman sabiti',
  [TOOL_RL]: 'RL zaman sabiti',
  [TOOL_CRYSTAL]: 'Kristal yük kapasitesi',
}

export const MODE_LABEL = {
  [TOOL_RC]: { ana: 'Analiz — zaman sabitini bul', syn: 'Sentez — kapasiteyi bul' },
  [TOOL_RL]: { ana: 'Analiz — zaman sabitini bul', syn: 'Sentez — endüktansı bul' },
  [TOOL_CRYSTAL]: { ana: 'Analiz — yük kapasitesini bul', syn: 'Sentez — kapasitörleri bul' },
}

export const CHART = {
  [TOOL_RC]: {
    x: 'Zaman (s)', y: 'Kondansatör gerilimi (V)',
    caption: 'Şarj eğrisi bir zaman sabitinde son değerin %63.2\'sine, beş zaman sabitinde %99.3\'üne ulaşır. Deşarj eğrisi aynı sabitle ters yönde iner.',
  },
  [TOOL_RL]: {
    x: 'Zaman (s)', y: 'Bobin akımı (A)',
    caption: 'Akım aynı üstel yasayla yükselir. Anahtarlama anında bobin akımı sıfırdan başlar; devreyi ani kesmek yüksek gerilim tepesi üretir.',
  },
  [TOOL_CRYSTAL]: {
    x: 'Harici kapasitör C1 = C2 (pF)', y: 'Yük kapasitesi C_L (pF)',
    caption: 'Yük kapasitesi harici kapasitörün yarısı artı parazitiklerdir; bu yüzden eğrinin eğimi 1/2\'dir. Hedeften sapma osilatör frekansını kaydırır.',
  },
}

export function reasonText(reason, r) {
  switch (reason) {
    case REASON_STRAY:
      return `PCB parazitik kapasitesi (${fmt(r?.Cstray, 3)} pF) hedef yük kapasitesine (${fmt(r?.CL, 3)} pF) eşit veya ondan büyük. Harici kapasitör gerekmiyor; iz uzunluğunu kısaltarak parazitiği azaltın.`
    case REASON_PIN:
      return `MCU pin kapasitesi tek başına hedef yük kapasitesini aşıyor. Bu kristal bu MCU ile doğrudan kullanılamaz; daha yüksek C_L değerli bir kristal seçin.`
    case REASON_NO_SOLUTION:
      return 'Verilen değerler için fiziksel bir çözüm bulunamadı. Değerleri makul aralığa çekin.'
    default:
      return 'Tüm zorunlu alanlara pozitif sayısal değer girin. Ondalık için nokta veya virgül kullanabilirsiniz (0.25 = 0,25).'
  }
}

export function commentary(r) {
  if (!r.ok) return []
  const out = []

  if (r.tool === TOOL_CRYSTAL) {
    if (r.mode === MODE_SYNTHESIS) {
      out.push({
        level: 'ok',
        text: `Hedef ${fmt(r.CL, 3)} pF için gerekli harici kapasitör C1 = C2 = ${fmt(r.C, 4)} pF.`,
      })
      out.push({
        level: Math.abs(r.standardErrPct) <= 5 ? 'ok' : 'warn',
        text: `En yakın E24 değeri ${fmt(r.nearest.value, 3)} pF ile gerçekleşen yük ${fmt(r.withStandard, 4)} pF (${fmtPct(r.standardErrPct)}).`,
      })
      out.push({
        level: r.simplified ? 'warn' : 'ok',
        text: r.simplified
          ? 'MCU pin kapasiteleri sıfır girildi; basitleştirilmiş model kullanıldı. Veri sayfasındaki giriş/çıkış kapasitesi genellikle 2–7 pF\'tir ve sonucu kaydırır.'
          : `MCU pin kapasiteleri hesaba katıldı (ortalama ${fmt(r.Cp, 3)} pF).`,
      })
    } else {
      out.push({
        level: 'ok',
        text: `C1 = ${fmt(r.C1, 3)} pF ve C2 = ${fmt(r.C2, 3)} pF ile gerçekleşen yük kapasitesi ${fmt(r.achieved, 4)} pF.`,
      })
      out.push({
        level: 'ok',
        text: 'Bu değeri kristalin veri sayfasındaki C_L değeriyle karşılaştırın; eşleşmezse osilatör frekansı kayar.',
      })
    }

    out.push({
      level: 'warn',
      text: 'Yük kapasitesi hedeften düşükse frekans yukarı, yüksekse aşağı kayar. Kayma tipik olarak birkaç ppm mertebesindedir ama zaman tutan uygulamalarda birikir.',
    })
    out.push({
      level: 'warn',
      text: 'Parazitik kapasite iz uzunluğuna ve yakın bakıra güçlü biçimde bağlıdır. Kristal MCU\'ya mümkün olduğunca yakın, izler kısa ve altında kesintisiz toprak olacak şekilde yerleştirilmeli.',
    })
    return out
  }

  const isRc = r.tool === TOOL_RC
  const unit = isRc ? 'gerilim' : 'akım'

  out.push({
    level: 'ok',
    text: `Zaman sabiti τ = ${fmtEng(r.tau, 's', 4)}. Bir τ sonunda ${unit} son değerin %63.2'sine ulaşır.`,
  })
  out.push({
    level: 'ok',
    text: `%10 → %90 yükselme süresi ${fmtEng(r.riseTime1090, 's', 4)}; beş τ (${fmtEng(5 * r.tau, 's', 4)}) sonunda pratik olarak yerleşmiş sayılır.`,
  })

  if (r.mode === MODE_SYNTHESIS) {
    if (isRc) {
      out.push({
        level: 'ok',
        text: `Hedef zaman sabiti için gerekli kapasite ${fmtEng(r.C, 'F', 4)}; en yakın E24 değeri ${fmt(r.nearestC.value, 3)} nF (${fmtPct(r.nearestC.errorPct)}).`,
      })
    } else {
      out.push({
        level: 'ok',
        text: `Hedef zaman sabiti için gerekli endüktans ${fmtEng(r.L, 'H', 4)}; en yakın E24 değeri ${fmt(r.nearestL.value, 3)} µH (${fmtPct(r.nearestL.errorPct)}).`,
      })
    }
    out.push({
      level: 'ok',
      text: `Çözüm sınırlandırılmış kök aramayla doğrulandı (${r.solvedBy}); sonuç fiziksel aralık içinde.`,
    })
  }

  if (isRc) {
    out.push({
      level: 'ok',
      text: `Anahtarlama anında dirençten geçen tepe akım ${fmtAmp(r.Ifinal, 3)} (${fmtVolt(r.Vs)} / ${fmtRes(r.R, 3)}).`,
    })
    out.push({
      level: 'warn',
      text: 'Kondansatörün kaçak akımı ve dielektrik soğurması uzun zaman sabitlerinde sonucu bozar. 1 s üzeri sabitlerde film veya düşük kaçaklı tip seçin.',
    })
  } else {
    out.push({
      level: 'ok',
      text: `Sürekli rejimde bobin akımı ${fmtAmp(r.Ifinal, 3)}'e oturur.`,
    })
    out.push({
      level: 'danger',
      text: 'Bobin akımını ani kesmek büyük bir gerilim tepesi üretir (V = −L·dI/dt). Anahtarlama elemanının yanına sönümleme diyodu veya snubber koyun.',
    })
  }

  return out
}
