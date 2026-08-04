// Buck dönüştürücü PCB ön tasarımı (REV2 §13).
//
// Araç yalnızca continuous conduction mode (CCM) çalışan temel buck power stage
// ön tasarımını kapsar (REV2 §13.1). Kontrol döngüsü kompanzasyonu, subharmonic
// oscillation, current-mode slope compensation, bootstrap ayrıntıları, minimum
// on/off time doğrulaması, mıknatıslanma çekirdek kaybının Steinmetz modeli ve
// EMI compliance KAPSAM DIŞI — REV2 bunları açıkça "iddia etmez" diyor, burada
// da uydurulmadı (§13.12: çekirdek kaybı üretici eğrisi/Steinmetz katsayısı
// girilmedikçe hesaplanmaz; bu motor o girdiyi hiç almıyor).
//
// I_L,min ÇIKARMA formülü (REV2 §13.5, kararlar §2.1'deki yedi formülden biri):
//   I_L,min = I_out − ΔI_L/2
// Sonuç NEGATİF olabilir — bu, ripple'ın yarısının ortalama akımı aştığı, yani
// çalışma noktasının artık CCM değil DCM (discontinuous conduction mode) olduğu
// anlamına gelir. Kırpma YOK (Adım 2 kararı: negatif sonuçlar sıfıra kırpılmaz).
// Bu motor değeri OLDUĞU GİBİ döndürür ve ayrıca bir DURUM sınıflandırması ekler
// (`classifyConductionMode` → BUCK_MODE_CCM | BUCK_MODE_DCM), viaStub.js'teki
// `classifyKt` ile aynı desen: hata değil, mühendislik durumu. Araç zaten yalnız
// CCM'i kapsadığını beyan ettiği için DCM sınıflaması "bu girdilerde CCM varsayımı
// geçersiz, aşağıdaki ripple/RMS/kayıp formülleri artık sıkı biçimde geçerli değil"
// uyarısını ekran katmanının kurabilmesi için taşınan bir sinyaldir.
//
// Worst-case droop istisnası (kararlar §5) BU MOTORDA GEÇMİYOR. Kararlar §5'teki
// `ΔV_approx ≈ ΔV_C + ΔV_ESR + ΔV_ESL` + `engineering-rule`/
// `worst-case-time-domain-estimate` etiketi REV2 §10.10'a (PDN Rezonans ve
// Antirezonans Analizörü) ait — orada "ana PDN hesabı her zaman kompleks
// empedans" kuralına bilinçli bir istisna olarak tanımlı. Buck'ta böyle bir ana
// kompleks PDN hesabı YOK — §13.6'nın kendi "kaba yaklaşım" toplamı
// (ΔV_out ≈ ΔV_C + ΔV_ESR, yalnız İKİ terim, ESL YOK) zaten REV2 metninde kendi
// başına "kaba yaklaşım" diye etiketli ve kompleks kuralına atıf yapmıyor. Burada
// ESL terimi eklenerek üç terimli hâle GETİRİLMEDİ — REV2 §1 "Değiştirilmeyecekler"
// fiziksel modelleri sabitliyor, kaynakta olmayan bir terim uydurulmaz.
//
// Yeniden kullanılanlar (kopya yazılmadı): switching loss (§13.9) ve gate loss
// (§13.9) formülleri gateDriver.js'teki `switchingLoss`/`gateDrivePower` ile
// birebir aynı biçimde (P=½VI(t_r+t_f)f_sw, P=N·Q·V·f_sw); bu motor onları
// doğrudan içe aktarıp kullanır.
//
// Kapsam dışı bırakılanlar (Adım 5'e, ekran katmanına ait):
//   - §13.14 Yerleşim değerlendirmesi: geometrik eşiklere göre bağlama duyarlı
//     metin öneri üretimi — bu bir "findings" işlevi, Adım 2 kararınca motor
//     dosyalarına findings fonksiyonu eklenmez (ReturnPathStitchingVia ekranının
//     `commentary(r)` deseniyle ekranda kurulur).
//   - §13.15 Grafikler: parametrik sweep'ler ekranın `buildSweep()`'inde, bu
//     motorun saf tek-nokta fonksiyonlarını döngüyle çağırarak üretilir.
//   - I_sat / I_RMS rating / I_CIN,RMS rating karşılaştırmaları: bunlar seçilen
//     bileşenin yeterliliğini gösteren birer eşik kontrolüdür, elektriksel hesabı
//     etkilemez (gateDriver.js'teki driverPeakSource/Sink'in aksine — o gerçek
//     akımı sınırlar). `validityWarnings` deseniyle ekran katmanında kalır.

