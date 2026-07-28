// Diferansiyel çift ekranının kullanıcıya görünen metinleri — iki dilli (tr/en).
//
// Hesap katmanı yalnızca kod ve sayı üretir; dile çeviri burada yapılır.
// METHOD_NOTE ve COUPLING_SOURCE_NOTE zorunlu uyarılardır (CLAUDE.md, bilinen
// sapma): anlamları iki dilde de birebir korunur, yumuşatılmaz.

import { fmt, fmtEng, fmtRes, fmtPct } from '../../../lib/num'
import { pick } from '../../../lib/i18n'
import { commonText } from '../../../data/uiText'
import { STRUCT_MICROSTRIP, STRUCT_STRIPLINE, FIX_WIDTH, FIX_SPACING, REASON_NO_SOLUTION } from './model'

export function getText(lang) {
  const t = (dict) => pick(dict, lang)
  // Yüzde işaretinin yeri dile göre değişir; kalıp uiText.js'te tek yerdedir.
  const { pct } = commonText(lang)

  return {
    pct,
    backlink: t({ tr: '← Kontrollü Empedans', en: '← Controlled Impedance' }),
    title: t({ tr: 'Diferansiyel Çift Empedansı', en: 'Differential Pair Impedance' }),
    intro: t({
      tr: 'Kenar bağlı diferansiyel çift için odd, even, diferansiyel ve common mod empedanslarını '
        + 'hesaplar; hedef diferansiyel empedans için hat aralığını veya genişliğini bulur.',
      en: 'Computes the odd, even, differential and common mode impedances for an edge-coupled '
        + 'differential pair; finds the trace spacing or width for a target differential impedance.',
    }),

    modeAnalysis: t({ tr: 'Analiz — empedansı bul', en: 'Analysis — find impedance' }),
    modeSynthesis: t({ tr: 'Sentez — geometriyi bul', en: 'Synthesis — find geometry' }),

    structLabel: {
      [STRUCT_MICROSTRIP]: 'Edge-coupled microstrip',
      [STRUCT_STRIPLINE]: 'Edge-coupled stripline',
    },

    fixedLabel: {
      [FIX_WIDTH]: t({
        tr: 'Genişliği sabitle, aralığı bul',
        en: 'Fix the width, find the spacing',
      }),
      [FIX_SPACING]: t({
        tr: 'Aralığı sabitle, genişliği bul',
        en: 'Fix the spacing, find the width',
      }),
    },

    methodNote: t({
      tr: 'Kaba yaklaşım — tek uçlu empedans kapalı formdan geliyor, ama çiftin odd/even ayrımı '
        + 'kaynağı belirsiz ampirik bir kuplaj katsayısından geliyor. Maxwell kapasitans matrisi '
        + 'rotası uygulanmadı. Bu Z_diff ile üretim kararı vermeyin: '
        + 'yığın onayı, panel çıkışı veya empedans kontrol kuponu için alan çözücü sonucu ya da '
        + 'üretici ölçümü gerekir.',
      en: 'Coarse approximation — the single-ended impedance comes from a closed form, but the '
        + 'pair’s odd/even split comes from an empirical coupling coefficient of unclear origin. '
        + 'The Maxwell capacitance-matrix route was not implemented. Do not make production '
        + 'decisions with this Z_diff: stack-up approval, panel release or an impedance control '
        + 'coupon requires a field-solver result or a fabricator measurement.',
    }),

    // Ampirik kuplaj katsayısının nereden geldiği ve neden ayrı etiketlendiği.
    // Sonuç panelinde methodNote'un hemen altında durur.
    couplingSourceNote: t({
      tr: 'Kuplaj katsayısı k_c = 0.48·exp(−0.96·S/H) (stripline: 0.347·exp(−2.9·S/b)) '
        + 'AMPİRİKTİR — sayısal katsayıları ve geçerlilik aralığı doğrulanmış bir kaynağa '
        + 'dayanmıyor. Bu yüzden sonucun yöntem etiketi `empirical-coupling`, kapalı form '
        + 'sonuçlarının taşıdığı `closed-form` değil.',
      en: 'The coupling coefficient k_c = 0.48·exp(−0.96·S/H) (stripline: 0.347·exp(−2.9·S/b)) '
        + 'is EMPIRICAL — its numerical coefficients and validity range are not backed by a '
        + 'verified source. That is why the result’s method label is `empirical-coupling`, not '
        + 'the `closed-form` carried by closed-form results.',
    }),

    fields: {
      structure: { label: t({ tr: 'Yapı', en: 'Structure' }) },
      fixed: { label: t({ tr: 'Neyi sabitliyorsunuz', en: 'What are you fixing' }) },
      target: {
        label: t({ tr: 'Hedef diferansiyel empedans', en: 'Target differential impedance' }),
        hint: t({
          tr: 'Tipik hedefler: 90 Ω, 100 Ω, 120 Ω',
          en: 'Typical targets: 90 Ω, 100 Ω, 120 Ω',
        }),
      },
      tolerancePct: { label: t({ tr: 'İzin verilen sapma', en: 'Allowed deviation' }) },
      W: { label: t({ tr: 'Hat genişliği (W)', en: 'Trace width (W)' }) },
      WFixed: { label: t({ tr: 'Sabit hat genişliği (W)', en: 'Fixed trace width (W)' }) },
      S: {
        label: t({ tr: 'Hatlar arası boşluk (S)', en: 'Trace-to-trace gap (S)' }),
        hint: t({ tr: 'Kenar-kenar mesafe', en: 'Edge-to-edge distance' }),
      },
      SFixed: { label: t({ tr: 'Sabit hat aralığı (S)', en: 'Fixed trace spacing (S)' }) },
      HMicrostrip: t({ tr: 'Dielektrik yüksekliği (H)', en: 'Dielectric height (H)' }),
      HStripline: t({ tr: 'Düzlemler arası mesafe (b)', en: 'Plane-to-plane spacing (b)' }),
      tField: { label: t({ tr: 'Bakır kalınlığı (t)', en: 'Copper thickness (t)' }) },
      epsR: { label: t({ tr: 'Dielektrik sabiti (εr)', en: 'Dielectric constant (εr)' }) },
    },

    // Hata mesajında alan adı olarak görünen etiketler; model.js'e verilir.
    fieldLabels: {
      H: t({ tr: 'Referans düzlem mesafesi (H)', en: 'Reference plane distance (H)' }),
      t: t({ tr: 'Bakır kalınlığı (t)', en: 'Copper thickness (t)' }),
      epsR: t({ tr: 'Dielektrik sabiti (εr)', en: 'Dielectric constant (εr)' }),
      W: t({ tr: 'Hat genişliği (W)', en: 'Trace width (W)' }),
      S: t({ tr: 'Hatlar arası boşluk (S)', en: 'Trace-to-trace gap (S)' }),
      target: t({ tr: 'Hedef diferansiyel empedans', en: 'Target differential impedance' }),
      tolerancePct: t({ tr: 'İzin verilen sapma', en: 'Allowed deviation' }),
    },

    bigResultSpacing: t({ tr: 'Gereken hat aralığı', en: 'Required trace spacing' }),
    bigResultWidth: t({ tr: 'Gereken hat genişliği', en: 'Required trace width' }),
    bigResultZdiff: t({ tr: 'Diferansiyel empedans', en: 'Differential impedance' }),
    targetWord: t({ tr: 'hedef', en: 'target' }),
    singleEndedZ0: t({ tr: 'tek uçlu Z₀', en: 'single-ended Z₀' }),

    table: {
      zdiff: t({ tr: 'Diferansiyel empedans (Z_diff)', en: 'Differential impedance (Z_diff)' }),
      zodd: t({ tr: 'Odd mod (Z_odd)', en: 'Odd mode (Z_odd)' }),
      zeven: t({ tr: 'Even mod (Z_even)', en: 'Even mode (Z_even)' }),
      zcommon: t({ tr: 'Common mod (Z_common)', en: 'Common mode (Z_common)' }),
      z0: t({ tr: 'Tek uçlu empedans (Z₀)', en: 'Single-ended impedance (Z₀)' }),
      twiceZ0: t({ tr: '2 × Z₀ (yanlış yaklaşım)', en: '2 × Z₀ (incorrect approximation)' }),
      coupling: t({ tr: 'Kuplaj katsayısı', en: 'Coupling coefficient' }),
      ratio: t({ tr: 'S / H oranı', en: 'S / H ratio' }),
      epsEff: t({ tr: 'Efektif dielektrik sabiti', en: 'Effective dielectric constant' }),
      tpd: t({ tr: 'Yayılma gecikmesi', en: 'Propagation delay' }),
      geometry: t({ tr: 'Hat genişliği / aralık', en: 'Trace width / spacing' }),
    },

    formula: t({
      tr: `Tek uçlu Z₀ — kapalı form:
    microstrip → Hammerstad–Jensen
    stripline → eliptik integral

Kuplaj katsayısı — AMPİRİK,
  doğrulanmış kaynağa dayanmıyor:
    microstrip:
      k_c = 0.48·exp(−0.96·S/H)
    stripline:
      k_c = 0.347·exp(−2.9·S/b)

    Z_odd = Z₀·(1 − k_c)
    Z_even = Z₀·(1 + k_c)

Maxwell kapasitans matrisi rotası
  — UYGULANMADI:
    C_odd = C₁₁ − C₁₂
    C_even = C₁₁ + C₁₂
    Z_odd =
      1 / (c·√(C_odd·C₀,odd))
    Z_even =
      1 / (c·√(C_even·C₀,even))
    C₁₁, C₁₂ için kapalı form yok;
    kapasitans matrisi alan
    çözücüden çıkar.

Türetilen dönüşümler
  — tanım gereği tam:
    Z_diff = 2·Z_odd
    Z_common = Z_even / 2`,
      en: `Single-ended Z₀ — closed form:
    microstrip → Hammerstad–Jensen
    stripline → elliptic integral

Coupling coefficient — EMPIRICAL,
  not backed by a verified source:
    microstrip:
      k_c = 0.48·exp(−0.96·S/H)
    stripline:
      k_c = 0.347·exp(−2.9·S/b)

    Z_odd = Z₀·(1 − k_c)
    Z_even = Z₀·(1 + k_c)

Maxwell capacitance-matrix route
  — NOT IMPLEMENTED:
    C_odd = C₁₁ − C₁₂
    C_even = C₁₁ + C₁₂
    Z_odd =
      1 / (c·√(C_odd·C₀,odd))
    Z_even =
      1 / (c·√(C_even·C₀,even))
    no closed form for C₁₁, C₁₂;
    the capacitance matrix comes
    from a field solver.

Derived conversions
  — exact by definition:
    Z_diff = 2·Z_odd
    Z_common = Z_even / 2`,
    }),

    detail: {
      model: (model, method, singleMethod) => t({
        tr: `Model: ${model}. Çiftin yöntem etiketi \`${method}\`, tek uçlu formunki `
          + `\`${singleMethod}\` — ikisi aynı güven seviyesinde değildir.`,
        en: `Model: ${model}. The pair’s method label is \`${method}\`, the single-ended form’s `
          + `is \`${singleMethod}\` — the two are not at the same confidence level.`,
      }),
      matrixApplied: t({
        tr: 'Maxwell kapasitans matrisi rotası uygulandı mı: hayır.',
        en: 'Maxwell capacitance-matrix route applied: no.',
      }),
      coupling: (coupling, ratio) => t({
        tr: `Kuplaj katsayısı ${coupling}; S/H = ${ratio}.`,
        en: `Coupling coefficient ${coupling}; S/H = ${ratio}.`,
      }),
      solved: (solvedFor, solvedBy) => t({
        tr: `${solvedFor === 'S' ? 'Aralık' : 'Genişlik'} ${solvedBy} yöntemiyle, fiziksel `
          + 'sınırlar içinde çözüldü.',
        en: `The ${solvedFor === 'S' ? 'spacing' : 'width'} was solved with the ${solvedBy} `
          + 'method, within physical bounds.',
      }),
      infiniteSolutions: t({
        tr: 'Tek bir hedef empedans hem W hem S bilinmiyorsa sonsuz çözüm üretir; bu yüzden '
          + 'biri sabitlenir.',
        en: 'A single target impedance yields infinitely many solutions when both W and S are '
          + 'unknown; that is why one of them is fixed.',
      }),
      noRounding: t({
        tr: 'Ara değerlerde yuvarlama yapılmaz; yalnızca gösterim yuvarlanır.',
        en: 'Intermediate values are never rounded; only the display is rounded.',
      }),
    },

    validity: [
      {
        strong: t({ tr: 'Bilinen sapma:', en: 'Known deviation:' }),
        rest: t({
          tr: ' kuplaj katsayısı ampiriktir. Sayısal katsayıları ve geçerlilik aralığı '
            + 'doğrulanmış bir kaynağa dayanmıyor; sonuç bu nedenle kapalı form sonuçlarıyla aynı '
            + 'kefeye konmaz. Alan çözücü devreye girdiğinde Maxwell kapasitans matrisi rotasıyla '
            + 'değiştirilecektir.',
          en: ' the coupling coefficient is empirical. Its numerical coefficients and validity '
            + 'range are not backed by a verified source; the result is therefore not put on a '
            + 'par with closed-form results. When the field solver arrives it will be replaced '
            + 'by the Maxwell capacitance-matrix route.',
        }),
      },
      {
        rest: t({
          tr: 'Yaklaşım simetrik çift ve zayıf-orta kuplaj içindir; S/H ≥ 0.2 civarında '
            + 'güvenilirdir, çok sıkı kuplajda sapar.',
          en: 'The approximation is for a symmetric pair with weak-to-moderate coupling; it is '
            + 'reliable around S/H ≥ 0.2 and deviates under very tight coupling.',
        }),
      },
      {
        rest: t({
          tr: 'Bu ekranın Z_diff değeriyle üretim kararı verilmemelidir. Yığın onayı, panel '
            + 'çıkışı ve empedans kontrol kuponu için alan çözücü sonucu veya üretici ölçümü '
            + 'gerekir.',
          en: 'No production decision should be made with this screen’s Z_diff value. Stack-up '
            + 'approval, panel release and an impedance control coupon require a field-solver '
            + 'result or a fabricator measurement.',
        }),
      },
      {
        rest: t({
          tr: 'Asimetrik diferansiyel stripline ve coplanar diferansiyel çift bu fazda yoktur.',
          en: 'Asymmetric differential stripline and coplanar differential pairs are not in this '
            + 'phase.',
        }),
      },
      {
        rest: t({
          tr: 'Microstrip\'te odd ve even mod hızları farklıdır; bu fark mod dönüşümü ve far-end '
            + 'crosstalk üretir. Bu ekran tek bir εeff kullandığı için iki modu aynı hızda kabul '
            + 'eder — modal hız farkı, dolayısıyla far-end crosstalk, buradaki sonuçtan '
            + 'türetilemez. Crosstalk ekranı bu değerleri ayrıca ister.',
          en: 'In microstrip the odd and even mode velocities differ; this difference produces '
            + 'mode conversion and far-end crosstalk. Because this screen uses a single εeff, it '
            + 'treats both modes as having the same velocity — the modal velocity difference, '
            + 'and hence far-end crosstalk, cannot be derived from this result. The crosstalk '
            + 'screen asks for these values separately.',
        }),
      },
      {
        rest: t({
          tr: 'Protokol presetleri yalnızca form alanlarını doldurur; sonuç protokole uygunluk '
            + 'iddiası taşımaz.',
          en: 'Protocol presets only fill the form fields; the result carries no claim of '
            + 'protocol compliance.',
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

    chartSpacing: {
      x: t({ tr: 'Hatlar arası boşluk S (mm)', en: 'Trace-to-trace gap S (mm)' }),
      y: t({ tr: 'Empedans (Ω)', en: 'Impedance (Ω)' }),
      caption: t({
        tr: 'Aralık açıldıkça kuplaj zayıflar ve Z_diff 2·Z₀ değerine yaklaşır. Sıkı kuplajda '
          + 'eğri dikleşir; orada üretim aralık toleransı empedansa daha çok geçer.',
        en: 'As the gap widens the coupling weakens and Z_diff approaches 2·Z₀. Under tight '
          + 'coupling the curve steepens; there, the production spacing tolerance passes through '
          + 'to the impedance more strongly.',
      }),
    },
    chartWidth: {
      x: t({ tr: 'Hat genişliği W (mm)', en: 'Trace width W (mm)' }),
      y: t({ tr: 'Empedans (Ω)', en: 'Impedance (Ω)' }),
      caption: t({
        tr: 'Aralık sabitken genişlik arttıkça hem tek uçlu hem diferansiyel empedans düşer.',
        en: 'With the spacing fixed, both the single-ended and the differential impedance fall '
          + 'as the width grows.',
      }),
    },
    targetLegend: t({ tr: 'hedef', en: 'target' }),
    refTarget: (y) => t({ tr: `hedef ${fmtRes(y, 3)}`, en: `target ${fmtRes(y, 3)}` }),
    operatingPoint: t({ tr: 'çalışma noktası', en: 'operating point' }),

    schematic: {
      title: t({ tr: 'Diferansiyel çift kesiti', en: 'Differential pair cross-section' }),
      captionMicrostrip: t({
        tr: 'Edge-coupled microstrip — çift üst yüzeyde, altta tek düzlem',
        en: 'Edge-coupled microstrip — pair on the top surface, single plane below',
      }),
      captionStripline: t({
        tr: 'Edge-coupled stripline — çift iki düzlem arasında',
        en: 'Edge-coupled stripline — pair between two planes',
      }),
    },

    reasonText: (reason) => {
      if (reason === REASON_NO_SOLUTION) {
        return t({
          tr: 'Bu yığın ve sabitlenen değerle hedef diferansiyel empedans elde edilemiyor. '
            + 'Sabitlediğiniz değeri, dielektrik yüksekliğini veya εr değerini değiştirin.',
          en: 'The target differential impedance cannot be reached with this stack-up and the '
            + 'fixed value. Change the value you fixed, the dielectric height or the εr value.',
        })
      }
      return t({
        tr: 'Tüm zorunlu alanlara pozitif sayısal değer girin. Ondalık için nokta veya virgül '
          + 'kullanabilirsiniz (0.25 = 0,25).',
        en: 'Enter a positive numeric value in every required field. Use a point or a comma for '
          + 'decimals (0.25 = 0,25).',
      })
    },

    commentary: (r) => {
      if (!r.ok) return []
      const out = []

      out.push({
        level: 'ok',
        text: t({
          tr: `Z_diff = ${fmtRes(r.Zdiff, 4)}; odd mod ${fmtRes(r.Zodd, 4)}, even mod ${fmtRes(r.Zeven, 4)}, common mod ${fmtRes(r.Zcommon, 4)}.`,
          en: `Z_diff = ${fmtRes(r.Zdiff, 4)}; odd mode ${fmtRes(r.Zodd, 4)}, even mode ${fmtRes(r.Zeven, 4)}, common mode ${fmtRes(r.Zcommon, 4)}.`,
        }),
      })

      out.push({
        level: 'ok',
        text: t({
          tr: `Z_diff = 2·Z_odd olarak hesaplandı. İki tek uçlu empedansın toplamı (${fmtRes(2 * r.Z0, 4)}) DEĞİLDİR — aradaki fark kuplajdan gelir.`,
          en: `Z_diff was computed as 2·Z_odd. It is NOT the sum of two single-ended impedances (${fmtRes(2 * r.Z0, 4)}) — the difference comes from the coupling.`,
        }),
      })

      if (r.mode === 'syn') {
        const within = Math.abs(r.errPct) <= r.acceptPct
        out.push({
          level: within ? 'ok' : 'danger',
          text: within
            ? t({
              tr: `${r.solvedFor === 'S' ? 'Aralık' : 'Genişlik'} ${r.solvedFor === 'S' ? fmtEng(r.S, 'm', 4) : fmtEng(r.W, 'm', 4)} bulundu; hedeften sapma ${pct(fmtPct(r.errPct))}, kabul sınırı ±${pct(fmt(r.acceptPct, 3))} içinde.`,
              en: `The ${r.solvedFor === 'S' ? 'spacing' : 'width'} was found as ${r.solvedFor === 'S' ? fmtEng(r.S, 'm', 4) : fmtEng(r.W, 'm', 4)}; the deviation from the target is ${pct(fmtPct(r.errPct))}, within the ±${pct(fmt(r.acceptPct, 3))} acceptance limit.`,
            })
            : t({
              tr: `Bulunan çözüm hedeften ${pct(fmtPct(r.errPct))} sapıyor; kabul sınırı ±${pct(fmt(r.acceptPct, 3))}.`,
              en: `The solution found deviates from the target by ${pct(fmtPct(r.errPct))}; the acceptance limit is ±${pct(fmt(r.acceptPct, 3))}.`,
            }),
        })
        out.push({
          level: 'ok',
          text: t({
            tr: `Kök sınırlandırılmış aramayla bulundu (${r.solvedBy}); sonuç fiziksel aralık içinde.`,
            en: `The root was found with a bounded search (${r.solvedBy}); the result is within the physical range.`,
          }),
        })
      }

      out.push({
        level: r.coupling > 0.35 ? 'warn' : 'ok',
        text: r.coupling > 0.35
          ? t({
            tr: `Kuplaj katsayısı ${fmt(r.coupling, 4)} — çift sıkı kuplajlı. Bu bölgede ampirik yaklaşım sapar ve aralık toleransı empedansa güçlü biçimde geçer.`,
            en: `The coupling coefficient is ${fmt(r.coupling, 4)} — the pair is tightly coupled. In this region the empirical approximation deviates and the spacing tolerance passes through strongly to the impedance.`,
          })
          : t({
            tr: `Kuplaj katsayısı ${fmt(r.coupling, 4)}; S/H oranı ${fmt(r.ratio, 3)}.`,
            en: `The coupling coefficient is ${fmt(r.coupling, 4)}; the S/H ratio is ${fmt(r.ratio, 3)}.`,
          }),
      })

      if (!r.inRange) {
        out.push({
          level: 'danger',
          text: t({
            tr: 'Geometri ampirik kuplaj yaklaşımının güvenilir aralığının dışında (S/H < 0.2 veya tek uçlu form aralık dışı). Sonuç gösteriliyor ama sapma büyük olabilir.',
            en: 'The geometry is outside the reliable range of the empirical coupling approximation (S/H < 0.2 or the single-ended form is out of range). The result is shown, but the deviation can be large.',
          }),
        })
      }

      out.push({
        level: 'warn',
        text: t({
          tr: 'Bu ekranın odd/even ayrımı kaba bir yaklaşımdır: kuplaj katsayısı ampiriktir ve doğrulanmış bir kaynağa dayanmıyor. Sonuç yığın onayı, panel çıkışı veya empedans kuponu kararı için kullanılmamalıdır.',
          en: 'This screen’s odd/even split is a coarse approximation: the coupling coefficient is empirical and not backed by a verified source. The result must not be used for stack-up approval, panel release or an impedance coupon decision.',
        }),
      })

      out.push({
        level: 'warn',
        text: t({
          tr: 'Odd/even empedanslarının tam çözümü Maxwell kapasitans matrisinden geçer (C_odd = C₁₁ − C₁₂, C_even = C₁₁ + C₁₂). Bu rota uygulanmadı — C₁₁ ve C₁₂ için kapalı form yok, alan çözücü gerekiyor. Alan çözücü devreye girdiğinde bu ekranın hesabı o rotayla değiştirilecek.',
          en: 'The exact solution for the odd/even impedances goes through the Maxwell capacitance matrix (C_odd = C₁₁ − C₁₂, C_even = C₁₁ + C₁₂). That route was not implemented — there is no closed form for C₁₁ and C₁₂, a field solver is required. When the field solver arrives, this screen’s calculation will be replaced by that route.',
        }),
      })

      out.push({
        level: 'ok',
        text: t({
          tr: `Z_diff = 2·Z_odd ve Z_common = Z_even / 2 dönüşümleri tanım gereği tam bağıntılardır; sapma yalnızca Z_odd ve Z_even'in nereden geldiğindedir. Bu sonucun yöntem etiketi bu yüzden \`${r.method}\`, tek uçlu formunki ise \`${r.singleMethod}\`.`,
          en: `The conversions Z_diff = 2·Z_odd and Z_common = Z_even / 2 are exact by definition; the deviation lies only in where Z_odd and Z_even come from. That is why this result’s method label is \`${r.method}\`, while the single-ended form’s is \`${r.singleMethod}\`.`,
        }),
      })

      if (r.structure === STRUCT_MICROSTRIP) {
        out.push({
          level: 'warn',
          text: t({
            tr: 'Microstrip diferansiyel çiftte odd ve even modların yayılma hızları farklıdır. Bu fark far-end crosstalk ve mod dönüşümü üretir; stripline\'da homojen dielektrik yüzünden fark yoktur.',
            en: 'In a microstrip differential pair the odd and even mode propagation velocities differ. This difference produces far-end crosstalk and mode conversion; in stripline there is no difference because of the homogeneous dielectric.',
          }),
        })
      }

      out.push({
        level: 'ok',
        text: t({
          tr: `Yayılma gecikmesi ${fmt(r.tpdPsPerMm, 4)} ps/mm; 1 mm uzunluk farkı ${fmt(r.tpdPsPerMm, 3)} ps skew üretir.`,
          en: `Propagation delay is ${fmt(r.tpdPsPerMm, 4)} ps/mm; a 1 mm length difference produces ${fmt(r.tpdPsPerMm, 3)} ps of skew.`,
        }),
      })

      out.push({
        level: 'warn',
        text: t({
          tr: 'Protokol presetleri yalnızca form alanlarını doldurur. Bu sonuç protokole uygunluk iddiası değildir; ilgili komponent ve protokol dokümanını doğrulayın.',
          en: 'Protocol presets only fill the form fields. This result is not a claim of protocol compliance; verify the relevant component and protocol documents.',
        }),
      })

      return out
    },
  }
}
