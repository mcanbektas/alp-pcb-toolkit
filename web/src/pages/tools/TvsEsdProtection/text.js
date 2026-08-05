// TVS ve ESD Koruma Boyutlandırıcısı — ekran metni (REV2 §14). İki dilli,
// tek dış yüzü getText(lang). Mantık tek kopya kalır, yalnızca dizeler dile
// göre seçilir.

import { pick } from '../../../lib/i18n'
import { fmtVolt } from '../../../lib/num'
import {
  REASON_INVALID, REASON_NO_CONVERGENCE,
  RDYN_MODE_DIRECT, RDYN_MODE_DATASHEET,
  TVS_WAVEFORM_RECTANGULAR, TVS_WAVEFORM_TRIANGULAR, TVS_WAVEFORM_CUSTOM,
  SWEEP_RSOURCE, SWEEP_CLAMP_CURVE, SWEEP_OVERSHOOT, SWEEP_CAPACITANCE,
} from './model'

export function getText(lang) {
  const t = (dict) => pick(dict, lang)

  return {
    backlink: t({ tr: '← Komponent ve Devre Hesapları', en: '← Component and Circuit Calculators' }),
    title: t({ tr: 'TVS ve ESD Koruma Boyutlandırıcısı', en: 'TVS and ESD Protection Sizing Tool' }),
    intro: t({
      tr: 'Surge/ESD olayında TVS clamp akımını ve gücünü, dynamic resistance modeliyle '
        + 'hesaplar; PCB bağlantı endüktansının ürettiği ek overshoot ve hat capacitance '
        + 'etkisini tahmin eder.',
      en: 'Computes the TVS clamp current and power for a surge/ESD event using the dynamic '
        + 'resistance model; estimates the additional overshoot from PCB connection '
        + 'inductance and the effect of line capacitance.',
    }),

    // Hata mesajında alan adı olarak görünen kısa etiketler; model.js'e verilir.
    fieldLabels: {
      vSurge: t({ tr: 'Surge gerilimi', en: 'Surge voltage' }),
      rSource: t({ tr: 'Kaynak direnci', en: 'Source resistance' }),
      rSeries: t({ tr: 'İlave seri direnç', en: 'Additional series resistance' }),
      vBR: t({ tr: 'TVS breakdown gerilimi', en: 'TVS breakdown voltage' }),
      iT: t({ tr: 'Test akımı', en: 'Test current' }),
      vNormalMax: t({ tr: 'Maks. normal çalışma gerilimi', en: 'Max. normal operating voltage' }),
      vRWM: t({ tr: 'TVS çalışma gerilimi (V_RWM)', en: 'TVS working voltage (V_RWM)' }),
      vProtectedMax: t({ tr: 'Korunan IC mutlak maksimumu', en: 'Protected IC absolute maximum' }),
      rDyn: t({ tr: 'Dinamik direnç', en: 'Dynamic resistance' }),
      vCDatasheet: t({ tr: 'Veri sayfası clamp gerilimi', en: 'Datasheet clamping voltage' }),
      iPPDatasheet: t({ tr: 'Veri sayfası clamp akımı', en: 'Datasheet clamping current' }),
      tp: t({ tr: 'Pulse süresi', en: 'Pulse duration' }),
      kw: t({ tr: 'Waveform katsayısı', en: 'Waveform coefficient' }),
      lPath: t({ tr: 'PCB bağlantı endüktansı', en: 'PCB connection inductance' }),
      didt: t({ tr: 'Akım değişim hızı (di/dt)', en: 'Current slew rate (di/dt)' }),
      cTvs: t({ tr: 'TVS jonksiyon kapasitansı', en: 'TVS junction capacitance' }),
    },

    // Girdi alanlarının tam etiket/ipucu metni.
    fields: {
      vSurge: {
        label: t({ tr: 'Surge açık devre gerilimi (V_surge)', en: 'Surge open-circuit voltage (V_surge)' }),
        hint: t({
          tr: 'Thevenin surge modelinin açık devre (yüksüz) gerilimi.',
          en: 'The open-circuit (unloaded) voltage of the Thevenin surge model.',
        }),
      },
      rSource: { label: t({ tr: 'Surge kaynak direnci (R_source)', en: 'Surge source resistance (R_source)' }) },
      rSeries: {
        label: t({ tr: 'İlave seri direnç (R_series)', en: 'Additional series resistance (R_series)' }),
        hint: t({
          tr: 'TVS ile kaynak arasındaki ek direnç (örn. koruma direnci). Yoksa 0 bırakın.',
          en: 'Extra resistance between the source and the TVS (e.g. a protection resistor). Leave 0 if none.',
        }),
      },
      vBR: { label: t({ tr: 'TVS breakdown gerilimi (V_BR)', en: 'TVS breakdown voltage (V_BR)' }) },
      iT: {
        label: t({ tr: 'Test akımı (I_T)', en: 'Test current (I_T)' }),
        hint: t({
          tr: 'V_BR ve R_dyn\'in datasheette ölçüldüğü akım; bilinmiyorsa 0 bırakın.',
          en: 'The current at which V_BR and R_dyn were characterised on the datasheet; leave 0 if unknown.',
        }),
      },
      vNormalMax: {
        label: t({ tr: 'Maksimum normal çalışma gerilimi', en: 'Maximum normal operating voltage' }),
        hint: t({
          tr: 'Opsiyonel — verilirse REV2 §14.3 gerilim sıralaması yorumda değerlendirilir.',
          en: 'Optional — if given, the REV2 §14.3 voltage ordering is evaluated in the commentary.',
        }),
      },
      vRWM: { label: t({ tr: 'TVS çalışma gerilimi (V_RWM)', en: 'TVS working voltage (V_RWM)' }) },
      vProtectedMax: {
        label: t({ tr: 'Korunan IC mutlak maksimum gerilimi', en: 'Protected IC absolute maximum voltage' }),
        hint: t({
          tr: 'Opsiyonel — verilirse clamp gerilimi bu sınırla karşılaştırılır.',
          en: 'Optional — if given, the clamp voltage is compared against this limit.',
        }),
      },
      rDyn: {
        label: t({ tr: 'Dinamik direnç (R_dyn)', en: 'Dynamic resistance (R_dyn)' }),
        hint: t({
          tr: 'Bilinmiyorsa 0 bırakın — clamp gerilimi sabit V_BR kabul edilir.',
          en: 'Leave 0 if unknown — the clamp voltage is then assumed constant at V_BR.',
        }),
      },
      vCDatasheet: { label: t({ tr: 'Veri sayfası clamp gerilimi (V_C)', en: 'Datasheet clamping voltage (V_C)' }) },
      iPPDatasheet: {
        label: t({ tr: 'Veri sayfası clamp akımı (I_PP)', en: 'Datasheet clamping current (I_PP)' }),
      },
      hasEnergyCheck: t({ tr: 'Pulse enerjisini hesapla', en: 'Compute pulse energy' }),
      tp: { label: t({ tr: 'Pulse süresi (t_p)', en: 'Pulse duration (t_p)' }) },
      kw: {
        label: t({ tr: 'Waveform katsayısı (K_w)', en: 'Waveform coefficient (K_w)' }),
        hint: t({ tr: 'Yalnızca kullanıcı tanımlı dalga şeklinde kullanılır.', en: 'Used only for the custom waveform.' }),
      },
      hasOvershootCheck: t({ tr: 'PCB bağlantı endüktansı etkisini hesapla', en: 'Compute PCB connection inductance effect' }),
      lPath: { label: t({ tr: 'PCB bağlantı endüktansı (L_path)', en: 'PCB connection inductance (L_path)' }) },
      didt: { label: t({ tr: 'Akım değişim hızı (di/dt)', en: 'Current slew rate (di/dt)' }) },
      hasCapacitanceCheck: t({ tr: 'Hat capacitance etkisini hesapla', en: 'Compute line capacitance effect' }),
      cTvs: { label: t({ tr: 'TVS jonksiyon kapasitansı (C_TVS)', en: 'TVS junction capacitance (C_TVS)' }) },
    },

    rDynModeGroup: t({ tr: 'R_dyn kaynağı', en: 'R_dyn source' }),
    rDynModeLabel: {
      [RDYN_MODE_DIRECT]: t({ tr: 'Doğrudan gir', en: 'Enter directly' }),
      [RDYN_MODE_DATASHEET]: t({ tr: 'Datasheet iki nokta', en: 'Datasheet two-point' }),
    },

    waveformGroup: t({ tr: 'Pulse dalga şekli', en: 'Pulse waveform' }),
    waveformLabel: {
      [TVS_WAVEFORM_RECTANGULAR]: t({ tr: 'Dikdörtgen', en: 'Rectangular' }),
      [TVS_WAVEFORM_TRIANGULAR]: t({ tr: 'Üçgen', en: 'Triangular' }),
      [TVS_WAVEFORM_CUSTOM]: t({ tr: 'Kullanıcı tanımlı', en: 'Custom' }),
    },

    resultCurrentLabel: t({ tr: 'Tahmini pulse current (I_PP)', en: 'Estimated pulse current (I_PP)' }),
    operatingPoint: t({ tr: 'Çalışma noktası', en: 'Operating point' }),

    methodLabel: {
      analytic: t({ tr: 'Analitik', en: 'Analytic' }),
      bisection: t({ tr: 'Sayısal (bisection)', en: 'Numeric (bisection)' }),
    },

    table: {
      method: t({ tr: 'Kullanılan çözüm yolu', en: 'Solution method used' }),
      iterations: t({ tr: 'İterasyon / genişletme sayısı', en: 'Iterations / expansions' }),
      rDynMode: t({ tr: 'R_dyn kaynağı', en: 'R_dyn source' }),
      waveform: t({ tr: 'Pulse dalga şekli', en: 'Pulse waveform' }),
      rDyn: t({ tr: 'Dinamik direnç (R_dyn)', en: 'Dynamic resistance (R_dyn)' }),
      vClamp: t({ tr: 'Clamp gerilimi (V_C)', en: 'Clamping voltage (V_C)' }),
      peakPower: t({ tr: 'Tepe darbe gücü', en: 'Peak pulse power' }),
      energy: t({ tr: 'Darbe enerjisi', en: 'Pulse energy' }),
      overshootVL: t({ tr: 'PCB overshoot (V_L)', en: 'PCB overshoot (V_L)' }),
      icPeak: t({ tr: 'IC üzerinde tahmini peak', en: 'Estimated peak at the IC' }),
      capCutoff: t({ tr: 'TVS capacitance kutbu', en: 'TVS capacitance pole' }),
    },

    // REASON_INCOMPLETE varsayılan koldadır — VoltageDivider/ReturnPathStitchingVia'daki
    // aynı çerçeve cümleyle.
    reasonText: (reason) => {
      switch (reason) {
        case REASON_INVALID:
          return t({
            tr: 'Girdi kombinasyonu motor tarafından geçersiz sayıldı (ör. kaynak+seri '
              + 'direnç toplamı sıfır, ya da datasheet iki noktasından R_dyn hesaplanamadı). '
              + 'Değerleri ve birimleri kontrol edin.',
            en: 'The input combination was rejected by the engine (e.g. the source+series '
              + 'resistance sum is zero, or R_dyn could not be derived from the datasheet '
              + 'two-point values). Check the values and units.',
          })
        case REASON_NO_CONVERGENCE:
          return t({
            tr: 'Sayısal çözücü yakınsamadı (TVS_SOLVER_NO_CONVERGENCE): 100 iterasyonda '
              + 'kök bulunamadı, sonlu bir aralık kurulamadı ya da geçerli bir kök aralığı '
              + 'yok. R_dyn, V_BR ve datasheet değerlerini kontrol edin.',
            en: 'The numeric solver did not converge (TVS_SOLVER_NO_CONVERGENCE): no root '
              + 'was found in 100 iterations, a finite bracket could not be established, or '
              + 'no valid root interval exists. Check R_dyn, V_BR and the datasheet values.',
          })
        default:
          return t({
            tr: 'Tüm zorunlu alanlara pozitif sayısal değer girin ve kullanılan birimleri kontrol edin.',
            en: 'Enter a positive numeric value for all required fields and check the units used.',
          })
      }
    },

    // Motorun (lib/tvsEsd.js) bulgu/seviye kavramı yok — bu bulgular
    // ReturnPathStitchingVia/ThermalVia deseninde olduğu gibi burada, ham
    // `compute()` çıktısından `commentary(r)` ile kurulur.
    commentary: (r) => {
      if (!r.ok) return []
      const out = []

      // Şeffaflık: hangi çözüm yolunun kullanıldığı her zaman görünür
      // (bu araca özgü kritik nokta #3 — gizlenmez).
      out.push(r.solver.method === 'analytic'
        ? {
          level: 'ok',
          text: t({
            tr: 'Pulse akımı analitik (kapalı form) çözümle bulundu.',
            en: 'The pulse current was found using the closed-form analytic solution.',
          }),
        }
        : {
          level: 'ok',
          text: t({
            tr: `Model bu girdilerle analitik çözüme uygun değildi (R_source+R_series+R_dyn ≤ 0); `
              + `sınırlandırılmış bisection çözücü kullanıldı (${r.solver.iterations} iterasyon, `
              + `${r.solver.expansions} genişletme).`,
            en: `The model was not suited to the analytic solution with these inputs `
              + `(R_source+R_series+R_dyn ≤ 0); the bounded bisection solver was used `
              + `(${r.solver.iterations} iterations, ${r.solver.expansions} expansions).`,
          }),
        })

      if (r.solver.clamped) {
        out.push({
          level: 'warn',
          text: t({
            tr: 'Surge gerilimi TVS breakdown seviyesine ulaşmıyor; hesaplanan pulse akımı '
              + 'fiziksel olarak sıfıra sınırlandırıldı.',
            en: 'The surge voltage does not reach the TVS breakdown level; the computed '
              + 'pulse current is physically clamped to zero.',
          }),
        })
      }

      // REV2 §14.3: V_normal,max < V_RWM < V_BR < V_C sıralaması. Eşitlik ne
      // "üzerinde" ne "altında"dır ve hata da değildir: R_dyn girilmediğinde
      // (alanın kendi ipucu "Bilinmiyorsa 0 bırakın") V_C = V_BR + 0·(I − I_T)
      // = V_BR çıkar; bu belgelenmiş normal yoldur, üstelik varsayılan girdinin
      // ta kendisidir. Yalnız KESİN olarak altında kalan durum danger'dır —
      // aşağıdaki kardeş V_RWM kontrolüyle aynı desen.
      if (r.vClamp > r.vBR) {
        out.push({
          level: 'ok',
          text: t({
            tr: `Clamp gerilimi (${fmtVolt(r.vClamp)}) breakdown geriliminin (${fmtVolt(r.vBR)}) `
              + 'üzerinde — beklenen sıralama.',
            en: `The clamp voltage (${fmtVolt(r.vClamp)}) is above the breakdown voltage `
              + `(${fmtVolt(r.vBR)}) — the expected ordering.`,
          }),
        })
      } else if (r.vClamp === r.vBR) {
        out.push({
          level: 'ok',
          text: t({
            tr: `Clamp gerilimi (${fmtVolt(r.vClamp)}) breakdown gerilimine (${fmtVolt(r.vBR)}) `
              + 'eşit — R_dyn girilmediğinde (0) clamp gerilimi sabit V_BR kabul edilir, '
              + 'sıralama beklenen yönde.',
            en: `The clamp voltage (${fmtVolt(r.vClamp)}) equals the breakdown voltage `
              + `(${fmtVolt(r.vBR)}) — with R_dyn left at 0 the clamp voltage is taken as a `
              + 'constant V_BR, so the ordering is as expected.',
          }),
        })
      } else {
        out.push({
          level: 'danger',
          text: t({
            tr: `Clamp gerilimi (${fmtVolt(r.vClamp)}) breakdown geriliminin (${fmtVolt(r.vBR)}) `
              + 'ALTINDA — R_dyn/I_T girdilerini kontrol edin.',
            en: `The clamp voltage (${fmtVolt(r.vClamp)}) is BELOW the breakdown voltage `
              + `(${fmtVolt(r.vBR)}) — check the R_dyn/I_T inputs.`,
          }),
        })
      }

      if (r.vRWM != null) {
        out.push(r.vRWM < r.vBR
          ? {
            level: 'ok',
            text: t({
              tr: `V_RWM (${fmtVolt(r.vRWM)}) breakdown geriliminin altında — beklenen sıralama.`,
              en: `V_RWM (${fmtVolt(r.vRWM)}) is below the breakdown voltage — the expected ordering.`,
            }),
          }
          : {
            level: 'danger',
            text: t({
              tr: `V_RWM (${fmtVolt(r.vRWM)}) breakdown gerilimine eşit ya da üzerinde — TVS `
                + 'sürekli iletimde olabilir.',
              en: `V_RWM (${fmtVolt(r.vRWM)}) is at or above the breakdown voltage — the TVS `
                + 'may conduct continuously.',
            }),
          })

        if (r.vNormalMax != null) {
          out.push(r.vNormalMax < r.vRWM
            ? {
              level: 'ok',
              text: t({
                tr: `Maksimum normal çalışma gerilimi (${fmtVolt(r.vNormalMax)}) V_RWM'nin altında `
                  + '— beklenen sıralama.',
                en: `The maximum normal operating voltage (${fmtVolt(r.vNormalMax)}) is below `
                  + 'V_RWM — the expected ordering.',
              }),
            }
            : {
              level: 'danger',
              text: t({
                tr: `Maksimum normal çalışma gerilimi (${fmtVolt(r.vNormalMax)}) V_RWM'ye eşit ya `
                  + 'da üzerinde — TVS normal çalışmada iletime geçebilir.',
                en: `The maximum normal operating voltage (${fmtVolt(r.vNormalMax)}) is at or `
                  + 'above V_RWM — the TVS may conduct during normal operation.',
              }),
            })
        }
      }

      if (r.vProtectedMax != null) {
        // Eşitlik "aşmak" DEĞİLDİR: V_C = V_IC,maks tam sınırdır ve IC hâlâ
        // sınırının içindedir. Aşağıdaki kardeş kontrol (overshoot) de aynı
        // limiti `icPeak > vProtectedMax` ile ölçüyor, yani eşitliği geçer
        // sayıyor — ikili karşılaştırma burada da onunla aynı yönde olmalı,
        // yoksa aynı sayfa aynı sınır için iki zıt yargı verir. Marjın sıfır
        // olduğu ayrı bir cümleyle söylenir; danger'a düşürülmez (9f2bfd8'in
        // V_BR kontrolüne uyguladığı düzeltmenin aynısı).
        if (r.vClamp < r.vProtectedMax) {
          out.push({
            level: 'ok',
            text: t({
              tr: `Clamp gerilimi (${fmtVolt(r.vClamp)}) korunan IC sınırının `
                + `(${fmtVolt(r.vProtectedMax)}) altında.`,
              en: `The clamp voltage (${fmtVolt(r.vClamp)}) is below the protected IC limit `
                + `(${fmtVolt(r.vProtectedMax)}).`,
            }),
          })
        } else if (r.vClamp === r.vProtectedMax) {
          out.push({
            level: 'ok',
            text: t({
              tr: `Clamp gerilimi (${fmtVolt(r.vClamp)}) korunan IC sınırına `
                + `(${fmtVolt(r.vProtectedMax)}) tam eşit — sınır aşılmıyor ama marj yok; `
                + 'üretim saçılması ya da sıcaklık kayması bu tasarımı sınırın dışına taşır.',
              en: `The clamp voltage (${fmtVolt(r.vClamp)}) is exactly at the protected IC limit `
                + `(${fmtVolt(r.vProtectedMax)}) — the limit is not exceeded, but there is no `
                + 'margin; process spread or temperature drift will push it over.',
            }),
          })
        } else {
          out.push({
            level: 'danger',
            text: t({
              tr: `Clamp gerilimi (${fmtVolt(r.vClamp)}) korunan IC sınırını `
                + `(${fmtVolt(r.vProtectedMax)}) AŞIYOR — IC bu TVS ile korunmuyor.`,
              en: `The clamp voltage (${fmtVolt(r.vClamp)}) EXCEEDS the protected IC limit `
                + `(${fmtVolt(r.vProtectedMax)}) — the IC is not protected by this TVS.`,
            }),
          })
        }
      }

      if (r.overshoot) {
        const overLimit = r.vProtectedMax != null && r.overshoot.icPeak > r.vProtectedMax
        out.push({
          level: overLimit ? 'danger' : 'ok',
          text: t({
            tr: `PCB bağlantı endüktansı IC üzerinde ek ${fmtVolt(r.overshoot.vL)} overshoot `
              + `üretiyor; tahmini IC peak ${fmtVolt(r.overshoot.icPeak)}.`,
            en: `The PCB connection inductance adds ${fmtVolt(r.overshoot.vL)} of overshoot; `
              + `the estimated peak at the IC is ${fmtVolt(r.overshoot.icPeak)}.`,
          }),
        })
      }

      return out
    },

    schematic: {
      title: t({ tr: 'TVS ve ESD koruma yerleşimi', en: 'TVS and ESD protection placement' }),
      caption: t({
        tr: 'TVS konnektöre yakın yerleştirilir; dönüş yolu (L_path) kısa ve geniş '
          + 'tutulmalıdır — aksi halde ek endüktif overshoot korunan IC\'ye ulaşır (REV2 §14.7).',
        en: 'The TVS is placed close to the connector; the return path (L_path) must be kept '
          + 'short and wide — otherwise additional inductive overshoot reaches the protected '
          + 'IC (REV2 §14.7).',
      }),
      connector: t({ tr: 'Konnektör', en: 'Connector' }),
      protectedIc: t({ tr: 'Korunan IC', en: 'Protected IC' }),
      tvs: 'TVS',
      lpath: 'L_path',
    },

    validity: [
      t({
        tr: 'Bu araç TVS clamp davranışını doğrusal dynamic resistance modeliyle (V_BR, '
          + 'R_dyn, I_T) yaklaşıklar; datasheet clamp eğrisi bu doğrudan belirgin şekilde '
          + 'saparsa sonuçlar iyimser ya da kötümser çıkabilir.',
        en: 'This tool approximates the TVS clamp behaviour with a linear dynamic resistance '
          + 'model (V_BR, R_dyn, I_T); if the datasheet clamp curve deviates significantly '
          + 'from this line, the results may be optimistic or pessimistic.',
      }),
      t({
        tr: 'Darbe enerjisi yalnızca dikdörtgen, üçgen ya da kullanıcı tanımlı katsayılı '
          + 'basitleştirilmiş dalga şekli varsayımıyla hesaplanır; gerçek darbe şekli '
          + 'farklıysa enerji tahmini yaklaşıktır.',
        en: 'Pulse energy is computed only under a simplified rectangular, triangular, or '
          + 'user-defined-coefficient waveform assumption; if the real pulse shape differs, '
          + 'the energy estimate is approximate.',
      }),
      t({
        tr: 'TVS capacitance kutbu hesaplanıyorsa, hattın sinyal bandwidth\'inin belirgin '
          + 'şekilde üzerinde kalmalıdır; aksi halde TVS sinyali zayıflatabilir (diferansiyel '
          + 'hatlarda gerçek S-parametre analizi gerekebilir).',
        en: 'If the TVS capacitance pole is computed, it should remain comfortably above the '
          + 'line\'s signal bandwidth; otherwise the TVS may attenuate the signal (differential '
          + 'lines may require a real S-parameter analysis).',
      }),
      t({
        tr: 'Uni-directional/bidirectional seçimi bu araç tarafından otomatik karara '
          + 'bağlanmaz: tek polariteli DC hatlarda unidirectional, bipolar analog/AC ya da '
          + 'diferansiyel bus hatlarında bidirectional gerekebilir; seçim uygulamaya bağlıdır.',
        en: 'The uni-directional/bidirectional choice is not automatically decided by this '
          + 'tool: a single-polarity DC line may favour unidirectional, a bipolar analog/AC '
          + 'or differential bus line may need bidirectional; the choice depends on the application.',
      }),
      t({
        tr: 'Bu ekran Monte Carlo/istatistiksel tolerans analizi içermez (REV2 §16.1); '
          + 'sonuçlar tekil (deterministik) girdi setine göre hesaplanır.',
        en: 'This screen does not include Monte Carlo / statistical tolerance analysis '
          + '(REV2 §16.1); results are computed for a single (deterministic) input set.',
      }),
      t({
        tr: 'Sonuçlar yaklaşık mühendislik tahminidir; leakage current ve test standardı '
          + 'seçimi TVS datasheet\'ine ve uygulama gereksinimlerine göre ayrıca '
          + 'değerlendirilmelidir.',
        en: 'Results are approximate engineering estimates; leakage current and test '
          + 'standard selection should be evaluated separately against the TVS datasheet '
          + 'and the application requirements.',
      }),
    ],

    formula: t({
      tr: 'I_PP ≈ (V_surge − V_clamp) / (R_source + R_series)\n'
        + 'R_dyn ≈ (V_C − V_BR) / (I_PP,ds − I_T)        [datasheet iki nokta]\n'
        + 'V_clamp(I) = V_BR + R_dyn·(I − I_T)\n'
        + 'F(I) = I − (V_surge − V_clamp(I)) / (R_source + R_series)\n'
        + 'Analitik: I = (V_surge − V_BR + R_dyn·I_T) / (R_source + R_series + R_dyn), I<0 ise I=0\n'
        + 'Sayısal: sınırlandırılmış bisection, I_min=0, en fazla 16 genişletme + 100 iterasyon\n'
        + 'P_peak = V_clamp · I_PP\n'
        + 'E ≈ V_C·I_PP·t_p (dikdörtgen) | ½·V_C·I_PP·t_p (üçgen) | K_w·V_C·I_PP·t_p (özel)\n'
        + 'V_L = L_path · di/dt,  V_IC,peak ≈ V_clamp + V_L\n'
        + 'f_-3dB ≈ 1 / (2π · R_source · C_TVS)',
      en: 'I_PP ≈ (V_surge − V_clamp) / (R_source + R_series)\n'
        + 'R_dyn ≈ (V_C − V_BR) / (I_PP,ds − I_T)        [datasheet two-point]\n'
        + 'V_clamp(I) = V_BR + R_dyn·(I − I_T)\n'
        + 'F(I) = I − (V_surge − V_clamp(I)) / (R_source + R_series)\n'
        + 'Analytic: I = (V_surge − V_BR + R_dyn·I_T) / (R_source + R_series + R_dyn), I=0 if I<0\n'
        + 'Numeric: bounded bisection, I_min=0, at most 16 expansions + 100 iterations\n'
        + 'P_peak = V_clamp · I_PP\n'
        + 'E ≈ V_C·I_PP·t_p (rectangular) | ½·V_C·I_PP·t_p (triangular) | K_w·V_C·I_PP·t_p (custom)\n'
        + 'V_L = L_path · di/dt,  V_IC,peak ≈ V_clamp + V_L\n'
        + 'f_-3dB ≈ 1 / (2π · R_source · C_TVS)',
    }),

    detail: {
      noRounding: t({
        tr: 'Ara değerlerde yuvarlama yapılmaz; yalnızca gösterim yuvarlanır.',
        en: 'Intermediate values are never rounded; only the display is rounded.',
      }),
    },

    sweepGroup: t({ tr: 'Taranan parametre', en: 'Swept parameter' }),
    sweepLabel: {
      [SWEEP_RSOURCE]: t({ tr: 'Darbe akımı — R_source', en: 'Pulse current — R_source' }),
      [SWEEP_CLAMP_CURVE]: t({ tr: 'Clamp gerilimi — akım', en: 'Clamp voltage — current' }),
      [SWEEP_OVERSHOOT]: t({ tr: 'Overshoot — L_path', en: 'Overshoot — L_path' }),
      [SWEEP_CAPACITANCE]: t({ tr: 'Kutup frekansı — C_TVS', en: 'Pole frequency — C_TVS' }),
    },
    sweepAxis: {
      [SWEEP_RSOURCE]: t({ tr: 'Surge kaynak direnci (Ω)', en: 'Surge source resistance (Ω)' }),
      [SWEEP_CLAMP_CURVE]: t({ tr: 'Pulse akımı (A)', en: 'Pulse current (A)' }),
      [SWEEP_OVERSHOOT]: t({ tr: 'PCB bağlantı endüktansı (H)', en: 'PCB connection inductance (H)' }),
      [SWEEP_CAPACITANCE]: t({ tr: 'TVS jonksiyon kapasitansı (F)', en: 'TVS junction capacitance (F)' }),
    },
    sweepYLabel: {
      [SWEEP_RSOURCE]: t({ tr: 'Pulse akımı (A)', en: 'Pulse current (A)' }),
      [SWEEP_CLAMP_CURVE]: t({ tr: 'Clamp gerilimi (V)', en: 'Clamp voltage (V)' }),
      [SWEEP_OVERSHOOT]: t({ tr: 'Overshoot V_L (V)', en: 'Overshoot V_L (V)' }),
      [SWEEP_CAPACITANCE]: t({ tr: 'Kutup frekansı (Hz)', en: 'Pole frequency (Hz)' }),
    },
    sweepCaption: {
      [SWEEP_RSOURCE]: t({
        tr: 'Diğer girdiler sabitken surge kaynak direnci değiştikçe pulse akımı.',
        en: 'Pulse current as the surge source resistance varies, other inputs held fixed.',
      }),
      [SWEEP_CLAMP_CURVE]: t({
        tr: 'Doğrusal dynamic resistance modeliyle clamp gerilimi — akım eğrisi.',
        en: 'Clamp voltage vs. current under the linear dynamic resistance model.',
      }),
      [SWEEP_OVERSHOOT]: t({
        tr: 'Sabit di/dt için PCB bağlantı endüktansı arttıkça overshoot.',
        en: 'Overshoot as the PCB connection inductance increases, for a fixed di/dt.',
      }),
      [SWEEP_CAPACITANCE]: t({
        tr: 'Sabit R_source için TVS capacitance arttıkça kutup frekansı düşer.',
        en: 'Pole frequency falls as the TVS capacitance increases, for a fixed R_source.',
      }),
    },
  }
}
