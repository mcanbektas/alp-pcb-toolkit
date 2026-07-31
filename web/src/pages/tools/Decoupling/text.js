// Decoupling ağı ekranının kullanıcıya görünen metinleri — iki dilli (tr/en).
//
// Hesap katmanı yalnızca kod ve sayı üretir; dile çeviri burada yapılır.
// Ekran `getText(lang)` çağırır ve çözülmüş metin nesnesini kullanır; koşullu
// metin üreten yerler (bulgu, hata nedeni, grafik açıklaması) fonksiyon olarak
// döner ki mantık tek kopya kalsın, yalnızca dizeler dile göre seçilsin.

import { fmt, fmtEng, fmtRes, fmtVolt } from '../../../lib/num'
import { pick } from '../../../lib/i18n'
import {
  MODE_MIN, MODE_NETWORK, MAX_SERIES,
  REASON_ROWS, REASON_SINGULAR, REASON_INVALID,
} from './model'

// Minimum kapasite grafiğinin x ekseni bu birimde çizilir. Model SI (V) üretir;
// çarpan units.js VOLTAGE tablosundan fromSI ile gelir. Eksen etiketi ve ölçek
// tek yerden — bu sabitten — beslendiği için sessizce ayrışamaz.
const CHART_MIN_X_UNIT = 'mV'

