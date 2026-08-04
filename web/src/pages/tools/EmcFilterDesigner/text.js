// EMC LC, Pi ve Ortak Mod Filtre Tasarım Aracı — kullanıcıya görünen
// metinler, iki dilli (tr/en).
//
// Hesap katmanı yalnızca kod ve sayı üretir; dile çeviri burada yapılır.
// Motorun (lib/emcFilter.js) bulgu/seviye kavramı yok — ReturnPathStitchingVia/
// ThermalVia deseninde olduğu gibi bulgular burada, ham `compute()`
// çıktısından `commentary(r)` ile kurulur (ayrı bir `findings()` YOK).
//
// Kararlar §3.3 "tek skor YOK" politikası burada da geçerlidir: bu dosyada
// hiçbir yerde ağırlıklı skor, "en iyi aday" etiketi ya da adayları sıralayan
// bir metin üretilmez — bkz. aşağıdaki `commentary` ve `candidates` metinleri.

import { fmt, fmtEng, fmtRes } from '../../../lib/num'
import { pick } from '../../../lib/i18n'
import { commonText } from '../../../data/uiText'
import {
  REASON_INCOMPLETE, REASON_INVALID,
  TOPOLOGY_PI, TOPOLOGY_CM,
  CHART_GAIN, CHART_ZOUT, CHART_COMPARE, CHART_TOLERANCE,
} from './model'

const fmtHz = (x, sig = 4) => fmtEng(x, 'Hz', sig)

