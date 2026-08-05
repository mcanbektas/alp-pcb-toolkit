// Buck dönüştürücü PCB ön tasarım aracı ekranının kullanıcıya görünen
// metinleri — iki dilli (tr/en).
//
// Motorun (lib/buck.js) bulgu/seviye kavramı yok — Adım 2/4'ün diğer kardeş
// motorlarında olduğu gibi `divider.js`-tipi bir "findings" burada da yok.
// Bulgular ham `compute()` çıktısından `commentary(r)` ile kurulur
// (ReturnPathStitchingVia/MosfetGateDriver/ViaStubBackdrill ile aynı desen).

import {
  fmt, fmtEng, fmtRes, fmtAmp, fmtPow, fmtVolt,
} from '../../../lib/num'
import { pick } from '../../../lib/i18n'
import { commonText } from '../../../data/uiText'
import {
  REASON_INCOMPLETE, REASON_RIPPLE_METHOD,
  BUCK_ERR_INVALID, BUCK_ERR_STEP_UP, BUCK_MODE_DCM,
  TOPOLOGY_ASYNC, TOPOLOGY_SYNC,
  GND_JOIN_STAR, GND_JOIN_PLANE, GND_JOIN_SPLIT,
  SWEEP_VIN_DUTY, SWEEP_VIN_RIPPLE, SWEEP_L_PEAK, SWEEP_FSW_LOSS, SWEEP_IOUT_LOSS,
} from './model'

const fmtH = (x, sig = 3) => fmtEng(x, 'H', sig)
const fmtF = (x, sig = 3) => fmtEng(x, 'F', sig)
const fmtHzV = (x, sig = 4) => fmtEng(x, 'Hz', sig)
const fmtS = (x, sig = 3) => fmtEng(x, 's', sig)
const fmtCTemp = (x, sig = 3) => `${fmt(x, sig)} °C`

