// Crosstalk kestirimi ekranının kullanıcıya görünen metinleri — iki dilli (tr/en).
// Hata kodları ve bulgu seviyeleri burada dile çevrilir; model.js metin bilmez.

import { fmt, fmtEng } from '../../../lib/num'
import { pick } from '../../../lib/i18n'
import { commonText } from '../../../data/uiText'
import { EPS_GEOMETRY, EPS_STRUCT_STRIPLINE } from '../../../lib/epsEff'
import {
  REASON_EPS, REASON_GEOMETRY, REASON_COUPLING, REASON_CROSSTALK,
} from './model'

// NEXT ve FEXT yüzdesi eşikleri MÜHENDİSLİK YORUMUDUR — docs/spec.md bu sayıları
// vermez. Spec §7.6 bir kabul sınırı tanımlamaz; kabul edilebilir crosstalk
// seviyesi alıcının gürültü bütçesinden çıkar. Aşağıdaki üç bölge yalnızca
// "bakılması gereken yer" işaretidir, geçti/kaldı kararı değildir.
// Dosyanın tek dış yüzü getText(); bu iki eşik yalnızca nextLevel() ile eşik
// notunun metni tarafından okunur, dışarı verilmez.
const NEXT_PCT_WARN = 5
const NEXT_PCT_DANGER = 15

function nextLevel(pct) {
  if (pct > NEXT_PCT_DANGER) return 'danger'
  if (pct >= NEXT_PCT_WARN) return 'warn'
  return 'ok'
}

