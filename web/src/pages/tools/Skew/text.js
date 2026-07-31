// Diferansiyel skew ekranının kullanıcıya görünen metinleri — iki dilli (tr/en).
//
// Hesap katmanı yalnızca kod ve sayı üretir; dile çeviri burada yapılır.
// Ekran `getText(lang)` çağırır ve çözülmüş metin nesnesini kullanır; koşullu
// metin üreten yerler (yorum, hata nedeni) fonksiyon olarak döner ki mantık
// tek kopya kalsın, yalnızca dizeler dile göre seçilsin.

import { fmt, fmtEng } from '../../../lib/num'
import { pick } from '../../../lib/i18n'
import { EPS_GEOMETRY, EPS_STRUCT_STRIPLINE } from '../../../lib/epsEff'
import { REASON_EPS, LAYER_SAME, LAYER_DIFFERENT } from './model'

export function getText(lang) {
  const t = (dict) => pick(dict, lang)

  // εeff kaynağı ortak bileşenden geliyor; yorum metni bu ekranda da aynı
  // terminolojiyi kullanır. Ekranlar arasında paylaşılan durum yoktur.
  const epsSourceNote = (eps) => {
    if (eps.source !== EPS_GEOMETRY) {
      return {
        level: 'warn',
        text: t({
          tr: `εeff = ${fmt(eps.epsEff, 4)} elle girildi. Değerin doğruluğu girene aittir; empedans aracından ya da üretici yığın raporundan alınmalıdır — skew doğrudan bu değerle ölçeklenir.`,
          en: `εeff = ${fmt(eps.epsEff, 4)} was entered manually. Its accuracy is the responsibility of whoever entered it; it should come from the impedance tool or the fabricator stack-up report — the skew scales directly with this value.`,
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
        tr: `εeff = ${fmt(eps.epsEff, 4)} microstrip geometrisinden kapalı formla hesaplandı (${eps.model}). Bu değer alan çözücüden gelmediği için üretime hazır sayılmaz — buradan türeyen skew ve uzunluk sonuçları da aynı etiketi taşır.`,
        en: `εeff = ${fmt(eps.epsEff, 4)} was computed from the microstrip geometry with a closed form (${eps.model}). Because it does not come from a field solver it is not considered production-ready — the skew and length results derived from it carry the same label.`,
      }),
    }
  }

  const epsRangeNote = (eps) => {
    if (eps.source !== EPS_GEOMETRY || eps.inRange) return null
    return {
      level: 'danger',
      text: t({
        tr: 'Girilen geometri kapalı formun güvenilir aralığının dışında. εeff sapması buradan türeyen tüm gecikme, skew ve uzunluk sonuçlarına geçer.',
        en: 'The entered geometry is outside the reliable range of the closed form. The εeff error propagates into every delay, skew and length result derived from it.',
      }),
    }
  }

  return {
    backlink: t({ tr: '← Sinyal Bütünlüğü', en: '← Signal Integrity' }),
    title: t({
      tr: 'Diferansiyel Skew ve Uzunluk Eşleme',
      en: 'Differential Skew & Length Matching',
    }),
    intro: t({
      tr: 'Diferansiyel çiftin iki hattı arasındaki gecikme farkını hesaplar; izin verilen skew '
        + 'bütçesinin uzunluk karşılığını ve eşitlemek için gecikmesi küçük olan hatta eklenmesi '
        + 'gereken uzunluğu verir. Hatlar farklı katmandaysa iki ayrı εeff ile çalışır.',
      en: 'Computes the delay difference between the two lines of a differential pair; gives the '
        + 'length equivalent of the allowed skew budget and the length that must be added to the '
        + 'line with the smaller delay to equalise them. If the lines are on different layers it '
        + 'works with two separate εeff values.',
    }),

    layerGroup: t({ tr: 'Hatların katman düzeni', en: 'Layer arrangement of the lines' }),
    layerLabel: {
      [LAYER_SAME]: t({ tr: 'Aynı katman', en: 'Same layer' }),
      [LAYER_DIFFERENT]: t({
        tr: 'Farklı katman / farklı yapı',
        en: 'Different layer / different structure',
      }),
    },

    fields: {
      epsEffN: {
        label: t({
          tr: 'N hattı efektif dielektrik sabiti (εeff,N)',
          en: 'N line effective dielectric constant (εeff,N)',
        }),
        hint: t({
          tr: 'Yukarıdaki εeff P hattı içindir; bu alan N hattının katmanı içindir',
          en: 'The εeff above is for the P line; this field is for the N line’s layer',
        }),
      },
      lengthP: { label: t({ tr: 'P hattı uzunluğu', en: 'P line length' }) },
      lengthN: { label: t({ tr: 'N hattı uzunluğu', en: 'N line length' }) },
      skewMax: {
        label: t({ tr: 'İzin verilen maksimum skew', en: 'Maximum allowed skew' }),
        hint: t({
          tr: 'Komponent veri sayfasından ve protokol dokümanından gelir',
          en: 'Comes from the component datasheet and the protocol specification',
        }),
      },
    },

    // Hata mesajında alan adı olarak görünen etiketler; model.js'e verilir.
    fieldLabels: {
      lengthP: t({ tr: 'P hattı uzunluğu', en: 'P line length' }),
      lengthN: t({ tr: 'N hattı uzunluğu', en: 'N line length' }),
      skewMax: t({ tr: 'İzin verilen maksimum skew', en: 'Maximum allowed skew' }),
      epsEffN: t({
        tr: 'N hattı efektif dielektrik sabiti (εeff,N)',
        en: 'N line effective dielectric constant (εeff,N)',
      }),
      epsEffManual: t({
        tr: 'Efektif dielektrik sabiti (εeff)',
        en: 'Effective dielectric constant (εeff)',
      }),
      epsR: t({ tr: 'Dielektrik sabiti (εr)', en: 'Dielectric constant (εr)' }),
      epsW: t({ tr: 'Hat genişliği (W)', en: 'Trace width (W)' }),
      epsH: t({ tr: 'Dielektrik yüksekliği (H)', en: 'Dielectric height (H)' }),
      epsT: t({ tr: 'Bakır kalınlığı (t)', en: 'Copper thickness (t)' }),
    },

    bigLabel: t({ tr: 'Diferansiyel skew', en: 'Differential skew' }),
    delaysEqual: t({ tr: 'gecikmeler eşit', en: 'delays are equal' }),
    longerLine: (longer) => t({
      tr: `gecikmesi büyük hat: ${longer}`,
      en: `line with the larger delay: ${longer}`,
    }),

    methodNote: t({
      tr: 'Skew doğrudan iki hattın gecikme farkından hesaplanır; hesabın doğruluğu tümüyle εeff '
        + 'değerinin doğruluğuna bağlıdır. εeff geometriden kapalı formla geldiyse sonuç da kapalı '
        + 'form güven seviyesindedir, alan çözücü sonucu değildir. Bu ekran skew bütçesi üretmez — '
        + 'izin verilen değer dışarıdan girilir.',
      en: 'Skew is computed directly from the delay difference of the two lines; the accuracy of '
        + 'the result depends entirely on the accuracy of the εeff value. If εeff came from '
        + 'geometry via a closed form, the result carries closed-form confidence — it is not a '
        + 'field-solver result. This screen does not produce a skew budget — the allowed value is '
        + 'entered from outside.',
    }),

    // Spec eksikliği açıkça görünür kılınıyor: §7.5'in denklem blokları markdown
    // dönüşümünde bozulmuş, tahminle tamamlanmadı. Kullanıcıya dahili kaynak
    // gönderilmez; not yöntemi tarif eder.
    specNote: t({
      tr: 'Bu ekranda gösterilen denklemler hesabın birebir yaptığı işlemlerdir: skew, izin verilen '
        + 'maksimum uzunluk farkı, eklenecek uzunluk ve farklı katman durumu doğrudan iki hattın '
        + 'gecikme farkından türetilir. İfadeler bağımsız bir referans denkleme karşı '
        + 'doğrulanmamıştır; eksik kalan hiçbir adım tahminle tamamlanmadı, kullanılan yazım olduğu '
        + 'gibi gösteriliyor.',
      en: 'The equations shown on this screen are exactly the operations the calculation performs: '
        + 'the skew, the maximum allowed length difference, the length to add and the '
        + 'different-layer case are all derived directly from the delay difference of the two '
        + 'lines. The expressions have not been verified against an independent reference '
        + 'equation; no missing step was filled in by guesswork — the notation used is shown as '
        + 'is.',
    }),

    table: {
      skew: 'Skew',
      deltaL: t({ tr: 'Uzunluk farkı (ΔL)', en: 'Length difference (ΔL)' }),
      delayP: t({ tr: 'P hattı gecikmesi', en: 'P line delay' }),
      delayN: t({ tr: 'N hattı gecikmesi', en: 'N line delay' }),
      sameLayer: t({ tr: 'Hatlar aynı katmanda mı', en: 'Lines on the same layer' }),
      skewMax: t({ tr: 'İzin verilen skew', en: 'Allowed skew' }),
      maxDeltaL: t({
        tr: 'İzin verilene karşılık gelen maksimum ΔL',
        en: 'Maximum ΔL for the allowed skew',
      }),
      addLength: t({
        tr: 'Gecikmesi küçük olan hatta eklenecek uzunluk',
        en: 'Length to add to the line with the smaller delay',
      }),
      addTarget: (addTo) => t({ tr: ` → ${addTo} hattı`, en: ` → ${addTo} line` }),
      epsEffN: t({
        tr: 'N hattı efektif dielektrik sabiti',
        en: 'N line effective dielectric constant',
      }),
      sameEpsSkew: t({
        tr: 'Aynı εeff varsayımıyla skew',
        en: 'Skew under the same-εeff assumption',
      }),
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
      return t({
        tr: 'Tüm zorunlu alanlara pozitif sayısal değer girin. Ondalık için nokta veya virgül kullanabilirsiniz (0.25 = 0,25).',
        en: 'Enter a positive numeric value in every required field. Use a point or a comma for decimals (0.25 = 0,25).',
      })
    },

    commentary: (r) => {
      if (!r.ok) return []

      const out = [epsSourceNote(r.eps)]
      const range = epsRangeNote(r.eps)
      if (range) out.push(range)

      // Ana karar: bütçe içinde mi
      out.push({
        level: r.within ? 'ok' : 'danger',
        text: r.within
          ? t({
            tr: `Skew ${fmtEng(r.skew, 's', 4)}; izin verilen ${fmtEng(r.skewMax, 's', 4)} bütçesinin içinde.`,
            en: `Skew is ${fmtEng(r.skew, 's', 4)}; within the allowed ${fmtEng(r.skewMax, 's', 4)} budget.`,
          })
          : t({
            tr: `Skew ${fmtEng(r.skew, 's', 4)}, izin verilen ${fmtEng(r.skewMax, 's', 4)} bütçesinin dışında. Gecikmesi küçük olan hat uzatılmadan bu çift bütçeyi karşılamaz.`,
            en: `Skew is ${fmtEng(r.skew, 's', 4)}, outside the allowed ${fmtEng(r.skewMax, 's', 4)} budget. Without lengthening the line with the smaller delay this pair does not meet the budget.`,
          }),
      })

      // Eklenecek uzunluk ve hangi hatta ekleneceği
      if (r.addTo === null) {
        out.push({
          level: 'ok',
          text: t({
            tr: 'İki hattın gecikmesi eşit; eklenecek uzunluk yok.',
            en: 'The two lines have equal delay; there is no length to add.',
          }),
        })
      } else {
        out.push({
          level: 'ok',
          text: t({
            tr: `Eşitlemek için ${r.addTo} hattına ${fmtEng(r.addLength, 'm', 4)} eklenmeli. Uzatılacak hat, gecikmesi KÜÇÜK olan hattır — burada ${r.addTo}. Gecikmesi büyük olan ${r.longer} hattına dokunulmaz.`,
            en: `To equalise, ${fmtEng(r.addLength, 'm', 4)} must be added to the ${r.addTo} line. The line to lengthen is the one with the SMALLER delay — here, ${r.addTo}. The ${r.longer} line, which has the larger delay, is left untouched.`,
          }),
        })
      }

      // Bütçenin uzunluk karşılığı. Motor bu sınırı her zaman P hattının t_pd
      // değeriyle hesaplar; farklı katmanda bu ayrım önemlidir.
      out.push({
        level: 'ok',
        text: t({
          tr: `${fmtEng(r.skewMax, 's', 3)} bütçesi, P hattının ${fmt(r.tpdPsPerMmP, 4)} ps/mm gecikmesiyle ${fmtEng(r.maxDeltaL, 'm', 4)} uzunluk farkına karşılık gelir.`,
          en: `The ${fmtEng(r.skewMax, 's', 3)} budget corresponds to a length difference of ${fmtEng(r.maxDeltaL, 'm', 4)} at the P line’s delay of ${fmt(r.tpdPsPerMmP, 4)} ps/mm.`,
        }),
      })

      if (r.differentLayer && !r.sameLayer) {
        // spec §7.5'in açık uyarısı
        out.push({
          level: 'warn',
          text: t({
            tr: 'Hatlar farklı katmanda: yalnızca fiziksel uzunluk eşitlemek yeterli olmayabilir. İki katmanın εeff değeri farklıysa eşit uzunluk eşit gecikme demek değildir; bu durumda eşitlenen büyüklük uzunluk değil GECİKME\'dir.',
            en: 'The lines are on different layers: matching physical length alone may not be enough. If the two layers’ εeff values differ, equal length does not mean equal delay; in that case the quantity being equalised is DELAY, not length.',
          }),
        })

        out.push({
          level: 'warn',
          text: t({
            tr: `P hattı ${fmt(r.tpdPsPerMmP, 4)} ps/mm, N hattı ${fmt(r.tpdPsPerMmN, 4)} ps/mm gecikmeyle ilerliyor. İki hattın birim uzunluk gecikmesi farklı olduğu için uzunlukları tam eşitlemek (ΔL = 0) skew'i sıfırlamaz; grafikte eğrinin ΔL = 0'da sıfırdan başlamaması bunu gösterir.`,
            en: `The P line propagates at ${fmt(r.tpdPsPerMmP, 4)} ps/mm and the N line at ${fmt(r.tpdPsPerMmN, 4)} ps/mm. Because the two lines’ per-unit-length delays differ, making the lengths exactly equal (ΔL = 0) does not zero the skew; on the chart, the curve not starting from zero at ΔL = 0 shows this.`,
          }),
        })

        if (Number.isFinite(r.sameEpsSkew)) {
          out.push({
            level: 'ok',
            text: t({
              tr: `Aynı katman varsayılsaydı (iki hat da εeff = ${fmt(r.eps.epsEff, 4)}) aynı uzunluklarla skew ${fmtEng(r.sameEpsSkew, 's', 4)} çıkardı. Aradaki fark tümüyle katman farkından gelir.`,
              en: `Had the same layer been assumed (both lines at εeff = ${fmt(r.eps.epsEff, 4)}), the same lengths would give a skew of ${fmtEng(r.sameEpsSkew, 's', 4)}. The difference comes entirely from the layer difference.`,
            }),
          })
        }

        out.push({
          level: 'warn',
          text: t({
            tr: 'Bütçenin uzunluk karşılığı (maksimum ΔL) motorda P hattının gecikmesiyle hesaplanır; farklı katman seçildiğinde bu sınır yalnızca P hattı için geçerlidir. N hattının kendi uzunluk sınırını motor vermiyor.',
            en: 'The length equivalent of the budget (maximum ΔL) is computed in the engine with the P line’s delay; when different layers are selected this limit applies only to the P line. The engine does not provide the N line’s own length limit.',
          }),
        })

        // Gecikmesi büyük olan hat aynı zamanda fiziksel olarak kısa hatsa, uzunluk
        // farkını sıfıra çekmek skew'i BÜYÜTÜR: skew'in sıfırlandığı nokta sıfır
        // olmayan bir ΔL'dedir. Bu ekranın ayırmak istediği karışım tam olarak budur.
        const longerIsPhysicallyShorter =
          (r.longer === 'P' && r.lengthP < r.lengthN) ||
          (r.longer === 'N' && r.lengthN < r.lengthP)

        if (longerIsPhysicallyShorter) {
          out.push({
            level: 'warn',
            text: t({
              tr: `Gecikmesi büyük olan ${r.longer} hattı, fiziksel olarak KISA olan hat. Bu çiftte uzunlukları eşitlemeye çalışmak skew'i büyütür — gecikmelerin eşitlendiği nokta sıfır olmayan bir uzunluk farkındadır. Grafikte eğrinin minimumu orasıdır; eşitleme hedefi ΔL = 0 değil, o minimumdur.`,
              en: `The ${r.longer} line, which has the larger delay, is the physically SHORT one. In this pair trying to equalise the lengths increases the skew — the point where the delays become equal is at a non-zero length difference. On the chart that is the minimum of the curve; the matching target is that minimum, not ΔL = 0.`,
            }),
          })
        }
      }

      if (r.differentLayer && r.sameLayer) {
        out.push({
          level: 'warn',
          text: t({
            tr: 'Farklı katman seçildi ama N hattı için girilen εeff, P hattınınkiyle aynı. Motor bu durumu aynı katman gibi ele alıyor; gerçekten farklı bir katmandaysanız o katmanın εeff değerini girin.',
            en: 'Different layers were selected but the εeff entered for the N line equals the P line’s. The engine treats this case as the same layer; if you really are on a different layer, enter that layer’s εeff value.',
          }),
        })
      }

      if (!r.differentLayer) {
        out.push({
          level: 'ok',
          text: t({
            tr: `Aynı katman seçildi: iki hat da ${fmt(r.tpdPsPerMmP, 4)} ps/mm gecikmeyle ilerliyor, bu yüzden uzunluk eşitlemek gecikme eşitlemekle aynı şey. 1 mm uzunluk farkı ${fmt(r.tpdPsPerMmP, 3)} ps skew üretir.`,
            en: `Same layer selected: both lines propagate at ${fmt(r.tpdPsPerMmP, 4)} ps/mm, so matching length is the same thing as matching delay. A 1 mm length difference produces ${fmt(r.tpdPsPerMmP, 3)} ps of skew.`,
          }),
        })
      }

      out.push({
        level: 'warn',
        text: t({
          tr: 'Uzunluk eşitleme serpantinle yapılıyorsa serpantinin kendi kuplajı devreye girer: yan yana gelen kollar hattın yerel empedansını ve efektif gecikmesini değiştirir, eklenen bakır uzunluğu kadar gecikme eklenmeyebilir. Bu ekran serpantin geometrisini modellemez.',
          en: 'If length matching is done with a serpentine, the serpentine’s own coupling comes into play: adjacent legs change the line’s local impedance and effective delay, and the delay added may be less than the copper length added. This screen does not model serpentine geometry.',
        }),
      })

      out.push({
        level: 'warn',
        text: t({
          tr: 'Skew bütçesi bu ekranda üretilmez. İzin verilen maksimum skew, alıcı komponentin veri sayfasından ve protokol dokümanından alınmalıdır; buraya girilen değer bir kabul değil, dışarıdan gelen bir kısıttır.',
          en: 'The skew budget is not produced on this screen. The maximum allowed skew must be taken from the receiving component’s datasheet and the protocol specification; the value entered here is an external constraint, not an assumption.',
        }),
      })

      return out
    },

    formula: t({
      tr: `Birim uzunluk gecikmesi:
  t'_pd = √εeff / c

Hat gecikmeleri:
  t_P = L_P·√εeff,P / c
  t_N = L_N·√εeff,N / c

Skew:
  t_skew = | t_P − t_N |

Uzunluk farkı:
  ΔL = | L_P − L_N |

Aynı katman (εeff,P = εeff,N):
  t_skew = ΔL·√εeff / c

İzin verilen skew bütçesinden:
  ΔL_max = c·t_skew,max / √εeff

Eşitlemek için gecikmesi küçük
olan hatta eklenecek uzunluk:
  aynı katman →
    ΔL_add = | L_P − L_N |
  farklı katman →
    ΔL_add = | t_P − t_N |
      / t'_pd(gecikmesi küçük
              olan hat)

NOT: yukarıdaki yazım hesabın
birebir yaptığı işlemdir. Bağımsız
bir referans denkleme karşı
doğrulanmadı; eksik hiçbir adım
tahminle tamamlanmadı.`,
      en: `Per-unit-length delay:
  t'_pd = √εeff / c

Line delays:
  t_P = L_P·√εeff,P / c
  t_N = L_N·√εeff,N / c

Skew:
  t_skew = | t_P − t_N |

Length difference:
  ΔL = | L_P − L_N |

Same layer (εeff,P = εeff,N):
  t_skew = ΔL·√εeff / c

From the allowed skew budget:
  ΔL_max = c·t_skew,max / √εeff

Length to add to the line with
the smaller delay to equalise:
  same layer →
    ΔL_add = | L_P − L_N |
  different layers →
    ΔL_add = | t_P − t_N |
      / t'_pd(line with the
              smaller delay)

NOTE: the notation above is
exactly what the calculation
does. It was not verified against
an independent reference
equation; no missing step was
filled in by guesswork.`,
    }),

    detail: {
      epsSource: (eps) => (eps.source === 'geometry'
        ? t({
          tr: `εeff kaynağı: geometriden hesaplandı (${eps.model}, yöntem \`${eps.method}\`).`,
          en: `εeff source: computed from geometry (${eps.model}, method \`${eps.method}\`).`,
        })
        : t({
          tr: 'εeff kaynağı: elle girildi.',
          en: 'εeff source: entered manually.',
        })),
      sameLayer: (same) => t({
        tr: `Hatlar aynı katmanda mı: ${same ? 'evet' : 'hayır'}. Motor bu kararı iki εeff değerinin eşitliğine bakarak verir; farklı katman seçilip aynı değer girilirse sonuç aynı katman gibi çıkar.`,
        en: `Lines on the same layer: ${same ? 'yes' : 'no'}. The engine makes this decision by comparing the two εeff values for equality; if different layers are selected but the same value is entered, the result comes out as same-layer.`,
      }),
      maxDeltaL: t({
        tr: 'Bütçenin uzunluk karşılığı (ΔL_max) motorda her zaman P hattının t_pd değeriyle '
          + 'hesaplanır. Farklı katmanda bu sınır yalnızca P hattı için geçerlidir; N hattının '
          + 'kendi sınırını motor döndürmüyor.',
        en: 'The length equivalent of the budget (ΔL_max) is always computed in the engine with '
          + 'the P line’s t_pd value. On different layers this limit applies only to the P line; '
          + 'the engine does not return the N line’s own limit.',
      }),
      addLength: t({
        tr: 'Eklenecek uzunluğun standart tanımı yalnızca aynı katman içindir: |L_P − L_N|. '
          + 'Farklı katman durumunda ne ekleneceğinin yerleşik bir tanımı yoktur; motor o '
          + 'durumda gecikmeyi eşitleyen uzunluğu döndürür — bu, standart tanımın uygulanması '
          + 'değil, bu ekranın genişletmesidir ve burada olduğu gibi işaretlenir.',
        en: 'The standard definition of the length to add applies only to the same layer: '
          + '|L_P − L_N|. For different layers there is no established definition of what to add; '
          + 'in that case the engine returns the length that equalises the delay — this is an '
          + 'extension made by this screen, not an application of the standard definition, and it '
          + 'is flagged as such here.',
      }),
      budgetAlways: t({
        tr: 'Bu ekran skew bütçesini her zaman motora geçirir; motorun bütçesiz dalı kullanılmaz.',
        en: 'This screen always passes the skew budget to the engine; the engine’s no-budget branch is not used.',
      }),
      noRounding: t({
        tr: 'Ara değerlerde yuvarlama yapılmaz; yalnızca gösterim yuvarlanır.',
        en: 'Intermediate values are never rounded; only the display is rounded.',
      }),
    },

    validity: [
      t({
        tr: 'Aynı katman varsayımı, iki hattın εeff değerinin eşit olması demektir. Yalnızca '
          + 'aynı katmanda olmak yetmez: farklı genişlik, farklı komşu düzlem veya farklı '
          + 'yerel yığın da εeff\'i ayırır ve eşit uzunluk eşit gecikme vermez.',
        en: 'The same-layer assumption means the two lines have equal εeff. Merely being on the '
          + 'same layer is not enough: a different width, a different adjacent plane or a '
          + 'different local stack-up also separates εeff, and equal length does not give equal '
          + 'delay.',
      }),
      t({
        tr: 'Farklı katman seçildiğinde eşitlenen büyüklük fiziksel uzunluk değil gecikmedir: '
          + 'yalnızca fiziksel uzunluk eşitlemek yeterli olmayabilir.',
        en: 'When different layers are selected the quantity being equalised is delay, not '
          + 'physical length: matching physical length alone may not be enough.',
      }),
      t({
        tr: 'Eşitleme serpantin (meander) ile yapıldığında serpantinin kendi kuplajı devreye '
          + 'girer: yan yana gelen kollar yerel empedansı düşürür ve eklenen bakır uzunluğu '
          + 'kadar gecikme eklenmeyebilir. Bu ekran serpantin geometrisini modellemez; sonuç '
          + 'düz bir hat uzatması varsayar.',
        en: 'When matching is done with a serpentine (meander), the serpentine’s own coupling '
          + 'comes into play: adjacent legs lower the local impedance and the delay added may be '
          + 'less than the copper length added. This screen does not model serpentine geometry; '
          + 'the result assumes a straight line extension.',
      }),
      t({
        tr: 'Skew bütçesi bu ekranda üretilmez. İzin verilen maksimum skew, alıcı komponentin '
          + 'veri sayfasından ve protokol dokümanından gelmelidir; ekranın verdiği tek şey o '
          + 'bütçenin uzunluk karşılığıdır.',
        en: 'The skew budget is not produced on this screen. The maximum allowed skew must come '
          + 'from the receiving component’s datasheet and the protocol specification; the only '
          + 'thing this screen provides is that budget’s length equivalent.',
      }),
      t({
        tr: 'Hat kayıpsız ve dispersiyonsuz kabul edilir; dielektrik sabiti frekanstan bağımsız '
          + 'alınır. Geniş bantlı sinyalde tek bir εeff yeterli değildir.',
        en: 'The line is assumed lossless and dispersion-free; the dielectric constant is taken '
          + 'as frequency-independent. For a wideband signal a single εeff is not sufficient.',
      }),
      t({
        tr: 'Via geçişleri, konnektör, pad ve komponent içi gecikme farkları hesaba girmez. '
          + 'Gerçek sistemde bunlar da skew bütçesini tüketir.',
        en: 'Via transitions, connectors, pads and on-component delay differences are not '
          + 'included. In a real system these also consume the skew budget.',
      }),
      t({
        tr: 'Çift içi (intra-pair) skew ile çiftler arası (inter-pair) skew ayrı bütçelerdir; '
          + 'bu ekran yalnızca tek bir çiftin iki hattını karşılaştırır.',
        en: 'Intra-pair skew and inter-pair skew are separate budgets; this screen compares only '
          + 'the two lines of a single pair.',
      }),
      t({
        tr: 'Sonuçlar yaklaşıktır — kritik tasarımlarda üretici verisi ve ölçümle doğrulayın.',
        en: 'Results are approximate — verify against manufacturer data and measurement for '
          + 'critical designs.',
      }),
    ],

    chart: {
      x: t({ tr: 'Uzunluk farkı ΔL (mm)', en: 'Length difference ΔL (mm)' }),
      y: 'Skew (ps)',
      caption: t({
        tr: 'Fiziksel olarak uzun hat sabit tutulur, kısa hat kısaltılıp uzatılır. Aynı katmanda skew uzunluk farkıyla doğru orantılıdır: ΔL küçüldükçe doğrusal olarak sıfıra iner. Kesikli çizgi izin verilen skew bütçesidir; eğri o çizginin altına indiği anda uzunluk farkı bütçenin içindedir. Farklı katman seçildiğinde eğri iki noktada birden ayrışır: ΔL = 0 noktasında sıfırdan başlamaz — kalan fark iki katmanın εeff farkından gelir — ve tek yönlü değildir. Gecikmesi büyük olan hat fiziksel olarak kısa hatsa, ΔL büyüdükçe skew önce DÜŞER, bir minimumdan geçer, sonra yeniden yükselir. O minimumda gecikmeler eşitlenmiştir. Yani farklı katmanda en iyi uzunluk farkı sıfır değildir; sıfıra çekmek skew\'i büyütebilir.',
        en: 'The physically longer line is held fixed while the short line is shortened and lengthened. On the same layer skew is directly proportional to the length difference: as ΔL shrinks it falls linearly to zero. The dashed line is the allowed skew budget; the moment the curve drops below that line the length difference is within the budget. When different layers are selected the curve departs in two ways at once: it does not start from zero at ΔL = 0 — the remaining difference comes from the εeff difference of the two layers — and it is not one-directional. If the line with the larger delay is the physically short one, the skew first DECREASES as ΔL grows, passes through a minimum and then rises again. At that minimum the delays are equal. So on different layers the best length difference is not zero; forcing it to zero can increase the skew.',
      }),
      seriesSkew: 'skew',
      seriesSame: t({ tr: 'aynı εeff varsayımı', en: 'same-εeff assumption' }),
      budgetLegend: t({ tr: 'izin verilen skew', en: 'allowed skew' }),
      budgetRef: (y) => t({
        tr: `izin verilen skew — ${fmt(y, 3)} ps`,
        en: `allowed skew — ${fmt(y, 3)} ps`,
      }),
      operatingPoint: t({ tr: 'çalışma noktası', en: 'operating point' }),
    },

    schematic: {
      title: t({
        tr: 'Diferansiyel çift — uzunluk eşitleme',
        en: 'Differential pair — length matching',
      }),
      captionEqual: t({
        tr: 'İki hattın gecikmesi eşit; eşitleme gerekmiyor',
        en: 'The two lines have equal delay; no matching is needed',
      }),
      captionDefault: t({
        tr: 'Gecikmesi küçük olan hat serpantinle uzatılır; ΔL iki hattın uzunluk farkıdır',
        en: 'The line with the smaller delay is lengthened with a serpentine; ΔL is the length difference of the two lines',
      }),
      sameLayerEps: t({
        tr: 'εeff,N = εeff,P (aynı katman)',
        en: 'εeff,N = εeff,P (same layer)',
      }),
      addSuffix: (addTo, len) => t({
        tr: ` · ${addTo} hattına +${len}`,
        en: ` · +${len} to the ${addTo} line`,
      }),
    },
  }
}
