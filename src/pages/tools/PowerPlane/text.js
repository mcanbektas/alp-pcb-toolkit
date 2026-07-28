// Güç düzlemi ve paralel yol ekranının kullanıcıya görünen metinleri — iki dilli (tr/en).
//
// Hesap katmanı yalnızca kod ve sayı üretir; dile çeviri burada yapılır.
// Ekran `getText(lang)` çağırır ve çözülmüş metin nesnesini kullanır; koşullu
// metin üreten yerler (bulgu, hata nedeni) fonksiyon olarak döner ki mantık
// tek kopya kalsın, yalnızca dizeler dile göre seçilsin.

import { fmt, fmtEng, fmtOhm, fmtAmp, fmtVolt, fmtPow } from '../../../lib/num'
import { pick } from '../../../lib/i18n'
import { commonText } from '../../../data/uiText'
import { TOOL_PLANE, TOOL_PARALLEL, REASON_NECK, REASON_ROWS } from './model'

export function getText(lang) {
  const t = (dict) => pick(dict, lang)

  // Yüzde işaretinin yeri dile göre değişir; kalıp uiText.js'te tek yerdedir.
  const { pct } = commonText(lang)

  return {
    backlink: t({
      tr: '← PCB Akım, Güç ve Bakır',
      en: '← PCB Current, Power and Copper',
    }),
    title: t({
      tr: 'Güç Düzlemi ve Paralel Yol',
      en: 'Power Plane & Parallel Trace',
    }),
    intro: t({
      tr: 'Güç düzleminin boyun ve ortalama geometrisi için direnci, gerilim düşümünü ve güç '
        + 'kaybını; paralel yollarda ise akım paylaşımını ve en yüklü kolu hesaplar.',
      en: 'Computes resistance, voltage drop and power loss for the neck and the average '
        + 'geometry of a power plane; for parallel traces it computes the current sharing and '
        + 'the most loaded branch.',
    }),

    toolLabel: {
      [TOOL_PLANE]: t({ tr: 'Güç düzlemi', en: 'Power plane' }),
      [TOOL_PARALLEL]: t({ tr: 'Paralel yollar', en: 'Parallel traces' }),
    },

    fields: {
      tool: { label: t({ tr: 'Hesap', en: 'Calculation' }) },
      I: { label: t({ tr: 'Toplam akım (I)', en: 'Total current (I)' }) },
      L: {
        label: t({ tr: 'Akım yolu uzunluğu (L)', en: 'Current path length (L)' }),
        hint: t({
          tr: 'Kaynaktan yüke bakır üzerinden gidilen yol',
          en: 'The path taken through copper from source to load',
        }),
      },
      Wavg: { label: t({ tr: 'Ortalama düzlem genişliği', en: 'Average plane width' }) },
      Wneck: {
        label: t({ tr: 'Minimum boyun genişliği', en: 'Minimum neck width' }),
        hint: t({
          tr: 'Poligonun en dar yeri — direncin çoğu burada oluşur',
          en: 'The narrowest point of the polygon — most of the resistance forms here',
        }),
      },
      oz: { label: t({ tr: 'Bakır kalınlığı', en: 'Copper thickness' }) },
      // lib/traceCalc.js OZ_TABLE'daki "custom" satırının ekran karşılığı;
      // sayısal satırların etiketi ("1 oz (35 µm)") dilden bağımsızdır.
      ozCustom: t({ tr: 'Özel kalınlık…', en: 'Custom thickness…' }),
      tCustom: { label: t({ tr: 'Özel bakır kalınlığı', en: 'Custom copper thickness' }) },
      layer: { label: t({ tr: 'Katman', en: 'Layer' }) },
      layerExternal: t({ tr: 'Dış katman', en: 'Outer layer' }),
      layerInternal: t({ tr: 'İç katman', en: 'Inner layer' }),
      T: {
        label: t({ tr: 'Çalışma sıcaklığı', en: 'Operating temperature' }),
        hint: t({
          tr: 'Özdirenç bu sıcaklığa göre düzeltilir',
          en: 'Resistivity is corrected for this temperature',
        }),
      },
      Vs: {
        label: t({ tr: 'Besleme gerilimi (opsiyonel)', en: 'Supply voltage (optional)' }),
        hint: t({
          tr: 'Girilirse yüzdesel gerilim düşümü gösterilir',
          en: 'If entered, the percentage voltage drop is shown',
        }),
      },
    },

    // Paralel yol satır listesi — RowList etiketleri
    rowList: {
      label: t({ tr: 'Paralel yollar', en: 'Parallel traces' }),
      hint: t({
        tr: 'Farklı uzunluk ve genişlikteki kollar akımı eşit paylaşmaz',
        en: 'Branches of different length or width do not share the current equally',
      }),
      addLabel: t({ tr: 'Yol ekle', en: 'Add trace' }),
    },

    // Hata mesajında ve satır listesinde alan adı olarak görünen etiketler;
    // model.js'e verilir.
    fieldLabels: {
      I: t({ tr: 'Toplam akım (I)', en: 'Total current (I)' }),
      T: t({ tr: 'Çalışma sıcaklığı', en: 'Operating temperature' }),
      Vs: t({ tr: 'Besleme gerilimi', en: 'Supply voltage' }),
      tCustom: t({ tr: 'Özel bakır kalınlığı', en: 'Custom copper thickness' }),
      L: t({ tr: 'Akım yolu uzunluğu (L)', en: 'Current path length (L)' }),
      Wavg: t({ tr: 'Ortalama düzlem genişliği', en: 'Average plane width' }),
      Wneck: t({ tr: 'Minimum boyun genişliği', en: 'Minimum neck width' }),
      // Satır listesi: sütun başlıkları ve satır önekidir ("Yol 1 — Uzunluk")
      rowL: t({ tr: 'Uzunluk', en: 'Length' }),
      rowW: t({ tr: 'Genişlik', en: 'Width' }),
      rowLabel: t({ tr: 'Yol', en: 'Trace' }),
    },

    // Yüzde işaretinin yeri dile göre değişir: Türkçede önde, İngilizcede arkada.
    // Sayının kendisi num.js ile biçimlenir, burada yalnızca işaret yerleşir.
    pct,
    bigResultPlane: t({ tr: 'Boyun bölgesi direnci', en: 'Neck resistance' }),
    bigResultPlaneAlt: (avg, factor) => t({
      tr: `ortalama geometri: ${avg} · oran ${factor}×`,
      en: `average geometry: ${avg} · ratio ${factor}×`,
    }),
    bigResultParallel: t({ tr: 'Eşdeğer direnç', en: 'Equivalent resistance' }),
    bigResultParallelAlt: (n, drop) => t({
      tr: `${n} kol · toplam düşüm ${drop}`,
      en: `${n} branches · total drop ${drop}`,
    }),

    planeTable: {
      geometry: t({ tr: 'Geometri', en: 'Geometry' }),
      geometryCols: t({ tr: 'boyun · ortalama', en: 'neck · average' }),
      resistance: t({ tr: 'Direnç', en: 'Resistance' }),
      squares: t({ tr: 'Kare sayısı', en: 'Square count' }),
      vdrop: t({ tr: 'Gerilim düşümü', en: 'Voltage drop' }),
      ploss: t({ tr: 'Güç kaybı', en: 'Power loss' }),
      density: t({ tr: 'Akım yoğunluğu', en: 'Current density' }),
      supplyShare: t({ tr: 'Beslemeye oranı', en: 'Share of the supply' }),
      sheet: t({ tr: 'Kare direnci', en: 'Sheet resistance' }),
      neckCapacity: t({ tr: 'Boyun akım kapasitesi', en: 'Neck current capacity' }),
      utilisation: (v) => t({ tr: `(${pct(v)} kullanım)`, en: `(${pct(v)} utilisation)` }),
    },

    branchCols: {
      resistance: t({ tr: 'Direnç', en: 'Resistance' }),
      current: t({ tr: 'Akım', en: 'Current' }),
      share: t({ tr: 'Pay', en: 'Share' }),
      capacity: t({ tr: 'Kapasite', en: 'Capacity' }),
      utilisation: t({ tr: 'Kullanım', en: 'Utilisation' }),
    },

    parallelTable: {
      totalLoss: t({ tr: 'Toplam güç kaybı', en: 'Total power loss' }),
      equalShare: t({ tr: 'Eşit pay olsaydı', en: 'If the share were equal' }),
      equivalentW: t({ tr: 'Eşdeğer tek yol genişliği', en: 'Equivalent single-trace width' }),
      totalWidth: t({
        tr: 'Kollara bölünen toplam genişlik',
        en: 'Total width split across branches',
      }),
    },

    formula: {
      [TOOL_PLANE]: t({
        tr: `R_□ = ρ(T) / t   (kare direnci)
R = R_□ · (L / W)   (kare sayısı)

ρ(T) = ρ₂₀·[1 + α(T − 20)]
  ρ₂₀ = 1.724×10⁻⁸ Ω·m
  α = 0.00393 /°C

V_düşüm = I·R   P = I²·R`,
        en: `R_□ = ρ(T) / t   (sheet resistance)
R = R_□ · (L / W)   (square count)

ρ(T) = ρ₂₀·[1 + α(T − 20)]
  ρ₂₀ = 1.724×10⁻⁸ Ω·m
  α = 0.00393 /°C

V_drop = I·R   P = I²·R`,
      }),
      [TOOL_PARALLEL]: t({
        tr: `Rᵢ = ρ(T)·Lᵢ / (Wᵢ·t)
R_eş = (Σ 1/Rᵢ)⁻¹

Akım payı:
  Iᵢ = I · (1/Rᵢ) / Σ(1/Rⱼ)

Eşit geometride: Iᵢ = I / n`,
        en: `Rᵢ = ρ(T)·Lᵢ / (Wᵢ·t)
R_eq = (Σ 1/Rᵢ)⁻¹

Current share:
  Iᵢ = I · (1/Rᵢ) / Σ(1/Rⱼ)

Equal geometry: Iᵢ = I / n`,
      }),
    },

    detail: {
      sheet: (thickness, rsheet, T) => t({
        tr: `Bakır kalınlığı ${thickness}; kare direnci ${rsheet}/□ @ ${T} °C.`,
        en: `Copper thickness ${thickness}; sheet resistance ${rsheet}/□ @ ${T} °C.`,
      }),
      neckRatio: (ratio) => t({
        tr: `Boyun / ortalama genişlik oranı ${ratio}; direnç oranı da aynıdır çünkü uzunluk `
          + 'ikisinde de eşit alınır.',
        en: `The neck-to-average width ratio is ${ratio}; the resistance ratio is the same `
          + 'because the length is taken equal in both.',
      }),
      share: t({
        tr: 'Akım payı iletkenlikle orantılıdır; en düşük dirençli kol en çok akımı çeker.',
        en: 'The current share is proportional to conductance; the lowest-resistance branch '
          + 'draws the most current.',
      }),
      noRounding: t({
        tr: 'Ara değerlerde yuvarlama yapılmaz; yalnızca gösterim yuvarlanır.',
        en: 'Intermediate values are never rounded; only the display is rounded.',
      }),
    },

    validity: [
      t({
        tr: 'Akımın düzgün bir genişlik boyunca aktığı varsayılır. Geniş poligonda dağılım düzgün '
          + 'değildir; boyun ve ortalama sonuçları alt/üst sınır olarak okunmalıdır.',
        en: 'The current is assumed to flow uniformly across the width. In a wide polygon the '
          + 'distribution is not uniform; the neck and average results should be read as a lower '
          + 'and an upper bound.',
      }),
      t({
        tr: 'Via geçişleri, pad girişleri ve düzlem kesikleri modelde yoktur; hepsi direnci '
          + 'artırır.',
        en: 'Via transitions, pad entries and plane splits are not in the model; all of them '
          + 'increase the resistance.',
      }),
      t({
        tr: 'Akım kapasitesi klasik ampirik ısınma denkleminden gelir ve tekil bir iletken içindir.',
        en: 'The current capacity comes from the classic empirical conductor heating equation '
          + 'and applies to a single isolated conductor.',
      }),
      t({
        tr: 'Birbirine yakın paralel yolların ısıl etkileşimi hesaba katılmaz; toplam kapasite '
          + 'tek tek kapasitelerin toplamından düşüktür.',
        en: 'Thermal interaction between closely spaced parallel traces is not accounted for; '
          + 'the total capacity is lower than the sum of the individual capacities.',
      }),
      t({
        tr: 'Kesit dikdörtgen kabul edilir; aşındırmadan gelen trapez kesit modelde yoktur.',
        en: 'The cross-section is taken as rectangular; the trapezoidal profile produced by '
          + 'etching is not in the model.',
      }),
      t({
        tr: 'Sonuçlar yaklaşıktır — kritik tasarımlarda üretici verisi ve ölçümle doğrulayın.',
        en: 'Results are approximate — verify against manufacturer data and measurement for '
          + 'critical designs.',
      }),
    ],

    chart: {
      [TOOL_PLANE]: {
        x: t({ tr: 'Genişlik (mm)', en: 'Width (mm)' }),
        y: t({ tr: 'Direnç (Ω)', en: 'Resistance (Ω)' }),
        caption: t({
          tr: 'Aynı uzunlukta direnç genişlikle ters orantılıdır. Çalışma noktası boyun '
            + 'genişliğidir; referans çizgi ortalama genişliğin direncidir. İkisi arasındaki '
            + 'fark darboğazın maliyetidir.',
          en: 'At a fixed length the resistance is inversely proportional to the width. The '
            + 'operating point is the neck width; the reference line is the resistance of the '
            + 'average width. The gap between the two is the cost of the bottleneck.',
        }),
      },
      [TOOL_PARALLEL]: {
        x: t({ tr: 'Kol sayısı', en: 'Branch count' }),
        y: t({ tr: 'Eşdeğer direnç (Ω)', en: 'Equivalent resistance (Ω)' }),
        caption: t({
          tr: 'Aynı geometrideki kol sayısı arttıkça eşdeğer direnç 1/n ile düşer. Elektriksel '
            + 'kazanç böyle ölçeklenir; akım kapasitesi ise ısıl etkileşim yüzünden aynı oranda '
            + 'artmaz.',
          en: 'As the number of identical branches grows, the equivalent resistance falls as '
            + '1/n. The electrical gain scales this way; the current capacity does not grow at '
            + 'the same rate because of thermal interaction.',
        }),
      },
    },

    chartRefLegend: {
      avg: t({ tr: 'ortalama genişlik direnci', en: 'average-width resistance' }),
      now: t({ tr: 'mevcut eşdeğer', en: 'present equivalent' }),
    },
    chartRefLabel: {
      avg: (y) => t({ tr: `ortalama ${fmtOhm(y)}`, en: `average ${fmtOhm(y)}` }),
      now: (y) => t({ tr: `mevcut ${fmtOhm(y)}`, en: `present ${fmtOhm(y)}` }),
    },
    chartMarker: {
      [TOOL_PLANE]: t({ tr: 'boyun', en: 'neck' }),
      [TOOL_PARALLEL]: t({ tr: 'mevcut', en: 'present' }),
    },
    branchUnit: t({ tr: 'kol', en: 'branches' }),

    schematic: {
      titlePlane: t({ tr: 'Güç düzlemi geometrisi', en: 'Power plane geometry' }),
      titleParallel: t({ tr: 'Paralel yollar', en: 'Parallel traces' }),
      captionPlane: t({
        tr: 'Akım darboğazdan geçer; direncin büyük kısmı orada oluşur',
        en: 'The current passes through the bottleneck; most of the resistance forms there',
      }),
      captionParallel: t({
        tr: 'Kol kalınlıkları genişlik oranını gösterir',
        en: 'Branch thicknesses show the width ratio',
      }),
      neck: t({ tr: 'boyun', en: 'neck' }),
      branchSummary: (n, req) => t({
        tr: `${n} kol · eşdeğer ${req}`,
        en: `${n} branches · equivalent ${req}`,
      }),
    },

    reasonText: (reason, r) => {
      switch (reason) {
        case REASON_NECK:
          return t({
            tr: 'Minimum boyun genişliği ortalama düzlem genişliğinden büyük olamaz. Değerleri '
              + 'kontrol edin.',
            en: 'The minimum neck width cannot exceed the average plane width. Check the values.',
          })
        case REASON_ROWS:
          return t({
            tr: `Yol listesinde eksik veya geçersiz alan var: ${r?.invalid?.join(', ')}.`,
            en: `The trace list has a missing or invalid field: ${r?.invalid?.join(', ')}.`,
          })
        default:
          return t({
            tr: 'Tüm zorunlu alanlara pozitif sayısal değer girin. Ondalık için nokta veya '
              + 'virgül kullanabilirsiniz (0.25 = 0,25).',
            en: 'Enter a positive numeric value in every required field. Use a point or a comma '
              + 'for decimals (0.25 = 0,25).',
          })
      }
    },

    // Mühendislik yorumu — sonuç nesnesinden cümle listesine
    commentary: (r) => {
      if (!r.ok) return []
      const out = []

      if (r.tool === TOOL_PLANE) {
        out.push({
          level: 'ok',
          text: t({
            tr: `Kare direnci ${fmtOhm(r.Rsheet)}/□. Düzlem ${fmt(r.average.squares, 3)} kare `
              + `(ortalama genişlikte) ya da ${fmt(r.neck.squares, 3)} kare (boyunda) olarak `
              + 'görülüyor.',
            en: `The sheet resistance is ${fmtOhm(r.Rsheet)}/□. The plane is seen as `
              + `${fmt(r.average.squares, 3)} squares (at the average width) or `
              + `${fmt(r.neck.squares, 3)} squares (at the neck).`,
          }),
        })

        out.push({
          level: r.neckFactor > 4 ? 'danger' : r.neckFactor > 2 ? 'warn' : 'ok',
          text: r.neckFactor > 2
            ? t({
              tr: `Boyun bölgesi direnci ortalama geometrinin ${fmt(r.neckFactor, 3)} katı. `
                + 'Gerilim düşümünün büyük kısmı bu darboğazda oluşuyor; boynu genişletmek '
                + 'düzlemin geri kalanını genişletmekten çok daha etkili.',
              en: `The neck resistance is ${fmt(r.neckFactor, 3)}× that of the average geometry. `
                + 'Most of the voltage drop forms in this bottleneck; widening the neck is far '
                + 'more effective than widening the rest of the plane.',
            })
            : t({
              tr: `Boyun bölgesi direnci ortalamanın ${fmt(r.neckFactor, 3)} katı — geometri `
                + 'makul ölçüde düzgün.',
              en: `The neck resistance is ${fmt(r.neckFactor, 3)}× the average — the geometry is `
                + 'reasonably uniform.',
            }),
        })

        // `pct` adı yüzde işaretini yerleştiren yardımcıya ait; boyun oranı
        // ayrı adla tutulur ki yardımcı gölgelenmesin.
        const neckPct = r.neck.pct
        if (neckPct != null) {
          out.push({
            level: neckPct > 5 ? 'danger' : neckPct > 2 ? 'warn' : 'ok',
            text: t({
              tr: `Boyun bölgesindeki gerilim düşümü ${fmtVolt(r.neck.Vdrop)} — beslemenin `
                + `${pct(fmt(neckPct, 3))}'i.`,
              en: `The voltage drop across the neck is ${fmtVolt(r.neck.Vdrop)} — `
                + `${pct(fmt(neckPct, 3))} of the supply.`,
            }),
          })
        } else {
          out.push({
            level: 'ok',
            text: t({
              tr: `Boyun bölgesindeki gerilim düşümü ${fmtVolt(r.neck.Vdrop)}, güç kaybı `
                + `${fmtPow(r.neck.Ploss, 3)}.`,
              en: `The voltage drop across the neck is ${fmtVolt(r.neck.Vdrop)} and the power `
                + `loss is ${fmtPow(r.neck.Ploss, 3)}.`,
            }),
          })
        }

        out.push({
          level: r.neckUtil > 1 ? 'danger' : r.neckUtil > 0.8 ? 'warn' : 'ok',
          text: r.neckUtil > 0.8
            ? t({
              tr: `Boyun, ampirik ısınma denklemine göre ${fmtAmp(r.neckCapacity, 3)} `
                + `taşıyabilir; ${fmtAmp(r.I, 3)} bunun ${pct(fmt(r.neckUtil * 100, 3))}'i. `
                + 'Darboğaz geniş bir düzlemde bile tek bir yol gibi ısınır.',
              en: `By the empirical heating equation the neck can carry `
                + `${fmtAmp(r.neckCapacity, 3)}; ${fmtAmp(r.I, 3)} is `
                + `${pct(fmt(r.neckUtil * 100, 3))} of that. Even in a wide plane the bottleneck `
                + 'heats up like a single trace.',
            })
            : t({
              tr: `Boyun bölgesinin akım kapasitesi ${fmtAmp(r.neckCapacity, 3)}; kullanım `
                + `${pct(fmt(r.neckUtil * 100, 3))}.`,
              en: `The current capacity of the neck is ${fmtAmp(r.neckCapacity, 3)}; `
                + `utilisation is ${pct(fmt(r.neckUtil * 100, 3))}.`,
            }),
        })

        out.push({
          level: 'warn',
          text: t({
            tr: 'Bu model akımın düzgün genişlik boyunca aktığını varsayar. Gerçek poligonda pad '
              + 'girişleri, via kümeleri ve kesikler akımı yoğunlaştırır; iki sonuç alt ve üst '
              + 'sınır olarak okunmalıdır.',
            en: 'This model assumes the current flows uniformly across the width. In a real '
              + 'polygon, pad entries, via clusters and splits concentrate the current; the two '
              + 'results should be read as a lower and an upper bound.',
          }),
        })
        return out
      }

      // Paralel yollar
      out.push({
        level: 'ok',
        text: t({
          tr: `${r.branches.length} kolun eşdeğer direnci ${fmtOhm(r.Req)}; toplam gerilim `
            + `düşümü ${fmtVolt(r.Vdrop)}, güç kaybı ${fmtPow(r.Ploss, 3)}.`,
          en: `The equivalent resistance of the ${r.branches.length} branches is `
            + `${fmtOhm(r.Req)}; the total voltage drop is ${fmtVolt(r.Vdrop)} and the power `
            + `loss ${fmtPow(r.Ploss, 3)}.`,
        }),
      })

      out.push({
        level: r.imbalance > 0.1 ? 'warn' : 'ok',
        text: r.imbalance > 0.1
          ? t({
            tr: `Akım payları eşit değil: en yüksek ve en düşük pay arasında `
              + `${fmt(r.imbalance * 100, 3)} puan fark var. Farklı uzunluk veya genişlikteki `
              + 'kollar akımı eşit paylaşmaz; en kısa ve en geniş kol en çok yüklenir.',
            en: `The current shares are not equal: there is a ${fmt(r.imbalance * 100, 3)} point `
              + 'spread between the highest and the lowest share. Branches of different length '
              + 'or width do not share the current equally; the shortest and widest branch is '
              + 'loaded the most.',
          })
          : t({
            tr: 'Kollar akımı neredeyse eşit paylaşıyor; geometriler birbirine yakın.',
            en: 'The branches share the current almost equally; the geometries are close to '
              + 'one another.',
          }),
      })

      out.push({
        level: r.worst.util > 1 ? 'danger' : r.worst.util > 0.8 ? 'warn' : 'ok',
        text: r.worst.util > 0.8
          ? t({
            tr: `En yüklü kol kapasitesinin ${pct(fmt(r.worst.util * 100, 3))}'ini kullanıyor `
              + `(${fmtAmp(r.worst.I, 3)} / ${fmtAmp(r.worst.capacity, 3)}). Kolları eşitleyin `
              + 'veya en dar kolu genişletin.',
            en: `The most loaded branch uses ${pct(fmt(r.worst.util * 100, 3))} of its capacity `
              + `(${fmtAmp(r.worst.I, 3)} / ${fmtAmp(r.worst.capacity, 3)}). Equalise the `
              + 'branches or widen the narrowest one.',
          })
          : t({
            tr: `En yüklü kol kapasitesinin ${pct(fmt(r.worst.util * 100, 3))}'ini kullanıyor.`,
            en: `The most loaded branch uses ${pct(fmt(r.worst.util * 100, 3))} of its capacity.`,
          }),
      })

      out.push({
        level: 'ok',
        text: t({
          tr: `Aynı direnci tek yolla elde etmek için ${fmtEng(r.equivalentW, 'm', 3)} genişlik `
            + `gerekirdi; kollara bölünen toplam genişlik ${fmtEng(r.totalWidth, 'm', 3)}.`,
          en: `Reaching the same resistance with a single trace would need a width of `
            + `${fmtEng(r.equivalentW, 'm', 3)}; the total width split across the branches is `
            + `${fmtEng(r.totalWidth, 'm', 3)}.`,
        }),
      })

      out.push({
        level: 'danger',
        text: t({
          tr: 'Birbirine yakın paralel yolların akım kapasitesi, bağımsız yolların toplamı gibi '
            + 'değerlendirilmemelidir. Isıl etkileşim nedeniyle her kol komşusunu ısıtır; gerçek '
            + 'toplam kapasite tek tek kapasitelerin toplamından düşüktür.',
          en: 'The current capacity of closely spaced parallel traces must not be treated as the '
            + 'sum of independent traces. Because of thermal interaction each branch heats its '
            + 'neighbour; the real total capacity is lower than the sum of the individual '
            + 'capacities.',
        }),
      })

      return out
    },
  }
}
