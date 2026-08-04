// Düzlem kavite rezonansı ve kapasitansı ekranının kullanıcıya görünen
// metinleri — iki dilli (tr/en).
//
// Hesap katmanı yalnızca kod ve sayı üretir; dile çeviri burada yapılır.
// Motorun (lib/planeCavity.js) bulgu/seviye kavramı yok — Adım 2/4'ün diğer
// motorlarında olduğu gibi bir "findings" fonksiyonu bu ailede hiçbirinde
// yok: bulgular ThermalVia deseninde olduğu gibi burada, ham `compute()`
// çıktısından `commentary(r)` ile kurulur.
//
// REV2 §11.10'daki beş grafikten ikisi bu ekranda BİLİNÇLİ OLARAK yok: mod
// index heatmap'i (repoda heatmap bileşeni yok) ve frekans ekseninde mod
// işaretleri (LineChart'ta dikey referans çizgisi render edilmiyor). Mod
// listesi bunun yerine düz bir tablo olarak gösterilir, görselleştirme icat
// edilmedi.

import { fmt, fmtEng } from '../../../lib/num'
import { pick } from '../../../lib/i18n'
import { commonText } from '../../../data/uiText'
import {
  REASON_INCOMPLETE, REASON_MODE_INDEX, REASON_INVALID,
  SWEEP_D, SWEEP_A, SWEEP_EPSR,
  MODE_LIMIT_ALL,
} from './model'

const fmtF = (x, sig = 4) => fmtEng(x, 'F', sig)
const fmtHz = (x, sig = 4) => fmtEng(x, 'Hz', sig)
const fmtM = (x, sig = 4) => fmtEng(x, 'm', sig)
const fmtJ = (x, sig = 3) => fmtEng(x, 'J', sig)
const fmtFPerArea = (x, sig = 4) => fmtEng(x, 'F/m²', sig)