export function getText(lang) {
  const t = (dict) => pick(dict, lang)

  const yesNo = (v) => t({ tr: v ? 'evet' : 'hayır', en: v ? 'yes' : 'no' })
  const reactive = (ind) => t({
    tr: ind ? 'endüktif' : 'kapasitif',
    en: ind ? 'inductive' : 'capacitive',
  })

  return {
    backlink: t({
      tr: '← Güç Bütünlüğü ve Termal',
      en: '← Power Integrity and Thermal',
    }),
    title: t({ tr: 'Decoupling Ağı', en: 'Decoupling Network' }),
    intro: t({
      tr: 'Ani akım talebi için gereken minimum ideal kapasiteyi; paralel kapasitör ağının '
        + 'seçilen frekanstaki empedansını, her kapasitörün kendi rezonans frekansını ve '
        + 'aradaki anti-rezonans tepelerini hesaplar.',
      en: 'Computes the minimum ideal capacitance required for a sudden current demand; the '
        + 'impedance of the parallel capacitor network at the selected frequency, the '
        + 'self-resonant frequency of each capacitor and the anti-resonance peaks between them.',
    }),

    modeGroup: t({ tr: 'Hesap modu', en: 'Calculation mode' }),
    modeLabel: {
      [MODE_MIN]: t({ tr: 'Minimum kapasite', en: 'Minimum capacitance' }),
      [MODE_NETWORK]: t({ tr: 'Kapasitör ağı', en: 'Capacitor network' }),
    },

    fields: {
      dI: {
        label: t({ tr: 'Ani akım değişimi (ΔI)', en: 'Load current step (ΔI)' }),
        hint: t({
          tr: 'Yükün bir anda çektiği akım basamağı',
          en: 'The current step the load draws in an instant',
        }),
      },
      dT: {
        label: t({ tr: 'Geçiş süresi (Δt)', en: 'Transition time (Δt)' }),
        hint: t({
          tr: 'Akım basamağının süresi — yükün bu süre boyunca kapasitörden beslendiği kabul edilir',
          en: 'Duration of the current step — the load is assumed to be fed from the capacitor '
            + 'for this time',
        }),
      },
      dV: {
        label: t({
          tr: 'İzin verilen gerilim değişimi (ΔV)',
          en: 'Allowed voltage excursion (ΔV)',
        }),
        hint: t({
          tr: 'Ray toleransının bu olaya ayrılan payı',
          en: 'The share of the rail tolerance allocated to this event',
        }),
      },
      fEval: {
        label: t({ tr: 'Değerlendirme frekansı', en: 'Evaluation frequency' }),
        hint: t({
          tr: 'Empedansın okunacağı frekans; grafik 1 kHz – 1 GHz aralığını tarar',
          en: 'The frequency at which the impedance is read; the chart sweeps 1 kHz – 1 GHz',
        }),
      },
    },

    // Kapasitör satır listesi — RowList metinleri
    rowList: {
      label: t({ tr: 'Kapasitör satırları', en: 'Capacitor rows' }),
      addLabel: t({ tr: 'Kapasitör ekle', en: 'Add capacitor' }),
      rowLabel: t({ tr: 'Kapasitör', en: 'Capacitor' }),
      hint: t({
        tr: 'ESR sıfır bırakılamaz: kayıpsız kapasitör rezonansta sıfır empedans verir ve sonuç '
          + 'anlamsızlaşır',
        en: 'ESR cannot be left at zero: a lossless capacitor gives zero impedance at resonance '
          + 'and the result becomes meaningless',
      }),
    },

    // RowList sütun başlıkları — yapı model.js'te, dize burada
    capCols: {
      C: 'C',
      ESR: 'ESR',
      ESL: 'ESL',
      n: t({ tr: 'Adet', en: 'Count' }),
    },

    // Hata mesajında alan adı olarak görünen etiketler; model.js'e verilir.
    fieldLabels: {
      dI: t({ tr: 'Ani akım değişimi (ΔI)', en: 'Load current step (ΔI)' }),
      dT: t({ tr: 'Geçiş süresi (Δt)', en: 'Transition time (Δt)' }),
      dV: t({ tr: 'İzin verilen gerilim değişimi (ΔV)', en: 'Allowed voltage excursion (ΔV)' }),
      fEval: t({ tr: 'Değerlendirme frekansı', en: 'Evaluation frequency' }),
      C: t({ tr: 'Kapasite', en: 'Capacitance' }),
      ESR: 'ESR',
      ESL: 'ESL',
      n: t({ tr: 'Adet', en: 'Count' }),
      // readRows satır etiketi: "Kapasitör 2 — ESR" gibi bir ad üretir
      rowLabel: t({ tr: 'Kapasitör', en: 'Capacitor' }),
    },

    formula: {
      [MODE_MIN]: t({
        tr: `Çekilen yük:
  ΔQ = ΔI·Δt
  ΔQ = C·ΔV

Minimum ideal kapasite:
  C_min = ΔI·Δt / ΔV

Bu ifade ESR ve ESL etkisini
İÇERMEZ. Gerçek kapasitörde ESR
anlık gerilim düşümü, ESL ise
akım değişimine direnç üretir;
ikisi de ripple'ı büyütür.`,
        en: `Charge drawn:
  ΔQ = ΔI·Δt
  ΔQ = C·ΔV

Minimum ideal capacitance:
  C_min = ΔI·Δt / ΔV

This expression does NOT include
ESR and ESL. In a real capacitor
ESR produces an instantaneous
voltage drop and ESL resists the
current change; both enlarge
the ripple.`,
      }),

      [MODE_NETWORK]: t({
        tr: `Gerçek kapasitör, seri RLC:
  Z_C = ESR + j(ω·ESL − 1/(ω·C))
  |Z_C| =
    √(ESR² + (ω·ESL − 1/(ω·C))²)

Kendi rezonans frekansı:
  SRF = 1 / (2π·√(ESL·C))
  SRF'de reaktanslar götürür
    → |Z_C| ≈ ESR
  SRF üstünde kapasitör
  endüktiftir

Paralel ağ:
  Z_ağ(ω) = [ Σ 1/Z_i(ω) ]⁻¹
  toplam KOMPLEKS admitans
  üzerinden alınır; anti-rezonans
  tepeleri böyle görünür

N adet aynı kapasitör:
  C_eq = N·C
  ESR_eq = ESR/N
  ESL_eq = ESL/N
  ortak via/dar bağlantı varsa
  ESL 1/N azalmaz`,
        en: `Real capacitor, series RLC:
  Z_C = ESR + j(ω·ESL − 1/(ω·C))
  |Z_C| =
    √(ESR² + (ω·ESL − 1/(ω·C))²)

Self-resonant frequency:
  SRF = 1 / (2π·√(ESL·C))
  at SRF the reactances cancel
    → |Z_C| ≈ ESR
  above SRF the capacitor
  is inductive

Parallel network:
  Z_net(ω) = [ Σ 1/Z_i(ω) ]⁻¹
  taken over the total COMPLEX
  admittance; that is how the
  anti-resonance peaks appear

N identical capacitors:
  C_eq = N·C
  ESR_eq = ESR/N
  ESL_eq = ESL/N
  with a shared via or a narrow
  connection ESL does not
  drop by 1/N`,
      }),
    },

    // Sonuç panelinde .method-note olarak durur — sonucun neyi içermediğini
    // sonucun yanında söyler.
    noteMin: t({
      tr: 'İdeal kapasite — ESR ve ESL etkisini içermez. Başlangıç noktasıdır, '
        + 'kapasitör seçimi değildir.',
      en: 'Ideal capacitance — it does not include the effect of ESR and ESL. It is a starting '
        + 'point, not a capacitor selection.',
    }),
    noteNetwork: t({
      tr: 'Seri RLC modeli yalnızca kapasitörün kendisini tanımlar. Montaj pedi, via ve düzlem '
        + 'yayılma endüktansı bu sonuca DAHİL DEĞİLDİR; ayrıca eklenmeli.',
      en: 'The series RLC model describes only the capacitor itself. Mounting pad, via and plane '
        + 'spreading inductance are NOT INCLUDED in this result; they must be added separately.',
    }),
    noteRowImpedance: t({
      tr: 'Satır empedansı, o satırdaki N kapasitörün birlikte empedansıdır. SRF tekil '
        + 'kapasitörle aynıdır, çünkü C_eq·ESL_eq çarpımı değişmez.',
      en: 'The row impedance is the combined impedance of the N capacitors in that row. The SRF '
        + 'is the same as for a single capacitor, because the C_eq·ESL_eq product does not change.',
    }),

    // Ortak sözcükler — tablo hücrelerinde ve yorumlarda kullanılır
    words: {
      yesNo,
      reactive,
      dash: '—',
      noPeak: t({ tr: 'taramada yok', en: 'none in the sweep' }),
    },

    bigMin: {
      label: t({ tr: 'Minimum ideal kapasite', en: 'Minimum ideal capacitance' }),
    },
    bigNet: {
      label: (f) => t({
        tr: `Ağ empedansı @ ${fmtEng(f, 'Hz', 4)}`,
        en: `Network impedance @ ${fmtEng(f, 'Hz', 4)}`,
      }),
    },

    tableMin: {
      cmin: t({ tr: 'Minimum ideal kapasite (C_min)', en: 'Minimum ideal capacitance (C_min)' }),
      charge: t({ tr: 'Çekilen yük (ΔQ = ΔI·Δt)', en: 'Charge drawn (ΔQ = ΔI·Δt)' }),
      dI: t({ tr: 'Ani akım değişimi (ΔI)', en: 'Load current step (ΔI)' }),
      dT: t({ tr: 'Geçiş süresi (Δt)', en: 'Transition time (Δt)' }),
      dV: t({ tr: 'İzin verilen gerilim değişimi (ΔV)', en: 'Allowed voltage excursion (ΔV)' }),
      includesEsrEsl: t({ tr: 'ESR ve ESL dahil mi', en: 'Are ESR and ESL included' }),
    },

    tableNet: {
      rowCell: (i, it) => t({
        tr: `Satır ${i + 1} — ${fmtEng(it.C, 'F', 3)} × ${fmt(it.count, 3)} adet · `
          + `ESR ${fmtRes(it.ESR, 3)} · ESL ${fmtEng(it.ESL, 'H', 3)}`,
        en: `Row ${i + 1} — ${fmtEng(it.C, 'F', 3)} × ${fmt(it.count, 3)} pcs · `
          + `ESR ${fmtRes(it.ESR, 3)} · ESL ${fmtEng(it.ESL, 'H', 3)}`,
      }),
      bankHeading: t({
        tr: 'Aynı değerli N kapasitör eşdeğeri',
        en: 'Equivalent of N identical capacitors',
      }),
      bankCell: (i, it) => t({
        tr: `Satır ${i + 1} eşdeğeri — N = ${fmt(it.count, 3)} · tekil kapasitör empedansı `
          + `${fmtRes(it.single ? it.single.mag : NaN, 3)}`,
        en: `Row ${i + 1} equivalent — N = ${fmt(it.count, 3)} · single-capacitor impedance `
          + `${fmtRes(it.single ? it.single.mag : NaN, 3)}`,
      }),
      totalHeading: t({ tr: 'Ağ toplamı', en: 'Network total' }),
      mag: t({ tr: 'Ağ empedansı |Z|', en: 'Network impedance |Z|' }),
      re: t({ tr: 'Direnç bileşeni (R)', en: 'Resistive component (R)' }),
      im: t({ tr: 'Reaktans (X)', en: 'Reactance (X)' }),
      count: t({ tr: 'Toplam kapasitör adedi', en: 'Total capacitor count' }),
      aboveCount: t({
        tr: 'Kendi rezonansının üstünde olan satır',
        en: 'Rows above their own resonance',
      }),
      noEslCount: t({ tr: 'ESL\'si sıfır girilen satır', en: 'Rows entered with zero ESL' }),
      noEslSub: t({
        tr: ' · rezonans frekansı tanımsız',
        en: ' · resonant frequency undefined',
      }),
      peak: t({ tr: 'Anti-rezonans tepesi', en: 'Anti-resonance peak' }),
      peakWorstSingle: t({
        tr: 'Tepede en yüksek tekil satır |Z|',
        en: 'Highest single-row |Z| at the peak',
      }),
      peakCompare: (above) => t({
        tr: above ? 'tepe daha yüksek' : 'tepe daha alçak',
        en: above ? 'the peak is higher' : 'the peak is lower',
      }),
      idealSharing: t({
        tr: 'ESL için 1/N ideal paylaşım varsayımı',
        en: 'Ideal 1/N sharing assumption for ESL',
      }),
      mountingIncluded: t({
        tr: 'Montaj, via ve yayılma endüktansı dahil mi',
        en: 'Are mounting, via and spreading inductance included',
      }),
    },

    detail: {
      min: (r) => [
        t({
          tr: `ΔQ = ΔI·Δt = ${fmtEng(r.charge, 'C', 4)}; aynı yük C·ΔV olarak yazılınca `
            + `C_min = ${fmtEng(r.C, 'F', 4)} çıkar.`,
          en: `ΔQ = ΔI·Δt = ${fmtEng(r.charge, 'C', 4)}; writing the same charge as C·ΔV gives `
            + `C_min = ${fmtEng(r.C, 'F', 4)}.`,
        }),
        t({
          tr: `Motorun bildirdiği alan: ESR/ESL dahil = ${yesNo(r.includesEsrEsl)}. Sonuç bu `
            + 'yüzden ideal kapasitörün alt sınırıdır.',
          en: `Field reported by the engine: ESR/ESL included = ${yesNo(r.includesEsrEsl)}. The `
            + 'result is therefore the lower bound of an ideal capacitor.',
        }),
      ],
      network: (r) => [
        t({
          tr: 'Ağ toplamı kompleks admitans üzerinden alınır; büyüklükleri toplamak '
            + 'anti-rezonans tepelerini yok ederdi.',
          en: 'The network total is taken over complex admittance; summing magnitudes would '
            + 'erase the anti-resonance peaks.',
        }),
        t({
          tr: `Değerlendirme frekansı ${fmtEng(r.f, 'Hz', 4)}; grafik taraması 1 kHz – 1 GHz, `
            + 'dekat başına 40 nokta. Tepe konumu bu çözünürlükle sınırlıdır.',
          en: `The evaluation frequency is ${fmtEng(r.f, 'Hz', 4)}; the chart sweeps `
            + '1 kHz – 1 GHz with 40 points per decade. The peak location is limited by this '
            + 'resolution.',
        }),
        t({
          tr: 'SRF tekil kapasitörle N adetli grup için aynıdır: C_eq = N·C ve ESL_eq = ESL/N '
            + 'çarpımı değişmez, dolayısıyla rezonans frekansı kaymaz. Değişen şey empedans '
            + 'seviyesidir.',
          en: 'The SRF is the same for a single capacitor and for a group of N: with C_eq = N·C '
            + 'and ESL_eq = ESL/N the product does not change, so the resonant frequency does '
            + 'not shift. What changes is the impedance level.',
        }),
        t({
          tr: 'Grafiğin y ekseni logaritmiktir; eksen etiketleri ve veri tablosu gerçek '
            + 'empedans değerlerini gösterir.',
          en: 'The y axis of the chart is logarithmic; the axis labels and the data table show '
            + 'the real impedance values.',
        }),
      ],
      noRounding: t({
        tr: 'Ara değerlerde yuvarlama yapılmaz; yalnızca gösterim yuvarlanır.',
        en: 'Intermediate values are never rounded; only the display is rounded.',
      }),
    },

    validity: [
      {
        lead: t({ tr: 'Seri RLC modeli yalnızca ', en: 'The series RLC model models only ' }),
        strong: t({ tr: 'kapasitörün kendisini', en: 'the capacitor itself' }),
        rest: t({
          tr: ' modeller. Bağlantı endüktansı — montaj pedi, via ve düzlem yayılma endüktansı — '
            + 'bu sonuca DAHİL DEĞİLDİR ve ayrıca eklenmelidir; o hesap PDN ekranındadır. Yüksek '
            + 'frekansta baskın terim genellikle kapasitörün kendi ESL\'si değil, bu bağlantıdır.',
          en: '. The connection inductance — mounting pad, via and plane spreading inductance — '
            + 'is NOT INCLUDED in this result and must be added separately; that calculation is '
            + 'on the PDN screen. At high frequency the dominant term is usually not the '
            + 'capacitor’s own ESL but this connection.',
        }),
      },
      {
        rest: t({
          tr: 'Üretici S-parametresi veya ölçülmüş empedans eğrisi bu üç terimli modelden daha '
            + 'doğrudur. ESR ve ESL burada sabit alınır; gerçekte ikisi de frekansa ve sıcaklığa '
            + 'göre değişir.',
          en: 'Manufacturer S-parameters or a measured impedance curve are more accurate than '
            + 'this three-term model. ESR and ESL are taken as constant here; in reality both '
            + 'vary with frequency and temperature.',
        }),
      },
      {
        rest: t({
          tr: 'Nominal kapasite kullanılır. Seramik kapasitörde uygulanan DC gerilim ve sıcaklık '
            + 'gerçek kapasiteyi nominalin altına indirir; bu düşüş modelde yoktur.',
          en: 'The nominal capacitance is used. In a ceramic capacitor the applied DC bias and '
            + 'temperature push the real capacitance below the nominal value; this drop is not '
            + 'in the model.',
        }),
      },
      {
        rest: t({
          tr: 'Her kapasitör için ESR > 0 zorunludur: kayıpsız kapasitör kendi rezonansında '
            + 'sıfır empedans, anti-rezonansta ise sonsuz tepe verir ve sonuç fizik değil '
            + 'yuvarlama gürültüsü olur.',
          en: 'ESR > 0 is mandatory for every capacitor: a lossless capacitor gives zero '
            + 'impedance at its own resonance and an infinite peak at anti-resonance, and the '
            + 'result becomes rounding noise rather than physics.',
        }),
      },
      {
        rest: t({
          tr: 'ESR/N ve ESL/N ölçeklemesi bağımsız ve eşit bağlantı yolları varsayar. Ortak via '
            + 'veya ortak dar bağlantı varsa ESL tam olarak 1/N azalmaz.',
          en: 'The ESR/N and ESL/N scaling assumes independent and equal connection paths. With '
            + 'a shared via or a shared narrow connection ESL does not drop by exactly 1/N.',
        }),
      },
      {
        rest: t({
          tr: 'Düzlem kapasitansı ve VRM empedansı bu ekranda yoktur; toplam PDN eğrisi ve hedef '
            + 'empedans karşılaştırması için PDN ekranı gerekir.',
          en: 'Plane capacitance and VRM impedance are not on this screen; the total PDN curve '
            + 'and the target impedance comparison require the PDN screen.',
        }),
      },
      {
        rest: t({
          tr: 'Decoupling değeri işlemci clock frekansından tek başına seçilmez: ani akım, izin '
            + 'verilen ripple, ESR, ESL ve bağlantı endüktansı birlikte değerlendirilir.',
          en: 'A decoupling value is never chosen from the processor clock frequency alone: the '
            + 'current step, the allowed ripple, ESR, ESL and the connection inductance are '
            + 'evaluated together.',
        }),
      },
      {
        rest: t({
          tr: 'Sonuçlar yaklaşıktır — kritik tasarımlarda üretici verisi ve ölçümle doğrulayın.',
          en: 'Results are approximate — verify against manufacturer data and measurement for '
            + 'critical designs.',
        }),
      },
    ],

    chart: {
      // Minimum kapasite grafiğinin x ekseni bu birimde çizilir; ölçek çevrimini
      // gösterim tarafı aynı sabitle yapar.
      minXUnit: CHART_MIN_X_UNIT,
      minX: t({
        tr: `İzin verilen gerilim değişimi ΔV (${CHART_MIN_X_UNIT})`,
        en: `Allowed voltage excursion ΔV (${CHART_MIN_X_UNIT})`,
      }),
      minY: t({ tr: 'Minimum ideal kapasite C_min', en: 'Minimum ideal capacitance C_min' }),
      minCaption: t({
        tr: 'C_min = ΔI·Δt / ΔV — izin verilen ripple daraldıkça gereken kapasite ters orantılı '
          + 'büyür. Eğri ideal kapasitörü gösterir; gerçek kapasitörde ESR ve ESL bu değeri '
          + 'yeterli olmaktan çıkarabilir.',
        en: 'C_min = ΔI·Δt / ΔV — as the allowed ripple narrows, the required capacitance grows '
          + 'inversely. The curve shows an ideal capacitor; in a real capacitor ESR and ESL can '
          + 'make this value insufficient.',
      }),
      netX: t({ tr: 'Frekans', en: 'Frequency' }),
      netY: t({ tr: '|Z| — logaritmik ölçek', en: '|Z| — logarithmic scale' }),

      seriesNet: t({ tr: 'ağ |Z|', en: 'network |Z|' }),
      seriesRow: (i) => t({ tr: `satır ${i + 1}`, en: `row ${i + 1}` }),
      legendCmin: t({ tr: 'hesaplanan C_min', en: 'computed C_min' }),
      legendPeak: t({ tr: 'anti-rezonans tepesi', en: 'anti-resonance peak' }),
      refCmin: (C) => t({
        tr: `C_min ${fmtEng(C, 'F', 3)}`,
        en: `C_min ${fmtEng(C, 'F', 3)}`,
      }),
      refPeak: (mag) => t({
        tr: `tepe ${fmtRes(mag, 3)}`,
        en: `peak ${fmtRes(mag, 3)}`,
      }),
      markerMin: t({ tr: 'çalışma noktası', en: 'operating point' }),
      markerNet: t({ tr: 'değerlendirme frekansı', en: 'evaluation frequency' }),
    },

    // Grafik açıklaması satır sayısına göre değişir: dörtten fazla kapasitör
    // satırı varsa hangilerinin çizilmediği söylenir.
    //
    // Tepe cümlesi UYDURULMAZ: yalnızca modelin ürettiği peak / peakAbove /
    // peakWorstSingle alanlarından kurulur. Tepe yoksa tepe cümlesi hiç yazılmaz;
    // karşılaştırma yapılamıyorsa (tekil satır empedansı yoksa) karşılaştırma
    // iddiası da yazılmaz.
    netCaption: (hidden, peak, peakAbove, peakWorstSingle) => {
      const base = t({
        tr: 'Ağ toplam empedansı kompleks admitans toplamından gelir; bu yüzden anti-rezonans '
          + 'tepeleri eğride doğal olarak görünür.',
        en: 'The total network impedance comes from the sum of complex admittances; that is why '
          + 'anti-resonance peaks appear naturally on the curve.',
      })

      let p
      if (!peak) {
        p = t({
          tr: ' Tarama aralığında tepe bulunamadı.',
          en: ' No peak was found in the sweep range.',
        })
      } else {
        const head = t({
          tr: ` En yüksek tepe ${fmtEng(peak.f, 'Hz', 3)} civarında, ${fmtRes(peak.mag, 3)}`,
          en: ` The highest peak is around ${fmtEng(peak.f, 'Hz', 3)}, at ${fmtRes(peak.mag, 3)}`,
        })
        if (peakWorstSingle == null) {
          p = head + t({
            tr: '; tekil satır empedansıyla karşılaştırılamadı.',
            en: '; it could not be compared with the single-row impedance.',
          })
        } else if (peakAbove) {
          p = head + t({
            tr: `; bu tepe tekil satırların o frekanstaki empedansından `
              + `(${fmtRes(peakWorstSingle, 3)}) yüksek — o bölgede kapasitör eklemek empedansı `
              + 'düşürmez, yükseltebilir.',
            en: `; this peak is above the impedance of the single rows at that frequency `
              + `(${fmtRes(peakWorstSingle, 3)}) — in that region adding a capacitor does not `
              + 'lower the impedance, it can raise it.',
          })
        } else {
          p = head + t({
            tr: `; bu tepe tekil satır empedanslarının (en yükseği `
              + `${fmtRes(peakWorstSingle, 3)}) altında kaldı.`,
            en: `; this peak stayed below the single-row impedances (the highest being `
              + `${fmtRes(peakWorstSingle, 3)}).`,
          })
        }
      }

      const axis = t({
        tr: ' Y ekseni logaritmiktir; etiketler gerçek empedans değerleridir.',
        en: ' The y axis is logarithmic; the labels are the real impedance values.',
      })
      const h = hidden > 0
        ? t({
          tr: ` Grafikte ilk ${MAX_SERIES} kapasitör satırı çizildi; ${hidden} satır çizilmedi `
            + '(ağ eğrisi hepsini içerir).',
          en: ` The first ${MAX_SERIES} capacitor rows are drawn; ${hidden} row`
            + `${hidden === 1 ? '' : 's'} left undrawn (the network curve includes all of them).`,
        })
        : ''
      return base + p + axis + h
    },

    reasonText: (reason) => {
      if (reason === REASON_SINGULAR) {
        return t({
          tr: 'Her kapasitör satırı için ESR > 0 girin. Kayıpsız kapasitör kendi rezonans '
            + 'frekansında sıfır empedans verir, anti-rezonans tepesi ise sonsuza gider; bu '
            + 'yüzden sonuç üretilmez. Üretici veri sayfasındaki ESR değerini kullanın.',
          en: 'Enter ESR > 0 for every capacitor row. A lossless capacitor gives zero impedance '
            + 'at its own resonant frequency while the anti-resonance peak goes to infinity; no '
            + 'result is produced for that reason. Use the ESR value from the manufacturer data '
            + 'sheet.',
        })
      }
      if (reason === REASON_ROWS) {
        return t({
          tr: 'Kapasitör satırlarındaki kapasite ve adet alanlarına pozitif değer girin; ESR ve '
            + 'ESL negatif olamaz. Ondalık için nokta veya virgül kullanabilirsiniz (0.25 = 0,25).',
          en: 'Enter a positive value in the capacitance and count fields of the capacitor rows; '
            + 'ESR and ESL cannot be negative. Use a point or a comma for decimals (0.25 = 0,25).',
        })
      }
      if (reason === REASON_INVALID) {
        return t({
          tr: 'Girdi hesap motoru tarafından reddedildi: kapasite, süre, gerilim değişimi, '
            + 'frekans ve adet pozitif olmalıdır.',
          en: 'The input was rejected by the calculation engine: capacitance, time, voltage '
            + 'excursion, frequency and count must be positive.',
        })
      }
      return t({
        tr: 'Tüm zorunlu alanlara pozitif sayısal değer girin. Ondalık için nokta veya virgül '
          + 'kullanabilirsiniz (0.25 = 0,25).',
        en: 'Enter a positive numeric value in every required field. Use a point or a comma for '
          + 'decimals (0.25 = 0,25).',
      })
    },

    // Mühendislik yorumu — modelin ürettiği alanlardan cümleye
    commentary: (r) => {
      if (!r.ok) return []
      return r.mode === MODE_MIN ? minNotes(r, t, yesNo) : networkNotes(r, t, yesNo)
    },

    schematic: {
      titleMin: t({ tr: 'İdeal decoupling kapasitörü', en: 'Ideal decoupling capacitor' }),
      titleNet: t({ tr: 'Paralel decoupling ağı', en: 'Parallel decoupling network' }),
      captionMin: t({
        tr: 'Minimum kapasite modeli ideal kapasitördür — ESL ve ESR kesikli, çünkü hesaba girmez',
        en: 'The minimum capacitance model is an ideal capacitor — ESL and ESR are dashed '
          + 'because they do not enter the calculation',
      }),
      captionNet: t({
        tr: 'Her kapasitör seri ESL ve ESR ile modellenir; montaj ve via endüktansı bu modelde '
          + 'yoktur',
        en: 'Every capacitor is modelled with a series ESL and ESR; mounting and via inductance '
          + 'are not in this model',
      }),
      powerPlane: t({ tr: 'güç düzlemi', en: 'power plane' }),
      groundPlane: t({ tr: 'toprak düzlemi', en: 'ground plane' }),
      load: t({ tr: 'yük', en: 'load' }),
    },
  }
}

