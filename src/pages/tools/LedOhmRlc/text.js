// LED, Ohm kanunu ve RLC ekranının kullanıcıya görünen metinleri.

import { fmt, fmtRes, fmtAmp, fmtPow, fmtVolt, fmtEng, fmtPct } from '../../../lib/num'
import {
  TOOL_OHM, TOOL_LED, TOOL_RLC, TOOL_COMBO,
  COMBO_SERIES,
  REASON_OHM_INSUFFICIENT, REASON_LED_HEADROOM, REASON_NO_SOLUTION,
} from './model'

export const TOOL_LABEL = {
  [TOOL_OHM]: 'Ohm kanunu ve güç',
  [TOOL_LED]: 'LED seri direnci',
  [TOOL_RLC]: 'Seri RLC',
  [TOOL_COMBO]: 'Seri / paralel birleşim',
}

export const KIND_LABEL = {
  resistive: 'saf dirençsel (rezonans)',
  inductive: 'endüktif',
  capacitive: 'kapasitif',
}

export const CHART = {
  [TOOL_OHM]: {
    x: 'Direnç (Ω)', y: 'Güç (W)',
    caption: 'Sabit gerilimde direnç küçüldükçe harcanan güç hızla büyür (P = V²/R). Çalışma noktası eğrinin dik bölgesindeyse küçük bir direnç hatası büyük bir güç farkı yaratır.',
  },
  [TOOL_LED]: {
    x: 'Seri direnç (Ω)', y: 'LED akımı (A)',
    caption: 'Seri direnç değiştikçe LED akımı ters orantılı değişir. Yatay çizgi hedef akımdır; eğrinin dikliği, direnç toleransının parlaklığa ne kadar geçtiğini gösterir.',
  },
  [TOOL_RLC]: {
    x: 'Frekans (Hz)', y: '|Z| (Ω)',
    caption: 'Rezonansta endüktif ve kapasitif reaktans birbirini götürür, empedans direnç değerine iner. Çukurun genişliği kalite faktörüyle ters orantılıdır.',
  },
}

export function reasonText(reason, r) {
  switch (reason) {
    case REASON_OHM_INSUFFICIENT:
      return 'Ohm kanunu için en az iki değer gerekli. V, I, R ve P alanlarından ikisini doldurun; kalan ikisi hesaplanır.'
    case REASON_LED_HEADROOM:
      return `Seri LED gerilimi (${fmtVolt(r?.Vled)}) besleme geriliminden düşük olmalı. LED sayısını azaltın, ileri gerilimi düşürün veya beslemeyi yükseltin.`
    case REASON_NO_SOLUTION:
      return 'Verilen endüktans ve hedef frekans için fiziksel bir kapasite değeri bulunamadı. Değerleri makul aralığa çekin.'
    default:
      return 'Tüm zorunlu alanlara geçerli değer girin. Ondalık için nokta veya virgül kullanabilirsiniz (0.25 = 0,25).'
  }
}

export function valueListError(at) {
  return at
    ? `Değer listesi okunamadı: "${at}". Beklenen biçim: 10k, 22k, 4.7M (virgülle ayrılmış).`
    : 'Değer listesi boş. En az bir direnç girin, örn. 10k, 22k.'
}