export function getText(lang) {
  const t = (dict) => pick(dict, lang)
  const { pct } = commonText(lang)

  const topoName = (topology) => {
    if (topology === TOPOLOGY_PI) return t({ tr: 'π (Pi)', en: 'π (Pi)' })
    if (topology === TOPOLOGY_CM) return t({ tr: 'Ortak mod choke', en: 'Common-mode choke' })
    return t({ tr: 'LC', en: 'LC' })
  }

  return {
    pct,
    backlink: t({ tr: '← Güç ve Termal', en: '← Power and Thermal' }),
    title: t({
      tr: 'EMC LC, Pi ve Ortak Mod Filtre Tasarım Aracı',
      en: 'EMC LC, Pi, and Common-Mode Filter Designer',
    }),
    intro: t({
      tr: 'Converter girişindeki EMC filtresini (LC, π ya da ortak mod choke) genel bir ABCD '
        + '(2-port zincir) modeliyle değerlendirir: kazanç/insertion loss, filtre çıkış '
        + 'empedansı, converter negatif giriş direnciyle empedans oranı ve damping direnci '
        + 'adaylarının ham metrikleri. Tek bir ağırlıklı skor ya da "en iyi aday" üretilmez — '
        + 'uygun bölgedeki adaylar tabloda ve ayrı grafiklerde karşılaştırılır, nihai seçim '
        + 'size bırakılır.',
      en: 'Evaluates the EMC filter (LC, π or common-mode choke) at a converter input using a '
        + 'general ABCD (2-port chain) model: gain/insertion loss, filter output impedance, the '
        + 'impedance ratio against the converter’s negative input resistance, and the raw '
        + 'metrics of candidate damping resistors. No single weighted score or "best candidate" '
        + 'is produced — suitable candidates are compared in a table and in separate charts, and '
        + 'the final choice is left to you.',
    }),

    topoName,

    fields: {
      topology: { label: t({ tr: 'Filtre topolojisi', en: 'Filter topology' }) },
      topologyLc: t({ tr: 'LC', en: 'LC' }),
      topologyPi: t({ tr: 'π (Pi)', en: 'π (Pi)' }),
      topologyCm: t({ tr: 'Ortak mod choke', en: 'Common-mode choke' }),

      rSource: { label: t({ tr: 'Kaynak direnci (R_source)', en: 'Source resistance (R_source)' }) },
      lSource: { label: t({ tr: 'Kaynak endüktansı (L_source)', en: 'Source inductance (L_source)' }) },
      rLoad: { label: t({ tr: 'Yük direnci (R_load)', en: 'Load resistance (R_load)' }) },
      vIn: { label: t({ tr: 'Giriş voltajı (V_in)', en: 'Input voltage (V_in)' }) },
      pOut: {
        label: t({ tr: 'Converter çıkış gücü (P_out)', en: 'Converter output power (P_out)' }),
        hint: t({
          tr: 'Motor bu değer ve verimden P_in’i türetir (P_in = P_out/η); P_in sonuç '
            + 'satırlarında ayrıca gösterilir.',
          en: 'The engine derives P_in from this value and the efficiency (P_in = P_out/η); '
            + 'P_in is also shown in the result rows.',
        }),
      },
      efficiency: { label: t({ tr: 'Converter verimi (η)', en: 'Converter efficiency (η)' }) },
      vSource: {
        label: t({ tr: 'Kaynak gerilimi (v_source, RMS)', en: 'Source voltage (v_source, RMS)' }),
        hint: t({
          tr: 'Damping direnci güç kaybı hesabında kullanılan küçük-işaret genliği.',
          en: 'The small-signal amplitude used in the damping-resistor power-loss calculation.',
        }),
      },
      fMin: { label: t({ tr: 'Analiz frekans aralığı — alt sınır', en: 'Analysis frequency range — lower bound' }) },
      fMax: { label: t({ tr: 'Analiz frekans aralığı — üst sınır', en: 'Analysis frequency range — upper bound' }) },
      fNoise: { label: t({ tr: 'Hedef gürültü frekansı (f_noise)', en: 'Target noise frequency (f_noise)' }) },

      requiredAttenuationDb: {
        label: t({ tr: 'Gerekli attenuation (A_required,dB)', en: 'Required attenuation (A_required,dB)' }),
      },
      dampingPowerMaxW: {
        label: t({
          tr: 'İzin verilen damping direnci gücü (P_R_D,allowed)',
          en: 'Allowed damping resistor power (P_R_D,allowed)',
        }),
      },
      gainPeakMaxDb: {
        label: t({ tr: 'Gain peaking sınırı (G_peak,dB üst sınırı)', en: 'Gain peaking limit (G_peak,dB upper bound)' }),
      },
      impedanceRatioMax: {
        label: t({ tr: 'Empedans oranı sınırı (K_Z üst sınırı)', en: 'Impedance ratio limit (K_Z upper bound)' }),
        hint: t({ tr: 'Middlebrook tasarım marjı; varsayılan 1/3.', en: 'A Middlebrook design margin; default 1/3.' }),
      },
      componentTolerancePct: {
        label: t({
          tr: 'Bileşen toleransı (nominal/min/maks grafiği için)',
          en: 'Component tolerance (for the nominal/min/max chart)',
        }),
      },

      L: { label: t({ tr: 'Endüktör (L)', en: 'Inductor (L)' }) },
      dcr: { label: t({ tr: 'Endüktör / choke DCR', en: 'Inductor / choke DCR' }) },
      parallelC: {
        label: t({
          tr: 'Endüktör paralel parazitik kapasitans (C_p, opsiyonel)',
          en: 'Inductor parallel parasitic capacitance (C_p, optional)',
        }),
      },
      C: { label: t({ tr: 'Kapasitör (C / π’de C1)', en: 'Capacitor (C / C1 in π mode)' }) },
      esr: { label: t({ tr: 'Kapasitör ESR', en: 'Capacitor ESR' }) },
      esl: { label: t({ tr: 'Kapasitör ESL', en: 'Capacitor ESL' }) },
      C2: { label: t({ tr: 'Kapasitör 2 (C2, yalnız π)', en: 'Capacitor 2 (C2, π only)' }) },
      esr2: { label: t({ tr: 'Kapasitör 2 ESR', en: 'Capacitor 2 ESR' }) },
      esl2: { label: t({ tr: 'Kapasitör 2 ESL', en: 'Capacitor 2 ESL' }) },

      lLeak: {
        label: t({ tr: 'Kaçak endüktans (L_leak, differential mode)', en: 'Leakage inductance (L_leak, differential mode)' }),
      },
      lCm: { label: t({ tr: 'Ortak mod choke endüktansı (L_CM)', en: 'Common-mode choke inductance (L_CM)' }) },
      cLL: { label: t({ tr: 'Hat-hat kapasitansı (C_LL)', en: 'Line-to-line capacitance (C_LL)' }) },
      esrLL: { label: t({ tr: 'C_LL ESR', en: 'C_LL ESR' }) },
      eslLL: { label: t({ tr: 'C_LL ESL', en: 'C_LL ESL' }) },

      rD: { label: t({ tr: 'Damping direnci (R_D)', en: 'Damping resistor (R_D)' }) },
      cD: { label: t({ tr: 'Damping kapasitörü (C_D, opsiyonel)', en: 'Damping capacitor (C_D, optional)' }) },
    },

    // Hata mesajında alan adı olarak görünen kısa etiketler; model.js'e
    // verilir. `candidateRow`, readRows'un satır numarası önekinde kullanılır
    // ("aday 2 — R_D" gibi).
    fieldLabels: {
      candidateRow: t({ tr: 'aday', en: 'candidate' }),
      rSource: t({ tr: 'Kaynak direnci', en: 'Source resistance' }),
      lSource: t({ tr: 'Kaynak endüktansı', en: 'Source inductance' }),
      rLoad: t({ tr: 'Yük direnci', en: 'Load resistance' }),
      vIn: t({ tr: 'Giriş voltajı', en: 'Input voltage' }),
      pOut: t({ tr: 'Converter çıkış gücü', en: 'Converter output power' }),
      efficiency: t({ tr: 'Converter verimi', en: 'Converter efficiency' }),
      vSource: t({ tr: 'Kaynak gerilimi', en: 'Source voltage' }),
      fMin: t({ tr: 'Analiz frekans aralığı alt sınırı', en: 'Analysis frequency lower bound' }),
      fMax: t({ tr: 'Analiz frekans aralığı üst sınırı', en: 'Analysis frequency upper bound' }),
      fNoise: t({ tr: 'Hedef gürültü frekansı', en: 'Target noise frequency' }),
      requiredAttenuationDb: t({ tr: 'Gerekli attenuation', en: 'Required attenuation' }),
      dampingPowerMaxW: t({ tr: 'İzin verilen damping direnci gücü', en: 'Allowed damping resistor power' }),
      gainPeakMaxDb: t({ tr: 'Gain peaking sınırı', en: 'Gain peaking limit' }),
      impedanceRatioMax: t({ tr: 'Empedans oranı sınırı', en: 'Impedance ratio limit' }),
      componentTolerancePct: t({ tr: 'Bileşen toleransı', en: 'Component tolerance' }),
      L: t({ tr: 'Endüktör (L)', en: 'Inductor (L)' }),
      dcr: t({ tr: 'DCR', en: 'DCR' }),
      parallelC: t({ tr: 'Paralel parazitik kapasitans', en: 'Parallel parasitic capacitance' }),
      C: t({ tr: 'Kapasitör (C)', en: 'Capacitor (C)' }),
      esr: 'ESR',
      esl: 'ESL',
      C2: t({ tr: 'Kapasitör 2 (C2)', en: 'Capacitor 2 (C2)' }),
      esr2: t({ tr: 'Kapasitör 2 ESR', en: 'Capacitor 2 ESR' }),
      esl2: t({ tr: 'Kapasitör 2 ESL', en: 'Capacitor 2 ESL' }),
      lLeak: t({ tr: 'Kaçak endüktans', en: 'Leakage inductance' }),
      lCm: t({ tr: 'Ortak mod choke endüktansı', en: 'Common-mode choke inductance' }),
      cLL: t({ tr: 'Hat-hat kapasitansı', en: 'Line-to-line capacitance' }),
      esrLL: t({ tr: 'C_LL ESR', en: 'C_LL ESR' }),
      eslLL: t({ tr: 'C_LL ESL', en: 'C_LL ESL' }),
      rD: t({ tr: 'Damping direnci', en: 'Damping resistor' }),
      cD: t({ tr: 'Damping kapasitörü', en: 'Damping capacitor' }),
    },

    table: {
      idealPair: {
        main: t({ tr: 'İdeal rezonans (L, C)', en: 'Ideal resonance (L, C)' }),
        c1: t({ tr: 'İdeal rezonans (L, C1)', en: 'Ideal resonance (L, C1)' }),
        c2: t({ tr: 'İdeal rezonans (L, C2)', en: 'Ideal resonance (L, C2)' }),
        dm: t({ tr: 'İdeal differential-mode rezonansı (L_leak, C_LL)', en: 'Ideal differential-mode resonance (L_leak, C_LL)' }),
      },
      f0: t({ tr: 'f0', en: 'f0' }),
      z0: t({ tr: 'Z0', en: 'Z0' }),
      zIn: t({ tr: 'Converter negatif giriş direnci |R_in,neg|', en: 'Converter negative input resistance |R_in,neg|' }),
      pIn: t({ tr: 'Converter giriş gücü (P_in, türetilmiş)', en: 'Converter input power (P_in, derived)' }),
      zOutNoise: t({
        tr: 'Filtre çıkış empedansı (gürültü frekansında, sönümsüz)',
        en: 'Filter output impedance (at the noise frequency, undamped)',
      }),
      cmImpedance: t({ tr: 'Ortak mod empedansı |Z_CM| (gürültü frekansında)', en: 'Common-mode impedance |Z_CM| (at the noise frequency)' }),
      dmImpedance: t({ tr: 'Differential mode empedansı |Z_DM| (gürültü frekansında)', en: 'Differential-mode impedance |Z_DM| (at the noise frequency)' }),
    },

    formula: t({
      tr: `f0 = 1 / (2π√(LC))            Z0 = √(L/C)
Z_L = DCR + jωL   (∥ 1/(jωC_p) varsa)
Z_C = ESR + jωESL + 1/(jωC)
Z_D = R_D + 1/(jωC_D)                 (damping kolu)

H(f) = V_out / V_source                (ABCD 2-port zincirden)
IL_dB = 20·log10 |V_out,filtresiz / V_out,filtreli|

R_in,neg ≈ -V_in² / P_in ,  P_in = P_out / η
K_Z = maks_f |Z_out,filtre(f)| / |Z_in,converter(f)| ,  varsayılan sınır 1/3

G_peak,dB = maks_f 20·log10|H(f)|
A_target,dB = -20·log10|H(f_noise)|
P_R_D = maks_f |I_R_D(f)|²·R_D          (I_R_D = V_node/Z_D, V_node = v_source·H)

Z_CM ≈ DCR + jωL_CM     Z_DM ≈ DCR + jωL_leak`,
      en: `f0 = 1 / (2π√(LC))            Z0 = √(L/C)
Z_L = DCR + jωL   (∥ 1/(jωC_p) if present)
Z_C = ESR + jωESL + 1/(jωC)
Z_D = R_D + 1/(jωC_D)                 (damping branch)

H(f) = V_out / V_source                (from the ABCD 2-port chain)
IL_dB = 20·log10 |V_out,no-filter / V_out,filtered|

R_in,neg ≈ -V_in² / P_in ,  P_in = P_out / η
K_Z = max_f |Z_out,filter(f)| / |Z_in,converter(f)| ,  default limit 1/3

G_peak,dB = max_f 20·log10|H(f)|
A_target,dB = -20·log10|H(f_noise)|
P_R_D = max_f |I_R_D(f)|²·R_D          (I_R_D = V_node/Z_D, V_node = v_source·H)

Z_CM ≈ DCR + jωL_CM     Z_DM ≈ DCR + jωL_leak`,
    }),

    detail: {
      noRounding: t({
        tr: 'Ara değerlerde yuvarlama yapılmaz; yalnızca gösterim yuvarlanır.',
        en: 'Intermediate values are never rounded; only the display is rounded.',
      }),
      toleranceNote: (pctValue) => t({
        tr: `Nominal/min/maks grafiği ${pct(fmt(pctValue * 100, 2))} tek tip bileşen `
          + 'toleransıyla köşe (worst-case) değerlerini karşılaştırır; tam Monte Carlo dağılımı '
          + '(REV2 §16.1) bu araçta uygulanmadı.',
        en: `The nominal/min/max chart compares corner (worst-case) values using a uniform `
          + `${pct(fmt(pctValue * 100, 2))} component tolerance; a full Monte Carlo distribution `
          + '(REV2 §16.1) was not implemented for this tool.',
      }),
    },

    validity: [
      t({
        tr: 'Model ABCD (2-port zincir) tabanlıdır: her topoloji ideal, doğrusal ve '
          + 'zaman-değişmez elemanlarla temsil edilir; parazitik kuplaj, PCB yerleşimi ve '
          + 'radyatif EMI bileşeni kapsam dışıdır.',
        en: 'The model is ABCD (2-port chain) based: each topology is represented with ideal, '
          + 'linear, time-invariant elements; parasitic coupling, PCB layout and the radiated '
          + 'EMI component are out of scope.',
      }),
      t({
        tr: 'Converter, küçük-işaret negatif direnç (R_in,neg ≈ -V_in²/P_in) olarak '
          + 'modellenir; büyük-işaret/geçici davranış ve kontrol döngüsü dinamiği dahil '
          + 'değildir.',
        en: 'The converter is modelled as a small-signal negative resistance '
          + '(R_in,neg ≈ -V_in²/P_in); large-signal/transient behaviour and control-loop '
          + 'dynamics are not included.',
      }),
      t({
        tr: 'K_Z ≤ 1/3 (Middlebrook) bir tasarım marjıdır, mutlak kararlılık garantisi '
          + 'değildir.',
        en: 'K_Z ≤ 1/3 (Middlebrook) is a design margin, not an absolute stability guarantee.',
      }),
      t({
        tr: 'Ortak mod empedansı (Z_CM) parazitik kapasitans etkisini içermez; yalnızca '
          + 'DCR + jωL_CM birinci mertebe yaklaşımıdır.',
        en: 'The common-mode impedance (Z_CM) does not include the parasitic-capacitance '
          + 'effect; it is only a first-order DCR + jωL_CM approximation.',
      }),
      t({
        tr: 'İndüktör RMS/tepe akımı, kondansatör ripple akımı ve ayrı bir DCR kaybı kalemi bu '
          + 'motorda hesaplanmaz; bu araçta gösterilmez.',
        en: 'Inductor RMS/peak current, capacitor ripple current and a separate DCR-loss line '
          + 'item are not computed by this engine; they are not shown in this tool.',
      }),
      t({
        tr: 'Sonuçlar yaklaşık mühendislik tahminidir — kritik tasarımlarda ölçümle doğrulayın.',
        en: 'Results are approximate engineering estimates — verify with measurement for '
          + 'critical designs.',
      }),
    ],

    candidates: {
      heading: t({ tr: 'Damping adayları', en: 'Damping candidates' }),
      undamped: t({ tr: 'Sönümsüz (taban)', en: 'Undamped (baseline)' }),
      add: t({ tr: 'Aday ekle', en: 'Add candidate' }),
      removeAria: (n) => t({ tr: `${n}. adayı sil`, en: `Remove candidate ${n}` }),
      candidateLabel: (n) => t({ tr: `Aday ${n}`, en: `Candidate ${n}` }),
      col: {
        candidate: t({ tr: 'Aday', en: 'Candidate' }),
        rD: t({ tr: 'R_D', en: 'R_D' }),
        cD: t({ tr: 'C_D', en: 'C_D' }),
        gPeak: t({ tr: 'G_peak,dB', en: 'G_peak,dB' }),
        aTarget: t({ tr: 'A_target,dB', en: 'A_target,dB' }),
        pRD: t({ tr: 'P_R_D', en: 'P_R_D' }),
        kZ: t({ tr: 'K_Z', en: 'K_Z' }),
        f3db: t({ tr: 'Gerçekleşen -3 dB frekansı', en: 'Realized -3 dB frequency' }),
        inRegion: t({ tr: 'Uygun bölgede', en: 'In the suitable region' }),
      },
      yes: t({ tr: 'evet', en: 'yes' }),
      no: t({ tr: 'hayır', en: 'no' }),
      dominatedNote: t({
        tr: 'Başka bir aday tarafından domine edildi (üç ana metrikte eşit ya da daha kötü).',
        en: 'Dominated by another candidate (equal or worse on all three main metrics).',
      }),
      noneSuitable: t({
        tr: 'Şu an hiçbir aday dört koşulu birden sağlamıyor.',
        en: 'No candidate currently meets all four conditions.',
      }),
      tableCaption: t({
        tr: 'Sıralama/skor sütunu yoktur; adaylar girilme sırasıyla listelenir. Domine edilen '
          + 'adaylar soluk gösterilir.',
        en: 'There is no ranking/score column; candidates are listed in the order entered. '
          + 'Dominated candidates are shown muted.',
      }),
    },

    metricChart: {
      gPeakTitle: t({ tr: 'G_peak,dB — maksimum gain peaking', en: 'G_peak,dB — maximum gain peaking' }),
      aTargetTitle: t({
        tr: 'A_target,dB — gürültü frekansında attenuation',
        en: 'A_target,dB — attenuation at the noise frequency',
      }),
      pRDTitle: t({ tr: 'P_R_D — damping direnci güç kaybı', en: 'P_R_D — damping resistor power loss' }),
      axisCandidate: t({ tr: 'Aday (girilme sırası)', en: 'Candidate (entry order)' }),
      axisDb: t({ tr: 'dB', en: 'dB' }),
      axisWatt: t({ tr: 'Güç (W)', en: 'Power (W)' }),
      caption: t({
        tr: 'Her nokta bir adaydır; konum yalnızca girilme sırasını gösterir — bir sıralama ya '
          + 'da skor değildir. Üç metrik kasıtlı olarak ayrı grafiklerde gösterilir.',
        en: 'Each point is one candidate; its position only reflects entry order — it is not a '
          + 'ranking or a score. The three metrics are deliberately shown in separate charts.',
      }),
    },

    chart: {
      paramLabel: {
        [CHART_GAIN]: t({ tr: 'Kazanç / Insertion loss', en: 'Gain / insertion loss' }),
        [CHART_ZOUT]: t({ tr: 'Filtre ve converter empedansı', en: 'Filter and converter impedance' }),
        [CHART_COMPARE]: t({ tr: 'Dampingli / dampingsiz karşılaştırma', en: 'Damped / undamped comparison' }),
        [CHART_TOLERANCE]: t({ tr: 'Nominal / min / maks tolerans', en: 'Nominal / min / max tolerance' }),
      },
      axisFreq: t({ tr: 'Frekans (Hz)', en: 'Frequency (Hz)' }),
      axisGainDb: t({ tr: 'Kazanç / IL (dB)', en: 'Gain / IL (dB)' }),
      axisZ: t({ tr: 'Empedans |Z| (Ω)', en: 'Impedance |Z| (Ω)' }),
      axisGain: t({ tr: 'Kazanç H(f) (dB)', en: 'Gain H(f) (dB)' }),
      seriesGain: t({ tr: 'Kazanç |H(f)|', en: 'Gain |H(f)|' }),
      seriesIl: t({ tr: 'Insertion loss', en: 'Insertion loss' }),
      seriesZout: t({ tr: '|Z_out,filtre|', en: '|Z_out,filter|' }),
      zInRefLabel: (v) => t({ tr: `K·|Z_in,converter| — ${fmtRes(v)}`, en: `K·|Z_in,converter| — ${fmtRes(v)}` }),
      seriesUndamped: t({ tr: 'Sönümsüz', en: 'Undamped' }),
      seriesCandidate: (n) => t({ tr: `Aday ${n}`, en: `Candidate ${n}` }),
      seriesNominal: t({ tr: 'Nominal', en: 'Nominal' }),
      seriesWorstMin: t({ tr: 'En kötü — min', en: 'Worst-case — min' }),
      seriesWorstMax: t({ tr: 'En kötü — maks', en: 'Worst-case — max' }),
      caption: {
        [CHART_GAIN]: t({
          tr: 'Sönümsüz filtrenin kazancı ve insertion loss’u — damping karşılaştırması '
            + 'ayrı grafiktedir.',
          en: 'The undamped filter’s gain and insertion loss — the damping comparison is '
            + 'a separate chart.',
        }),
        [CHART_ZOUT]: t({
          tr: 'Sönümsüz filtre çıkış empedansı ve converter’in (frekanstan bağımsız) '
            + 'negatif giriş direncine karşı K sınırı — motor converter empedansını sabit '
            + 'modellediği için ikinci bir sweep yerine referans çizgisi olarak gösterilir.',
          en: 'The undamped filter’s output impedance against the K limit on the '
            + 'converter’s (frequency-independent) negative input resistance — since the '
            + 'engine models the converter impedance as constant, it is shown as a reference '
            + 'line rather than a second sweep.',
        }),
        [CHART_COMPARE]: t({
          tr: 'Sönümsüz eğri ile girilen her damping adayının kazancı üst üste — REV2 §12.11 '
            + '"dampingli ve dampingsiz karşılaştırma" grafiği.',
          en: 'The undamped curve overlaid with the gain of every entered damping candidate — '
            + 'REV2 §12.11’s "damped and undamped comparison" chart.',
        }),
        [CHART_TOLERANCE]: t({
          tr: 'Sönümsüz kazanç; reaktif bileşenler girilen toleransla ± ölçeklenerek nominal / '
            + 'worst-case min / worst-case maks köşeleri karşılaştırılır.',
          en: 'Undamped gain; the reactive components are scaled by ± the entered tolerance to '
            + 'compare the nominal / worst-case min / worst-case max corners.',
        }),
      },
    },

    schematic: {
      title: t({ tr: 'EMC filtre topolojisi', en: 'EMC filter topology' }),
      caption: (topology) => {
        if (topology === TOPOLOGY_PI) {
          return t({
            tr: 'π filtre: giriş ve çıkışta birer şönt kapasitör, aralarında seri endüktör.',
            en: 'π filter: a shunt capacitor at the input and output, with a series inductor between them.',
          })
        }
        if (topology === TOPOLOGY_CM) {
          return t({
            tr: 'Ortak mod choke: iki sarım aynı çekirdek üzerinde, hat-hat kapasitörü '
              + 'differential-mode yolunu köprüler.',
            en: 'Common-mode choke: two windings on the same core, with a line-to-line '
              + 'capacitor bridging the differential-mode path.',
          })
        }
        return t({
          tr: 'LC filtre: seri endüktör, ardından şönt kapasitör; opsiyonel damping kolu '
            + 'kapasitöre paralel gösterilir.',
          en: 'LC filter: a series inductor followed by a shunt capacitor; the optional damping '
            + 'branch is shown in parallel with the capacitor.',
        })
      },
      source: t({ tr: 'kaynak', en: 'source' }),
      load: t({ tr: 'yük', en: 'load' }),
      damping: t({ tr: 'damping (opsiyonel)', en: 'damping (optional)' }),
      winding: t({ tr: 'sarım', en: 'winding' }),
    },

    reasonText: (reason) => {
      switch (reason) {
        case REASON_INVALID:
          return t({
            tr: 'Girilen değer kombinasyonu geçerli değil. Topolojiyi, bileşen değerlerini ve '
              + 'converter çalışma noktasını (V_in, P_out, η) kontrol edin.',
            en: 'The entered combination of values is not valid. Check the topology, the '
              + 'component values and the converter operating point (V_in, P_out, η).',
          })
        case REASON_INCOMPLETE:
        default:
          return t({
            tr: 'Tüm zorunlu alanlara pozitif sayısal değer girin (en az bir damping adayı '
              + 'dahil). Ondalık için nokta veya virgül kullanabilirsiniz (0.25 = 0,25).',
            en: 'Enter a positive numeric value in every required field (including at least '
              + 'one damping candidate). Use a point or a comma for decimals (0.25 = 0,25).',
          })
      }
    },

    // Mühendislik yorumu — motorun `level`/`findings` kavramı olmadığı için
    // (bkz. dosya başı notu) ham `r`den burada kurulur. Kararlar §3.3: hiçbir
    // satır bir adayı "önerilen" diye işaretlemez.
    commentary: (r) => {
      if (!r.ok) return []
      const out = []
      const base = r.candidates[0]
      const userCandidates = r.candidates.length - 1
      const suitableCount = r.candidates.filter((c) => c.meetsAll).length
      const pairText = r.idealPairs
        .map((p) => `f0 ≈ ${fmtHz(p.f0)} (Z0 ≈ ${fmtRes(p.z0)})`)
        .join(', ')

      out.push({
        level: 'ok',
        text: t({
          tr: `${topoName(r.topology)} topolojisi; ${pairText}.`,
          en: `${topoName(r.topology)} topology; ${pairText}.`,
        }),
      })

      if (!base.suitable.gainPeak) {
        out.push({
          level: 'warn',
          text: t({
            tr: `Sönümsüz durumda G_peak,dB = ${fmt(base.gPeakDb, 3)} dB — rezonansta gain `
              + 'peaking var; damping eklenmezse çıkış geriliminde/EMI ölçümünde belirgin bir '
              + 'tepe beklenir.',
            en: `In the undamped state G_peak,dB = ${fmt(base.gPeakDb, 3)} dB — there is gain `
              + 'peaking at resonance; without damping, a clear peak is expected in the output '
              + 'voltage/EMI measurement.',
          }),
        })
      }

      if (userCandidates > 0) {
        out.push({
          level: suitableCount > 0 ? 'ok' : 'warn',
          text: t({
            tr: `Girilen ${userCandidates} damping adayından ${suitableCount} tanesi dört `
              + 'koşulu da (G_peak, attenuation, K_Z, P_R_D) sağlıyor. Uygun adaylar arasında '
              + 'tek bir "en iyi" seçim yapılmaz — tabloyu ve ayrı grafikleri karşılaştırıp '
              + 'nihai seçimi siz yapın.',
            en: `${suitableCount} of the ${userCandidates} entered damping candidates meet all `
              + 'four conditions (G_peak, attenuation, K_Z, P_R_D). No single "best" choice is '
              + 'made among the suitable candidates — compare the table and the separate charts '
              + 'and make the final choice yourself.',
          }),
        })
      }

      out.push({
        level: 'warn',
        text: t({
          tr: `K_Z ≤ ${fmt(r.shared.limits.impedanceRatioMax, 3)} kontrolü Middlebrook `
            + 'yaklaşımından türetilen bir tasarım marjıdır — mutlak kararlılık garantisi '
            + 'değildir.',
          en: `The K_Z ≤ ${fmt(r.shared.limits.impedanceRatioMax, 3)} check is a design margin `
            + 'derived from the Middlebrook approach — it is not an absolute stability '
            + 'guarantee.',
        }),
      })

      if (r.topology === TOPOLOGY_CM) {
        out.push({
          level: 'ok',
          text: t({
            tr: `Gürültü frekansında Z_CM ≈ ${fmtRes(r.cm)}, Z_DM ≈ ${fmtRes(r.dm)} (birinci `
              + 'mertebe DCR + jωL yaklaşımı, parazitik kapasitans dahil değil).',
            en: `At the noise frequency Z_CM ≈ ${fmtRes(r.cm)}, Z_DM ≈ ${fmtRes(r.dm)} `
              + '(a first-order DCR + jωL approximation, parasitic capacitance not included).',
          }),
        })
      }

      out.push({
        level: 'warn',
        text: t({
          tr: 'Model ABCD (2-port zincir) tabanlıdır; converter küçük-işaret negatif direnç '
            + 'olarak temsil edilir, PCB yerleşimi ve radyatif EMI kapsam dışıdır.',
          en: 'The model is ABCD (2-port chain) based; the converter is represented as a '
            + 'small-signal negative resistance, PCB layout and radiated EMI are out of scope.',
        }),
      })

      return out
    },
  }
}
