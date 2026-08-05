// PDN Rezonans ve Antirezonans Analizörü ekranının kullanıcıya görünen
// metinleri — iki dilli (tr/en).
//
// Hesap katmanı (lib/pdnResonance.js, model.js) yalnızca kod ve sayı üretir;
// dile çeviri burada yapılır. Motorun findings()/level kavramı yok — diğer
// Adım 5 ekranlarında olduğu gibi (bkz. model.js başlığı) `commentary(r)`
// ham `r`den burada kurulur.

import {
  fmt, fmtEng, fmtRes, fmtVolt, fmtPct,
} from '../../../lib/num'
import { pick } from '../../../lib/i18n'
import { commonText } from '../../../data/uiText'
import {
  REASON_INCOMPLETE, REASON_POINTS, REASON_COUNT,
  PROMINENCE_MIN_DB, PROMINENCE_MAX_DB,
} from './model'
import {
  PDNR_ERR_INVALID, PDNR_ERR_NO_BRANCHES, PDNR_ERR_DERATING_RANGE, PDNR_ERR_TOLERANCE_RANGE,
} from '../../../lib/pdnResonance'
import { SWEEP_ERR_NONPOSITIVE, SWEEP_ERR_RANGE, SWEEP_ERR_POINTS } from '../../../lib/sweep'
import { PEAKS_ERR_THRESHOLD, PEAKS_ERR_NONPOSITIVE, PEAKS_ERR_LENGTH } from '../../../lib/peaks'

const fmtHz = (x, sig = 4) => fmtEng(x, 'Hz', sig)
const fmtF = (x, sig = 3) => fmtEng(x, 'F', sig)
const fmtSec = (x, sig = 3) => fmtEng(x, 's', sig)

// REV2 §10.10 metninde ve kararlar §5'te BİREBİR AYNI, tam yazılı istisna
// açıklaması. Motor bu cümleyi taşımaz (dil bilmez kuralı) — `engineeringRule:
// 'worst-case-time-domain-estimate'` etiketiyle döner, cümlenin kendisi
// burada durur. Kendi kelimelerimizle yeniden yazılmaz/özetlenmez.
const DROOP_EXCEPTION_TR = 'Bu cebirsel toplam, ana PDN kompleks empedans hesabının yerine '
  + 'kullanılmaz. Kapasitif droop, ESR step\'i ve ESL kaynaklı gerilim sıçramasının aynı '
  + 'yönde oluştuğu muhafazakâr bir zaman alanı worst-case tahminidir. Bu nedenle ortak '
  + 'kompleks empedans kuralının bilinçli ve yalnızca bu tahmin için kullanılan bir '
  + 'istisnasıdır.'
// Yukarıdaki Türkçe cümlenin birebir, eksiksiz İngilizce çevirisi (özetlenmemiş,
// her cümle karşılanmış).
const DROOP_EXCEPTION_EN = 'This algebraic sum does not replace the main PDN complex-impedance '
  + 'calculation. It is a conservative time-domain worst-case estimate that assumes the '
  + 'capacitive droop, the ESR step and the ESL-induced voltage spike all occur in the same '
  + 'direction. For this reason it is a deliberate exception to the common complex-impedance '
  + 'rule, used only for this estimate.'
const DROOP_TAG_TR = '(kaynak etiketi: mühendislik kuralı — worst-case-time-domain-estimate)'
const DROOP_TAG_EN = '(source tag: engineering rule — worst-case-time-domain-estimate)'

