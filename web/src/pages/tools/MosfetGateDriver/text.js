// MOSFET gate sürücü ve gate direnci hesaplayıcısı ekranının kullanıcıya
// görünen metinleri — iki dilli (tr/en).
//
// Motorun (lib/gateDriver.js) bulgu/seviye kavramı yok — Adım 2'nin altı
// kardeş motorundan hiçbirinde `divider.js`-tipi bir `findings()` yok (bkz.
// ReturnPathStitchingVia/text.js başındaki not). Bulgular burada, ham
// `compute()` çıktısından `commentary(r)` ile kurulur.

import { fmt, fmtEng, fmtRes } from '../../../lib/num'
import { pick } from '../../../lib/i18n'
import { commonText } from '../../../data/uiText'
import {
  REASON_INCOMPLETE, REASON_COUNT, GD_ERR_NEGATIVE_RESISTANCE, GD_ERR_DRIVER_CURRENT,
  SWEEP_RESISTANCE, SWEEP_FSW,
} from './model'

const fmtA = (x, sig = 3) => fmtEng(x, 'A', sig)
const fmtW = (x, sig = 3) => fmtEng(x, 'W', sig)
const fmtS = (x, sig = 3) => fmtEng(x, 's', sig)
const fmtC = (x, sig = 3) => fmtEng(x, 'C', sig)
const fmtV = (x, sig = 3) => fmtEng(x, 'V', sig)

