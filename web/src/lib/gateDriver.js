// MOSFET gate sürücü ve gate direnci (REV2 §6).
//
// Gate SABİT LİNEER BİR KONDANSATÖR OLARAK MODELLENMEZ. Ana hesaplar datasheet'in
// toplam gate charge (Q_g), Miller charge (Q_gd) ve plateau gerilimi üzerinden
// yürür; C_iss·ΔV yaklaşımı Miller bölgesini hiç görmez ve switching süresini
// olduğundan çok kısa tahmin eder.
//
// Gate charge eğrisi çalışma gerilimi ve akımına bağlıdır: datasheet test drain
// gerilimi ile gerçek drain gerilimi ayrışıyorsa sonuç yaklaşıktır ve ekran bunu
// söylemek zorunda.

export const GD_ERR_INVALID = 'invalid'
export const GD_ERR_NEGATIVE_RESISTANCE = 'negative-resistance-result'
export const GD_ERR_DRIVER_CURRENT = 'driver-current-insufficient'

// I_g,avg = N·Q_g·f_sw — bu ORTALAMA akımdır, peak driver akımı değil.
export function averageGateCurrent({ qg, fsw, count = 1 }) {
  if (!(qg > 0) || !(fsw > 0) || !(count >= 1)) return NaN
  return count * qg * fsw
}

// P_gate = N·Q_g·ΔV_g·f_sw. Negatif turn-off gerilimi kullanılıyorsa çevrim
// gerilim salınımı V_on − V_off olur; bu enerji driver, MOSFET iç gate direnci
// ve harici dirençler arasında dağılır.
export function gateDrivePower({ qg, vOn, vOff = 0, fsw, count = 1 }) {
  if (!(qg > 0) || !(fsw > 0) || !(count >= 1)) return NaN
  const swing = vOn - vOff
  if (!(swing > 0)) return NaN
  return count * qg * swing * fsw
}

export function totalResistance({ driver = 0, internal = 0, external = 0, trace = 0 }) {
  const sum = driver + internal + external + trace
  return sum > 0 ? sum : NaN
}

// Miller bölgesi yaklaşık gate akımı. Driver'ın datasheet peak akım limiti ayrıca
// uygulanır: direnç küçüldükçe hesap sonsuza gider ama driver o akımı veremez.
export function millerCurrent({ vDrive, vPlateau, rTotal, driverLimit = null }) {
  if (!(rTotal > 0)) return { error: GD_ERR_INVALID }
  const resistive = (vDrive - vPlateau) / rTotal
  if (!(resistive > 0)) return { error: GD_ERR_INVALID }
  const actual = driverLimit !== null && driverLimit > 0 ? Math.min(resistive, driverLimit) : resistive
  return {
    resistive,
    actual,
    // Driver limiti devreye girdiyse hedeflenen hız direnç seçimiyle değil
    // driver'ın kendisiyle sınırlanmıştır.
    driverLimited: driverLimit !== null && driverLimit > 0 && driverLimit < resistive,
  }
}

// Switching transition tahmini için Q_gd kullanılır; Q_g toplam şarj süresini
// verir ama geçişin kendisi Miller platosunda yaşanır.
export function millerTime({ qgd, current }) {
  if (!(qgd > 0) || !(current > 0)) return NaN
  return qgd / current
}

export function totalGateChargeTime({ qg, current }) {
  if (!(qg > 0) || !(current > 0)) return NaN
  return qg / current
}

/**
 * Hedef Miller süresinden gerekli HARİCİ gate direnci.
 *
 * R_g,ext = R_total,target − R_driver − R_g,int − R_trace
 *
 * Negatif sonuç, driver'ın hedef süreden daha yavaş kaldığını veya giriş
 * verilerinin tutarsız olduğunu gösterir — sessizce sıfıra kırpılmaz.
 */
export function externalResistorForTarget({
  qgd, targetTime, vDrive, vPlateau,
  driver = 0, internal = 0, trace = 0,
}) {
  if (!(qgd > 0) || !(targetTime > 0)) return { error: GD_ERR_INVALID }
  const targetCurrent = qgd / targetTime
  const swing = vDrive - vPlateau
  if (!(swing > 0)) return { error: GD_ERR_INVALID }

  const rTotalTarget = swing / targetCurrent
  const external = rTotalTarget - driver - internal - trace
  if (external < 0) {
    return { error: GD_ERR_NEGATIVE_RESISTANCE, targetCurrent, rTotalTarget, external }
  }
  return { targetCurrent, rTotalTarget, external }
}

// Basit lineer geçiş kabulü. Reverse recovery, common-source inductance,
// parazitik ringing, nonlineer C_oss ve plateau varyasyonu İÇERMEZ.
export function switchingLoss({ vds, id, tr, tf, fsw }) {
  if (!(vds > 0) || !(id > 0) || !(tr >= 0) || !(tf >= 0) || !(fsw > 0)) return NaN
  return 0.5 * vds * id * (tr + tf) * fsw
}