function minNotes(r, t, yesNo) {
  const out = []

  out.push({
    level: 'ok',
    text: t({
      tr: `Minimum ideal kapasite ${fmtEng(r.C, 'F', 4)}; ani olayda çekilen yük `
        + `ΔQ = ΔI·Δt = ${fmtEng(r.charge, 'C', 4)} ve bu yük ${fmtVolt(r.deltaV)} gerilim `
        + 'değişimiyle karşılanır.',
      en: `The minimum ideal capacitance is ${fmtEng(r.C, 'F', 4)}; the charge drawn during the `
        + `event is ΔQ = ΔI·Δt = ${fmtEng(r.charge, 'C', 4)} and it is supplied within a `
        + `${fmtVolt(r.deltaV)} voltage excursion.`,
    }),
  })

  out.push({
    level: 'warn',
    text: t({
      tr: `Bu değer ESR ve ESL etkisini İÇERMEZ (motorun bildirdiği alan: ESR/ESL dahil = `
        + `${yesNo(r.includesEsrEsl)}). Gerçek kapasitörde ESR akım basamağında anlık bir gerilim `
        + 'düşümü üretir, ESL ise akımın hızlı değişimine direnir; ikisi de gerçek ripple\'ı bu '
        + 'hesabın üstüne çıkarır.',
      en: `This value does NOT include the effect of ESR and ESL (field reported by the engine: `
        + `ESR/ESL included = ${yesNo(r.includesEsrEsl)}). In a real capacitor ESR produces an `
        + 'instantaneous voltage drop at the current step and ESL resists the fast change of '
        + 'current; both push the real ripple above this calculation.',
    }),
  })

  out.push({
    level: 'warn',
    text: t({
      tr: 'C_min bir BAŞLANGIÇ NOKTASIDIR, kapasitör seçimi değildir. Seçim, seçilen kapasitörün '
        + 'kendi ESR/ESL değerleriyle ve bağlantı endüktansıyla birlikte frekans alanında '
        + 'doğrulanmalıdır — kapasitör ağı modu bunun içindir.',
      en: 'C_min is a STARTING POINT, not a capacitor selection. The selection must be verified '
        + 'in the frequency domain together with the chosen capacitor’s own ESR/ESL values and '
        + 'the connection inductance — that is what the capacitor network mode is for.',
    }),
  })

  out.push({
    level: 'warn',
    text: t({
      tr: 'Decoupling değeri işlemci clock frekansından tek başına seçilmez; bu yaygın ve kritik '
        + 'bir tasarım hatasıdır. Ani akım, izin verilen ripple, ESR, ESL ve bağlantı endüktansı '
        + 'birlikte değerlendirilir.',
      en: 'A decoupling value is never chosen from the processor clock frequency alone; this is a '
        + 'common and critical design mistake. The current step, the allowed ripple, ESR, ESL and '
        + 'the connection inductance are evaluated together.',
    }),
  })

  out.push({
    level: 'ok',
    text: t({
      tr: `Geçiş süresi ${fmtEng(r.deltaT, 's', 4)} kısaldıkça gereken kapasite azalır, ancak `
        + 'aynı yükün daha kısa sürede aktarılması gerekir; o bölgede sınırı kapasite değil, '
        + 'bağlantı endüktansı belirler.',
      en: `As the transition time ${fmtEng(r.deltaT, 's', 4)} gets shorter the required `
        + 'capacitance falls, but the same charge must be delivered in less time; in that region '
        + 'the limit is set by the connection inductance, not by the capacitance.',
    }),
  })

  return out
}