export function getText(lang) {
  const t = (dict) => pick(dict, lang)
  const { pct } = commonText(lang)

  return {
    pct,
    backlink: t({ tr: '← Komponent ve Devre Hesapları', en: '← Component and Circuit Calculators' }),
    title: t({
      tr: 'MOSFET Gate Sürücü ve Gate Direnci Hesaplayıcı',
      en: 'MOSFET Gate Driver and Gate Resistor Calculator',
    }),
    intro: t({
      tr: 'Gate charge (Q_g, Q_gd) üzerinden turn-on/turn-off Miller akımını, gate sürme '
        + 'gücünü ve opsiyonel olarak hedef anahtarlama süresinden gereken harici direnci '
        + 'değerlendirir. Gate sabit lineer bir kondansatör olarak modellenmez.',
      en: 'Evaluates the turn-on/turn-off Miller current and gate drive power from the gate '
        + 'charge (Q_g, Q_gd), and optionally the external resistor required for a target '
        + 'switching time. The gate is not modelled as a fixed linear capacitor.',
    }),

    fields: {
      qg: { label: t({ tr: 'Toplam gate yükü (Q_g)', en: 'Total gate charge (Q_g)' }) },
      qgd: { label: t({ tr: 'Miller (gate-drain) yükü (Q_gd)', en: 'Miller (gate-drain) charge (Q_gd)' }) },
      vDrive: { label: t({ tr: 'Sürücü çıkış gerilimi (V_sürüş)', en: 'Driver output voltage (V_drive)' }) },
      vPlateau: { label: t({ tr: 'Miller plato gerilimi (V_plato)', en: 'Miller plateau voltage (V_plateau)' }) },
      vOff: {
        label: t({ tr: 'Kapama gerilimi (V_off)', en: 'Turn-off voltage (V_off)' }),
        hint: t({ tr: 'Negatif kapama gerilimi de girilebilir', en: 'A negative turn-off voltage may also be entered' }),
      },
      fsw: { label: t({ tr: 'Anahtarlama frekansı (f_sw)', en: 'Switching frequency (f_sw)' }) },
      count: { label: t({ tr: 'Paralel MOSFET sayısı (N)', en: 'Parallel MOSFET count (N)' }) },

      rDriverSource: { label: t({ tr: 'Sürücü kaynak (source) direnci', en: 'Driver source resistance' }) },
      rDriverSink: { label: t({ tr: 'Sürücü yutma (sink) direnci', en: 'Driver sink resistance' }) },
      rGateInternal: { label: t({ tr: 'MOSFET iç gate direnci (R_g,int)', en: 'MOSFET internal gate resistance (R_g,int)' }) },
      rExtOn: { label: t({ tr: 'Harici gate direnci — turn-on', en: 'External gate resistor — turn-on' }) },
      rExtOff: { label: t({ tr: 'Harici gate direnci — turn-off', en: 'External gate resistor — turn-off' }) },
      rTrace: { label: t({ tr: 'İz direnci', en: 'Trace resistance' }) },
      driverPeakSource: {
        label: t({ tr: 'Sürücü tepe kaynak akımı (opsiyonel)', en: 'Driver peak source current (optional)' }),
        hint: t({
          tr: 'Verilirse turn-on akımı bu değerle sınırlanır',
          en: 'If given, the turn-on current is clamped to this value',
        }),
      },
      driverPeakSink: {
        label: t({ tr: 'Sürücü tepe yutma akımı (opsiyonel)', en: 'Driver peak sink current (optional)' }),
        hint: t({
          tr: 'Verilirse turn-off akımı bu değerle sınırlanır',
          en: 'If given, the turn-off current is clamped to this value',
        }),
      },

      hasTargetCheck: t({
        tr: 'Hedef anahtarlama süresinden harici direnç öner',
        en: 'Suggest an external resistor from a target switching time',
      }),
      targetOnTime: { label: t({ tr: 'Hedef turn-on (Miller) süresi', en: 'Target turn-on (Miller) time' }) },
      targetOffTime: { label: t({ tr: 'Hedef turn-off (Miller) süresi', en: 'Target turn-off (Miller) time' }) },

      hasLossCheck: t({
        tr: 'Anahtarlama ve çıkış kapasitesi (C_oss) kaybını hesapla',
        en: 'Calculate switching and output capacitance (C_oss) loss',
      }),
      vds: { label: t({ tr: 'Anahtarlama drain-source gerilimi (V_DS)', en: 'Switching drain-source voltage (V_DS)' }) },
      id: { label: t({ tr: 'Anahtarlama drain akımı (I_D, opsiyonel)', en: 'Switching drain current (I_D, optional)' }) },
      tr: { label: t({ tr: 'Yükselme süresi (t_r, opsiyonel)', en: 'Rise time (t_r, optional)' }) },
      tf: { label: t({ tr: 'Düşme süresi (t_f, opsiyonel)', en: 'Fall time (t_f, optional)' }) },
      coss: {
        label: t({ tr: 'Çıkış kapasitesi (C_oss, opsiyonel)', en: 'Output capacitance (C_oss, optional)' }),
        hint: t({
          tr: 'E_oss verilmişse bu yerine o kullanılır',
          en: 'If E_oss is given, it is used instead',
        }),
      },
      eoss: {
        label: t({ tr: 'Datasheet C_oss enerjisi (E_oss, opsiyonel)', en: 'Datasheet C_oss energy (E_oss, optional)' }),
        hint: t({
          tr: '½·C_oss·V² yaklaşımından daha doğrudur, varsa tercih edilir',
          en: 'More accurate than the ½·C_oss·V² approximation, preferred when available',
        }),
      },
    },

    // Hata mesajında alan adı olarak görünen kısa etiketler; model.js'e verilir.
    fieldLabels: {
      qg: t({ tr: 'Toplam gate yükü', en: 'Total gate charge' }),
      qgd: t({ tr: 'Miller yükü', en: 'Miller charge' }),
      vDrive: t({ tr: 'Sürücü çıkış gerilimi', en: 'Driver output voltage' }),
      vPlateau: t({ tr: 'Miller plato gerilimi', en: 'Miller plateau voltage' }),
      vOff: t({ tr: 'Kapama gerilimi', en: 'Turn-off voltage' }),
      fsw: t({ tr: 'Anahtarlama frekansı', en: 'Switching frequency' }),
      count: t({ tr: 'MOSFET sayısı', en: 'MOSFET count' }),
      rDriverSource: t({ tr: 'Sürücü kaynak direnci', en: 'Driver source resistance' }),
      rDriverSink: t({ tr: 'Sürücü yutma direnci', en: 'Driver sink resistance' }),
      rGateInternal: t({ tr: 'MOSFET iç gate direnci', en: 'MOSFET internal gate resistance' }),
      rExtOn: t({ tr: 'Harici gate direnci (turn-on)', en: 'External gate resistor (turn-on)' }),
      rExtOff: t({ tr: 'Harici gate direnci (turn-off)', en: 'External gate resistor (turn-off)' }),
      rTrace: t({ tr: 'İz direnci', en: 'Trace resistance' }),
      driverPeakSource: t({ tr: 'Sürücü tepe kaynak akımı', en: 'Driver peak source current' }),
      driverPeakSink: t({ tr: 'Sürücü tepe yutma akımı', en: 'Driver peak sink current' }),
      targetOnTime: t({ tr: 'Hedef turn-on süresi', en: 'Target turn-on time' }),
      targetOffTime: t({ tr: 'Hedef turn-off süresi', en: 'Target turn-off time' }),
      vds: t({ tr: 'Anahtarlama V_DS', en: 'Switching V_DS' }),
      id: t({ tr: 'Anahtarlama I_D', en: 'Switching I_D' }),
      tr: t({ tr: 'Yükselme süresi', en: 'Rise time' }),
      tf: t({ tr: 'Düşme süresi', en: 'Fall time' }),
      coss: t({ tr: 'Çıkış kapasitesi', en: 'Output capacitance' }),
      eoss: t({ tr: 'Datasheet C_oss enerjisi', en: 'Datasheet C_oss energy' }),
    },

    // model.js'teki `count` alanı yalnızca SI dönüşüm tablosunun anahtarı olarak
    // sabit 'adet' taşır (COUNT = { adet: 1 }) — ekranda gösterilen birim değil,
    // dahili bir sözcüktür. Ekran ve rapor birimi buradan okur (ThermalVia'daki
    // countUnit ile aynı desen).
    countUnit: t({ tr: 'adet', en: 'pcs' }),

    bigResultLabel: t({ tr: 'Turn-on Miller akımı', en: 'Turn-on Miller current' }),
    altLabels: {
      millerTime: t({ tr: 'Miller süresi', en: 'Miller time' }),
      avgCurrent: t({ tr: 'ortalama akım', en: 'average current' }),
      gatePower: t({ tr: 'gate gücü', en: 'gate power' }),
    },

    table: {
      averageCurrent: t({ tr: 'Ortalama gate akımı (I_g,avg)', en: 'Average gate current (I_g,avg)' }),
      gatePower: t({ tr: 'Gate sürme gücü (P_gate)', en: 'Gate drive power (P_gate)' }),
      onHead: t({ tr: 'Turn-on', en: 'Turn-on' }),
      offHead: t({ tr: 'Turn-off', en: 'Turn-off' }),
      rTotal: t({ tr: 'Toplam direnç', en: 'Total resistance' }),
      current: t({ tr: 'Miller akımı', en: 'Miller current' }),
      currentResistive: t({ tr: 'Dirençten çıkan akım (limitsiz)', en: 'Resistor-limited current (unclamped)' }),
      millerTime: t({ tr: 'Miller süresi', en: 'Miller time' }),
      chargeTime: t({ tr: 'Toplam yük süresi', en: 'Total charge time' }),
      resistorLoss: t({ tr: 'Harici dirençteki güç kaybı', en: 'External resistor power loss' }),
      driverLimited: t({ tr: 'Sürücü akımıyla sınırlı', en: 'Clamped by driver current' }),

      targetExternal: t({ tr: 'Önerilen harici direnç', en: 'Suggested external resistor' }),
      targetCurrent: t({ tr: 'Hedef akım', en: 'Target current' }),
      targetRTotal: t({ tr: 'Hedef toplam direnç', en: 'Target total resistance' }),

      switchingLoss: t({ tr: 'Switching kaybı (V·I lineer geçiş)', en: 'Switching loss (linear V·I transition)' }),
      cossLoss: t({ tr: 'C_oss kaybı', en: 'C_oss loss' }),
    },

    formula: t({
      tr: `I_g,avg = N·Q_g·f_sw
P_gate = N·Q_g·(V_sürüş − V_off)·f_sw

I_miller = (V_sürüş − V_plato) / R_toplam   (turn-on)
I_miller = (V_plato − V_off) / R_toplam     (turn-off, sınırsız hâl)
R_toplam = R_sürücü + R_g,int + R_ext + R_iz

t_miller = Q_gd / I_miller
t_yük = Q_g / I_miller

R_ext,hedef = R_toplam,hedef − R_sürücü − R_g,int − R_iz

P_switching = ½·V_DS·I_D·(t_r + t_f)·f_sw
P_Coss = E_oss·f_sw   veya   ½·C_oss·V_DS²·f_sw`,
      en: `I_g,avg = N·Q_g·f_sw
P_gate = N·Q_g·(V_drive − V_off)·f_sw

I_miller = (V_drive − V_plateau) / R_total   (turn-on)
I_miller = (V_plateau − V_off) / R_total     (turn-off, unclamped)
R_total = R_driver + R_g,int + R_ext + R_trace

t_miller = Q_gd / I_miller
t_charge = Q_g / I_miller

R_ext,target = R_total,target − R_driver − R_g,int − R_trace

P_switching = ½·V_DS·I_D·(t_r + t_f)·f_sw
P_Coss = E_oss·f_sw   or   ½·C_oss·V_DS²·f_sw`,
    }),

    detail: {
      noRounding: t({
        tr: 'Ara değerlerde yuvarlama yapılmaz; yalnızca gösterim yuvarlanır.',
        en: 'Intermediate values are never rounded; only the display is rounded.',
      }),
      gateChargeMethod: t({
        tr: 'Hesap datasheet’in gate charge eğrisine (Q_g, Q_gd, V_plato) dayanır; gate sabit '
          + 'lineer bir kondansatör olarak modellenmez.',
        en: 'The calculation is based on the datasheet gate charge curve (Q_g, Q_gd, '
          + 'V_plateau); the gate is not modelled as a fixed linear capacitor.',
      }),
    },

    validity: [
      t({
        tr: 'Gate charge eğrisi datasheet’in test drain gerilimi ve akımına bağlıdır; '
          + 'gerçek çalışma noktası test koşulundan uzaksa sonuç yaklaşıktır.',
        en: 'The gate charge curve depends on the datasheet’s test drain voltage and current; '
          + 'if the real operating point is far from the test condition, the result is '
          + 'approximate.',
      }),
      t({
        tr: 'I_miller, Miller platosu boyunca SABİT kabul edilir; gerçek akım platonun '
          + 'başında ve sonunda biraz değişir.',
        en: 'I_miller is assumed CONSTANT across the Miller plateau; the real current varies '
          + 'somewhat at the start and end of the plateau.',
      }),
      t({
        tr: 'Switching kaybı basit lineer V·I geçiş kabulüdür — reverse recovery, '
          + 'common-source endüktansı, parazitik ringing ve plato varyasyonunu içermez.',
        en: 'The switching loss uses a simple linear V·I transition assumption — it excludes '
          + 'reverse recovery, common-source inductance, parasitic ringing and plateau '
          + 'variation.',
      }),
      t({
        tr: 'C_oss kaybı için E_oss verilmemişse ½·C_oss·V² yaklaşımı kullanılır; bu, '
          + 'C_oss’un gerilimle güçlü değişimini yok sayar ve genelde iyimser çıkar.',
        en: 'When E_oss is not given, the C_oss loss falls back to the ½·C_oss·V² '
          + 'approximation, which ignores C_oss’s strong voltage dependence and is generally '
          + 'optimistic.',
      }),
      t({
        tr: 'Sonuçlar yaklaşık mühendislik tahminidir — kritik tasarımlarda ölçümle doğrulayın.',
        en: 'Results are approximate engineering estimates — verify with measurement for '
          + 'critical designs.',
      }),
    ],

    sweepGroup: t({ tr: 'Grafik', en: 'Chart' }),
    sweepLabel: {
      [SWEEP_RESISTANCE]: t({ tr: 'Miller akımı / harici direnç', en: 'Miller current / external resistor' }),
      [SWEEP_FSW]: t({ tr: 'Gate gücü / anahtarlama frekansı', en: 'Gate power / switching frequency' }),
    },
    sweepAxis: {
      [SWEEP_RESISTANCE]: t({ tr: 'Harici gate direnci (Ω)', en: 'External gate resistor (Ω)' }),
      [SWEEP_FSW]: t({ tr: 'Anahtarlama frekansı (Hz)', en: 'Switching frequency (Hz)' }),
    },
    sweepYLabel: {
      [SWEEP_RESISTANCE]: t({ tr: 'Miller akımı (A)', en: 'Miller current (A)' }),
      [SWEEP_FSW]: t({ tr: 'Gate sürme gücü (W)', en: 'Gate drive power (W)' }),
    },
    sweepCaption: {
      [SWEEP_RESISTANCE]: t({
        tr: 'Diğer direnç bileşenleri sabit tutulup yalnız harici direnç taranır; sürücü akım '
          + 'limiti verilmişse düşük dirençte akım yatay bir platoda sınırlanır.',
        en: 'Other resistance components are held fixed while only the external resistor is '
          + 'swept; if a driver current limit is given, the current is clamped to a flat '
          + 'plateau at low resistance.',
      }),
      [SWEEP_FSW]: t({
        tr: 'Gate sürme gücü anahtarlama frekansıyla doğrusal artar (log-log eksende düz çizgi).',
        en: 'Gate drive power rises linearly with switching frequency (a straight line on '
          + 'log-log axes).',
      }),
    },
    operatingPoint: t({ tr: 'çalışma noktası', en: 'operating point' }),
    seriesOn: t({ tr: 'turn-on', en: 'turn-on' }),
    seriesOff: t({ tr: 'turn-off', en: 'turn-off' }),

    schematic: {
      title: t({ tr: 'Gate sürücü devresi', en: 'Gate driver circuit' }),
      caption: t({
        tr: 'Ayrık turn-on / turn-off gate direnci ağı',
        en: 'Split turn-on / turn-off gate resistor network',
      }),
      driver: t({ tr: 'sürücü', en: 'driver' }),
      mosfet: t({ tr: 'MOSFET', en: 'MOSFET' }),
      gate: t({ tr: 'G', en: 'G' }),
      drain: t({ tr: 'D', en: 'D' }),
      source: t({ tr: 'S', en: 'S' }),
      on: t({ tr: 'turn-on', en: 'turn-on' }),
      off: t({ tr: 'turn-off', en: 'turn-off' }),
    },

    reasonText: (reason) => {
      switch (reason) {
        case REASON_COUNT:
          return t({
            tr: 'MOSFET sayısı 1 veya daha büyük bir tam sayı olmalı.',
            en: 'The MOSFET count must be an integer of 1 or more.',
          })
        case REASON_INCOMPLETE:
        default:
          return t({
            tr: 'Tüm zorunlu alanlara pozitif sayısal değer girin; V_sürüş > V_plato > V_off '
              + 'sıralamasına uyun. Ondalık için nokta veya virgül kullanabilirsiniz.',
            en: 'Enter a positive numeric value in every required field, keeping '
              + 'V_drive > V_plateau > V_off. Use a point or a comma for decimals.',
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
          tr: `Ortalama gate akımı ${fmtA(r.averageCurrent)}, gate sürme gücü `
            + `${fmtW(r.gatePower)}${r.count > 1 ? ` (${r.count} MOSFET toplamı)` : ''}.`,
          en: `The average gate current is ${fmtA(r.averageCurrent)} and the gate drive power `
            + `is ${fmtW(r.gatePower)}${r.count > 1 ? ` (total for ${r.count} MOSFETs)` : ''}.`,
        }),
      })

      out.push({
        level: 'ok',
        text: t({
          tr: `Turn-on: ${fmtA(r.on.current)} → ${fmtS(r.on.millerTime)} Miller süresi. `
            + `Turn-off: ${fmtA(r.off.current)} → ${fmtS(r.off.millerTime)}.`,
          en: `Turn-on: ${fmtA(r.on.current)} → ${fmtS(r.on.millerTime)} Miller time. `
            + `Turn-off: ${fmtA(r.off.current)} → ${fmtS(r.off.millerTime)}.`,
        }),
      })

      // GD_ERR_DRIVER_CURRENT: driver tepe akım limiti Miller akımını kırptığında
      // gateDriver.js ilgili alt bloğun (on/off) kendi .error alanına bu kodu
      // koyar — r.ok true kalır, yalnız o taraf sınırlı olduğunu bildirir
      // (targetOn/targetOff ile aynı alt-hata deseni, bkz. dosya başı notu).
      if (r.on.error === GD_ERR_DRIVER_CURRENT || r.off.error === GD_ERR_DRIVER_CURRENT) {
        const which = r.on.error === GD_ERR_DRIVER_CURRENT && r.off.error === GD_ERR_DRIVER_CURRENT
          ? t({ tr: 'Turn-on ve turn-off ikisi de', en: 'Both turn-on and turn-off are' })
          : r.on.error === GD_ERR_DRIVER_CURRENT
            ? t({ tr: 'Turn-on', en: 'Turn-on' })
            : t({ tr: 'Turn-off', en: 'Turn-off' })
        out.push({
          level: 'danger',
          text: t({
            tr: `${which} sürücünün tepe akım limitiyle sınırlı — hızı artık direnç değil `
              + 'sürücünün kendisi belirliyor.',
            en: `${which} clamped by the driver’s peak current limit — the speed is now set `
              + 'by the driver itself, not the resistor.',
          }),
        })
      }

      if (r.targetOn) {
        out.push(r.targetOn.error
          ? {
            level: 'danger',
            text: t({
              tr: 'Turn-on için: iç dirençler (sürücü + iç gate + iz) hedef süreden daha '
                + 'yavaş — bu hedefe hiçbir harici direnç değeriyle ulaşılamaz.',
              en: 'For turn-on: the internal resistances (driver + internal gate + trace) are '
                + 'already slower than the target time — no external resistor value can reach '
                + 'this target.',
            }),
          }
          : {
            level: 'ok',
            text: t({
              tr: `Turn-on için önerilen harici direnç: ${fmtRes(r.targetOn.external)}.`,
              en: `Suggested external resistor for turn-on: ${fmtRes(r.targetOn.external)}.`,
            }),
          })
      }

      if (r.targetOff) {
        out.push(r.targetOff.error
          ? {
            level: 'danger',
            text: t({
              tr: 'Turn-off için: iç dirençler hedef süreden daha yavaş — bu hedefe hiçbir '
                + 'harici direnç değeriyle ulaşılamaz.',
              en: 'For turn-off: the internal resistances are already slower than the target '
                + 'time — no external resistor value can reach this target.',
            }),
          }
          : {
            level: 'ok',
            text: t({
              tr: `Turn-off için önerilen harici direnç: ${fmtRes(r.targetOff.external)}.`,
              en: `Suggested external resistor for turn-off: ${fmtRes(r.targetOff.external)}.`,
            }),
          })
      }

      if (r.switchingLoss != null) {
        out.push({
          level: 'ok',
          text: t({
            tr: `Lineer geçiş varsayımıyla switching kaybı ${fmtW(r.switchingLoss)} — reverse `
              + 'recovery ve ringing dahil değildir.',
            en: `Under the linear-transition assumption the switching loss is `
              + `${fmtW(r.switchingLoss)} — reverse recovery and ringing are not included.`,
          }),
        })
      }

      if (r.cossLoss != null) {
        out.push({
          level: 'ok',
          text: r.cossSource === 'eoss'
            ? t({
              tr: `C_oss kaybı (datasheet E_oss’tan) ${fmtW(r.cossLoss)}.`,
              en: `The C_oss loss (from datasheet E_oss) is ${fmtW(r.cossLoss)}.`,
            })
            : t({
              tr: `C_oss kaybı ½·C_oss·V² yaklaşımıyla ${fmtW(r.cossLoss)} — bu genelde `
                + 'iyimser bir tahmindir.',
              en: `The C_oss loss under the ½·C_oss·V² approximation is ${fmtW(r.cossLoss)} — `
                + 'this is generally an optimistic estimate.',
            }),
        })
      }

      return out
    },
  }
}
