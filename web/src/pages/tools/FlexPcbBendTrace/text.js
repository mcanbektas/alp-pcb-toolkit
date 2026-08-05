// Flex PCB bükülme ve iz hesaplayıcısı ekranının kullanıcıya görünen
// metinleri — iki dilli (tr/en).
//
// Hesap katmanı (lib/flexPcb.js) yalnızca kod ve sayı üretir; motorun
// bulgu/seviye kavramı yok (findings() fonksiyonu içermiyor — bkz.
// model.js başı ve flexPcb.js'in kendi yorumu). Bulgular ReturnPathStitchingVia
// / ThermalVia deseninde olduğu gibi burada, ham `compute()` çıktısından
// `commentary(r, dfm)` ile kurulur. `dfm` parametresi ekrandaki paylaşılan
// `dfmText(lang)` sözlüğüdür — via/pad/stiffener kontrollerinin "değerlendirilemedi"
// nedeni (UNKNOWN_NO_LIMIT vb.) DfmChecks tablosuyla BİREBİR AYNI cümleden
// gelsin diye burada ikinci bir çeviri kopyası açılmaz.

import { fmt, fmtEng } from '../../../lib/num'
import { pick } from '../../../lib/i18n'
import { commonText } from '../../../data/uiText'
import {
  checkLimit, DIRECTION_MIN, STATUS_WARNING, STATUS_DANGER, STATUS_UNKNOWN,
} from '../../../lib/dfmCheck'
import { FLEX_ERR_NEGATIVE_INNER_LENGTH } from '../../../lib/flexPcb'
import {
  REASON_INCOMPLETE, REASON_INVALID, BEND_DYNAMIC, EPS_SOURCE_ASSUMPTION,
  SWEEP_STRAIN, SWEEP_THICKNESS, SWEEP_TRACE_WIDTH, SWEEP_TEMPERATURE, SWEEP_VENDOR_FACTOR,
} from './model'

const fmtLen = (x, sig = 4) => fmtEng(x, 'm', sig)
const fmtR = (x, sig = 4) => fmtEng(x, 'Ω', sig)
const fmtV = (x, sig = 3) => fmtEng(x, 'V', sig)
const fmtP = (x, sig = 3) => fmtEng(x, 'W', sig)
const fmtA = (x, sig = 3) => fmtEng(x, 'A', sig)

