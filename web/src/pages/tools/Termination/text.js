// Terminasyon ekranının kullanıcıya görünen metinleri — iki dilli (tr/en).
//
// Hesap katmanı yalnızca kod ve sayı üretir; dile çeviri burada yapılır.
// Ekran `getText(lang)` çağırır ve çözülmüş metin nesnesini kullanır; koşullu
// metin üreten yerler (yorum, hata nedeni) fonksiyon olarak döner ki mantık
// tek kopya kalsın, yalnızca dizeler dile göre seçilsin.

import { fmt, fmtRes, fmtPct, fmtVolt, fmtAmp, fmtWatt } from '../../../lib/num'
import { pick } from '../../../lib/i18n'
import { commonText } from '../../../data/uiText'
import {
  TERM_SERIES, TERM_PARALLEL, TERM_THEVENIN,
  REASON_NEGATIVE_SERIES, REASON_BIAS,
  SERIES_TERM_ESERIES,
} from './model'

// --- Sapma eşikleri ---
//
// DİKKAT: bu iki eşik MÜHENDİSLİK YORUMUDUR, docs/spec.md §7.7'den GELMEZ.
// Spec standart değere kuantalamanın ne kadar sapma üretebileceğine dair
// hiçbir sınır tanımlamıyor; yalnızca "gerçek bias ile gerçek paralel direnç
// tekrar hesaplanmalıdır" diyor. Kabul edilebilir sapma tasarımın gürültü ve
// gerilim bütçesine bağlıdır. Aşağıdaki değerler yaygın bir başlangıç kabulü
// olarak seçilmiştir ve spec'ten doğrulanamaz.
//
// Eşikler dışarı açılmaz: metin de seviye kararı da bu dosyanın içinde kalır.
const DEV_WARN_PCT = 5
const DEV_DANGER_PCT = 10

// Seviye kararı dilden bağımsızdır — yalnızca sayıya bakar, tek kopya kalır.
function deviationLevel(pct) {
  const a = Math.abs(pct)
  if (!Number.isFinite(a)) return 'warn'
  if (a > DEV_DANGER_PCT) return 'danger'
  if (a > DEV_WARN_PCT) return 'warn'
  return 'ok'
}