export function getText(lang) {
  const t = (dict) => pick(dict, lang)
  const { pct } = commonText(lang)

  return {
    pct,
    backlink: t({ tr: '← Güç Bütünlüğü ve Termal', en: '← Power Integrity and Thermal' }),
    title: t({
      tr: 'PDN Rezonans ve Antirezonans Analizörü',
      en: 'PDN Resonance and Antiresonance Analyzer',
    }),
    intro: t({
      tr: 'VRM, bulk/MLCC kondansatör grupları ve plane kolunu birlikte, tüm bir frekans '
        + 'sweep\'i boyunca kompleks olarak çözer; toplam PDN empedansını, hedefi aşan bant '
        + 'aralıklarını ve dB tabanlı prominence ile doğrulanmış rezonans/antirezonans '
        + 'tepelerini gösterir. Mevcut PDN Hedef Empedansı ve Decoupling Ağı araçlarının '
        + 'ileri seviye devamıdır; o araçlar kaldırılmadı.',
      en: 'Solves the VRM, the bulk/MLCC capacitor groups and the plane branch together, as '
        + 'a complex network across a full frequency sweep; shows the total PDN impedance, the '
        + 'frequency bands that exceed the target, and the dB-prominence-verified resonance and '
        + 'antiresonance peaks. This is an advanced continuation of the existing PDN Target '
        + 'Impedance and Decoupling Network tools; those tools were not removed.',
    }),

    countUnit: t({ tr: 'adet', en: 'pcs' }),

    fields: {
      Vrail: { label: t({ tr: 'Nominal hat gerilimi (V_rail)', en: 'Nominal rail voltage (V_rail)' }) },
      ripplePct: {
        label: t({ tr: 'İzin verilen ripple yüzdesi (opsiyonel)', en: 'Allowed ripple percentage (optional)' }),
        hint: t({
          tr: 'ΔV_allowed doğrudan girilmezse V_rail·ripple/100 olarak kullanılır',
          en: 'Used as V_rail·ripple/100 when ΔV_allowed is not entered directly',
        }),
      },
      deltaVAllowed: {
        label: t({ tr: 'İzin verilen mutlak ripple (ΔV_allowed, opsiyonel)', en: 'Allowed absolute ripple (ΔV_allowed, optional)' }),
        hint: t({
          tr: 'Girilirse ripple yüzdesinin yerine doğrudan kullanılır',
          en: 'If entered, this is used directly instead of the ripple percentage',
        }),
      },
      deltaI: { label: t({ tr: 'Yük adımı (ΔI)', en: 'Load step (ΔI)' }) },
      fMin: { label: t({ tr: 'Minimum analiz frekansı', en: 'Minimum analysis frequency' }) },
      fMax: { label: t({ tr: 'Maksimum analiz frekansı', en: 'Maximum analysis frequency' }) },
      points: {
        label: t({ tr: 'Nokta sayısı', en: 'Point count' }),
        hint: t({ tr: 'Logaritmik sweep, en az 3 nokta', en: 'Logarithmic sweep, at least 3 points' }),
      },
      threshold: {
        label: t({ tr: 'Belirginlik eşiği', en: 'Prominence threshold' }),
        hint: t({
          tr: `Varsayılan 3 dB; izin verilen aralık ${PROMINENCE_MIN_DB}–${PROMINENCE_MAX_DB} dB`,
          en: `Default 3 dB; allowed range ${PROMINENCE_MIN_DB}–${PROMINENCE_MAX_DB} dB`,
        }),
      },

      hasVrmCheck: t({ tr: 'VRM kolunu ağa ekle', en: 'Add the VRM branch to the network' }),
      vrmR: { label: t({ tr: 'VRM çıkış direnci (R)', en: 'VRM output resistance (R)' }) },
      vrmL: { label: t({ tr: 'VRM çıkış endüktansı (L)', en: 'VRM output inductance (L)' }) },
      vrmC: {
        label: t({ tr: 'VRM çıkış kondansatörü (opsiyonel)', en: 'VRM output capacitor (optional)' }),
        hint: t({
          tr: 'Girilirse kol R+jωL ile paralel kurulur',
          en: 'If entered, the branch is built in parallel with R+jωL',
        }),
      },

      hasPlaneCheck: t({ tr: 'Plane kolunu ağa ekle', en: 'Add the plane branch to the network' }),
      planeR: { label: t({ tr: 'Düzlem ESR\'si / kayıp direnci', en: 'Plane ESR / loss resistance' }) },
      planeL: {
        label: t({ tr: 'Plane yayılma/bağlantı endüktansı', en: 'Plane spreading/connection inductance' }),
      },
      planeC: { label: t({ tr: 'Plane kapasitansı', en: 'Plane capacitance' }) },

      hasToleranceCheck: t({
        tr: 'Tolerans / derating sweep’i hesapla (min · nominal · maks)',
        en: 'Compute the tolerance / derating sweep (min · nominal · max)',
      }),

      deltaT: {
        label: t({ tr: 'Yük adımı süresi (Δt)', en: 'Load step duration (Δt)' }),
        hint: t({
          tr: 'C_min ve worst-case droop tahmini için; yükselme süresinden (t_rise) farklıdır',
          en: 'For C_min and the worst-case droop estimate; distinct from the rise time (t_rise)',
        }),
      },
      tRise: {
        label: t({ tr: 'Yük adımı yükselme süresi (opsiyonel)', en: 'Load step rise time (optional)' }),
        hint: t({
          tr: 'ΔV_ESL = L_eq·(ΔI/t_rise) için; ΔI Sistem bölümündeki değerden alınır',
          en: 'For ΔV_ESL = L_eq·(ΔI/t_rise); ΔI is reused from the System section above',
        }),
      },
      dropC: {
        label: t({ tr: 'Düşük frekans kapasitesi (C, worst-case tahmini için)', en: 'Low-frequency capacitance (C, for the worst-case estimate)' }),
        hint: t({
          tr: 'REV2 §10.2 bu tahmin için ayrı bir C girdisi tanımlamaz; motorun okuduğu bağımsız bir alan olarak burada sorulur',
          en: 'REV2 §10.2 does not define a separate C input for this estimate; asked here as an independent field the engine reads',
        }),
      },
      dropESReq: {
        label: t({ tr: 'Eşdeğer ESR (ESR_eq, opsiyonel)', en: 'Equivalent ESR (ESR_eq, optional)' }),
        hint: t({ tr: 'Boş bırakılırsa 0 kabul edilir (motorun varsayılanı)', en: 'Left blank, this is taken as 0 (the engine’s default)' }),
      },
      dropLeq: {
        label: t({ tr: 'Eşdeğer ESL (L_eq, opsiyonel)', en: 'Equivalent ESL (L_eq, optional)' }),
        hint: t({ tr: 'Boş bırakılırsa 0 kabul edilir (motorun varsayılanı)', en: 'Left blank, this is taken as 0 (the engine’s default)' }),
      },
    },

    // Hata mesajında alan adı olarak görünen kısa etiketler; model.js'e verilir.
    // capGroupFields de aynı nesneyi okur, bu yüzden grup sütunu anahtarları da
    // burada bulunur.
    fieldLabels: {
      Vrail: t({ tr: 'Nominal hat gerilimi', en: 'Nominal rail voltage' }),
      ripplePct: t({ tr: 'Ripple yüzdesi', en: 'Ripple percentage' }),
      deltaVAllowed: t({ tr: 'İzin verilen mutlak ripple', en: 'Allowed absolute ripple' }),
      deltaI: t({ tr: 'Yük adımı', en: 'Load step' }),
      fMin: t({ tr: 'Minimum analiz frekansı', en: 'Minimum analysis frequency' }),
      fMax: t({ tr: 'Maksimum analiz frekansı', en: 'Maximum analysis frequency' }),
      points: t({ tr: 'Nokta sayısı', en: 'Point count' }),
      threshold: t({ tr: 'Belirginlik eşiği', en: 'Prominence threshold' }),
      vrmR: t({ tr: 'VRM çıkış direnci', en: 'VRM output resistance' }),
      vrmL: t({ tr: 'VRM çıkış endüktansı', en: 'VRM output inductance' }),
      vrmC: t({ tr: 'VRM çıkış kondansatörü', en: 'VRM output capacitor' }),
      planeR: t({ tr: 'Düzlem ESR\'si', en: 'Plane ESR' }),
      planeL: t({ tr: 'Plane endüktansı', en: 'Plane inductance' }),
      planeC: t({ tr: 'Plane kapasitansı', en: 'Plane capacitance' }),
      deltaT: t({ tr: 'Yük adımı süresi', en: 'Load step duration' }),
      tRise: t({ tr: 'Yük adımı yükselme süresi', en: 'Load step rise time' }),
      dropC: t({ tr: 'Düşük frekans kapasitesi', en: 'Low-frequency capacitance' }),
      dropESReq: t({ tr: 'Eşdeğer ESR', en: 'Equivalent ESR' }),
      dropLeq: t({ tr: 'Eşdeğer ESL', en: 'Equivalent ESL' }),
      Ceffective: t({ tr: 'Etkin kapasitans', en: 'Effective capacitance' }),
      count: t({ tr: 'Adet', en: 'Count' }),
      ESR: 'ESR',
      eslComponent: t({ tr: 'ESL (bileşen)', en: 'ESL (component)' }),
      Lmount: t({ tr: 'Mounting endüktansı', en: 'Mounting inductance' }),
      LviaEq: t({ tr: 'Via endüktansı', en: 'Via inductance' }),
      Cnominal: t({ tr: 'Nominal kapasitans', en: 'Nominal capacitance' }),
      tolerancePct: t({ tr: 'Tolerans', en: 'Tolerance' }),
      kDcBias: t({ tr: 'DC bias derating', en: 'DC bias derating' }),
      kTemperature: t({ tr: 'Sıcaklık derating', en: 'Temperature derating' }),
      capGroupRow: t({ tr: 'Kondansatör grubu', en: 'Capacitor group' }),
    },

    // RowList sütun başlıkları — hata etiketlerinden ayrı, ekranda görünen kısa adlar.
    capCols: {
      label: t({ tr: 'Etiket', en: 'Label' }),
      Ceffective: t({ tr: 'C_etkin', en: 'C_eff' }),
      count: t({ tr: 'Adet', en: 'Count' }),
      ESR: 'ESR',
      eslComponent: t({ tr: 'ESL (bileşen)', en: 'ESL (component)' }),
      Lmount: t({ tr: 'L_mount', en: 'L_mount' }),
      LviaEq: t({ tr: 'L_via,eq', en: 'L_via,eq' }),
      Cnominal: t({ tr: 'C_nominal', en: 'C_nominal' }),
      tolerancePct: t({ tr: 'Tolerans (%)', en: 'Tolerance (%)' }),
      kDcBias: t({ tr: 'K (DC bias)', en: 'K (DC bias)' }),
      kTemperature: t({ tr: 'K (sıcaklık)', en: 'K (temperature)' }),
    },
    dropHeading: t({
      tr: 'Worst-case droop tahmini (opsiyonel, §10.10)',
      en: 'Worst-case droop estimate (optional, §10.10)',
    }),

    rowList: {
      rowLabel: t({ tr: 'Kondansatör grubu', en: 'Capacitor group' }),
      addLabel: t({ tr: 'Grup ekle', en: 'Add group' }),
      core: t({ tr: 'Kondansatör grupları', en: 'Capacitor groups' }),
      coreHint: t({
        tr: 'Her satır bulk veya MLCC gibi bir kondansatör grubunu temsil eder (REV2 §10.1)',
        en: 'Each row represents a capacitor group such as bulk or MLCC (REV2 §10.1)',
      }),
      parasitics: t({ tr: 'Grup parazitikleri', en: 'Group parasitics' }),
      parasiticsHint: t({
        tr: 'ESL_toplam = ESL_bileşen + L_mount + L_via,eq (kararlar §4)',
        en: 'ESL_total = ESL_component + L_mount + L_via,eq (decisions §4)',
      }),
      tolerance: t({ tr: 'Tolerans / derating girdileri', en: 'Tolerance / derating inputs' }),
      toleranceHint: t({
        tr: 'Yalnızca "Tolerans / derating sweep’i hesapla" işaretliyken kullanılır',
        en: 'Used only when "Compute the tolerance / derating sweep" is checked',
      }),
    },

    table: {
      target: t({ tr: 'Hedef empedans (Z_target)', en: 'Target impedance (Z_target)' }),
      targetSource: (fromPct) => (fromPct
        ? t({ tr: 'ripple yüzdesinden', en: 'from the ripple percentage' })
        : t({ tr: 'doğrudan girilen ΔV_allowed', en: 'directly entered ΔV_allowed' })),
      maxImpedance: t({ tr: 'Taranan bantta en yüksek PDN empedansı', en: 'Highest PDN impedance across the sweep' }),
      underTargetPct: t({ tr: 'Hedefin altında kalan bant yüzdesi', en: 'Percentage of the band under target' }),
      overBandsCount: t({ tr: 'Hedefi aşan frekans aralığı sayısı', en: 'Number of frequency ranges over target' }),
      thresholdUsed: t({ tr: 'Kullanılan prominence eşiği', en: 'Prominence threshold used' }),
      minLowFreqC: t({ tr: 'Düşük frekans minimum kapasite ihtiyacı (C_min)', en: 'Low-frequency minimum capacitance need (C_min)' }),
      droopTotal: t({ tr: 'Worst-case droop tahmini (toplam)', en: 'Worst-case droop estimate (total)' }),
      droopC: t({ tr: '  · kapasitif pay (ΔV_C)', en: '  · capacitive share (ΔV_C)' }),
      droopESR: t({ tr: '  · ESR payı (ΔV_ESR)', en: '  · ESR share (ΔV_ESR)' }),
      droopESL: t({ tr: '  · ESL payı (ΔV_ESL)', en: '  · ESL share (ΔV_ESL)' }),
      toleranceMinLabel: t({
        tr: 'En yüksek empedans — tolerans minimum köşesi',
        en: 'Highest impedance — tolerance minimum corner',
      }),
      toleranceNominalLabel: t({
        tr: 'En yüksek empedans — tolerans nominal',
        en: 'Highest impedance — tolerance nominal',
      }),
      toleranceMaxLabel: t({
        tr: 'En yüksek empedans — tolerans maksimum köşesi',
        en: 'Highest impedance — tolerance maximum corner',
      }),
    },

    peakTable: {
      heading: t({ tr: 'Doğrulanmış rezonans ve antirezonans noktaları (§10.9.5)', en: 'Verified resonance and antiresonance points (§10.9.5)' }),
      kind: t({ tr: 'Tür', en: 'Kind' }),
      kindPeak: t({ tr: 'Antirezonans (tepe)', en: 'Antiresonance (peak)' }),
      kindValley: t({ tr: 'Rezonans (çukur)', en: 'Resonance (valley)' }),
      freq: t({ tr: 'Frekans', en: 'Frequency' }),
      impedance: t({ tr: 'Empedans |Z|', en: 'Impedance |Z|' }),
      ratio: t({ tr: 'Hedefe oran', en: 'Ratio to target' }),
      prominence: t({ tr: 'Belirginlik', en: 'Prominence' }),
      none: t({
        tr: 'Eşiği geçen doğrulanmış bir rezonans/antirezonans yok (adaylar grafikte görünebilir).',
        en: 'No resonance/antiresonance clears the threshold (candidates may still appear on the chart).',
      }),
      candidateNote: (total, confirmed) => t({
        tr: `${total} aday tepe/çukurdan ${confirmed} tanesi eşiği geçip doğrulandı; kalanı eşik altında, grafikte görünebilir ama listeye girmez (kararlar §3.1).`,
        en: `${confirmed} of ${total} candidate peaks/valleys cleared the threshold and were verified; the rest are below the threshold — they may still appear on the chart but are not listed (decisions §3.1).`,
      }),
    },

    srfTable: {
      heading: t({ tr: 'Kondansatör grubu self-resonant frekansları (SRF)', en: 'Capacitor group self-resonant frequencies (SRF)' }),
      group: t({ tr: 'Grup', en: 'Group' }),
      srf: 'SRF',
      unresolved: t({ tr: 'hesaplanamadı', en: 'could not be computed' }),
      defaultLabel: (i) => t({ tr: `Grup ${i + 1}`, en: `Group ${i + 1}` }),
    },

    formula: t({
      tr: `Z_target = ΔV_allowed / ΔI  (ΔV_allowed = V_rail·ripple/100 verilmezse)

Kondansatör kolu:
  ESL_toplam = ESL_bileşen + L_mount + L_via,eq
  Z_C = ESR + jωESL_toplam + 1/(jωC_etkin)
  Z_C,N = Z_C / N

VRM: Z_VRM = R + jωL  (çıkış C'si varsa R+jωL ile paralel)
Plane: Z_plane = R + jωL + 1/(jωC)  (lumped model)

Toplam: Y_total = Σ 1/Z_k ;  Z_total = 1/Y_total

Rezonans/antirezonans (dB tabanlı prominence, kararlar §3.1):
  Z_dB = 20·log10|Z|
  P_maks = Z_tepe,dB − max(komşu çukur,dB)
  P_min = min(komşu tepe,dB) − Z_çukur,dB

Düşük frekans kapasitesi:
  C_min ≥ ΔI·Δt / ΔV
  ΔV_ESR = ΔI·ESR_eq ;  ΔV_ESL = L_eq·(ΔI/t_rise)
  ΔV_approx ≈ ΔV_C + ΔV_ESR + ΔV_ESL  (bkz. aşağıdaki istisna notu)`,
      en: `Z_target = ΔV_allowed / ΔI  (ΔV_allowed = V_rail·ripple/100 when not given)

Capacitor branch:
  ESL_total = ESL_component + L_mount + L_via,eq
  Z_C = ESR + jωESL_total + 1/(jωC_effective)
  Z_C,N = Z_C / N

VRM: Z_VRM = R + jωL  (parallel with R+jωL when an output C is given)
Plane: Z_plane = R + jωL + 1/(jωC)  (lumped model)

Total: Y_total = Σ 1/Z_k ;  Z_total = 1/Y_total

Resonance/antiresonance (dB-based prominence, decisions §3.1):
  Z_dB = 20·log10|Z|
  P_max = Z_peak,dB − max(neighbour valley,dB)
  P_min = min(neighbour peak,dB) − Z_valley,dB

Low-frequency capacitance:
  C_min ≥ ΔI·Δt / ΔV
  ΔV_ESR = ΔI·ESR_eq ;  ΔV_ESL = L_eq·(ΔI/t_rise)
  ΔV_approx ≈ ΔV_C + ΔV_ESR + ΔV_ESL  (see the exception note below)`,
    }),

    detail: {
      targetSource: (fromPct) => (fromPct
        ? t({
          tr: 'Hedef empedans, ripple yüzdesi ve V_rail üzerinden hesaplandı.',
          en: 'The target impedance was computed from the ripple percentage and V_rail.',
        })
        : t({
          tr: 'Hedef empedans, doğrudan girilen ΔV_allowed üzerinden hesaplandı.',
          en: 'The target impedance was computed from the directly entered ΔV_allowed.',
        })),
      thresholdNote: (th) => t({
        tr: `Rezonans/antirezonans tespitinde ${fmt(th, 3)} dB prominence eşiği kullanıldı.`,
        en: `A ${fmt(th, 3)} dB prominence threshold was used for resonance/antiresonance detection.`,
      }),
      noRounding: t({
        tr: 'Ara değerlerde yuvarlama yapılmaz; yalnızca gösterim yuvarlanır.',
        en: 'Intermediate values are never rounded; only the display is rounded.',
      }),
      sameSweepAsReport: t({
        tr: 'Ekran ve rapor aynı sweep sonucunu kullanır; farklı bir hesap yapılmaz.',
        en: 'The screen and the report use the same sweep result; no separate calculation is made.',
      }),
    },

    validity: [
      t({
        tr: 'Hedef empedans, V_rail ve ΔI\'den türetilen tek bir kontrol seviyesidir; bütün '
          + 'frekanslarda gerçek sistem kararlılığını garanti etmez (REV2 §10.3).',
        en: 'The target impedance is a single check level derived from V_rail and ΔI; it does '
          + 'not guarantee real system stability at every frequency (REV2 §10.3).',
      }),
      t({
        tr: 'VRM çıkış kondansatörü verildiğinde kolun R+jωL ile paralel kurulması REV2’de '
          + 'birebir formül verilmeyen, bilinçli bir mühendislik yorumudur (VRM çıkış '
          + 'empedansını yüksek frekansta düşürme amacıyla tutarlı topoloji).',
        en: 'When a VRM output capacitor is given, building the branch in parallel with R+jωL '
          + 'is a deliberate engineering interpretation not given as a literal formula in REV2 '
          + '(the topology consistent with lowering the VRM output impedance at high frequency).',
      }),
      t({
        tr: 'Plane kolu, gerçek cavity modlarını İÇERMEYEN toplu (lumped) bir R+L+C modelidir; '
          + 'düzlem kavite rezonansı ayrı bir araçta ele alınır (REV2 §11).',
        en: 'The plane branch is a lumped R+L+C model that does NOT include real cavity modes; '
          + 'plane cavity resonance is covered by a separate tool (REV2 §11).',
      }),
      t({
        tr: 'Bir gruptaki N özdeş kolun bağımsız olduğu varsayılır (Z_C,N = Z_C/N). Ortak via '
          + 'veya ortak boyun kullanılıyorsa gerçek endüktans 1/N kadar düşmeyebilir ve sonuç '
          + 'iyimser olabilir (REV2 §10.4).',
        en: 'The N identical branches in a group are assumed independent (Z_C,N = Z_C/N). If a '
          + 'shared via or shared neck is used, the real inductance may not drop by 1/N and the '
          + 'result may be optimistic (REV2 §10.4).',
      }),
      t({
        tr: 'Rezonans/antirezonans tespiti dB tabanlı prominence eşiğine bağlıdır; eşik altında '
          + 'kalan adaylar grafikte görünebilir ama doğrulanmış listeye girmez (kararlar §3.1).',
        en: 'Resonance/antiresonance detection depends on the dB-based prominence threshold; '
          + 'candidates below the threshold may still appear on the chart but are not added to '
          + 'the verified list (decisions §3.1).',
      }),
      t({
        tr: 'Worst-case droop tahmini kullanıldıysa bu, ana kompleks empedans hesabının yerini '
          + 'tutmayan, ayrı ve muhafazakâr bir zaman alanı tahminidir (bkz. mühendislik yorumu).',
        en: 'When the worst-case droop estimate is used, it is a separate, conservative '
          + 'time-domain estimate that does not replace the main complex-impedance calculation '
          + '(see the engineering commentary).',
      }),
      t({
        tr: 'Sonuçlar yaklaşık mühendislik tahminidir — kritik tasarımlarda ölçüm ve/veya alan '
          + 'çözücüyle doğrulayın.',
        en: 'Results are approximate engineering estimates — verify with measurement and/or a '
          + 'field solver for critical designs.',
      }),
    ],

    schematic: {
      title: t({ tr: 'PDN ağı — paralel kollar', en: 'PDN network — parallel branches' }),
      caption: t({
        tr: 'VRM, kondansatör grupları ve plane kolu, hat ile referans arasında paralel bağlanır.',
        en: 'The VRM, the capacitor groups and the plane branch are connected in parallel '
          + 'between the rail and the reference.',
      }),
      rail: t({ tr: 'hat', en: 'rail' }),
      vrm: t({ tr: 'VRM', en: 'VRM' }),
      plane: t({ tr: 'plane', en: 'plane' }),
      probe: t({ tr: 'Z(f) ölçüm noktası', en: 'Z(f) observation point' }),
      moreGroups: (n) => t({ tr: `+${n} grup daha`, en: `+${n} more group(s)` }),
    },

    chart: {
      xLabel: t({ tr: 'Frekans (Hz)', en: 'Frequency (Hz)' }),
      yLabel: t({ tr: 'Empedans |Z| (Ω)', en: 'Impedance |Z| (Ω)' }),
      seriesTotal: t({ tr: 'Toplam PDN |Z|', en: 'Total PDN |Z|' }),
      seriesVrm: t({ tr: 'VRM kolu', en: 'VRM branch' }),
      seriesPlane: t({ tr: 'Plane kolu', en: 'Plane branch' }),
      seriesGroup: (label, i) => label || t({ tr: `Grup ${i + 1}`, en: `Group ${i + 1}` }),
      hiddenGroups: (n) => t({
        tr: `+${n} kondansatör grubu daha (grafikte gösterilmiyor)`,
        en: `+${n} more capacitor group(s) (not shown on the chart)`,
      }),
      targetRefLabel: (y) => t({ tr: `hedef ${fmtRes(y)}`, en: `target ${fmtRes(y)}` }),
      toleranceBandLegend: t({ tr: 'tolerans min–maks zarfı', en: 'tolerance min–max envelope' }),
      worstAntiresonanceLabel: t({ tr: 'en kötü antirezonans', en: 'worst antiresonance' }),
      caption: t({
        tr: 'Log-log eksende toplam PDN empedansı; işaretli nokta en yüksek antirezonans '
          + 'tepesidir. Tüm doğrulanmış rezonans/antirezonans noktaları yukarıdaki tabloda '
          + 'listelenir.',
        en: 'Total PDN impedance on log-log axes; the marked point is the highest '
          + 'antiresonance peak. All verified resonance/antiresonance points are listed in the '
          + 'table above.',
      }),
    },

    reasonText: (reason) => {
      switch (reason) {
        case REASON_POINTS:
          return t({
            tr: 'Nokta sayısı en az 3 olan bir tam sayı olmalı.',
            en: 'The point count must be an integer of at least 3.',
          })
        case REASON_COUNT:
          return t({
            tr: 'Her kondansatör grubunun adedi 1 veya daha büyük bir tam sayı olmalı.',
            en: 'Every capacitor group’s count must be an integer of 1 or more.',
          })
        case PDNR_ERR_NO_BRANCHES:
          return t({
            tr: 'Ağda en az bir kol olmalı: VRM, en az bir kondansatör grubu veya plane kolundan '
              + 'birini etkinleştirin.',
            en: 'The network needs at least one branch: enable the VRM, at least one capacitor '
              + 'group, or the plane branch.',
          })
        case PDNR_ERR_DERATING_RANGE:
          return t({
            tr: 'Derating katsayıları (DC bias, sıcaklık) 0 ile 1 arasında olmalı.',
            en: 'The derating coefficients (DC bias, temperature) must be between 0 and 1.',
          })
        case PDNR_ERR_TOLERANCE_RANGE:
          return t({
            tr: 'Girilen tolerans yüzdesi nominal kapasitansı sıfırın altına düşürüyor; '
              + 'toleransı azaltın.',
            en: 'The entered tolerance percentage drives the nominal capacitance below zero; '
              + 'reduce the tolerance.',
          })
        case SWEEP_ERR_NONPOSITIVE:
          return t({
            tr: 'Frekanslar sıfırdan büyük olmalı — logaritmik eksende sıfır/negatif tanımsızdır.',
            en: 'Frequencies must be greater than zero — zero/negative values are undefined on '
              + 'a logarithmic axis.',
          })
        case SWEEP_ERR_RANGE:
          return t({
            tr: 'Maksimum analiz frekansı minimumdan büyük olmalı.',
            en: 'The maximum analysis frequency must be greater than the minimum.',
          })
        case SWEEP_ERR_POINTS:
          return t({
            tr: 'Nokta sayısı geçersiz.',
            en: 'The point count is invalid.',
          })
        case PEAKS_ERR_THRESHOLD:
          return t({
            tr: `Belirginlik eşiği ${PROMINENCE_MIN_DB}–${PROMINENCE_MAX_DB} dB aralığında olmalı.`,
            en: `The prominence threshold must be within ${PROMINENCE_MIN_DB}–${PROMINENCE_MAX_DB} dB.`,
          })
        case PEAKS_ERR_NONPOSITIVE:
          return t({
            tr: 'Taramada sıfır veya negatif empedans büyüklüğü bulundu — girdileri kontrol edin.',
            en: 'The sweep produced a zero or negative impedance magnitude — check the inputs.',
          })
        case PEAKS_ERR_LENGTH:
          return t({
            tr: 'Rezonans tespiti için nokta sayısı yetersiz; nokta sayısını artırın.',
            en: 'Not enough points for resonance detection; increase the point count.',
          })
        case PDNR_ERR_INVALID:
          return t({
            tr: 'Girilen değer kombinasyonu geçerli değil. Hat gerilimi/ripple/load step ve '
              + 'kol değerlerini (R, L, C, ESR, ESL) kontrol edin.',
            en: 'The entered combination of values is not valid. Check the rail voltage/ripple/'
              + 'load step and the branch values (R, L, C, ESR, ESL).',
          })
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

    // Mühendislik yorumu — motorun `level`/`findings` kavramı olmadığı için
    // (bkz. model.js başlık notu) ham `r`den burada kurulur. ThermalVia/
    // ReturnPathStitchingVia'daki commentary(r) deseniyle aynı.
    commentary: (r) => {
      if (!r.ok) return []
      const out = []

      out.push({
        level: 'ok',
        text: t({
          tr: `Hedef empedans ${fmtRes(r.target.Ztarget)} (${r.target.fromRipplePct ? 'ripple yüzdesinden' : 'doğrudan girilen ΔV_allowed'}); `
            + `taranan bantta en yüksek PDN empedansı ${fmtRes(r.maxImpedance)}.`,
          en: `Target impedance ${fmtRes(r.target.Ztarget)} (${r.target.fromRipplePct ? 'from the ripple percentage' : 'directly entered ΔV_allowed'}); `
            + `the highest PDN impedance across the sweep is ${fmtRes(r.maxImpedance)}.`,
        }),
      })

      out.push({
        level: 'warn',
        text: t({
          tr: 'Hedef empedans yalnızca tek bir kontrol seviyesidir; bütün frekanslarda gerçek '
            + 'sistem kararlılığını garanti etmez (REV2 §10.3).',
          en: 'The target impedance is only a single check level; it does not guarantee real '
            + 'system stability at every frequency (REV2 §10.3).',
        }),
      })

      if (r.worstAntiresonance) {
        const wa = r.worstAntiresonance
        const overTarget = wa.ratioToTarget != null && wa.ratioToTarget > 1
        out.push({
          level: overTarget ? 'warn' : 'ok',
          text: overTarget
            ? t({
              tr: `En kötü antirezonans ${fmtHz(wa.freq)} frekansında, ${fmtRes(wa.magnitude)} — `
                + `hedefin ${fmt(wa.ratioToTarget, 3)} katı.`,
              en: `The worst antiresonance is at ${fmtHz(wa.freq)}, ${fmtRes(wa.magnitude)} — `
                + `${fmt(wa.ratioToTarget, 3)}× the target.`,
            })
            : t({
              tr: `En kötü antirezonans ${fmtHz(wa.freq)} frekansında, ${fmtRes(wa.magnitude)}`
                + `${wa.ratioToTarget != null ? ` — hedefin ${fmt(wa.ratioToTarget, 3)} katı.` : '.'}`,
              en: `The worst antiresonance is at ${fmtHz(wa.freq)}, ${fmtRes(wa.magnitude)}`
                + `${wa.ratioToTarget != null ? ` — ${fmt(wa.ratioToTarget, 3)}× the target.` : '.'}`,
            }),
        })
      } else {
        out.push({
          level: 'ok',
          text: t({
            tr: `Eşiği (${fmt(r.threshold, 3)} dB) geçen doğrulanmış bir antirezonans bulunamadı.`,
            en: `No verified antiresonance clears the threshold (${fmt(r.threshold, 3)} dB).`,
          }),
        })
      }

      out.push(r.overTargetBands.length > 0
        ? {
          level: 'warn',
          text: t({
            tr: `Empedans hedefi ${r.overTargetBands.length} ayrı frekans aralığında aşıyor `
              + `(bant altında kalan bölge: ${pct(fmtPct(r.underTargetPct))}).`,
            en: `The impedance exceeds the target in ${r.overTargetBands.length} separate `
              + `frequency range(s) (share of the band under target: ${pct(fmtPct(r.underTargetPct))}).`,
          }),
        }
        : {
          level: 'ok',
          text: t({
            tr: 'Taranan bandın tamamında empedans hedefin altında kalıyor.',
            en: 'The impedance stays under the target across the entire swept band.',
          }),
        })

      const totalCandidates = r.sweep.candidates.length
      const totalConfirmed = r.sweep.peaks.length + r.sweep.valleys.length
      if (totalCandidates > totalConfirmed) {
        out.push({
          level: 'ok',
          text: t({
            tr: `${totalCandidates} aday tepe/çukurdan ${totalConfirmed} tanesi ${fmt(r.threshold, 3)} dB `
              + 'eşiğini geçip doğrulandı; kalanı eşik altında (kararlar §3.1).',
            en: `${totalConfirmed} of ${totalCandidates} candidate peaks/valleys cleared the `
              + `${fmt(r.threshold, 3)} dB threshold and were verified; the rest are below it `
              + '(decisions §3.1).',
          }),
        })
      }

      if (r.droop) {
        if (r.droop.error) {
          out.push({
            level: 'danger',
            text: t({
              tr: 'Worst-case droop tahmini hesaplanamadı — girilen Δt, ΔI ve C değerlerini '
                + 'kontrol edin.',
              en: 'The worst-case droop estimate could not be computed — check the entered '
                + 'Δt, ΔI and C values.',
            }),
          })
        } else {
          const exceeds = r.target.deltaVAllowed != null && r.droop.total > r.target.deltaVAllowed
          out.push({
            level: exceeds ? 'warn' : 'ok',
            text: `${t({
              tr: `Tahmini worst-case gerilim sıçraması ΔV ≈ ${fmtVolt(r.droop.total)} `
                + `(ΔV_C ${fmtVolt(r.droop.dVC)} + ΔV_ESR ${fmtVolt(r.droop.dVESR)} + `
                + `ΔV_ESL ${fmtVolt(r.droop.dVESL)})`
                + `${exceeds ? `, izin verilen ${fmtVolt(r.target.deltaVAllowed)} değerini aşıyor` : ''}.`,
              en: `Estimated worst-case voltage excursion ΔV ≈ ${fmtVolt(r.droop.total)} `
                + `(ΔV_C ${fmtVolt(r.droop.dVC)} + ΔV_ESR ${fmtVolt(r.droop.dVESR)} + `
                + `ΔV_ESL ${fmtVolt(r.droop.dVESL)})`
                + `${exceeds ? `, exceeding the allowed ${fmtVolt(r.target.deltaVAllowed)}` : ''}.`,
            })} ${t({ tr: DROOP_EXCEPTION_TR, en: DROOP_EXCEPTION_EN })} `
              + `${t({ tr: DROOP_TAG_TR, en: DROOP_TAG_EN })}`,
          })
        }
      }

      if (r.minLowFreqC != null && Number.isFinite(r.minLowFreqC)) {
        const totalC = r.capGroups.reduce((s, g) => s + g.Ceffective * g.count, 0)
        const enough = totalC >= r.minLowFreqC
        out.push({
          level: enough ? 'ok' : 'warn',
          text: t({
            tr: `Düşük frekans minimum kapasite ihtiyacı ${fmtF(r.minLowFreqC)}; girilen `
              + `gruplardaki toplam etkin kapasite ${fmtF(totalC)}${enough ? ' — yeterli.' : ' — yetersiz olabilir.'}`,
            en: `The low-frequency minimum capacitance need is ${fmtF(r.minLowFreqC)}; the `
              + `total effective capacitance across the entered groups is ${fmtF(totalC)}`
              + `${enough ? ' — sufficient.' : ' — may be insufficient.'}`,
          }),
        })
      }

      if (r.hasTolerance && r.toleranceSweep) {
        if (r.toleranceSweep.error) {
          out.push({
            level: 'danger',
            text: t({
              tr: 'Tolerans/derating sweep’i hesaplanamadı — her grup için nominal '
                + 'kapasitans girildiğinden ve tolerans/derating değerlerinin aralık içinde '
                + 'olduğundan emin olun.',
              en: 'The tolerance/derating sweep could not be computed — make sure every group '
                + 'has a nominal capacitance and that the tolerance/derating values are within '
                + 'range.',
            }),
          })
        } else {
          out.push({
            level: 'ok',
            text: t({
              tr: `Tolerans/derating sweep’i: en yüksek PDN empedansı worst-case köşelerde `
                + `${fmtRes(r.toleranceSweep.min.maxImpedance)}–${fmtRes(r.toleranceSweep.max.maxImpedance)} `
                + `arasında değişiyor (nominal ${fmtRes(r.toleranceSweep.nominal.maxImpedance)}).`,
              en: `Tolerance/derating sweep: the highest PDN impedance ranges `
                + `${fmtRes(r.toleranceSweep.min.maxImpedance)}–${fmtRes(r.toleranceSweep.max.maxImpedance)} `
                + `across the worst-case corners (nominal ${fmtRes(r.toleranceSweep.nominal.maxImpedance)}).`,
            }),
          })
        }
      }

      return out
    },
  }
}
