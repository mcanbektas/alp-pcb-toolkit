// Diferansiyel çift ekranının kullanıcıya görünen metinleri — iki dilli (tr/en).
//
// Hesap katmanı yalnızca kod ve sayı üretir; dile çeviri burada yapılır.
// F2'den itibaren çiftin sayıları alan çözücüden gelir (spec §6.8.1 kapasitans
// matrisi rotası); ampirik kuplaj katsayısı ve onun zorunlu kaynak uyarısı
// (COUPLING_SOURCE_NOTE) söküldü. Çözücü sonuçlarında o not BASILMAZ
// (brif 09 F2); yerine yakınsama (E_Z) ve üretici doğrulaması uyarıları durur.

import { fmt, fmtEng, fmtRes, fmtPct } from '../../../lib/num'
import { pick } from '../../../lib/i18n'
import { commonText } from '../../../data/uiText'
import {
  FS_CONVERGENCE_GOOD_PCT, FS_CONVERGENCE_WARN_PCT,
  FS_ERR_NO_CONVERGENCE, FS_ERR_GRID,
} from '../../../lib/fieldSolver'
import {
  STRUCT_MICROSTRIP, STRUCT_STRIPLINE, FIX_WIDTH, FIX_SPACING, REASON_NO_SOLUTION,
} from './model'