export function getText(lang) {
  const t = (dict) => pick(dict, lang)
  const { pct } = commonText(lang)

  return {
    pct,
    backlink: t({ tr: '← Güç Bütünlüğü ve Termal', en: '← Power Integrity and Thermal' }),
    title: t({
      tr: 'Düzlem Kavite Rezonansı ve Kapasitansı',
      en: 'Plane Cavity Resonance and Capacitance',
    }),
    intro: t({
      tr: 'Dikdörtgen bir power–ground düzlem çiftinin yaklaşık düzlem kapasitansını ve ilk '
        + 'geometrik kavite mod frekanslarını hesaplar; solid düzlemlerde tek başına lumped '
        + 'kapasitans yeterli değildir çünkü geometrik rezonanslar da oluşabilir.',
      en: 'Computes the approximate plane capacitance and the first geometric cavity mode '
        + 'frequencies of a rectangular power–ground plane pair; on solid planes the lumped '
        + 'capacitance alone is not enough because geometric resonances can also occur.',
    }),

    fields: {
      a: { label: t({ tr: 'Plane X boyutu (a)', en: 'Plane X dimension (a)' }) },
      b: { label: t({ tr: 'Plane Y boyutu (b)', en: 'Plane Y dimension (b)' }) },
      d: { label: t({ tr: 'Power–ground mesafesi (d)', en: 'Power–ground spacing (d)' }) },
      epsR: { label: t({ tr: 'Dielektrik sabiti (εr)', en: 'Dielectric constant (εr)' }) },
      lossTangent: { label: t({ tr: 'Loss tangent (tan δ)', en: 'Loss tangent (tan δ)' }) },
      mMax: {
        label: t({ tr: 'Maksimum mod indeksi (m_maks)', en: 'Maximum mode index (m_max)' }),
        hint: t({
          tr: 'X yönündeki en yüksek mod indeksi — mod tablosu bu sınıra kadar taranır',
          en: 'The highest mode index in the X direction — the mode table is scanned up to this',
        }),
      },
      nMax: {
        label: t({ tr: 'Maksimum mod indeksi (n_maks)', en: 'Maximum mode index (n_max)' }),
        hint: t({
          tr: 'Y yönündeki en yüksek mod indeksi',
          en: 'The highest mode index in the Y direction',
        }),
      },
      modeLimit: { label: t({ tr: 'Listelenecek mod sayısı', en: 'Number of modes to list' }) },

      areaOverride: {
        label: t({ tr: 'Örtüşen etkin alan (opsiyonel)', en: 'Overlapping effective area (optional)' }),
        hint: t({
          tr: 'Boş bırakılırsa a·b kullanılır; gerçek örtüşen alan dikdörtgen değilse buraya girin',
          en: 'If left blank a·b is used; enter this if the real overlapping area is not rectangular',
        }),
      },
      voltage: {
        label: t({ tr: 'Besleme gerilimi (opsiyonel)', en: 'Supply voltage (optional)' }),
        hint: t({
          tr: 'Girilirse depolanan yaklaşık enerji hesaplanır',
          en: 'If entered, the approximate stored energy is calculated',
        }),
      },
      qc: {
        label: t({ tr: 'İletken kaybı Q’su (Q_c, opsiyonel)', en: 'Conductor-loss Q (Q_c, optional)' }),
      },
      qr: {
        label: t({ tr: 'Radyasyon kaybı Q’su (Q_r, opsiyonel)', en: 'Radiation-loss Q (Q_r, optional)' }),
      },
      qLoading: {
        label: t({ tr: 'Dış yükleme Q’su (Q_loading, opsiyonel)', en: 'External loading Q (Q_loading, optional)' }),
        hint: t({
          tr: 'Toplam Q yalnızca Q_c, Q_r ve Q_loading üçü birden girilirse hesaplanır',
          en: 'The total Q is only computed when Q_c, Q_r and Q_loading are all three entered',
        }),
      },

      hasStitchingCheck: t({
        tr: 'Stitching via aralığını değerlendir',
        en: 'Evaluate a stitching via spacing',
      }),
      targetFrequency: { label: t({ tr: 'Hedef frekans', en: 'Target frequency' }) },
      stitchingN: { label: t({ tr: 'Muhafazakârlık katsayısı (λ/N)', en: 'Conservatism factor (λ/N)' }) },
      actualStitchingSpacing: {
        label: t({
          tr: 'Gerçek stitching via aralığı (opsiyonel)',
          en: 'Actual stitching via spacing (optional)',
        }),
      },
    },

    modeLimitOption: (opt) => {
      if (opt === MODE_LIMIT_ALL) return t({ tr: 'Tümü', en: 'All' })
      return t({ tr: `İlk ${opt}`, en: `First ${opt}` })
    },
    // Stitching N seçeneği etiketi — λ/N gösterimi dilden bağımsızdır (yalnız
    // sembol), modeLimitOption'la aynı desen: index.jsx'teki Segmented ve
    // report.js'teki girdi satırı ikisi de aynı tek kopyayı çağırır.
    stitchingNOption: (n) => `λ/${n}`,

    // Hata mesajında alan adı olarak görünen kısa etiketler; model.js'e verilir.
    fieldLabels: {
      a: t({ tr: 'Plane X boyutu (a)', en: 'Plane X dimension (a)' }),
      b: t({ tr: 'Plane Y boyutu (b)', en: 'Plane Y dimension (b)' }),
      d: t({ tr: 'Power–ground mesafesi (d)', en: 'Power–ground spacing (d)' }),
      epsR: t({ tr: 'Dielektrik sabiti (εr)', en: 'Dielectric constant (εr)' }),
      lossTangent: t({ tr: 'Loss tangent', en: 'Loss tangent' }),
      mMax: t({ tr: 'Maksimum mod indeksi (m_maks)', en: 'Maximum mode index (m_max)' }),
      nMax: t({ tr: 'Maksimum mod indeksi (n_maks)', en: 'Maximum mode index (n_max)' }),
      areaOverride: t({ tr: 'Örtüşen etkin alan', en: 'Overlapping effective area' }),
      voltage: t({ tr: 'Besleme gerilimi', en: 'Supply voltage' }),
      qc: 'Q_c',
      qr: 'Q_r',
      qLoading: 'Q_loading',
      targetFrequency: t({ tr: 'Hedef frekans', en: 'Target frequency' }),
      actualStitchingSpacing: t({
        tr: 'Gerçek stitching via aralığı',
        en: 'Actual stitching via spacing',
      }),
    },

    bigResultLabel: t({ tr: 'Düzlem kapasitansı (C)', en: 'Plane capacitance (C)' }),
    altLabels: {
      area: t({ tr: 'alan', en: 'area' }),
      lowestResonance: t({ tr: 'en düşük rezonans', en: 'lowest resonance' }),
      qd: t({ tr: 'Q_d', en: 'Q_d' }),
    },

    table: {
      capacitance: t({ tr: 'Düzlem kapasitansı (C)', en: 'Plane capacitance (C)' }),
      area: t({ tr: 'Kullanılan alan (A)', en: 'Area used (A)' }),
      capacitancePerArea: t({ tr: 'Alan başına kapasitans (C’)', en: 'Capacitance per area (C’)' }),
      lowestResonance: t({ tr: 'En düşük kavite rezonansı', en: 'Lowest cavity resonance' }),
      dielectricQ: t({ tr: 'Dielektrik kaynaklı Q (Q_d)', en: 'Dielectric-loss Q (Q_d)' }),
      totalQ: t({ tr: 'Toplam Q', en: 'Total Q' }),
      energy: t({ tr: 'Depolanan enerji (E_C)', en: 'Stored energy (E_C)' }),
      stitchingLambda: t({ tr: 'Hedef frekansta dielektrik dalga boyu (λ_d)', en: 'Dielectric wavelength at target frequency (λ_d)' }),
      stitchingSMax: t({ tr: 'Stitching aralığı sınırı (λ_d/N)', en: 'Stitching spacing limit (λ_d/N)' }),
      stitchingActual: t({ tr: 'Girilen gerçek aralık', en: 'Entered actual spacing' }),
    },

    modesHeading: t({ tr: 'Kavite modları', en: 'Cavity modes' }),
    modesEmpty: t({
      tr: 'Seçili mod ızgarasında (m_maks = 0, n_maks = 0) listelenecek mod yok.',
      en: 'There are no modes to list in the selected grid (m_max = 0, n_max = 0).',
    }),
    modesCols: {
      m: 'm', n: 'n', freq: t({ tr: 'Frekans (f_mn)', en: 'Frequency (f_mn)' }),
    },

    formula: t({
      tr: `C = ε0·εr·A/d          (A = a·b, override verilmezse)
C’ = C/A = ε0·εr/d

f_mn = [c / (2√εr)]·√[(m/a)² + (n/b)²]
f_10 = c / (2a√εr)     f_01 = c / (2b√εr)

Q_d ≈ 1/tan δ
1/Q_toplam = 1/Q_d + 1/Q_c + 1/Q_r + 1/Q_loading

E_C = ½·C·V²

λ_d = c / (f·√εr)      s_maks = λ_d / N`,
      en: `C = ε0·εr·A/d          (A = a·b, unless an override is given)
C’ = C/A = ε0·εr/d

f_mn = [c / (2√εr)]·√[(m/a)² + (n/b)²]
f_10 = c / (2a√εr)     f_01 = c / (2b√εr)

Q_d ≈ 1/tan δ
1/Q_total = 1/Q_d + 1/Q_c + 1/Q_r + 1/Q_loading

E_C = ½·C·V²

λ_d = c / (f·√εr)      s_max = λ_d / N`,
    }),

    detail: {
      areaSource: (usedOverride, area) => (usedOverride
        ? t({
          tr: `Girilen örtüşen etkin alan ${fmtEng(area, 'm²', 4)} kullanıldı (a·b yerine).`,
          en: `The entered overlapping effective area ${fmtEng(area, 'm²', 4)} was used (instead of a·b).`,
        })
        : t({
          tr: `Alan a·b’den hesaplandı: ${fmtEng(area, 'm²', 4)}.`,
          en: `The area was computed from a·b: ${fmtEng(area, 'm²', 4)}.`,
        })),
      modeGrid: (mMax, nMax, total, shown) => t({
        tr: `m ∈ [0, ${mMax}], n ∈ [0, ${nMax}] ızgarasında (0,0) hariç ${total} mod var; `
          + `${shown} tanesi tabloda listeleniyor.`,
        en: `The m ∈ [0, ${mMax}], n ∈ [0, ${nMax}] grid has ${total} modes excluding (0,0); `
          + `${shown} of them are listed in the table.`,
      }),
      noRounding: t({
        tr: 'Ara değerlerde yuvarlama yapılmaz; yalnızca gösterim yuvarlanır.',
        en: 'Intermediate values are never rounded; only the display is rounded.',
      }),
    },

    validity: [
      t({
        tr: 'Bu araç mevcut Güç Düzlemi ve Paralel Yol aracından farklıdır: o araç DC akım '
          + 'taşıma ve paralel yol direncini hesaplar; bu ekran geometrik kavite rezonansını ve '
          + 'düzlem kapasitansını hesaplar. İkisi karıştırılmamalıdır.',
        en: 'This tool is different from the existing Power Plane and Parallel Path tool: that '
          + 'tool computes DC current carrying and parallel-path resistance; this screen computes '
          + 'the geometric cavity resonance and plane capacitance. The two should not be confused.',
      }),
      t({
        tr: 'Düzlem kapasitansı ideal paralel plaka modelidir; saçak alanları (fringing) ve '
          + 'düzlem boşlukları (split/kesik) bu modelde yoktur.',
        en: 'The plane capacitance uses an ideal parallel-plate model; fringing fields and plane '
          + 'splits/cutouts are not in this model.',
      }),
      t({
        tr: 'Kavite mod frekansları dikdörtgen, kayıpsız bir boşluk yaklaşımıdır; gerçek kart '
          + 'kenarları, kesikler, via yapıları, decoupling kondansatörleri ve kayıplar tam '
          + 'olarak modellenmez.',
        en: 'The cavity mode frequencies use a rectangular, lossless-cavity approximation; real '
          + 'board edges, cutouts, via structures, decoupling capacitors and losses are not '
          + 'fully modelled.',
      }),
      t({
        tr: 'Toplam Q yalnızca dielektrik, iletken, radyasyon ve dış yükleme kayıplarının '
          + 'tamamı girildiğinde hesaplanır; eksik bileşen toplam Q’yu hesaplanmış gibi '
          + 'göstermez.',
        en: 'The total Q is only computed when the dielectric, conductor, radiation and external '
          + 'loading losses are all entered; a missing component does not make the total Q look '
          + 'computed when it is not.',
      }),
      t({
        tr: 'Depolanan enerji tek başına load step sağlama kapasitesinin ölçüsü değildir.',
        en: 'The stored energy alone is not a measure of load-step supply capability.',
      }),
      t({
        tr: 'λ/N stitching muhafazakârlık katsayıları (10/20/40) standart zorunluluğu değil, '
          + 'mühendislik kuralıdır.',
        en: 'The λ/N stitching conservatism factors (10/20/40) are an engineering rule, not a '
          + 'standard requirement.',
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
      [SWEEP_D]: t({ tr: 'Düzlem mesafesi (d)', en: 'Plane spacing (d)' }),
      [SWEEP_A]: t({ tr: 'Plane X boyutu (a)', en: 'Plane X dimension (a)' }),
      [SWEEP_EPSR]: t({ tr: 'Dielektrik sabiti (εr)', en: 'Dielectric constant (εr)' }),
    },
    sweepAxis: {
      [SWEEP_D]: t({ tr: 'Düzlem mesafesi d (m)', en: 'Plane spacing d (m)' }),
      [SWEEP_A]: t({ tr: 'Plane X boyutu a (m)', en: 'Plane X dimension a (m)' }),
      [SWEEP_EPSR]: t({ tr: 'Dielektrik sabiti (εr)', en: 'Dielectric constant (εr)' }),
    },
    sweepYLabel: {
      [SWEEP_D]: t({ tr: 'Kapasitans (F)', en: 'Capacitance (F)' }),
      [SWEEP_A]: t({ tr: 'En düşük kavite rezonansı (Hz)', en: 'Lowest cavity resonance (Hz)' }),
      [SWEEP_EPSR]: t({ tr: 'En düşük kavite rezonansı (Hz)', en: 'Lowest cavity resonance (Hz)' }),
    },
    sweepCaption: {
      [SWEEP_D]: t({
        tr: 'Kapasitans mesafeyle ters orantılıdır (log-log eksende düz çizgi) — düzlemler '
          + 'birbirine yaklaştıkça kapasitans artar.',
        en: 'Capacitance is inversely proportional to spacing (a straight line on log-log axes) '
          + '— capacitance rises as the planes move closer together.',
      }),
      [SWEEP_A]: t({
        tr: 'En düşük kavite rezonansı X boyutuyla ters orantılıdır — daha küçük bir düzlem ilk '
          + 'rezonansı yukarı taşır.',
        en: 'The lowest cavity resonance is inversely proportional to the X dimension — a '
          + 'smaller plane pushes the first resonance higher.',
      }),
      [SWEEP_EPSR]: t({
        tr: 'En düşük kavite rezonansı dielektrik sabitinin kareköküyle ters orantılı azalır.',
        en: 'The lowest cavity resonance falls inversely with the square root of the dielectric '
          + 'constant.',
      }),
    },
    operatingPoint: t({ tr: 'çalışma noktası', en: 'operating point' }),

    schematic: {
      title: t({ tr: 'Düzlem çifti — üstten görünüş ve kesit', en: 'Plane pair — top view and cross-section' }),
      caption: t({
        tr: 'Örtüşen power–ground düzlem çiftinin üstten görünüşü (a, b) ve kesiti (d, εr). '
          + 'Ölçüler orantılı değildir.',
        en: 'Top view (a, b) and cross-section (d, εr) of the overlapping power–ground plane '
          + 'pair. Dimensions are not to scale.',
      }),
      topView: t({ tr: 'üstten görünüş', en: 'top view' }),
      crossSection: t({ tr: 'kesit', en: 'cross-section' }),
      pairLabel: t({ tr: 'düzlem çifti (power–ground)', en: 'plane pair (power–ground)' }),
      dielectricLabel: t({ tr: 'dielektrik', en: 'dielectric' }),
    },

    reasonText: (reason) => {
      switch (reason) {
        case REASON_MODE_INDEX:
          return t({
            tr: 'Maksimum mod indeksleri (m_maks, n_maks) negatif olmayan tam sayı olmalı.',
            en: 'The maximum mode indices (m_max, n_max) must be non-negative integers.',
          })
        case REASON_INVALID:
          return t({
            tr: 'Girilen değer kombinasyonu geçerli değil. Boyutları, mesafeyi, dielektrik '
              + 'sabitini ve loss tangent’i kontrol edin.',
            en: 'The entered combination of values is not valid. Check the dimensions, spacing, '
              + 'dielectric constant and loss tangent.',
          })
        case REASON_INCOMPLETE:
        default:
          return t({
            tr: 'Tüm zorunlu alanlara pozitif sayısal değer girin. Ondalık için nokta veya '
              + 'virgül kullanabilirsiniz (0.25 = 0,25).',
            en: 'Enter a positive numeric value in every required field. Use a point or a comma '
              + 'for decimals (0.25 = 0,25).',
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
          tr: `Kullanılan alan ${fmtEng(r.area, 'm²', 4)} için düzlem kapasitansı ${fmtF(r.capacitance)} `
            + `(C’ = ${fmtFPerArea(r.capacitancePerArea)}).`,
          en: `For an area of ${fmtEng(r.area, 'm²', 4)} the plane capacitance is ${fmtF(r.capacitance)} `
            + `(C’ = ${fmtFPerArea(r.capacitancePerArea)}).`,
        }),
      })

      out.push({
        level: 'ok',
        text: t({
          tr: `En düşük kavite rezonansı ${fmtHz(r.lowestResonance)}; yalnızca dielektrik kaybı `
            + `dikkate alınırsa Q_d ≈ ${fmt(r.dielectricQ, 4)}.`,
          en: `The lowest cavity resonance is ${fmtHz(r.lowestResonance)}; considering only the `
            + `dielectric loss, Q_d ≈ ${fmt(r.dielectricQ, 4)}.`,
        }),
      })

      const anyQGiven = r.qc != null || r.qr != null || r.qLoading != null
      if (r.totalQ != null) {
        out.push({
          level: 'ok',
          text: t({
            tr: `Dielektrik, iletken, radyasyon ve dış yükleme kayıplarının tümüyle toplam Q ≈ `
              + `${fmt(r.totalQ, 4)}.`,
            en: `With dielectric, conductor, radiation and external loading losses combined, the `
              + `total Q ≈ ${fmt(r.totalQ, 4)}.`,
          }),
        })
      } else if (anyQGiven) {
        out.push({
          level: 'warn',
          text: t({
            tr: 'Toplam Q hesaplanamadı: Q_c, Q_r ve Q_loading’in üçü birden girilmeli.',
            en: 'The total Q could not be computed: Q_c, Q_r and Q_loading must all three be '
              + 'entered.',
          }),
        })
      }

      if (r.energy != null) {
        out.push({
          level: 'ok',
          text: t({
            tr: `Depolanan yaklaşık enerji ${fmtJ(r.energy)} — bu, load step sağlama `
              + 'kapasitesinin tek başına ölçüsü değildir.',
            en: `The approximate stored energy is ${fmtJ(r.energy)} — this alone is not a `
              + 'measure of load-step supply capability.',
          }),
        })
      }

      if (r.hasStitching && r.stitching) {
        if (r.stitching.error) {
          out.push({
            level: 'danger',
            text: t({
              tr: 'Stitching aralığı karşılaştırması hesaplanamadı: muhafazakârlık katsayısı '
                + 'geçersiz.',
              en: 'The stitching spacing comparison could not be computed: the conservatism '
                + 'factor is invalid.',
            }),
          })
        } else if (r.stitching.withinLimit === null) {
          out.push({
            level: 'ok',
            text: t({
              tr: `Hedef frekansta izin verilen stitching aralığı sınırı λ_d/${r.stitchingN} = `
                + `${fmtM(r.stitching.sMax)}.`,
              en: `The allowed stitching spacing limit at the target frequency is λ_d/`
                + `${r.stitchingN} = ${fmtM(r.stitching.sMax)}.`,
            }),
          })
        } else {
          const ratio = r.stitching.actualSpacing / r.stitching.sMax
          out.push(r.stitching.withinLimit
            ? {
              level: 'ok',
              text: t({
                tr: `Gerçek stitching aralığı seçilen sınırın (λ_d/${r.stitchingN}) `
                  + `${pct(fmt(ratio * 100, 3))}’i — sınır içinde.`,
                en: `The actual stitching spacing is ${pct(fmt(ratio * 100, 3))} of the selected `
                  + `limit (λ_d/${r.stitchingN}) — within the limit.`,
              }),
            }
            : {
              level: 'warn',
              text: t({
                tr: `Gerçek stitching aralığı seçilen sınırı (λ_d/${r.stitchingN}) `
                  + `${fmt(ratio, 3)} kat aşıyor. Via sayısını artırın veya aralığı azaltın.`,
                en: `The actual stitching spacing exceeds the selected limit (λ_d/`
                  + `${r.stitchingN}) by ${fmt(ratio, 3)}×. Add more vias or reduce the spacing.`,
              }),
            })
        }
      }

      out.push({
        level: 'warn',
        text: t({
          tr: 'Bu araç mevcut Güç Düzlemi ve Paralel Yol aracından farklıdır — o araç DC akım '
            + 've paralel yol direncini hesaplar, bu ekran geometrik kavite rezonansı ve '
            + 'kapasitans hesaplar.',
          en: 'This tool is different from the existing Power Plane and Parallel Path tool — '
            + 'that tool computes DC current and parallel-path resistance, this screen computes '
            + 'the geometric cavity resonance and capacitance.',
        }),
      })

      out.push({
        level: 'warn',
        text: t({
          tr: 'Model gerçek kart kenarlarını, kesikleri, via yapılarını, decoupling '
            + 'kondansatörlerini ve kayıpları tam içermez; sonuçlar ilk yaklaşım amaçlıdır.',
          en: 'The model does not fully include real board edges, cutouts, via structures, '
            + 'decoupling capacitors or losses; results are intended as a first approximation.',
        }),
      })

      return out
    },
  }
}