export function getText(lang) {
  const t = (dict) => pick(dict, lang)
  const { pct } = commonText(lang)

  return {
    pct,
    backlink: t({ tr: '← Güç Bütünlüğü ve Termal', en: '← Power Integrity and Thermal' }),
    title: t({
      tr: 'Buck Dönüştürücü PCB Ön Tasarım Aracı',
      en: 'Buck Converter PCB Pre-Design Tool',
    }),
    intro: t({
      tr: 'Continuous conduction mode (CCM) çalışan temel buck power stage için duty cycle, '
        + 'indüktör ripple/peak/RMS akımı, çıkış ripple’ı, yaklaşık iletim/anahtarlama '
        + 'kayıpları ve basit termal tahmini birlikte değerlendirir. Kontrol döngüsü '
        + 'kompanzasyonu, subharmonic osilasyon ve EMI uyumluluğu kapsam dışıdır.',
      en: 'Evaluates duty cycle, inductor ripple/peak/RMS current, output ripple, '
        + 'approximate conduction/switching losses and a simple thermal estimate together for '
        + 'a basic buck power stage operating in continuous conduction mode (CCM). Control '
        + 'loop compensation, subharmonic oscillation and EMI compliance are out of scope.',
    }),

    countUnit: t({ tr: 'adet', en: 'pcs' }),

    sectionInOut: t({ tr: 'Giriş / çıkış', en: 'Input / output' }),
    sectionRipple: t({ tr: 'İndüktör ve ripple', en: 'Inductor and ripple' }),
    sectionCaps: t({ tr: 'Kapasitörler', en: 'Capacitors' }),
    sectionSwitch: t({ tr: 'Anahtarlama elemanları', en: 'Switching devices' }),
    sectionGate: t({ tr: 'Anahtarlama ve gate kaybı (opsiyonel)', en: 'Switching and gate loss (optional)' }),
    sectionThermal: t({ tr: 'Termal (opsiyonel)', en: 'Thermal (optional)' }),
    sectionLayout: t({ tr: 'Yerleşim değerlendirmesi (opsiyonel)', en: 'Layout evaluation (optional)' }),

    fields: {
      vInMin: { label: t({ tr: 'Minimum giriş gerilimi', en: 'Minimum input voltage' }) },
      vInNom: { label: t({ tr: 'Nominal giriş gerilimi', en: 'Nominal input voltage' }) },
      vInMax: { label: t({ tr: 'Maksimum giriş gerilimi', en: 'Maximum input voltage' }) },
      vOut: { label: t({ tr: 'Çıkış gerilimi', en: 'Output voltage' }) },
      iOutNom: { label: t({ tr: 'Nominal çıkış akımı', en: 'Nominal output current' }) },
      iOutMax: {
        label: t({ tr: 'Maksimum çıkış akımı', en: 'Maximum output current' }),
        hint: t({
          tr: 'Yalnızca "toplam kayıp" grafiğinin üst sınırını belirler',
          en: 'Only sets the upper bound of the "total loss" chart',
        }),
      },
      fsw: { label: t({ tr: 'Anahtarlama frekansı', en: 'Switching frequency' }) },
      etaPct: {
        label: t({ tr: 'Verim tahmini (opsiyonel)', en: 'Efficiency estimate (optional)' }),
        hint: t({
          tr: 'Girilirse verim tahminli kaba duty cycle yaklaşımı da gösterilir',
          en: 'If given, the efficiency-estimated rough duty cycle approximation is also shown',
        }),
      },

      lVal: {
        label: t({ tr: 'İndüktans (L)', en: 'Inductance (L)' }),
        hint: t({
          tr: 'Ripple yüzdesi de girilirse bu alan yerine o kullanılır',
          en: 'If a ripple percentage is also given, it is used instead of this field',
        }),
      },
      ripplePct: {
        label: t({ tr: 'İstenen ripple yüzdesi (ΔI_L / I_out)', en: 'Desired ripple percentage (ΔI_L / I_out)' }),
        hint: t({
          tr: 'İndüktans yerine, hedef ripple oranından ΔI_L türetir',
          en: 'Derives ΔI_L from a target ripple ratio instead of the inductance',
        }),
      },
      dcr: { label: t({ tr: 'İndüktör DCR (opsiyonel)', en: 'Inductor DCR (optional)' }) },
      iSat: {
        label: t({ tr: 'İndüktör saturation akımı (opsiyonel)', en: 'Inductor saturation current (optional)' }),
        hint: t({
          tr: 'Girilirse peak indüktör akımıyla karşılaştırılır',
          en: 'If given, it is compared against the peak inductor current',
        }),
      },
      iRmsRating: {
        label: t({ tr: 'İndüktör RMS akım değeri (opsiyonel)', en: 'Inductor RMS current rating (optional)' }),
        hint: t({
          tr: 'Girilirse hesaplanan I_L,RMS ile karşılaştırılır',
          en: 'If given, it is compared against the calculated I_L,RMS',
        }),
      },

      cOut: {
        label: t({ tr: 'Çıkış kapasitansı (seçilen, opsiyonel)', en: 'Output capacitance (chosen, optional)' }),
        hint: t({
          tr: 'Girilirse gerçekleşen çıkış ripple’ı hesaplanır',
          en: 'If given, the resulting output ripple is calculated',
        }),
      },
      esrCOut: { label: t({ tr: 'Çıkış kondansatörü ESR\'si (opsiyonel)', en: 'Output capacitor ESR (optional)' }) },
      deltaVTarget: {
        label: t({ tr: 'Hedef çıkış ripple’ı (opsiyonel)', en: 'Target output ripple (optional)' }),
        hint: t({
          tr: 'Girilirse gereken minimum output capacitance hesaplanır',
          en: 'If given, the required minimum output capacitance is calculated',
        }),
      },
      iCinRmsRating: {
        label: t({ tr: 'Input capacitor RMS akım değeri (opsiyonel)', en: 'Input capacitor RMS current rating (optional)' }),
        hint: t({
          tr: 'Girilirse hesaplanan I_CIN,RMS ile karşılaştırılır',
          en: 'If given, it is compared against the calculated I_CIN,RMS',
        }),
      },

      topology: { label: t({ tr: 'Topoloji', en: 'Topology' }) },
      topologyAsync: t({ tr: 'Asenkron (diode)', en: 'Asynchronous (diode)' }),
      topologySync: t({ tr: 'Senkron (LS MOSFET)', en: 'Synchronous (LS MOSFET)' }),

      rdsOnHs: { label: t({ tr: 'High-side MOSFET R_DS(on) (opsiyonel)', en: 'High-side MOSFET R_DS(on) (optional)' }) },
      rdsOnLs: { label: t({ tr: 'Low-side MOSFET R_DS(on) (opsiyonel)', en: 'Low-side MOSFET R_DS(on) (optional)' }) },
      vF: { label: t({ tr: 'Diode forward gerilimi (V_F, opsiyonel)', en: 'Diode forward voltage (V_F, optional)' }) },
      qrr: { label: t({ tr: 'Diode reverse recovery yükü (Q_rr, opsiyonel)', en: 'Diode reverse recovery charge (Q_rr, optional)' }) },
      vFBody: { label: t({ tr: 'Body diode forward gerilimi (V_F,body, opsiyonel)', en: 'Body diode forward voltage (V_F,body, optional)' }) },
      tDead: { label: t({ tr: 'Ölü zaman (opsiyonel)', en: 'Dead time (optional)' }) },

      tr: { label: t({ tr: 'Yükselme süresi (t_r, opsiyonel)', en: 'Rise time (t_r, optional)' }) },
      tf: { label: t({ tr: 'Düşme süresi (t_f, opsiyonel)', en: 'Fall time (t_f, optional)' }) },
      vg: { label: t({ tr: 'Gate sürüş gerilimi (V_g, opsiyonel)', en: 'Gate drive voltage (V_g, optional)' }) },
      qgHs: { label: t({ tr: 'High-side gate yükü (Q_g, opsiyonel)', en: 'High-side gate charge (Q_g, optional)' }) },
      qgLs: { label: t({ tr: 'Low-side gate yükü (Q_g, opsiyonel)', en: 'Low-side gate charge (Q_g, optional)' }) },

      hasThermalCheck: t({ tr: 'Termal tahmini hesapla', en: 'Calculate the thermal estimate' }),
      thetaJaHs: { label: t({ tr: 'High-side θ_JA (opsiyonel)', en: 'High-side θ_JA (optional)' }) },
      thetaJaLs: { label: t({ tr: 'Low-side θ_JA (opsiyonel)', en: 'Low-side θ_JA (optional)' }) },
      thetaJaInductor: { label: t({ tr: 'İndüktör θ_JA (opsiyonel)', en: 'Inductor θ_JA (optional)' }) },
      tAmbient: { label: t({ tr: 'Ortam sıcaklığı (T_A)', en: 'Ambient temperature (T_A)' }) },
      tjMax: {
        label: t({ tr: 'Maksimum junction sıcaklığı (opsiyonel)', en: 'Maximum junction temperature (optional)' }),
        hint: t({
          tr: 'Girilirse hesaplanan T_J ile karşılaştırılır',
          en: 'If given, it is compared against the calculated T_J',
        }),
      },

      hotLoopPerimeter: { label: t({ tr: 'Input hot-loop çevresi (opsiyonel)', en: 'Input hot-loop perimeter (optional)' }) },
      switchNodeArea: { label: t({ tr: 'Switch-node alanı (opsiyonel)', en: 'Switch-node area (optional)' }) },
      capToFetDistance: { label: t({ tr: 'Input capacitor–MOSFET mesafesi (opsiyonel)', en: 'Input capacitor–MOSFET distance (optional)' }) },
      gateLoopLength: { label: t({ tr: 'Gate-loop uzunluğu (opsiyonel)', en: 'Gate-loop length (optional)' }) },
      feedbackDistance: { label: t({ tr: 'Feedback hattı — switch-node mesafesi (opsiyonel)', en: 'Feedback trace to switch-node distance (optional)' }) },
      powerViaCount: { label: t({ tr: 'Güç via sayısı (opsiyonel)', en: 'Power via count (optional)' }) },
      gndJoin: { label: t({ tr: 'Power GND ile signal GND birleşim şekli', en: 'Power GND to signal GND join style' }) },
      gndJoinStar: t({ tr: 'Tek noktada (yıldız) birleşiyor', en: 'Joined at a single (star) point' }),
      gndJoinPlane: t({ tr: 'Düzlem üzerinden doğrudan birleşiyor', en: 'Joined directly through a plane' }),
      gndJoinSplit: t({ tr: 'Ayrı kalıyor / belirsiz', en: 'Stays separate / unclear' }),
    },

    // Hata mesajında alan adı olarak görünen kısa etiketler; model.js'e verilir.
    fieldLabels: {
      vInMin: t({ tr: 'Minimum giriş gerilimi', en: 'Minimum input voltage' }),
      vInNom: t({ tr: 'Nominal giriş gerilimi', en: 'Nominal input voltage' }),
      vInMax: t({ tr: 'Maksimum giriş gerilimi', en: 'Maximum input voltage' }),
      vOut: t({ tr: 'Çıkış gerilimi', en: 'Output voltage' }),
      iOutNom: t({ tr: 'Nominal çıkış akımı', en: 'Nominal output current' }),
      iOutMax: t({ tr: 'Maksimum çıkış akımı', en: 'Maximum output current' }),
      fsw: t({ tr: 'Anahtarlama frekansı', en: 'Switching frequency' }),
      etaPct: t({ tr: 'Verim tahmini', en: 'Efficiency estimate' }),
      lVal: t({ tr: 'İndüktans', en: 'Inductance' }),
      ripplePct: t({ tr: 'İstenen ripple yüzdesi', en: 'Desired ripple percentage' }),
      dcr: t({ tr: 'İndüktör DCR', en: 'Inductor DCR' }),
      iSat: t({ tr: 'İndüktör saturation akımı', en: 'Inductor saturation current' }),
      iRmsRating: t({ tr: 'İndüktör RMS akım değeri', en: 'Inductor RMS current rating' }),
      cOut: t({ tr: 'Çıkış kapasitansı', en: 'Output capacitance' }),
      esrCOut: t({ tr: 'Çıkış kondansatörü ESR\'si', en: 'Output capacitor ESR' }),
      deltaVTarget: t({ tr: 'Hedef çıkış ripple’ı', en: 'Target output ripple' }),
      iCinRmsRating: t({ tr: 'Input capacitor RMS akım değeri', en: 'Input capacitor RMS current rating' }),
      rdsOnHs: t({ tr: 'High-side R_DS(on)', en: 'High-side R_DS(on)' }),
      rdsOnLs: t({ tr: 'Low-side R_DS(on)', en: 'Low-side R_DS(on)' }),
      vF: t({ tr: 'Diode forward gerilimi', en: 'Diode forward voltage' }),
      qrr: t({ tr: 'Diode reverse recovery yükü', en: 'Diode reverse recovery charge' }),
      vFBody: t({ tr: 'Body diode forward gerilimi', en: 'Body diode forward voltage' }),
      tDead: t({ tr: 'Ölü zaman', en: 'Dead time' }),
      tr: t({ tr: 'Yükselme süresi', en: 'Rise time' }),
      tf: t({ tr: 'Düşme süresi', en: 'Fall time' }),
      vg: t({ tr: 'Gate sürüş gerilimi', en: 'Gate drive voltage' }),
      qgHs: t({ tr: 'High-side gate yükü', en: 'High-side gate charge' }),
      qgLs: t({ tr: 'Low-side gate yükü', en: 'Low-side gate charge' }),
      thetaJaHs: t({ tr: 'High-side θ_JA', en: 'High-side θ_JA' }),
      thetaJaLs: t({ tr: 'Low-side θ_JA', en: 'Low-side θ_JA' }),
      thetaJaInductor: t({ tr: 'İndüktör θ_JA', en: 'Inductor θ_JA' }),
      tAmbient: t({ tr: 'Ortam sıcaklığı', en: 'Ambient temperature' }),
      tjMax: t({ tr: 'Maksimum junction sıcaklığı', en: 'Maximum junction temperature' }),
      hotLoopPerimeter: t({ tr: 'Input hot-loop çevresi', en: 'Input hot-loop perimeter' }),
      switchNodeArea: t({ tr: 'Switch-node alanı', en: 'Switch-node area' }),
      capToFetDistance: t({ tr: 'Input capacitor–MOSFET mesafesi', en: 'Input capacitor–MOSFET distance' }),
      gateLoopLength: t({ tr: 'Gate-loop uzunluğu', en: 'Gate-loop length' }),
      feedbackDistance: t({ tr: 'Feedback hattı mesafesi', en: 'Feedback trace distance' }),
      powerViaCount: t({ tr: 'Güç via sayısı', en: 'Power via count' }),
    },

    bigResultLabel: t({ tr: 'Duty cycle (D)', en: 'Duty cycle (D)' }),
    altLabels: {
      lUsed: t({ tr: 'indüktans', en: 'inductance' }),
      ripple: t({ tr: 'ripple ΔI_L', en: 'ripple ΔI_L' }),
      peak: t({ tr: 'peak I_L', en: 'peak I_L' }),
    },

    modeLabel: {
      ccm: t({ tr: 'CCM', en: 'CCM' }),
      dcm: t({ tr: 'DCM', en: 'DCM' }),
    },

    table: {
      dutyIdeal: t({ tr: 'Duty cycle (ideal)', en: 'Duty cycle (ideal)' }),
      dutyApprox: t({ tr: 'Duty cycle (verim tahminli)', en: 'Duty cycle (efficiency-estimated)' }),
      lRequired: t({ tr: 'Gerekli indüktans', en: 'Required inductance' }),
      lChosen: t({ tr: 'Seçilen indüktans', en: 'Chosen inductance' }),
      deltaIL: t({ tr: 'İndüktör ripple akımı (ΔI_L)', en: 'Inductor ripple current (ΔI_L)' }),
      rippleRatio: t({ tr: 'Ripple oranı (ΔI_L / I_out)', en: 'Ripple ratio (ΔI_L / I_out)' }),
      iLPeak: t({ tr: 'Peak indüktör akımı', en: 'Peak inductor current' }),
      iLMin: t({ tr: 'Minimum indüktör akımı', en: 'Minimum inductor current' }),
      iLRms: t({ tr: 'RMS indüktör akımı', en: 'RMS inductor current' }),
      iOutBoundary: t({ tr: 'CCM sınırındaki çıkış akımı', en: 'CCM boundary output current' }),
      mode: t({ tr: 'Çalışma modu', en: 'Conduction mode' }),
      inductorLoss: t({ tr: 'İndüktör bakır kaybı', en: 'Inductor copper loss' }),

      deltaVC: t({ tr: 'Kapasitif ripple (ΔV_C)', en: 'Capacitive ripple (ΔV_C)' }),
      deltaVEsr: t({ tr: 'ESR ripple (ΔV_ESR)', en: 'ESR ripple (ΔV_ESR)' }),
      deltaVTotal: t({ tr: 'Toplam çıkış ripple’ı (kaba yaklaşım)', en: 'Total output ripple (rough approximation)' }),
      cOutMin: t({ tr: 'Minimum çıkış kapasitansı', en: 'Minimum output capacitance' }),
      iCinRms: t({ tr: 'Input capacitor RMS akımı', en: 'Input capacitor RMS current' }),

      hsCondLoss: t({ tr: 'High-side iletim kaybı', en: 'High-side conduction loss' }),
      lsCondLoss: t({ tr: 'Low-side iletim kaybı', en: 'Low-side conduction loss' }),
      switchingLoss: t({ tr: 'Switching kaybı', en: 'Switching loss' }),
      gateHs: t({ tr: 'High-side gate gücü', en: 'High-side gate power' }),
      gateLs: t({ tr: 'Low-side gate gücü', en: 'Low-side gate power' }),
      gateTotal: t({ tr: 'Toplam gate gücü', en: 'Total gate power' }),
      diodeAvg: t({ tr: 'Diode ortalama akımı', en: 'Diode average current' }),
      diodeCond: t({ tr: 'Diode iletim kaybı', en: 'Diode conduction loss' }),
      diodeRr: t({ tr: 'Diode reverse recovery kaybı', en: 'Diode reverse recovery loss' }),
      deadTimeLoss: t({ tr: 'Dead-time body diode kaybı', en: 'Dead-time body diode loss' }),

      tjHs: t({ tr: 'High-side junction sıcaklığı', en: 'High-side junction temperature' }),
      tjLs: t({ tr: 'Low-side junction sıcaklığı', en: 'Low-side junction temperature' }),
      tjInductor: t({ tr: 'İndüktör sıcaklığı', en: 'Inductor temperature' }),
      totalLoss: t({ tr: 'Toplam yaklaşık kayıp', en: 'Total approximate loss' }),

      layoutHead: t({ tr: 'Girilen yerleşim değerleri', en: 'Entered layout values' }),
      hotLoopPerimeter: t({ tr: 'Input hot-loop çevresi', en: 'Input hot-loop perimeter' }),
      switchNodeArea: t({ tr: 'Switch-node alanı', en: 'Switch-node area' }),
      capToFetDistance: t({ tr: 'Input capacitor–MOSFET mesafesi', en: 'Input capacitor–MOSFET distance' }),
      gateLoopLength: t({ tr: 'Gate-loop uzunluğu', en: 'Gate-loop length' }),
      feedbackDistance: t({ tr: 'Feedback mesafesi', en: 'Feedback distance' }),
      powerViaCount: t({ tr: 'Güç via sayısı', en: 'Power via count' }),
    },

    formula: t({
      tr: `D = V_out / V_in
D ≈ V_out / (η·V_in)   (verim tahminli)

ΔI_L = (V_in−V_out)·D / (L·f_sw)
L = V_out·(V_in−V_out) / (ΔI_L·f_sw·V_in)

I_L,peak = I_out + ΔI_L/2
I_L,min  = I_out − ΔI_L/2   (negatifse DCM, kırpılmaz)
I_L,RMS  = √(I_out² + ΔI_L²/12)
I_out,boundary = ΔI_L/2

ΔV_C   ≈ ΔI_L / (8·f_sw·C_out)
ΔV_ESR ≈ ΔI_L·ESR
ΔV_out ≈ ΔV_C + ΔV_ESR   (kaba yaklaşım)
C_out,min ≥ ΔI_L / (8·f_sw·ΔV_hedef)

I_CIN,RMS ≈ I_out·√(D(1−D))

P_HS,cond ≈ I_L,RMS²·R_DS(on),HS·D
P_LS,cond ≈ I_L,RMS²·R_DS(on),LS·(1−D)
P_sw ≈ ½·V_in·I_out·(t_r+t_f)·f_sw
P_g  = Q_g·V_g·f_sw

I_D,avg ≈ I_out·(1−D)
P_D   ≈ V_F·I_out·(1−D)
P_rr  ≈ Q_rr·V_in·f_sw
P_dead ≈ V_F,body·I_out·t_dead·f_sw·N_edges

P_L,Cu = I_L,RMS²·DCR
T_J = T_A + P_device·θ_JA`,
      en: `D = V_out / V_in
D ≈ V_out / (η·V_in)   (efficiency-estimated)

ΔI_L = (V_in−V_out)·D / (L·f_sw)
L = V_out·(V_in−V_out) / (ΔI_L·f_sw·V_in)

I_L,peak = I_out + ΔI_L/2
I_L,min  = I_out − ΔI_L/2   (negative means DCM, not clamped)
I_L,RMS  = √(I_out² + ΔI_L²/12)
I_out,boundary = ΔI_L/2

ΔV_C   ≈ ΔI_L / (8·f_sw·C_out)
ΔV_ESR ≈ ΔI_L·ESR
ΔV_out ≈ ΔV_C + ΔV_ESR   (rough approximation)
C_out,min ≥ ΔI_L / (8·f_sw·ΔV_target)

I_CIN,RMS ≈ I_out·√(D(1−D))

P_HS,cond ≈ I_L,RMS²·R_DS(on),HS·D
P_LS,cond ≈ I_L,RMS²·R_DS(on),LS·(1−D)
P_sw ≈ ½·V_in·I_out·(t_r+t_f)·f_sw
P_g  = Q_g·V_g·f_sw

I_D,avg ≈ I_out·(1−D)
P_D   ≈ V_F·I_out·(1−D)
P_rr  ≈ Q_rr·V_in·f_sw
P_dead ≈ V_F,body·I_out·t_dead·f_sw·N_edges

P_L,Cu = I_L,RMS²·DCR
T_J = T_A + P_device·θ_JA`,
    }),

    detail: {
      approxDuty: t({
        tr: 'Duty cycle ideal formülle (kayıpsız) hesaplanır; verim girilmişse ayrıca kaba '
          + 'bir verim-tahminli yaklaşım gösterilir — ikisi de düşük gerilim/yüksek akımda '
          + 'MOSFET ve diode düşümlerini tam karşılamaz.',
        en: 'The duty cycle is calculated with the ideal (lossless) formula; if an efficiency '
          + 'is given, a rough efficiency-estimated approximation is also shown — neither fully '
          + 'accounts for MOSFET and diode drops at low voltage / high current.',
      }),
      noRounding: t({
        tr: 'Ara değerlerde yuvarlama yapılmaz; yalnızca gösterim yuvarlanır.',
        en: 'Intermediate values are never rounded; only the display is rounded.',
      }),
      ratingsAreScreenSide: t({
        tr: 'Saturation/RMS/ripple değer karşılaştırmaları elektriksel hesabı etkilemez; '
          + 'yalnızca seçilen bileşenin yeterliliğini gösteren eşik kontrolleridir.',
        en: 'The saturation/RMS/rating comparisons do not affect the electrical calculation; '
          + 'they are only threshold checks showing whether the chosen component is adequate.',
      }),
    },

    validity: [
      t({
        tr: 'Araç yalnızca continuous conduction mode (CCM) temel buck power stage ön '
          + 'tasarımını kapsar; kontrol döngüsü kompanzasyonu, subharmonic osilasyon, '
          + 'current-mode slope compensation, bootstrap ayrıntıları, minimum on/off süresi ve '
          + 'EMI uyumluluğu kapsam dışıdır.',
        en: 'The tool only covers basic buck power-stage pre-design in continuous conduction '
          + 'mode (CCM); control loop compensation, subharmonic oscillation, current-mode '
          + 'slope compensation, bootstrap details, minimum on/off time and EMI compliance are '
          + 'out of scope.',
      }),
      t({
        tr: 'İndüktör çekirdek kaybı hesaplanmaz — üretici eğrisi veya Steinmetz katsayıları '
          + 'girilmedikçe kesin bir core-loss modeli kurulmaz; yalnızca bakır (DCR) kaybı '
          + 'hesaba dahildir.',
        en: 'Inductor core loss is not calculated — no exact core-loss model is built unless a '
          + 'manufacturer curve or Steinmetz coefficients are supplied; only the copper (DCR) '
          + 'loss is included.',
      }),
      t({
        tr: 'Çıkış ripple’ı kapasitif ve ESR terimlerinin kaba toplamıdır (ESL terimi yok); '
          + 'gerçek ripple dalga şekli ve ESL katkısı bu modelde yer almaz.',
        en: 'The output ripple is a rough sum of the capacitive and ESR terms (no ESL term); '
          + 'the real ripple waveform and the ESL contribution are not part of this model.',
      }),
      t({
        tr: 'Switching kaybı basit lineer V·I geçiş varsayımıdır — reverse recovery, '
          + 'common-source endüktansı, parazitik ringing ve plato varyasyonunu içermez.',
        en: 'The switching loss uses a simple linear V·I transition assumption — it excludes '
          + 'reverse recovery, common-source inductance, parasitic ringing and plateau '
          + 'variation.',
      }),
      t({
        tr: 'Termal model tek boyutludur (T_J = T_A + P·θ_JA); PCB bakır alanı, airflow ve '
          + 'çoklu ısı yolu etkileşimini tek başına çözmez.',
        en: 'The thermal model is one-dimensional (T_J = T_A + P·θ_JA); it does not on its own '
          + 'resolve PCB copper area, airflow or multiple heat-path interactions.',
      }),
      t({
        tr: 'Yerleşim değerlendirmesi geometrik eşiklerin üreticiye göre değiştiğini kabul '
          + 'eder; burada sabit bir sayısal sınır uygulanmaz, yalnızca genel yerleşim kuralları '
          + 've girilen değerlerin özeti gösterilir.',
        en: 'The layout evaluation acknowledges that the geometric thresholds are '
          + 'manufacturer-dependent; no fixed numeric limit is applied here, only the general '
          + 'layout rules and a summary of the entered values are shown.',
      }),
      t({
        tr: 'Sonuçlar yaklaşık mühendislik tahminidir — kritik tasarımlarda üretici verisi ve '
          + 'ölçümle doğrulayın.',
        en: 'Results are approximate engineering estimates — verify against manufacturer data '
          + 'and measurement for critical designs.',
      }),
    ],

    sweepGroup: t({ tr: 'Grafik', en: 'Chart' }),
    sweepLabel: {
      [SWEEP_VIN_DUTY]: t({ tr: 'Giriş gerilimi / duty cycle', en: 'Input voltage / duty cycle' }),
      [SWEEP_VIN_RIPPLE]: t({ tr: 'Giriş gerilimi / ripple akımı', en: 'Input voltage / ripple current' }),
      [SWEEP_L_PEAK]: t({ tr: 'İndüktans / peak akım', en: 'Inductance / peak current' }),
      [SWEEP_FSW_LOSS]: t({ tr: 'Anahtarlama frekansı / switching kaybı', en: 'Switching frequency / switching loss' }),
      [SWEEP_IOUT_LOSS]: t({ tr: 'Çıkış akımı / toplam kayıp', en: 'Output current / total loss' }),
    },
    sweepAxis: {
      [SWEEP_VIN_DUTY]: t({ tr: 'Giriş gerilimi (V)', en: 'Input voltage (V)' }),
      [SWEEP_VIN_RIPPLE]: t({ tr: 'Giriş gerilimi (V)', en: 'Input voltage (V)' }),
      [SWEEP_L_PEAK]: t({ tr: 'İndüktans (H)', en: 'Inductance (H)' }),
      [SWEEP_FSW_LOSS]: t({ tr: 'Anahtarlama frekansı (Hz)', en: 'Switching frequency (Hz)' }),
      [SWEEP_IOUT_LOSS]: t({ tr: 'Çıkış akımı (A)', en: 'Output current (A)' }),
    },
    sweepYLabel: {
      [SWEEP_VIN_DUTY]: t({ tr: 'Duty cycle', en: 'Duty cycle' }),
      [SWEEP_VIN_RIPPLE]: t({ tr: 'İndüktör ripple akımı (A)', en: 'Inductor ripple current (A)' }),
      [SWEEP_L_PEAK]: t({ tr: 'Peak indüktör akımı (A)', en: 'Peak inductor current (A)' }),
      [SWEEP_FSW_LOSS]: t({ tr: 'Switching kaybı (W)', en: 'Switching loss (W)' }),
      [SWEEP_IOUT_LOSS]: t({ tr: 'Toplam yaklaşık kayıp (W)', en: 'Total approximate loss (W)' }),
    },
    sweepCaption: {
      [SWEEP_VIN_DUTY]: t({
        tr: 'Duty cycle giriş gerilimiyle ters orantılı azalır; verim tahmini girilmişse '
          + 'yaklaşık eğri her zaman ideal eğrinin üzerinde kalır.',
        en: 'Duty cycle decreases inversely with input voltage; if an efficiency estimate is '
          + 'given, the approximate curve always stays above the ideal curve.',
      }),
      [SWEEP_VIN_RIPPLE]: t({
        tr: 'İndüktans sabit tutulup giriş gerilimi taranır; ripple akımı giriş geriliminin '
          + 'artmasıyla büyür.',
        en: 'The inductance is held fixed while the input voltage is swept; the ripple current '
          + 'grows as the input voltage rises.',
      }),
      [SWEEP_L_PEAK]: t({
        tr: 'İndüktans arttıkça ripple ve dolayısıyla peak akım azalır; çok küçük indüktansta '
          + 'peak akım hızla büyür, büyük indüktansta I_out’a yaklaşır (ΔI_L → 0).',
        en: 'As inductance increases, the ripple and hence the peak current fall; at very small '
          + 'inductance the peak current rises quickly, and at large inductance it approaches '
          + 'I_out (ΔI_L → 0).',
      }),
      [SWEEP_FSW_LOSS]: t({
        tr: 'Switching kaybı anahtarlama frekansıyla doğrusal artar (log-log eksende düz '
          + 'çizgi).',
        en: 'Switching loss rises linearly with switching frequency (a straight line on '
          + 'log-log axes).',
      }),
      [SWEEP_IOUT_LOSS]: t({
        tr: 'Toplam yaklaşık kayıp çıkış akımıyla birlikte büyür; iletim kayıpları akımın '
          + 'karesiyle, switching/gate kayıpları ise akımdan bağımsız sabit bir tabanla '
          + 'katkı yapar.',
        en: 'The total approximate loss grows with output current; conduction losses scale '
          + 'with the square of the current, while switching/gate losses contribute a fixed '
          + 'baseline independent of current.',
      }),
    },
    seriesIdeal: t({ tr: 'ideal', en: 'ideal' }),
    seriesApprox: t({ tr: 'verim tahminli', en: 'efficiency-estimated' }),
    operatingPoint: t({ tr: 'çalışma noktası', en: 'operating point' }),

    schematic: {
      title: t({ tr: 'Buck power stage şeması', en: 'Buck power stage schematic' }),
      captionAsync: t({ tr: 'Asenkron buck (diode)', en: 'Asynchronous buck (diode)' }),
      captionSync: t({ tr: 'Senkron buck (LS MOSFET)', en: 'Synchronous buck (LS MOSFET)' }),
      hs: t({ tr: 'HS', en: 'HS' }),
      ls: t({ tr: 'LS', en: 'LS' }),
      diode: t({ tr: 'D', en: 'D' }),
      inductorLabel: t({ tr: 'L', en: 'L' }),
      switchNode: t({ tr: 'switch node', en: 'switch node' }),
    },

    reasonText: (reason) => {
      switch (reason) {
        case REASON_RIPPLE_METHOD:
          return t({
            tr: 'Ripple’ı belirlemek için İndüktans veya İstenen ripple yüzdesinden birini '
              + 'girin.',
            en: 'Enter either the inductance or the desired ripple percentage to determine the '
              + 'ripple.',
          })
        case BUCK_ERR_STEP_UP:
          return t({
            tr: 'Çıkış gerilimi giriş geriliminden küçük olmalı — bu araç yalnızca step-down '
              + '(buck) topolojisini kapsar.',
            en: 'The output voltage must be lower than the input voltage — this tool only '
              + 'covers the step-down (buck) topology.',
          })
        case BUCK_ERR_INVALID:
        case REASON_INCOMPLETE:
        default:
          return t({
            tr: 'Tüm zorunlu alanlara pozitif sayısal değer girin. Ondalık için nokta veya '
              + 'virgül kullanabilirsiniz (0.25 = 0,25).',
            en: 'Enter a positive numeric value in every required field. Use a point or a '
              + 'comma for decimals (0.25 = 0,25).',
          })
      }
    },

    gndJoinLabel: (v) => {
      if (v === GND_JOIN_STAR) return t({ tr: 'tek nokta (yıldız)', en: 'single (star) point' })
      if (v === GND_JOIN_PLANE) return t({ tr: 'düzlem üzerinden', en: 'through a plane' })
      return t({ tr: 'ayrı / belirsiz', en: 'separate / unclear' })
    },

    layoutSuggestions: [
      t({ tr: 'Input capacitor’ı switching pair’e yaklaştır.', en: 'Move the input capacitor closer to the switching pair.' }),
      t({ tr: 'Hot-loop alanını küçült.', en: 'Shrink the hot-loop area.' }),
      t({ tr: 'Switch-node copper alanını gereksiz büyütme.', en: 'Do not enlarge the switch-node copper area unnecessarily.' }),
      t({ tr: 'Feedback hattını switch node’dan uzak tut.', en: 'Keep the feedback trace away from the switch node.' }),
      t({ tr: 'Gate loop’u kısa tut.', en: 'Keep the gate loop short.' }),
      t({ tr: 'High di/dt dönüş yolunu bölme.', en: 'Do not split the high di/dt return path.' }),
    ],

    // Mühendislik yorumu — motorun `level`/`findings` kavramı olmadığı için
    // ham `r`den burada kurulur (bkz. dosya başı notu).
    commentary: (r) => {
      if (!r.ok) return []
      const out = []

      const lUsed = r.inductor.used
      out.push({
        level: 'ok',
        text: t({
          tr: `Duty cycle D=${fmt(r.duty.ideal, 4)} (V_in=${fmtVolt(r.vInNom)}, `
            + `V_out=${fmtVolt(r.vOut)}); ${fmtH(lUsed)} indüktansla ΔI_L=`
            + `${fmtAmp(r.inductor.deltaIL, 3)} tepe-tepe ripple.`,
          en: `Duty cycle D=${fmt(r.duty.ideal, 4)} (V_in=${fmtVolt(r.vInNom)}, `
            + `V_out=${fmtVolt(r.vOut)}); with an inductance of ${fmtH(lUsed)} the `
            + `peak-to-peak ripple is ΔI_L=${fmtAmp(r.inductor.deltaIL, 3)}.`,
        }),
      })

      // Girilen bobin hesaba hiç girmediyse bu SÖYLENİR. Sessiz kalındığında
      // kullanıcı ekranda yazan indüktansın kendi girdiği parça olduğunu sanıp
      // peak/RMS akımı, ΔV_C'yi ve T_j'yi ona ait okuyordu; oysa hepsi ripple
      // hedefinden türeyen `required` bobinin sayıları.
      //
      // Uyarı yalnız fark GÖRÜNÜRKEN basılır. İki girdi aynı çalışma noktasını
      // tarif ettiğinde (varsayılan form tam böyledir: 20 µH zaten %30 ripple
      // demek) "20 µH kullanılmadı, sonuçlar 20 µH'e ait" cümlesi doğru ama
      // anlamsızdır ve gerçek atılmaları da gözden düşürür. Eşik %1: bunun
      // altındaki fark ekrandaki yuvarlamada zaten görünmez.
      const lFarki = r.inductor.chosen != null && r.inductor.used > 0
        ? Math.abs(r.inductor.chosen - r.inductor.used) / r.inductor.used
        : 0
      if (r.inductor.chosenIgnored && lFarki > 0.01) {
        out.push({
          level: 'warn',
          text: t({
            tr: `Girilen ${fmtH(r.inductor.chosen)} indüktans HESABA GİRMEDİ: ripple `
              + `hedefi verildiği için ΔI_L ondan türetildi ve sonuçlar ${fmtH(lUsed)} `
              + 'bobine aittir. Girdiğiniz bobinin sayılarını görmek için ripple hedefini boşaltın.',
            en: `The ${fmtH(r.inductor.chosen)} inductance you entered was NOT used: a ripple `
              + `target was given, so ΔI_L came from it and every result belongs to a ${fmtH(lUsed)} `
              + 'inductor. Clear the ripple target to see the numbers for your own part.',
          }),
        })
      }

      // İdeal duty her zaman (0,1) içindedir (D=V_out/V_in, BUCK_ERR_STEP_UP
      // V_out<V_in'i zaten dayatıyor) ama verim tahminli dApprox=V_out/(η·V_in)
      // düşük η'da kolayca 1'i aşar — motor (buck.js) bunu sınırlamaz/kırpmaz,
      // yalnızca sayıyı döner (dosya başı notu: findings kavramı yok). 1'i aşan
      // bir duty, %100 anahtarlamayla bile hedef çıkışa ulaşılamadığı, yani bu
      // verim varsayımıyla GERÇEKLEŞTİRİLEMEZ bir tasarım anlamına gelir —
      // diğer sınır-aşımı bulgularıyla (iSat, iRmsRating, tjMax, gndJoin split)
      // aynı 'danger' seviyesi kullanılır. Negatif dApprox formülün girdi
      // guard'ları (vIn/vOut/eta hepsi >0) altında oluşamaz ama savunmacı
      // olarak aynı notta yakalanır.
      if (r.duty.approx != null && Number.isFinite(r.duty.approx)
        && (r.duty.approx > 1 || r.duty.approx < 0)) {
        out.push({
          level: 'danger',
          text: t({
            tr: `Duty cycle (verim tahminli) dApprox=${fmt(r.duty.approx, 4)} — fiziksel `
              + 'olarak geçerli (0, 1] aralığının dışında: bu verim varsayımıyla istenen '
              + 'çıkış gerilimine mevcut giriş geriliminden ulaşılamaz, tasarım bu haliyle '
              + 'GERÇEKLEŞTİRİLEMEZ. Giriş gerilimini artırın, çıkış gerilimini düşürün ya '
              + 'da verim tahminini gözden geçirin.',
            en: `Duty cycle (efficiency-estimated) dApprox=${fmt(r.duty.approx, 4)} — falls `
              + 'outside the physically valid (0, 1] range: under this efficiency '
              + 'assumption, the desired output voltage cannot be reached from the '
              + 'available input voltage, and the design is NOT REALIZABLE as specified. '
              + 'Raise the input voltage, lower the output voltage, or revisit the '
              + 'efficiency estimate.',
          }),
        })
      }

      // I_L,min ÇIKARMA sonucu negatif olabilir (DCM) — kırpılmaz, hata değildir
      // (REV2 §13.1 aracın kapsamını CCM ile sınırlıyor). Durum nötr/warn
      // seviyesinde gösterilir, ViaStubBackdrill'deki classifyKt/K_t deseniyle aynı.
      out.push(r.inductor.mode === BUCK_MODE_DCM
        ? {
          level: 'warn',
          text: t({
            tr: `I_L,min=${fmtAmp(r.inductor.min, 3)} — negatif, yani bu çalışma noktası `
              + 'discontinuous conduction mode’a (DCM) düşüyor. Araç yalnızca CCM’i '
              + 'kapsıyor; bu noktadan sonraki ripple/RMS/kayıp formülleri artık sıkı '
              + 'biçimde geçerli değil.',
            en: `I_L,min=${fmtAmp(r.inductor.min, 3)} — negative, meaning this operating point `
              + 'falls into discontinuous conduction mode (DCM). The tool only covers CCM; '
              + 'the ripple/RMS/loss formulas beyond this point are no longer strictly valid.',
          }),
        }
        : {
          level: 'ok',
          text: t({
            tr: `I_L,min=${fmtAmp(r.inductor.min, 3)} — pozitif, çalışma noktası CCM sınırının `
              + `(I_out,boundary=${fmtAmp(r.inductor.boundaryCurrent, 3)}) içinde kalıyor.`,
            en: `I_L,min=${fmtAmp(r.inductor.min, 3)} — positive, the operating point stays `
              + `inside the CCM boundary (I_out,boundary=${fmtAmp(r.inductor.boundaryCurrent, 3)}).`,
          }),
        })

      if (r.outputRipple) {
        out.push({
          level: 'ok',
          text: t({
            tr: `Girilen output capacitance ile toplam çıkış ripple’ı (kaba yaklaşım) `
              + `${fmtVolt(r.outputRipple.total)} (ΔV_C=${fmtVolt(r.outputRipple.deltaVC)}, `
              + `ΔV_ESR=${fmtVolt(r.outputRipple.deltaVEsr)}).`,
            en: `With the entered output capacitance, the total output ripple (rough `
              + `approximation) is ${fmtVolt(r.outputRipple.total)} `
              + `(ΔV_C=${fmtVolt(r.outputRipple.deltaVC)}, ΔV_ESR=${fmtVolt(r.outputRipple.deltaVEsr)}).`,
          }),
        })
      }

      if (r.outputCapacitance) {
        out.push({
          level: 'ok',
          text: t({
            tr: `Hedef ripple için gereken minimum output capacitance `
              + `${fmtF(r.outputCapacitance.min)}.`,
            en: `The minimum output capacitance required for the target ripple is `
              + `${fmtF(r.outputCapacitance.min)}.`,
          }),
        })
      }

      if (r.iSat != null) {
        out.push(r.inductor.peak > r.iSat
          ? {
            level: 'danger',
            text: t({
              tr: `Peak indüktör akımı (${fmtAmp(r.inductor.peak, 3)}) girilen saturation `
                + `akımını (${fmtAmp(r.iSat, 3)}) AŞIYOR — indüktör saturasyona girebilir.`,
              en: `The peak inductor current (${fmtAmp(r.inductor.peak, 3)}) EXCEEDS the `
                + `entered saturation current (${fmtAmp(r.iSat, 3)}) — the inductor may `
                + 'saturate.',
            }),
          }
          : {
            level: 'ok',
            text: t({
              tr: `Peak indüktör akımı (${fmtAmp(r.inductor.peak, 3)}) saturation akımının `
                + `(${fmtAmp(r.iSat, 3)}) altında.`,
              en: `The peak inductor current (${fmtAmp(r.inductor.peak, 3)}) stays below the `
                + `saturation current (${fmtAmp(r.iSat, 3)}).`,
            }),
          })
      }

      if (r.iRmsRating != null) {
        out.push(r.inductor.rms > r.iRmsRating
          ? {
            level: 'danger',
            text: t({
              tr: `RMS indüktör akımı (${fmtAmp(r.inductor.rms, 3)}) girilen RMS akım değerini `
                + `(${fmtAmp(r.iRmsRating, 3)}) AŞIYOR.`,
              en: `The RMS inductor current (${fmtAmp(r.inductor.rms, 3)}) EXCEEDS the entered `
                + `RMS current rating (${fmtAmp(r.iRmsRating, 3)}).`,
            }),
          }
          : {
            level: 'ok',
            text: t({
              tr: `RMS indüktör akımı (${fmtAmp(r.inductor.rms, 3)}) girilen RMS akım değerinin `
                + `(${fmtAmp(r.iRmsRating, 3)}) altında.`,
              en: `The RMS inductor current (${fmtAmp(r.inductor.rms, 3)}) stays below the `
                + `entered RMS current rating (${fmtAmp(r.iRmsRating, 3)}).`,
            }),
          })
      }

      if (r.iCinRmsRating != null) {
        out.push(r.inputCapacitor.rmsCurrent > r.iCinRmsRating
          ? {
            level: 'danger',
            text: t({
              tr: `Input capacitor RMS akımı (${fmtAmp(r.inputCapacitor.rmsCurrent, 3)}) `
                + `girilen değeri (${fmtAmp(r.iCinRmsRating, 3)}) AŞIYOR.`,
              en: `The input capacitor RMS current (${fmtAmp(r.inputCapacitor.rmsCurrent, 3)}) `
                + `EXCEEDS the entered rating (${fmtAmp(r.iCinRmsRating, 3)}).`,
            }),
          }
          : {
            level: 'ok',
            text: t({
              tr: `Input capacitor RMS akımı (${fmtAmp(r.inputCapacitor.rmsCurrent, 3)}) `
                + `girilen değerin (${fmtAmp(r.iCinRmsRating, 3)}) altında.`,
              en: `The input capacitor RMS current (${fmtAmp(r.inputCapacitor.rmsCurrent, 3)}) `
                + `stays below the entered rating (${fmtAmp(r.iCinRmsRating, 3)}).`,
            }),
          })
      }

      if (r.hasThermal && r.tjMax != null) {
        const checks = [
          { t: r.thermal.highSide, label: t({ tr: 'High-side', en: 'High-side' }) },
          { t: r.thermal.lowSide, label: t({ tr: 'Low-side', en: 'Low-side' }) },
          { t: r.thermal.inductor, label: t({ tr: 'İndüktör', en: 'Inductor' }) },
        ]
        checks.forEach(({ t: tj, label }) => {
          if (tj == null) return
          out.push(tj > r.tjMax
            ? {
              level: 'danger',
              text: t({
                tr: `${label} junction sıcaklığı (${fmtCTemp(tj)}) girilen maksimumu `
                  + `(${fmtCTemp(r.tjMax)}) AŞIYOR.`,
                en: `The ${label} junction temperature (${fmtCTemp(tj)}) EXCEEDS the entered `
                  + `maximum (${fmtCTemp(r.tjMax)}).`,
              }),
            }
            : {
              level: 'ok',
              text: t({
                tr: `${label} junction sıcaklığı (${fmtCTemp(tj)}) girilen maksimumun `
                  + `(${fmtCTemp(r.tjMax)}) altında.`,
                en: `The ${label} junction temperature (${fmtCTemp(tj)}) stays below the `
                  + `entered maximum (${fmtCTemp(r.tjMax)}).`,
              }),
            })
        })
      }

      if (r.diode?.reverseRecoveryLoss != null) {
        out.push({
          level: 'ok',
          text: t({
            tr: `Reverse recovery kaybı ${fmtPow(r.diode.reverseRecoveryLoss)} — bu diode’un `
              + 'ölçülmüş Q_rr değerine bağlıdır, veri sayfası test koşuluna uzak çalışma '
              + 'noktalarında yaklaşıktır.',
            en: `The reverse recovery loss is ${fmtPow(r.diode.reverseRecoveryLoss)} — this `
              + 'depends on the diode’s measured Q_rr and is approximate at operating points '
              + 'far from the datasheet test condition.',
          }),
        })
      }

      const layoutFilled = Object.entries(r.layout)
        .some(([k, v]) => k !== 'gndJoin' && v != null)
      if (layoutFilled) {
        out.push({
          level: 'ok',
          text: t({
            tr: 'Yerleşim: geometrik eşikler üreticiye göre değiştiğinden burada sabit bir '
              + 'sayısal sınır uygulanmaz; genel kural olarak: '
              + layoutSuggestionsJoin(t),
            en: 'Layout: since the geometric thresholds are manufacturer-dependent, no fixed '
              + 'numeric limit is applied here; as a general rule: '
              + layoutSuggestionsJoin(t),
          }),
        })
      }

      out.push(r.layout.gndJoin === GND_JOIN_SPLIT
        ? {
          level: 'danger',
          text: t({
            tr: 'Power GND ile signal GND ayrı kalıyor/belirsiz — bu, high di/dt dönüş '
              + 'yolunu bölerek döngü alanını büyütür ve EMI riskini artırır.',
            en: 'The power GND and signal GND stay separate/unclear — this splits the high '
              + 'di/dt return path, enlarging the loop area and increasing EMI risk.',
          }),
        }
        : {
          level: 'ok',
          text: t({
            tr: `Power GND ile signal GND ${r.layout.gndJoin === GND_JOIN_STAR ? 'tek noktada (yıldız)' : 'düzlem üzerinden'} birleşiyor — dönüş yolu bölünmüyor.`,
            en: `The power GND and signal GND are joined ${r.layout.gndJoin === GND_JOIN_STAR ? 'at a single (star) point' : 'through a plane'} — the return path is not split.`,
          }),
        })

      out.push({
        level: 'ok',
        text: t({
          tr: `Elde bulunan terimlerin toplamıyla toplam yaklaşık kayıp `
            + `${fmtPow(r.totalLossApprox)} — hesaplanmayan çekirdek kaybı gibi terimler dahil `
            + 'değildir.',
          en: `Summing the available terms, the total approximate loss is `
            + `${fmtPow(r.totalLossApprox)} — terms that are not calculated, such as core `
            + 'loss, are not included.',
        }),
      })

      return out
    },
  }
}

function layoutSuggestionsJoin(t) {
  const tr = 'input capacitor’ı switching pair’e yaklaştırın, hot-loop alanını küçültün, '
    + 'switch-node copper alanını gereksiz büyütmeyin, feedback hattını switch node’dan uzak '
    + 'tutun, gate loop’u kısa tutun, high di/dt dönüş yolunu bölmeyin.'
  const en = 'move the input capacitor closer to the switching pair, shrink the hot-loop area, '
    + 'do not enlarge the switch-node copper area unnecessarily, keep the feedback trace away '
    + 'from the switch node, keep the gate loop short, do not split the high di/dt return path.'
  return t({ tr, en })
}
