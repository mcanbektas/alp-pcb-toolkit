// Via stub ve backdrill hesaplayıcısı ekranının kullanıcıya görünen metinleri
// — iki dilli (tr/en).
//
// Motorun (lib/viaStub.js) bulgu/seviye kavramı yok — Adım 2'nin altı kardeş
// motorundan hiçbirinde `divider.js`-tipi bir `findings()` yok (bkz.
// ReturnPathStitchingVia/text.js başındaki not). Bulgular burada, ham
// `compute()` çıktısından `commentary(r)` ile kurulur.

import { fmt, fmtEng, fmtRes } from '../../../lib/num'
import { pick } from '../../../lib/i18n'
import { commonText } from '../../../data/uiText'
import {
  REASON_INCOMPLETE,
  VS_ERR_RESIDUAL_NEGATIVE, VS_ERR_EXCEEDS_BOARD, VS_ERR_TARGET_UNREACHABLE,
  KT_CLASS_LOW, KT_CLASS_CONSIDER, KT_CLASS_VERIFY,
  SWEEP_STUB, SWEEP_REMOVED,
} from './model'

const fmtHz = (x, sig = 4) => fmtEng(x, 'Hz', sig)
const fmtM = (x, sig = 4) => fmtEng(x, 'm', sig)
const fmtS = (x, sig = 3) => fmtEng(x, 's', sig)