export function getText(lang) {
  const t = (dict) => pick(dict, lang)
  // Yüzde işaretinin yeri dile göre değişir; kalıp uiText.js'te tek yerdedir.
  const { pct } = commonText(lang)

  // Eşik sayıları prose'a elle yazılmaz; nextLevel()'ın okuduğu sabitlerden gelir,
  // yoksa metinle mantık zamanla ayrışır. Yüzde işaretini `pct` koyar.
  const warnPct = pct(String(NEXT_PCT_WARN))
  const dangerPct = pct(String(NEXT_PCT_DANGER))
  const thresholdNote = t({
    tr: `NEXT ve FEXT yüzdesi için kullanılan ${warnPct} ve ${dangerPct} eşikleri bu ekranın `
      + 'mühendislik yorumudur; bir kabul kriterinden gelmez. Gerçek sınır alıcının gürültü '
      + 'bütçesinden çıkar.',
    en: `The ${warnPct} and ${dangerPct} thresholds used for the NEXT and FEXT percentages are `
      + 'this screen’s engineering judgement; they do not come from an acceptance criterion. '
      + 'The real limit comes from the receiver’s noise budget.',
  })

  // εeff'in nereden geldiği — beş sinyal bütünlüğü ekranında aynı ifade kullanılır.
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
        tr: `εeff = ${fmt(eps.epsEff, 4)} microstrip geometrisinden kapalı formla hesaplandı (${eps.model}). Bu değer alan çözücüden gelmediği için üretime hazır sayılmaz; doyma uzunluğu ve NEXT süresi de aynı etiketi taşır.`,
        en: `εeff = ${fmt(eps.epsEff, 4)} was computed from the microstrip geometry with a closed form (${eps.model}). Because it does not come from a field solver it is not considered production-ready; the saturation length and the NEXT duration carry the same label.`,
      }),
    }
  }

  return {
    pct,
    backlink: t({ tr: '← Sinyal Bütünlüğü', en: '← Signal Integrity' }),
    title: t({ tr: 'Crosstalk Kestirimi', en: 'Crosstalk Estimator' }),
    intro: t({
      tr: 'Paralel iki hat arasındaki near-end crosstalk tepe gerilimini, doyma uzunluğunu ve NEXT '
        + 'süresini kestirir; S ≥ 3·W geometrik kontrolünü yapar. Modal εeff değerleri girilirse '
        + 'far-end crosstalk da hesaplanır. Sonuç çok iletkenli iletim hattı çözümünden gelmez — '
        + 'kaba bir kestirimdir.',
      en: 'Estimates the near-end crosstalk peak voltage, the saturation length and the NEXT '
        + 'duration between two parallel lines; performs the S ≥ 3·W geometric check. If modal '
        + 'εeff values are entered, far-end crosstalk is computed as well. The result does not '
        + 'come from a multiconductor transmission-line solution — it is a rough estimate.',
    }),

    fields: {
      Zeven: {
        label: t({ tr: 'Even mod empedansı (Z_even)', en: 'Even-mode impedance (Z_even)' }),
        hint: t({
          tr: 'Kuplajlı çiftte Z_even her zaman Z_odd\'dan büyüktür',
          en: 'In a coupled pair Z_even is always greater than Z_odd',
        }),
      },
      Zodd: { label: t({ tr: 'Odd mod empedansı (Z_odd)', en: 'Odd-mode impedance (Z_odd)' }) },
      W: { label: t({ tr: 'Kuplajlı hat genişliği (W)', en: 'Coupled trace width (W)' }) },
      S: {
        label: t({ tr: 'Hat aralığı (S)', en: 'Line spacing (S)' }),
        hint: t({
          tr: 'Kenar-kenar mesafe; 3W geometrik kontrolü bu değerle yapılır',
          en: 'Edge-to-edge distance; the 3W geometric check uses this value',
        }),
      },
      len: {
        label: t({ tr: 'Paralel uzunluk', en: 'Parallel length' }),
        hint: t({
          tr: 'İki hattın yan yana ilerlediği uzunluk',
          en: 'The length over which the two lines run side by side',
        }),
      },
      tr: { label: t({ tr: 'Yükselme süresi (t_r)', en: 'Rise time (t_r)' }) },
      Vagg: { label: t({ tr: 'Aggressor gerilimi (V_agg)', en: 'Aggressor voltage (V_agg)' }) },
      epsOdd: {
        label: t({ tr: 'Odd mod εeff', en: 'Odd-mode εeff' }),
        hint: t({
          tr: 'Alan çözücüden ya da üretici yığın raporundan',
          en: 'From a field solver or the fabricator stack-up report',
        }),
      },
      epsEven: { label: t({ tr: 'Even mod εeff', en: 'Even-mode εeff' }) },
    },
    fextHeading: t({ tr: 'Far-end crosstalk', en: 'Far-end crosstalk' }),
    fextOff: t({ tr: 'FEXT hesaplama', en: 'Do not compute FEXT' }),
    fextOn: t({ tr: 'FEXT hesapla — modal εeff gir', en: 'Compute FEXT — enter modal εeff' }),

    // Hata mesajında alan adı olarak görünen etiketler; model.js'e verilir.
    fieldLabels: {
      Zeven: t({ tr: 'Even mod empedansı (Z_even)', en: 'Even-mode impedance (Z_even)' }),
      Zodd: t({ tr: 'Odd mod empedansı (Z_odd)', en: 'Odd-mode impedance (Z_odd)' }),
      W: t({ tr: 'Kuplajlı hat genişliği (W)', en: 'Coupled trace width (W)' }),
      S: t({ tr: 'Hat aralığı (S)', en: 'Line spacing (S)' }),
      len: t({ tr: 'Paralel uzunluk', en: 'Parallel length' }),
      tr: t({ tr: 'Yükselme süresi (t_r)', en: 'Rise time (t_r)' }),
      Vagg: t({ tr: 'Aggressor gerilimi (V_agg)', en: 'Aggressor voltage (V_agg)' }),
      epsOdd: t({ tr: 'Odd mod εeff', en: 'Odd-mode εeff' }),
      epsEven: t({ tr: 'Even mod εeff', en: 'Even-mode εeff' }),
      epsEffManual: t({
        tr: 'Efektif dielektrik sabiti (εeff)',
        en: 'Effective dielectric constant (εeff)',
      }),
      epsR: t({ tr: 'Dielektrik sabiti (εr)', en: 'Dielectric constant (εr)' }),
      epsW: t({ tr: 'Hat genişliği (W)', en: 'Trace width (W)' }),
      epsH: t({ tr: 'Dielektrik yüksekliği (H)', en: 'Dielectric height (H)' }),
      epsT: t({ tr: 'Bakır kalınlığı (t)', en: 'Copper thickness (t)' }),
    },

    thresholdNote,

    methodNote: t({
      tr: 'Kestirim modu — bu sonuç çok iletkenli iletim hattı çözümünden GELMEZ. O çözüm kapasitans '
        + 'matrisini 2B alan çözücüden alır, endüktans matrisini L = μ₀ε₀·C₀⁻¹ ile, iletkenlik '
        + 'matrisini G ≈ ω·tanδ·C ile kurar; aggressor sinyalini FFT ile frekans alanına taşır, her '
        + 'frekansta e^(−Mℓ) çözer ve IFFT ile NEXT/FEXT dalga biçimini üretir. Alan çözücü olmadığı '
        + 'için bu adımların hiçbiri yapılmıyor. Buradaki sayı bir dalga biçimi değil, kaba bir tepe '
        + 'değer kestirimidir.',
      en: 'Estimation mode — this result does NOT come from a multiconductor transmission-line '
        + 'solution. That solution takes the capacitance matrix from a 2-D field solver, builds the '
        + 'inductance matrix with L = μ₀ε₀·C₀⁻¹ and the conductance matrix with G ≈ ω·tanδ·C; it '
        + 'moves the aggressor signal into the frequency domain with an FFT, solves e^(−Mℓ) at each '
        + 'frequency and produces the NEXT/FEXT waveform with an IFFT. Without a field solver none '
        + 'of these steps is performed. The number here is not a waveform but a rough peak-value '
        + 'estimate.',
    }),

    sourceNote: t({
      tr: 'Kullanılan K_b = (Z_even − Z_odd)/(2·(Z_even + Z_odd)), L_sat = t_r/(2·t\'_pd) ve '
        + 'V_FEXT ≈ (Δt/t_r)·V_agg/2 ifadeleri AMPİRİKTİR — sayısal biçimleri ve geçerlilik aralıkları '
        + 'doğrulanmış bir kaynağa dayanmıyor. Sonucun yöntem etiketi bu yüzden '
        + '`empirical-coupling`, kapalı form sonuçlarının taşıdığı `closed-form` değil. Bu ekranla '
        + 'üretim kararı vermeyin.',
      en: 'The expressions used — K_b = (Z_even − Z_odd)/(2·(Z_even + Z_odd)), '
        + 'L_sat = t_r/(2·t\'_pd) and V_FEXT ≈ (Δt/t_r)·V_agg/2 — are EMPIRICAL: their numerical '
        + 'form and validity ranges are not backed by a verified source. That is why the result’s '
        + 'method label is `empirical-coupling`, not the `closed-form` label carried by closed-form '
        + 'results. Do not make production decisions with this screen.',
    }),

    threeWNote: t({
      tr: 'S ≥ 3·W bu ekranda tanımı belirsizlik taşımayan tek ifadedir, ama yalnızca geometrik bir '
        + 'tasarım kontrolüdür — crosstalk hesabı değildir. '
        + 'Sağlandığında "3W geometrik kuralı sağlandı" denir; "crosstalk yoktur" DENMEZ.',
      en: 'S ≥ 3·W is the only expression on this screen whose definition carries no ambiguity, but '
        + 'it is only a geometric design check — it is not a crosstalk calculation. '
        + 'When it is satisfied, we say “the 3W geometric rule is satisfied”; we do NOT say '
        + '“there is no crosstalk”.',
    }),

    modalEpsHint: t({
      tr: 'Bu iki değer diferansiyel çift ekranından ALINAMAZ: o ekran tek bir εeff kullanır, iki modu '
        + 'aynı hızda kabul eder ve bu varsayım altında FEXT özdeş olarak sıfır çıkar — microstrip\'te '
        + 'bu YANLIŞTIR. Değerler 2B alan çözücüden ya da üretici yığın raporundan gelmelidir. '
        + 'Her iki değer de 1\'den küçük olamaz.',
      en: 'These two values CANNOT be taken from the differential pair screen: that screen uses a '
        + 'single εeff, assumes both modes travel at the same speed, and under that assumption FEXT '
        + 'comes out identically zero — on microstrip this is WRONG. The values must come from a '
        + '2-D field solver or the fabricator stack-up report. Neither value can be less than 1.',
    }),

    bigLabel: t({ tr: 'Near-end crosstalk tepe gerilimi', en: 'Near-end crosstalk peak voltage' }),
    bigAltPct: (v) => t({
      tr: `aggressor geriliminin ${pct(v)} kadarı`,
      en: `${pct(v)} of the aggressor voltage`,
    }),
    // İki dilde de aynı: değişen tek şey yüzde işaretinin yeri, onu pct() koyar.
    fextShort: (V, v) => `FEXT ${V} (${pct(v)})`,
    fextMissingShort: t({
      tr: 'FEXT: modal εeff girilmedi — hesaplanmadı',
      en: 'FEXT: modal εeff not entered — not computed',
    }),

    table: {
      Kb: t({ tr: 'NEXT kuplaj katsayısı (K_b)', en: 'NEXT coupling coefficient (K_b)' }),
      Vnext: t({ tr: 'NEXT tepe gerilimi', en: 'NEXT peak voltage' }),
      nextPct: t({ tr: 'NEXT yüzdesi', en: 'NEXT percentage' }),
      Lsat: t({ tr: 'Doyma uzunluğu (L_sat)', en: 'Saturation length (L_sat)' }),
      saturated: t({ tr: 'Doymuş mu', en: 'Saturated' }),
      scale: t({ tr: 'Ölçek katsayısı', en: 'Scale factor' }),
      nextDuration: t({ tr: 'NEXT süresi', en: 'NEXT duration' }),
      coupledLength: t({ tr: 'Paralel uzunluk', en: 'Parallel length' }),
      Vagg: t({ tr: 'Aggressor gerilimi', en: 'Aggressor voltage' }),
      riseTime: t({ tr: 'Yükselme süresi', en: 'Rise time' }),
      geomHead: t({ tr: '3W geometrik kontrolü', en: '3W geometric check' }),
      geomOk: t({ tr: 'sağlandı', en: 'satisfied' }),
      geomFail: t({ tr: 'sağlanmadı', en: 'not satisfied' }),
      swRatio: t({ tr: 'S / W oranı', en: 'S / W ratio' }),
      required: t({ tr: 'Gereken aralık (3·W)', en: 'Required spacing (3·W)' }),
      enteredSW: t({
        tr: 'Girilen aralık (S) · genişlik (W)',
        en: 'Entered spacing (S) · width (W)',
      }),
      fextHead: t({ tr: 'Far-end crosstalk', en: 'Far-end crosstalk' }),
      fextComputed: t({ tr: 'hesaplandı', en: 'computed' }),
      fextNotComputed: t({ tr: 'hesaplanmadı', en: 'not computed' }),
      modalEps: t({ tr: 'Odd · even mod εeff', en: 'Odd · even mode εeff' }),
      modalDelayDiff: t({ tr: 'Modal gecikme farkı (Δt)', en: 'Modal delay difference (Δt)' }),
      Vfext: t({ tr: 'FEXT tepe gerilimi', en: 'FEXT peak voltage' }),
      fextPct: t({ tr: 'FEXT yüzdesi', en: 'FEXT percentage' }),
      homogeneous: t({ tr: 'Modal hızlar homojen mi', en: 'Modal velocities homogeneous' }),
      homogeneousYes: t({ tr: 'evet — FEXT sıfır', en: 'yes — FEXT is zero' }),
      reason: t({ tr: 'Neden', en: 'Reason' }),
      reasonNoModal: t({ tr: 'modal εeff girilmedi', en: 'modal εeff not entered' }),
      methodHead: t({ tr: 'Yöntem', en: 'Method' }),
      multiconductor: t({
        tr: 'Çok iletkenli model uygulandı mı',
        en: 'Multiconductor model applied',
      }),
      tpd: t({ tr: 'Birim uzunluk gecikmesi', en: 'Per-unit-length delay' }),
    },
    yes: t({ tr: 'evet', en: 'yes' }),
    no: t({ tr: 'hayır', en: 'no' }),

    reasonText: (reason) => {
      if (reason === REASON_EPS) {
        return t({
          tr: 'Efektif dielektrik sabiti hesaplanamadı. Elle giriyorsanız değer 1\'den büyük olmalı; geometriden hesaplıyorsanız W, H ve εr değerlerini kontrol edin.',
          en: 'The effective dielectric constant could not be computed. If entering it manually the value must be greater than 1; if computing from geometry, check the W, H and εr values.',
        })
      }
      if (reason === REASON_GEOMETRY) {
        return t({
          tr: 'Kuplajlı hat genişliği (W) ve hat aralığı (S) pozitif olmalı; 3W geometrik kontrolü bu iki değerle yapılır.',
          en: 'The coupled trace width (W) and the line spacing (S) must be positive; the 3W geometric check uses these two values.',
        })
      }
      if (reason === REASON_COUPLING) {
        return t({
          tr: 'Z_even, Z_odd değerinden büyük olmalı ve ikisi de pozitif olmalı. Kuplajlı bir çiftte even mod empedansı her zaman odd mod empedansından büyüktür; değerleri ters girmiş olabilirsiniz.',
          en: 'Z_even must be greater than Z_odd, and both must be positive. In a coupled pair the even-mode impedance is always greater than the odd-mode impedance; you may have entered the values swapped.',
        })
      }
      if (reason === REASON_CROSSTALK) {
        return t({
          tr: 'Kestirim için εeff, yükselme süresi, paralel uzunluk ve aggressor gerilimi pozitif olmalı.',
          en: 'For the estimate, εeff, the rise time, the parallel length and the aggressor voltage must be positive.',
        })
      }
      return t({
        tr: 'Tüm zorunlu alanlara pozitif sayısal değer girin. Ondalık için nokta veya virgül kullanabilirsiniz (0.25 = 0,25).',
        en: 'Enter a positive numeric value in every required field. Use a point or a comma for decimals (0.25 = 0,25).',
      })
    },

    commentary: (r) => {
      if (!r.ok) return []

      const out = [epsSourceNote(r.eps)]

      if (r.eps.source === EPS_GEOMETRY && !r.eps.inRange) {
        out.push({
          level: 'danger',
          text: t({
            tr: 'Girilen geometri kapalı formun güvenilir aralığının dışında. εeff sapması doyma uzunluğuna ve NEXT süresine doğrudan geçer.',
            en: 'The entered geometry is outside the reliable range of the closed form. The εeff error passes directly into the saturation length and the NEXT duration.',
          }),
        })
      }

      // --- NEXT ---
      out.push({
        level: nextLevel(r.nextPct),
        text: t({
          tr: `NEXT tepe gerilimi ${fmtEng(r.Vnext, 'V', 4)} — aggressor geriliminin ${pct(fmt(r.nextPct, 4))}'i (K_b = ${fmt(r.Kb, 4)}). ${thresholdNote}`,
          en: `The NEXT peak voltage is ${fmtEng(r.Vnext, 'V', 4)} — ${pct(fmt(r.nextPct, 4))} of the aggressor voltage (K_b = ${fmt(r.Kb, 4)}). ${thresholdNote}`,
        }),
      })

      out.push({
        level: 'ok',
        text: r.saturated
          ? t({
            tr: `Paralel uzunluk ${fmtEng(r.coupledLength, 'm', 4)}, doyma uzunluğu ${fmtEng(r.Lsat, 'm', 4)} değerinden büyük: kestirime göre NEXT doymuş durumda (ölçek katsayısı ${fmt(r.scale, 4)}). Hattı daha da uzatmak tepe gerilimini artırmaz, yalnızca NEXT darbesini uzatır.`,
            en: `The parallel length ${fmtEng(r.coupledLength, 'm', 4)} is greater than the saturation length ${fmtEng(r.Lsat, 'm', 4)}: per the estimate NEXT is saturated (scale factor ${fmt(r.scale, 4)}). Lengthening the line further does not raise the peak voltage; it only widens the NEXT pulse.`,
          })
          : t({
            tr: `Paralel uzunluk ${fmtEng(r.coupledLength, 'm', 4)}, doyma uzunluğu ${fmtEng(r.Lsat, 'm', 4)} değerinin altında: NEXT doğrusal ölçekleniyor (ölçek katsayısı ${fmt(r.scale, 4)}). Uzunluğu iki katına çıkarmak tepe gerilimini de yaklaşık iki katına çıkarır.`,
            en: `The parallel length ${fmtEng(r.coupledLength, 'm', 4)} is below the saturation length ${fmtEng(r.Lsat, 'm', 4)}: NEXT scales linearly (scale factor ${fmt(r.scale, 4)}). Doubling the length roughly doubles the peak voltage as well.`,
          }),
      })

      out.push({
        level: 'ok',
        text: t({
          tr: `NEXT darbesinin süresi ${fmtEng(r.nextDuration, 's', 4)} — gidiş dönüş gecikmesi kadar (birim uzunluk gecikmesi ${fmt(r.tpdPsPerMm, 4)} ps/mm).`,
          en: `The NEXT pulse lasts ${fmtEng(r.nextDuration, 's', 4)} — equal to the round-trip delay (per-unit-length delay ${fmt(r.tpdPsPerMm, 4)} ps/mm).`,
        }),
      })

      // --- 3W geometrik kontrolü ---
      if (r.geom.satisfied) {
        out.push({
          level: 'ok',
          text: t({
            tr: `3W geometrik kuralı sağlandı: S/W = ${fmt(r.geom.ratio, 4)} ≥ 3. Bu YALNIZCA geometrik bir tasarım kontrolüdür, crosstalk hesabı değildir. Sağlanmış olması "crosstalk yoktur" anlamına gelmez; yukarıdaki NEXT kestirimi geçerliliğini korur.`,
            en: `The 3W geometric rule is satisfied: S/W = ${fmt(r.geom.ratio, 4)} ≥ 3. This is ONLY a geometric design check, not a crosstalk calculation. Its being satisfied does not mean “there is no crosstalk”; the NEXT estimate above remains valid.`,
          }),
        })
      } else {
        out.push({
          level: 'warn',
          text: t({
            tr: `3W geometrik kuralı sağlanmadı: S/W = ${fmt(r.geom.ratio, 4)} < 3, gereken aralık ${fmtEng(r.geom.required, 'm', 4)} (girilen ${fmtEng(r.S, 'm', 4)}). Bu geometrik bir uyarıdır; crosstalk seviyesini tek başına belirlemez.`,
            en: `The 3W geometric rule is not satisfied: S/W = ${fmt(r.geom.ratio, 4)} < 3; the required spacing is ${fmtEng(r.geom.required, 'm', 4)} (entered ${fmtEng(r.S, 'm', 4)}). This is a geometric warning; it does not determine the crosstalk level by itself.`,
          }),
        })
      }

      // --- FEXT ---
      if (!r.fext.available) {
        out.push({
          level: 'warn',
          text: t({
            tr: 'Far-end crosstalk HESAPLANMADI: odd ve even mod εeff değerleri girilmedi. FEXT modal hız farkına bağlıdır ve bu fark Z_odd/Z_even değerlerinden türetilemez. Diferansiyel çift ekranı tek bir εeff kullanır, iki modu aynı hızda kabul eder; o varsayım altında FEXT özdeş olarak sıfır çıkar ve microstrip\'te bu yanlıştır. Doğru değerler 2B alan çözücüden ya da üretici yığın raporundan gelir. Uydurulmuş bir sayı göstermek yerine boş bırakıldı.',
            en: 'Far-end crosstalk was NOT computed: the odd- and even-mode εeff values were not entered. FEXT depends on the modal velocity difference, and that difference cannot be derived from the Z_odd/Z_even values. The differential pair screen uses a single εeff and treats both modes as travelling at the same speed; under that assumption FEXT comes out identically zero, and on microstrip that is wrong. The correct values come from a 2-D field solver or the fabricator stack-up report. Rather than show a fabricated number, this was left blank.',
          }),
        })
      } else if (r.fext.homogeneous) {
        out.push({
          level: 'ok',
          text: t({
            tr: `Odd ve even mod εeff değerleri eşit (${fmt(r.fext.epsEffOdd, 4)}): modal gecikme farkı sıfır, dolayısıyla FEXT sıfır. Bu bir eksiklik değil — homojen dielektrikte (stripline, gömülü microstrip) iki mod aynı hızda ilerler ve far-end crosstalk fiziksel olarak beklenmez. "Hesaplanamadı" durumundan farklıdır.`,
            en: `The odd- and even-mode εeff values are equal (${fmt(r.fext.epsEffOdd, 4)}): the modal delay difference is zero, hence FEXT is zero. This is not a shortcoming — in a homogeneous dielectric (stripline, embedded microstrip) the two modes travel at the same speed and far-end crosstalk is not physically expected. It is distinct from the “could not be computed” case.`,
          }),
        })
      } else {
        out.push({
          level: nextLevel(r.fext.fextPct),
          text: t({
            tr: `FEXT tepe gerilimi ${fmtEng(r.fext.Vfext, 'V', 4)} — aggressor geriliminin ${pct(fmt(r.fext.fextPct, 4))}'i. Modal gecikme farkı ${fmtEng(r.fext.modalDelayDiff, 's', 4)} (odd εeff ${fmt(r.fext.epsEffOdd, 4)}, even εeff ${fmt(r.fext.epsEffEven, 4)}). Microstrip gibi homojen olmayan dielektrikte FEXT genelde baskın crosstalk türüdür. ${thresholdNote}`,
            en: `The FEXT peak voltage is ${fmtEng(r.fext.Vfext, 'V', 4)} — ${pct(fmt(r.fext.fextPct, 4))} of the aggressor voltage. The modal delay difference is ${fmtEng(r.fext.modalDelayDiff, 's', 4)} (odd εeff ${fmt(r.fext.epsEffOdd, 4)}, even εeff ${fmt(r.fext.epsEffEven, 4)}). In a non-homogeneous dielectric such as microstrip, FEXT is usually the dominant crosstalk type. ${thresholdNote}`,
          }),
        })
        if (r.fext.modalDelayDiff >= r.tr) {
          out.push({
            level: 'danger',
            text: t({
              tr: `Modal gecikme farkı (${fmtEng(r.fext.modalDelayDiff, 's', 4)}) yükselme süresine (${fmtEng(r.tr, 's', 4)}) eşit ya da ondan büyük. Kullanılan FEXT ifadesi Δt ≪ t_r varsayımıyla yazılmış bir orandır; bu bölgede sonuç anlamını yitirir.`,
              en: `The modal delay difference (${fmtEng(r.fext.modalDelayDiff, 's', 4)}) is equal to or greater than the rise time (${fmtEng(r.tr, 's', 4)}). The FEXT expression used is a ratio written under the assumption Δt ≪ t_r; in this region the result loses its meaning.`,
            }),
          })
        }
      }

      // --- Yöntem ve kaynak ---
      out.push({
        level: 'warn',
        text: t({
          tr: `Bu sonuç çok iletkenli iletim hattı modelinden GELMEZ: kapasitans matrisi, e^(−Mℓ) ve FFT/IFFT adımlarının hiçbiri uygulanmadı. Sonucun yöntem etiketi \`${r.method}\`, çok iletkenli model kullanıldı mı: ${r.multiconductorModel ? 'evet' : 'hayır'}.`,
          en: `This result does NOT come from a multiconductor transmission-line model: none of the capacitance matrix, e^(−Mℓ) or FFT/IFFT steps was applied. The result’s method label is \`${r.method}\`; multiconductor model used: ${r.multiconductorModel ? 'yes' : 'no'}.`,
        }),
      })

      out.push({
        level: 'warn',
        text: t({
          tr: 'K_b, L_sat ve V_FEXT ifadeleri ampiriktir; sayısal biçimleri ve geçerlilik aralıkları doğrulanmış bir kaynağa dayanmıyor. Bu yüzden bu ekran kapalı form sonuçlarıyla aynı güven seviyesinde değildir; yığın onayı, gürültü bütçesi kapatma veya kart çıkışı kararı için alan çözücü sonucu ya da ölçüm gerekir.',
          en: 'The K_b, L_sat and V_FEXT expressions are empirical; their numerical form and validity ranges are not backed by a verified source. This screen is therefore not at the same confidence level as closed-form results; stack-up approval, noise-budget closure or board release decisions require a field-solver result or measurement.',
        }),
      })

      out.push({
        level: 'warn',
        text: t({
          tr: `Z_even = ${fmt(r.Zeven, 4)} Ω ve Z_odd = ${fmt(r.Zodd, 4)} Ω elle girildi. Bu değerler diferansiyel çift ekranından geliyorsa onlar da ampirik bir kuplaj katsayısından türemiştir; belirsizlik buradaki NEXT sonucuna doğrudan geçer.`,
          en: `Z_even = ${fmt(r.Zeven, 4)} Ω and Z_odd = ${fmt(r.Zodd, 4)} Ω were entered manually. If these values come from the differential pair screen, they too derive from an empirical coupling coefficient; that uncertainty passes directly into the NEXT result here.`,
        }),
      })

      return out
    },

    formula: t({
      tr: `Tanımı belirsizlik taşımayan
TEK ifade — yalnızca geometrik
kontrol:
  S ≥ 3·W

Kestirim — AMPİRİK, doğrulanmış
kaynağa dayanmıyor:
  K_b = (Z_even − Z_odd)
        / (2·(Z_even + Z_odd))
  L_sat = t_r / (2·t'_pd)
  ölçek = L ≥ L_sat
          ? 1 : L / L_sat
  V_NEXT = K_b · V_agg · ölçek
  t_NEXT = 2·L·t'_pd

  Δt = |t'_pd,even − t'_pd,odd|
       · L
  V_FEXT ≈ (Δt / t_r) · V_agg / 2

Çok iletkenli hat çözümü
— UYGULANMADI:
  ∂V/∂x = −(R + jωL)·I
  ∂I/∂x = −(G + jωC)·V
  Z = R + jωL,  Y = G + jωC
  M = [[0, Z], [Y, 0]]
  X(ℓ) = e^(−M·ℓ) · X(0)
  L = μ₀ε₀·C₀⁻¹
    (vakum kapasitans matrisinden)
  G ≈ ω·tanδ·C
    (homojen dielektrik yaklaşımı)
  C matrisi 2B alan çözücüden
  gelir; aggressor sinyali FFT →
  her frekansta çözüm → IFFT ile
  NEXT/FEXT dalga biçimi.
  Alan çözücü olmadığı için
  hiçbir adımı yapılamadı.`,
      en: `The ONLY expression whose
definition carries no ambiguity
— geometric check only:
  S ≥ 3·W

Estimate — EMPIRICAL, not
backed by a verified source:
  K_b = (Z_even − Z_odd)
        / (2·(Z_even + Z_odd))
  L_sat = t_r / (2·t'_pd)
  scale = L ≥ L_sat
          ? 1 : L / L_sat
  V_NEXT = K_b · V_agg · scale
  t_NEXT = 2·L·t'_pd

  Δt = |t'_pd,even − t'_pd,odd|
       · L
  V_FEXT ≈ (Δt / t_r) · V_agg / 2

Multiconductor line solution
— NOT APPLIED:
  ∂V/∂x = −(R + jωL)·I
  ∂I/∂x = −(G + jωC)·V
  Z = R + jωL,  Y = G + jωC
  M = [[0, Z], [Y, 0]]
  X(ℓ) = e^(−M·ℓ) · X(0)
  L = μ₀ε₀·C₀⁻¹
    (from the vacuum capacitance
     matrix)
  G ≈ ω·tanδ·C
    (homogeneous dielectric
     approximation)
  The C matrix comes from a 2-D
  field solver; aggressor signal
  FFT → solve at each frequency
  → IFFT gives the NEXT/FEXT
  waveform. Without a field
  solver none of these steps
  could be done.`,
    }),

    detail: {
      method: (method, multiconductor) => t({
        tr: `Sonucun yöntem etiketi \`${method}\`; çok iletkenli model uygulandı mı: ${multiconductor ? 'evet' : 'hayır'}. Bu etiket kapalı form sonuçlarının taşıdığı \`closed-form\` etiketiyle aynı güven seviyesinde değildir.`,
        en: `The result’s method label is \`${method}\`; multiconductor model applied: ${multiconductor ? 'yes' : 'no'}. This label is not at the same confidence level as the \`closed-form\` label carried by closed-form results.`,
      }),
      coupling: (Kb, Lsat, scale) => t({
        tr: `K_b = ${Kb}; doyma uzunluğu ${Lsat}, ölçek katsayısı ${scale} (uzunluk L_sat değerinin altındaysa doğrusal ölçekleme).`,
        en: `K_b = ${Kb}; saturation length ${Lsat}, scale factor ${scale} (linear scaling when the length is below L_sat).`,
      }),
      duration: (d) => t({
        tr: `NEXT süresi gidiş dönüş gecikmesidir: 2·L·t′_pd = ${d}. Tepe değerin ne kadar sürdüğünü gösterir, ne kadar büyük olduğunu değil.`,
        en: `The NEXT duration is the round-trip delay: 2·L·t′_pd = ${d}. It shows how long the peak lasts, not how large it is.`,
      }),
      threeW: t({
        tr: '3W kontrolü kayan nokta karşılaştırmasını bağıl toleransla yapar; tam sınırdaki geometri (S = 3·W) yanlışlıkla "sağlanmadı" görünmez.',
        en: 'The 3W check performs the floating-point comparison with a relative tolerance; a geometry exactly at the boundary (S = 3·W) does not falsely appear as “not satisfied”.',
      }),
      fext: (fext) => (fext.available
        ? t({
          tr: `FEXT modal gecikme farkından hesaplandı: Δt = ${fmtEng(fext.modalDelayDiff, 's', 4)}. Δt ≪ t_r varsayımı geçerli olduğu sürece anlamlıdır.`,
          en: `FEXT was computed from the modal delay difference: Δt = ${fmtEng(fext.modalDelayDiff, 's', 4)}. It is meaningful as long as the assumption Δt ≪ t_r holds.`,
        })
        : t({
          tr: 'FEXT hesaplanmadı — modal εeff değerleri girilmedi. Motor bu iki değere ≥ 1 eşiği uygular; altındaki bir değer FEXT\'i hesaplatmaz.',
          en: 'FEXT was not computed — the modal εeff values were not entered. The engine applies a ≥ 1 threshold to these two values; a value below it does not let FEXT be computed.',
        })),
      noRounding: t({
        tr: 'Ara değerlerde yuvarlama yapılmaz; yalnızca gösterim yuvarlanır.',
        en: 'Intermediate values are never rounded; only the display is rounded.',
      }),
    },

    // Geçerlilik listesi: strong varsa başlık cümlesi kalın basılır.
    validity: [
      {
        strong: t({
          tr: 'Bilinen sapma — çok iletkenli hat çözümü uygulanmadı.',
          en: 'Known deviation — the multiconductor line solution was not applied.',
        }),
        text: t({
          tr: 'O çözüm kapasitans matrisini 2B alan çözücüden alır, endüktans matrisini L = μ₀ε₀·C₀⁻¹, iletkenlik matrisini G ≈ ω·tanδ·C ile kurar; aggressor sinyalini FFT ile frekans alanına taşır, her frekansta e^(−Mℓ) çözer, IFFT ile zaman alanına döner. Alan çözücü olmadığı için bu adımların hiçbiri yapılmadı. Bu ekran dalga biçimi üretmez.',
          en: 'That solution takes the capacitance matrix from a 2-D field solver, builds the inductance matrix with L = μ₀ε₀·C₀⁻¹ and the conductance matrix with G ≈ ω·tanδ·C; it moves the aggressor signal into the frequency domain with an FFT, solves e^(−Mℓ) at each frequency and returns to the time domain with an IFFT. Without a field solver none of these steps was performed. This screen does not produce a waveform.',
        }),
      },
      {
        strong: t({
          tr: 'Kullanılan ifadeler ampiriktir.',
          en: 'The expressions used are empirical.',
        }),
        text: t({
          tr: 'K_b, L_sat ve V_FEXT bağıntılarının sayısal biçimi ve geçerlilik aralığı doğrulanmış bir kaynağa dayanmıyor. Sonuç bu yüzden `empirical-coupling` etiketi ve "çok iletkenli model: hayır" bayrağı taşır.',
          en: 'The numerical form and validity range of the K_b, L_sat and V_FEXT relations are not backed by a verified source. The result therefore carries the `empirical-coupling` label and the “multiconductor model: no” flag.',
        }),
      },
      {
        strong: t({
          tr: 'Hat aralığı duyarlılık grafiği üretilmedi.',
          en: 'A line-spacing sensitivity chart was not produced.',
        }),
        text: t({
          tr: 'Alttaki parametrik grafik hat aralığı duyarlılığı yerine paralel uzunluk taraması çiziyor. Nedeni: bu ekranda Z_odd ve Z_even kullanıcıdan gelir ve hat aralığına bağlı bir modelleri yoktur — aralık süpürüldüğünde K_b hiç değişmez, dolayısıyla duyarlılık eğrisi üretilemez. Aralık duyarlılığı için Z_odd/Z_even\'in aralıkla birlikte değişmesi gerekir; o da kapasitans matrisi, yani 2B alan çözücü işidir. Hat aralığı bu ekranda yalnızca 3W geometrik kontrolüne girer.',
          en: 'The parametric chart below draws a parallel-length sweep instead of line-spacing sensitivity. The reason: on this screen Z_odd and Z_even come from the user and have no model that depends on the spacing — sweeping the spacing would not change K_b at all, so no sensitivity curve can be produced. Spacing sensitivity requires Z_odd/Z_even to change with the spacing; that is a capacitance-matrix job, i.e. a 2-D field solver. On this screen the line spacing enters only the 3W geometric check.',
        }),
      },
      {
        strong: t({
          tr: '3W yalnızca geometrik bir kontroldür.',
          en: '3W is only a geometric check.',
        }),
        text: t({
          tr: 'Bu ekranda tanımı belirsizlik taşımayan tek ifade S ≥ 3·W\'dir ve o da görsel bir tasarım kontrolüdür. Sağlandığında "3W geometrik kuralı sağlandı" denir; "crosstalk yoktur" denmez.',
          en: 'The only expression on this screen whose definition carries no ambiguity is S ≥ 3·W, and it is a visual design check. When it is satisfied, we say “the 3W geometric rule is satisfied”; we do not say “there is no crosstalk”.',
        }),
      },
      {
        text: t({
          tr: 'Bu ekranın sayılarıyla üretim kararı verilmemelidir. Gürültü bütçesi kapatma, yığın onayı veya kart çıkışı için alan çözücü sonucu ya da ölçüm gerekir.',
          en: 'Production decisions must not be made with this screen’s numbers. Noise-budget closure, stack-up approval or board release requires a field-solver result or measurement.',
        }),
      },
      {
        text: t({
          tr: 'Z_even ve Z_odd kullanıcıdan gelir. Diferansiyel çift ekranından alındıysa o değerler de ampirik bir kuplaj katsayısından türemiştir; belirsizlik buraya doğrudan geçer.',
          en: 'Z_even and Z_odd come from the user. If taken from the differential pair screen, those values too derive from an empirical coupling coefficient; that uncertainty passes directly into this screen.',
        }),
      },
      {
        text: t({
          tr: 'Far-end crosstalk modal hız farkına bağlıdır ve Z_odd/Z_even değerlerinden türetilemez. Tek bir εeff kullanan bir model iki modu aynı hızda kabul eder ve FEXT katsayısı K_f = −½·t\'_pd·(C_m/C − L_m/L) özdeş olarak sıfır çıkar; microstrip\'te bu yanlıştır. Bu yüzden modal εeff girilmezse sayı üretilmez.',
          en: 'Far-end crosstalk depends on the modal velocity difference and cannot be derived from the Z_odd/Z_even values. A model that uses a single εeff treats both modes as travelling at the same speed, and the FEXT coefficient K_f = −½·t\'_pd·(C_m/C − L_m/L) comes out identically zero; on microstrip this is wrong. That is why no number is produced when the modal εeff values are not entered.',
        }),
      },
      {
        text: t({
          tr: 'Odd ve even mod εeff eşitse FEXT sıfır çıkar ve bu DOĞRUDUR — homojen dielektrikte (stripline) iki mod aynı hızda ilerler. Bu durum "hesaplanamadı" durumundan farklıdır ve tabloda ayrı gösterilir.',
          en: 'If the odd- and even-mode εeff values are equal, FEXT comes out zero and this is CORRECT — in a homogeneous dielectric (stripline) the two modes travel at the same speed. This case is distinct from the “could not be computed” case and is shown separately in the table.',
        }),
      },
      {
        text: t({
          tr: 'Kestirim tek bir aggressor içindir. Birden fazla aggressor, dönüş yolu süreksizliği, via geçişi, konnektör ve düzlem yarıkları hesaba katılmaz; gerçek kartta bunlar baskın olabilir.',
          en: 'The estimate is for a single aggressor. Multiple aggressors, return-path discontinuities, via transitions, connectors and plane splits are not included; on a real board these can dominate.',
        }),
      },
      {
        text: t({
          tr: 'Victim hattının sonlandırması, kaynak ve yük empedansları modele girmez. Çok iletkenli hat çözümü bunları girdi olarak kullanır; bu kestirim kullanamaz.',
          en: 'The victim line’s termination and the source and load impedances do not enter the model. The multiconductor line solution uses them as inputs; this estimate cannot.',
        }),
      },
      {
        text: t({
          tr: 'Kayıp (R, G) ve dispersiyon ihmal edilir; εeff frekanstan bağımsız alınır.',
          en: 'Loss (R, G) and dispersion are neglected; εeff is taken as frequency-independent.',
        }),
      },
      {
        text: t({
          tr: 'Sonuçlar yaklaşıktır — kritik tasarımlarda üretici verisi ve ölçümle doğrulayın.',
          en: 'Results are approximate — verify against manufacturer data and measurement for critical designs.',
        }),
      },
    ],

    chart: {
      x: t({ tr: 'Paralel uzunluk (mm)', en: 'Parallel length (mm)' }),
      y: t({ tr: 'NEXT tepe gerilimi (V)', en: 'NEXT peak voltage (V)' }),
      caption: t({
        tr: 'Bu grafik HAT ARALIĞI DUYARLILIĞI DEĞİL, paralel uzunluk taramasıdır. Nedeni: bu ekranda '
          + 'Z_odd ve Z_even kullanıcıdan gelir ve hat aralığına bağlı bir modelleri yoktur — aralık '
          + 'süpürüldüğünde K_b hiç değişmez, dolayısıyla duyarlılık eğrisi üretilemez. Aralık '
          + 'duyarlılığı için Z_odd/Z_even\'in aralıkla birlikte değişmesi gerekir; o da kapasitans '
          + 'matrisi, yani 2B alan çözücü işidir. '
          + 'Çizilen eğri: paralel uzunluk arttıkça NEXT doğrusal büyür, doyma uzunluğu '
          + 'L_sat = t_r/(2·t\'_pd) noktasından sonra artmaz — daha uzun kuplaj yalnızca darbeyi uzatır, '
          + 'tepesini yükseltmez. Eğrinin sağ tarafındaki düzlük budur. Bu davranış kestirimin '
          + 'varsayımıdır; çok iletkenli hat çözümünden gelmez.',
        en: 'This chart is a parallel-length sweep, NOT LINE-SPACING SENSITIVITY. The reason: on this '
          + 'screen Z_odd and Z_even come from the user and have no model that depends on the '
          + 'spacing — sweeping the spacing would not change K_b at all, so no sensitivity curve '
          + 'can be produced. Spacing sensitivity requires Z_odd/Z_even to change with the '
          + 'spacing; that is a capacitance-matrix job, i.e. a 2-D field solver. '
          + 'The curve drawn: NEXT grows linearly as the parallel length increases and stops '
          + 'growing past the saturation length L_sat = t_r/(2·t\'_pd) — longer coupling only '
          + 'widens the pulse, it does not raise its peak. That is the flat region on the right of '
          + 'the curve. This behaviour is an assumption of the estimate; it does not come from a '
          + 'multiconductor line solution.',
      }),
      satLegend: t({ tr: 'doyma seviyesi', en: 'saturation level' }),
      satRef: (LsatMm) => t({
        tr: `doyma — L_sat = ${fmt(LsatMm, 4)} mm`,
        en: `saturation — L_sat = ${fmt(LsatMm, 4)} mm`,
      }),
      operatingPoint: t({ tr: 'çalışma noktası', en: 'operating point' }),
    },

    schematic: {
      title: t({
        tr: 'Aggressor ve victim hatları — üstten görünüm',
        en: 'Aggressor and victim lines — top view',
      }),
      caption: t({
        tr: 'Sinyal aggressor üzerinde near-end\'den far-end\'e ilerler; NEXT victim\'in near-end, FEXT far-end ucunda görünür',
        en: 'The signal travels along the aggressor from near end to far end; NEXT appears at the victim’s near end, FEXT at its far end',
      }),
      parallelLength: t({ tr: 'paralel uzunluk L', en: 'parallel length L' }),
      notComputed: t({ tr: 'hesaplanmadı', en: 'not computed' }),
      // Uç ve hat adları iki dilde de aynı ödünç sözcüklerdir; yine de
      // schematic.jsx'te çıplak dize bırakılmaz, ikisi de buradan gelir.
      // Yazı genişliği aynı kaldığı için SVG yerleşimi dile göre kaymaz.
      nearEnd: t({ tr: 'near-end', en: 'near-end' }),
      farEnd: t({ tr: 'far-end', en: 'far-end' }),
      aggressor: t({ tr: 'aggressor', en: 'aggressor' }),
      victim: t({ tr: 'victim', en: 'victim' }),
    },
  }
}
