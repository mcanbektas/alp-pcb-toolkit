// Kritik hat uzunluğu ekranının kullanıcıya görünen metinleri — iki dilli (tr/en).
//
// Hesap katmanı yalnızca kod ve sayı üretir; dile çeviri burada yapılır.
// Ekran `getText(lang)` çağırır ve çözülmüş metin nesnesini kullanır; koşullu
// metin üreten yerler (yorum, hata nedeni) fonksiyon olarak döner ki mantık
// tek kopya kalsın, yalnızca dizeler dile göre seçilsin.

import { fmt, fmtEng } from '../../../lib/num'
import { pick } from '../../../lib/i18n'
import { EPS_GEOMETRY, EPS_STRUCT_STRIPLINE } from '../../../lib/epsEff'
import { REASON_EPS, REASON_CRITICAL, REASON_BANDWIDTH, K_MIN, K_MAX } from './model'

export function getText(lang) {
  const t = (dict) => pick(dict, lang)

  // Kriter etiketleri — bölen değeri motordaki CRITICAL_DIVISORS listesinden gelir.
  const divisorLabel = {
    6: t({ tr: '1/6 — konservatif (t_d ≥ t_r/6)', en: '1/6 — conservative (t_d ≥ t_r/6)' }),
    4: t({ tr: '1/4 — orta (t_d ≥ t_r/4)', en: '1/4 — moderate (t_d ≥ t_r/4)' }),
    2: t({ tr: '1/2 — gevşek (t_d ≥ t_r/2)', en: '1/2 — relaxed (t_d ≥ t_r/2)' }),
  }

  const divisorShortMap = {
    6: t({ tr: '1/6 (konservatif)', en: '1/6 (conservative)' }),
    4: t({ tr: '1/4 (orta)', en: '1/4 (moderate)' }),
    2: t({ tr: '1/2 (gevşek)', en: '1/2 (relaxed)' }),
  }

  // Tanımsız bölende sayısal karşılığa düşer; ekran kendi yedeğini yazmasın.
  const divisorShort = (d) => divisorShortMap[d] ?? `1/${fmt(d, 3)}`

  // Spec §7.4 artık aktif olarak sürdürülmeyen bir kılavuz yönteminden de söz
  // ediyor. O yöntem bu araçta uygulanmadı; sessizce atlanmıyor, ekranda yazıyor.
  const legacyMethodNote = t({
    tr: 'Maksimum hat uzunluğu, artık aktif olarak sürdürülmeyen bir kılavuza dayanan frekans '
      + 'alanı yöntemiyle de kestirilebilir. Bu araçta o yöntem UYGULANMADI: buradaki sonuç '
      + 'yalnızca yükselme süresi kriterinden gelir, kılavuz yönteminin sonucuymuş gibi '
      + 'okunmamalıdır.',
    en: 'The maximum trace length can also be estimated with a frequency-domain method based on '
      + 'a guideline that is no longer actively maintained. That method is NOT IMPLEMENTED in '
      + 'this tool: the result here comes only from the rise time criterion and must not be read '
      + 'as the output of the guideline method.',
  })

  // εeff kaynağı ortak bileşenden geliyor; yorum metni de aynı kalıpta olsun ki
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
        tr: `εeff = ${fmt(eps.epsEff, 4)} microstrip geometrisinden kapalı formla hesaplandı (${eps.model}); aynı geometrinin Z₀ değeri ${fmt(eps.Z0, 4)} Ω. Bu değer alan çözücüden gelmediği için üretime hazır sayılmaz — buradan türeyen kritik uzunluk da aynı etiketi taşır.`,
        en: `εeff = ${fmt(eps.epsEff, 4)} was computed from the microstrip geometry with a closed form (${eps.model}); the Z₀ of the same geometry is ${fmt(eps.Z0, 4)} Ω. Because it does not come from a field solver it is not considered production-ready — the critical length derived from it carries the same label.`,
      }),
    }
  }

  const epsRangeNote = (eps) => {
    if (eps.source !== EPS_GEOMETRY || eps.inRange) return null
    return {
      level: 'danger',
      text: t({
        tr: 'Girilen geometri kapalı formun güvenilir aralığının dışında. εeff sapması doğrudan kritik uzunluğa geçer: L_crit değeri √εeff ile ters orantılıdır.',
        en: 'The entered geometry is outside the reliable range of the closed form. The εeff error propagates directly into the critical length: L_crit is inversely proportional to √εeff.',
      }),
    }
  }

  return {
    backlink: t({ tr: '← Sinyal Bütünlüğü', en: '← Signal Integrity' }),
    title: t({ tr: 'Kritik Hat Uzunluğu', en: 'Critical Trace Length' }),
    intro: t({
      tr: 'Hattın ne zaman iletim hattı gibi ele alınması gerektiğini yükselme süresi kriterinden '
        + 'hesaplar; üç kriterin verdiği eşiği karşılaştırır ve girilen hat uzunluğunu eşiğe göre '
        + 'değerlendirir.',
      en: 'Computes from the rise time criterion when a trace must be treated as a transmission '
        + 'line; compares the thresholds given by three criteria and evaluates the entered trace '
        + 'length against the threshold.',
    }),

    divisorLabel,
    divisorShort,

    fields: {
      tr: {
        label: t({ tr: 'Yükselme süresi (t_r)', en: 'Rise time (t_r)' }),
        hint: t({
          tr: 'Sürücünün gerçek kenar hızı — veri sayfasındaki tipik değer genelde iyimserdir',
          en: 'The driver’s actual edge rate — the typical value in the datasheet is usually optimistic',
        }),
      },
      divisor: {
        label: t({ tr: 'Kriter', en: 'Criterion' }),
        hint: t({ tr: 'Mutlak sınır değil, tasarım eşiği', en: 'A design threshold, not an absolute limit' }),
      },
      k: {
        label: t({ tr: 'Bant genişliği katsayısı (K)', en: 'Bandwidth coefficient (K)' }),
        hint: t({
          tr: `f_BW = K / t_r — ${fmt(K_MIN, 3)} birinci dereceden sistem, ${fmt(K_MAX, 3)}'e kadar seçilebilir`,
          en: `f_BW = K / t_r — ${fmt(K_MIN, 3)} is the first-order system value, up to ${fmt(K_MAX, 3)} can be selected`,
        }),
      },
      length: {
        label: t({ tr: 'Hat uzunluğu (isteğe bağlı)', en: 'Trace length (optional)' }),
        hint: t({
          tr: 'Girilirse hat eşiğin üstünde mi diye kontrol edilir',
          en: 'If entered, the trace is checked against the threshold',
        }),
      },
    },

    // Hata mesajında alan adı olarak görünen etiketler; model.js'e verilir.
    fieldLabels: {
      tr: t({ tr: 'Yükselme süresi (t_r)', en: 'Rise time (t_r)' }),
      divisor: t({ tr: 'Kriter böleni', en: 'Criterion divisor' }),
      k: t({ tr: 'Bant genişliği katsayısı (K)', en: 'Bandwidth coefficient (K)' }),
      length: t({ tr: 'Hat uzunluğu', en: 'Trace length' }),
      epsEffManual: t({
        tr: 'Efektif dielektrik sabiti (εeff)',
        en: 'Effective dielectric constant (εeff)',
      }),
      epsR: t({ tr: 'Dielektrik sabiti (εr)', en: 'Dielectric constant (εr)' }),
      epsW: t({ tr: 'Hat genişliği (W)', en: 'Trace width (W)' }),
      epsH: t({ tr: 'Dielektrik yüksekliği (H)', en: 'Dielectric height (H)' }),
      epsT: t({ tr: 'Bakır kalınlığı (t)', en: 'Copper thickness (t)' }),
    },

    bigLabel: t({ tr: 'Kritik hat uzunluğu', en: 'Critical trace length' }),
    bigAltCriterion: t({ tr: 'kriter', en: 'criterion' }),

    // Sonuç panelinde .big-result'ın hemen altında duran yöntem etiketleri.
    methodNote: t({
      tr: 'Sonuç yükselme süresi kriterinden gelir: L_crit = c·t_r / (N·√εeff). '
        + 'Bu bir tasarım eşiğidir, mutlak fiziksel sınır değildir — eşiğin altındaki hat da '
        + 'iletim hattıdır, yalnızca yansımaların etkisi çoğu tasarımda ihmal edilebilir sayılır.',
      en: 'The result comes from the rise time criterion: L_crit = c·t_r / (N·√εeff). '
        + 'This is a design threshold, not an absolute physical limit — a trace below the '
        + 'threshold is still a transmission line, only the effect of reflections is considered '
        + 'negligible in most designs.',
    }),

    legacyMethodNote,

    // Yorum satırlarının seviyesini belirleyen iki ek eşik spec'te yok; kaynağı
    // gizlenmesin diye ekranda .method-note olarak yazılıyor.
    levelSourceNote: t({
      tr: 'Yorum satırlarının seviyesi hesaplanan eşiğin yanında iki ek orana bakar: '
        + 'L > 2·L_crit "sınırın dışında", eşiğin altında kalan hatlarda L > 0.5·L_crit '
        + '"sınıra yakın" sayılır. Bu iki oranın yerleşik bir kaynağı YOK — yaygın kriter '
        + 'yalnızca 1/6, 1/4, 1/2 bölenlerini ve L ile L_crit karşılaştırmasını tanımlar. '
        + '"2 kat" ve "0.5 oranı" bu '
        + 'aracın kendi mühendislik yargısıdır; hesaplanan kritik uzunluğu değiştirmez, yalnızca '
        + 'yorumun vurgusunu belirler.',
      en: 'The level of the commentary lines looks at two extra ratios beside the computed '
        + 'threshold: L > 2·L_crit counts as "outside the limit", and for traces below the '
        + 'threshold L > 0.5·L_crit counts as "near the limit". These two ratios have NO '
        + 'established source — the common criterion defines only the 1/6, 1/4 and 1/2 divisors '
        + 'and the comparison of L with L_crit. The "factor of 2" and the "0.5 ratio" are this '
        + 'tool’s own engineering judgement; they do not change the computed critical length, '
        + 'they only set the emphasis of the commentary.',
    }),

    table: {
      criticalSelected: t({
        tr: 'Kritik uzunluk (seçilen kriter)',
        en: 'Critical length (selected criterion)',
      }),
      criticalWith: (divisor) => t({
        tr: `Kriter 1/${fmt(divisor, 2)} ile`,
        en: `With criterion 1/${fmt(divisor, 2)}`,
      }),
      tpd: t({ tr: 'Birim uzunluk gecikmesi', en: 'Per-unit-length delay' }),
      riseTime: t({ tr: 'Yükselme süresi', en: 'Rise time' }),
      fBW: t({
        tr: 'Yükselme süresi bant genişliği (f_BW)',
        en: 'Rise time bandwidth (f_BW)',
      }),
      k: t({ tr: 'Bant genişliği katsayısı (K)', en: 'Bandwidth coefficient (K)' }),
      length: t({ tr: 'Hat uzunluğu', en: 'Trace length' }),
      delay: t({ tr: 'Hat gecikmesi (t_d)', en: 'Trace delay (t_d)' }),
      delayFraction: t({ tr: 'Gecikme / yükselme süresi', en: 'Delay / rise time' }),
      ratio: t({ tr: 'Uzunluk / kritik uzunluk', en: 'Length / critical length' }),
      transmissionLine: t({
        tr: 'İletim hattı gibi davranıyor mu',
        en: 'Behaves like a transmission line',
      }),
      transmissionLineYes: t({ tr: 'evet — eşiğin üstünde', en: 'yes — above the threshold' }),
      transmissionLineNo: t({ tr: 'hayır — eşiğin altında', en: 'no — below the threshold' }),
    },

    reasonText: (reason) => {
      if (reason === REASON_EPS) {
        return t({
          tr: 'Efektif dielektrik sabiti hesaplanamadı. Elle giriyorsanız değer 1\'den büyük olmalı; geometriden hesaplıyorsanız W, H ve εr değerlerini kontrol edin.',
          en: 'The effective dielectric constant could not be computed. If entering it manually the value must be greater than 1; if computing from geometry, check the W, H and εr values.',
        })
      }
      if (reason === REASON_CRITICAL) {
        return t({
          tr: 'Kritik uzunluk hesaplanamadı. Yükselme süresi ve kriter böleni pozitif, εeff 1\'den büyük olmalı.',
          en: 'The critical length could not be computed. The rise time and the criterion divisor must be positive and εeff must be greater than 1.',
        })
      }
      if (reason === REASON_BANDWIDTH) {
        return t({
          tr: `Yükselme süresi bant genişliği hesaplanamadı. Katsayı K ${fmt(K_MIN, 3)} ile ${fmt(K_MAX, 3)} arasında olmalı.`,
          en: `The rise time bandwidth could not be computed. The coefficient K must be between ${fmt(K_MIN, 3)} and ${fmt(K_MAX, 3)}.`,
        })
      }
      return t({
        tr: `Tüm zorunlu alanlara pozitif sayısal değer girin; K katsayısı ${fmt(K_MIN, 3)}–${fmt(K_MAX, 3)} aralığında olmalıdır. Hat uzunluğu isteğe bağlıdır. Ondalık için nokta veya virgül kullanabilirsiniz (0.25 = 0,25).`,
        en: `Enter a positive numeric value in every required field; the coefficient K must be in the ${fmt(K_MIN, 3)}–${fmt(K_MAX, 3)} range. The trace length is optional. Use a point or a comma for decimals (0.25 = 0,25).`,
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
          tr: `Seçilen kriter ${divisorShort(r.divisor)}: kritik uzunluk ${fmtEng(r.critical, 'm', 4)}. Birim uzunluk gecikmesi ${fmt(r.tpdPsPerMm, 4)} ps/mm.`,
          en: `Selected criterion ${divisorShort(r.divisor)}: critical length ${fmtEng(r.critical, 'm', 4)}. Per-unit-length delay ${fmt(r.tpdPsPerMm, 4)} ps/mm.`,
        }),
      })

      // Kriterin ne kadar belirleyici olduğunu üç değeri yan yana koyarak göster
      const spread = r.byDivisor.map((b) => `1/${fmt(b.divisor, 2)} → ${fmtEng(b.critical, 'm', 3)}`).join(', ')
      const widest = r.byDivisor.reduce((a, b) => (b.critical > a.critical ? b : a))
      const tightest = r.byDivisor.reduce((a, b) => (b.critical < a.critical ? b : a))

      out.push({
        level: 'warn',
        text: t({
          tr: `Aynı yığın ve aynı yükselme süresiyle üç kriter üç farklı eşik veriyor: ${spread}. En gevşek kriter en konservatifin ${fmt(widest.critical / tightest.critical, 3)} katı uzunluk veriyor — "kritik uzunluk" tek bir fiziksel sayı değildir, hangi kriterin seçildiğine bağlıdır.`,
          en: `With the same stack-up and the same rise time the three criteria give three different thresholds: ${spread}. The most relaxed criterion gives ${fmt(widest.critical / tightest.critical, 3)} times the length of the most conservative one — "critical length" is not a single physical number, it depends on which criterion is selected.`,
        }),
      })

      out.push({
        level: 'warn',
        text: t({
          tr: 'Bu kriter mutlak fiziksel sınır değil, tasarım eşiğidir. Eşiğin altındaki hat iletim hattı olmaktan çıkmaz; yalnızca yansımaların etkisi çoğu tasarımda ihmal edilebilir kabul edilir. Saat, reset ve hızlı kenarlı kontrol hatlarında eşiğin altında da sonlandırma gerekebilir.',
          en: 'This criterion is a design threshold, not an absolute physical limit. A trace below the threshold does not stop being a transmission line; only the effect of reflections is taken as negligible in most designs. Clock, reset and fast-edge control lines may still need termination below the threshold.',
        }),
      })

      if (r.hasLength) {
        // "2 kat" eşiği spec §7.4'ten gelmez; spec yalnızca L > L_crit
        // karşılaştırmasını tanımlar. Bu aracın mühendislik yargısı —
        // kullanıcıya levelSourceNote ile yazılıyor.
        const level = r.ratio > 2 ? 'danger' : r.ratio > 1 ? 'warn' : 'ok'
        out.push({
          level,
          text: r.transmissionLine
            ? t({
              tr: `Hat uzunluğu ${fmtEng(r.length, 'm', 4)}, kritik uzunluğun ${fmt(r.ratio, 4)} katı — seçilen kritere göre iletim hattı gibi davranıyor. Kontrollü empedans, sonlandırma ve dönüş yolu sürekliliği değerlendirilmelidir.`,
              en: `The trace length is ${fmtEng(r.length, 'm', 4)}, ${fmt(r.ratio, 4)} times the critical length — by the selected criterion it behaves like a transmission line. Controlled impedance, termination and return-path continuity must be evaluated.`,
            })
            : t({
              tr: `Hat uzunluğu ${fmtEng(r.length, 'm', 4)}, kritik uzunluğun ${fmt(r.ratio, 4)} katı — seçilen kriterin altında kalıyor. Bu kriterle hat toplu eleman gibi ele alınabilir.`,
              en: `The trace length is ${fmtEng(r.length, 'm', 4)}, ${fmt(r.ratio, 4)} times the critical length — it stays below the selected criterion. Under this criterion the trace can be treated as a lumped element.`,
            }),
        })

        out.push({
          level: 'ok',
          text: t({
            tr: `Hat gecikmesi ${fmtEng(r.delay, 's', 4)}; yükselme süresinin ${fmt(r.delayFraction, 4)} katı. Kriter bu oranın 1/${fmt(r.divisor, 2)} = ${fmt(1 / r.divisor, 4)} değerini aşmasını eşik sayıyor.`,
            en: `The trace delay is ${fmtEng(r.delay, 's', 4)}; ${fmt(r.delayFraction, 4)} times the rise time. The criterion takes this ratio exceeding 1/${fmt(r.divisor, 2)} = ${fmt(1 / r.divisor, 4)} as the threshold.`,
          }),
        })

        // "0.5 oranı" da spec'te değil, bu aracın yargısı — bkz. levelSourceNote.
        if (!r.transmissionLine && r.ratio > 0.5) {
          out.push({
            level: 'warn',
            text: t({
              tr: 'Hat eşiğin altında ama sınıra yakın. Yığın toleransı, εeff belirsizliği veya sürücünün veri sayfasındakinden hızlı çıkan gerçek kenarı bu payı kolayca yer.',
              en: 'The trace is below the threshold but close to the limit. Stack-up tolerance, εeff uncertainty or a driver edge that turns out faster than the datasheet value can easily consume this margin.',
            }),
          })
        }
      } else {
        out.push({
          level: 'ok',
          text: t({
            tr: 'Hat uzunluğu girilmedi; yalnızca eşik hesaplandı. Karşılaştırma, gecikme oranı ve "iletim hattı gibi davranıyor mu" satırları için hat uzunluğunu girin.',
            en: 'No trace length was entered; only the threshold was computed. Enter the trace length for the comparison, the delay ratio and the "behaves like a transmission line" rows.',
          }),
        })
      }

      out.push({
        level: 'warn',
        text: t({
          tr: `Yükselme süresi bant genişliği f_BW = ${fmtEng(r.bw.fBW, 'Hz', 4)} (K = ${fmt(r.bw.k, 3)}). Bu değer VERİ HIZI DEĞİLDİR; sürücü kenarının kapladığı yaklaşık spektrum genişliğidir. Yığın, via ve dielektrik kayıp değerlendirmesi saat frekansına göre değil bu frekansa göre yapılır.`,
          en: `The rise time bandwidth is f_BW = ${fmtEng(r.bw.fBW, 'Hz', 4)} (K = ${fmt(r.bw.k, 3)}). This value is NOT THE DATA RATE; it is the approximate spectral width occupied by the driver edge. Stack-up, via and dielectric loss assessment is done against this frequency, not against the clock frequency.`,
        }),
      })

      // Oran yalnızca K büyütüldüğünde bilgi taşır; K = K_MIN iken 1 katıdır.
      out.push({
        level: 'ok',
        text: r.bw.k > K_MIN
          ? t({
            tr: `K = ${fmt(K_MIN, 3)} birinci dereceden eşdeğer sistem içindir; daha geniş spektral içerik tahmini için ${fmt(K_MAX, 3)}'e kadar seçilebilir. Seçilen K = ${fmt(r.bw.k, 3)} ile f_BW, ${fmt(K_MIN, 3)} katsayısına göre ${fmt(r.bw.k / K_MIN, 4)} katına çıkar.`,
            en: `K = ${fmt(K_MIN, 3)} is for a first-order equivalent system; up to ${fmt(K_MAX, 3)} can be selected to estimate wider spectral content. With the selected K = ${fmt(r.bw.k, 3)}, f_BW rises to ${fmt(r.bw.k / K_MIN, 4)} times its value at the ${fmt(K_MIN, 3)} coefficient.`,
          })
          : t({
            tr: `K = ${fmt(K_MIN, 3)} seçili: aralığın en dar ucu, birinci dereceden eşdeğer sistem katsayısı. f_BW bu katsayıyla en düşük değerini alır; daha geniş spektral içerik tahmini için ${fmt(K_MAX, 3)}'e kadar yükseltilebilir ve f_BW aynı oranda büyür.`,
            en: `K = ${fmt(K_MIN, 3)} is selected: the narrowest end of the range, the first-order equivalent system coefficient. f_BW takes its lowest value with this coefficient; it can be raised up to ${fmt(K_MAX, 3)} to estimate wider spectral content, and f_BW grows in the same proportion.`,
          }),
      })

      out.push({
        level: 'warn',
        text: t({
          tr: 'Kritik uzunluk yükselme süresine bağlıdır, saat frekansına değil. Veri sayfasındaki tipik t_r değeri genellikle iyimserdir: aynı sürücü hızlı köşe (fast corner) koşulunda daha keskin kenar üretir ve eşik kısalır. Elinizde en hızlı kenarla hesaplayın.',
          en: 'The critical length depends on the rise time, not on the clock frequency. The typical t_r in the datasheet is usually optimistic: the same driver produces a sharper edge at the fast corner and the threshold shortens. Compute with the fastest edge you have.',
        }),
      })

      out.push({
        level: 'warn',
        text: legacyMethodNote,
      })

      return out
    },

    formula: t({
      tr: `t'_pd = √εeff / c
  (birim uzunluk gecikmesi)
t_d = L · t'_pd
  (hat gecikmesi)

Kriter — N ∈ {6, 4, 2}:
  t_d ≥ t_r / N
    → iletim hattı değerlendirmesi

Kritik uzunluk:
  L_crit = t_r / (N · t'_pd)
         = c · t_r / (N · √εeff)

Oranlar:
  t_d / t_r
    (gecikmenin kenara oranı)
  L / L_crit
    (eşiğe uzaklık)

Yükselme süresi bant genişliği
— yaklaşık bağıntı:
  f_BW = K / t_r , K ∈ [0.35, 0.5]
  (bu değer VERİ HIZI DEĞİLDİR)`,
      en: `t'_pd = √εeff / c
  (per-unit-length delay)
t_d = L · t'_pd
  (trace delay)

Criterion — N ∈ {6, 4, 2}:
  t_d ≥ t_r / N
    → transmission line assessment

Critical length:
  L_crit = t_r / (N · t'_pd)
         = c · t_r / (N · √εeff)

Ratios:
  t_d / t_r
    (delay to edge ratio)
  L / L_crit
    (distance to the threshold)

Rise time bandwidth
— approximate relation:
  f_BW = K / t_r , K ∈ [0.35, 0.5]
  (this value is NOT THE DATA RATE)`,
    }),

    detail: {
      epsSource: (eps) => (eps.source === EPS_GEOMETRY
        ? t({
          tr: `εeff kaynağı: geometriden hesaplandı (${eps.model}, yöntem \`${eps.method}\`).`,
          en: `εeff source: computed from geometry (${eps.model}, method \`${eps.method}\`).`,
        })
        : t({
          tr: 'εeff kaynağı: elle girildi.',
          en: 'εeff source: entered manually.',
        })),
      sqrtEps: (value) => t({
        tr: `√εeff = ${value}; kritik uzunluk bu çarpanla ters orantılıdır.`,
        en: `√εeff = ${value}; the critical length is inversely proportional to this factor.`,
      }),
      divisorScale: t({
        tr: 'Kritik uzunluk bölenle ters orantılıdır: kriter 1/6’dan 1/2’ye gevşetilirse eşik '
          + 'üç katına çıkar. Sayısal karşılığı sonuç tablosundaki üç satırdır.',
        en: 'The critical length is inversely proportional to the divisor: relaxing the criterion '
          + 'from 1/6 to 1/2 triples the threshold. Its numerical counterpart is the three rows in '
          + 'the result table.',
      }),
      sharedTpd: t({
        tr: 'Hat gecikmesi ve kritik uzunluk aynı t’_pd değerinden gelir; εeff’teki sapma '
          + 'ikisine de aynı yönde geçer, oranları korunur.',
        en: 'The trace delay and the critical length come from the same t’_pd value; an error in '
          + 'εeff propagates into both in the same direction and their ratio is preserved.',
      }),
      fbwInfo: t({
        tr: 'f_BW yalnızca bilgi amaçlıdır: kritik uzunluk hesabına girmez, ayrı bir yan '
          + 'sonuçtur.',
        en: 'f_BW is for information only: it does not enter the critical length calculation, it '
          + 'is a separate side result.',
      }),
      noRounding: t({
        tr: 'Ara değerlerde yuvarlama yapılmaz; yalnızca gösterim yuvarlanır.',
        en: 'Intermediate values are never rounded; only the display is rounded.',
      }),
    },

    validity: [
      {
        strong: t({
          tr: 'Kriter eşiktir, sınır değildir.',
          en: 'The criterion is a threshold, not a limit.',
        }),
        rest: t({
          tr: ' 1/6, 1/4 ve 1/2 uygulamada kullanılan farklı tasarım eşikleridir. Eşiğin altındaki '
            + 'hat da fiziksel olarak iletim hattıdır; yalnızca yansımaların etkisi çoğu tasarımda '
            + 'ihmal edilebilir kabul edilir.',
          en: ' 1/6, 1/4 and 1/2 are different design thresholds used in practice. A trace below '
            + 'the threshold is physically still a transmission line; only the effect of '
            + 'reflections is taken as negligible in most designs.',
        }),
      },
      {
        strong: t({ tr: 'Uygulanmayan yöntem:', en: 'Method not implemented:' }),
        rest: t({
          tr: ' maksimum hat uzunluğu, artık aktif olarak '
            + 'sürdürülmeyen bir kılavuza dayanan frekans alanı yöntemiyle de kestirilebilir. '
            + 'O yöntem bu araçta uygulanmadı; sonuç yalnızca yükselme süresi kriterinden gelir.',
          en: ' the maximum trace length can also be estimated with a frequency-domain method '
            + 'based on a guideline that is no longer actively maintained. That method is not '
            + 'implemented in this tool; the result comes only from the rise time criterion.',
        }),
      },
      {
        strong: t({ tr: 'f_BW veri hızı değildir.', en: 'f_BW is not the data rate.' }),
        rest: t({
          tr: ' K/t_r ifadesi sürücü kenarının kapladığı '
            + 'yaklaşık spektrum genişliğidir. Sinyal bütünlüğü açısından belirleyici olan çoğunlukla '
            + 'saat frekansı değil, sürücünün yükselme ve düşme süresidir.',
          en: ' The expression K/t_r is the approximate spectral width occupied by the driver '
            + 'edge. What governs signal integrity is usually not the clock frequency but the '
            + 'driver’s rise and fall time.',
        }),
      },
      {
        rest: t({
          tr: 'εeff doğrudan sonuca girer: L_crit ∝ 1/√εeff. εeff elle girildiyse doğruluğu girene '
            + 'aittir; kapalı formdan geldiyse alan çözücü sonucu sayılmaz ve sapması buraya taşınır.',
          en: 'εeff enters the result directly: L_crit ∝ 1/√εeff. If εeff was entered manually its '
            + 'accuracy is the responsibility of whoever entered it; if it came from a closed form '
            + 'it does not count as a field-solver result and its error is carried over here.',
        }),
      },
      {
        rest: t({
          tr: 'Hat kayıpsız ve dispersiyonsuz kabul edilir; tüm frekans bileşenleri aynı hızda '
            + 'ilerler. Kenar, hat boyunca yavaşlamıyor varsayılır.',
          en: 'The line is assumed lossless and dispersion-free; all frequency components travel at '
            + 'the same speed. The edge is assumed not to slow down along the line.',
        }),
      },
      {
        rest: t({
          tr: 'Via geçişleri, konnektör, pad ve stub süreksizlikleri gecikmeye eklenmez. Dallanmış '
            + '(multi-drop) topolojide en uzun dal ayrı değerlendirilmelidir.',
          en: 'Via transitions, connectors, pads and stub discontinuities are not added to the '
            + 'delay. In a branched (multi-drop) topology the longest branch must be evaluated '
            + 'separately.',
        }),
      },
      {
        rest: t({
          tr: 'Yükselme süresi olarak sürücünün en hızlı kenarı kullanılmalıdır; hızlı köşe '
            + 'koşulunda kenar keskinleşir ve eşik kısalır.',
          en: 'The driver’s fastest edge must be used as the rise time; at the fast corner the edge '
            + 'sharpens and the threshold shortens.',
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
      x: t({ tr: 'Yükselme süresi t_r (s)', en: 'Rise time t_r (s)' }),
      y: t({ tr: 'Kritik uzunluk (mm)', en: 'Critical length (mm)' }),
      caption: t({
        tr: 'Kritik uzunluk yükselme süresiyle doğru orantılıdır: kenar hızlandıkça eşik kısalır. Üç eğri aynı yığında üç farklı kriterin verdiği eşiği gösterir — aralarındaki fark üç kata kadar çıkar, yani "kritik uzunluk" tek bir sayı değil, seçilen kritere bağlı bir tasarım eşiğidir.',
        en: 'The critical length is directly proportional to the rise time: as the edge gets faster the threshold shortens. The three curves show the thresholds given by three different criteria on the same stack-up — the difference between them reaches a factor of three, so "critical length" is not a single number but a design threshold that depends on the criterion selected.',
      }),
      criterionLegend: (divisor) => t({
        tr: `kriter 1/${divisor}`,
        en: `criterion 1/${divisor}`,
      }),
      lengthLegend: t({ tr: 'hat uzunluğu', en: 'trace length' }),
      lengthRef: (y) => t({
        tr: `hat uzunluğu ${fmt(y, 3)} mm`,
        en: `trace length ${fmt(y, 3)} mm`,
      }),
      operatingPoint: t({ tr: 'çalışma noktası', en: 'operating point' }),
    },

    schematic: {
      title: t({
        tr: 'Sürücü, hat ve kritik uzunluk karşılaştırması',
        en: 'Driver, trace and critical length comparison',
      }),
      driver: t({ tr: 'SÜR', en: 'DRV' }),
      receiver: t({ tr: 'ALC', en: 'RCV' }),
      captionAbove: t({
        tr: 'Hat kritik uzunluğun üstünde — iletim hattı değerlendirmesi gerekir',
        en: 'The trace is above the critical length — a transmission line assessment is required',
      }),
      captionBelow: t({
        tr: 'Hat kritik uzunluğun altında — seçilen kriterde toplu eleman',
        en: 'The trace is below the critical length — a lumped element under the selected criterion',
      }),
      captionThresholdOnly: t({
        tr: 'Yalnızca eşik gösteriliyor; hat uzunluğu girilmedi',
        en: 'Only the threshold is shown; no trace length was entered',
      }),
      captionIdle: t({ tr: 'Sürücü, hat ve alıcı', en: 'Driver, trace and receiver' }),
      scale: t({ tr: 'ölçek:', en: 'scale:' }),
    },
  }
}