export function getText(lang) {
  const t = (dict) => pick(dict, lang)
  // Yüzde işaretinin yeri dile göre değişir; kalıp uiText.js'te tek yerdedir.
  const { pct } = commonText(lang)

  // Çözücü metin yardımcıları hem `solver` grubunda hem yorumlarda kullanılır;
  // mantık tek kopya kalsın diye burada tanımlıdır
  const solverConvLevel = (pctVal) => {
    if (pctVal < FS_CONVERGENCE_GOOD_PCT) {
      return t({ tr: 'yüksek yakınsama', en: 'high convergence' })
    }
    if (pctVal < FS_CONVERGENCE_WARN_PCT) {
      return t({ tr: 'kabul edilebilir', en: 'acceptable' })
    }
    return t({ tr: 'mesh yetersiz', en: 'insufficient mesh' })
  }
  const solverErrNote = (code) => {
    if (code === FS_ERR_NO_CONVERGENCE) {
      return t({
        tr: 'Alan çözücü bu geometride yakınsamadı; çift sonuçları gösterilemiyor. Tek uçlu kapalı form tabanı referans olarak duruyor.',
        en: 'The field solver did not converge for this geometry; the pair results cannot be shown. The single-ended closed-form base remains as a reference.',
      })
    }
    if (code === FS_ERR_GRID) {
      return t({
        tr: 'Geometri oranları alan çözücünün ızgara sınırını aşıyor; çift sonuçları gösterilemiyor.',
        en: 'The geometry ratios exceed the field solver’s grid limit; the pair results cannot be shown.',
      })
    }
    return t({
      tr: 'Alan çözücü bu girdiyle sonuç veremedi.',
      en: 'The field solver could not produce a result for this input.',
    })
  }

  return {
    pct,
    backlink: t({ tr: '← Kontrollü Empedans', en: '← Controlled Impedance' }),
    title: t({ tr: 'Diferansiyel Çift Empedansı', en: 'Differential Pair Impedance' }),
    intro: t({
      tr: 'Kenar bağlı diferansiyel çift için odd, even, diferansiyel ve common mod '
        + 'empedanslarını 2B alan çözücüyle (Maxwell kapasitans matrisi rotası) hesaplar; hedef '
        + 'diferansiyel empedans için aralık sabitken genişliği kapalı form tohumu + çözücü '
        + 'doğrulamasıyla, genişlik sabitken aralığı çözücü içindeki kök aramayla bulur.',
      en: 'Computes the odd, even, differential and common mode impedances for an edge-coupled '
        + 'differential pair with a 2D field solver (Maxwell capacitance-matrix route); for a '
        + 'target differential impedance it finds the width (spacing fixed) from a closed-form '
        + 'seed with solver verification, and the spacing (width fixed) with a root search '
        + 'inside the solver.',
    }),

    modeGroup: t({ tr: 'Hesap modu', en: 'Calculation mode' }),
    modeAnalysis: t({ tr: 'Analiz — empedansı bul', en: 'Analysis — find impedance' }),
    modeSynthesis: t({ tr: 'Sentez — geometriyi bul', en: 'Synthesis — find geometry' }),

    fixedLabel: {
      [FIX_SPACING]: t({
        tr: 'Aralığı sabitle, genişliği bul',
        en: 'Fix the spacing, find the width',
      }),
      [FIX_WIDTH]: t({
        tr: 'Genişliği sabitle, aralığı bul (çözücüyle)',
        en: 'Fix the width, find the spacing (with the solver)',
      }),
    },

    structLabel: {
      [STRUCT_MICROSTRIP]: t({ tr: 'Kenar kuplajlı microstrip', en: 'Edge-coupled microstrip' }),
      [STRUCT_STRIPLINE]: t({ tr: 'Kenar kuplajlı stripline', en: 'Edge-coupled stripline' }),
    },

    methodNote: t({
      tr: 'Çift sonuçları 2B alan çözücüden gelir: even/odd uyarımlı iki elektrostatik çözüm, '
        + 'kapasiteler enerji rotasından, empedanslar Maxwell kapasitans matrisi bağıntılarıyla. '
        + 'Tek uçlu Z₀ tabanı kapalı formdan yalnız karşılaştırma için gösterilir.',
      en: 'The pair results come from a 2D field solver: two electrostatic solutions with '
        + 'even/odd excitation, capacitances from the energy route, impedances via the Maxwell '
        + 'capacitance-matrix relations. The single-ended Z₀ base from the closed form is shown '
        + 'for comparison only.',
    }),

    // Alan çözücü satırları (brif 09 F2). Çiftin sayıları çözücüden gelir;
    // ilk render'da (hydration kuralı) yalnız kapalı form tabanı vardır.
    solver: {
      pending: t({
        tr: 'Alan çözücü hesaplıyor…',
        en: 'The field solver is computing…',
      }),
      rowConv: t({ tr: 'Yakınsama farkı E_Z', en: 'Convergence difference E_Z' }),
      rowMethod: t({ tr: 'Çözücü yöntemi', en: 'Solver method' }),
      convLevel: solverConvLevel,
      errNote: solverErrNote,
    },

    fields: {
      structure: { label: t({ tr: 'Yapı', en: 'Structure' }) },
      fixed: { label: t({ tr: 'Neyi sabitliyorsunuz', en: 'What are you fixing' }) },
      WFixed: { label: t({ tr: 'Sabit hat genişliği (W)', en: 'Fixed trace width (W)' }) },
      SFixed: { label: t({ tr: 'Sabit hat aralığı (S)', en: 'Fixed trace spacing (S)' }) },
      target: {
        label: t({ tr: 'Hedef diferansiyel empedans', en: 'Target differential impedance' }),
        hint: t({
          tr: 'Tipik hedefler: 90 Ω, 100 Ω, 120 Ω',
          en: 'Typical targets: 90 Ω, 100 Ω, 120 Ω',
        }),
      },
      tolerancePct: { label: t({ tr: 'İzin verilen sapma', en: 'Allowed deviation' }) },
      W: { label: t({ tr: 'Hat genişliği (W)', en: 'Trace width (W)' }) },
      S: {
        label: t({ tr: 'Hatlar arası boşluk (S)', en: 'Trace-to-trace gap (S)' }),
        hint: t({ tr: 'Kenar-kenar mesafe', en: 'Edge-to-edge distance' }),
      },
      SFixedHint: t({
        tr: 'Sentezde aralık sabit tutulur, genişlik aranır',
        en: 'In synthesis the spacing is held fixed and the width is solved',
      }),
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

    bigResultWidth: t({ tr: 'Gereken hat genişliği', en: 'Required trace width' }),
    bigResultSpacing: t({ tr: 'Gereken hat aralığı', en: 'Required trace spacing' }),
    bigResultZdiff: t({ tr: 'Diferansiyel empedans', en: 'Differential impedance' }),
    bigResultPending: t({ tr: 'hesaplanıyor…', en: 'computing…' }),
    targetWord: t({ tr: 'hedef', en: 'target' }),
    singleEndedZ0: t({ tr: 'tek uçlu Z₀', en: 'single-ended Z₀' }),
    solverDeviation: (v) => t({
      tr: `çözücüyle sapma ${v}`,
      en: `solver deviation ${v}`,
    }),

    table: {
      zdiff: t({ tr: 'Diferansiyel empedans (Z_diff)', en: 'Differential impedance (Z_diff)' }),
      zodd: t({ tr: 'Odd mod (Z_odd)', en: 'Odd mode (Z_odd)' }),
      zeven: t({ tr: 'Even mod (Z_even)', en: 'Even mode (Z_even)' }),
      zcommon: t({ tr: 'Common mod (Z_common)', en: 'Common mode (Z_common)' }),
      z0: t({ tr: 'Tek uçlu Z₀ — kapalı form', en: 'Single-ended Z₀ — closed form' }),
      twiceZ0: t({ tr: '2 × Z₀ (kuplajsız referans)', en: '2 × Z₀ (uncoupled reference)' }),
      epsEffOdd: t({ tr: 'Odd mod εeff', en: 'Odd mode εeff' }),
      epsEffEven: t({ tr: 'Even mod εeff', en: 'Even mode εeff' }),
      tpdOdd: t({ tr: 'Odd mod gecikmesi', en: 'Odd mode delay' }),
      tpdEven: t({ tr: 'Even mod gecikmesi', en: 'Even mode delay' }),
      ratio: t({ tr: 'S / H oranı', en: 'S / H ratio' }),
      geometry: t({ tr: 'Hat genişliği / aralık', en: 'Trace width / spacing' }),
    },

    formula: t({
      tr: `Maxwell kapasitans matrisi rotası
  (2B alan çözücü, even/odd uyarım):

  even: simetri düzlemi Neumann
  odd:  simetri düzlemi Dirichlet(0)

  C' = 2U'/V²  (enerji rotası)
  aynı geometri vakumla → C₀

  Z_odd =
    1 / (c·√(C_odd·C₀,odd))
  Z_even =
    1 / (c·√(C_even·C₀,even))

  C₁₁ = (C_even + C_odd) / 2
  C₁₂ = (C_even − C_odd) / 2

Türetilen dönüşümler
  — tanım gereği tam:
    Z_diff = 2·Z_odd
    Z_common = Z_even / 2

Tek uçlu taban — kapalı form:
    microstrip → Hammerstad–Jensen
    stripline → eliptik integral`,
      en: `Maxwell capacitance-matrix route
  (2D field solver, even/odd
  excitation):

  even: symmetry plane Neumann
  odd:  symmetry plane Dirichlet(0)

  C' = 2U'/V²  (energy route)
  same geometry in vacuum → C₀

  Z_odd =
    1 / (c·√(C_odd·C₀,odd))
  Z_even =
    1 / (c·√(C_even·C₀,even))

  C₁₁ = (C_even + C_odd) / 2
  C₁₂ = (C_even − C_odd) / 2

Derived conversions
  — exact by definition:
    Z_diff = 2·Z_odd
    Z_common = Z_even / 2

Single-ended base — closed form:
    microstrip → Hammerstad–Jensen
    stripline → elliptic integral`,
    }),

    detail: {
      model: (singleMethod) => t({
        tr: `Çiftin yöntem etiketi \`field-solver\` (kapasitans matrisi rotası uygulandı); `
          + `tek uçlu tabanınki \`${singleMethod}\`.`,
        en: `The pair’s method label is \`field-solver\` (capacitance-matrix route applied); `
          + `the single-ended base’s is \`${singleMethod}\`.`,
      }),
      matrix: (c11, c12) => t({
        tr: `Kapasitans matrisi (raporlama): C₁₁ = ${c11} pF/m, C₁₂ = ${c12} pF/m.`,
        en: `Capacitance matrix (reporting): C₁₁ = ${c11} pF/m, C₁₂ = ${c12} pF/m.`,
      }),
      mesh: (even, odd) => t({
        tr: `İnce ızgara: even ${even}, odd ${odd}; her mod iki yoğunlukla çözülür.`,
        en: `Fine grid: even ${even}, odd ${odd}; each mode is solved at two densities.`,
      }),
      solved: (solvedBy) => t({
        tr: `Genişlik, kuplajsız kapalı form tohumuyla (hedef Z₀ = Z_diff/2) ${solvedBy} `
          + 'yöntemiyle çözüldü; gerçek Z_diff ve hedeften sapma alan çözücüden okunur.',
        en: `The width was solved from the uncoupled closed-form seed (target Z₀ = Z_diff/2) `
          + `with the ${solvedBy} method; the real Z_diff and the deviation from the target are `
          + 'read from the field solver.',
      }),
      solvedSpacing: (solvedBy, evals) => t({
        tr: `Aralık, kök arama ÇÖZÜCÜNÜN İÇİNDE koşturularak bulundu (${solvedBy}; ${evals} alan `
          + 'çözümü değerlendirmesi, yalnız odd mod, ince yoğunluk). Kapanışta bulunan geometri '
          + 'tam analizden geçirildi — tablodaki sayılar o kapanış analizidir.',
        en: `The spacing was found by running the root search INSIDE the solver (${solvedBy}; `
          + `${evals} field-solution evaluations, odd mode only, fine density). The geometry `
          + 'found was then put through a full analysis — the numbers in the table are that '
          + 'closing analysis.',
      }),
      spacingPending: t({
        tr: 'Aralık aranıyor: kök arama çözücünün içinde koşuyor (her adım bir alan çözümü). '
          + 'Sonuç çözüm bitince gelir.',
        en: 'The spacing is being searched: the root search runs inside the solver (each step is '
          + 'a field solution). The result appears when it finishes.',
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
        rest: t({
          tr: 'Çözücü 2B kesit çözer: geometri hat boyunca değişmez kabul edilir. Solder mask, '
            + 'trapez bakır kesiti ve çoklu dielektrik katmanları modelde yoktur.',
          en: 'The solver solves a 2D cross-section: the geometry is taken as uniform along the '
            + 'line. Solder mask, a trapezoidal copper cross-section and multiple dielectric '
            + 'layers are not in the model.',
        }),
      },
      {
        rest: t({
          tr: 'Çift simetrik kabul edilir (iki hat aynı genişlikte, stripline\'da düşey ortada). '
            + 'Asimetrik diferansiyel stripline ve coplanar diferansiyel çift bu fazda yoktur.',
          en: 'The pair is taken as symmetric (both traces the same width, vertically centred in '
            + 'stripline). Asymmetric differential stripline and coplanar differential pairs are '
            + 'not in this phase.',
        }),
      },
      {
        rest: t({
          tr: 'Dielektrik sabiti frekanstan bağımsız kabul edilir; bakır pürüzlülüğü ve iletken '
            + 'kaybı hesaba girmez. Yüksek hızda üreticinin frekansa bağlı verisi kullanılmalıdır.',
          en: 'The dielectric constant is taken as frequency-independent; copper roughness and '
            + 'conductor loss are not included. At high speed the manufacturer’s '
            + 'frequency-dependent data must be used.',
        }),
      },
      {
        rest: t({
          tr: 'Her sonuç iki ızgara yoğunluğuyla üretilir ve yakınsama farkı E_Z olarak '
            + 'raporlanır; E_Z ≥ %1 iken sonuç uyarıyla gösterilir ve üretim kararına dayanak '
            + 'yapılmamalıdır.',
          en: 'Every result is produced at two grid densities and the convergence difference is '
            + 'reported as E_Z; when E_Z ≥ 1% the result is shown with a warning and must not be '
            + 'the basis of a production decision.',
        }),
      },
      {
        rest: t({
          tr: 'Microstrip çiftinde odd ve even mod hızları farklıdır; çözücü iki modal εeff '
            + 'değerini ayrı ayrı verir. Far-end crosstalk hesabı bu değerleri ister — Crosstalk '
            + 'ekranındaki modal εeff alanlarına buradan taşınabilir.',
          en: 'In a microstrip pair the odd and even mode velocities differ; the solver reports '
            + 'the two modal εeff values separately. The far-end crosstalk calculation needs '
            + 'them — they can be carried into the modal εeff fields on the crosstalk screen.',
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

    schematic: {
      title: t({ tr: 'Diferansiyel çift kesiti', en: 'Differential pair cross-section' }),
      captionMicrostrip: t({
        tr: 'Kenar kuplajlı microstrip — çift üst yüzeyde, altta tek düzlem',
        en: 'Edge-coupled microstrip — pair on the top surface, single plane below',
      }),
      captionStripline: t({
        tr: 'Kenar kuplajlı stripline — çift iki düzlem arasında',
        en: 'Edge-coupled stripline — pair between two planes',
      }),
    },

    reasonText: (reason) => {
      if (reason === REASON_NO_SOLUTION) {
        return t({
          tr: 'Bu yığınla hedef diferansiyel empedansın kapalı form tohumu fiziksel genişlik '
            + 'aralığında bulunamıyor. Hedefi, dielektrik yüksekliğini veya εr değerini '
            + 'değiştirin.',
          en: 'The closed-form seed for the target differential impedance cannot be found within '
            + 'the physical width range with this stack-up. Change the target, the dielectric '
            + 'height or the εr value.',
        })
      }
      return t({
        tr: 'Tüm zorunlu alanlara pozitif sayısal değer girin. Ondalık için nokta veya virgül '
          + 'kullanabilirsiniz (0.25 = 0,25).',
        en: 'Enter a positive numeric value in every required field. Use a point or a comma for '
          + 'decimals (0.25 = 0,25).',
      })
    },

    commentary: (r, solver) => {
      if (!r.ok) return []
      const out = []

      const fs = solver && solver.status === 'done' ? solver.result : null
      const fsOk = fs && !fs.error

      if (fsOk) {
        out.push({
          level: 'ok',
          text: t({
            tr: `Alan çözücü: Z_diff = ${fmtRes(fs.Zdiff, 4)}; odd mod ${fmtRes(fs.Zodd, 4)}, even mod ${fmtRes(fs.Zeven, 4)}, common mod ${fmtRes(fs.Zcommon, 4)}.`,
            en: `Field solver: Z_diff = ${fmtRes(fs.Zdiff, 4)}; odd mode ${fmtRes(fs.Zodd, 4)}, even mode ${fmtRes(fs.Zeven, 4)}, common mode ${fmtRes(fs.Zcommon, 4)}.`,
          }),
        })

        out.push({
          level: 'ok',
          text: t({
            tr: `Z_diff = 2·Z_odd olarak hesaplandı. İki tek uçlu empedansın toplamı (${fmtRes(2 * r.Z0, 4)}) DEĞİLDİR — aradaki fark kuplajdan gelir ve çözücünün kapasitans matrisinden okunur.`,
            en: `Z_diff was computed as 2·Z_odd. It is NOT the sum of two single-ended impedances (${fmtRes(2 * r.Z0, 4)}) — the difference comes from the coupling and is read from the solver’s capacitance matrix.`,
          }),
        })

        const ez = fs.convergence.coarsePct
        out.push({
          level: ez >= FS_CONVERGENCE_WARN_PCT ? 'warn' : 'ok',
          text: ez >= FS_CONVERGENCE_WARN_PCT
            ? t({
              tr: `Yakınsama farkı E_Z = ${pct(fmt(ez, 2))} — mesh bu geometri için yetersiz, sonuç bu hâliyle üretim kararına dayanak yapılmamalıdır.`,
              en: `Convergence difference E_Z = ${pct(fmt(ez, 2))} — the mesh is insufficient for this geometry; do not base a production decision on this result as it stands.`,
            })
            : t({
              tr: `Yakınsama farkı E_Z = ${pct(fmt(ez, 2))} — ${solverConvLevel(ez)} (iki modun kötüsü).`,
              en: `Convergence difference E_Z = ${pct(fmt(ez, 2))} — ${solverConvLevel(ez)} (worse of the two modes).`,
            }),
        })

        if (r.mode === 'syn') {
          const errPct = (100 * (fs.Zdiff - r.target)) / r.target
          const within = Math.abs(errPct) <= r.acceptPct
          const found = r.solvedFor === 'S'
            ? t({ tr: `Aralık ${fmtEng(fs.S, 'm', 4)}`, en: `The spacing was found as ${fmtEng(fs.S, 'm', 4)}` })
            : t({ tr: `Genişlik ${fmtEng(r.W, 'm', 4)}`, en: `The width was found as ${fmtEng(r.W, 'm', 4)}` })
          out.push({
            level: within ? 'ok' : 'danger',
            text: within
              ? t({
                tr: `${found} bulundu; çözücüye göre Z_diff = ${fmtRes(fs.Zdiff, 4)}, hedeften sapma ${pct(fmtPct(errPct))} — kabul sınırı ±${pct(fmt(r.acceptPct, 3))} içinde.`,
                en: `${found}; per the solver Z_diff = ${fmtRes(fs.Zdiff, 4)}, deviating ${pct(fmtPct(errPct))} from the target — within the ±${pct(fmt(r.acceptPct, 3))} acceptance limit.`,
              })
              : t({
                tr: `${found} bulundu ama çözücü Z_diff = ${fmtRes(fs.Zdiff, 4)} ölçüyor; hedeften sapma ${pct(fmtPct(errPct))}, kabul sınırı ±${pct(fmt(r.acceptPct, 3))} DIŞINDA. ${r.solvedFor === 'S' ? 'Hedef bu geometriyle sınırda olabilir; genişliği veya yığını gözden geçirin.' : 'Tohum kuplajı bilmez — genişliği veya aralığı elle ayarlayıp çözücü satırını izleyin.'}`,
                en: `${found}, but the solver measures Z_diff = ${fmtRes(fs.Zdiff, 4)}; the deviation from the target is ${pct(fmtPct(errPct))}, OUTSIDE the ±${pct(fmt(r.acceptPct, 3))} acceptance limit. ${r.solvedFor === 'S' ? 'The target may be marginal for this geometry; review the width or the stack-up.' : 'The seed knows nothing about coupling — adjust the width or spacing manually and watch the solver row.'}`,
              }),
          })
        }

        if (r.structure === STRUCT_MICROSTRIP) {
          out.push({
            level: 'ok',
            text: t({
              tr: `Modal εeff değerleri ayrıştı: odd ${fmt(fs.epsEffOdd, 4)}, even ${fmt(fs.epsEffEven, 4)}. Bu fark mod dönüşümü ve far-end crosstalk üretir; Crosstalk ekranının modal εeff alanlarına bu iki değer girilebilir.`,
              en: `The modal εeff values split: odd ${fmt(fs.epsEffOdd, 4)}, even ${fmt(fs.epsEffEven, 4)}. This difference produces mode conversion and far-end crosstalk; these two values can be entered into the modal εeff fields of the crosstalk screen.`,
            }),
          })
        }
      } else if (fs && fs.error) {
        out.push({ level: 'warn', text: solverErrNote(fs.error) })
      } else {
        out.push({
          level: 'warn',
          text: t({
            tr: 'Alan çözücü henüz hesaplıyor; çift sonuçları çözüm bitince gelir. Ekrandaki tek uçlu Z₀ kapalı form tabanıdır, çiftin sonucu değildir.',
            en: 'The field solver is still computing; the pair results appear when it finishes. The single-ended Z₀ on screen is the closed-form base, not the pair result.',
          }),
        })
      }

      if (r.mode === 'syn' && r.solvedFor === 'W') {
        out.push({
          level: 'ok',
          text: t({
            tr: `Tohum genişlik kuplajsız varsayımla (hedef Z₀ = Z_diff/2) sınırlandırılmış aramayla bulundu (${r.solvedBy}); gerçek Z_diff çözücüden okunur.`,
            en: `The seed width was found with a bounded search under the uncoupled assumption (target Z₀ = Z_diff/2) (${r.solvedBy}); the real Z_diff is read from the solver.`,
          }),
        })
      }

      if (r.mode === 'syn' && r.solvedFor === 'S') {
        out.push({
          level: 'ok',
          text: t({
            tr: 'Aralık sentezi çözücünün İÇİNDE kök aramayla yapılıyor: her adım gerçek bir alan çözümüdür, ampirik ara model yoktur. Arama ince ızgara yoğunluğunda koşar; kapanışta bulunan geometri tam analizden geçirilir.',
            en: 'The spacing synthesis is done with a root search INSIDE the solver: every step is a real field solution, with no empirical intermediate model. The search runs at the fine grid density; the geometry found is then put through a full analysis.',
          }),
        })
      }

      if (!r.singleInRange) {
        out.push({
          level: 'warn',
          text: t({
            tr: 'Tek uçlu kapalı form tabanı kendi güvenilir aralığının dışında; karşılaştırma satırları (Z₀, 2·Z₀) bu bölgede sapar. Çözücü sonucu bundan etkilenmez.',
            en: 'The single-ended closed-form base is outside its reliable range; the comparison rows (Z₀, 2·Z₀) deviate in this region. The solver result is not affected.',
          }),
        })
      }

      out.push({
        level: 'warn',
        text: t({
          tr: 'Empedans sonucu üreticiyle doğrulanmalıdır: gerçek Dk, preslenmiş prepreg kalınlığı, etch compensation ve bakır pürüzlülüğü sonucu değiştirir.',
          en: 'The impedance result must be verified with the fabricator: actual Dk, pressed prepreg thickness, etch compensation and copper roughness change the result.',
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
