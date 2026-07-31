// Tek uçlu empedans ekranının kullanıcıya görünen metinleri — iki dilli (tr/en).
//
// Hesap katmanı yalnızca kod ve sayı üretir; dile çeviri burada yapılır.
// Ekran `getText(lang)` çağırır; koşullu metin üreten yerler (yorum, hata
// nedeni) fonksiyon olarak döner ki mantık tek kopya kalsın.

import { fmt, fmtEng, fmtRes, fmtPct } from '../../../lib/num'
import { pick } from '../../../lib/i18n'
import { METHOD_CLOSED_FORM } from '../../../lib/impedance'
import { commonText } from '../../../data/uiText'
import { STRUCT_MICROSTRIP, STRUCT_STRIPLINE, STRUCT_CPW, REASON_NO_SOLUTION } from './model'

export function getText(lang) {
  const t = (dict) => pick(dict, lang)
  // Yüzde işaretinin yeri dile göre değişir; kalıp uiText.js'te tek yerdedir.
  const { pct } = commonText(lang)

  const structLabel = {
    [STRUCT_MICROSTRIP]: t({ tr: 'Yüzey microstrip', en: 'Surface microstrip' }),
    [STRUCT_STRIPLINE]: t({ tr: 'Simetrik stripline', en: 'Symmetric stripline' }),
    [STRUCT_CPW]: t({
      tr: 'Coplanar waveguide (alt düzlemsiz)',
      en: 'Coplanar waveguide (no bottom plane)',
    }),
  }

  return {
    backlink: t({ tr: '← Kontrollü Empedans', en: '← Controlled Impedance' }),
    title: t({ tr: 'Tek Uçlu Empedans', en: 'Single-Ended Impedance' }),
    intro: t({
      tr: 'Microstrip, stripline ve coplanar waveguide için karakteristik empedansı, efektif '
        + 'dielektrik sabitini ve yayılma gecikmesini hesaplar; hedef empedans için gereken hat '
        + 'genişliğini sınırlandırılmış kök aramayla bulur.',
      en: 'Computes the characteristic impedance, effective dielectric constant and propagation '
        + 'delay for microstrip, stripline and coplanar waveguide; finds the trace width required '
        + 'for a target impedance with a bounded root search.',
    }),

    modeGroup: t({ tr: 'Hesap modu', en: 'Calculation mode' }),
    modeAnalysis: t({ tr: 'Analiz — empedansı bul', en: 'Analysis — find impedance' }),
    modeSynthesis: t({ tr: 'Sentez — genişliği bul', en: 'Synthesis — find width' }),

    structLabel,

    methodNote: t({
      tr: 'Hızlı denklem modu — kapalı form. Üretim için önerilen sonuç alan çözücüden gelmelidir; '
        + 'bu sonuç üretime hazır kabul edilmemelidir.',
      en: 'Quick equation mode — closed form. The result recommended for production must come '
        + 'from a field solver; this result must not be treated as production-ready.',
    }),

    fields: {
      structure: { label: t({ tr: 'Yapı', en: 'Structure' }) },
      W: { label: t({ tr: 'Hat genişliği (W)', en: 'Trace width (W)' }) },
      target: {
        label: t({ tr: 'Hedef empedans', en: 'Target impedance' }),
        hint: t({
          tr: 'Tipik hedefler: 50 Ω tek uçlu, 75 Ω video',
          en: 'Typical targets: 50 Ω single-ended, 75 Ω video',
        }),
      },
      b: {
        label: t({ tr: 'Düzlemler arası mesafe (b)', en: 'Plane-to-plane spacing (b)' }),
        hint: t({ tr: 'Hat tam ortada varsayılır', en: 'The trace is assumed exactly centred' }),
      },
      H: {
        label: t({ tr: 'Dielektrik yüksekliği (H)', en: 'Dielectric height (H)' }),
        hint: t({
          tr: 'Kartın toplam kalınlığı değil — hat ile referans düzlem arası',
          en: 'Not the total board thickness — trace to reference plane distance',
        }),
      },
      S: { label: t({ tr: 'Coplanar boşluk (S)', en: 'Coplanar gap (S)' }) },
      tField: {
        label: t({ tr: 'Bakır kalınlığı (t)', en: 'Copper thickness (t)' }),
        hintMicrostrip: t({
          tr: 'Kalınlık düzeltmesi uygulanır',
          en: 'The thickness correction is applied',
        }),
        hintOther: t({
          tr: 'Bu yapının kapalı formuna dahil değil',
          en: 'Not included in this structure’s closed form',
        }),
      },
      epsR: {
        label: t({ tr: 'Dielektrik sabiti (εr)', en: 'Dielectric constant (εr)' }),
        hint: t({
          tr: 'FR-4 için tipik 4.2–4.5; gerçek değer frekansa göre değişir',
          en: 'Typically 4.2–4.5 for FR-4; the real value varies with frequency',
        }),
      },
      tolCheck: t({ tr: 'Tolerans analizi (worst-case)', en: 'Tolerance analysis (worst-case)' }),
      tolW: { label: t({ tr: 'Genişlik toleransı (±)', en: 'Width tolerance (±)' }) },
      tolH: {
        label: t({ tr: 'Dielektrik kalınlık toleransı (±)', en: 'Dielectric thickness tolerance (±)' }),
      },
      tolT: { label: t({ tr: 'Bakır kalınlığı toleransı (±)', en: 'Copper thickness tolerance (±)' }) },
      tolEps: { label: t({ tr: 'εr toleransı (±)', en: 'εr tolerance (±)' }) },
    },

    // Hata mesajında alan adı olarak görünen etiketler; model.js'e verilir.
    fieldLabels: {
      epsR: t({ tr: 'Dielektrik sabiti (εr)', en: 'Dielectric constant (εr)' }),
      t: t({ tr: 'Bakır kalınlığı (t)', en: 'Copper thickness (t)' }),
      W: t({ tr: 'Hat genişliği (W)', en: 'Trace width (W)' }),
      target: t({ tr: 'Hedef empedans', en: 'Target impedance' }),
      H: t({ tr: 'Dielektrik yüksekliği (H)', en: 'Dielectric height (H)' }),
      b: t({ tr: 'Düzlemler arası mesafe (b)', en: 'Plane-to-plane spacing (b)' }),
      S: t({ tr: 'Coplanar boşluk (S)', en: 'Coplanar gap (S)' }),
      tolW: t({ tr: 'Genişlik toleransı', en: 'Width tolerance' }),
      tolH: t({ tr: 'Dielektrik toleransı', en: 'Dielectric tolerance' }),
      tolT: t({ tr: 'Bakır kalınlığı toleransı', en: 'Copper thickness tolerance' }),
      tolEps: t({ tr: 'εr toleransı', en: 'εr tolerance' }),
    },

    bigResultWidth: t({ tr: 'Gereken hat genişliği', en: 'Required trace width' }),
    bigResultZ0: t({ tr: 'Karakteristik empedans', en: 'Characteristic impedance' }),
    targetWord: t({ tr: 'hedef', en: 'target' }),

    table: {
      tolWindow: t({ tr: 'Z₀ — min · nominal · maks', en: 'Z₀ — min · nominal · max' }),
      z0: t({ tr: 'Karakteristik empedans', en: 'Characteristic impedance' }),
      epsEff: t({ tr: 'Efektif dielektrik sabiti', en: 'Effective dielectric constant' }),
      tpd: t({ tr: 'Yayılma gecikmesi', en: 'Propagation delay' }),
      vp: t({ tr: 'Yayılma hızı', en: 'Propagation velocity' }),
      W: t({ tr: 'Hat genişliği', en: 'Trace width' }),
      height: t({ tr: 'Dielektrik yüksekliği', en: 'Dielectric height' }),
      u: t({ tr: 'W/H oranı', en: 'W/H ratio' }),
      k: t({ tr: 'Eliptik modül k', en: 'Elliptic modulus k' }),
      model: t({ tr: 'Kullanılan yöntem', en: 'Method used' }),
    },

    formula: {
      [STRUCT_MICROSTRIP]: t({
        tr: `u = W / H
η₀ = 376.7303 Ω

a(u) = 1
    + (1/49)·ln[(u⁴+(u/52)²)/
      (u⁴+0.432)]
    + (1/18.7)·ln[1+(u/18.1)³]
b(εr) = 0.564·
    [(εr−0.9)/(εr+3)]^0.053

εeff = (εr+1)/2 +
    (εr−1)/2·(1+10/u)^(−a·b)

f_u = 6 + (2π−6)·
    exp[−(30.666/u)^0.7528]
Z_air = (η₀/2π)·
    ln[f_u/u + √(1+(2/u)²)]
Z₀ = Z_air / √εeff

Kalınlık düzeltmesi (τ = t/H):
  Δu₁ = (τ/π)·
    ln[1 + 4e/(τ·coth²√(6.517u))]
  Δu_r = (Δu₁/2)·[1 + sech√(εr−1)]`,
        en: `u = W / H
η₀ = 376.7303 Ω

a(u) = 1
    + (1/49)·ln[(u⁴+(u/52)²)/
      (u⁴+0.432)]
    + (1/18.7)·ln[1+(u/18.1)³]
b(εr) = 0.564·
    [(εr−0.9)/(εr+3)]^0.053

εeff = (εr+1)/2 +
    (εr−1)/2·(1+10/u)^(−a·b)

f_u = 6 + (2π−6)·
    exp[−(30.666/u)^0.7528]
Z_air = (η₀/2π)·
    ln[f_u/u + √(1+(2/u)²)]
Z₀ = Z_air / √εeff

Thickness correction (τ = t/H):
  Δu₁ = (τ/π)·
    ln[1 + 4e/(τ·coth²√(6.517u))]
  Δu_r = (Δu₁/2)·[1 + sech√(εr−1)]`,
      }),
      [STRUCT_STRIPLINE]: t({
        tr: `k = tanh(πW / 2b)
k' = sech(πW / 2b)

Z₀ = (30π / √εr) · K(k') / K(k)

K(k): tam eliptik integral
  (AGM ile)
εeff = εr (homojen dielektrik)`,
        en: `k = tanh(πW / 2b)
k' = sech(πW / 2b)

Z₀ = (30π / √εr) · K(k') / K(k)

K(k): complete elliptic integral
  (via AGM)
εeff = εr (homogeneous dielectric)`,
      }),
      [STRUCT_CPW]: t({
        tr: `k = W / (W + 2S)
k' = √(1 − k²)

εeff ≈ (εr + 1) / 2
  (kalın substrat)
Z₀ = (30π / √εeff) · K(k') / K(k)

Bu form alt referans düzlemi
OLMAYAN yapı içindir.`,
        en: `k = W / (W + 2S)
k' = √(1 − k²)

εeff ≈ (εr + 1) / 2
  (thick substrate)
Z₀ = (30π / √εeff) · K(k') / K(k)

This form is for a structure
WITHOUT a bottom reference plane.`,
      }),
    },

    detail: {
      model: (model, method) => t({
        tr: `Model: ${model}; yöntem alanı \`${method}\`.`,
        en: `Model: ${model}; method field \`${method}\`.`,
      }),
      ratios: (u, tau) => t({
        tr: `u = W/H = ${u}; τ = t/H = ${tau}.`,
        en: `u = W/H = ${u}; τ = t/H = ${tau}.`,
      }),
      solved: (solvedBy) => t({
        tr: `Genişlik ${solvedBy} yöntemiyle, fiziksel sınırlar içinde çözüldü.`,
        en: `The width was solved with the ${solvedBy} method, within physical bounds.`,
      }),
      rangeCheck: (inRange) => t({
        tr: `Geçerlilik aralığı kontrolü: ${inRange ? 'geometri aralık içinde' : 'geometri aralık dışında'}.`,
        en: `Validity range check: ${inRange ? 'geometry within range' : 'geometry out of range'}.`,
      }),
      noRounding: t({
        tr: 'Ara değerlerde yuvarlama yapılmaz; yalnızca gösterim yuvarlanır.',
        en: 'Intermediate values are never rounded; only the display is rounded.',
      }),
    },

    validity: [
      t({
        tr: 'Kapalı form denklemleri alan çözücü değildir. Üretim toleransları ve karmaşık '
          + 'geometri için iki veya üç boyutlu alan çözümü gerekir.',
        en: 'Closed-form equations are not a field solver. Production tolerances and complex '
          + 'geometry require a two- or three-dimensional field solution.',
      }),
      t({
        tr: 'Solder mask, çoklu dielektrik ve trapez bakır kesiti modelde yoktur.',
        en: 'Solder mask, multiple dielectrics and a trapezoidal copper cross-section are not in '
          + 'the model.',
      }),
      t({
        tr: 'Dielektrik sabiti frekanstan bağımsız kabul edilir. Gerçek Dk frekansla düşer; '
          + 'yüksek hızda üreticinin frekansa bağlı verisi kullanılmalıdır.',
        en: 'The dielectric constant is taken as frequency-independent. Real Dk drops with '
          + 'frequency; at high speed the manufacturer’s frequency-dependent data must be used.',
      }),
      t({
        tr: 'Bakır pürüzlülüğü ve iletken kaybı hesaba girmez.',
        en: 'Copper roughness and conductor loss are not included.',
      }),
      t({
        tr: 'İdeal coplanar waveguide sonucu, altında referans düzlemi bulunan yapı için '
          + 'kullanılmamalıdır.',
        en: 'The ideal coplanar waveguide result must not be used for a structure with a '
          + 'reference plane underneath.',
      }),
      t({
        tr: 'Sonuçlar yaklaşıktır — kritik tasarımlarda üretici verisi ve ölçümle doğrulayın.',
        en: 'Results are approximate — verify against manufacturer data and measurement for '
          + 'critical designs.',
      }),
    ],

    chart: {
      x: t({ tr: 'Hat genişliği W (mm)', en: 'Trace width W (mm)' }),
      y: 'Z₀ (Ω)',
      caption: t({
        tr: 'Genişlik arttıkça empedans düşer. Eğrinin eğimi, üretim genişlik toleransının '
          + 'empedansa ne kadar geçtiğini gösterir — dik bölgede aynı tolerans daha büyük sapma '
          + 'üretir.',
        en: 'Impedance falls as the width grows. The slope of the curve shows how much of the '
          + 'production width tolerance passes through to the impedance — in the steep region the '
          + 'same tolerance produces a larger deviation.',
      }),
    },
    targetLegend: t({ tr: 'hedef empedans', en: 'target impedance' }),
    refTarget: (y) => t({ tr: `hedef ${fmtRes(y, 3)}`, en: `target ${fmtRes(y, 3)}` }),
    operatingPoint: t({ tr: 'çalışma noktası', en: 'operating point' }),

    schematic: {
      title: t({ tr: 'Hat kesiti', en: 'Line cross-section' }),
      caption: {
        [STRUCT_MICROSTRIP]: t({
          tr: 'Yüzey microstrip — tek referans düzlemi altta',
          en: 'Surface microstrip — single reference plane below',
        }),
        [STRUCT_STRIPLINE]: t({
          tr: 'Simetrik stripline — hat iki düzlem arasında ortada',
          en: 'Symmetric stripline — trace centred between two planes',
        }),
        [STRUCT_CPW]: t({
          tr: 'İdeal coplanar waveguide — altında referans düzlem yok',
          en: 'Ideal coplanar waveguide — no reference plane underneath',
        }),
      },
      refPlane: t({ tr: 'referans düzlem', en: 'reference plane' }),
      topPlane: t({ tr: 'üst düzlem', en: 'top plane' }),
      bottomPlane: t({ tr: 'alt düzlem', en: 'bottom plane' }),
      coplanarGround: t({ tr: 'coplanar toprak', en: 'coplanar ground' }),
      noBottomPlane: t({ tr: 'alt düzlem yok', en: 'no bottom plane' }),
    },

    reasonText: (reason) => {
      if (reason === REASON_NO_SOLUTION) {
        return t({
          tr: 'Bu yığınla hedef empedans fiziksel genişlik aralığında elde edilemiyor. Dielektrik '
            + 'yüksekliğini veya εr değerini değiştirin.',
          en: 'The target impedance cannot be reached within the physical width range with this '
            + 'stack-up. Change the dielectric height or the εr value.',
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
          tr: `${structLabel[r.structure]} için Z₀ = ${fmtRes(r.Z0, 4)}, εeff = ${fmt(r.epsEff, 4)}, yayılma gecikmesi ${fmt(r.tpdPsPerMm, 4)} ps/mm.`,
          en: `For ${structLabel[r.structure]}: Z₀ = ${fmtRes(r.Z0, 4)}, εeff = ${fmt(r.epsEff, 4)}, propagation delay ${fmt(r.tpdPsPerMm, 4)} ps/mm.`,
        }),
      })

      if (r.mode === 'syn') {
        out.push({
          level: 'ok',
          text: t({
            tr: `${fmtRes(r.target, 3)} hedefi için gereken genişlik ${fmtEng(r.W, 'm', 4)}; kök sınırlandırılmış aramayla bulundu (${r.solvedBy}).`,
            en: `The width required for the ${fmtRes(r.target, 3)} target is ${fmtEng(r.W, 'm', 4)}; the root was found with a bounded search (${r.solvedBy}).`,
          }),
        })
      }

      out.push({
        level: r.method === METHOD_CLOSED_FORM ? 'warn' : 'ok',
        text: r.method === METHOD_CLOSED_FORM
          ? t({
            tr: 'Sonuç kapalı form denklemlerinden geliyor. Alan çözücü henüz yok; bu değer üretim için doğrulanmış sayılmaz.',
            en: 'The result comes from closed-form equations. There is no field solver yet; this value is not considered verified for production.',
          })
          : t({
            tr: 'Sonuç alan çözücüden geliyor.',
            en: 'The result comes from a field solver.',
          }),
      })

      if (!r.inRange) {
        out.push({
          level: 'danger',
          text: t({
            tr: 'Geometri, kullanılan kapalı formun güvenilir aralığının dışında. Sonuç gösteriliyor ama bu bölgede sapma büyür.',
            en: 'The geometry is outside the reliable range of the closed form used. The result is shown, but the deviation grows in this region.',
          }),
        })
      }

      if (r.structure === STRUCT_MICROSTRIP) {
        out.push({
          level: r.thicknessIncluded ? 'ok' : 'warn',
          text: r.thicknessIncluded
            ? t({
              tr: `Bakır kalınlığı düzeltmesi uygulandı (τ = t/H = ${fmt(r.tau, 4)}); kalınlık empedansı düşürür.`,
              en: `The copper thickness correction was applied (τ = t/H = ${fmt(r.tau, 4)}); thickness lowers the impedance.`,
            })
            : t({
              tr: 'Bakır kalınlığı sıfır girildi. Gerçek bakır empedansı birkaç ohm düşürür; kalınlığı girmek daha gerçekçi sonuç verir.',
              en: 'Copper thickness was entered as zero. Real copper lowers the impedance by a few ohms; entering the thickness gives a more realistic result.',
            }),
        })
        out.push({
          level: 'warn',
          text: t({
            tr: 'Solder mask modelde yoktur. Mask kaplı microstrip empedansı tipik olarak birkaç ohm daha düşüktür.',
            en: 'Solder mask is not in the model. A mask-covered microstrip impedance is typically a few ohms lower.',
          }),
        })
      }

      if (r.structure === STRUCT_STRIPLINE) {
        out.push({
          level: 'warn',
          text: t({
            tr: 'Kapalı form simetrik ve sıfır kalınlıklı hat içindir. Bakır kalınlığı, asimetrik yerleşim ve farklı prepreg/core dielektrikleri sonucu değiştirir — bunlar alan çözücü fazına bırakıldı.',
            en: 'The closed form is for a symmetric, zero-thickness trace. Copper thickness, asymmetric placement and differing prepreg/core dielectrics change the result — these are left to the field-solver phase.',
          }),
        })
      }

      if (r.structure === STRUCT_CPW) {
        out.push({
          level: 'danger',
          text: t({
            tr: 'Bu sonuç ideal coplanar waveguide içindir: alt referans düzlemi YOKTUR. Altında düzlem bulunan yapı (grounded CPW) farklı davranır ve bu sonuç onun yerine kullanılmamalıdır.',
            en: 'This result is for an ideal coplanar waveguide: there is NO bottom reference plane. A structure with a plane underneath (grounded CPW) behaves differently and this result must not be used in its place.',
          }),
        })
      }

      if (r.tolerance) {
        const within = Math.max(Math.abs(r.tolerance.minPct), Math.abs(r.tolerance.maxPct))
        out.push({
          level: within > 10 ? 'danger' : within > 5 ? 'warn' : 'ok',
          text: t({
            tr: `Tolerans sonrası Z₀ ${fmtRes(r.tolerance.min, 4)} … ${fmtRes(r.tolerance.max, 4)} (${pct(fmtPct(r.tolerance.minPct))} / ${pct(fmtPct(r.tolerance.maxPct))}). Kontrollü empedans siparişlerinde tipik hedef ±${pct('10')}'dur.`,
            en: `After tolerances Z₀ spans ${fmtRes(r.tolerance.min, 4)} … ${fmtRes(r.tolerance.max, 4)} (${pct(fmtPct(r.tolerance.minPct))} / ${pct(fmtPct(r.tolerance.maxPct))}). The typical target in controlled impedance orders is ±${pct('10')}.`,
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

      return out
    },
  }
}