import { switchingLoss, gateDrivePower } from './gateDriver'

export const BUCK_ERR_INVALID = 'invalid'
export const BUCK_ERR_STEP_UP = 'step-up-not-supported'

export const BUCK_MODE_CCM = 'ccm'
export const BUCK_MODE_DCM = 'dcm'

// --- §13.3 Duty cycle ---

export function dutyCycleIdeal({ vIn, vOut }) {
  if (!(vIn > 0) || !(vOut > 0)) return NaN
  return vOut / vIn
}

// Verim tahminli kaba yaklaşım. Düşük gerilim/yüksek akım sistemlerinde
// MOSFET/diode düşümlerini tam karşılamaz (REV2 §13.3 notu).
export function dutyCycleApprox({ vIn, vOut, eta }) {
  if (!(vIn > 0) || !(vOut > 0) || !(eta > 0)) return NaN
  return vOut / (eta * vIn)
}

// --- §13.4 İndüktör ripple akımı ---

export function inductorRippleCurrent({ vIn, vOut, d, l, fsw }) {
  if (!(vIn > vOut) || !(vOut > 0) || !(d > 0) || !(l > 0) || !(fsw > 0)) return NaN
  return ((vIn - vOut) * d) / (l * fsw)
}

// Hedef ripple'dan gerekli endüktans.
export function requiredInductance({ vIn, vOut, deltaIL, fsw }) {
  if (!(vIn > vOut) || !(vOut > 0) || !(deltaIL > 0) || !(fsw > 0)) return NaN
  return (vOut * (vIn - vOut)) / (deltaIL * fsw * vIn)
}

export function rippleRatio({ deltaIL, iOut }) {
  if (!(deltaIL >= 0) || !(iOut > 0)) return NaN
  return deltaIL / iOut
}

// rippleRatio'nun tersi: istenen ripple yüzdesinden (oran olarak, örn. 0.3 = %30)
// hedef ΔI_L. REV2 §13.2 "İstenen ripple yüzdesi" girdisini §13.4'e bağlar.
export function rippleCurrentFromRatio({ iOut, rI }) {
  if (!(iOut > 0) || !(rI > 0)) return NaN
  return iOut * rI
}

// --- §13.5 Peak ve RMS indüktör akımı + CCM sınırı ---

export function inductorPeakCurrent({ iOut, deltaIL }) {
  if (!(iOut >= 0) || !(deltaIL >= 0)) return NaN
  return iOut + deltaIL / 2
}

// ÇIKARMA — kararlar §2.1. Negatif sonuç KIRPILMAZ: ripple'ın yarısı ortalama
// akımı aştığında çalışma noktası DCM'e geçer, bu geçerli bir mühendislik
// durumudur (bkz. dosya başı notu), sessizce sıfıra oturtulmaz.
export function inductorMinCurrent({ iOut, deltaIL }) {
  if (!(iOut >= 0) || !(deltaIL >= 0)) return NaN
  return iOut - deltaIL / 2
}

export function inductorRmsCurrent({ iOut, deltaIL }) {
  if (!(iOut >= 0) || !(deltaIL >= 0)) return NaN
  return Math.sqrt(iOut * iOut + (deltaIL * deltaIL) / 12)
}

// CCM/DCM sınırındaki çıkış akımı: I_out,boundary = ΔI_L/2.
export function ccmBoundaryCurrent({ deltaIL }) {
  if (!(deltaIL >= 0)) return NaN
  return deltaIL / 2
}

// I_L,min işaretine göre çalışma modu sınıflandırması. Hata değil, durum bilgisi
// (viaStub.js → classifyKt ile aynı desen).
export function classifyConductionMode(iLMin) {
  if (!Number.isFinite(iLMin)) return null
  return iLMin >= 0 ? BUCK_MODE_CCM : BUCK_MODE_DCM
}