export function getText(lang) {
  const t = (dict) => pick(dict, lang)
  const { pct } = commonText(lang)

  // §15.9'un üç sayısal kontrolünün id'leri flexPcb.js → bendClearanceChecks
  // içinde SABİTTİR ('via-bend-clearance' vb.); burada birebir eşleşmeli.
  const clearanceLabels = {
    'via-bend-clearance': t({
      tr: 'Via — bend bölgesi mesafesi', en: 'Via — distance to the bend region',
    }),
    'pad-bend-clearance': t({
      tr: 'Pad — bend bölgesi mesafesi', en: 'Pad — distance to the bend region',
    }),
    'stiffener-bend-clearance': t({
      tr: 'Stiffener bitişi — bend başlangıcı mesafesi', en: 'Stiffener edge — distance to the bend start',
    }),
  }
  const checkLabel = (id) => clearanceLabels[id] ?? id

  return {
    pct,
    countUnit: t({ tr: 'adet', en: 'pcs' }),
    checkLabel,
    // §15.9'un üç kontrolü flexPcb.js → checkLimit ile kurulur ve `source`
    // alanını hiç doldurmaz (bendClearanceChecks bu parametreyi almıyor —
    // bilinçli bir motor kararı, bkz. model.js notu). DfmChecks satırında
    // "Kaynak: …" yalnızca ok/warning/danger'da göründüğü için (o durumda
    // gerçek bir eşik girilmiştir) buradaki sabit etiket doğrudur; dört DFM
    // ekranının `dfm.sourceLabel()` eşlemesi (geometri/üretici profili/karar
    // profili) burada uygulanamaz çünkü bu araçta öyle bir profil kavramı yok.
    clearanceSourceLabel: t({ tr: 'kullanıcı girdisi', en: 'user-entered value' }),

    backlink: t({ tr: '← PCB Üretim ve DFM', en: '← PCB Manufacturing and DFM' }),
    title: t({
      tr: 'Flex PCB Bükülme ve İz Hesaplayıcı', en: 'Flex PCB Bend and Trace Calculator',
    }),
    intro: t({
      tr: 'Flex bükülme bölgesindeki tahmini copper strain\'i, üretici ve strain kurallarına göre '
        + 'minimum bend radius\'u, iz direnci/gerilim düşümü/güç kaybını ve via, pad, coverlay ve '
        + 'stiffener sınırlarına göre bend bölgesi mesafelerini birlikte değerlendirir.',
      en: 'Evaluates the estimated copper strain in the flex bend region, the minimum bend radius '
        + 'per the vendor and strain rules, the trace resistance/voltage drop/power loss, and the '
        + 'bend-region distances against via, pad, coverlay and stiffener limits together.',
    }),

    fields: {
      flexType: { label: t({ tr: 'Flex türü', en: 'Flex type' }) },
      flexSingle: t({ tr: 'Tek katman', en: 'Single-layer' }),
      flexDouble: t({ tr: 'Çift katman', en: 'Double-layer' }),
      flexMulti: t({ tr: 'Çok katmanlı', en: 'Multilayer' }),
      flexRigid: t({ tr: 'Rijit-flex', en: 'Rigid-flex' }),

      bendMode: { label: t({ tr: 'Bükülme türü', en: 'Bend type' }) },
      bendStatic: t({ tr: 'Statik (tek seferlik)', en: 'Static (one-time)' }),
      bendDynamic: t({ tr: 'Dinamik (tekrarlı)', en: 'Dynamic (repeated)' }),

      tTotal: { label: t({ tr: 'Toplam flex kalınlığı (t_total)', en: 'Total flex thickness (t_total)' }) },
      R: { label: t({ tr: 'Kullanılan bend radius (R)', en: 'Bend radius used (R)' }) },
      thetaDeg: {
        label: t({ tr: 'Bükülme açısı (θ, opsiyonel)', en: 'Bend angle (θ, optional)' }),
        hint: t({
          tr: 'Bend uzunluğu ailesi (arc length, iç/dış yüzey, uzama farkı) yalnızca bu alan girilirse hesaplanır.',
          en: 'The bend-length family (arc length, inner/outer surface, elongation) is only computed when this field is entered.',
        }),
      },
      y: {
        label: t({
          tr: 'Bakır katmanın nötr eksene uzaklığı (y, opsiyonel)',
          en: 'Copper layer distance to the neutral axis (y, optional)',
        }),
        hint: t({
          tr: 'Boş bırakılırsa simetrik dış yüzey yaklaşımı kullanılır (ε ≈ t_total/2R).',
          en: 'If left blank the symmetric outer-surface approximation is used (ε ≈ t_total/2R).',
        }),
      },

      epsilonAllow: {
        label: t({ tr: 'İzin verilen strain (ε_allow, opsiyonel)', en: 'Allowed strain (ε_allow, optional)' }),
        hint: t({
          tr: 'Sabit bir varsayılan yoktur — üretici verisi girin ya da aşağıda kullanıcı varsayımı olarak işaretleyin.',
          en: 'There is no fixed default — enter vendor data or mark it below as a user assumption.',
        }),
      },
      epsilonAllowSource: { label: t({ tr: 'Bu strain sınırının kaynağı', en: 'Source of this strain limit' }) },
      epsSourceVendor: t({ tr: 'Üretici verisi', en: 'Vendor data' }),
      epsSourceAssumption: t({ tr: 'Kullanıcı varsayımı', en: 'User assumption' }),

      Kb: {
        label: t({ tr: 'Üretici bend-radius çarpanı (K_b, opsiyonel)', en: 'Vendor bend-radius factor (K_b, optional)' }),
        hintFor: (example) => (example === null ? null : t({
          tr: `Örnek üretici BAŞLANGIÇ profili: K_b ≈ ${example}. Gerçek üretici verisinin yerine geçmez.`,
          en: `Example vendor starting profile: K_b ≈ ${example}. It does not replace real vendor data.`,
        })),
      },

      l: { label: t({ tr: 'İz uzunluğu (l)', en: 'Trace length (l)' }) },
      w: { label: t({ tr: 'İz genişliği (w)', en: 'Trace width (w)' }) },
      t: { label: t({ tr: 'Bakır kalınlığı (t)', en: 'Copper thickness (t)' }) },
      n: { label: t({ tr: 'Paralel iz sayısı (N)', en: 'Parallel trace count (N)' }) },
      T: { label: t({ tr: 'Sıcaklık (T)', en: 'Temperature (T)' }) },
      current: { label: t({ tr: 'Akım (I, opsiyonel)', en: 'Current (I, optional)' }) },

      viaDistance: { label: t({ tr: 'Via — bend bölgesi mesafesi (gerçek)', en: 'Via — distance to bend region (actual)' }) },
      viaMinDistance: {
        label: t({ tr: 'Via için minimum mesafe (üretici/kullanıcı)', en: 'Minimum via distance (vendor/user)' }),
      },
      padDistance: { label: t({ tr: 'Pad — bend bölgesi mesafesi (gerçek)', en: 'Pad — distance to bend region (actual)' }) },
      padMinDistance: {
        label: t({ tr: 'Pad için minimum mesafe (üretici/kullanıcı)', en: 'Minimum pad distance (vendor/user)' }),
      },
      stiffenerDistance: {
        label: t({
          tr: 'Stiffener bitişi — bend başlangıcı mesafesi (gerçek)',
          en: 'Stiffener edge — distance to bend start (actual)',
        }),
      },
      stiffenerMinDistance: {
        label: t({ tr: 'Stiffener için minimum mesafe (üretici/kullanıcı)', en: 'Minimum stiffener distance (vendor/user)' }),
      },
      warnPercent: {
        label: t({ tr: 'Uyarı marjı', en: 'Warning margin' }),
        hint: t({
          tr: 'Sizin tercihiniz — sınırı sağlayan ama bu payın altında kalan sonuçlar uyarı olarak işaretlenir.',
          en: 'Your own preference — results that meet the limit but stay below this margin are flagged as warnings.',
        }),
      },

      cycleA: { label: t({ tr: 'Ampirik model katsayısı A (opsiyonel)', en: 'Empirical model coefficient A (optional)' }) },
      cycleB: { label: t({ tr: 'Ampirik model katsayısı b (opsiyonel)', en: 'Empirical model coefficient b (optional)' }) },
      targetCycles: {
        label: t({ tr: 'Hedef cycle sayısı (opsiyonel, yalnız bilgi amaçlı)', en: 'Target cycle count (optional, informational only)' }),
      },
    },

    // Hata mesajında alan adı olarak görünen kısa etiketler; model.js'e verilir.
    fieldLabels: {
      tTotal: t({ tr: 'Toplam flex kalınlığı', en: 'Total flex thickness' }),
      R: t({ tr: 'Bend radius', en: 'Bend radius' }),
      thetaDeg: t({ tr: 'Bükülme açısı', en: 'Bend angle' }),
      y: t({ tr: 'Nötr eksene uzaklık', en: 'Neutral axis distance' }),
      epsilonAllow: t({ tr: 'İzin verilen strain', en: 'Allowed strain' }),
      Kb: t({ tr: 'Üretici bend-radius çarpanı', en: 'Vendor bend-radius factor' }),
      l: t({ tr: 'İz uzunluğu', en: 'Trace length' }),
      w: t({ tr: 'İz genişliği', en: 'Trace width' }),
      t: t({ tr: 'Bakır kalınlığı', en: 'Copper thickness' }),
      n: t({ tr: 'Paralel iz sayısı', en: 'Parallel trace count' }),
      T: t({ tr: 'Sıcaklık', en: 'Temperature' }),
      current: t({ tr: 'Akım', en: 'Current' }),
      viaDistance: t({ tr: 'Via mesafesi', en: 'Via distance' }),
      viaMinDistance: t({ tr: 'Via minimum mesafesi', en: 'Minimum via distance' }),
      padDistance: t({ tr: 'Pad mesafesi', en: 'Pad distance' }),
      padMinDistance: t({ tr: 'Pad minimum mesafesi', en: 'Minimum pad distance' }),
      stiffenerDistance: t({ tr: 'Stiffener mesafesi', en: 'Stiffener distance' }),
      stiffenerMinDistance: t({ tr: 'Stiffener minimum mesafesi', en: 'Minimum stiffener distance' }),
      warnPercent: t({ tr: 'Uyarı marjı', en: 'Warning margin' }),
      cycleA: t({ tr: 'Katsayı A', en: 'Coefficient A' }),
      cycleB: t({ tr: 'Katsayı b', en: 'Coefficient b' }),
      targetCycles: t({ tr: 'Hedef cycle sayısı', en: 'Target cycle count' }),
    },

    bigResultLabel: t({ tr: 'Tahmini copper strain', en: 'Estimated copper strain' }),

    table: {
      vendorMinRadius: t({ tr: 'Üretici kuralına göre minimum bend radius', en: 'Minimum bend radius per vendor rule' }),
      strainMinRadius: t({ tr: 'Strain kuralına göre minimum bend radius', en: 'Minimum bend radius per strain rule' }),
      bendRadius: t({ tr: 'Kullanılan gerçek bend radius', en: 'Bend radius actually used' }),
      strain: t({ tr: 'Tahmini copper strain', en: 'Estimated copper strain' }),
      arcLength: t({ tr: 'Bend arc uzunluğu (nötr eksen)', en: 'Bend arc length (neutral axis)' }),
      outerLength: t({ tr: 'Dış yüzey uzunluğu', en: 'Outer surface length' }),
      innerLength: t({ tr: 'İç yüzey uzunluğu', en: 'Inner surface length' }),
      elongation: t({ tr: 'Dış/iç yüzey uzama farkı', en: 'Outer/inner surface elongation difference' }),
      copperArea: t({ tr: 'İz kesit alanı (A_Cu)', en: 'Trace cross-section area (A_Cu)' }),
      traceResistanceSingle: t({ tr: 'Tek iz direnci', en: 'Single trace resistance' }),
      traceResistance: (n) => t({
        tr: `Paralel iz eşdeğer direnci (${n} iz)`, en: `Parallel trace equivalent resistance (${n} traces)`,
      }),
      voltageDrop: t({ tr: 'Gerilim düşümü', en: 'Voltage drop' }),
      powerLoss: t({ tr: 'Güç kaybı', en: 'Power loss' }),
      cycleLife: t({ tr: 'Tahmini cycle life (N_f)', en: 'Estimated cycle life (N_f)' }),
    },

    checksHeading: t({ tr: 'Bend bölgesi mesafe kontrolleri (§15.9)', en: 'Bend region distance checks (§15.9)' }),
    checksNote: t({
      tr: 'REV2 §15.9\'un on tasarım kontrolünden yalnız bu üçü (via/pad/stiffener mesafesi) sayısaldır. '
        + 'Kalan yedisi (keskin trace açısı, keskin köşe, copper pour türü, katman geçişi, ani genişlik '
        + 'değişimi, katmanlar arası çakışma, teardrop önerisi) layout geometrisi incelemesi gerektirir '
        + 've bu araçta hesaplanmaz.',
      en: 'Of REV2 §15.9\'s ten design checks, only these three (via/pad/stiffener distance) are numeric. '
        + 'The remaining seven (sharp trace angle, sharp corner, copper pour type, layer transition, '
        + 'abrupt width change, overlapping layers, the teardrop recommendation) require a layout '
        + 'geometry review and are not computed by this tool.',
    }),

    formula: t({
      tr: `ε ≈ y/R   (y biliniyorsa)
ε_outer ≈ t_total/(2R)   (simetrik yaklaşım)
ε_% = 100·ε

R_min = y/ε_allow   veya   t_total/(2·ε_allow)
R_min,vendor = K_b·t_total

θ_rad = θ_deg·π/180
l_bend = R·θ_rad
l_outer = (R+y)·θ ,  l_inner = (R−y)·θ
Δl = 2yθ

A_Cu = w·t
ρ_T = ρ_20·[1+α(T−20)]
R_trace = ρ_T·l/(w·t)
R_eq = R_trace/N

V_drop = I·R_eq
P_loss = I²·R_eq

N_f = A·ε^(−b)   (yalnız A ve b girilmişse)`,
      en: `ε ≈ y/R   (if y is known)
ε_outer ≈ t_total/(2R)   (symmetric approximation)
ε_% = 100·ε

R_min = y/ε_allow   or   t_total/(2·ε_allow)
R_min,vendor = K_b·t_total

θ_rad = θ_deg·π/180
l_bend = R·θ_rad
l_outer = (R+y)·θ ,  l_inner = (R−y)·θ
Δl = 2yθ

A_Cu = w·t
ρ_T = ρ_20·[1+α(T−20)]
R_trace = ρ_T·l/(w·t)
R_eq = R_trace/N

V_drop = I·R_eq
P_loss = I²·R_eq

N_f = A·ε^(−b)   (only if A and b are entered)`,
    }),

    detail: {
      symmetricUsed: t({
        tr: 'Nötr eksen bilinmediği için simetrik dış yüzey yaklaşımı kullanıldı (ε ≈ t_total/2R).',
        en: 'The symmetric outer-surface approximation was used because the neutral axis is unknown (ε ≈ t_total/2R).',
      }),
      neutralAxisUsed: (y) => t({
        tr: `Nötr eksene uzaklık y = ${fmtLen(y)} girildi; strain ε ≈ y/R formülüyle hesaplandı.`,
        en: `The neutral-axis distance y = ${fmtLen(y)} was entered; strain was computed with ε ≈ y/R.`,
      }),
      noRounding: t({
        tr: 'Ara değerlerde yuvarlama yapılmaz; yalnızca gösterim yuvarlanır.',
        en: 'Intermediate values are never rounded; only the display is rounded.',
      }),
    },

    validity: [
      t({
        tr: 'Bükülme modeli salt geometriktir (ε≈y/R); plastik deformasyon, work hardening, adhesive '
          + 'viscoelasticity, copper grain structure, rolled-annealed/electrodeposited bakır farkı ve '
          + 'tekrarlı fatigue etkilerini içermez.',
        en: 'The bend model is purely geometric (ε≈y/R); it does not include plastic deformation, work '
          + 'hardening, adhesive viscoelasticity, copper grain structure, the rolled-annealed/'
          + 'electrodeposited copper difference, or repeated-fatigue effects.',
      }),
      t({
        tr: 'İzin verilen strain ve üretici bend-radius çarpanı gizli bir varsayılan olarak kurulmaz; '
          + 'girilmezse ilgili minimum bend radius hesaplanmaz.',
        en: 'The allowed strain and the vendor bend-radius factor are never set as a hidden default; '
          + 'if not entered, the corresponding minimum bend radius is not computed.',
      }),
      t({
        tr: 'Dinamik (tekrarlı) bükülme için sabit bir K_b varsayılmaz; statik profil örnekleri dinamik '
          + 'kullanıma uygulanmaz.',
        en: 'No fixed K_b is assumed for dynamic (repeated) bending; the static profile examples do not '
          + 'apply to dynamic use.',
      }),
      t({
        tr: 'Cycle life için evrensel bir kapalı form yoktur; yalnızca üreticiden alınmış A ve b '
          + 'katsayıları girilirse tahmini gösterilir.',
        en: 'There is no universal closed form for cycle life; an estimate is shown only if '
          + 'vendor-supplied A and b coefficients are entered.',
      }),
      t({
        tr: 'Trace sıcaklığı yalnızca I²R ile tahmin edilmez; ısı yayılımı, coverlay, hava, rijit bölge '
          + 've bonding yapısı bu hesabın dışındadır.',
        en: 'Trace temperature is not estimated from I²R alone; heat spreading, the coverlay, air, the '
          + 'rigid region and the bonding structure are outside this calculation.',
      }),
      t({
        tr: 'REV2 §15.9\'un on tasarım kontrolünden yalnız üçü (via/pad/stiffener mesafesi) burada '
          + 'sayısaldır; keskin trace açısı, keskin köşe, copper pour türü, katman geçişi, ani genişlik '
          + 'değişimi, katmanlar arası çakışma ve teardrop önerisi layout geometrisi incelemesi '
          + 'gerektirir ve bu araçta hesaplanmaz.',
        en: 'Of the ten design checks in REV2 §15.9, only three (via/pad/stiffener distance) are '
          + 'numeric here; sharp trace angle, sharp corner, copper pour type, layer transition, abrupt '
          + 'width change, overlapping layers and the teardrop recommendation require a layout '
          + 'geometry review and are not computed by this tool.',
      }),
      t({
        tr: 'Sonuçlar yaklaşık mühendislik tahminidir — gerçek kullanım uygunluğu copper türü, stack-up '
          + 've üretici verisiyle doğrulanmadan belirlenemez.',
        en: 'Results are approximate engineering estimates — real-world suitability cannot be '
          + 'determined without verification against the copper type, stack-up and vendor data.',
      }),
    ],

    sweepGroup: t({ tr: 'Grafik', en: 'Chart' }),
    sweepLabel: {
      [SWEEP_STRAIN]: t({ tr: 'Bend radius → strain', en: 'Bend radius → strain' }),
      [SWEEP_THICKNESS]: t({ tr: 'Toplam kalınlık → minimum radius', en: 'Total thickness → minimum radius' }),
      [SWEEP_TRACE_WIDTH]: t({ tr: 'İz genişliği → direnç', en: 'Trace width → resistance' }),
      [SWEEP_TEMPERATURE]: t({ tr: 'Sıcaklık → direnç', en: 'Temperature → resistance' }),
      [SWEEP_VENDOR_FACTOR]: t({ tr: 'Üretici çarpanı → minimum radius', en: 'Vendor factor → minimum radius' }),
    },
    sweepAxisX: {
      [SWEEP_STRAIN]: t({ tr: 'Bend radius R (m)', en: 'Bend radius R (m)' }),
      [SWEEP_THICKNESS]: t({ tr: 'Toplam kalınlık t_total (m)', en: 'Total thickness t_total (m)' }),
      [SWEEP_TRACE_WIDTH]: t({ tr: 'İz genişliği w (m)', en: 'Trace width w (m)' }),
      [SWEEP_TEMPERATURE]: t({ tr: 'Sıcaklık (°C)', en: 'Temperature (°C)' }),
      [SWEEP_VENDOR_FACTOR]: t({ tr: 'Üretici çarpanı K_b', en: 'Vendor factor K_b' }),
    },
    sweepAxisY: {
      [SWEEP_STRAIN]: t({ tr: 'Strain (%)', en: 'Strain (%)' }),
      [SWEEP_THICKNESS]: t({ tr: 'Minimum bend radius (m)', en: 'Minimum bend radius (m)' }),
      [SWEEP_TRACE_WIDTH]: t({ tr: 'Direnç (Ω)', en: 'Resistance (Ω)' }),
      [SWEEP_TEMPERATURE]: t({ tr: 'Direnç (Ω)', en: 'Resistance (Ω)' }),
      [SWEEP_VENDOR_FACTOR]: t({ tr: 'Minimum bend radius (m)', en: 'Minimum bend radius (m)' }),
    },
    sweepCaption: {
      [SWEEP_STRAIN]: t({
        tr: 'Bend radius büyüdükçe strain ters orantılı azalır. İşaretli nokta girilen R değeridir.',
        en: 'As the bend radius grows the strain falls off inversely. The marked point is the entered R.',
      }),
      [SWEEP_THICKNESS]: t({
        tr: 'Toplam kalınlık arttıkça minimum bend radius büyür. Nötr eksen bilinmiyorsa (y girilmemiş) '
          + 'strain eğrisi kalınlıkla değişir; y girilmişse strain kuralı yalnızca y ve ε_allow\'a bağlı '
          + 'olduğundan düz çıkar.',
        en: 'As the total thickness grows the minimum bend radius grows. If the neutral axis is unknown '
          + '(y not entered) the strain curve varies with thickness; if y is entered the strain rule '
          + 'depends only on y and ε_allow, so it comes out flat.',
      }),
      [SWEEP_TRACE_WIDTH]: t({
        tr: 'İz genişliği büyüdükçe kesit alanı büyür ve direnç ters orantılı azalır.',
        en: 'As the trace width grows the cross-section grows and the resistance falls off inversely.',
      }),
      [SWEEP_TEMPERATURE]: t({
        tr: 'Direnç sıcaklıkla doğrusal artar (ρ_T = ρ_20·[1+α(T−20)]).',
        en: 'Resistance rises linearly with temperature (ρ_T = ρ_20·[1+α(T−20)]).',
      }),
      [SWEEP_VENDOR_FACTOR]: t({
        tr: 'Üretici çarpanı arttıkça minimum bend radius doğrusal artar (R_min,vendor = K_b·t_total).',
        en: 'As the vendor factor grows the minimum bend radius grows linearly '
          + '(R_min,vendor = K_b·t_total).',
      }),
    },
    seriesVendor: t({ tr: 'üretici kuralı', en: 'vendor rule' }),
    seriesStrain: t({ tr: 'strain kuralı', en: 'strain rule' }),
    operatingPoint: t({ tr: 'çalışma noktası', en: 'operating point' }),

    schematic: {
      title: t({ tr: 'Flex bükülme kesiti', en: 'Flex bend cross-section' }),
      caption: t({
        tr: 'Ölçüler orantılı değildir; etiketler girilen gerçek değerleri gösterir.',
        en: 'Dimensions are not to scale; the labels show the real entered values.',
      }),
      bendRegion: t({ tr: 'bükülme bölgesi', en: 'bend region' }),
      neutralAxis: t({ tr: 'nötr eksen', en: 'neutral axis' }),
      copperTrace: t({ tr: 'bakır iz', en: 'copper trace' }),
      stiffener: t({ tr: 'stiffener', en: 'stiffener' }),
      via: t({ tr: 'via', en: 'via' }),
      pad: t({ tr: 'pad', en: 'pad' }),
      bendStart: t({ tr: 'bend başlangıcı', en: 'bend start' }),
      totalThickness: t({ tr: 't_total', en: 't_total' }),
    },

    reasonText: (reason) => {
      switch (reason) {
        case REASON_INVALID:
          return t({
            tr: 'Girilen geometri geçerli değil. Toplam kalınlık ve bend radius sıfırdan büyük olmalı.',
            en: 'The entered geometry is not valid. The total thickness and bend radius must be greater than zero.',
          })
        case REASON_INCOMPLETE:
        default:
          return t({
            tr: 'Tüm zorunlu alanlara pozitif sayısal değer girin. Ondalık için nokta veya virgül '
              + 'kullanabilirsiniz (0.25 = 0,25).',
            en: 'Enter a positive numeric value in every required field. Use a point or a comma for '
              + 'decimals (0.25 = 0,25).',
          })
      }
    },

    // Mühendislik yorumu — motorun `level`/`findings` kavramı olmadığı için
    // (bkz. dosya başı notu) ham `r`den burada kurulur. `dfm`, ekranın
    // paylaşılan `dfmText(lang)` sözlüğüdür; yalnızca değerlendirilemeyen
    // kontrolün nedenini (UNKNOWN_NO_LIMIT vb.) DfmChecks tablosuyla AYNI
    // cümleden okumak için kullanılır.
    commentary: (r, dfm) => {
      if (!r.ok) return []
      const out = []

      // Karşılaştırma ham `<` / `>=` ile yapılmaz: R = 2.4 mm ile
      // K_b·t_total = 12 × 0.2 mm ikili tabanda eşit değildir (fark ≈ 4.3e-19)
      // ve tam sınırdaki tasarım "sınırın ALTINDA" diye raporlanırdı — ekranda
      // ikisi de 2.4 mm görünürken. Ortak sözleşme (lib/dfmCheck.js) bağıl payı
      // zaten doğru uyguluyor; ikinci bir tolerans sabiti burada tanımlanmaz.
      // `warnPercent` GEÇİLMEZ: ekranın kendi "uyarı marjı" alanı ayrı çalışır,
      // burada ikinci bir uyarı bandı açmak davranış değişikliği olurdu.
      // Seviye kararı da cümle seçimi de AYNI kontrol sonucundan okunur;
      // ayrı ayrı karşılaştırılsalardı tutarsız kalabilirlerdi.
      const radiusLimit = (id, required) => (required === null ? null : checkLimit({
        id, actual: r.R, required, direction: DIRECTION_MIN,
      }))
      const vendorCheck = radiusLimit('flex-bend-radius-vendor', r.vendorMinRadius)
      const strainCheck = radiusLimit('flex-bend-radius-strain', r.strainMinRadius)

      const radiusNotes = []
      if (vendorCheck !== null) {
        radiusNotes.push(vendorCheck.status === STATUS_DANGER
          ? t({
            tr: `üretici kuralının (${fmtLen(r.vendorMinRadius)}) ALTINDA`,
            en: `BELOW the vendor rule (${fmtLen(r.vendorMinRadius)})`,
          })
          : t({
            tr: `üretici kuralının (${fmtLen(r.vendorMinRadius)}) altında değil`,
            en: `not below the vendor rule (${fmtLen(r.vendorMinRadius)})`,
          }))
      }
      if (strainCheck !== null) {
        radiusNotes.push(strainCheck.status === STATUS_DANGER
          ? t({
            tr: `izin verilen strain sınırının gerektirdiği minimumun (${fmtLen(r.strainMinRadius)}) ALTINDA`,
            en: `BELOW the minimum the allowed-strain limit requires (${fmtLen(r.strainMinRadius)})`,
          })
          : t({
            tr: `izin verilen strain sınırının gerektirdiği minimumun (${fmtLen(r.strainMinRadius)}) altında değil`,
            en: `not below the minimum the allowed-strain limit requires (${fmtLen(r.strainMinRadius)})`,
          }))
      }
      const belowSome = vendorCheck?.status === STATUS_DANGER
        || strainCheck?.status === STATUS_DANGER

      out.push(radiusNotes.length > 0
        ? {
          level: belowSome ? 'danger' : 'ok',
          text: t({
            tr: `Tahmini copper strain ${pct(fmt(r.strainPercent, 3))} (R=${fmtLen(r.R)}) — kullanılan R, `
              + `${radiusNotes.join('; ')}.`,
            en: `Estimated copper strain ${pct(fmt(r.strainPercent, 3))} (R=${fmtLen(r.R)}) — the R used `
              + `is ${radiusNotes.join('; ')}.`,
          }),
        }
        : {
          level: 'unknown',
          text: t({
            tr: `Tahmini copper strain ${pct(fmt(r.strainPercent, 3))} (R=${fmtLen(r.R)}). Karşılaştırma `
              + 'için üretici çarpanı (K_b) ya da izin verilen strain girilmedi.',
            en: `Estimated copper strain ${pct(fmt(r.strainPercent, 3))} (R=${fmtLen(r.R)}). Neither the `
              + 'vendor factor (K_b) nor an allowed strain was entered for comparison.',
          }),
        })

      if (r.epsilonAllow !== null && r.epsilonAllowSource === EPS_SOURCE_ASSUMPTION) {
        out.push({
          level: 'warn',
          text: t({
            tr: 'İzin verilen strain kullanıcı varsayımı olarak işaretlendi — üretici verisi değildir.',
            en: 'The allowed strain is marked as a user assumption — it is not vendor data.',
          }),
        })
      }

      if (r.surfaceLengths !== null) {
        if (r.surfaceLengths.error === FLEX_ERR_NEGATIVE_INNER_LENGTH) {
          out.push({
            level: 'danger',
            text: t({
              tr: `İç yüzey uzunluğu negatif çıktı (${fmtLen(r.surfaceLengths.inner)}) — y (${fmtLen(r.y)}) `
                + `R'den (${fmtLen(r.R)}) büyük. Bu geometri tutarsızdır; y bend radius'undan küçük olmalıdır.`,
              en: `The inner surface length came out negative (${fmtLen(r.surfaceLengths.inner)}) — y `
                + `(${fmtLen(r.y)}) is larger than R (${fmtLen(r.R)}). This geometry is inconsistent; y `
                + 'must be smaller than the bend radius.',
            }),
          })
        } else {
          out.push({
            level: 'ok',
            text: t({
              tr: `Bend arc uzunluğu ${fmtLen(r.arcLength)}; dış yüzey ${fmtLen(r.surfaceLengths.outer)}, `
                + `iç yüzey ${fmtLen(r.surfaceLengths.inner)} (Δl=${fmtLen(r.elongation)}).`,
              en: `Bend arc length ${fmtLen(r.arcLength)}; outer surface ${fmtLen(r.surfaceLengths.outer)}, `
                + `inner surface ${fmtLen(r.surfaceLengths.inner)} (Δl=${fmtLen(r.elongation)}).`,
            }),
          })
        }
      } else if (r.arcLength !== null) {
        out.push({
          level: 'ok',
          text: t({
            tr: `Bend arc uzunluğu (nötr eksen) ${fmtLen(r.arcLength)}. İç/dış yüzey uzunlukları için `
              + '\'y\' (bakırın nötr eksene uzaklığı) girilmelidir.',
            en: `Bend arc length (neutral axis) ${fmtLen(r.arcLength)}. Enter 'y' (the copper's distance `
              + 'to the neutral axis) for the inner/outer surface lengths.',
          }),
        })
      }

      if (r.traceResistance !== null) {
        out.push({
          level: 'ok',
          text: t({
            tr: `İz direnci ${fmtR(r.traceResistance)} (tek iz ${fmtR(r.traceResistanceSingle)}, N=${r.n}). `
              + 'Flex trace sıcaklığı yalnızca I²R ile tahmin edilmez; ısı yayılımı, coverlay, hava, rijit '
              + 'bölge ve bonding yapısı bu hesabın dışındadır.',
            en: `Trace resistance ${fmtR(r.traceResistance)} (single trace `
              + `${fmtR(r.traceResistanceSingle)}, N=${r.n}). Flex trace temperature is not estimated `
              + 'from I²R alone; heat spreading, the coverlay, air, the rigid region and the bonding '
              + 'structure are outside this calculation.',
          }),
        })
        if (r.voltageDrop !== null) {
          out.push({
            level: 'ok',
            text: t({
              tr: `${fmtA(r.current)} akımda gerilim düşümü ${fmtV(r.voltageDrop)}, güç kaybı `
                + `${fmtP(r.powerLoss)}.`,
              en: `At ${fmtA(r.current)} the voltage drop is ${fmtV(r.voltageDrop)} and the power loss `
                + `is ${fmtP(r.powerLoss)}.`,
            }),
          })
        }
      }

      function clearanceNote(check, label) {
        if (check.status === STATUS_UNKNOWN) {
          return {
            level: 'unknown',
            text: t({
              tr: `${label}: değerlendirilemedi (${dfm.unknownReason(check.variant)}).`,
              en: `${label}: not evaluated (${dfm.unknownReason(check.variant)}).`,
            }),
          }
        }
        const level = check.status === STATUS_DANGER ? 'danger' : check.status === STATUS_WARNING ? 'warn' : 'ok'
        return {
          level,
          text: t({
            tr: `${label}: gerçek ${fmtLen(check.actual)}, minimum ${fmtLen(check.required)}, marj `
              + `${fmtLen(check.margin)} (${pct(fmt(check.marginPercent, 3))}).`,
            en: `${label}: actual ${fmtLen(check.actual)}, minimum ${fmtLen(check.required)}, margin `
              + `${fmtLen(check.margin)} (${pct(fmt(check.marginPercent, 3))}).`,
          }),
        }
      }

      out.push(clearanceNote(r.clearance.via, checkLabel('via-bend-clearance')))
      out.push(clearanceNote(r.clearance.pad, checkLabel('pad-bend-clearance')))
      out.push(clearanceNote(r.clearance.stiffener, checkLabel('stiffener-bend-clearance')))

      if (r.cycleLife !== null) {
        const overTarget = r.targetCycles !== null && r.cycleLife < r.targetCycles
        out.push({
          level: overTarget ? 'danger' : 'ok',
          text: r.targetCycles !== null
            ? t({
              tr: `Tahmini cycle life ${fmt(r.cycleLife, 4)} — hedeflenen ${fmt(r.targetCycles, 4)} `
                + `cycle'ın ${overTarget ? 'ALTINDA' : 'üzerinde'}.`,
              en: `Estimated cycle life ${fmt(r.cycleLife, 4)} — ${overTarget ? 'BELOW' : 'above'} the `
                + `targeted ${fmt(r.targetCycles, 4)} cycles.`,
            })
            : t({
              tr: `Tahmini cycle life ${fmt(r.cycleLife, 4)} (üreticiden alınan A/b katsayılarından).`,
              en: `Estimated cycle life ${fmt(r.cycleLife, 4)} (from the vendor-supplied A/b coefficients).`,
            }),
        })
      } else if (r.bendMode === BEND_DYNAMIC) {
        out.push({
          level: 'unknown',
          text: t({
            tr: 'Dinamik bükülme seçildi ama cycle life için evrensel bir kapalı form yoktur; tahmin '
              + 'ancak üreticiden alınmış A ve b katsayıları girilirse üretilir.',
            en: 'Dynamic bending is selected, but there is no universal closed form for cycle life; an '
              + 'estimate is only produced when vendor-supplied A and b coefficients are entered.',
          }),
        })
      }

      out.push({
        level: 'warn',
        text: r.bendMode === BEND_DYNAMIC
          ? t({
            tr: 'Dinamik (tekrarlı) bükülme seçildi: statik profil örnekleri (K_b=12/24) burada '
              + 'uygulanmaz, üreticinin dinamik bend radius ve cycle life verisi gerekir.',
            en: 'Dynamic (repeated) bending is selected: the static profile examples (K_b=12/24) do not '
              + 'apply here — the vendor’s dynamic bend-radius and cycle-life data are required.',
          })
          : t({
            tr: 'Statik (tek seferlik) bükülme varsayılıyor. Ürün ömrü boyunca tekrar bükülecekse '
              + 'dinamik moda geçip üreticinin dinamik verisini kullanın.',
            en: 'A static (one-time) bend is assumed. If the product will be re-flexed repeatedly over '
              + 'its lifetime, switch to dynamic mode and use the vendor’s dynamic data.',
          }),
      })

      out.push({
        level: 'warn',
        text: t({
          tr: 'Bu model salt geometriktir (ε≈y/R); copper türü, stack-up, work hardening ve tekrarlı '
            + 'fatigue etkilerini içermez. Gerçek kullanım uygunluğu üretici verisi olmadan belirlenemez.',
          en: 'This model is purely geometric (ε≈y/R); it does not include copper type, stack-up, work '
            + 'hardening or repeated-fatigue effects. Real-world suitability cannot be determined '
            + 'without vendor data.',
        }),
      })

      return out
    },
  }
}
