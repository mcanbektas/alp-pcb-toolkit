// Via özellikleri ekranının kullanıcıya görünen metinleri — iki dilli (tr/en).
//
// Hesap katmanı yalnızca kod ve sayı üretir; dile çeviri burada yapılır.
// Ekran `getText(lang)` çağırır ve çözülmüş metin nesnesini kullanır; koşullu
// metin üreten yerler (yorum, hata nedeni) fonksiyon olarak döner ki mantık
// tek kopya kalsın, yalnızca dizeler dile göre seçilsin.

import { fmt, fmtEng, fmtOhm, fmtAmp, fmtVolt, fmtPow, fmtRes } from '../../../lib/num'
import { pick } from '../../../lib/i18n'
import { commonText } from '../../../data/uiText'
import { REASON_PAD, BASIS_DRILL, BASIS_FINISHED } from './model'

export function getText(lang) {
  const t = (dict) => pick(dict, lang)
  // Yüzde işaretinin yeri dile göre değişir; kalıp uiText.js'te tek yerdedir.
  const { pct } = commonText(lang)

  const basisLabel = {
    [BASIS_DRILL]: t({ tr: 'matkap çapı', en: 'drill diameter' }),
    [BASIS_FINISHED]: t({ tr: 'bitmiş delik çapı', en: 'finished hole diameter' }),
  }

  return {
    backlink: t({ tr: '← Via ve Padstack', en: '← Via and Padstack' }),
    title: t({
      tr: 'Via Özellikleri ve Akım Kapasitesi',
      en: 'Via Properties & Current Capacity',
    }),
    intro: t({
      tr: 'Via barrel kesitini, direncini, gerilim düşümünü ve güç kaybını; gerekli paralel via '
        + 'sayısını, annular ring ile aspect ratio değerlerini ve yaklaşık parazitikleri hesaplar.',
      en: 'Computes the via barrel cross-section, resistance, voltage drop and power loss; the '
        + 'required number of parallel vias, the annular ring and aspect ratio values, and the '
        + 'approximate parasitics.',
    }),

    modeGroup: t({ tr: 'Hesap modu', en: 'Calculation mode' }),
    modeAnalysis: t({ tr: 'Analiz — tek via', en: 'Analysis — single via' }),
    modeSynthesis: t({ tr: 'Sentez — via sayısı bul', en: 'Synthesis — find via count' }),

    fields: {
      Df: { label: t({ tr: 'Bitmiş delik çapı (D_f)', en: 'Finished hole diameter (D_f)' }) },
      tp: {
        label: t({ tr: 'Kaplama kalınlığı (t_p)', en: 'Plating thickness (t_p)' }),
        hint: t({ tr: 'Tipik 20–30 µm', en: 'Typically 20–30 µm' }),
      },
      H: {
        label: t({
          tr: 'Via uzunluğu / kart kalınlığı (H)',
          en: 'Via length / board thickness (H)',
        }),
      },
      I: { label: t({ tr: 'Toplam akım (I)', en: 'Total current (I)' }) },
      T: { label: t({ tr: 'Çalışma sıcaklığı', en: 'Operating temperature' }) },
      VdropMax: {
        label: t({ tr: 'İzin verilen gerilim düşümü', en: 'Allowed voltage drop' }),
      },
      IsingleMax: {
        label: t({ tr: 'Tek via akım sınırı', en: 'Single-via current limit' }),
        hint: t({
          tr: 'Üretici profilinden veya kendi kuralınızdan',
          en: 'From the fab profile or your own rule',
        }),
      },
      Nmin: { label: t({ tr: 'En az via sayısı', en: 'Minimum via count' }) },
      Dpad: { label: t({ tr: 'Pad çapı', en: 'Pad diameter' }) },
      Ddrill: {
        label: t({ tr: 'Matkap çapı', en: 'Drill diameter' }),
        hint: t({
          tr: 'Bitmiş çaptan büyüktür — kaplama deliği daraltır',
          en: 'Larger than the finished diameter — plating narrows the hole',
        }),
      },
      posTol: { label: t({ tr: 'Delik konum toleransı', en: 'Hole position tolerance' }) },
      etchTol: { label: t({ tr: 'Pad aşındırma toleransı', en: 'Pad etch tolerance' }) },
      basis: {
        label: t({ tr: 'Aspect ratio tanımı', en: 'Aspect ratio definition' }),
        drill: t({ tr: 'Matkap çapı üzerinden', en: 'Based on drill diameter' }),
        finished: t({ tr: 'Bitmiş delik çapı üzerinden', en: 'Based on finished hole diameter' }),
      },
      Dantipad: { label: t({ tr: 'Antipad çapı', en: 'Antipad diameter' }) },
      epsR: {
        label: t({ tr: 'Dielektrik sabiti (εr)', en: 'Dielectric constant (εr)' }),
        hint: t({ tr: 'FR-4 için tipik 4.2–4.5', en: 'Typically 4.2–4.5 for FR-4' }),
      },
    },

    // Hata mesajında alan adı olarak görünen etiketler; model.js'e verilir.
    fieldLabels: {
      Df: t({ tr: 'Bitmiş delik çapı (D_f)', en: 'Finished hole diameter (D_f)' }),
      tp: t({ tr: 'Kaplama kalınlığı (t_p)', en: 'Plating thickness (t_p)' }),
      H: t({ tr: 'Via uzunluğu / kart kalınlığı (H)', en: 'Via length / board thickness (H)' }),
      I: t({ tr: 'Toplam akım (I)', en: 'Total current (I)' }),
      T: t({ tr: 'Çalışma sıcaklığı', en: 'Operating temperature' }),
      Dpad: t({ tr: 'Pad çapı', en: 'Pad diameter' }),
      Ddrill: t({ tr: 'Matkap çapı', en: 'Drill diameter' }),
      posTol: t({ tr: 'Delik konum toleransı', en: 'Hole position tolerance' }),
      etchTol: t({ tr: 'Pad aşındırma toleransı', en: 'Pad etch tolerance' }),
      Dantipad: t({ tr: 'Antipad çapı', en: 'Antipad diameter' }),
      epsR: t({ tr: 'Dielektrik sabiti', en: 'Dielectric constant' }),
      VdropMax: t({ tr: 'İzin verilen gerilim düşümü', en: 'Allowed voltage drop' }),
      IsingleMax: t({ tr: 'Tek via akım sınırı', en: 'Single-via current limit' }),
      Nmin: t({ tr: 'En az via sayısı', en: 'Minimum via count' }),
    },

    // Sayı alanlarında görünen adet birimi
    countUnit: t({ tr: 'adet', en: 'pcs' }),
    // Tablo satırlarında sayının ardından gelen adet sözcüğü
    pcsWord: t({ tr: 'adet', en: 'pcs' }),

    sections: {
      padstack: t({ tr: 'Padstack', en: 'Padstack' }),
      parasitics: t({ tr: 'Parazitikler', en: 'Parasitics' }),
      parallelVia: t({ tr: 'Paralel via', en: 'Parallel vias' }),
      approxParasitics: t({ tr: 'Yaklaşık parazitikler', en: 'Approximate parasitics' }),
    },

    bigResult: {
      synthesis: t({ tr: 'Gereken paralel via sayısı', en: 'Required parallel via count' }),
      analysis: t({ tr: 'Tek via direnci', en: 'Single-via resistance' }),
      drop: t({ tr: 'düşüm', en: 'drop' }),
      perVia: t({ tr: 'via başına', en: 'per via' }),
      loss: t({ tr: 'kayıp', en: 'loss' }),
    },

    table: {
      Do: t({ tr: 'Barrel dış çapı', en: 'Barrel outer diameter' }),
      area: t({ tr: 'Barrel kesit alanı', en: 'Barrel cross-section area' }),
      thinApprox: t({ tr: 'ince yaklaşım', en: 'thin-wall approx.' }),
      resistanceAt: (T) => t({
        tr: `Direnç @ ${fmt(T, 3)} °C`,
        en: `Resistance @ ${fmt(T, 3)} °C`,
      }),
      vdrop: t({ tr: 'Gerilim düşümü (tek via)', en: 'Voltage drop (single via)' }),
      ploss: t({ tr: 'Güç kaybı (tek via)', en: 'Power loss (single via)' }),
      density: t({ tr: 'Akım yoğunluğu (tek via)', en: 'Current density (single via)' }),

      fromCurrent: t({ tr: 'Akım kısıtından', en: 'From the current constraint' }),
      fromVoltage: t({ tr: 'Gerilim düşümü kısıtından', en: 'From the voltage-drop constraint' }),
      userMin: t({ tr: 'Kullanıcı alt sınırı', en: 'User lower bound' }),
      deciding: t({ tr: 'Belirleyici sonuç', en: 'Deciding result' }),
      parallelR: t({ tr: 'Paralel direnç', en: 'Parallel resistance' }),
      totalDropLoss: t({ tr: 'Toplam düşüm / kayıp', en: 'Total drop / loss' }),
      perViaCurrent: t({ tr: 'Via başına akım / yoğunluk', en: 'Per-via current / density' }),

      nominalRing: t({ tr: 'Nominal annular ring', en: 'Nominal annular ring' }),
      worstRing: t({ tr: 'Worst-case annular ring', en: 'Worst-case annular ring' }),
      aspect: t({ tr: 'Aspect ratio', en: 'Aspect ratio' }),

      L: t({ tr: 'Tek iletken self-endüktansı', en: 'Single-conductor self-inductance' }),
      C: t({ tr: 'Pad-antipad kapasitesi', en: 'Pad–antipad capacitance' }),
      discZ: t({ tr: 'Süreksizlik empedansı', en: 'Discontinuity impedance' }),
      discDelay: t({ tr: 'Süreksizlik gecikmesi', en: 'Discontinuity delay' }),
    },

    basisLabel,

    detail: {
      ratio: (ratio, errPct) => t({
        tr: `Kaplama / delik oranı ${fmt(ratio, 4)}; ince yaklaşımın sapması ${pct(fmt(errPct, 3))}.`,
        en: `Plating/hole ratio ${fmt(ratio, 4)}; the thin-wall approximation deviates by `
          + `${pct(fmt(errPct, 3))}.`,
      }),
      fullAnnulus: t({
        tr: 'Kesit hesabında tam halka alanı kullanıldı.',
        en: 'The full annulus area was used for the cross-section.',
      }),
      aspectBasis: (basis) => t({
        tr: `Aspect ratio ${basisLabel[basis]} üzerinden hesaplandı.`,
        en: `The aspect ratio was computed from the ${basisLabel[basis]}.`,
      }),
      noRounding: t({
        tr: 'Ara değerlerde yuvarlama yapılmaz; yalnızca gösterim yuvarlanır.',
        en: 'Intermediate values are never rounded; only the display is rounded.',
      }),
    },

    validity: [
      t({
        tr: 'Barrel düzgün kalınlıkta kaplanmış kabul edilir. Gerçekte kaplama delik ortasında '
          + 'incelir; aspect ratio büyüdükçe fark artar.',
        en: 'The barrel is assumed to be plated at uniform thickness. In reality the plating '
          + 'thins at the middle of the hole; the difference grows with the aspect ratio.',
      }),
      t({
        tr: 'Via akım kapasitesi yalnızca DC dirençten belirlenemez; bağlı bakır, termal yapı ve '
          + 'komşu vialar sonucu değiştirir.',
        en: 'Via current capacity cannot be determined from the DC resistance alone; attached '
          + 'copper, the thermal structure and neighbouring vias change the result.',
      }),
      t({
        tr: 'Endüktans izole tek iletken içindir. Dönüş yolu, referans düzlemler, antipad ve via '
          + 'stub etkisi modelde yoktur; belirleyici olan loop endüktansıdır.',
        en: 'The inductance is for an isolated single conductor. Return path, reference planes, '
          + 'antipad and via stub effects are not in the model; the deciding quantity is the '
          + 'loop inductance.',
      }),
      t({
        tr: 'Kapasite denklemi yalnızca basit dairesel pad-antipad yapısı içindir. Bölünmüş '
          + 'düzlem, blind/buried via, via-in-pad ve çok yüksek frekansta kullanılmamalıdır.',
        en: 'The capacitance equation is only for a simple circular pad–antipad structure. It '
          + 'must not be used with split planes, blind/buried vias, via-in-pad, or at very '
          + 'high frequency.',
      }),
      t({
        tr: 'Üretilebilirlik sınırı (maksimum aspect ratio) sabit değildir; üretici profilinden '
          + 'gelmelidir.',
        en: 'The manufacturability limit (maximum aspect ratio) is not fixed; it must come from '
          + 'the fab profile.',
      }),
      t({
        tr: 'Sonuçlar yaklaşıktır — kritik tasarımlarda üretici verisi ve ölçümle doğrulayın.',
        en: 'Results are approximate — verify against manufacturer data and measurement for '
          + 'critical designs.',
      }),
    ],

    // Formül blokları — başlık + metin. Matematik aynen, Türkçe sözcükler çevrilir.
    formulas: {
      geometry: {
        title: t({ tr: 'Geometri ve kesit', en: 'Geometry and cross-section' }),
        body: t({
          tr: `D_o = D_f + 2·t_p
A = π/4·(D_o² − D_f²) = π·t_p·(D_f + t_p)

İnce yaklaşım:  A ≈ π·D_f·t_p   (π·t_p² kadar eksik)

R = ρ(T)·H / A        J = I / A
V = I·R               P = I²·R`,
          en: `D_o = D_f + 2·t_p
A = π/4·(D_o² − D_f²) = π·t_p·(D_f + t_p)

Thin-wall approximation:  A ≈ π·D_f·t_p   (short by π·t_p²)

R = ρ(T)·H / A        J = I / A
V = I·R               P = I²·R`,
        }),
      },
      parallel: {
        title: t({ tr: 'Paralel via sayısı', en: 'Parallel via count' }),
        body: t({
          tr: `N_I = ⌈I / I_tek⌉
N_V = ⌈I·R / V_maks⌉
N   = max(N_I, N_V, N_kullanıcı)`,
          en: `N_I = ⌈I / I_single⌉
N_V = ⌈I·R / V_max⌉
N   = max(N_I, N_V, N_user)`,
        }),
      },
      ring: {
        title: t({
          tr: 'Annular ring ve aspect ratio',
          en: 'Annular ring and aspect ratio',
        }),
        body: t({
          tr: `A_R nominal     = (D_pad − D_matkap) / 2
A_R worst-case  = nominal − T_konum − T_aşındırma

AR = H / D`,
          en: `A_R nominal     = (D_pad − D_drill) / 2
A_R worst-case  = nominal − T_position − T_etch

AR = H / D`,
        }),
      },
      parasitics: {
        title: t({ tr: 'Parazitik yaklaşımlar', en: 'Parasitic approximations' }),
        body: t({
          tr: `L[nH] ≈ 0.2·H[mm]·[ln(4H/D) + 1]

C[pF] ≈ 0.0555·ε_r·H·D_pad / (D_antipad − D_pad)`,
          en: `L[nH] ≈ 0.2·H[mm]·[ln(4H/D) + 1]

C[pF] ≈ 0.0555·ε_r·H·D_pad / (D_antipad − D_pad)`,
        }),
      },
    },

    chart: {
      x: t({ tr: 'Paralel via sayısı', en: 'Parallel via count' }),
      y: t({ tr: 'Gerilim düşümü (V)', en: 'Voltage drop (V)' }),
      caption: t({
        tr: 'Paralel via sayısı arttıkça düşüm 1/n ile azalır; ilk birkaç via en çok kazancı '
          + 'sağlar. Referans çizgi izin verilen düşümdür.',
        en: 'As the number of parallel vias grows the drop falls as 1/n; the first few vias '
          + 'give the largest gain. The reference line is the allowed drop.',
      }),
      seriesDrop: t({ tr: 'gerilim düşümü', en: 'voltage drop' }),
      allowedDrop: t({ tr: 'izin verilen düşüm', en: 'allowed drop' }),
      refLimit: (y) => t({
        tr: `sınır ${fmtVolt(y)}`,
        en: `limit ${fmtVolt(y)}`,
      }),
    },

    schematic: {
      title: t({ tr: 'Via kesiti', en: 'Via cross-section' }),
      caption: t({
        tr: 'Kaplanmış delik kesiti — akım yalnızca duvar bakırından geçer',
        en: 'Plated hole cross-section — current flows only through the wall copper',
      }),
      barrelArea: t({ tr: 'barrel kesiti', en: 'barrel area' }),
      // İki dilde de aynı ödünç sözcükler; yine de schematic.jsx'te çıplak dize
      // bırakılmaz. Yazı genişliği aynı kaldığı için üstteki etiket şeridinde
      // iki yazı arasındaki 12 px açıklık dile göre değişmez.
      pad: t({ tr: 'pad', en: 'pad' }),
      antipad: t({ tr: 'antipad', en: 'antipad' }),
    },

    reasonText: (reason) => {
      if (reason === REASON_PAD) {
        return t({
          tr: 'Padstack geometrisi tutarsız: pad çapı matkap çapından, antipad çapı da pad '
            + 'çapından büyük olmalı.',
          en: 'The padstack geometry is inconsistent: the pad diameter must exceed the drill '
            + 'diameter, and the antipad diameter must exceed the pad diameter.',
        })
      }
      return t({
        tr: 'Tüm zorunlu alanlara pozitif sayısal değer girin. Ondalık için nokta veya virgül '
          + 'kullanabilirsiniz (0.25 = 0,25).',
        en: 'Enter a positive numeric value in every required field. Use a point or a comma '
          + 'for decimals (0.25 = 0,25).',
      })
    },

    commentary: (r) => {
      if (!r.ok) return []
      const out = []

      out.push({
        level: 'ok',
        text: t({
          tr: `Barrel kesiti ${fmt(r.area * 1e6, 4)} mm²; ${fmt(r.T, 3)} °C'de tek via direnci ${fmtOhm(r.R)}.`,
          en: `Barrel cross-section ${fmt(r.area * 1e6, 4)} mm²; the single-via resistance at ${fmt(r.T, 3)} °C is ${fmtOhm(r.R)}.`,
        }),
      })

      out.push({
        level: Math.abs(r.thinErrorPct) > 10 ? 'warn' : 'ok',
        text: Math.abs(r.thinErrorPct) > 10
          ? t({
            tr: `Kaplama kalınlığı delik çapının ${pct(fmt(r.ratio * 100, 3))}'i. Bu oranda ince kaplama yaklaşımı alanı ${pct(fmt(Math.abs(r.thinErrorPct), 3))} eksik gösterir; hesapta tam halka alanı kullanıldı.`,
            en: `The plating thickness is ${pct(fmt(r.ratio * 100, 3))} of the hole diameter. At this ratio the thin-wall approximation understates the area by ${pct(fmt(Math.abs(r.thinErrorPct), 3))}; the full annulus area was used in the calculation.`,
          })
          : t({
            tr: `İnce kaplama yaklaşımı bu geometride ${pct(fmt(Math.abs(r.thinErrorPct), 3))} sapıyor; hesapta yine de tam halka alanı kullanıldı.`,
            en: `The thin-wall approximation deviates by ${pct(fmt(Math.abs(r.thinErrorPct), 3))} for this geometry; the full annulus area was used anyway.`,
          }),
      })

      if (r.mode === 'syn') {
        out.push({
          level: 'ok',
          text: t({
            tr: `Gereken via sayısı ${r.N}: akım kısıtı ${r.Ncurrent}, gerilim düşümü kısıtı ${r.Nvoltage}, kullanıcı alt sınırı ${r.limits.Nmin}. En kısıtlayıcı olan belirledi.`,
            en: `Required via count ${r.N}: current constraint ${r.Ncurrent}, voltage-drop constraint ${r.Nvoltage}, user lower bound ${r.limits.Nmin}. The most restrictive one decided.`,
          }),
        })
        out.push({
          level: r.VdropParallel <= r.limits.VdropMax ? 'ok' : 'danger',
          text: t({
            tr: `${r.N} viayla düşüm ${fmtVolt(r.VdropParallel)}; sınır ${fmtVolt(r.limits.VdropMax)}.`,
            en: `With ${r.N} vias the drop is ${fmtVolt(r.VdropParallel)}; the limit is ${fmtVolt(r.limits.VdropMax)}.`,
          }),
        })
      } else {
        out.push({
          level: 'ok',
          text: t({
            tr: `Tek via üzerinde ${fmtAmp(r.I, 3)} için düşüm ${fmtVolt(r.Vdrop)}, güç kaybı ${fmtPow(r.Ploss, 3)}.`,
            en: `For ${fmtAmp(r.I, 3)} through a single via the drop is ${fmtVolt(r.Vdrop)} and the power loss is ${fmtPow(r.Ploss, 3)}.`,
          }),
        })
      }

      out.push({
        level: r.ring.breakout ? 'danger' : r.ring.worst < 0.05e-3 ? 'warn' : 'ok',
        text: r.ring.breakout
          ? t({
            tr: `Worst-case annular ring sıfırın altında (${fmtEng(r.ring.worst, 'm', 3)}) — delik pad kenarını kırar. Pad çapını büyütün veya delik toleransını sıkın.`,
            en: `The worst-case annular ring is below zero (${fmtEng(r.ring.worst, 'm', 3)}) — the hole breaks the pad edge. Enlarge the pad diameter or tighten the hole tolerance.`,
          })
          : t({
            tr: `Nominal annular ring ${fmtEng(r.ring.nominal, 'm', 3)}, toleranslar sonrası ${fmtEng(r.ring.worst, 'm', 3)}.`,
            en: `Nominal annular ring ${fmtEng(r.ring.nominal, 'm', 3)}, after tolerances ${fmtEng(r.ring.worst, 'm', 3)}.`,
          }),
      })

      out.push({
        level: r.aspect.ratio > 10 ? 'danger' : r.aspect.ratio > 8 ? 'warn' : 'ok',
        text: r.aspect.ratio > 8
          ? t({
            tr: `Aspect ratio ${fmt(r.aspect.ratio, 3)} (${basisLabel[r.aspect.basis]} üzerinden). Bu orandan sonra kaplama delik ortasında incelir; üreticinizin sınırını teyit edin.`,
            en: `Aspect ratio ${fmt(r.aspect.ratio, 3)} (based on the ${basisLabel[r.aspect.basis]}). Beyond this ratio the plating thins at the middle of the hole; confirm your fab's limit.`,
          })
          : t({
            tr: `Aspect ratio ${fmt(r.aspect.ratio, 3)} (${basisLabel[r.aspect.basis]} üzerinden).`,
            en: `Aspect ratio ${fmt(r.aspect.ratio, 3)} (based on the ${basisLabel[r.aspect.basis]}).`,
          }),
      })

      out.push({
        level: 'ok',
        text: t({
          tr: `Yaklaşık tek iletken self-endüktansı ${fmtEng(r.L, 'H', 3)}, pad-antipad kapasitesi ${fmtEng(r.C, 'F', 3)}.`,
          en: `Approximate single-conductor self-inductance ${fmtEng(r.L, 'H', 3)}, pad–antipad capacitance ${fmtEng(r.C, 'F', 3)}.`,
        }),
      })

      if (r.disc) {
        out.push({
          level: 'ok',
          text: t({
            tr: `Bu parazitiklerin oluşturduğu süreksizlik empedansı ${fmtRes(r.disc.Z, 3)}, gecikme ${fmtEng(r.disc.delay, 's', 3)}.`,
            en: `The discontinuity impedance formed by these parasitics is ${fmtRes(r.disc.Z, 3)}, with a delay of ${fmtEng(r.disc.delay, 's', 3)}.`,
          }),
        })
      }

      out.push({
        level: 'warn',
        text: t({
          tr: 'Endüktans değeri izole tek iletken içindir. Yüksek hızda belirleyici olan sinyal ve dönüş yolunun oluşturduğu loop endüktansıdır; dönüş viası uzaksa gerçek değer bunun katları olur.',
          en: 'The inductance value is for an isolated single conductor. At high speed the deciding quantity is the loop inductance formed by the signal and its return path; if the return via is far away the real value is a multiple of this.',
        }),
      })

      out.push({
        level: 'danger',
        text: t({
          tr: 'Via akım kapasitesi yalnızca barrel DC direncinden belirlenemez. Bağlı bakır katmanlar, termal yapı ve komşu vialar sonucu belirgin biçimde değiştirir.',
          en: 'Via current capacity cannot be determined from the barrel DC resistance alone. Attached copper layers, the thermal structure and neighbouring vias change the result significantly.',
        }),
      })

      return out
    },
  }
}
