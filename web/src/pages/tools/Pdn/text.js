// PDN hedef empedansı ekranının kullanıcıya görünen metinleri — iki dilli (tr/en).
// Model yalnızca kod döner; dile çeviri burada yapılır. Ekran `getText(lang)`
// çağırır ve çözülmüş metin nesnesini kullanır.

import { fmt, fmtEng, fmtRes, fmtVolt } from '../../../lib/num'
import { pick } from '../../../lib/i18n'
import { commonText } from '../../../data/uiText'
import {
  SRC_TOLERANCE, SRC_DIRECT, OFF, ON,
  REASON_INCOMPLETE, REASON_TARGET, REASON_ROWS, REASON_PLANE, REASON_CURVE,
  REASON_LOOP, REASON_ESR_ZERO,
} from './model'

export function getText(lang) {
  const t = (dict) => pick(dict, lang)

  // Yüzde işaretinin yeri dile göre değişir; kalıp uiText.js'te tek yerdedir.
  const { pct } = commonText(lang)

  const loopTermLabel = {
    component: t({ tr: 'komponent ESL', en: 'component ESL' }),
    mount: t({ tr: 'montaj (L_mount)', en: 'mounting (L_mount)' }),
    via: t({ tr: 'via (L_via)', en: 'via (L_via)' }),
    spread: t({ tr: 'düzlem yayılması (L_yayılma)', en: 'plane spreading (L_spread)' }),
  }

  return {
    backlink: t({ tr: '← Güç Bütünlüğü ve Termal', en: '← Power Integrity and Thermal' }),
    title: t({ tr: 'PDN Hedef Empedansı', en: 'PDN Target Impedance' }),
    intro: t({
      tr: 'Ray gerilimi, tolerans ve ani yük değişiminden hedef empedansı bulur; istenirse VRM, '
        + 'kapasitör bankası ve düzlem kapasitesinden PDN empedans eğrisini hedef çizgisiyle aynı '
        + 'grafikte çizer ve bağlantı loop endüktansını ayrıca toplar.',
      en: 'Finds the target impedance from the rail voltage, tolerance and load current step; '
        + 'optionally draws the PDN impedance curve from the VRM, capacitor bank and plane '
        + 'capacitance on the same chart as the target line, and sums the connection loop '
        + 'inductance separately.',
    }),

    sourceGroup: t({ tr: 'Gerilim dalgalanması girdisi', en: 'Voltage ripple input' }),
    sourceLabel: {
      [SRC_TOLERANCE]: t({ tr: 'Ray gerilimi + tolerans %', en: 'Rail voltage + tolerance %' }),
      [SRC_DIRECT]: t({ tr: 'Doğrudan izin verilen ΔV', en: 'Directly entered allowed ΔV' }),
    },

    toggleLabel: {
      [OFF]: t({ tr: 'Hayır', en: 'No' }),
      [ON]: t({ tr: 'Evet', en: 'Yes' }),
    },

    loopTermLabel,

    yes: t({ tr: 'evet', en: 'yes' }),
    no: t({ tr: 'hayır', en: 'no' }),

    // Yüzde işaretinin yeri dile bağlıdır: TR'de sayının önünde, EN'de sonunda.
    pct,
    fields: {
      Vrail: { label: t({ tr: 'Ray gerilimi (V_ray)', en: 'Rail voltage (V_rail)' }) },
      tolerancePct: {
        label: t({ tr: 'Gerilim toleransı', en: 'Voltage tolerance' }),
        hint: t({
          tr: 'İzin verilen ΔV bu yüzdeden türetilir',
          en: 'The allowed ΔV is derived from this percentage',
        }),
      },
      deltaV: {
        label: t({
          tr: 'İzin verilen gerilim değişimi (ΔV)',
          en: 'Allowed voltage excursion (ΔV)',
        }),
        hint: t({
          tr: 'Ray gerilimi ve tolerans yüzdesi bu modda kullanılmaz',
          en: 'The rail voltage and tolerance percentage are not used in this mode',
        }),
      },
      deltaI: {
        label: t({ tr: 'Ani yük değişimi (ΔI)', en: 'Load current step (ΔI)' }),
        hint: t({
          tr: 'Yükün en kötü akım sıçraması',
          en: 'The worst-case current step of the load',
        }),
      },
      curve: {
        label: t({ tr: 'PDN eğrisini de çiz', en: 'Also draw the PDN curve' }),
        hint: t({
          tr: 'Kapalıyken ekran yalnızca hedef empedansı verir',
          en: 'When off, the screen gives only the target impedance',
        }),
      },
      fOp: {
        label: t({ tr: 'Çalışma frekansı', en: 'Operating frequency' }),
        hint: t({ tr: 'Grafikteki işaretli nokta', en: 'The marked point on the chart' }),
      },
      vrmR: {
        label: t({ tr: 'VRM çıkış direnci (R)', en: 'VRM output resistance (R)' }),
        hint: t({ tr: 'Boş bırakılabilir', en: 'May be left blank' }),
      },
      vrmL: {
        label: t({ tr: 'VRM endüktansı (L)', en: 'VRM inductance (L)' }),
        hint: t({
          tr: 'VRM modeli R + jωL olarak alınır',
          en: 'The VRM model is taken as R + jωL',
        }),
      },
      plane: {
        label: t({ tr: 'Düzlem kapasitesini de ekle', en: 'Also include plane capacitance' }),
      },
      area: { label: t({ tr: 'Örtüşen düzlem alanı (A)', en: 'Overlapping plane area (A)' }) },
      d: { label: t({ tr: 'Dielektrik kalınlığı (d)', en: 'Dielectric thickness (d)' }) },
      epsR: { label: t({ tr: 'Dielektrik sabiti (εr)', en: 'Dielectric constant (εr)' }) },
      loop: {
        label: t({
          tr: 'Bağlı loop endüktansını da hesapla',
          en: 'Also compute the connected loop inductance',
        }),
        hint: t({
          tr: 'Eğriye girmez, ayrı değerlendirilir',
          en: 'Not part of the curve; evaluated separately',
        }),
      },
      eslComp: { label: t({ tr: 'Komponent ESL', en: 'Component ESL' }) },
      Lmount: { label: t({ tr: 'Montaj endüktansı (L_mount)', en: 'Mounting inductance (L_mount)' }) },
      Lvia: { label: t({ tr: 'Via endüktansı (L_via)', en: 'Via inductance (L_via)' }) },
      Lspread: {
        label: t({
          tr: 'Düzlem yayılma endüktansı (L_yayılma)',
          en: 'Plane spreading inductance (L_spread)',
        }),
      },
    },

    // Kapasitör bankası satır listeleri
    rowList: {
      bankA: t({
        tr: 'Kapasitör bankası — kapasite ve ESR',
        en: 'Capacitor bank — capacitance and ESR',
      }),
      bankB: t({ tr: 'Aynı satırlar — ESL ve adet', en: 'Same rows — ESL and count' }),
      addLabel: t({ tr: 'Kapasitör ekle', en: 'Add capacitor' }),
      rowLabel: t({ tr: 'Kapasitör', en: 'Capacitor' }),
      hintA: t({
        tr: 'Her satır bir kapasitör tipidir; ESR sıfır olamaz',
        en: 'Each row is one capacitor type; ESR cannot be zero',
      }),
      hintB: t({
        tr: 'Satır numaraları üstteki listeyle birebir aynıdır',
        en: 'Row numbers match the list above exactly',
      }),
    },

    // RowList sütun başlıkları — yapı model.js'te, dize burada
    capCols: {
      C: t({ tr: 'Kapasite', en: 'Capacitance' }),
      ESR: 'ESR',
      ESL: 'ESL',
      n: t({ tr: 'Adet', en: 'Count' }),
    },

    // Hata mesajında alan adı olarak görünen etiketler; model.js'e verilir.
    fieldLabels: {
      deltaI: t({ tr: 'Ani yük değişimi (ΔI)', en: 'Load current step (ΔI)' }),
      Vrail: t({ tr: 'Ray gerilimi (V_ray)', en: 'Rail voltage (V_rail)' }),
      tolerancePct: t({ tr: 'Gerilim toleransı', en: 'Voltage tolerance' }),
      deltaV: t({ tr: 'İzin verilen gerilim değişimi (ΔV)', en: 'Allowed voltage excursion (ΔV)' }),
      fOp: t({ tr: 'Çalışma frekansı', en: 'Operating frequency' }),
      vrmR: t({ tr: 'VRM çıkış direnci (R)', en: 'VRM output resistance (R)' }),
      vrmL: t({ tr: 'VRM endüktansı (L)', en: 'VRM inductance (L)' }),
      area: t({ tr: 'Örtüşen düzlem alanı (A)', en: 'Overlapping plane area (A)' }),
      d: t({ tr: 'Dielektrik kalınlığı (d)', en: 'Dielectric thickness (d)' }),
      epsR: t({ tr: 'Dielektrik sabiti (εr)', en: 'Dielectric constant (εr)' }),
      eslComp: t({ tr: 'Komponent ESL', en: 'Component ESL' }),
      Lmount: t({ tr: 'Montaj endüktansı (L_mount)', en: 'Mounting inductance (L_mount)' }),
      Lvia: t({ tr: 'Via endüktansı (L_via)', en: 'Via inductance (L_via)' }),
      Lspread: t({
        tr: 'Düzlem yayılma endüktansı (L_yayılma)',
        en: 'Plane spreading inductance (L_spread)',
      }),
      capC: t({ tr: 'Kapasite', en: 'Capacitance' }),
      capESR: 'ESR',
      capESL: 'ESL',
      capN: t({ tr: 'Adet', en: 'Count' }),
      capRow: t({ tr: 'Kapasitör', en: 'Capacitor' }),
    },

    // Sonuç panelinde her zaman duran yöntem etiketi: hedef sabit ve yataydır.
    flatTargetNote: t({
      tr: 'Sabit yatay hedef empedans yaklaşımı — tek bir Z_hedef değeri tüm frekanslar için '
        + 'kullanılır. Frekansa bağlı hedef profil bu araçta YOK: gelişmiş tasarımda böyle bir '
        + 'profil kullanılabilir ama doğrulanmış bir denklemi olmadığı için uydurulmadı.',
      en: 'Fixed flat target impedance approximation — a single Z_target value is used for all '
        + 'frequencies. A frequency-dependent target profile is NOT in this tool: an advanced '
        + 'design may use such a profile, but it has no validated equation, so it was not '
        + 'invented.',
    }),

    // Eğri çizildiğinde eklenen ikinci etiket (spec §8.2.4).
    mountingNote: t({
      tr: 'PDN eğrisi bağlantı loop endüktansını İÇERMEZ; ESL_komponent + L_mount + L_via + '
        + 'L_yayılma toplamı ayrı değerlendirilir.',
      en: 'The PDN curve does NOT include the connection loop inductance; the sum '
        + 'ESL_component + L_mount + L_via + L_spread is evaluated separately.',
    }),

    bigResultLabel: t({ tr: 'Hedef empedans (Z_hedef)', en: 'Target impedance (Z_target)' }),

    sections: {
      plane: t({ tr: 'Düzlem kapasitesi', en: 'Plane capacitance' }),
      loop: t({ tr: 'Bağlı loop endüktansı', en: 'Connected loop inductance' }),
      curve: t({ tr: 'PDN eğrisi', en: 'PDN curve' }),
    },

    table: {
      Ztarget: t({ tr: 'Hedef empedans (Z_hedef)', en: 'Target impedance (Z_target)' }),
      deltaV: t({
        tr: 'İzin verilen gerilim değişimi (ΔV)',
        en: 'Allowed voltage excursion (ΔV)',
      }),
      deltaVSource: t({ tr: 'ΔV nereden geldi', en: 'Where ΔV came from' }),
      deltaVFromTol: t({ tr: 'ray × tolerans', en: 'rail × tolerance' }),
      deltaVDirect: t({ tr: 'doğrudan girildi', en: 'entered directly' }),
      deltaI: t({ tr: 'Ani yük değişimi (ΔI)', en: 'Load current step (ΔI)' }),
      Vrail: t({ tr: 'Ray gerilimi (V_ray)', en: 'Rail voltage (V_rail)' }),
      tolerance: t({ tr: 'Gerilim toleransı', en: 'Voltage tolerance' }),
      profile: t({
        tr: 'Frekansa bağlı hedef profil',
        en: 'Frequency-dependent target profile',
      }),
      profileNone: t({ tr: 'yok — sabit yatay hedef', en: 'none — fixed flat target' }),

      planeC: t({ tr: 'Düzlem kapasitesi (C_düzlem)', en: 'Plane capacitance (C_plane)' }),
      planeArea: t({ tr: 'Örtüşen alan (A)', en: 'Overlapping area (A)' }),
      planeD: t({ tr: 'Dielektrik kalınlığı (d)', en: 'Dielectric thickness (d)' }),
      planeEps: t({ tr: 'Dielektrik sabiti (εr)', en: 'Dielectric constant (εr)' }),
      fringing: t({ tr: 'Kenar saçılması dahil mi', en: 'Fringing included' }),

      loopTotal: t({ tr: 'Toplam (L_loop)', en: 'Total (L_loop)' }),
      loopComponent: t({ tr: 'Komponent ESL', en: 'Component ESL' }),
      loopMount: t({ tr: 'Montaj (L_mount)', en: 'Mounting (L_mount)' }),
      loopVia: t({ tr: 'Via (L_via)', en: 'Via (L_via)' }),
      loopSpread: t({ tr: 'Düzlem yayılması (L_yayılma)', en: 'Plane spreading (L_spread)' }),
      loopDominant: t({ tr: 'Baskın terim', en: 'Dominant term' }),

      fOp: t({ tr: 'Çalışma frekansı', en: 'Operating frequency' }),
      zAtFop: t({
        tr: '|Z_PDN| (çalışma frekansında)',
        en: '|Z_PDN| (at the operating frequency)',
      }),
      belowTarget: t({ tr: 'Hedefin altında mı', en: 'Below the target' }),
      capsOnly: t({ tr: 'Yalnız kapasitör ağı |Z_kap|', en: 'Capacitor network alone |Z_cap|' }),
      inductiveAtFop: t({
        tr: 'Bu frekansta ağ endüktif mi',
        en: 'Network inductive at this frequency',
      }),
      worstPoint: t({ tr: 'En kötü nokta (1 kHz – 1 GHz)', en: 'Worst point (1 kHz – 1 GHz)' }),
      exceedBands: t({
        tr: 'Hedefin aşıldığı bant sayısı',
        en: 'Number of bands above the target',
      }),
      pointsWord: t({ tr: 'nokta', en: 'points' }),
      loopIncluded: t({
        tr: 'Bağlı loop endüktansı dahil mi',
        en: 'Connected loop inductance included',
      }),
      losslessPlane: t({
        tr: 'Düzlem kayıpsız mı modellendi',
        en: 'Plane modelled lossless',
      }),
      noPlane: t({ tr: 'düzlem yok', en: 'no plane' }),
      capCount: t({ tr: 'Bankadaki toplam kapasitör', en: 'Total capacitors in the bank' }),
      pcsWord: t({ tr: 'adet', en: 'pcs' }),
    },

    formula: t({
      tr: `Hedef empedans:
  ΔV_izin = V_ray · T% / 100
  Z_hedef = ΔV_izin / ΔI

  Sabit YATAY hedef. Frekansa
  bağlı hedef profilin
  doğrulanmış denklemi yok
  → UYGULANMADI.

Düzlem kapasitesi — paralel plaka:
  C_düzlem = ε₀·εr·A / d
  kenar saçılması DENKLEMDE YOK

Toplam empedans — paralel ağ:
  Z_PDN(ω) = [ 1/Z_VRM
             + 1/Z_kap
             + jω·C_düzlem ]⁻¹

  Z_kap(ω) = [ Σ 1/Z_i(ω) ]⁻¹
  Z_i(ω) =
    ESR + j(ω·ESL − 1/(ω·C))

  Z_VRM = R + jωL
    VRM için doğrulanmış
    model YOK; değerler
    kullanıcıdan gelir.

  Düzlem yalnızca jωC — KAYIPSIZ.

Loop endüktansı — yalnızca toplam:
  L_loop = ESL_komponent + L_mount
         + L_via + L_yayılma

  Eğriye DAHİL DEĞİL, ayrı
  eklenir. Üç terimin denklemi
  bu araçta yok; değerler
  kullanıcıdan gelir.`,
      en: `Target impedance:
  ΔV_allowed = V_rail · T% / 100
  Z_target = ΔV_allowed / ΔI

  Fixed FLAT target. A frequency-
  dependent target profile has
  no validated equation
  → NOT IMPLEMENTED.

Plane capacitance — parallel plate:
  C_plane = ε₀·εr·A / d
  fringing NOT IN THE EQUATION

Total impedance — parallel network:
  Z_PDN(ω) = [ 1/Z_VRM
             + 1/Z_cap
             + jω·C_plane ]⁻¹

  Z_cap(ω) = [ Σ 1/Z_i(ω) ]⁻¹
  Z_i(ω) =
    ESR + j(ω·ESL − 1/(ω·C))

  Z_VRM = R + jωL
    NO validated VRM model;
    the values come from
    the user.

  Plane is jωC only — LOSSLESS.

Loop inductance — sum only:
  L_loop = ESL_component + L_mount
         + L_via + L_spread

  NOT part of the curve; added
  separately. No equation in
  this tool for the three
  terms; the values come from
  the user.`,
    }),

    detail: {
      flat: t({
        tr: 'Hedef empedans sabit yatay yaklaşımdan geliyor; hesap bunu açıkça bir yaklaşım '
          + 'olarak işaretler ve arayüz frekansa bağlı bir profil varmış gibi göstermez.',
        en: 'The target impedance comes from the fixed flat approximation; the calculation marks '
          + 'it explicitly as an approximation and the interface does not pretend a '
          + 'frequency-dependent profile exists.',
      }),
      deltaVSource: (fromTolerance) => t({
        tr: `ΔV kaynağı: ${fromTolerance ? 'ray gerilimi × tolerans yüzdesi' : 'doğrudan girilen değer'}.`,
        en: `ΔV source: ${fromTolerance ? 'rail voltage × tolerance percentage' : 'the directly entered value'}.`,
      }),
      plane: t({
        tr: 'Düzlem kapasitesi ε₀·εr·A/d ile hesaplandı; kenar saçılması denklemde yok ve '
          + 'sonuç bunu açıkça bildiriyor.',
        en: 'The plane capacitance was computed as ε₀·εr·A/d; fringing is not in the equation '
          + 'and the result states this explicitly.',
      }),
      sweep: (total) => t({
        tr: `Eğri ${total} noktada, 1 kHz – 1 GHz arasında logaritmik olarak örneklendi. `
          + 'Kapasitör ağı KOMPLEKS admitans toplamıyla birleştirildi; büyüklükler toplansaydı '
          + 'anti-rezonans tepeleri kaybolurdu.',
        en: `The curve was sampled at ${total} points, logarithmically between 1 kHz and 1 GHz. `
          + 'The capacitor network was combined by summing COMPLEX admittances; summing '
          + 'magnitudes would have erased the anti-resonance peaks.',
      }),
      vrm: (hasVrm) => t({
        tr: `VRM ${hasVrm ? 'R + jωL olarak modellendi' : 'girilmedi'}; bu modelin doğrulanmış `
          + 'bir tanımı yoktur ve değerleri kullanıcıdan gelir.',
        en: `The VRM was ${hasVrm ? 'modelled as R + jωL' : 'not entered'}; this model has no `
          + 'validated definition and its values come from the user.',
      }),
      loop: t({
        tr: 'Loop endüktansı yalnızca toplanır; L_mount, L_via ve L_yayılma için bu araçta '
          + 'denklem yok, değerler kullanıcıdan ya da alan çözücüden gelir.',
        en: 'The loop inductance is only summed; there is no equation in this tool for L_mount, '
          + 'L_via and L_spread — the values come from the user or a field solver.',
      }),
      noRounding: t({
        tr: 'Ara değerlerde yuvarlama yapılmaz; yalnızca gösterim yuvarlanır.',
        en: 'Intermediate values are never rounded; only the display is rounded.',
      }),
    },

    validity: [
      t({
        tr: 'Hedef empedans yalnızca bir yaklaşımdır: sabit ve yatay kabul edilir. Gerçek '
          + 'tasarımda yük akımının spektrumu düz değildir; frekansa bağlı bir hedef profil daha '
          + 'doğrudur ama doğrulanmış bir denklemi olmadığı için bu araçta yoktur.',
        en: 'The target impedance is only an approximation: it is taken as fixed and flat. In a '
          + 'real design the load current spectrum is not flat; a frequency-dependent target '
          + 'profile is more accurate, but it has no validated equation and is therefore not '
          + 'in this tool.',
      }),
      t({
        tr: 'Düzlem kapasitesi denkleminde kenar saçılması bulunmaz; gerçek kapasite hesaplanandan '
          + 'biraz büyüktür.',
        en: 'The plane capacitance equation contains no fringing; the real capacitance is '
          + 'slightly larger than computed.',
      }),
      t({
        tr: "Aynı satırdaki N kapasitör için ESL'in 1/N azaldığı varsayılır. Ortak via ya da ortak "
          + 'dar bir bağlantı varsa bu azalma gerçekleşmez ve gerçek empedans daha yüksek olur.',
        en: 'For N capacitors on the same row the ESL is assumed to fall by 1/N. With a shared '
          + 'via or a shared narrow connection this reduction does not happen and the real '
          + 'impedance is higher.',
      }),
      t({
        tr: 'VRM modelinin doğrulanmış bir tanımı yoktur. Burada kullanıcının girdiği değerlerle '
          + 'R + jωL alınmıştır; kontrol döngüsü bant genişliği, yük geçiş yanıtı ve anahtarlama '
          + 'frekansı modelde yoktur.',
        en: 'The VRM model has no validated definition. Here it is taken as R + jωL with '
          + 'user-entered values; control loop bandwidth, load transient response and switching '
          + 'frequency are not in the model.',
      }),
      t({
        tr: 'Düzlem kayıpsız (yalnızca jωC) modellenmiştir. Bu yüzden ürettiği anti-rezonans '
          + 'tepesi sönümsüzdür ve gerçek tepeden yüksektir; tepe yüksekliği üst sınır olarak '
          + 'okunmalıdır.',
        en: 'The plane is modelled lossless (jωC only). The anti-resonance peak it produces is '
          + 'therefore undamped and higher than the real peak; read the peak height as an '
          + 'upper bound.',
      }),
      t({
        tr: 'Bağlantı loop endüktansı PDN eğrisine dahil edilmez; sonuç bunu açıkça bildirir. '
          + 'Yüksek frekans davranışı için ayrıca değerlendirilmelidir.',
        en: 'The connection loop inductance is not included in the PDN curve; the result states '
          + 'this explicitly. It must be evaluated separately for high-frequency behaviour.',
      }),
      t({
        tr: 'Kapasitörlerin yerleşimi, düzlem yayılma direnci ve dielektrik kaybı modelde yoktur; '
          + 'hepsi gerçek eğriyi değiştirir.',
        en: 'Capacitor placement, plane spreading resistance and dielectric loss are not in the '
          + 'model; all of them change the real curve.',
      }),
      t({
        tr: 'Sonuçlar yaklaşıktır — kritik tasarımlarda üretici verisi ve ölçümle doğrulayın.',
        en: 'Results are approximate — verify against manufacturer data and measurement for '
          + 'critical designs.',
      }),
    ],

    chart: {
      x: t({ tr: 'Frekans (Hz)', en: 'Frequency (Hz)' }),
      y: t({ tr: '|Z| (Ω, log ölçek)', en: '|Z| (Ω, log scale)' }),
      caption: t({
        tr: 'Her iki eksen de logaritmiktir: |Z| ekseni log₁₀ değeriyle çizilir, eksen '
          + 'etiketleri gerçek empedansı gösterir. Böylece milliohm bölgesindeki davranış ile '
          + 'anti-rezonans tepesi aynı grafikte okunabilir; doğrusal ölçekte tepe ölçeği kendine '
          + 'çeker ve hedefin yakını eksenin dibinde düz çizgiye iner. Kesikli çizgi hedef '
          + 'empedans, işaretli nokta çalışma frekansıdır — çalışma frekansı taranan 1 kHz – '
          + '1 GHz aralığının dışındaysa işaretçi çizilmez. Sayısal okuma için veri tablosunu açın.',
        en: 'Both axes are logarithmic: the |Z| axis is drawn with its log₁₀ value and the axis '
          + 'labels show the real impedance. This lets the milliohm-region behaviour and the '
          + 'anti-resonance peak be read on the same chart; on a linear scale the peak pulls '
          + 'the scale towards itself and the neighbourhood of the target flattens into a line '
          + 'at the bottom of the axis. The dashed line is the target impedance and the marked '
          + 'point is the operating frequency — if the operating frequency is outside the swept '
          + '1 kHz – 1 GHz range no marker is drawn. Open the data table for numeric reading.',
      }),
      seriesPdn: '|Z_PDN|',
      seriesCaps: t({ tr: '|Z_kapasitörler|', en: '|Z_capacitors|' }),
      legendTarget: t({ tr: 'hedef empedans', en: 'target impedance' }),
      refTarget: (real) => t({
        tr: `hedef ${fmtRes(real, 3)}`,
        en: `target ${fmtRes(real, 3)}`,
      }),
      marker: t({ tr: 'çalışma frekansı', en: 'operating frequency' }),
    },

    // Çalışma frekansı sabit tarama aralığının dışında kaldığında sonuç
    // tablosunda "En kötü nokta" satırının yanına düşen not.
    fopOutsideNote: t({
      tr: 'çalışma frekansı bu aralığın dışında — grafikte işaretçi çizilmedi',
      en: 'the operating frequency is outside this range — no marker was drawn on the chart',
    }),

    chartEmpty: t({
      tr: 'PDN eğrisi çizilmedi. Eğri için soldaki "PDN eğrisini de çiz" seçimini açın; en az '
        + 'bir kapasitör satırı (kapasite, ESR > 0, ESL, adet), bir çalışma frekansı ve '
        + 'isteğe bağlı olarak VRM direnci/endüktansı ile düzlem verisi gerekir. Grafik, '
        + 'eğriyi hedef empedans çizgisiyle aynı eksende gösterir.',
      en: 'The PDN curve was not drawn. To draw it, turn on "Also draw the PDN curve" on the '
        + 'left; at least one capacitor row (capacitance, ESR > 0, ESL, count), an operating '
        + 'frequency, and optionally VRM resistance/inductance and plane data are required. '
        + 'The chart shows the curve on the same axis as the target impedance line.',
    }),

    schematic: {
      title: t({
        tr: 'Güç dağıtım ağı blok şeması',
        en: 'Power distribution network block diagram',
      }),
      caption: t({
        tr: 'VRM → düzlem çifti → kapasitör bankası → yük; hedef empedans yükün besleme '
          + 'düğümünde',
        en: 'VRM → plane pair → capacitor bank → load; the target impedance is at the load’s '
          + 'supply node',
      }),
      load: t({ tr: 'YÜK', en: 'LOAD' }),
      cPlane: t({ tr: 'C_düzlem', en: 'C_plane' }),
      caps: t({ tr: 'kapasitörler', en: 'capacitors' }),
      zTarget: t({ tr: 'Z_hedef', en: 'Z_target' }),
      vRail: t({ tr: 'V_ray', en: 'V_rail' }),
    },

    reasonText: (reason) => {
      if (reason === REASON_TARGET) {
        return t({
          tr: 'Hedef empedans için pozitif bir ani yük değişimi (ΔI) ve izin verilen gerilim değişimi gerekir. ΔV\'yi ya doğrudan girin ya da ray gerilimi ile tolerans yüzdesinden türetin.',
          en: 'The target impedance requires a positive load current step (ΔI) and an allowed voltage excursion. Either enter ΔV directly or derive it from the rail voltage and the tolerance percentage.',
        })
      }
      if (reason === REASON_ESR_ZERO) {
        return t({
          tr: 'Kapasitör satırlarından en az birinde ESR sıfır. Kayıpsız kapasitör bu modelde dejenere: kendi rezonans frekansında empedansı tam sıfır, anti-rezonans tepesi ise sonsuz çıkar ve sonuç fizik değil yuvarlama gürültüsü olur. Her satıra veri sayfasından okunan bir ESR girin (seramikte tipik olarak birkaç mΩ ile birkaç yüz mΩ arası).',
          en: 'At least one capacitor row has zero ESR. A lossless capacitor is degenerate in this model: its impedance is exactly zero at its own resonance frequency and the anti-resonance peak comes out infinite, so the result is rounding noise, not physics. Enter an ESR read from the datasheet for every row (typically a few mΩ to a few hundred mΩ for ceramics).',
        })
      }
      if (reason === REASON_ROWS) {
        return t({
          tr: 'Kapasitör bankası satırlarında eksik veya geçersiz değer var. Her satırda kapasite pozitif, ESR ve ESL negatif olmayan, adet en az 1 olmalı.',
          en: 'The capacitor bank rows contain missing or invalid values. In every row the capacitance must be positive, ESR and ESL non-negative, and the count at least 1.',
        })
      }
      if (reason === REASON_PLANE) {
        return t({
          tr: 'Düzlem kapasitesi için örtüşen alan ve dielektrik kalınlığı pozitif, dielektrik sabiti εr ≥ 1 olmalı.',
          en: 'For the plane capacitance the overlapping area and dielectric thickness must be positive and the dielectric constant εr ≥ 1.',
        })
      }
      if (reason === REASON_CURVE) {
        return t({
          tr: 'PDN eğrisi için çalışma frekansı pozitif olmalı ve en az bir bileşen bulunmalı: kapasitör bankası, VRM (direnç veya endüktans) ya da düzlem kapasitesi.',
          en: 'The PDN curve requires a positive operating frequency and at least one component: a capacitor bank, a VRM (resistance or inductance) or plane capacitance.',
        })
      }
      if (reason === REASON_LOOP) {
        return t({
          tr: 'Bağlantı loop endüktansı için dört terimden (komponent ESL, L_mount, L_via, L_yayılma) en az biri pozitif olmalı.',
          en: 'The connection loop inductance requires at least one of the four terms (component ESL, L_mount, L_via, L_spread) to be positive.',
        })
      }
      if (reason === REASON_INCOMPLETE) {
        return t({
          tr: 'Tüm zorunlu alanlara pozitif sayısal değer girin. Ondalık için nokta veya virgül kullanabilirsiniz (0.25 = 0,25).',
          en: 'Enter a positive numeric value in every required field. Use a point or a comma for decimals (0.25 = 0,25).',
        })
      }
      return t({ tr: 'Girdileri kontrol edin.', en: 'Check the inputs.' })
    },

    commentary: (r) => {
      if (!r.ok) return []
      const out = []

      // --- Hedef empedans ---
      out.push({
        level: 'ok',
        text: t({
          tr: `Hedef empedans Z_hedef = ${fmtRes(r.Ztarget, 4)}; izin verilen gerilim değişimi ${fmtVolt(r.deltaV)} ile ani yük değişimi ${fmtEng(r.deltaI, 'A', 4)} oranından geldi.`,
          en: `Target impedance Z_target = ${fmtRes(r.Ztarget, 4)}; it came from the ratio of the allowed voltage excursion ${fmtVolt(r.deltaV)} to the load current step ${fmtEng(r.deltaI, 'A', 4)}.`,
        }),
      })

      out.push({
        level: 'ok',
        text: r.fromTolerance
          ? t({
            tr: `ΔV ray geriliminden türetildi: ${fmtVolt(r.Vrail)} × ${pct(fmt(r.tolerancePct, 3))} = ${fmtVolt(r.deltaV)}.`,
            en: `ΔV was derived from the rail voltage: ${fmtVolt(r.Vrail)} × ${pct(fmt(r.tolerancePct, 3))} = ${fmtVolt(r.deltaV)}.`,
          })
          : t({
            tr: `ΔV doğrudan girildi (${fmtVolt(r.deltaV)}); ray gerilimi ve tolerans yüzdesi bu hesaba girmedi.`,
            en: `ΔV was entered directly (${fmtVolt(r.deltaV)}); the rail voltage and tolerance percentage did not enter this calculation.`,
          }),
      })

      out.push({
        level: 'warn',
        text: t({
          tr: 'Bu hedef SABİT YATAY bir yaklaşımdır: bütün frekanslarda tek bir Z_hedef geçerli sayılır. Gelişmiş tasarımda frekansa bağlı hedef profil kullanılabilir; böyle bir profilin doğrulanmış bir denklemi olmadığı için araçta uygulanmadı ve hafızadan tamamlanmadı.',
          en: 'This target is a FIXED FLAT approximation: a single Z_target is taken as valid at all frequencies. An advanced design may use a frequency-dependent target profile; since such a profile has no validated equation it was not implemented in this tool and was not filled in from memory.',
        }),
      })

      // --- Düzlem kapasitesi ---
      if (r.plane) {
        out.push({
          level: 'ok',
          text: t({
            tr: `Düzlem kapasitesi C_düzlem = ${fmtEng(r.plane.C, 'F', 4)} (A/d oranından). Bu kapasite düşük endüktanslıdır ve eğrinin yüksek frekans ucunda etkilidir.`,
            en: `Plane capacitance C_plane = ${fmtEng(r.plane.C, 'F', 4)} (from the A/d ratio). This capacitance has low inductance and is effective at the high-frequency end of the curve.`,
          }),
        })
        out.push({
          level: 'warn',
          text: t({
            tr: 'Düzlem kapasitesi kenar saçılmasını İÇERMEYEN paralel plaka denklemidir: yalnızca A/d oranını görür. Gerçek kapasite bu değerin biraz üzerindedir; küçük alan / kalın dielektrik durumunda fark büyür.',
            en: 'The plane capacitance is the parallel-plate equation WITHOUT fringing: it sees only the A/d ratio. The real capacitance is slightly above this value; the difference grows for a small area / thick dielectric.',
          }),
        })
      }

      // --- PDN eğrisi ---
      if (r.curve) {
        const c = r.curve
        const s = c.sweep

        out.push({
          level: r.belowTarget ? 'ok' : 'danger',
          text: r.belowTarget
            ? t({
              tr: `Çalışma frekansı ${fmtEng(c.fOp, 'Hz', 4)} noktasında |Z_PDN| = ${fmtRes(c.z.mag, 4)}, hedefin (${fmtRes(r.Ztarget, 4)}) altında.`,
              en: `At the operating frequency ${fmtEng(c.fOp, 'Hz', 4)} |Z_PDN| = ${fmtRes(c.z.mag, 4)}, below the target (${fmtRes(r.Ztarget, 4)}).`,
            })
            : t({
              tr: `Çalışma frekansı ${fmtEng(c.fOp, 'Hz', 4)} noktasında |Z_PDN| = ${fmtRes(c.z.mag, 4)} ve hedefi (${fmtRes(r.Ztarget, 4)}) AŞIYOR. Bu frekansta yük akımı sıçraması izin verilen ΔV'den büyük bir dalgalanma üretir.`,
              en: `At the operating frequency ${fmtEng(c.fOp, 'Hz', 4)} |Z_PDN| = ${fmtRes(c.z.mag, 4)} and it EXCEEDS the target (${fmtRes(r.Ztarget, 4)}). At this frequency a load current step produces a ripple larger than the allowed ΔV.`,
            }),
        })

        if (!s.worst) {
          out.push({
            level: 'warn',
            text: t({
              tr: 'Frekans taraması bu girdilerle sonuç üretmedi; eğri yalnızca çalışma frekansındaki tek nokta ile değerlendirildi.',
              en: 'The frequency sweep produced no result with these inputs; the curve was evaluated only at the single operating-frequency point.',
            }),
          })
        } else if (s.exceedCount === 0) {
          out.push({
            level: 'ok',
            text: t({
              tr: `Taranan 1 kHz – 1 GHz aralığının tamamında eğri hedefin altında kaldı; en yüksek nokta ${fmtRes(s.worst.mag, 4)} @ ${fmtEng(s.worst.f, 'Hz', 4)}.`,
              en: `Across the entire swept 1 kHz – 1 GHz range the curve stayed below the target; the highest point is ${fmtRes(s.worst.mag, 4)} @ ${fmtEng(s.worst.f, 'Hz', 4)}.`,
            }),
          })
        } else {
          const all = s.exceedCount === s.total
          const list = s.bands
            .map((b) => `${fmtEng(b.from, 'Hz', 3)} – ${fmtEng(b.to, 'Hz', 3)}`)
            .join('; ')
          out.push({
            level: all ? 'danger' : 'warn',
            text: all
              ? t({
                tr: `Eğri taranan 1 kHz – 1 GHz aralığının tamamında hedefin üzerinde. En kötü nokta ${fmtRes(s.worst.mag, 4)} @ ${fmtEng(s.worst.f, 'Hz', 4)} — hedefin ${fmt(s.worst.mag / r.Ztarget, 3)} katı.`,
                en: `The curve is above the target across the entire swept 1 kHz – 1 GHz range. The worst point is ${fmtRes(s.worst.mag, 4)} @ ${fmtEng(s.worst.f, 'Hz', 4)} — ${fmt(s.worst.mag / r.Ztarget, 3)}× the target.`,
              })
              : t({
                tr: `Eğri hedefi ${s.bands.length === 1 ? 'şu bantta' : `${fmt(s.bands.length, 2)} ayrı bantta`} aşıyor: ${list}. En kötü nokta ${fmtRes(s.worst.mag, 4)} @ ${fmtEng(s.worst.f, 'Hz', 4)} — hedefin ${fmt(s.worst.mag / r.Ztarget, 3)} katı. Bu bantlarda ani yük değişimi izin verilen ΔV'den büyük dalgalanma üretir.`,
                en: `The curve exceeds the target ${s.bands.length === 1 ? 'in this band' : `in ${fmt(s.bands.length, 2)} separate bands`}: ${list}. The worst point is ${fmtRes(s.worst.mag, 4)} @ ${fmtEng(s.worst.f, 'Hz', 4)} — ${fmt(s.worst.mag / r.Ztarget, 3)}× the target. In these bands a load current step produces a ripple larger than the allowed ΔV.`,
              }),
          })
        }

        if (c.z.inductive || s.anyInductive) {
          out.push({
            level: 'warn',
            text: t({
              tr: `ANTİ-REZONANS UYARISI: ağ ${c.z.inductive ? 'çalışma frekansında' : 'taranan aralığın bir bölümünde'} ENDÜKTİF davranıyor. Endüktif bölgede paralel kapasite eklemek empedansı DÜŞÜRMEZ; eklenen kapasite mevcut endüktansla bir paralel rezonans kurar ve tam o frekansta bir TEPE üretir. Sezgiye aykırıdır: "daha çok kapasitör her zaman daha iyi" doğru değildir. Çözüm kapasite eklemek değil, endüktansı (montaj, via, yayılma) küçültmek ya da tepeyi sönümleyecek ESR'li bir kapasitör seçmektir.`,
              en: `ANTI-RESONANCE WARNING: the network behaves INDUCTIVELY ${c.z.inductive ? 'at the operating frequency' : 'over part of the swept range'}. In the inductive region adding parallel capacitance does NOT lower the impedance; the added capacitance forms a parallel resonance with the existing inductance and produces a PEAK exactly at that frequency. It is counter-intuitive: "more capacitors is always better" is not true. The fix is not adding capacitance but shrinking the inductance (mounting, via, spreading) or picking a capacitor whose ESR damps the peak.`,
            }),
          })
        } else {
          out.push({
            level: 'ok',
            text: t({
              tr: 'Taranan aralıkta ağ endüktif bölgeye girmedi; bu aralıkta paralel kapasite eklemek empedansı beklendiği gibi düşürür.',
              en: 'The network did not enter the inductive region over the swept range; adding parallel capacitance in this range lowers the impedance as expected.',
            }),
          })
        }

        if (c.z.losslessPlane) {
          out.push({
            level: 'warn',
            text: t({
              tr: 'Düzlem KAYIPSIZ modellendi: eğriye yalnızca jωC terimi olarak girer. Kayıpsız düzlemin ürettiği anti-rezonans tepesi sönümsüzdür; gerçek düzlemde dielektrik ve bakır kaybı vardır ve gerçek tepe buradakinden ALÇAKTIR. Bu eğrideki tepe yüksekliğini üst sınır olarak okuyun.',
              en: 'The plane was modelled LOSSLESS: it enters the curve only as a jωC term. The anti-resonance peak of a lossless plane is undamped; a real plane has dielectric and copper loss and the real peak is LOWER than the one here. Read the peak height on this curve as an upper bound.',
            }),
          })
        }

        out.push({
          level: 'warn',
          text: t({
            tr: 'Eğri, kapasitörlerin bağlantı loop endüktansını İÇERMEZ; bu endüktans eğriye girmeyen, ayrı toplanan bir terimdir. Gerçek eğri, montaj ve via endüktansı yüzünden yüksek frekansta buradakinden daha yüksektir.',
            en: 'The curve does NOT include the capacitors’ connection loop inductance; that inductance is a separately summed term that never enters the curve. Because of mounting and via inductance the real curve is higher than this one at high frequency.',
          }),
        })

        if (c.shared) {
          out.push({
            level: 'warn',
            text: t({
              tr: `Bankada aynı satırda birden çok kapasitör var (toplam ${fmt(c.capCount, 4)} adet). Model, N adet kapasitörün ESL'ini 1/N ile ölçekler; bu yalnızca her kapasitörün BAĞIMSIZ ve eşit bir bağlantı yolu varsa geçerlidir. Ortak via veya ortak dar bir bağlantı varsa ESL 1/N azalmaz ve gerçek empedans daha yüksek çıkar.`,
              en: `The bank has more than one capacitor on the same row (${fmt(c.capCount, 4)} in total). The model scales the ESL of N capacitors by 1/N; this holds only if every capacitor has an INDEPENDENT and equal connection path. With a shared via or a shared narrow connection the ESL does not fall by 1/N and the real impedance comes out higher.`,
            }),
          })
        }

        out.push({
          level: 'warn',
          text: t({
            tr: 'VRM için doğrulanmış bir model YOK. Burada girilen değerlerle R + jωL alındı; ωL endüktif reaktansın tanımıdır, uydurulmuş bir VRM modeli değildir. Gerçek VRM kontrol döngüsünün bant genişliği bu basit modelde yoktur.',
            en: 'There is NO validated model for the VRM. Here R + jωL was taken with the entered values; ωL is the definition of inductive reactance, not an invented VRM model. The bandwidth of the real VRM control loop is not in this simple model.',
          }),
        })
      } else {
        out.push({
          level: 'ok',
          text: t({
            tr: 'PDN eğrisi çizilmedi; ekran yalnızca hedef empedansı veriyor. Hedefin karşılanıp karşılanmadığını görmek için VRM, kapasitör bankası ve düzlem verisiyle eğriyi açın; eğri hedef çizgisiyle aynı grafikte gösterilir.',
            en: 'The PDN curve was not drawn; the screen gives only the target impedance. To see whether the target is met, turn the curve on with VRM, capacitor bank and plane data; the curve is shown on the same chart as the target line.',
          }),
        })
      }

      // --- Bağlantı loop endüktansı ---
      if (r.loop) {
        out.push({
          level: 'ok',
          text: t({
            tr: `Bağlantı loop endüktansı toplamı L_loop = ${fmtEng(r.loop.total, 'H', 4)}; baskın terim ${loopTermLabel[r.dominant]}, payı ${pct(fmt(r.loop.shares[r.dominant] * 100, 3))}. Empedansı düşürmek için önce bu terime dokunun.`,
            en: `Connection loop inductance total L_loop = ${fmtEng(r.loop.total, 'H', 4)}; the dominant term is ${loopTermLabel[r.dominant]} with a ${pct(fmt(r.loop.shares[r.dominant] * 100, 3))} share. To lower the impedance, touch this term first.`,
          }),
        })
        out.push({
          level: 'warn',
          text: t({
            tr: 'Bu toplam PDN eğrisine DAHİL DEĞİLDİR ve ayrı değerlendirilmelidir. Loop endüktansı, kapasitörün veri sayfasındaki ESL değerinden bağımsız olarak yüksek frekansta empedansın gerçek tabanını belirler.',
            en: 'This sum is NOT included in the PDN curve and must be evaluated separately. Independently of the ESL value on the capacitor’s datasheet, the loop inductance sets the real high-frequency floor of the impedance.',
          }),
        })
        out.push({
          level: 'warn',
          text: t({
            tr: 'Dört terim yalnızca TOPLANIR; L_mount, L_via ve L_yayılma için bu araçta bir denklem YOK. Bu değerler kullanıcıdan ya da alan çözücüden gelir; araç bunları hesaplamaz, yalnızca toplar ve payları gösterir.',
            en: 'The four terms are only SUMMED; there is NO equation in this tool for L_mount, L_via and L_spread. These values come from the user or a field solver; the tool does not compute them, it only sums them and shows the shares.',
          }),
        })
      }

      return out
    },
  }
}