// --- §13.6 Output ripple ---

export function capacitiveRippleVoltage({ deltaIL, fsw, cOut }) {
  if (!(deltaIL >= 0) || !(fsw > 0) || !(cOut > 0)) return NaN
  return deltaIL / (8 * fsw * cOut)
}

export function esrRippleVoltage({ deltaIL, esr }) {
  if (!(deltaIL >= 0) || !(esr >= 0)) return NaN
  return deltaIL * esr
}

// Toplam kaba yaklaşım: ΔV_out ≈ ΔV_C + ΔV_ESR (REV2 §13.6 — yalnız iki terim,
// ESL YOK; dosya başı notuna bkz.).
export function outputRippleApprox({ deltaVC, deltaVEsr }) {
  if (!(deltaVC >= 0) || !(deltaVEsr >= 0)) return NaN
  return deltaVC + deltaVEsr
}

// Hedef ripple'dan minimum output capacitance.
export function minOutputCapacitance({ deltaIL, fsw, deltaVTarget }) {
  if (!(deltaIL >= 0) || !(fsw > 0) || !(deltaVTarget > 0)) return NaN
  return deltaIL / (8 * fsw * deltaVTarget)
}

// --- §13.7 Input capacitor RMS akımı ---

// İdeal sabit output current yaklaşımı: I_CIN,RMS ≈ I_out·√(D(1−D)). D=0.5'te
// bu ifade REV2'nin ayrıca verdiği "I_CIN,RMS,max ≈ I_out/2" kısayoluyla aynı
// sonucu üretir (√(0.5·0.5)=0.5); ayrı bir fonksiyon olarak tekrar yazılmadı.
export function inputCapacitorRmsCurrent({ iOut, d }) {
  if (!(iOut >= 0) || !(d >= 0) || !(d <= 1)) return NaN
  return iOut * Math.sqrt(d * (1 - d))
}

// --- §13.8 MOSFET iletim kaybı ---

function conductionLossTerm({ iLRms, rdsOn, dutyFactor }) {
  if (!(iLRms >= 0) || !(rdsOn >= 0) || !(dutyFactor >= 0) || !(dutyFactor <= 1)) return NaN
  return iLRms * iLRms * rdsOn * dutyFactor
}

export function highSideConductionLoss({ iLRms, rdsOnHs, d }) {
  return conductionLossTerm({ iLRms, rdsOn: rdsOnHs, dutyFactor: d })
}

export function lowSideConductionLoss({ iLRms, rdsOnLs, d }) {
  if (!(d >= 0) || !(d <= 1)) return NaN
  return conductionLossTerm({ iLRms, rdsOn: rdsOnLs, dutyFactor: 1 - d })
}

// --- §13.10 Asenkron diode kaybı ---

export function diodeAverageCurrent({ iOut, d }) {
  if (!(iOut >= 0) || !(d >= 0) || !(d <= 1)) return NaN
  return iOut * (1 - d)
}

export function diodeConductionLoss({ vF, iOut, d }) {
  if (!(vF >= 0) || !(iOut >= 0) || !(d >= 0) || !(d <= 1)) return NaN
  return vF * iOut * (1 - d)
}

export function diodeReverseRecoveryLoss({ qrr, vIn, fsw }) {
  if (!(qrr >= 0) || !(vIn > 0) || !(fsw > 0)) return NaN
  return qrr * vIn * fsw
}

// --- §13.11 Dead-time body diode kaybı (senkron) ---

// N_edges varsayılanı 2: standart tek fazlı buck anahtarlama çevriminde iki
// dead-time aralığı vardır (HS-kapanış→LS-açılış ve LS-kapanış→HS-açılış).
// Bu fiziksel bir sabit sayımdır, uydurulmuş bir mühendislik varsayımı değil;
// çok fazlı/standart dışı topolojiler için ezilebilir.
export function deadTimeBodyDiodeLoss({ vFBody, iOut, tDead, fsw, edges = 2 }) {
  if (!(vFBody >= 0) || !(iOut >= 0) || !(tDead >= 0) || !(fsw > 0) || !(edges > 0)) return NaN
  return vFBody * iOut * tDead * fsw * edges
}

