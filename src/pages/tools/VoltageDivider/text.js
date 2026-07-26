// Gerilim bölücü ekranının kullanıcıya görünen metinleri.
//
// Hesap katmanı yalnızca kod ve sayı üretir; Türkçeye çeviri burada yapılır.
// İleride ikinci bir dil gerekirse değişecek tek dosya budur.

import { fmt, fmtVolt, fmtAmp, fmtPow, fmtRes, fmtPct } from '../../../lib/num'
import {
  REASON_INCOMPLETE, REASON_RATIO, REASON_NO_PAIR, REASON_RANGE,
} from './model'

export const SWEEP_LABEL = {
  RL: 'R_L taraması',
  R2: 'R2 taraması',
  R1: 'R1 taraması',
}

export const SWEEP_AXIS = {
  RL: 'Yük direnci R_L (Ω)',
  R2: 'R2 (Ω)',
  R1: 'R1 (Ω)',
}

export const SWEEP_CAPTION = {
  RL: 'Yük direnci küçüldükçe çıkış düşer. Eğrinin sağ ucundaki düzlük yüksüz çıkıştır; dikleşmeye başladığı bölge bölücünün yükü taşıyamadığı bölgedir.',
  R2: 'Diğer değerler sabit tutularak R2 taranır. Eğrinin eğimi, bu direncin üretim toleransının çıkışa ne kadar geçtiğini gösterir.',
  R1: 'Diğer değerler sabit tutularak R1 taranır. Eğrinin eğimi, bu direncin üretim toleransının çıkışa ne kadar geçtiğini gösterir.',
}

export const REF_LABEL = {
  target: (y) => `hedef ${fmtVolt(y)}`,
  open: (y) => `yüksüz ${fmtVolt(y)}`,
}

export function reasonText(reason) {
  switch (reason) {
    case REASON_RATIO:
      return 'Hedef çıkış giriş geriliminden küçük olmalı. Gerilim bölücü yükseltme yapmaz.'
    case REASON_NO_PAIR:
      return 'Verilen direnç aralığında uygun çift bulunamadı. Aralığı genişletin veya daha sık bir E serisi seçin.'
    case REASON_RANGE:
      return 'Girilen değerler geçerli aralıkta değil. En büyük direnç en küçükten büyük olmalı.'
    case REASON_INCOMPLETE:
    default:
      return 'Tüm zorunlu alanlara pozitif sayısal değer girin. Ondalık için nokta veya virgül kullanabilirsiniz (0.25 = 0,25).'
  }
}

// Mühendislik yorumu — bulgu kodundan cümleye
export function findingText(fd) {
  switch (fd.code) {
    case 'stiffness':
      return fd.ratio >= fd.threshold
        ? `Bölücü akımı yük akımının ${fmt(fd.ratio, 3)} katı — yük, çıkışı belirgin biçimde çekmiyor.`
        : `Bölücü akımı yük akımının yalnızca ${fmt(fd.ratio, 3)} katı. Sert bir bölücü için ${fd.threshold}× hedeflenir; dirençleri küçültün veya çıkışı bir tampon üzerinden alın.`

    case 'loading-error':
      return `Yük, çıkışı ${fmtVolt(fd.unloaded)} → ${fmtVolt(fd.loaded)} (${fmtPct(fd.dropPct)}) değiştiriyor.`

    case 'power':
      if (fd.limit == null) {
        return `En yüklü direnç ${fmtPow(fd.Pmax, 3)} harcıyor. Güç sınırı girilirse marj değerlendirilir.`
      }
      return fd.utilisation <= 1
        ? `En yüklü direnç ${fmtPow(fd.Pmax, 3)} harcıyor — sınırın %${fmt(fd.utilisation * 100, 3)}'i.`
        : `En yüklü direnç ${fmtPow(fd.Pmax, 3)} harcıyor, ${fmtPow(fd.limit, 3)} sınırının üzerinde. Daha yüksek dirençler veya daha büyük paket gerekli.`

    case 'quiescent':
      return `Bölücü sürekli ${fmtAmp(fd.Idiv, 3)} çekiyor (${fmtPow(fd.Pdiv, 3)}). Pil beslemeli tasarımda bu akım hiç kesilmez.`

    case 'source-impedance':
      return fd.level === 'ok'
        ? `Çıkış kaynak empedansı ${fmtRes(fd.Zout, 3)} — çoğu ADC ve op-amp girişi için düşük.`
        : `Çıkış kaynak empedansı ${fmtRes(fd.Zout, 3)}. Bu değerde giriş kaçak akımı, ADC örnekleme kapasitesi ve gürültü kuplajı ölçülebilir hata üretir.`

    case 'tolerance-window':
      if (fd.acceptPct == null) {
        return `Tolerans sonrası çıkış ${fmtVolt(fd.min)} … ${fmtVolt(fd.max)} aralığında (${fmtPct(fd.minPct)} / ${fmtPct(fd.maxPct)}).`
      }
      return fd.level === 'ok'
        ? `Tolerans sonrası çıkış ${fmtVolt(fd.min)} … ${fmtVolt(fd.max)}; kabul sınırı ±${fmt(fd.acceptPct, 3)} % içinde kalıyor.`
        : `Tolerans sonrası çıkış ${fmtVolt(fd.min)} … ${fmtVolt(fd.max)} (${fmtPct(fd.minPct)} / ${fmtPct(fd.maxPct)}) — kabul sınırı ±${fmt(fd.acceptPct, 3)} % dışına çıkıyor.`

    case 'target-error':
      return fd.level === 'ok'
        ? `Seçilen çift hedefi ${fmtPct(fd.errPct)} sapmayla karşılıyor.`
        : `Seçilen çift hedeften ${fmtPct(fd.errPct)} sapıyor (sınır ±${fmt(fd.limit, 3)} %). Daha sık bir E serisi deneyin veya aralığı genişletin.`

    default:
      return null
  }
}
