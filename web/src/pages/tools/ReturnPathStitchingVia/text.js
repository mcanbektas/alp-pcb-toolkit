// Dönüş yolu ve stitching via planlayıcısı ekranının kullanıcıya görünen
// metinleri — iki dilli (tr/en).
//
// Hesap katmanı yalnızca kod ve sayı üretir; dile çeviri burada yapılır.
// Motorun (lib/returnPath.js) bulgu/seviye kavramı yok — divider.js'teki gibi
// bir "findings" fonksiyonu bu araç ailesinde (Adım 2'nin beş kardeş motoru)
// hiçbirinde yok; bulgular ThermalVia deseninde olduğu gibi burada, ham
// `compute()` çıktısından `commentary(r)` ile kurulur.

import { fmt, fmtEng, fmtRes, fmtAmp, fmtVolt } from '../../../lib/num'
import { pick } from '../../../lib/i18n'
import { commonText } from '../../../data/uiText'
import {
  REASON_INCOMPLETE, REASON_COUNT, REASON_INVALID,
  PLANE_GND, PLANE_POWER, PLANE_SPLIT,
  SIGNAL_DIFF,
  SWEEP_REACTANCE, SWEEP_CAPACITOR, SWEEP_SPACING, SWEEP_VIA_COUNT,
  BW_SINGLE_POLE, BW_CONSERVATIVE, SPACING_DIVISORS,
} from './model'

const fmtH = (x, sig = 3) => fmtEng(x, 'H', sig)
const fmtHz = (x, sig = 4) => fmtEng(x, 'Hz', sig)
const fmtM = (x, sig = 4) => fmtEng(x, 'm', sig)
const fmtF = (x, sig = 3) => fmtEng(x, 'F', sig)