export function commentary(r) {
  if (!r.ok) return []
  const out = []

  if (r.tool === TOOL_OHM) {
    out.push({
      level: 'ok',
      text: `Girilen değerler: ${r.given.join(', ')}. Kalanlar bunlardan türetildi.`,
    })
    if (r.inconsistency != null && r.inconsistency > 0.01) {
      out.push({
        level: 'danger',
        text: `V, I ve R birlikte girildi ve birbirini tutmuyor: sapma ${fmt(r.inconsistency * 100, 3)} %. Sonuçlar ilk iki değerden türetildi.`,
      })
    } else if (r.inconsistency != null) {
      out.push({ level: 'ok', text: 'Girilen üç değer birbiriyle tutarlı.' })
    }
    out.push({
      level: r.P > 0.25 ? 'warn' : 'ok',
      text: r.P > 0.25
        ? `Harcanan güç ${fmtPow(r.P, 3)} — 0603/0805 gibi küçük paketlerin nominal gücünün üzerinde. Paket boyutunu veya devreyi gözden geçirin.`
        : `Harcanan güç ${fmtPow(r.P, 3)}; yaygın küçük paketler için sorun değil.`,
    })
    return out
  }

  if (r.tool === TOOL_LED) {
    out.push({
      level: 'ok',
      text: `${r.n} LED için toplam ileri gerilim ${fmtVolt(r.Vled)}; dirence düşen fark ${fmtVolt(r.headroom)}.`,
    })
    out.push({
      level: 'ok',
      text: `İdeal direnç ${fmtRes(r.R, 4)}; en yakın E24 değeri ${fmtRes(r.e24.value, 4)} ile akım ${fmtAmp(r.e24.I, 3)} olur (${fmtPct(100 * (r.e24.I - r.targetI) / r.targetI)}).`,
    })
    out.push({
      level: 'ok',
      text: `Direnç ${fmtPow(r.P, 3)} harcıyor; %${fmt(r.derating * 100, 3)} kullanım oranıyla en az ${fmtPow(r.Prated, 3)} nominal güç seçin.`,
    })

    // Düşük headroom oranı, V_f toleransını akıma büyük oranda geçirir
    const ratio = r.headroom / r.Vs
    out.push({
      level: ratio < 0.2 ? 'danger' : ratio < 0.35 ? 'warn' : 'ok',
      text: ratio < 0.35
        ? `Dirence düşen gerilim beslemenin yalnızca %${fmt(ratio * 100, 3)}'i. Bu oranda LED'in ileri gerilim toleransı akıma neredeyse doğrudan geçer; parlaklık parçadan parçaya belirgin değişir. Akım kaynağı sürücü düşünün.`
        : `Dirence düşen gerilim beslemenin %${fmt(ratio * 100, 3)}'i — ileri gerilim toleransının akıma etkisi sınırlı.`,
    })
    out.push({
      level: 'warn',
      text: 'Paralel LED kollarında tek ortak direnç kullanmayın; ileri gerilim farkı akımı eşitsiz dağıtır. Her kola ayrı direnç verin.',
    })
    return out
  }

  if (r.tool === TOOL_RLC) {
    out.push({
      level: 'ok',
      text: `Rezonans frekansı ${fmtEng(r.f0, 'Hz', 4)}; bu noktada empedans direnç değerine (${fmtRes(r.R, 3)}) iner.`,
    })
    out.push({
      level: 'ok',
      text: `${fmtEng(r.f, 'Hz', 4)} frekansında devre ${KIND_LABEL[r.kind]}: |Z| = ${fmtRes(r.magnitude, 4)}, faz ${fmt(r.phaseDeg, 3)}°.`,
    })
    out.push({
      level: r.Q > 50 ? 'warn' : 'ok',
      text: r.Q > 50
        ? `Kalite faktörü ${fmt(r.Q, 4)} yüksek, bant genişliği ${fmtEng(r.BW, 'Hz', 3)} dar. Bu kadar keskin bir tepki komponent toleransına çok duyarlıdır; gerçek rezonans hesaplanandan kayabilir.`
        : `Kalite faktörü ${fmt(r.Q, 4)}, bant genişliği ${fmtEng(r.BW, 'Hz', 3)}.`,
    })
    if (r.mode === 'syn') {
      out.push({
        level: 'ok',
        text: `Hedef frekans için gerekli kapasite ${fmtEng(r.C, 'F', 4)}; en yakın E24 değeri ${fmt(r.nearestC.value, 4)} pF (${fmtPct(r.nearestC.errorPct)}).`,
      })
      out.push({
        level: 'ok',
        text: `Kök sınırlandırılmış aramayla doğrulandı (${r.solvedBy}); sonuç fiziksel aralık içinde.`,
      })
    }
    out.push({
      level: 'warn',
      text: 'Model ideal komponent varsayar. Gerçek kondansatörün ESR ve ESL\'si, bobinin öz kapasitesi ve kayıpları yüksek frekansta sonucu değiştirir.',
    })
    return out
  }

  // Seri / paralel
  const label = r.combo === COMBO_SERIES ? 'Seri' : 'Paralel'
  out.push({
    level: 'ok',
    text: `${label} bağlı ${r.values.length} direncin eşdeğeri ${fmtRes(r.equivalent, 4)}.`,
  })
  out.push({
    level: 'ok',
    text: r.combo === COMBO_SERIES
      ? 'Seri bağlamada akım her dirençte aynıdır; gerilim direnç oranında paylaşılır.'
      : 'Paralel bağlamada gerilim her dirençte aynıdır; akım iletkenlik oranında paylaşılır — en küçük direnç en çok akımı çeker.',
  })
  out.push({
    level: 'ok',
    text: `En yakın tek standart değer ${fmtRes(r.nearestE24.value, 4)} (${fmtPct(r.nearestE24.errorPct)}); tek dirençle karşılanabiliyorsa birleşime gerek yoktur.`,
  })
  if (r.combo === COMBO_SERIES) {
    out.push({
      level: 'warn',
      text: 'Toleranslar birbirini götürmez. Seri bağlamada mutlak hatalar toplanır; eşdeğerin toleransı tek bir direncinkinden iyi olmaz.',
    })
  }
  return out
}