function networkNotes(r, t, yesNo) {
  const out = []

  out.push({
    level: 'ok',
    text: t({
      tr: `${fmtEng(r.f, 'Hz', 4)} frekansında ağ empedansı ${fmtRes(r.mag, 4)}; direnç bileşeni `
        + `${fmtRes(r.re, 4)}, reaktans ${fmtRes(r.im, 4)}. Ağda toplam ${fmt(r.count, 4)} `
        + 'kapasitör var.',
      en: `At ${fmtEng(r.f, 'Hz', 4)} the network impedance is ${fmtRes(r.mag, 4)}; the resistive `
        + `component is ${fmtRes(r.re, 4)} and the reactance ${fmtRes(r.im, 4)}. The network `
        + `holds ${fmt(r.count, 4)} capacitors in total.`,
    }),
  })

  r.items.forEach((it, i) => {
    const tag = t({
      tr: `Satır ${i + 1} (${fmtEng(it.C, 'F', 3)} × ${fmt(it.count, 3)})`,
      en: `Row ${i + 1} (${fmtEng(it.C, 'F', 3)} × ${fmt(it.count, 3)})`,
    })

    // ESL alanı zorunludur; boş bırakılan satır zaten reddedilir. Buraya
    // yalnızca kullanıcı ESL'ye açıkça 0 yazdığında düşülür.
    if (it.srf == null) {
      out.push({
        level: 'warn',
        text: t({
          tr: `${tag}: ESL sıfır girildiği için kendi rezonans frekansı tanımsız — ESL'si olmayan `
            + 'ideal kapasitör hiçbir frekansta rezonansa girmez, empedansı frekans arttıkça '
            + 'düşmeye devam eder. Gerçek kapasitörün ESL\'si sıfır olamaz ve kapasitör SRF '
            + 'üstünde endüktif davranır; üretici verisindeki gerçek ESL girilmeden bu satırın '
            + 'yüksek frekans davranışı temsil edilmiş sayılmaz.',
          en: `${tag}: because ESL was entered as zero its self-resonant frequency is undefined — `
            + 'an ideal capacitor without ESL never resonates at any frequency and its impedance '
            + 'keeps falling as frequency rises. A real capacitor cannot have zero ESL and it '
            + 'behaves inductively above SRF; without entering the real ESL from the manufacturer '
            + 'data, the high-frequency behaviour of this row is not represented.',
        }),
      })
      return
    }

    const above = it.single?.aboveSrf
    out.push({
      level: above ? 'warn' : 'ok',
      text: above
        ? t({
          tr: `${tag}: kendi rezonans frekansı ${fmtEng(it.srf, 'Hz', 4)}; değerlendirme `
            + 'frekansı bunun ÜSTÜNDE. Kapasitör bu frekansta ENDÜKTİF davranır — decoupling '
            + `işlevi görmez, empedansı ${fmtRes(it.group?.mag ?? NaN, 4)} olarak ESL'si `
            + 'belirler.',
          en: `${tag}: its self-resonant frequency is ${fmtEng(it.srf, 'Hz', 4)}; the evaluation `
            + 'frequency is ABOVE it. At this frequency the capacitor behaves INDUCTIVELY — it '
            + `does not decouple, and its ESL sets the impedance at `
            + `${fmtRes(it.group?.mag ?? NaN, 4)}.`,
        })
        : t({
          tr: `${tag}: kendi rezonans frekansı ${fmtEng(it.srf, 'Hz', 4)}; değerlendirme `
            + 'frekansı bunun altında, kapasitif bölgede. Bu frekanstaki satır empedansı '
            + `${fmtRes(it.group?.mag ?? NaN, 4)}.`,
          en: `${tag}: its self-resonant frequency is ${fmtEng(it.srf, 'Hz', 4)}; the evaluation `
            + 'frequency is below it, in the capacitive region. The row impedance at this '
            + `frequency is ${fmtRes(it.group?.mag ?? NaN, 4)}.`,
        }),
    })
  })

  if (r.peak) {
    out.push({
      level: 'warn',
      text: t({
        tr: `Anti-rezonans tepesi ${fmtEng(r.peak.f, 'Hz', 4)} civarında: ağ empedansı orada `
          + `${fmtRes(r.peak.mag, 4)} değerine çıkıyor`
          + `${r.peakWorstSingle != null ? `, aynı frekansta en yüksek tekil satır empedansı ise ${fmtRes(r.peakWorstSingle, 4)}` : ''}`
          + '. Farklı değerli kapasitörler paralelken birinin endüktif, diğerinin kapasitif '
          + 'olduğu bölgede paralel rezonans oluşur ve empedans TEPE yapar'
          + `${r.peakAbove ? '; tepe tek tek kapasitörlerin empedansından yüksektir' : ''}`
          + `. Taramada ${fmt(r.peakCount, 3)} tepe bulundu.`,
        en: `The anti-resonance peak is around ${fmtEng(r.peak.f, 'Hz', 4)}: the network `
          + `impedance rises to ${fmtRes(r.peak.mag, 4)} there`
          + `${r.peakWorstSingle != null ? `, while the highest single-row impedance at the same frequency is ${fmtRes(r.peakWorstSingle, 4)}` : ''}`
          + '. When capacitors of different values are in parallel, a parallel resonance forms '
          + 'in the region where one is inductive and the other capacitive, and the impedance '
          + 'PEAKS'
          + `${r.peakAbove ? '; the peak is higher than the impedance of the individual capacitors' : ''}`
          + `. The sweep found ${fmt(r.peakCount, 3)} peaks.`,
      }),
    })
  } else {
    out.push({
      level: 'ok',
      text: t({
        tr: '1 kHz – 1 GHz taramasında anti-rezonans tepesi bulunamadı. Tek tip kapasitörde tepe '
          + 'beklenmez; farklı değerler eklendiğinde aralarındaki bölgede tepe oluşur.',
        en: 'No anti-resonance peak was found in the 1 kHz – 1 GHz sweep. With a single capacitor '
          + 'type no peak is expected; once different values are added, a peak forms in the '
          + 'region between them.',
      }),
    })
  }

  out.push({
    level: r.inductive ? 'warn' : 'ok',
    text: r.inductive
      ? t({
        tr: 'Ağ bu frekansta ENDÜKTİF (reaktans pozitif). Endüktif bölgede paralel eklenen her '
          + 'yeni kapasite yeni bir anti-rezonans tepesi üretebilir; empedansı düşürmesi garanti '
          + 'değildir.',
        en: 'At this frequency the network is INDUCTIVE (positive reactance). In the inductive '
          + 'region every new capacitance added in parallel can produce a new anti-resonance '
          + 'peak; lowering the impedance is not guaranteed.',
      })
      : t({
        tr: 'Ağ bu frekansta kapasitif (reaktans negatif); kapasite eklemek empedansı bu bölgede '
          + 'düşürür.',
        en: 'At this frequency the network is capacitive (negative reactance); adding capacitance '
          + 'lowers the impedance in this region.',
      }),
  })

  out.push({
    level: 'warn',
    text: t({
      tr: 'ESR/N ve ESL/N ölçeklemesi yalnızca kapasitörlerin bağımsız ve eşit bağlantı yolları '
        + 'varsa geçerlidir. Ortak via veya ortak dar bir bağlantı varsa ESL tam olarak 1/N '
        + `azalmaz. Motorun bildirdiği ideal paylaşım varsayımı: ${yesNo(r.idealSharing)} — bu bir `
        + 'varsayım bildirimidir, yerleşimin doğrulaması değildir.',
      en: 'The ESR/N and ESL/N scaling is valid only if the capacitors have independent and equal '
        + 'connection paths. With a shared via or a shared narrow connection ESL does not drop by '
        + `exactly 1/N. Ideal sharing assumption reported by the engine: ${yesNo(r.idealSharing)} `
        + '— this is a declaration of an assumption, not a verification of the layout.',
    }),
  })

  out.push({
    level: 'warn',
    text: t({
      tr: 'Sonuç yalnızca kapasitörlerin kendisini içerir. Montaj pedi, via ve düzlem yayılma '
        + 'endüktansı toplam bağlantı loop endüktansına eklenmelidir; o hesap PDN ekranındadır ve '
        + 'yüksek frekansta baskın terim genellikle odur.',
      en: 'The result covers only the capacitors themselves. Mounting pad, via and plane '
        + 'spreading inductance must be added to the total connection loop inductance; that '
        + 'calculation is on the PDN screen and at high frequency it is usually the dominant term.',
    }),
  })

  out.push({
    level: 'warn',
    text: t({
      tr: 'Decoupling değeri işlemci clock frekansından tek başına seçilmez; bu yaygın ve kritik '
        + 'bir tasarım hatasıdır. Ani akım, izin verilen ripple, ESR, ESL ve bağlantı endüktansı '
        + 'birlikte değerlendirilir.',
      en: 'A decoupling value is never chosen from the processor clock frequency alone; this is a '
        + 'common and critical design mistake. The current step, the allowed ripple, ESR, ESL and '
        + 'the connection inductance are evaluated together.',
    }),
  })

  if (r.aboveCount > 0) {
    out.push({
      level: 'warn',
      text: t({
        tr: `${fmt(r.aboveCount, 3)} satır değerlendirme frekansında kendi rezonans frekansının `
          + 'üstünde. Bu satırlar o frekansta kapasitör gibi değil, endüktans gibi davranır; '
          + 'ihtiyaç duyulan bant için daha küçük değerli ve daha düşük ESL\'li kapasitör gerekir.',
        en: `${fmt(r.aboveCount, 3)} row(s) are above their own resonant frequency at the `
          + 'evaluation frequency. At that frequency these rows behave like an inductance rather '
          + 'than a capacitor; the required band needs capacitors of smaller value and lower ESL.',
      }),
    })
  }

  return out
}