// E_oss datasheet'te varsa o tercih edilir: ½·C_oss·V² yaklaşımı C_oss'un
// gerilimle güçlü değişimini yok sayar ve genelde iyimser çıkar.
export function cossLoss({ coss = null, eoss = null, vds, fsw }) {
  if (!(fsw > 0)) return NaN
  if (eoss !== null && eoss >= 0) return eoss * fsw
  if (coss !== null && coss >= 0 && vds > 0) return 0.5 * coss * vds * vds * fsw
  return NaN
}

// Gate enerjisinin direnç oranına göre yaklaşık dağılımı — birinci mertebe.
export function externalResistorLoss({ pGate, external, rTotal }) {
  if (!(pGate >= 0) || !(external >= 0) || !(rTotal > 0)) return NaN
  return pGate * (external / rTotal)
}

/**
 * Bütün gate sürücü değerlendirmesi. Yükler coulomb, gerilimler volt,
 * dirençler ohm, süreler saniye, frekans Hz.
 */
export function gateDriverPlan({
  qg, qgd, vDrive, vPlateau, vOff = 0,
  rDriverSource = 0, rDriverSink = 0, rGateInternal = 0,
  rExtOn = 0, rExtOff = 0, rTrace = 0,
  driverPeakSource = null, driverPeakSink = null,
  fsw, count = 1,
  targetOnTime = null, targetOffTime = null,
  vds = null, id = null, tr = null, tf = null,
  coss = null, eoss = null,
}) {
  if (!(qg > 0) || !(qgd > 0) || !(fsw > 0)) return { error: GD_ERR_INVALID }
  if (!(vDrive > vPlateau) || !(vPlateau > vOff)) return { error: GD_ERR_INVALID }

  const rTotalOn = totalResistance({
    driver: rDriverSource, internal: rGateInternal, external: rExtOn, trace: rTrace,
  })
  const rTotalOff = totalResistance({
    driver: rDriverSink, internal: rGateInternal, external: rExtOff, trace: rTrace,
  })
  if (!Number.isFinite(rTotalOn) || !Number.isFinite(rTotalOff)) return { error: GD_ERR_INVALID }

  const on = millerCurrent({ vDrive, vPlateau, rTotal: rTotalOn, driverLimit: driverPeakSource })
  const off = millerCurrent({
    vDrive: vPlateau, vPlateau: vOff, rTotal: rTotalOff, driverLimit: driverPeakSink,
  })
  if (on.error) return { error: on.error }
  if (off.error) return { error: off.error }

  const pGate = gateDrivePower({ qg, vOn: vDrive, vOff, fsw, count })

  return {
    ok: true,
    averageCurrent: averageGateCurrent({ qg, fsw, count }),
    gatePower: pGate,
    on: {
      rTotal: rTotalOn,
      current: on.actual,
      currentResistive: on.resistive,
      driverLimited: on.driverLimited,
      // driverLimited true ise bu taraf hedeflenen hıza direnç seçimiyle değil
      // driver'ın kendi tepe akımıyla ulaşıyor — diğer "hedeften geriye doğru
      // öner" alt bloklarıyla aynı desen: r.ok true kalır, yalnız bu alt blok
      // kendi .error'ını taşır (bkz. externalResistorForTarget).
      ...(on.driverLimited ? { error: GD_ERR_DRIVER_CURRENT } : {}),
      millerTime: millerTime({ qgd, current: on.actual }),
      chargeTime: totalGateChargeTime({ qg, current: on.actual }),
      resistorLoss: externalResistorLoss({ pGate: pGate / 2, external: rExtOn, rTotal: rTotalOn }),
    },
    off: {
      rTotal: rTotalOff,
      current: off.actual,
      currentResistive: off.resistive,
      driverLimited: off.driverLimited,
      ...(off.driverLimited ? { error: GD_ERR_DRIVER_CURRENT } : {}),
      millerTime: millerTime({ qgd, current: off.actual }),
      chargeTime: totalGateChargeTime({ qg, current: off.actual }),
      resistorLoss: externalResistorLoss({ pGate: pGate / 2, external: rExtOff, rTotal: rTotalOff }),
    },
    // Hedef süre verilmezse blok null kalır; uydurma bir hedef kurulmaz.
    targetOn: targetOnTime !== null
      ? externalResistorForTarget({
        qgd, targetTime: targetOnTime, vDrive, vPlateau,
        driver: rDriverSource, internal: rGateInternal, trace: rTrace,
      })
      : null,
    targetOff: targetOffTime !== null
      ? externalResistorForTarget({
        qgd, targetTime: targetOffTime, vDrive: vPlateau, vPlateau: vOff,
        driver: rDriverSink, internal: rGateInternal, trace: rTrace,
      })
      : null,
    switchingLoss: vds !== null && id !== null && tr !== null && tf !== null
      ? switchingLoss({ vds, id, tr, tf, fsw })
      : null,
    cossLoss: coss !== null || eoss !== null ? cossLoss({ coss, eoss, vds, fsw }) : null,
  }
}