export function getText(lang) {
  const t = (dict) => pick(dict, lang)
  const { pct } = commonText(lang)

  const ktClassLabel = (cls) => {
    if (cls === KT_CLASS_LOW) return t({ tr: 'düşük etki', en: 'low impact' })
    if (cls === KT_CLASS_CONSIDER) return t({ tr: 'dikkate alınmalı', en: 'should be considered' })
    if (cls === KT_CLASS_VERIFY) return t({ tr: 'EM doğrulama önerilir', en: 'EM verification recommended' })
    return '—'
  }

  return {
    pct,
    backlink: t({ tr: '← Via ve Padstack', en: '← Via and Padstack' }),
    title: t({
      tr: 'Via Stub ve Backdrill Hesaplayıcı',
      en: 'Via Stub and Backdrill Calculator',
    }),
    intro: t({
      tr: 'Through-hole via’nın kullanılmayan bölümünü açık uçlu bir stub olarak değerlendirir: '
        + 'çeyrek dalga rezonansı, harmonikler ve opsiyonel backdrill sonrası kalan residual '
        + 'stub’ın üretim toleransıyla birlikte worst-case rezonansı.',
      en: 'Evaluates the unused portion of a through-hole via as an open-ended stub: the '
        + 'quarter-wave resonance, its harmonics, and — if a backdrill is applied — the '
        + 'worst-case resonance of the remaining residual stub together with fabrication '
        + 'tolerance.',
    }),

    fields: {
      viaTotal: { label: t({ tr: 'Via toplam (delinmiş) uzunluk', en: 'Via total (drilled) length' }) },
      used: {
        label: t({ tr: 'Kullanılan uzunluk (sinyal katmanına kadar)', en: 'Used length (to the signal layer)' }),
        hint: t({
          tr: 'Via’nın fonksiyonel kısmı; stub = toplam − kullanılan',
          en: 'The functional part of the via; stub = total − used',
        }),
      },
      epsR: { label: t({ tr: 'Dielektrik sabiti (εr)', en: 'Dielectric constant (εr)' }) },
      safety: {
        label: t({ tr: 'Güvenlik payı', en: 'Safety margin' }),
        hint: t({
          tr: 'Hem gerçekleşen worst-case residual’a hem backdrill hedefine eklenir/çıkarılır',
          en: 'Applied to both the realized worst-case residual and the backdrill target',
        }),
      },
      tr: {
        label: t({ tr: 'Sinyal yükselme süresi (opsiyonel)', en: 'Signal rise time (optional)' }),
        hint: t({
          tr: 'Girilirse K_t = gidiş-dönüş gecikmesi / t_r sınıflandırılır',
          en: 'If entered, K_t = round-trip delay / t_r is classified',
        }),
      },
      fMax: {
        label: t({ tr: 'Maksimum analiz frekansı (opsiyonel)', en: 'Maximum analysis frequency (optional)' }),
        hint: t({
          tr: 'Rezonansın çalışma bandına oranını görmek için',
          en: 'To see the resonance’s ratio to the operating band',
        }),
      },

      hasBackdrillCheck: t({ tr: 'Backdrill uygulandı', en: 'A backdrill is applied' }),
      removed: { label: t({ tr: 'Kaldırılan derinlik', en: 'Removed depth' }) },
      depthTol: { label: t({ tr: 'Backdrill derinlik toleransı', en: 'Backdrill depth tolerance' }) },
      boardThickness: {
        label: t({ tr: 'Kart kalınlığı (opsiyonel)', en: 'Board thickness (optional)' }),
        hint: t({
          tr: 'Verilirse kaldırılan derinlik kart kalınlığını aşınca hata bildirilir',
          en: 'If given, an error is reported when the removed depth exceeds the board thickness',
        }),
      },

      hasTargetCheck: t({
        tr: 'Hedef rezonans frekansından backdrill hedefi öner',
        en: 'Suggest a backdrill target from a target resonance frequency',
      }),
      fTarget: { label: t({ tr: 'Hedef rezonans frekansı', en: 'Target resonance frequency' }) },
      fabricationTol: { label: t({ tr: 'Üretim toleransı (Δl)', en: 'Fabrication tolerance (Δl)' }) },
    },

    // Hata mesajında alan adı olarak görünen kısa etiketler; model.js'e verilir.
    fieldLabels: {
      viaTotal: t({ tr: 'Via toplam uzunluk', en: 'Via total length' }),
      used: t({ tr: 'Kullanılan uzunluk', en: 'Used length' }),
      epsR: t({ tr: 'Dielektrik sabiti (εr)', en: 'Dielectric constant (εr)' }),
      safety: t({ tr: 'Güvenlik payı', en: 'Safety margin' }),
      tr: t({ tr: 'Sinyal yükselme süresi', en: 'Signal rise time' }),
      fMax: t({ tr: 'Maksimum analiz frekansı', en: 'Maximum analysis frequency' }),
      removed: t({ tr: 'Kaldırılan derinlik', en: 'Removed depth' }),
      depthTol: t({ tr: 'Backdrill derinlik toleransı', en: 'Backdrill depth tolerance' }),
      boardThickness: t({ tr: 'Kart kalınlığı', en: 'Board thickness' }),
      fTarget: t({ tr: 'Hedef rezonans frekansı', en: 'Target resonance frequency' }),
      fabricationTol: t({ tr: 'Üretim toleransı', en: 'Fabrication tolerance' }),
    },

    bigResultLabel: t({ tr: 'Nominal çeyrek dalga rezonansı', en: 'Nominal quarter-wave resonance' }),
    altLabels: {
      stub: t({ tr: 'stub uzunluğu', en: 'stub length' }),
      roundTrip: t({ tr: 'gidiş-dönüş gecikmesi', en: 'round-trip delay' }),
    },

    table: {
      stub: t({ tr: 'Stub uzunluğu', en: 'Stub length' }),
      velocity: t({ tr: 'Yayılma hızı (v_p)', en: 'Propagation velocity (v_p)' }),
      resonance: t({ tr: 'Nominal rezonans (f_λ/4)', en: 'Nominal resonance (f_λ/4)' }),
      roundTrip: t({ tr: 'Gidiş-dönüş gecikmesi', en: 'Round-trip delay' }),
      harmonics: t({ tr: 'Harmonikler (1., 3., 5.)', en: 'Harmonics (1st, 3rd, 5th)' }),
      kt: t({ tr: 'K_t (gecikme / yükselme süresi)', en: 'K_t (delay / rise time)' }),
      margin: t({ tr: 'Rezonans / analiz frekansı oranı', en: 'Resonance / analysis frequency ratio' }),

      residualNominal: t({ tr: 'Residual stub — nominal', en: 'Residual stub — nominal' }),
      residualWorst: t({ tr: 'Residual stub — worst-case', en: 'Residual stub — worst-case' }),
      residualBest: t({ tr: 'Residual stub — best-case', en: 'Residual stub — best-case' }),
      resonanceNominal: t({ tr: 'Backdrill sonrası rezonans — nominal', en: 'Post-backdrill resonance — nominal' }),
      resonanceWorst: t({ tr: 'Backdrill sonrası rezonans — worst-case', en: 'Post-backdrill resonance — worst-case' }),
      resonanceGain: t({ tr: 'Rezonans yükselme katsayısı', en: 'Resonance improvement factor' }),

      targetAllowed: t({ tr: 'İzin verilen residual (l_residual,maks)', en: 'Allowed residual (l_residual,max)' }),
      targetNominal: t({ tr: 'Önerilen nominal backdrill hedefi', en: 'Suggested nominal backdrill target' }),
      targetRemoval: t({ tr: 'Gereken kaldırma derinliği', en: 'Required removal depth' }),
    },

    formula: t({
      tr: `v_p = c / √εr
f_λ/4 = c / (4·l_stub·√εr)
t_gidiş-dönüş = 2·l_stub / v_p
K_t = t_gidiş-dönüş / t_r

Harmonikler: f_n = (2n−1)·f_λ/4   (n = 1, 2, 3, …)

residual_worst = residual_nominal + toleransderinlik + güvenlik
residual_best  = maks(0, residual_nominal − toleransderinlik)

l_residual,maks = c / (4·f_hedef·√εr)
l_nominal,hedef = l_residual,maks − Δl_üretim − l_güvenlik`,
      en: `v_p = c / √εr
f_λ/4 = c / (4·l_stub·√εr)
t_round-trip = 2·l_stub / v_p
K_t = t_round-trip / t_r

Harmonics: f_n = (2n−1)·f_λ/4   (n = 1, 2, 3, …)

residual_worst = residual_nominal + depthTolerance + safety
residual_best  = max(0, residual_nominal − depthTolerance)

l_residual,max = c / (4·f_target·√εr)
l_nominal,target = l_residual,max − Δl_fabrication − l_safety`,
    }),

    detail: {
      noRounding: t({
        tr: 'Ara değerlerde yuvarlama yapılmaz; yalnızca gösterim yuvarlanır.',
        en: 'Intermediate values are never rounded; only the display is rounded.',
      }),
      harmonicNote: t({
        tr: 'Yalnız tek harmonikler (1., 3., 5. katlar) listelenir — açık uçlu bir çeyrek dalga '
          + 'rezonatörün karakteristiğidir.',
        en: 'Only odd harmonics (1st, 3rd, 5th multiples) are listed — characteristic of an '
          + 'open-ended quarter-wave resonator.',
      }),
    },

    validity: [
      t({
        tr: 'Rezonans formülü homojen dielektrik ve tek modlu yayılma varsayan birinci mertebe '
          + 'bir modeldir; pad, antipad ve komşu via’ların etkisini içermez.',
        en: 'The resonance formula is a first-order model assuming a homogeneous dielectric and '
          + 'single-mode propagation; it does not include the effect of pads, antipads or '
          + 'neighbouring vias.',
      }),
      t({
        tr: 'Rezonansın analiz bandının dışında kalması stub etkisinin yok olduğu anlamına '
          + 'gelmez: stub kapasitif bir süreksizlik olarak rezonansın çok altındaki '
          + 'frekanslarda da return loss’u bozar.',
        en: 'The resonance being outside the analysis band does not mean the stub’s effect '
          + 'disappears: as a capacitive discontinuity, the stub degrades return loss even at '
          + 'frequencies well below the resonance.',
      }),
      t({
        tr: 'K_t eşikleri (0.1 / 0.25) bir standart zorunluluğu değil, mühendislik sezgisidir.',
        en: 'The K_t thresholds (0.1 / 0.25) are an engineering heuristic, not a standard '
          + 'requirement.',
      }),
      t({
        tr: 'Backdrill worst-case hesabı derinlik toleransı ve güvenlik payını doğrudan '
          + 'toplar; gerçek üretim dağılımı istatistiksel olabilir ve bu yaklaşım muhafazakârdır.',
        en: 'The backdrill worst-case calculation directly sums the depth tolerance and safety '
          + 'margin; the real fabrication distribution may be statistical, so this approach is '
          + 'conservative.',
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
      [SWEEP_STUB]: t({ tr: 'Rezonans / stub uzunluğu', en: 'Resonance / stub length' }),
      [SWEEP_REMOVED]: t({ tr: 'Rezonans / kaldırılan derinlik', en: 'Resonance / removed depth' }),
    },
    sweepAxis: {
      [SWEEP_STUB]: t({ tr: 'Stub uzunluğu (m)', en: 'Stub length (m)' }),
      [SWEEP_REMOVED]: t({ tr: 'Kaldırılan derinlik (m)', en: 'Removed depth (m)' }),
    },
    sweepYLabel: {
      [SWEEP_STUB]: t({ tr: 'Çeyrek dalga rezonansı (Hz)', en: 'Quarter-wave resonance (Hz)' }),
      [SWEEP_REMOVED]: t({ tr: 'Backdrill sonrası rezonans (Hz)', en: 'Post-backdrill resonance (Hz)' }),
    },
    sweepCaption: {
      [SWEEP_STUB]: t({
        tr: 'Rezonans stub uzunluğuyla ters orantılıdır (log-log eksende düz çizgi).',
        en: 'Resonance is inversely proportional to stub length (a straight line on log-log '
          + 'axes).',
      }),
      [SWEEP_REMOVED]: t({
        tr: 'Kaldırılan derinlik arttıkça (residual küçüldükçe) rezonans yükselir.',
        en: 'As the removed depth increases (the residual shrinks) the resonance rises.',
      }),
    },
    operatingPoint: t({ tr: 'çalışma noktası', en: 'operating point' }),

    schematic: {
      title: t({ tr: 'Via stub kesiti', en: 'Via stub cross-section' }),
      caption: (hasBackdrill) => (hasBackdrill
        ? t({
          tr: 'Backdrill sonrası kalan residual stub',
          en: 'The residual stub remaining after a backdrill',
        })
        : t({
          tr: 'Kullanılmayan bölüm açık uçlu bir stub olarak kalıyor',
          en: 'The unused portion remains as an open-ended stub',
        })),
      used: t({ tr: 'kullanılan', en: 'used' }),
      stub: t({ tr: 'stub', en: 'stub' }),
      residual: t({ tr: 'residual', en: 'residual' }),
      removed: t({ tr: 'backdrill', en: 'backdrill' }),
    },

    ktClassLabel,

    reasonText: (reason) => {
      switch (reason) {
        case VS_ERR_RESIDUAL_NEGATIVE:
          return t({
            tr: 'Kaldırılan derinlik stub’dan büyük — bu, hedef katmana girildiği anlamına '
              + 'gelir. Kaldırılan derinliği azaltın.',
            en: 'The removed depth is greater than the stub — this means the target layer was '
              + 'penetrated. Reduce the removed depth.',
          })
        case VS_ERR_EXCEEDS_BOARD:
          return t({
            tr: 'Kaldırılan derinlik kart kalınlığını aşıyor. Backdrill derinliğini veya kart '
              + 'kalınlığını kontrol edin.',
            en: 'The removed depth exceeds the board thickness. Check the backdrill depth or '
              + 'the board thickness.',
          })
        case VS_ERR_TARGET_UNREACHABLE:
          return t({
            tr: 'Üretim toleransı ve güvenlik payı, izin verilen residual’ı tüketiyor — bu '
              + 'hedef rezonansa mevcut süreçle ulaşılamaz. Toleransı, payı veya hedefi gevşetin.',
            en: 'The fabrication tolerance and safety margin consume the entire allowed '
              + 'residual — this target resonance cannot be reached with the current process. '
              + 'Relax the tolerance, margin or target.',
          })
        case REASON_INCOMPLETE:
        default:
          return t({
            tr: 'Tüm zorunlu alanlara pozitif sayısal değer girin. Ondalık için nokta veya '
              + 'virgül kullanabilirsiniz (0.25 = 0,25).',
            en: 'Enter a positive numeric value in every required field. Use a point or a '
              + 'comma for decimals (0.25 = 0,25).',
          })
      }
    },

    // Mühendislik yorumu — motorun `level`/`findings` kavramı olmadığı için
    // ham `r`den burada kurulur (bkz. dosya başı notu).
    commentary: (r) => {
      if (!r.ok) return []
      const out = []

      out.push({
        level: 'ok',
        text: t({
          tr: `Stub uzunluğu ${fmtM(r.stub)}; nominal çeyrek dalga rezonansı ${fmtHz(r.resonance, 3)}.`,
          en: `Stub length ${fmtM(r.stub)}; the nominal quarter-wave resonance is `
            + `${fmtHz(r.resonance, 3)}.`,
        }),
      })

      if (r.margin != null) {
        const level = r.margin < 1 ? 'danger' : r.margin < 3 ? 'warn' : 'ok'
        out.push({
          level,
          text: level === 'danger'
            ? t({
              tr: `Analiz frekansı (${fmtHz(r.fMax, 3)}) nominal rezonansı `
                + `(${fmtHz(r.resonance, 3)}) AŞIYOR — stub etkisi bu bantta baskın olabilir.`,
              en: `The analysis frequency (${fmtHz(r.fMax, 3)}) EXCEEDS the nominal resonance `
                + `(${fmtHz(r.resonance, 3)}) — the stub effect may dominate in this band.`,
            })
            : t({
              tr: `Nominal rezonans, analiz frekansının ${fmt(r.margin, 3)} katı `
                + `(${level === 'warn' ? 'sınıra yakın' : 'yeterli marj'}).`,
              en: `The nominal resonance is ${fmt(r.margin, 3)}× the analysis frequency `
                + `(${level === 'warn' ? 'close to the limit' : 'ample margin'}).`,
            }),
        })
      }

      if (r.kt != null) {
        out.push({
          level: r.ktClass === KT_CLASS_LOW ? 'ok' : 'warn',
          text: t({
            tr: `K_t = ${fmt(r.kt, 3)} — ${ktClassLabel(r.ktClass)}.`,
            en: `K_t = ${fmt(r.kt, 3)} — ${ktClassLabel(r.ktClass)}.`,
          }),
        })
      }

      out.push({
        level: 'warn',
        text: t({
          tr: 'Rezonansın çalışma bandının dışında olması stub etkisinin yok olduğu anlamına '
            + 'gelmez: kapasitif süreksizlik daha düşük frekanslarda da return loss’u bozar.',
          en: 'The resonance being outside the operating band does not mean the stub’s effect '
            + 'disappears: the capacitive discontinuity degrades return loss at lower '
            + 'frequencies too.',
        }),
      })

      if (r.residual) {
        out.push({
          level: 'ok',
          text: t({
            tr: `Backdrill sonrası residual stub ${fmtM(r.residual.nominal)} (worst-case `
              + `${fmtM(r.residual.worstCase)}) — rezonans ${fmt(r.residual.resonanceGain, 2)} `
              + 'kat yükseldi.',
            en: `The post-backdrill residual stub is ${fmtM(r.residual.nominal)} (worst-case `
              + `${fmtM(r.residual.worstCase)}) — the resonance improved by `
              + `${fmt(r.residual.resonanceGain, 2)}×.`,
          }),
        })

        if (r.fMax != null) {
          const worstMargin = r.residual.resonanceWorstCase / r.fMax
          out.push({
            level: worstMargin < 1 ? 'danger' : worstMargin < 3 ? 'warn' : 'ok',
            text: worstMargin < 1
              ? t({
                tr: 'Worst-case backdrill sonrasında bile rezonans analiz bandının içinde '
                  + 'kalıyor.',
                en: 'Even in the worst-case backdrill outcome, the resonance stays inside the '
                  + 'analysis band.',
              })
              : t({
                tr: `Worst-case backdrill sonrası rezonans, analiz frekansının `
                  + `${fmt(worstMargin, 2)} katı.`,
                en: `After the worst-case backdrill outcome the resonance is `
                  + `${fmt(worstMargin, 2)}× the analysis frequency.`,
              }),
          })
        }
      }

      if (r.backdrillTarget) {
        if (r.backdrillTarget.error) {
          out.push({
            level: 'danger',
            text: t({
              tr: `Hedef rezonans için izin verilen residual ${fmtM(r.backdrillTarget.allowed)} `
                + '— üretim toleransı ve güvenlik payı bunu tüketiyor, hedefe mevcut süreçle '
                + 'ulaşılamaz.',
              en: `The allowed residual for the target resonance is `
                + `${fmtM(r.backdrillTarget.allowed)} — the fabrication tolerance and safety `
                + 'margin consume it entirely, the target cannot be reached with the current '
                + 'process.',
            }),
          })
        } else {
          out.push({
            level: 'ok',
            text: t({
              tr: `Önerilen nominal backdrill hedefi ${fmtM(r.backdrillTarget.nominalTarget)} — `
                + `${fmtM(r.backdrillTarget.requiredRemoval)} kaldırılması gerekir.`,
              en: `The suggested nominal backdrill target is `
                + `${fmtM(r.backdrillTarget.nominalTarget)} — `
                + `${fmtM(r.backdrillTarget.requiredRemoval)} must be removed.`,
            }),
          })
        }
      }

      return out
    },
  }
}