export function getText(lang) {
  const t = (dict) => pick(dict, lang)

  // Yüzde işaretinin yeri dile göre değişir: Türkçe %5, İngilizce 5%.
  // Sayının kendisi her iki dilde de fmt() ile üretilir.
  // Yüzde işaretinin yeri dile göre değişir; kalıp uiText.js'te tek yerdedir.
  const { pct } = commonText(lang)
  // Üç yerde birden kullanılan notlar tek kopya tutulur: sonuç panelindeki
  // `.method-note`, sağ paneldeki geçerlilik listesi ve mühendislik yorumu.
  const methodNote = t({
    tr: 'DC tasarım denklemleri. Motor yalnızca kalıcı davranışı hesaplar: '
      + 'yansıma, çınlama, kapasitif yük, sürücü kenar hızı ve sap etkileri modellenmez. '
      + 'Sonuç bir başlangıç değeridir, zaman alanı simülasyonunun yerini tutmaz.',
    en: 'DC design equations. The engine computes only the steady-state behaviour: reflection, '
      + 'ringing, capacitive loading, driver edge rate and stub effects are not modelled. The '
      + 'result is a starting value; it does not replace a time-domain simulation.',
  })

  const seriesEseriesNote = t({
    tr: `Seri terminasyonda standart değer adayları yalnızca ${SERIES_TERM_ESERIES} dizisinden `
      + 'geliyor: motorun seri terminasyon fonksiyonu E serisi seçimi kabul etmiyor. E serisi '
      + 'seçimi bu ekranda yalnızca Thevenin çiftinde etkilidir.',
    en: 'In series termination the standard-value candidates come only from the '
      + `${SERIES_TERM_ESERIES} series: the engine’s series-termination function does not accept `
      + 'an E-series selection. On this screen the E-series selection has an effect only on the '
      + 'Thevenin pair.',
  })

  const theveninIdcNote = t({
    tr: 'Sürekli akım ve güç İDEAL R_top / R_bottom değerlerinden hesaplanıyor; seçilen standart '
      + 'çiftin gerçek akımı bundan bir miktar farklıdır. Motor bu iki alanı ideal çiftten '
      + 'döndürüyor, bu sınır burada gizlenmiyor.',
    en: 'The continuous current and power are computed from the IDEAL R_top / R_bottom values; the '
      + 'real current of the selected standard pair differs from this somewhat. The engine returns '
      + 'these two fields from the ideal pair, and that limitation is not hidden here.',
  })

  const devThresholdNote = t({
    tr: `Sapma eşikleri (${pct(DEV_WARN_PCT)} üzeri uyarı, ${pct(DEV_DANGER_PCT)} üzeri sınır `
      + 'dışı) bu ekranın mühendislik yorumudur; kullanılan DC tasarım denklemleri böyle bir '
      + 'sınır tanımlamaz. Kabul edilebilir sapma tasarımın gürültü ve gerilim bütçesine göre '
      + 'değişir.',
    en: `The deviation thresholds (above ${pct(DEV_WARN_PCT)} a warning, above `
      + `${pct(DEV_DANGER_PCT)} outside the limit) are this screen’s engineering judgement; the DC `
      + 'design equations used define no such limit. The acceptable deviation depends on the '
      + 'noise and voltage budget of the design.',
  })

  const timeDomainNote = (kind) => t({
    tr: `Bu ekran ${kind.tr}. Gerçek kenar davranışı (yansıma, çınlama, basamak) yalnızca zaman `
      + 'alanı simülasyonu veya ölçümle doğrulanabilir.',
    en: `This screen ${kind.en}. The real edge behaviour (reflection, ringing, stepping) can only `
      + 'be verified with a time-domain simulation or a measurement.',
  })

  // --- Mühendislik yorumu: tipe göre üç dal ---

  const seriesNotes = (r) => {
    const out = []

    out.push({
      level: 'ok',
      text: t({
        tr: `Gereken seri direnç R_s = Z₀ − R_driver = ${fmtRes(r.Rs, 4)}. Sürücü direnci ile `
          + `toplam kaynak empedansı ${fmtRes(r.total, 4)} olur ve hattın ${fmtRes(r.Z0, 4)} `
          + 'değerine oturur.',
        en: `The required series resistor is R_s = Z₀ − R_driver = ${fmtRes(r.Rs, 4)}. Together `
          + `with the driver resistance the total source impedance becomes ${fmtRes(r.total, 4)} `
          + `and lands on the line’s ${fmtRes(r.Z0, 4)}.`,
      }),
    })

    if (!r.std) {
      out.push({
        level: 'ok',
        text: t({
          tr: 'R_s sıfır çıktı: sürücü çıkış direnci zaten hat empedansına eşit, ayrıca seri '
            + 'direnç gerekmez. Yine de üretim toleransı ve sıcaklık sürücü direncini kaydırır; '
            + 'ölçümle doğrulayın.',
          en: 'R_s came out zero: the driver output resistance already equals the line impedance, '
            + 'so no additional series resistor is needed. Manufacturing tolerance and temperature '
            + 'still shift the driver resistance; verify by measurement.',
        }),
      })
    } else {
      out.push({
        level: deviationLevel(r.stdErrPct),
        text: t({
          tr: `En yakın ${r.eseries} değeri ${fmtRes(r.std.value, 4)} (hedeften `
            + `${pct(fmtPct(r.std.errorPct))}). Bu standart değerle kaynak empedansı `
            + `${fmtRes(r.withStandard, 4)} olur ve Z₀'dan ${pct(fmtPct(r.stdErrPct))} kayar — `
            + 'kuantalama doğrudan kaynak eşlemesini bozar, artan fark hat sonundan dönen dalganın '
            + 'bir kısmını ikinci kez yansıtır.',
          en: `The nearest ${r.eseries} value is ${fmtRes(r.std.value, 4)} `
            + `(${pct(fmtPct(r.std.errorPct))} from the target). With this standard value the source `
            + `impedance becomes ${fmtRes(r.withStandard, 4)} and moves away from Z₀ by `
            + `${pct(fmtPct(r.stdErrPct))} — quantisation breaks the source match directly, and the `
            + 'resulting difference reflects part of the wave returning from the far end a second '
            + 'time.',
        }),
      })

      out.push({
        level: 'warn',
        text: t({
          tr: `Seçilen direncin üretim toleransı bu sapmanın üzerine biner: kuantalama farkı `
            + `(${pct(fmtPct(r.stdErrPct))}) ile tolerans bandı aynı yöne düşerse kaynak empedansı daha `
            + 'da uzaklaşır. Dar toleranslı bir değer seçmek kuantalama sapmasını düzeltmez.',
          en: 'The manufacturing tolerance of the chosen resistor adds on top of this deviation: if '
            + `the quantisation error (${pct(fmtPct(r.stdErrPct))}) and the tolerance band fall in the `
            + 'same direction, the source impedance moves even further away. Choosing a '
            + 'tighter-tolerance value does not correct the quantisation error.',
        }),
      })
    }

    out.push({
      level: 'warn',
      text: t({
        tr: 'Seri terminasyon tek yük içindir. Hat üzerinde dallanma ya da birden fazla alıcı '
          + 'varsa ara noktalarda yarım genlikli bir basamak görünür; bu topolojide seri '
          + 'terminasyon doğru seçim değildir.',
        en: 'Series termination is for a single load. If the line has a branch or more than one '
          + 'receiver, a half-amplitude step appears at the intermediate points; in that topology '
          + 'series termination is not the right choice.',
      }),
    })

    out.push({
      level: 'ok',
      text: t({
        tr: 'Sürekli DC güç kaybı yoktur: seri direnç yalnızca geçiş anında akım taşır. Paralel ve '
          + 'Thevenin yöntemlerinden ayrıldığı temel nokta budur.',
        en: 'There is no continuous DC power loss: the series resistor carries current only during '
          + 'the transition. That is the fundamental point where it parts from the parallel and '
          + 'Thevenin methods.',
      }),
    })

    out.push({ level: 'warn', text: seriesEseriesNote })
    out.push({ level: 'warn', text: devThresholdNote })

    out.push({
      level: 'warn',
      text: timeDomainNote({ tr: 'DC eşleme hesabı yapar', en: 'performs a DC matching calculation' }),
    })

    return out
  }

  const parallelNotes = (r) => {
    const out = []

    out.push({
      level: 'ok',
      text: t({
        tr: `R_T = Z₀ = ${fmtRes(r.RT, 4)}. Hat yük ucunda eşlendiği için gelen dalga `
          + 'sonlandırıcıda yutulur, kaynağa geri dönmez.',
        en: `R_T = Z₀ = ${fmtRes(r.RT, 4)}. Because the line is matched at the load end, the `
          + 'incident wave is absorbed in the terminator and does not travel back to the source.',
      }),
    })

    out.push({
      level: 'warn',
      text: t({
        tr: `DC güç kaybı SÜREKLİDİR: terminasyon direnci ${fmtVolt(r.V)} altında `
          + `${fmtAmp(r.Idc)} çeker ve ${fmtWatt(r.Pdc)} dağıtır. Bu güç sinyal dursa bile akar — `
          + 'paralel terminasyonun bedeli budur ve seri terminasyonda yoktur.',
        en: `The DC power loss is CONTINUOUS: under ${fmtVolt(r.V)} the termination resistor draws `
          + `${fmtAmp(r.Idc)} and dissipates ${fmtWatt(r.Pdc)}. This power flows even when the `
          + 'signal stops — that is the price of parallel termination, and series termination does '
          + 'not pay it.',
      }),
    })

    out.push({
      level: 'ok',
      text: t({
        tr: `Duty cycle ${pct(fmt(r.duty * 100, 4))} ile ortalama güç ${fmtWatt(r.Pavg)}. Ortalama `
          + 'değer yalnızca ısınma bütçesi içindir; direnç paketi en kötü durumdaki sürekli '
          + `${fmtWatt(r.Pdc)} değerine göre seçilmelidir.`,
        en: `At a duty cycle of ${pct(fmt(r.duty * 100, 4))} the average power is `
          + `${fmtWatt(r.Pavg)}. The average value is only for the thermal budget; the resistor `
          + `package must be selected for the worst-case continuous ${fmtWatt(r.Pdc)}.`,
      }),
    })

    out.push({
      level: 'warn',
      text: t({
        tr: `Aynı hattın onlarca kopyası varsa bu güç doğrudan çarpılır: her sonlandırılmış hat `
          + `${fmtWatt(r.Pdc)} ekler. Yüksek hızlı veri yollarında paralel terminasyonun toplam `
          + 'maliyeti bu çarpımdır.',
        en: 'If there are dozens of copies of the same line, this power is multiplied directly: '
          + `every terminated line adds ${fmtWatt(r.Pdc)}. On high-speed buses the total cost of `
          + 'parallel termination is that product.',
      }),
    })

    out.push({
      level: 'warn',
      text: t({
        tr: 'Motor tek bir gerilim alır: V, terminasyon direnci üzerinde kalan sürekli gerilim '
          + 'farkıdır. Direnç toprağa değil ayrı bir terminasyon rayına çekiliyorsa girilen değer '
          + 'bu farkı yansıtmalıdır — aksi halde güç olduğundan büyük ya da küçük çıkar.',
        en: 'The engine takes a single voltage: V is the steady-state voltage difference across '
          + 'the termination resistor. If the resistor is pulled to a separate termination rail '
          + 'rather than to ground, the value entered must reflect that difference — otherwise the '
          + 'power comes out larger or smaller than it really is.',
      }),
    })

    out.push({
      level: 'ok',
      text: t({
        tr: `R_T = Z₀ tasarım serbestliği bırakmaz; değişebilen tek şey gerilim ve duty cycle'dır. `
          + `Hat empedansı düştükçe güç artar: Z₀ yarıya inerse ${fmtWatt(r.Pdc)} iki katına çıkar.`,
        en: 'R_T = Z₀ leaves no design freedom; the only things that can change are the voltage and '
          + 'the duty cycle. As the line impedance falls the power rises: if Z₀ halves, '
          + `${fmtWatt(r.Pdc)} doubles.`,
      }),
    })

    out.push({
      level: 'warn',
      text: timeDomainNote({
        tr: 'DC eşleme ve güç hesabı yapar',
        en: 'performs a DC matching and power calculation',
      }),
    })

    return out
  }

  const theveninNotes = (r) => {
    const out = []
    const s = r.standard

    out.push({
      level: 'ok',
      text: t({
        tr: `İdeal çift R_top = ${fmtRes(r.ideal.Rtop, 4)}, R_bottom = `
          + `${fmtRes(r.ideal.Rbottom, 4)} (a = V_bias / V_cc = ${fmt(r.ideal.a, 4)}). Bu çiftin `
          + `paralel eşdeğeri tam olarak Z₀ = ${fmtRes(r.Z0, 4)} verir ve bölücü tam olarak `
          + `${fmtVolt(r.Vbias)} bias üretir.`,
        en: `The ideal pair is R_top = ${fmtRes(r.ideal.Rtop, 4)}, R_bottom = `
          + `${fmtRes(r.ideal.Rbottom, 4)} (a = V_bias / V_cc = ${fmt(r.ideal.a, 4)}). The parallel `
          + `equivalent of this pair gives exactly Z₀ = ${fmtRes(r.Z0, 4)} and the divider produces `
          + `exactly ${fmtVolt(r.Vbias)} of bias.`,
      }),
    })

    out.push({
      level: 'warn',
      text: t({
        tr: `Standart değere kuantalamak HEM empedansı HEM bias'ı birden kaydırır. Seçilen `
          + `${r.series} çifti ${fmtRes(s.Rtop, 4)} / ${fmtRes(s.Rbottom, 4)}: iki direnç bağımsız `
          + 'değildir, birini düzeltmek diğerini bozar. Motor bu yüzden iki sapmanın toplamını en '
          + 'küçükleyen çifti seçiyor.',
        en: 'Quantising to standard values shifts BOTH the impedance AND the bias at once. The '
          + `selected ${r.series} pair is ${fmtRes(s.Rtop, 4)} / ${fmtRes(s.Rbottom, 4)}: the two `
          + 'resistors are not independent, and correcting one breaks the other. That is why the '
          + 'engine picks the pair that minimises the sum of the two deviations.',
      }),
    })

    out.push({
      level: deviationLevel(s.zErr),
      text: t({
        tr: `Empedans sapması: gerçekleşen paralel direnç ${fmtRes(s.Rpar, 4)}, hedef Z₀ `
          + `${fmtRes(r.Z0, 4)} — sapma ${pct(fmtPct(s.zErr))}. Eşlemedeki bu fark hat sonunda kalıcı `
          + 'bir yansıma bırakır.',
        en: `Impedance deviation: the realised parallel resistance is ${fmtRes(s.Rpar, 4)}, the `
          + `target Z₀ is ${fmtRes(r.Z0, 4)} — deviation ${pct(fmtPct(s.zErr))}. This difference in the `
          + 'match leaves a permanent reflection at the end of the line.',
      }),
    })

    out.push({
      level: deviationLevel(s.vErr),
      text: t({
        tr: `Bias sapması: gerçekleşen bias ${fmtVolt(s.bias)}, hedef ${fmtVolt(r.Vbias)} — sapma `
          + `${pct(fmtPct(s.vErr))}. Bu kayma alıcının eşik gerilimine göre gürültü payını asimetrik `
          + 'hale getirir.',
        en: `Bias deviation: the realised bias is ${fmtVolt(s.bias)}, the target is `
          + `${fmtVolt(r.Vbias)} — deviation ${pct(fmtPct(s.vErr))}. This shift makes the noise margin `
          + 'asymmetric with respect to the receiver’s threshold voltage.',
      }),
    })

    out.push({
      level: 'warn',
      text: t({
        tr: `Sürekli akım V_cc'den SÜREKLİ çekilir: ${fmtAmp(r.Idc)}, yani ${fmtWatt(r.Pdc)}. `
          + 'Sürücü hiç anahtarlamasa bile bu akım akar; her Thevenin sonlandırılmış hat besleme '
          + 'bütçesine bu kadar ekler.',
        en: `The current is drawn from V_cc CONTINUOUSLY: ${fmtAmp(r.Idc)}, i.e. `
          + `${fmtWatt(r.Pdc)}. This current flows even if the driver never switches; every `
          + 'Thevenin-terminated line adds this much to the supply budget.',
      }),
    })

    out.push({ level: 'warn', text: theveninIdcNote })

    out.push({
      level: 'warn',
      text: t({
        tr: 'İki direncin toleransı da sonuca girer ve birbirinden bağımsızdır: en kötü durumda '
          + 'biri üst, diğeri alt uçta olur; empedans ve bias sapmaları bu ekranda gösterilenden '
          + 'büyük olabilir. Toleransın etkisi motorda hesaplanmıyor.',
        en: 'The tolerance of both resistors enters the result as well, and the two are independent '
          + 'of each other: in the worst case one sits at the upper end and the other at the lower '
          + 'end; the impedance and bias deviations can then be larger than the ones shown on this '
          + 'screen. The effect of tolerance is not computed in the engine.',
      }),
    })

    out.push({ level: 'warn', text: devThresholdNote })

    out.push({
      level: 'warn',
      text: timeDomainNote({
        tr: 'DC eşleme ve bias hesabı yapar',
        en: 'performs a DC matching and bias calculation',
      }),
    })

    return out
  }

  return {
    backlink: t({ tr: '← Sinyal Bütünlüğü', en: '← Signal Integrity' }),
    title: t({ tr: 'Terminasyon Hesaplayıcı', en: 'Termination Calculator' }),
    intro: t({
      tr: 'Seri, paralel ve Thevenin terminasyon için direnç değerlerini, standart E serisi '
        + 'karşılıklarını ve kuantalamanın empedans ile bias üzerinde bıraktığı sapmayı hesaplar.',
      en: 'Computes the resistor values for series, parallel and Thevenin termination, their '
        + 'standard E-series equivalents and the deviation that quantisation leaves in the '
        + 'impedance and in the bias.',
    }),

    typeGroup: t({ tr: 'Terminasyon türü', en: 'Termination type' }),
    typeLabel: {
      [TERM_SERIES]: t({ tr: 'Seri', en: 'Series' }),
      [TERM_PARALLEL]: t({ tr: 'Paralel', en: 'Parallel' }),
      [TERM_THEVENIN]: t({ tr: 'Thevenin', en: 'Thevenin' }),
    },

    fields: {
      Z0: {
        label: t({ tr: 'Hat empedansı (Z₀)', en: 'Line impedance (Z₀)' }),
        hint: t({
          tr: 'Kontrollü empedans hattının karakteristik empedansı',
          en: 'Characteristic impedance of the controlled-impedance line',
        }),
      },
      Rdriver: {
        label: t({
          tr: 'Sürücü çıkış direnci (R_driver)',
          en: 'Driver output resistance (R_driver)',
        }),
        hint: t({
          tr: 'Sürücünün veri sayfasındaki çıkış empedansı; 0 girilebilir',
          en: 'The driver’s output impedance from its datasheet; 0 may be entered',
        }),
      },
      V: {
        label: t({ tr: 'Terminasyon gerilimi (V)', en: 'Termination voltage (V)' }),
        hint: t({
          tr: 'Terminasyon direnci üzerinde kalan sürekli gerilim farkı',
          en: 'The steady-state voltage difference across the termination resistor',
        }),
      },
      duty: {
        label: t({ tr: 'Duty cycle', en: 'Duty cycle' }),
        hint: t({
          tr: 'Yalnızca ortalama gücü etkiler; 0\'dan büyük, en çok 100',
          en: 'Affects the average power only; greater than 0, at most 100',
        }),
      },
      Vcc: {
        label: t({ tr: 'Besleme gerilimi (V_cc)', en: 'Supply voltage (V_cc)' }),
      },
      Vbias: {
        label: t({ tr: 'Hedef bias gerilimi (V_bias)', en: 'Target bias voltage (V_bias)' }),
        hint: t({ tr: 'V_cc\'den küçük olmalı', en: 'Must be smaller than V_cc' }),
      },
      eseries: {
        label: t({ tr: 'E serisi', en: 'E-series' }),
        hint: t({
          tr: 'Standart direnç çifti bu diziden seçilir',
          en: 'The standard resistor pair is chosen from this series',
        }),
      },
    },

    // Hata mesajında alan adı olarak görünen etiketler; model.js'e verilir.
    fieldLabels: {
      Z0: t({ tr: 'Hat empedansı (Z₀)', en: 'Line impedance (Z₀)' }),
      Rdriver: t({
        tr: 'Sürücü çıkış direnci (R_driver)',
        en: 'Driver output resistance (R_driver)',
      }),
      V: t({ tr: 'Terminasyon gerilimi (V)', en: 'Termination voltage (V)' }),
      duty: t({ tr: 'Duty cycle', en: 'Duty cycle' }),
      Vcc: t({ tr: 'Besleme gerilimi (V_cc)', en: 'Supply voltage (V_cc)' }),
      Vbias: t({ tr: 'Hedef bias gerilimi (V_bias)', en: 'Target bias voltage (V_bias)' }),
    },

    // Yüzde işareti yerleşimi (tr: %5, en: 5%) — sayıyı fmt() üretir.
    pct,

    // Geçersiz alan adları, hata cümlesinin arkasına eklenir.
    invalidFields: (fields) => t({
      tr: ` Etkilenen alan: ${fields.join(', ')}.`,
      en: ` Affected field${fields.length === 1 ? '' : 's'}: ${fields.join(', ')}.`,
    }),

    methodNote,
    seriesEseriesNote,
    theveninIdcNote,

    bigLabel: {
      [TERM_SERIES]: t({ tr: 'Gereken seri direnç', en: 'Required series resistor' }),
      [TERM_PARALLEL]: t({ tr: 'Terminasyon direnci', en: 'Termination resistor' }),
      [TERM_THEVENIN]: (series) => t({
        tr: `Standart çift (${series})`,
        en: `Standard pair (${series})`,
      }),
    },

    bigAlt: {
      seriesNearest: (series, value) => t({
        tr: `en yakın ${series} ${value}`,
        en: `nearest ${series} ${value}`,
      }),
      seriesSource: (value) => t({
        tr: `kaynak empedansı ${value}`,
        en: `source impedance ${value}`,
      }),
      seriesMatched: t({
        tr: 'sürücü zaten eşlemeli — ek seri direnç gerekmiyor',
        en: 'the driver is already matched — no extra series resistor is needed',
      }),
      parallelDc: (p) => t({ tr: `sürekli ${p} DC güç`, en: `${p} continuous DC power` }),
      parallelAvg: (p) => t({ tr: `ortalama ${p}`, en: `average ${p}` }),
      theveninPar: (value, err) => t({
        tr: `R∥ = ${value} (${err})`,
        en: `R∥ = ${value} (${err})`,
      }),
      theveninBias: (value, err) => t({
        tr: `bias ${value} (${err})`,
        en: `bias ${value} (${err})`,
      }),
    },

    // Değeri olmayan hücre — tek yerde tutulur.
    none: t({ tr: '—', en: '—' }),

    table: {
      Rs: t({ tr: 'Seri direnç (R_s)', en: 'Series resistor (R_s)' }),
      nearest: (series, i) => t({
        tr: `En yakın ${series} değeri ${i}`,
        en: `Nearest ${series} value ${i}`,
      }),
      withStandard: t({
        tr: 'Standart değerle kaynak empedansı',
        en: 'Source impedance with the standard value',
      }),
      total: t({ tr: 'İdeal toplam kaynak empedansı', en: 'Ideal total source impedance' }),
      Rdriver: t({
        tr: 'Sürücü çıkış direnci (R_driver)',
        en: 'Driver output resistance (R_driver)',
      }),
      Z0: t({ tr: 'Hat empedansı (Z₀)', en: 'Line impedance (Z₀)' }),

      RT: t({ tr: 'Terminasyon direnci (R_T)', en: 'Termination resistor (R_T)' }),
      IdcParallel: t({ tr: 'Sürekli DC akım (I_dc)', en: 'Continuous DC current (I_dc)' }),
      PdcParallel: t({ tr: 'Sürekli DC güç (P_dc)', en: 'Continuous DC power (P_dc)' }),
      Pavg: t({
        tr: 'Duty cycle ile ortalama güç (P_ort)',
        en: 'Average power at the duty cycle (P_avg)',
      }),
      duty: t({ tr: 'Duty cycle', en: 'Duty cycle' }),
      V: t({ tr: 'Terminasyon gerilimi (V)', en: 'Termination voltage (V)' }),

      idealRtop: t({ tr: 'İdeal R_top', en: 'Ideal R_top' }),
      idealRbottom: t({ tr: 'İdeal R_bottom', en: 'Ideal R_bottom' }),
      biasRatio: t({
        tr: 'Bias oranı (a = V_bias / V_cc)',
        en: 'Bias ratio (a = V_bias / V_cc)',
      }),
      standardPair: t({ tr: 'Seçilen standart çift', en: 'Selected standard pair' }),
      Rpar: t({
        tr: 'Gerçekleşen paralel direnç (R∥)',
        en: 'Realised parallel resistance (R∥)',
      }),
      zErr: t({ tr: 'Z₀\'dan sapma (zErr)', en: 'Deviation from Z₀ (zErr)' }),
      bias: t({ tr: 'Gerçekleşen bias', en: 'Realised bias' }),
      vErr: t({
        tr: 'Hedef bias\'tan sapma (vErr)',
        en: 'Deviation from the target bias (vErr)',
      }),
      Idc: t({ tr: 'Sürekli akım (I_dc)', en: 'Continuous current (I_dc)' }),
      Pdc: t({ tr: 'Sürekli güç (P_dc)', en: 'Continuous power (P_dc)' }),
      eseries: t({ tr: 'E serisi', en: 'E-series' }),
    },

    formula: t({
      tr: `Seri terminasyon:
  R_s = Z₀ − R_driver
  R_s < 0 →
    seri terminasyon önerilmez

Paralel terminasyon:
  R_T   = Z₀
  P_dc  = V² / R_T
  P_ort = D · V² / R_T

Thevenin terminasyonu:
  a = V_bias / V_cc

  R_top    = Z₀ / a
           = Z₀ · V_cc / V_bias
  R_bottom = Z₀ / (1 − a)
           = Z₀ · V_cc
             / (V_cc − V_bias)

  R_top ∥ R_bottom = Z₀
  V_bias = V_cc · R_bottom
           / (R_top + R_bottom)

Sürekli akım ve güç — OHM YASASI,
terminasyon denklemlerinin
parçası DEĞİL:
  paralel:
    I_dc = V / R_T
  Thevenin:
    I_dc = V_cc
           / (R_top + R_bottom)
    P_dc = V_cc²
           / (R_top + R_bottom)

Standart çift seçildikten sonra
gerçek bias ve gerçek paralel
direnç yeniden hesaplanır —
kuantalama ikisini birden
kaydırır.`,
      en: `Series termination:
  R_s = Z₀ − R_driver
  R_s < 0 →
    series termination
    not recommended

Parallel termination:
  R_T   = Z₀
  P_dc  = V² / R_T
  P_avg = D · V² / R_T

Thevenin termination:
  a = V_bias / V_cc

  R_top    = Z₀ / a
           = Z₀ · V_cc / V_bias
  R_bottom = Z₀ / (1 − a)
           = Z₀ · V_cc
             / (V_cc − V_bias)

  R_top ∥ R_bottom = Z₀
  V_bias = V_cc · R_bottom
           / (R_top + R_bottom)

Continuous current and power —
OHM'S LAW, NOT part of the
termination equations:
  parallel:
    I_dc = V / R_T
  Thevenin:
    I_dc = V_cc
           / (R_top + R_bottom)
    P_dc = V_cc²
           / (R_top + R_bottom)

Once the standard pair is chosen
the real bias and the real
parallel resistance are
recomputed — quantisation shifts
both at once.`,
    }),

    typeNote: {
      [TERM_SERIES]: t({
        tr: 'Seri terminasyon kaynak ucunda eşleme yapar: hattın sonundan dönen yansıma ikinci '
          + 'geçişte sürücü tarafında yutulur. Hat sonunda tek bir alıcı olduğu varsayılır.',
        en: 'Series termination matches at the source end: the reflection returning from the far '
          + 'end of the line is absorbed on the driver side on its second pass. A single receiver '
          + 'at the end of the line is assumed.',
      }),
      [TERM_PARALLEL]: t({
        tr: 'Paralel terminasyon yük ucunda eşleme yapar: yansıma alıcı ucunda yutulur, hiç geri '
          + 'dönmez. Bedeli süreklidir — direnç sinyal dursa bile akım çeker.',
        en: 'Parallel termination matches at the load end: the reflection is absorbed at the '
          + 'receiver end and never comes back. Its cost is continuous — the resistor draws '
          + 'current even when the signal stops.',
      }),
      [TERM_THEVENIN]: t({
        tr: 'Thevenin terminasyonu aynı anda iki iş yapar: hattı Z₀ ile eşler ve girişi V_bias '
          + 'seviyesine çeker. İki direnç birbirinden bağımsız seçilemez.',
        en: 'Thevenin termination does two jobs at once: it matches the line to Z₀ and pulls the '
          + 'input to the V_bias level. The two resistors cannot be chosen independently of each '
          + 'other.',
      }),
    },

    detail: {
      seriesEngine: (series) => t({
        tr: `Motor R_s'yi Z₀ − R_driver olarak veriyor; standart adaylar en yakın üç ${series} `
          + 'değeri olarak dönüyor ve kaynak empedansı bunların en yakınıyla yeniden hesaplanıyor.',
        en: `The engine gives R_s as Z₀ − R_driver; the standard candidates are returned as the `
          + `three nearest ${series} values and the source impedance is recomputed with the `
          + 'closest of them.',
      }),
      seriesTotals: (total, withStandard) => t({
        tr: `İdeal toplam kaynak empedansı ${total}; standart değerle ${withStandard}.`,
        en: `The ideal total source impedance is ${total}; with the standard value `
          + `${withStandard}.`,
      }),
      parallelFreedom: t({
        tr: 'R_T = Z₀ olduğu için tasarım serbestliği yalnızca gerilim ve duty cycle\'dadır; '
          + 'direnç değeri hattın kendisi tarafından belirlenir.',
        en: 'Because R_T = Z₀, the design freedom lies only in the voltage and the duty cycle; the '
          + 'resistance value is set by the line itself.',
      }),
      parallelDuty: t({
        tr: 'Duty cycle motorda 0–1 aralığında tutulur; ekranda yüzde olarak girilir ve yalnızca '
          + 'ortalama gücü ölçekler, sürekli gücü değiştirmez.',
        en: 'The duty cycle is kept in the 0–1 range inside the engine; it is entered as a '
          + 'percentage on the screen and only scales the average power — it does not change the '
          + 'continuous power.',
      }),
      theveninSearch: (series) => t({
        tr: `Motor her iki direnç için en yakın üç ${series} değerini alıp dokuz kombinasyonu `
          + 'deniyor ve |zErr| + |vErr| toplamını en küçükleyen çifti seçiyor. Bu seçim iki '
          + 'sapmayı eşit ağırlıklı sayar; tasarımınızda biri daha kritikse çifti elle '
          + 'değiştirmeniz gerekir.',
        en: `The engine takes the three nearest ${series} values for each resistor, tries all nine `
          + 'combinations and picks the pair that minimises |zErr| + |vErr|. This choice weights '
          + 'the two deviations equally; if one of them is more critical in your design you have '
          + 'to change the pair by hand.',
      }),
      theveninIdeal: t({
        tr: 'Sürekli akım ve güç ideal çiftten hesaplanıyor, seçilen standart çiftten değil — '
          + 'motorun döndürdüğü alanlar bu şekilde tanımlı.',
        en: 'The continuous current and power are computed from the ideal pair, not from the '
          + 'selected standard pair — that is how the fields returned by the engine are defined.',
      }),
      devThresholds: t({
        tr: `Sapma eşikleri ${pct(DEV_WARN_PCT)} ve ${pct(DEV_DANGER_PCT)} olarak alınmıştır; bu `
          + 'değerler mühendislik yorumudur, kullanılan denklemlerden türemez.',
        en: `The deviation thresholds are taken as ${pct(DEV_WARN_PCT)} and `
          + `${pct(DEV_DANGER_PCT)}; these values are an engineering judgement, they do not follow `
          + 'from the equations used.',
      }),
      noRounding: t({
        tr: 'Ara değerlerde yuvarlama yapılmaz; yalnızca gösterim yuvarlanır.',
        en: 'Intermediate values are never rounded; only the display is rounded.',
      }),
    },

    validity: [
      // Bu maddede vurgu cümle başında değil, cümlenin içindeki üç yöntem adında
      // duruyor. Tek bir `strong` alanı bunu taşıyamadığı için madde sıralı
      // parçalara bölünür: `strong` taşıyan parça kalın, `text` taşıyan parça
      // düz basılır. Boşluklar düz parçalarda tutulur ki dizilim iki dilde de
      // aynı kalsın.
      {
        parts: [
          {
            text: t({
              tr: 'Üç yöntem farklı işler için kullanılır ve birbirinin yerine geçmez: ',
              en: 'The three methods serve different purposes and are not interchangeable: ',
            }),
          },
          { strong: t({ tr: 'seri', en: 'series' }) },
          {
            text: t({
              tr: ' kaynak ucunda eşleme yapar ve hat sonunda tek yük varsayar; ',
              en: ' matches at the source end and assumes a single load at the end of the line; ',
            }),
          },
          { strong: t({ tr: 'paralel', en: 'parallel' }) },
          {
            text: t({
              tr: ' yük ucunda eşleme yapar ve sürekli güç harcar; ',
              en: ' matches at the load end and burns continuous power; ',
            }),
          },
          { strong: t({ tr: 'Thevenin', en: 'Thevenin' }) },
          {
            text: t({
              tr: ' hem eşler hem bias verir, bedeli V_cc\'den sürekli çekilen akımdır.',
              en: ' both matches and biases, at the cost of a current drawn continuously from V_cc.',
            }),
          },
        ],
      },
      {
        text: t({
          tr: 'Seçilen E serisi değerlerinin üretim toleransı doğrudan sonuca girer. Kuantalama '
            + 'sapmasıyla tolerans aynı yöne düşerse gerçek sapma burada gösterilenden büyük olur; '
            + 'tolerans motorda hesaplanmıyor.',
          en: 'The manufacturing tolerance of the selected E-series values enters the result '
            + 'directly. If the tolerance falls in the same direction as the quantisation error, '
            + 'the real deviation is larger than the one shown here; tolerance is not computed in '
            + 'the engine.',
        }),
      },
      {
        text: t({
          tr: 'Motor yalnızca DC davranışı hesaplar. Kapasitif yük, sürücü kenar hızı, sap '
            + 'uzunluğu, yansıma ve çınlama simülasyonu yapılmaz — bunlar için zaman alanı '
            + 'simülasyonu veya ölçüm gerekir.',
          en: 'The engine computes DC behaviour only. Capacitive loading, driver edge rate, stub '
            + 'length, reflection and ringing are not simulated — those require a time-domain '
            + 'simulation or a measurement.',
        }),
      },
      {
        strong: t({ tr: 'Bilinen sınır:', en: 'Known limitation:' }),
        text: seriesEseriesNote,
      },
      {
        strong: t({ tr: 'Bilinen sınır:', en: 'Known limitation:' }),
        text: t({
          tr: 'Thevenin sürekli akım ve gücü ideal direnç çiftinden geliyor; seçilen standart '
            + 'çiftin gerçek akımı bir miktar farklıdır.',
          en: 'The Thevenin continuous current and power come from the ideal resistor pair; the '
            + 'real current of the selected standard pair differs from it somewhat.',
        }),
      },
      { text: devThresholdNote },
      {
        text: t({
          tr: 'Teknik detayda gösterilen denklemler motorun uyguladığı ifadelerle birebir aynıdır: '
            + 'belirsiz kalan bir büyüklük tahminle tamamlanmadı, kaynağı doğrulanamayan bir '
            + 'katsayı eklenmedi. Sürekli akım ve güç Ohm yasasından gelir, terminasyon '
            + 'denklemlerinin parçası değildir.',
          en: 'The equations shown under technical detail are exactly the expressions the engine '
            + 'applies: no quantity left undetermined was filled in by guesswork and no '
            + 'coefficient whose source cannot be verified was added. The continuous current and '
            + 'power come from Ohm’s law; they are not part of the termination equations.',
        }),
      },
      {
        text: t({
          tr: 'Paralel terminasyonda gerilim tek bir değer olarak alınır: direnç toprağa değil '
            + 'ayrı bir terminasyon rayına çekiliyorsa girilen V bu farkı yansıtmalıdır.',
          en: 'In parallel termination the voltage is taken as a single value: if the resistor is '
            + 'pulled to a separate termination rail rather than to ground, the V entered must '
            + 'reflect that difference.',
        }),
      },
      {
        text: t({
          tr: 'Sonuçlar yaklaşıktır — kritik tasarımlarda üretici verisi ve ölçümle doğrulayın.',
          en: 'Results are approximate — verify against manufacturer data and measurement for '
            + 'critical designs.',
        }),
      },
    ],

    chart: {
      [TERM_SERIES]: {
        x: t({ tr: 'Hat empedansı Z₀ (Ω)', en: 'Line impedance Z₀ (Ω)' }),
        y: t({ tr: 'Seri direnç R_s (Ω)', en: 'Series resistor R_s (Ω)' }),
        names: { rs: 'R_s' },
        caption: t({
          tr: 'Sürücü direnci sabitken R_s, Z₀ ile doğrusal artar. Eğrinin sıfırı kestiği nokta '
            + 'Z₀ = R_driver noktasıdır; solunda R_s negatife düşer ve seri terminasyon tanımsız '
            + 'kalır.',
          en: 'With the driver resistance held constant, R_s grows linearly with Z₀. The point '
            + 'where the curve crosses zero is Z₀ = R_driver; to the left of it R_s goes negative '
            + 'and series termination stays undefined.',
        }),
      },
      [TERM_PARALLEL]: {
        x: t({ tr: 'Hat empedansı Z₀ (Ω)', en: 'Line impedance Z₀ (Ω)' }),
        y: t({ tr: 'Sürekli DC güç P_dc (W)', en: 'Continuous DC power P_dc (W)' }),
        names: { pdc: 'P_dc' },
        caption: t({
          tr: 'Sürekli güç Z₀ ile ters orantılıdır: 50 Ω\'luk bir hattın terminasyon maliyeti '
            + '100 Ω\'luk bir hattın iki katıdır. Bu güç duty cycle\'dan bağımsız olarak en kötü '
            + 'durumda sürekli akar.',
          en: 'The continuous power is inversely proportional to Z₀: terminating a 50 Ω line costs '
            + 'twice as much as terminating a 100 Ω line. Independently of the duty cycle, in the '
            + 'worst case this power flows continuously.',
        }),
      },
      [TERM_THEVENIN]: {
        x: t({ tr: 'Hat empedansı Z₀ (Ω)', en: 'Line impedance Z₀ (Ω)' }),
        y: t({ tr: 'Direnç (Ω)', en: 'Resistance (Ω)' }),
        names: { rtop: 'R_top', rbottom: 'R_bottom' },
        caption: t({
          tr: 'İki direnç de Z₀ ile doğrusal büyür; oranları sabit kalır çünkü oran yalnızca '
            + 'V_bias / V_cc ile belirlenir. Eğriler arasındaki açıklık bias oranını gösterir — '
            + 'eşit oldukları nokta V_bias = V_cc / 2 durumudur.',
          en: 'Both resistors grow linearly with Z₀; their ratio stays constant because it is set '
            + 'solely by V_bias / V_cc. The gap between the curves shows the bias ratio — the '
            + 'point where they are equal is the case V_bias = V_cc / 2.',
        }),
      },
      refLabel: {
        zero: t({
          tr: 'R_s = 0 — seri terminasyon sınırı',
          en: 'R_s = 0 — series termination limit',
        }),
      },
      operatingPoint: t({ tr: 'çalışma noktası', en: 'operating point' }),
    },

    schematic: {
      title: {
        [TERM_SERIES]: t({ tr: 'Seri terminasyon devresi', en: 'Series termination circuit' }),
        [TERM_PARALLEL]: t({
          tr: 'Paralel terminasyon devresi',
          en: 'Parallel termination circuit',
        }),
        [TERM_THEVENIN]: t({
          tr: 'Thevenin terminasyon devresi',
          en: 'Thevenin termination circuit',
        }),
      },
      caption: {
        [TERM_SERIES]: t({
          tr: 'Seri terminasyon — direnç sürücünün hemen çıkışında',
          en: 'Series termination — the resistor sits right at the driver output',
        }),
        [TERM_PARALLEL]: t({
          tr: 'Paralel terminasyon — direnç hattın uç yükünde',
          en: 'Parallel termination — the resistor is the end load of the line',
        }),
        [TERM_THEVENIN]: t({
          tr: 'Thevenin terminasyonu — bölücü hem eşler hem bias verir',
          en: 'Thevenin termination — the divider both matches and biases',
        }),
      },
      // Çizimdeki tek sözcük etiketi; tek aralıklı yazıda iki dilde de altı
      // karakter, kutu genişliği değişmiyor.
      driver: t({ tr: 'sürücü', en: 'driver' }),
      biasValue: (v) => t({ tr: `bias ${v}`, en: `bias ${v}` }),
    },

    reasonText: (reason) => {
      switch (reason) {
        case REASON_NEGATIVE_SERIES:
          return t({
            tr: 'Sürücü çıkış direnci hat empedansından büyük; seri terminasyon önerilmez ve R_s '
              + 'hesaplanmaz. Daha düşük çıkış empedanslı bir sürücü seçin ya da yük ucunda eşleme '
              + 'yapan bir yöntem (paralel veya Thevenin) kullanın.',
            en: 'The driver output resistance is greater than the line impedance; series '
              + 'termination is not recommended and R_s is not computed. Choose a driver with a '
              + 'lower output impedance, or use a method that matches at the load end (parallel or '
              + 'Thevenin).',
          })
        case REASON_BIAS:
          return t({
            tr: 'Hedef bias gerilimi besleme geriliminden küçük olmalı. Bölücü yükseltme yapmaz; '
              + 'V_bias < V_cc olacak şekilde girin.',
            en: 'The target bias voltage must be smaller than the supply voltage. A divider does '
              + 'not step up; enter the values so that V_bias < V_cc.',
          })
        default:
          return t({
            tr: 'Tüm zorunlu alanlara pozitif sayısal değer girin. Ondalık için nokta veya virgül '
              + 'kullanabilirsiniz (0.25 = 0,25).',
            en: 'Enter a positive numeric value in every required field. Use a point or a comma '
              + 'for decimals (0.25 = 0,25).',
          })
      }
    },

    commentary: (r) => {
      if (!r.ok) {
        // Seri terminasyonun geçersiz kaldığı durum sessizce boş bırakılmaz:
        // hesap gösterilmez ama nedeni danger seviyesinde raporlanır.
        if (r.reason === REASON_NEGATIVE_SERIES) {
          return [
            {
              level: 'danger',
              text: t({
                tr: `Sürücü çıkış direnci ${fmtRes(r.Rdriver, 4)}, hat empedansı ise `
                  + `${fmtRes(r.Z0, 4)}. Sürücü tek başına hattan daha yüksek empedanslı olduğu `
                  + `için eklenecek seri direnç negatif çıkıyor (${fmtRes(r.Rs, 4)}) — seri `
                  + 'terminasyon önerilmez, hesap gösterilmiyor.',
                en: `The driver output resistance is ${fmtRes(r.Rdriver, 4)} while the line `
                  + `impedance is ${fmtRes(r.Z0, 4)}. Because the driver on its own has a higher `
                  + 'impedance than the line, the series resistor to be added comes out negative '
                  + `(${fmtRes(r.Rs, 4)}) — series termination is not recommended and the `
                  + 'calculation is not shown.',
              }),
            },
            {
              level: 'warn',
              text: t({
                tr: 'Bu durumda kaynak eşlemesi mümkün değildir: ya daha düşük çıkış empedanslı '
                  + 'bir sürücü seçilmeli ya da eşleme yük ucuna alınmalıdır (paralel veya '
                  + 'Thevenin terminasyon).',
                en: 'In this case source matching is not possible: either a driver with a lower '
                  + 'output impedance must be chosen, or the match must be moved to the load end '
                  + '(parallel or Thevenin termination).',
              }),
            },
          ]
        }
        return []
      }

      if (r.type === TERM_SERIES) return seriesNotes(r)
      if (r.type === TERM_PARALLEL) return parallelNotes(r)
      return theveninNotes(r)
    },
  }
}
