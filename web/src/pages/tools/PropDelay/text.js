// Yayılma gecikmesi ekranının kullanıcıya görünen metinleri — iki dilli (tr/en).
//
// Hesap katmanı yalnızca kod ve sayı üretir; dile çeviri burada yapılır.
// Ekran `getText(lang)` çağırır; koşullu metin üreten yerler (yorum, hata
// nedeni) fonksiyon olarak döner ki mantık tek kopya kalsın.

import { fmt, fmtEng } from '../../../lib/num'
import { pick } from '../../../lib/i18n'
import { C0 } from '../../../lib/units'
import { EPS_GEOMETRY, EPS_STRUCT_STRIPLINE } from '../../../lib/epsEff'
import { commonText } from '../../../data/uiText'
import { REASON_EPS } from './model'

export function getText(lang) {
  const t = (dict) => pick(dict, lang)
  // Yüzde işaretinin yeri dile göre değişir; tek yetkili yer uiText'teki `pct`.
  const { pct } = commonText(lang)

  // εeff kaynağı ortak bileşenden geliyor; yorum metni de ortak kalıpta ki
  // sinyal bütünlüğü ekranlarında aynı ifade kullanılsın.
  const epsSourceNote = (eps) => {
    if (eps.source !== EPS_GEOMETRY) {
      return {
        level: 'warn',
        text: t({
          tr: `εeff = ${fmt(eps.epsEff, 4)} elle girildi. Değerin doğruluğu girene aittir; empedans aracından ya da üretici yığın raporundan alınmalıdır.`,
          en: `εeff = ${fmt(eps.epsEff, 4)} was entered manually. Its accuracy is the responsibility of whoever entered it; it should come from the impedance tool or the fabricator stack-up report.`,
        }),
      }
    }

    if (eps.structure === EPS_STRUCT_STRIPLINE) {
      return {
        level: 'ok',
        text: t({
          tr: `Stripline homojen dielektriktedir, εeff = εr = ${fmt(eps.epsEff, 4)}. Geometri bu değeri değiştirmez.`,
          en: `Stripline is in a homogeneous dielectric, εeff = εr = ${fmt(eps.epsEff, 4)}. Geometry does not change this value.`,
        }),
      }
    }

    return {
      level: 'warn',
      text: t({
        tr: `εeff = ${fmt(eps.epsEff, 4)} microstrip geometrisinden kapalı formla hesaplandı (${eps.model}); aynı geometrinin Z₀ değeri ${fmt(eps.Z0, 4)} Ω. Bu değer alan çözücüden gelmediği için üretime hazır sayılmaz — buradan türeyen sonuçlar da aynı etiketi taşır.`,
        en: `εeff = ${fmt(eps.epsEff, 4)} was computed from the microstrip geometry with a closed form (${eps.model}); the Z₀ of the same geometry is ${fmt(eps.Z0, 4)} Ω. Since this value does not come from a field solver, it is not considered production-ready — the results derived from it carry the same label.`,
      }),
    }
  }

  const epsRangeNote = (eps) => {
    if (eps.source !== EPS_GEOMETRY || eps.inRange) return null
    return {
      level: 'danger',
      text: t({
        tr: 'Girilen geometri kapalı formun güvenilir aralığının dışında. εeff sapması buradan türeyen tüm gecikme ve uzunluk sonuçlarına geçer.',
        en: 'The entered geometry is outside the reliable range of the closed form. The εeff deviation passes through to every delay and length result derived from it.',
      }),
    }
  }

  return {
    backlink: t({ tr: '← Sinyal Bütünlüğü', en: '← Signal Integrity' }),
    title: t({
      tr: 'Yayılma Gecikmesi ve Dalga Boyu',
      en: 'Propagation Delay & Wavelength',
    }),
    intro: t({
      tr: 'Hattın birim uzunluk gecikmesini, toplam gecikmesini, yayılma hızını ve kart üzerindeki '
        + 'dalga boyunu hesaplar; hattın elektriksel uzunluğunu derece cinsinden verir.',
      en: 'Computes the line’s per-unit-length delay, total delay, propagation velocity and '
        + 'on-board wavelength; gives the line’s electrical length in degrees.',
    }),

    fields: {
      length: { label: t({ tr: 'Hat uzunluğu', en: 'Trace length' }) },
      freq: {
        label: t({ tr: 'Frekans', en: 'Frequency' }),
        hint: t({
          tr: 'Dalga boyu ve elektriksel uzunluk bu frekansta hesaplanır',
          en: 'Wavelength and electrical length are computed at this frequency',
        }),
      },
    },

    // Hata mesajında alan adı olarak görünen etiketler; model.js'e verilir.
    // eps* anahtarları ortak εeff bloğunun alanlarıdır.
    fieldLabels: {
      length: t({ tr: 'Hat uzunluğu', en: 'Trace length' }),
      freq: t({ tr: 'Frekans', en: 'Frequency' }),
      epsEffManual: t({ tr: 'Efektif dielektrik sabiti (εeff)', en: 'Effective dielectric constant (εeff)' }),
      epsR: t({ tr: 'Dielektrik sabiti (εr)', en: 'Dielectric constant (εr)' }),
      epsW: t({ tr: 'Hat genişliği (W)', en: 'Trace width (W)' }),
      epsH: t({ tr: 'Dielektrik yüksekliği (H)', en: 'Dielectric height (H)' }),
      epsT: t({ tr: 'Bakır kalınlığı (t)', en: 'Copper thickness (t)' }),
    },

    bigResult: t({ tr: 'Birim uzunluk gecikmesi', en: 'Delay per unit length' }),
    bigResultAlt: (delay, degrees) => t({
      tr: `toplam ${delay}  ·  ${degrees}° elektriksel uzunluk`,
      en: `total ${delay}  ·  ${degrees}° electrical length`,
    }),

    table: {
      tpd: t({ tr: 'Birim uzunluk gecikmesi', en: 'Delay per unit length' }),
      delay: t({ tr: 'Toplam gecikme', en: 'Total delay' }),
      vp: t({ tr: 'Yayılma hızı', en: 'Propagation velocity' }),
      lambda0: t({ tr: 'Havada dalga boyu (λ₀)', en: 'Wavelength in air (λ₀)' }),
      lambdaG: t({ tr: 'Kartta dalga boyu (λg)', en: 'Wavelength on the board (λg)' }),
      quarter: t({ tr: 'Çeyrek dalga (λ/4)', en: 'Quarter wave (λ/4)' }),
      half: t({ tr: 'Yarım dalga (λ/2)', en: 'Half wave (λ/2)' }),
      electricalLength: t({ tr: 'Elektriksel uzunluk', en: 'Electrical length' }),
      fraction: t({ tr: 'Dalga boyuna oran', en: 'Fraction of a wavelength' }),
      quarterWaveFreq: t({
        tr: 'Bu uzunluğun çeyrek dalga frekansı',
        en: 'Quarter-wave frequency of this length',
      }),
    },

    formula: t({
      tr: `t'_pd = √εeff / c
  (birim uzunluk gecikmesi)
t_pd = L · √εeff / c

Pratik:
  t'_pd ≈ 3.33564·√εeff ps/mm

v_p = c / √εeff

λ₀ = c / f
λg = c / (f·√εeff)

λ/4 = λg / 4
λ/2 = λg / 2

Elektriksel uzunluk:
  derece = 360°·(L / λg)
  radyan = 2π·(L / λg)`,
      en: `t'_pd = √εeff / c
  (delay per unit length)
t_pd = L · √εeff / c

Practical:
  t'_pd ≈ 3.33564·√εeff ps/mm

v_p = c / √εeff

λ₀ = c / f
λg = c / (f·√εeff)

λ/4 = λg / 4
λ/2 = λg / 2

Electrical length:
  degrees = 360°·(L / λg)
  radians = 2π·(L / λg)`,
    }),

    detail: {
      epsSource: (eps) => t({
        tr: `εeff kaynağı: ${eps.source === EPS_GEOMETRY
          ? `geometriden hesaplandı (${eps.model}, yöntem \`${eps.method}\`)`
          : 'elle girildi'}.`,
        en: `εeff source: ${eps.source === EPS_GEOMETRY
          ? `computed from geometry (${eps.model}, method \`${eps.method}\`)`
          : 'entered manually'}.`,
      }),
      sqrtEps: (v) => t({
        tr: `√εeff = ${v}; gecikme bu çarpanla ölçeklenir.`,
        en: `√εeff = ${v}; the delay scales with this factor.`,
      }),
      practicalCoeff: t({
        tr: 'Pratik yaklaşım katsayısı 3.33564 aslında 1e9/c değerinin yuvarlanmışıdır.',
        en: 'The practical approximation coefficient 3.33564 is in fact a rounded 1e9/c.',
      }),
      noRounding: t({
        tr: 'Ara değerlerde yuvarlama yapılmaz; yalnızca gösterim yuvarlanır.',
        en: 'Intermediate values are never rounded; only the display is rounded.',
      }),
    },

    validity: [
      t({
        tr: 'Hat kayıpsız ve dispersiyonsuz kabul edilir; tüm frekans bileşenleri aynı hızda '
          + 'ilerler.',
        en: 'The line is taken as lossless and dispersion-free; all frequency components travel '
          + 'at the same velocity.',
      }),
      t({
        tr: 'Dielektrik sabiti frekanstan bağımsız alınır. Gerçek Dk frekansla düşer ve geniş '
          + 'bantlı sinyalde tek değer yetmez.',
        en: 'The dielectric constant is taken as frequency-independent. Real Dk drops with '
          + 'frequency and a single value is not enough for a wideband signal.',
      }),
      t({
        tr: 'Microstrip\'te alan kısmen havada ilerler; εeff bu yüzden εr\'den küçüktür ve '
          + 'geometriye bağlıdır. Stripline\'da homojen dielektrik nedeniyle εeff = εr.',
        en: 'In microstrip the field partly travels in air; εeff is therefore smaller than εr '
          + 'and depends on the geometry. In stripline εeff = εr because of the homogeneous '
          + 'dielectric.',
      }),
      t({
        tr: 'Via geçişleri, konnektör ve pad süreksizlikleri gecikmeye eklenmez.',
        en: 'Via transitions, connectors and pad discontinuities are not added to the delay.',
      }),
      t({
        tr: 'Sonuçlar yaklaşıktır — kritik tasarımlarda üretici verisi ve ölçümle doğrulayın.',
        en: 'Results are approximate — verify against manufacturer data and measurement for '
          + 'critical designs.',
      }),
    ],

    chart: {
      x: t({ tr: 'Frekans (Hz)', en: 'Frequency (Hz)' }),
      y: t({ tr: 'Elektriksel uzunluk (°)', en: 'Electrical length (°)' }),
      caption: t({
        tr: 'Hat, frekans yükseldikçe dalga boyunun daha büyük bir kesrini kaplar. 90° çeyrek '
          + 'dalga, 180° yarım dalgadır — bu eşitlerde hat rezonans gibi davranır ve sonlandırma '
          + 'kritikleşir.',
        en: 'As the frequency rises the line spans a larger fraction of the wavelength. 90° is a '
          + 'quarter wave, 180° a half wave — at these points the line behaves resonantly and '
          + 'termination becomes critical.',
      }),
    },
    legendElectricalLength: t({ tr: 'elektriksel uzunluk', en: 'electrical length' }),
    legendQuarter: t({ tr: 'çeyrek dalga (90°)', en: 'quarter wave (90°)' }),
    legendHalf: t({ tr: 'yarım dalga (180°)', en: 'half wave (180°)' }),
    refQuarter: 'λ/4 — 90°',
    refHalf: 'λ/2 — 180°',
    operatingFrequency: t({ tr: 'çalışma frekansı', en: 'operating frequency' }),

    schematic: {
      title: t({ tr: 'Hat üzerinde dalga', en: 'Wave on the line' }),
      captionLong: t({
        tr: 'Hat dört dalga boyundan uzun — çizimde ilk dört periyot gösteriliyor',
        en: 'The line is longer than four wavelengths — the drawing shows the first four periods',
      }),
      captionShort: t({
        tr: 'Bir tam periyot bir dalga boyudur',
        en: 'One full period is one wavelength',
      }),
    },

    reasonText: (reason) => {
      if (reason === REASON_EPS) {
        return t({
          tr: 'Efektif dielektrik sabiti hesaplanamadı. Elle giriyorsanız değer 1\'den büyük '
            + 'olmalı; geometriden hesaplıyorsanız W, H ve εr değerlerini kontrol edin.',
          en: 'The effective dielectric constant could not be computed. If entering manually, '
            + 'the value must be greater than 1; if computing from geometry, check the W, H and '
            + 'εr values.',
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
      const out = [epsSourceNote(r.eps)]
      const range = epsRangeNote(r.eps)
      if (range) out.push(range)

      out.push({
        level: 'ok',
        text: t({
          tr: `Birim uzunluk gecikmesi ${fmt(r.tpdPsPerMm, 4)} ps/mm; ${fmtEng(r.length, 'm', 3)} hat ${fmtEng(r.delay, 's', 4)} gecikme üretir.`,
          en: `The delay per unit length is ${fmt(r.tpdPsPerMm, 4)} ps/mm; a ${fmtEng(r.length, 'm', 3)} line produces ${fmtEng(r.delay, 's', 4)} of delay.`,
        }),
      })

      out.push({
        level: 'ok',
        text: t({
          tr: `Sinyal kartta ${fmtEng(r.vp, 'm/s', 4)} hızla ilerliyor — boşluktaki hızın ${pct(fmt((r.vp / C0) * 100, 3))}'i.`,
          en: `The signal travels on the board at ${fmtEng(r.vp, 'm/s', 4)} — ${pct(fmt((r.vp / C0) * 100, 3))} of the speed in free space.`,
        }),
      })

      out.push({
        level: r.fraction > 0.25 ? 'danger' : r.fraction > 0.1 ? 'warn' : 'ok',
        text: r.fraction > 0.1
          ? t({
            tr: `Hat, çalışma frekansında dalga boyunun ${fmt(r.fraction, 4)} katı (${fmt(r.degrees, 4)}°). Bu oranda hat toplu eleman gibi davranmaz; kontrollü empedans ve sonlandırma gerekir.`,
            en: `At the operating frequency the line is ${fmt(r.fraction, 4)} of a wavelength (${fmt(r.degrees, 4)}°). At this ratio the line does not behave as a lumped element; controlled impedance and termination are required.`,
          })
          : t({
            tr: `Hat, dalga boyunun ${fmt(r.fraction, 4)} katı (${fmt(r.degrees, 4)}°) — elektriksel olarak kısa sayılır.`,
            en: `The line is ${fmt(r.fraction, 4)} of a wavelength (${fmt(r.degrees, 4)}°) — it counts as electrically short.`,
          }),
      })

      out.push({
        level: 'ok',
        text: t({
          tr: `Bu uzunluk ${fmtEng(r.quarterWaveFreq, 'Hz', 4)} frekansında çeyrek dalga olur; o noktada hattın giriş empedansı uç yükünün tersine döner.`,
          en: `This length becomes a quarter wave at ${fmtEng(r.quarterWaveFreq, 'Hz', 4)}; at that point the line’s input impedance inverts the load at its end.`,
        }),
      })

      out.push({
        level: 'warn',
        text: t({
          tr: 'Dielektrik sabiti frekansla düşer. Geniş bantlı sinyallerde tek bir εeff değeri yeterli değildir; üreticinin frekansa bağlı verisi kullanılmalıdır.',
          en: 'The dielectric constant drops with frequency. For wideband signals a single εeff value is not enough; the manufacturer’s frequency-dependent data must be used.',
        }),
      })

      return out
    },
  }
}