// --- §13.12 İndüktör bakır kaybı ---

export function inductorCopperLoss({ iLRms, dcr }) {
  if (!(iLRms >= 0) || !(dcr >= 0)) return NaN
  return iLRms * iLRms * dcr
}

// --- §13.13 Termal ---

export function junctionTemperature({ tAmbient, pDevice, thetaJa }) {
  if (!Number.isFinite(tAmbient) || !(pDevice >= 0) || !(thetaJa >= 0)) return NaN
  return tAmbient + pDevice * thetaJa
}

/**
 * Bütün buck power-stage değerlendirmesi tek çağrıda. Gerilimler volt, akımlar
 * amper, endüktans henry, kapasitans farad, direnç ohm, süreler saniye,
 * frekans Hz, sıcaklık °C.
 *
 * Zorunlu: vIn, vOut, iOut, fsw ve ripple'ı belirleyen ÜÇ yoldan biri
 * (deltaIL doğrudan | rippleTargetRatio | l — öncelik bu sırayla). Geri kalan
 * her şey opsiyoneldir; verilmeyen blok `null` döner (uydurma varsayım yok).
 */
export function buckConverterPlan({
  vIn, vOut, iOut, fsw,
  eta = null,
  l = null, deltaIL = null, rippleTargetRatio = null,
  dcr = 0,
  cOut = null, esrCOut = 0,
  deltaVTarget = null,
  rdsOnHs = null, rdsOnLs = null,
  vg = null, qgHs = null, qgLs = null,
  tr = null, tf = null,
  vF = null, qrr = null,
  vFBody = null, tDead = null, edges = 2,
  thetaJaHs = null, thetaJaLs = null, thetaJaInductor = null, tAmbient = null,
}) {
  if (!(vIn > 0) || !(vOut > 0) || !(iOut >= 0) || !(fsw > 0)) return { error: BUCK_ERR_INVALID }
  if (!(vIn > vOut)) return { error: BUCK_ERR_STEP_UP }

  const d = dutyCycleIdeal({ vIn, vOut })
  const dApprox = eta !== null ? dutyCycleApprox({ vIn, vOut, eta }) : null

  let deltaILValue = deltaIL
  if (deltaILValue === null && rippleTargetRatio !== null) {
    deltaILValue = rippleCurrentFromRatio({ iOut, rI: rippleTargetRatio })
  }
  if (deltaILValue === null && l !== null) {
    deltaILValue = inductorRippleCurrent({ vIn, vOut, d, l, fsw })
  }
  if (!(deltaILValue > 0)) return { error: BUCK_ERR_INVALID }

  const lRequired = requiredInductance({ vIn, vOut, deltaIL: deltaILValue, fsw })
  const iLPeak = inductorPeakCurrent({ iOut, deltaIL: deltaILValue })
  const iLMin = inductorMinCurrent({ iOut, deltaIL: deltaILValue })
  const iLRms = inductorRmsCurrent({ iOut, deltaIL: deltaILValue })
  const iOutBoundary = ccmBoundaryCurrent({ deltaIL: deltaILValue })
  const mode = classifyConductionMode(iLMin)

  const outputRipple = cOut !== null
    ? (() => {
      const deltaVC = capacitiveRippleVoltage({ deltaIL: deltaILValue, fsw, cOut })
      const deltaVEsr = esrRippleVoltage({ deltaIL: deltaILValue, esr: esrCOut })
      return { deltaVC, deltaVEsr, total: outputRippleApprox({ deltaVC, deltaVEsr }) }
    })()
    : null

  const outputCapacitance = deltaVTarget !== null
    ? { min: minOutputCapacitance({ deltaIL: deltaILValue, fsw, deltaVTarget }) }
    : null

  const inputCapacitor = { rmsCurrent: inputCapacitorRmsCurrent({ iOut, d }) }

  const highSide = rdsOnHs !== null
    ? { loss: highSideConductionLoss({ iLRms, rdsOnHs, d }) }
    : null
  const lowSide = rdsOnLs !== null
    ? { loss: lowSideConductionLoss({ iLRms, rdsOnLs, d }) }
    : null
  const isSynchronous = rdsOnLs !== null

  // §13.9: switching loss ve gate loss gateDriver.js'ten aynı formülle
  // yeniden kullanılır (bkz. dosya başı notu).
  const switching = (tr !== null && tf !== null)
    ? { loss: switchingLoss({ vds: vIn, id: iOut, tr, tf, fsw }) }
    : null

  const gate = (vg !== null && qgHs !== null)
    ? (() => {
      const hs = gateDrivePower({ qg: qgHs, vOn: vg, vOff: 0, fsw, count: 1 })
      const ls = qgLs !== null ? gateDrivePower({ qg: qgLs, vOn: vg, vOff: 0, fsw, count: 1 }) : null
      return { hs, ls, total: hs + (ls ?? 0) }
    })()
    : null

  // Asenkron/senkron dallanması karşılıklı dışlayıcı: gerçek diode tüm
  // (1−D) periyodunu taşır (asenkron) YA DA LS MOSFET taşır ve yalnız
  // dead-time'da body diode devreye girer (senkron). REV2 §13.10/§13.11
  // bunları ayrı bölümler olarak veriyor; birlikte hesaplanmaz.
  const diode = (!isSynchronous && vF !== null)
    ? {
      avgCurrent: diodeAverageCurrent({ iOut, d }),
      conductionLoss: diodeConductionLoss({ vF, iOut, d }),
      reverseRecoveryLoss: qrr !== null ? diodeReverseRecoveryLoss({ qrr, vIn, fsw }) : null,
    }
    : null

  const deadTime = (isSynchronous && vFBody !== null && tDead !== null)
    ? { loss: deadTimeBodyDiodeLoss({ vFBody, iOut, tDead, fsw, edges }) }
    : null

  const inductorLoss = inductorCopperLoss({ iLRms, dcr })

  const thermal = {
    highSide: (thetaJaHs !== null && tAmbient !== null && highSide !== null)
      ? junctionTemperature({ tAmbient, pDevice: highSide.loss + (switching?.loss ?? 0), thetaJa: thetaJaHs })
      : null,
    lowSide: (thetaJaLs !== null && tAmbient !== null && lowSide !== null)
      ? junctionTemperature({ tAmbient, pDevice: lowSide.loss, thetaJa: thetaJaLs })
      : null,
    inductor: (thetaJaInductor !== null && tAmbient !== null)
      ? junctionTemperature({ tAmbient, pDevice: inductorLoss, thetaJa: thetaJaInductor })
      : null,
  }

  // Elde bulunan bütün kayıp terimlerinin en iyi çaba toplamı — REV2 §13.15'in
  // "Output current'a karşı toplam yaklaşık kayıp" grafiğinin dayandığı
  // büyüklük. Eksik terimler 0 katkı sayılır; bu bir TAMLIK iddiası değildir
  // (§13.1: "Yaklaşık kayıplar" — core loss gibi hesaplanmayan terimler dahil
  // değildir).
  const totalLossApprox = (highSide?.loss ?? 0)
    + (lowSide?.loss ?? 0)
    + (switching?.loss ?? 0)
    + (gate?.total ?? 0)
    + (diode?.conductionLoss ?? 0)
    + (diode?.reverseRecoveryLoss ?? 0)
    + (deadTime?.loss ?? 0)
    + inductorLoss

  return {
    ok: true,
    duty: { ideal: d, approx: dApprox },
    inductor: {
      deltaIL: deltaILValue,
      chosen: l,
      required: lRequired,
      rippleRatio: rippleRatio({ deltaIL: deltaILValue, iOut }),
      peak: iLPeak,
      min: iLMin,
      rms: iLRms,
      boundaryCurrent: iOutBoundary,
      mode,
      copperLoss: inductorLoss,
    },
    outputRipple,
    outputCapacitance,
    inputCapacitor,
    conduction: { highSide, lowSide, isSynchronous },
    switching,
    gate,
    diode,
    deadTime,
    thermal,
    totalLossApprox,
  }
}