export function getText(lang) {
  const t = (dict) => pick(dict, lang)
  const { pct } = commonText(lang)

  return {
    pct,
    backlink: t({ tr: '← Via ve Padstack', en: '← Via and Padstack' }),
    title: t({
      tr: 'Dönüş Yolu ve Stitching Via Planlayıcı',
      en: 'Return Path and Stitching Via Planner',
    }),
    intro: t({
      tr: 'Sinyal katman ya da referans düzlemi değiştirdiğinde dönüş akımının izleyeceği yolu '
        + 'değerlendirir: via endüktansı, frekansa bağlı reaktans, dalga boyuna göre önerilen '
        + 'stitching aralığı ve stitching kondansatörünün kompleks empedansı.',
      en: 'Evaluates the return current path when a signal changes layer or reference plane: '
        + 'via inductance, frequency-dependent reactance, the wavelength-based recommended '
        + 'stitching spacing and the stitching capacitor’s complex impedance.',
    }),

    countUnit: t({ tr: 'adet', en: 'pcs' }),

    fields: {
      signalType: { label: t({ tr: 'Sinyal türü', en: 'Signal type' }) },
      signalSingle: t({ tr: 'Tek uçlu', en: 'Single-ended' }),
      signalDiff: t({ tr: 'Diferansiyel', en: 'Differential' }),

      planeType: {
        label: t({ tr: 'Düzlem türü (başlangıç → hedef)', en: 'Plane type (start → target)' }),
        hint: t({
          tr: 'Dönüş akımının geçtiği referans düzlemlerinin ilişkisi',
          en: 'The relationship between the reference planes the return current crosses',
        }),
      },
      planeGnd: t({ tr: 'GND → GND', en: 'GND → GND' }),
      planePower: t({ tr: 'GND ↔ güç', en: 'GND ↔ power' }),
      planeSplit: t({ tr: 'Bölünmüş düzlem üzerinden', en: 'Across a split plane' }),

      tr: { label: t({ tr: 'Sinyal yükselme süresi (t_r)', en: 'Signal rise time (t_r)' }) },
      bandwidthMethod: { label: t({ tr: 'Kenar bant genişliği yöntemi', en: 'Edge bandwidth method' }) },
      bwSinglePole: t({ tr: 'Tek kutup (0.35 / t_r)', en: 'Single-pole (0.35 / t_r)' }),
      bwConservative: t({ tr: 'Muhafazakâr (0.5 / t_r)', en: 'Conservative (0.5 / t_r)' }),
      clockFreq: {
        label: t({ tr: 'Saat/temel sinyal frekansı (opsiyonel)', en: 'Clock/base signal frequency (optional)' }),
        hint: t({
          tr: 'Yalnızca kenar bant genişliğiyle karşılaştırmak için',
          en: 'Only used to compare against the edge bandwidth',
        }),
      },
      analysisFreq: {
        label: t({ tr: 'Maksimum analiz frekansı (opsiyonel)', en: 'Maximum analysis frequency (optional)' }),
        hint: t({
          tr: 'Boş bırakılırsa kenar bant genişliği kullanılır',
          en: 'If left blank the edge bandwidth is used',
        }),
      },

      epsR: { label: t({ tr: 'Dielektrik sabiti (εr)', en: 'Dielectric constant (εr)' }) },
      epsEff: {
        label: t({ tr: 'Etkin dielektrik sabiti (εeff, opsiyonel)', en: 'Effective dielectric constant (εeff, optional)' }),
        hint: t({
          tr: 'Yüzey (microstrip) hat için — girilirse εr yerine bu kullanılır',
          en: 'For a surface (microstrip) line — if entered, this replaces εr',
        }),
      },

      viaLength: { label: t({ tr: 'Via uzunluğu (h)', en: 'Via length (h)' }) },
      viaDiameter: { label: t({ tr: 'Via bitmiş delik çapı (d)', en: 'Via finished hole diameter (d)' }) },
      stitchingViaCount: { label: t({ tr: 'Stitching via sayısı (N)', en: 'Stitching via count (N)' }) },

      actualSpacing: {
        label: t({ tr: 'Gerçek stitching via aralığı (opsiyonel)', en: 'Actual stitching via spacing (optional)' }),
        hint: t({
          tr: 'Komşu stitching vialar arası merkezden merkeze mesafe',
          en: 'Centre-to-centre distance between adjacent stitching vias',
        }),
      },
      spacingDivisor: { label: t({ tr: 'Muhafazakârlık katsayısı (λ/N)', en: 'Conservatism factor (λ/N)' }) },
      signalToReturnViaDistance: {
        label: t({
          tr: 'Sinyal via – en yakın dönüş viası mesafesi (opsiyonel)',
          en: 'Signal via to nearest return via distance (optional)',
        }),
        hint: t({
          tr: 'Döngü alanını belirleyen radyal mesafe; bu araçta yalnızca bilgi amaçlı gösterilir',
          en: 'The radial distance that sets the loop area; shown here for reference only',
        }),
      },
      returnCurrentPeak: {
        label: t({ tr: 'Tepe dönüş akımı (opsiyonel)', en: 'Peak return current (optional)' }),
        hint: t({
          tr: 'Girilirse endüktif gerilim düşümü tahmini eklenir',
          en: 'If entered, an inductive voltage drop estimate is added',
        }),
      },

      hasCapacitorCheck: t({
        tr: 'Stitching kondansatörü seçeneğini değerlendir',
        en: 'Evaluate a stitching capacitor option',
      }),
      capC: { label: t({ tr: 'Kapasitans (C)', en: 'Capacitance (C)' }) },
      capEsr: { label: t({ tr: 'ESR', en: 'ESR' }) },
      capEsl: { label: t({ tr: 'ESL (kondansatörün kendi)', en: 'ESL (component’s own)' }) },
      capMountL: {
        label: t({ tr: 'Via ve bağlantı endüktansı', en: 'Via and connection inductance' }),
        hint: t({
          tr: 'Kondansatörü düzleme bağlayan via + pad + iz endüktansının toplamı',
          en: 'The combined inductance of the via, pad and trace connecting the capacitor to the plane',
        }),
      },
      capDistance: {
        label: t({ tr: 'Kondansatörün sinyal via’ya uzaklığı (opsiyonel)', en: 'Capacitor distance to signal via (optional)' }),
      },
    },

    // Hata mesajında alan adı olarak görünen kısa etiketler; model.js'e verilir.
    fieldLabels: {
      tr: t({ tr: 'Sinyal yükselme süresi', en: 'Signal rise time' }),
      epsR: t({ tr: 'Dielektrik sabiti (εr)', en: 'Dielectric constant (εr)' }),
      epsEff: t({ tr: 'Etkin dielektrik sabiti (εeff)', en: 'Effective dielectric constant (εeff)' }),
      viaLength: t({ tr: 'Via uzunluğu', en: 'Via length' }),
      viaDiameter: t({ tr: 'Via bitmiş delik çapı', en: 'Via finished hole diameter' }),
      stitchingViaCount: t({ tr: 'Stitching via sayısı', en: 'Stitching via count' }),
      clockFreq: t({ tr: 'Saat frekansı', en: 'Clock frequency' }),
      analysisFreq: t({ tr: 'Maksimum analiz frekansı', en: 'Maximum analysis frequency' }),
      returnCurrentPeak: t({ tr: 'Tepe dönüş akımı', en: 'Peak return current' }),
      actualSpacing: t({ tr: 'Gerçek stitching via aralığı', en: 'Actual stitching via spacing' }),
      signalToReturnViaDistance: t({
        tr: 'Sinyal via – dönüş viası mesafesi',
        en: 'Signal via to return via distance',
      }),
      capC: t({ tr: 'Kapasitans', en: 'Capacitance' }),
      capEsr: 'ESR',
      capEsl: 'ESL',
      capMountL: t({ tr: 'Via ve bağlantı endüktansı', en: 'Via and connection inductance' }),
      capDistance: t({ tr: 'Kondansatörün sinyal via’ya uzaklığı', en: 'Capacitor distance to signal via' }),
    },

    bigResultLabel: t({
      tr: 'Dönüş yolu reaktansı (X_L, N via eşdeğeri)',
      en: 'Return path reactance (X_L, N-via equivalent)',
    }),
    altLabels: {
      fEdge: t({ tr: 'kenar bant', en: 'edge bandwidth' }),
      lambda: t({ tr: 'λ', en: 'λ' }),
      lVia: t({ tr: 'tek via L', en: 'single via L' }),
    },

    table: {
      fEdge: t({ tr: 'Kenar bant genişliği (f_edge)', en: 'Edge bandwidth (f_edge)' }),
      fAnalysis: t({ tr: 'Kullanılan analiz frekansı', en: 'Analysis frequency used' }),
      edgeToClockRatio: t({ tr: 'Kenar bandı / saat frekansı oranı', en: 'Edge bandwidth / clock ratio' }),
      vp: t({ tr: 'Yayılma hızı (v_p)', en: 'Propagation velocity (v_p)' }),
      lambda: t({ tr: 'Dalga boyu (λ)', en: 'Wavelength (λ)' }),
      spacing: (n) => `λ/${n}`,
      viaLSingle: t({ tr: 'Tek via endüktansı', en: 'Single via inductance' }),
      viaLEq: (n) => t({
        tr: `Paralel via eşdeğer endüktansı (${n} via)`,
        en: `Parallel via equivalent inductance (${n} vias)`,
      }),
      xlSingle: t({ tr: 'Tek via reaktansı (analiz frekansında)', en: 'Single via reactance (at analysis frequency)' }),
      xlParallel: t({ tr: 'N via eşdeğer reaktansı (analiz frekansında)', en: 'N-via equivalent reactance (at analysis frequency)' }),
      spacingLimit: t({ tr: 'Seçili sınır (λ/N)', en: 'Selected limit (λ/N)' }),
      spacingRatio: t({ tr: 'Gerçek aralık / sınır oranı', en: 'Actual spacing / limit ratio' }),
      signalToReturnViaDistance: t({
        tr: 'Sinyal via – dönüş viası mesafesi',
        en: 'Signal via to return via distance',
      }),
      returnVoltage: t({ tr: 'Endüktif gerilim düşümü tahmini (V_L)', en: 'Estimated inductive voltage drop (V_L)' }),
      capEslTotal: t({ tr: 'Kondansatör — toplam ESL', en: 'Capacitor — total ESL' }),
      capFsrf: t({ tr: 'Kondansatör — SRF', en: 'Capacitor — SRF' }),
      capImpedance: t({ tr: 'Kondansatör empedansı |Z_C| (analiz frekansında)', en: 'Capacitor impedance |Z_C| (at analysis frequency)' }),
      capDistance: t({ tr: 'Kondansatör – sinyal via mesafesi', en: 'Capacitor to signal via distance' }),
    },

    formula: t({
      tr: `f_edge ≈ k / t_r
  (k = 0.35 tek kutup, 0.5 muhafazakâr)

v_p = c / √ε   (ε = εeff varsa, yoksa εr)
λ = v_p / f
Stitching aralığı sınırı: λ/N

L_via ≈ 0.2·h_mm·[ln(4h_mm/d_mm) + 1]   (nH)
X_L = 2π·f·L
L_via,eq ≈ L_via,tek / N

Z_C = ESR + jωESL + 1/(jωC)
f_SRF = 1 / (2π·√(ESL·C))
ESL_toplam = ESL_bileşen + L_mount + L_via,eq

V_L = I_pk · X_L`,
      en: `f_edge ≈ k / t_r
  (k = 0.35 single-pole, 0.5 conservative)

v_p = c / √ε   (ε = εeff if given, else εr)
λ = v_p / f
Stitching spacing limit: λ/N

L_via ≈ 0.2·h_mm·[ln(4h_mm/d_mm) + 1]   (nH)
X_L = 2π·f·L
L_via,eq ≈ L_via,single / N

Z_C = ESR + jωESL + 1/(jωC)
f_SRF = 1 / (2π·√(ESL·C))
ESL_total = ESL_component + L_mount + L_via,eq

V_L = I_pk · X_L`,
    }),

    detail: {
      epsUsed: (eff, value) => (eff
        ? t({
          tr: `Etkin dielektrik sabiti εeff = ${fmt(value, 4)} kullanıldı (yüzey/microstrip hat).`,
          en: `Effective dielectric constant εeff = ${fmt(value, 4)} was used (surface/microstrip line).`,
        })
        : t({
          tr: `Dielektrik sabiti εr = ${fmt(value, 4)} kullanıldı (gömülü/stripline hat).`,
          en: `Dielectric constant εr = ${fmt(value, 4)} was used (embedded/stripline line).`,
        })),
      analysisSource: (usedAnalysisOverride) => (usedAnalysisOverride
        ? t({
          tr: 'Analiz frekansı kullanıcı tarafından elle verildi.',
          en: 'The analysis frequency was entered manually.',
        })
        : t({
          tr: 'Analiz frekansı olarak kenar bant genişliği kullanıldı (ayrı bir değer girilmedi).',
          en: 'The edge bandwidth was used as the analysis frequency (no separate value entered).',
        })),
      spacingRule: (n) => t({
        tr: `Seçilen katsayı λ/${n} — 10 gevşek yaklaşım, 20 muhafazakâr başlangıç, 40 yüksek `
          + 'marjlı başlangıçtır; bu bir standart zorunluluğu değil, mühendislik kuralıdır.',
        en: `The selected factor is λ/${n} — 10 is a loose approximation, 20 a conservative `
          + 'starting point, 40 a high-margin starting point; this is an engineering rule, not '
          + 'a standard requirement.',
      }),
      noRounding: t({
        tr: 'Ara değerlerde yuvarlama yapılmaz; yalnızca gösterim yuvarlanır.',
        en: 'Intermediate values are never rounded; only the display is rounded.',
      }),
    },

    validity: [
      t({
        tr: 'Via endüktansı formülü izole, silindirik bir iletkenin birinci mertebe yaklaşık '
          + 'modelidir; pad, antipad, yakın GND via, düzlem bağlantısı ve karşılıklı endüktansı '
          + 'tam olarak modellemez.',
        en: 'The via inductance formula is a first-order approximate model of an isolated '
          + 'cylindrical conductor; it does not fully model the pad, antipad, nearby GND vias, '
          + 'the plane connection or mutual inductance.',
      }),
      t({
        tr: 'Kenar bant genişliği tasarım amaçlı yaklaşık bir değerdir, kesin bir spektrum '
          + 'sınırı değildir.',
        en: 'The edge bandwidth is an approximate design-purpose value, not an exact spectral '
          + 'limit.',
      }),
      t({
        tr: 'λ/N muhafazakârlık katsayıları (10/20/40) standart zorunluluğu değil, mühendislik '
          + 'kuralıdır.',
        en: 'The λ/N conservatism factors (10/20/40) are an engineering rule, not a standard '
          + 'requirement.',
      }),
      t({
        tr: 'Birden fazla stitching via ideal ve birbirinden bağımsız kabul edilir; gerçek '
          + 'yapıda ortak akım yolu ve karşılıklı endüktans bulunduğundan eşdeğer endüktans '
          + 'sonucu iyimser olabilir.',
        en: 'Multiple stitching vias are assumed ideal and independent; in a real structure a '
          + 'shared current path and mutual inductance exist, so the equivalent inductance '
          + 'result may be optimistic.',
      }),
      t({
        tr: 'Endüktif gerilim düşümü tahmini doğrudan ground bounce veya EMI sonucu değildir; '
          + 'yalnızca dönüş bağlantısının endüktif büyüklüğünü gösterir.',
        en: 'The inductive voltage drop estimate is not directly a ground bounce or EMI result; '
          + 'it only shows the inductive magnitude of the return connection.',
      }),
      t({
        tr: 'Model homojen dielektrik ve tek modlu yayılma varsayar; katman geçişindeki '
          + 'empedans süreksizliği (yansıma) bu hesabın kapsamı dışındadır.',
        en: 'The model assumes a homogeneous dielectric and single-mode propagation; the '
          + 'impedance discontinuity (reflection) at the layer transition is outside the scope '
          + 'of this calculation.',
      }),
      t({
        tr: 'Sonuçlar yaklaşık mühendislik tahminidir — kritik tasarımlarda alan çözücü ve '
          + 'ölçümle doğrulayın.',
        en: 'Results are approximate engineering estimates — verify with a field solver and '
          + 'measurement for critical designs.',
      }),
    ],

    sweepGroup: t({ tr: 'Grafik', en: 'Chart' }),
    sweepLabel: {
      [SWEEP_REACTANCE]: t({ tr: 'Via reaktansı', en: 'Via reactance' }),
      [SWEEP_CAPACITOR]: t({ tr: 'Kondansatör empedansı', en: 'Capacitor impedance' }),
      [SWEEP_SPACING]: t({ tr: 'Stitching aralığı', en: 'Stitching spacing' }),
      [SWEEP_VIA_COUNT]: t({ tr: 'Via sayısı', en: 'Via count' }),
    },
    sweepAxis: {
      [SWEEP_REACTANCE]: t({ tr: 'Frekans (Hz)', en: 'Frequency (Hz)' }),
      [SWEEP_CAPACITOR]: t({ tr: 'Frekans (Hz)', en: 'Frequency (Hz)' }),
      [SWEEP_SPACING]: t({ tr: 'Frekans (Hz)', en: 'Frequency (Hz)' }),
      [SWEEP_VIA_COUNT]: t({ tr: 'Stitching via sayısı', en: 'Stitching via count' }),
    },
    sweepYLabel: {
      [SWEEP_REACTANCE]: t({ tr: 'Reaktans (Ω)', en: 'Reactance (Ω)' }),
      [SWEEP_CAPACITOR]: t({ tr: 'Kondansatör empedansı |Z| (Ω)', en: 'Capacitor impedance |Z| (Ω)' }),
      [SWEEP_SPACING]: t({ tr: 'Stitching aralığı sınırı (m)', en: 'Stitching spacing limit (m)' }),
      [SWEEP_VIA_COUNT]: t({ tr: 'Eşdeğer via endüktansı (H)', en: 'Equivalent via inductance (H)' }),
    },
    sweepCaption: {
      [SWEEP_REACTANCE]: t({
        tr: 'Reaktans frekansla doğrusal artar (log-log eksende düz çizgi). N via eşdeğeri tek '
          + 'viadan her zaman düşüktür.',
        en: 'Reactance rises linearly with frequency (a straight line on log-log axes). The '
          + 'N-via equivalent is always lower than a single via.',
      }),
      [SWEEP_CAPACITOR]: t({
        tr: 'Empedans düşük frekansta kapasitif, yüksek frekansta endüktif koldan gelir; en '
          + 'düşük nokta SRF’dir.',
        en: 'The impedance is capacitive at low frequency and inductive at high frequency; the '
          + 'lowest point is the SRF.',
      }),
      [SWEEP_SPACING]: t({
        tr: 'Frekans arttıkça izin verilen stitching aralığı daralır — yüksek frekanslı '
          + 'tasarımlar daha sık via ister.',
        en: 'As frequency rises the allowed stitching spacing shrinks — higher-frequency '
          + 'designs need more closely spaced vias.',
      }),
      [SWEEP_VIA_COUNT]: t({
        tr: 'Eşdeğer endüktans via sayısıyla 1/N azalır; ilk birkaç viadan sonra kazanç '
          + 'küçülür.',
        en: 'The equivalent inductance falls as 1/N with via count; the gain shrinks after the '
          + 'first few vias.',
      }),
    },
    refLabel: {
      analysisFreq: (y) => t({ tr: `analiz f — ${fmtHz(y, 3)}`, en: `analysis f — ${fmtHz(y, 3)}` }),
    },
    operatingPoint: t({ tr: 'çalışma noktası', en: 'operating point' }),
    seriesSingle: t({ tr: 'tek via', en: 'single via' }),
    seriesParallel: t({ tr: 'N via eşdeğeri', en: 'N-via equivalent' }),

    schematic: {
      title: t({ tr: 'Dönüş yolu kesiti', en: 'Return path cross-section' }),
      caption: (hasCap, plane) => {
        if (plane === PLANE_SPLIT) {
          return t({
            tr: 'Sinyal via’sı bölünmüş bir düzlemi geçiyor — süreksiz dönüş yolu',
            en: 'The signal via crosses a split plane — a discontinuous return path',
          })
        }
        return hasCap
          ? t({
            tr: 'Stitching via ve alternatif stitching kondansatörü ile katman geçişi',
            en: 'Layer transition with a stitching via and an alternative stitching capacitor',
          })
          : t({
            tr: 'Stitching via ile katman geçişi',
            en: 'Layer transition with a stitching via',
          })
      },
      signalTrace: t({ tr: 'sinyal izi', en: 'signal trace' }),
      signalVia: t({ tr: 'sinyal via', en: 'signal via' }),
      stitchingVia: t({ tr: 'stitching via', en: 'stitching via' }),
      capacitor: t({ tr: 'stitching C', en: 'stitching C' }),
      planeStart: t({ tr: 'başlangıç referansı', en: 'start reference' }),
      planeTarget: t({ tr: 'hedef referans', en: 'target reference' }),
      planeSplitGap: t({ tr: 'bölünme', en: 'split' }),
      countNote: (n) => t({ tr: `dizide ${n} via`, en: `${n} vias in the array` }),
    },

    reasonText: (reason) => {
      switch (reason) {
        case REASON_COUNT:
          return t({
            tr: 'Stitching via sayısı 1 veya daha büyük bir tam sayı olmalı.',
            en: 'The stitching via count must be an integer of 1 or more.',
          })
        case REASON_INVALID:
          return t({
            tr: 'Girilen değer kombinasyonu geçerli değil. Yükselme süresi, dielektrik sabiti '
              + 've via geometrisini kontrol edin.',
            en: 'The entered combination of values is not valid. Check the rise time, '
              + 'dielectric constant and via geometry.',
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
    // (bkz. dosya başı notu) ham `r`den burada kurulur.
    commentary: (r) => {
      if (!r.ok) return []
      const out = []

      out.push({
        level: 'ok',
        text: t({
          tr: `Kenar bant genişliği ${fmtHz(r.fEdge, 3)}; ${r.stitchingViaCount} via ile dönüş `
            + `yolu reaktansı ${fmtRes(r.reactanceParallel)} (${fmtHz(r.fAnalysis, 3)} analiz `
            + 'frekansında).',
          en: `Edge bandwidth ${fmtHz(r.fEdge, 3)}; with ${r.stitchingViaCount} via(s) the `
            + `return path reactance is ${fmtRes(r.reactanceParallel)} (at an analysis `
            + `frequency of ${fmtHz(r.fAnalysis, 3)}).`,
        }),
      })

      if (r.clockFreq != null && r.edgeToClockRatio != null) {
        out.push({
          level: 'ok',
          text: t({
            tr: `Saat frekansı ${fmtHz(r.clockFreq, 3)} olsa da kenar bant genişliği bunun `
              + `${fmt(r.edgeToClockRatio, 3)} katı — analiz bu daha yüksek frekansa göre `
              + 'yapılmalıdır.',
            en: `Although the clock frequency is ${fmtHz(r.clockFreq, 3)}, the edge bandwidth `
              + `is ${fmt(r.edgeToClockRatio, 3)}× higher — the analysis should use this `
              + 'higher frequency.',
          }),
        })
      }

      if (r.spacingRatio != null) {
        out.push(r.spacingRatio <= 1
          ? {
            level: 'ok',
            text: t({
              tr: `Gerçek stitching aralığı seçilen sınırın (λ/${r.spacingDivisor}) `
                + `${pct(fmt(r.spacingRatio * 100, 3))}'i — sınır içinde.`,
              en: `The actual stitching spacing is ${pct(fmt(r.spacingRatio * 100, 3))} of the `
                + `selected limit (λ/${r.spacingDivisor}) — within the limit.`,
            }),
          }
          : {
            level: 'warn',
            text: t({
              tr: `Gerçek stitching aralığı seçilen sınırı (λ/${r.spacingDivisor}) `
                + `${fmt(r.spacingRatio, 3)} kat aşıyor. Via sayısını artırın veya aralığı `
                + 'azaltın.',
              en: `The actual stitching spacing exceeds the selected limit (λ/`
                + `${r.spacingDivisor}) by ${fmt(r.spacingRatio, 3)}×. Add more vias or reduce `
                + 'the spacing.',
            }),
          })
      }

      if (r.planeType === PLANE_GND) {
        out.push({
          level: 'ok',
          text: t({
            tr: 'Başlangıç ve hedef referans aynı düzlem (GND) — stitching via dönüş yolunu '
              + 'doğrudan tamamlar.',
            en: 'The start and target reference are the same plane (GND) — the stitching via '
              + 'directly completes the return path.',
          }),
        })
      } else if (r.planeType === PLANE_POWER) {
        out.push(r.hasCapacitor
          ? {
            level: 'ok',
            text: t({
              tr: 'Referans GND ile güç düzlemi arasında değişiyor; düz bir via iki farklı neti '
                + 'kısa devre eder — stitching kondansatör(ler) iki düzlemi AC’de birbirine '
                + 'bağlıyor.',
              en: 'The reference changes between GND and a power plane; a plain via would short '
                + 'two different nets — the stitching capacitor(s) AC-couple the two planes '
                + 'instead.',
            }),
          }
          : {
            level: 'warn',
            text: t({
              tr: 'Referans GND ile güç düzlemi arasında değişiyor. Düz bir stitching via iki '
                + 'farklı neti kısa devre eder; bu geçiş için stitching kondansatör girilmeli '
                + 'veya düzlem ataması gözden geçirilmelidir.',
              en: 'The reference changes between GND and a power plane. A plain stitching via '
                + 'would short two different nets; enter a stitching capacitor for this '
                + 'transition or review the plane assignment.',
            }),
          })
      } else {
        out.push({
          level: 'danger',
          text: t({
            tr: 'Dönüş yolu bölünmüş bir düzlemi geçiyor. Bu geometrik süreksizlik döngü '
              + 'alanını büyütür ve EMI riskini artırır — iz bu geçişi yapmamalı ya da geçiş '
              + 'bir stitching kondansatörle köprülenmelidir.',
            en: 'The return path crosses a split plane. This geometric discontinuity enlarges '
              + 'the loop area and increases EMI risk — the trace should not cross here, or '
              + 'the crossing must be bridged with a stitching capacitor.',
          }),
        })
      }

      if (r.hasCapacitor && r.capacitor) {
        const viaLower = r.reactanceParallel <= r.capacitor.impedance
        out.push({
          level: 'ok',
          text: t({
            tr: `Analiz frekansında via yolu ${fmtRes(r.reactanceParallel)}, kondansatör yolu `
              + `${fmtRes(r.capacitor.impedance)} — ${viaLower ? 'via' : 'kondansatör'} daha `
              + 'düşük empedanslı dönüş yolunu sağlıyor.',
            en: `At the analysis frequency the via path is ${fmtRes(r.reactanceParallel)} and `
              + `the capacitor path is ${fmtRes(r.capacitor.impedance)} — the `
              + `${viaLower ? 'via' : 'capacitor'} path provides the lower-impedance return.`,
          }),
        })
      }

      if (r.stitchingViaCount > 1) {
        out.push({
          level: 'warn',
          text: t({
            tr: `${r.stitchingViaCount} via ideal ve birbirinden bağımsız kabul edildi; gerçek `
              + 'karşılıklı endüktans bu eşdeğer sonucu iyimser gösterebilir.',
            en: `The ${r.stitchingViaCount} vias are assumed ideal and independent; real mutual `
              + 'inductance may make this equivalent result optimistic.',
          }),
        })
      }

      if (r.returnVoltage != null) {
        out.push({
          level: 'ok',
          text: t({
            tr: `Tepe dönüş akımıyla endüktif gerilim düşümü tahmini ${fmtVolt(r.returnVoltage)} `
              + '— bu doğrudan ground bounce ya da EMI sonucu değildir, yalnızca bağlantının '
              + 'endüktif büyüklüğüdür.',
            en: `With the peak return current the estimated inductive voltage drop is `
              + `${fmtVolt(r.returnVoltage)} — this is not directly a ground bounce or EMI `
              + 'result, only the inductive magnitude of the connection.',
          }),
        })
      }

      if (r.signalType === SIGNAL_DIFF) {
        out.push({
          level: 'ok',
          text: t({
            tr: 'Diferansiyel çift seçildi; bu araç ortak dönüş yolu geometrisini değerlendirir, '
              + 'çift içi kuplajı hesaba katmaz.',
            en: 'A differential pair is selected; this tool evaluates the shared return path '
              + 'geometry and does not account for intra-pair coupling.',
          }),
        })
      }

      out.push({
        level: 'warn',
        text: t({
          tr: 'Via endüktansı izole silindirik iletken yaklaşımıdır; pad, antipad, yakın GND '
            + 'via ve düzlem bağlantısını tam modellemez.',
          en: 'The via inductance is an isolated-cylindrical-conductor approximation; it does '
            + 'not fully model the pad, antipad, nearby GND vias or the plane connection.',
        }),
      })

      return out
    },
  }
}
