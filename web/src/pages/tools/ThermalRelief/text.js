// Thermal relief ekranının kullanıcıya görünen metinleri — iki dilli.
//
// Ortak DFM metinleri `data/dfmText.js` içindedir ve burada tekrarlanmaz.

import { pick } from '../../../lib/i18n'
import { fmt, fmtEng } from '../../../lib/num'
import { commonText } from '../../../data/uiText'
import {
  CHECK_SPOKE_WIDTH, CHECK_THERMAL_GAP, CHECK_VOLTAGE_DROP, CHECK_POWER_LOSS,
  CHECK_CURRENT_DENSITY, CHECK_THERMAL_RESISTANCE, CHECK_SPOKE_OVERLAP,
  TR_WARN_SPOKE_OVERLAP, TR_WARN_UNBALANCED_SHARING, TR_WARN_SINGLE_SPOKE,
  ASSUMPTION_EQUAL_SHARING, ASSUMPTION_ONE_DIMENSIONAL,
  ASSUMPTION_SPOKE_LENGTH_FROM_GAP, ASSUMPTION_INDEPENDENT_HEATING,
  ASSUMPTION_GEOMETRIC_PRECHECK, ASSUMPTION_NO_FAB_PROFILE,
  TR_ERR_GEOMETRY, TR_ERR_NOT_INTEGER, TR_ERR_NO_SPOKES, TR_ERR_REQUIRED,
  SPOKE_UNIFORM, SPOKE_TAPER, SPOKE_CUSTOM,
} from '../../../lib/thermalRelief'
import {
  REASON_INCOMPLETE, REASON_ENGINE,
  METRIC_RESISTANCE, METRIC_VOLTAGE, METRIC_THERMAL, METRIC_DENSITY,
  SWEEP_WIDTH, SWEEP_COUNT, SWEEP_LENGTH, SWEEP_THICKNESS,
} from './model'

export function getText(lang) {
  const t = (dict) => pick(dict, lang)
  const { pct } = commonText(lang)

  const checkLabels = {
    [CHECK_SPOKE_WIDTH]: t({ tr: 'Spoke genişliği', en: 'Spoke width' }),
    [CHECK_THERMAL_GAP]: t({ tr: 'Thermal gap', en: 'Thermal gap' }),
    [CHECK_VOLTAGE_DROP]: t({ tr: 'Gerilim düşümü', en: 'Voltage drop' }),
    [CHECK_POWER_LOSS]: t({ tr: 'Güç kaybı', en: 'Power loss' }),
    [CHECK_CURRENT_DENSITY]: t({ tr: 'Akım yoğunluğu', en: 'Current density' }),
    [CHECK_THERMAL_RESISTANCE]: t({ tr: 'Spoke termal direnci', en: 'Spoke thermal resistance' }),
    [CHECK_SPOKE_OVERLAP]: t({ tr: 'Spoke örtüşme payı', en: 'Spoke overlap margin' }),
  }

  const warningText = {
    [TR_WARN_SPOKE_OVERLAP]: t({
      tr: 'İç spoke genişliği geometrik örtüşme sınırına ulaştı: bağlantı katı plane bağlantısına benzemeye başlar. Bu geometrik bir ön kontroldür, bakır polygon çözümü değildir.',
      en: 'The inner spoke width has reached the geometric overlap limit: the connection starts to resemble a solid plane connection. This is a geometric pre-check, not a copper polygon solve.',
    }),
    [TR_WARN_UNBALANCED_SHARING]: t({
      tr: 'Spokeler arasında akım paylaşımı dengesiz. En yüksek akımı taşıyan spoke belirleyicidir.',
      en: 'Current sharing between the spokes is unbalanced. The spoke carrying the most current is the deciding one.',
    }),
    [TR_WARN_SINGLE_SPOKE]: t({
      tr: 'Tek spoke seçildi. Hesap geçerlidir ama tek bağlantı hem elektriksel hem termal olarak tek noktaya bağımlıdır.',
      en: 'A single spoke was selected. The calculation is valid, but one connection makes both the electrical and thermal path depend on a single point.',
    }),
  }

  const assumptionText = {
    [ASSUMPTION_EQUAL_SHARING]: t({
      tr: 'Eşit geometrili spokeler eşit akım paylaşır.',
      en: 'Spokes with equal geometry share the current equally.',
    }),
    [ASSUMPTION_ONE_DIMENSIONAL]: t({
      tr: 'Termal direnç yalnızca spoke bakırının bir boyutlu iletimidir; sistemin toplam termal direnci değildir.',
      en: 'The thermal resistance is one-dimensional conduction through the spoke copper alone; it is not the system’s total thermal resistance.',
    }),
    [ASSUMPTION_SPOKE_LENGTH_FROM_GAP]: t({
      tr: 'Spoke uzunluğu girilmediği için ilk yaklaşım olarak thermal gap kullanıldı.',
      en: 'No spoke length was entered, so the thermal gap was used as a first approximation.',
    }),
    [ASSUMPTION_INDEPENDENT_HEATING]: t({
      tr: 'Her spoke bağımsız ısınıyor kabul edilir; komşu spokelerin birbirini ısıtması hesaba girmez.',
      en: 'Each spoke is taken to heat independently; mutual heating between neighbouring spokes is not considered.',
    }),
    [ASSUMPTION_GEOMETRIC_PRECHECK]: t({
      tr: 'Örtüşme ve çevre doluluk göstergeleri geometrik ön kontroldür, gerçek bakır çözümü değildir.',
      en: 'The overlap and perimeter coverage indicators are geometric pre-checks, not a real copper solve.',
    }),
    [ASSUMPTION_NO_FAB_PROFILE]: t({
      tr: 'Üretici yetenek profili seçilmedi; profile bağlı kontroller değerlendirilmedi.',
      en: 'No fabricator capability profile is selected; the checks that depend on it were not evaluated.',
    }),
  }

  return {
    backlink: t({ tr: '← PCB Üretim ve DFM', en: '← PCB Manufacturing and DFM' }),
    title: t({ tr: 'Thermal Relief', en: 'Thermal Relief' }),
    intro: t({
      tr: 'Pad ile düzlem arasındaki spoke bağlantısının elektriksel direncini, akım paylaşımını ve '
        + 'bir boyutlu termal iletimini hesaplar; geometrik örtüşme payını ön kontrol olarak gösterir.',
      en: 'Computes the electrical resistance, current sharing and one-dimensional thermal conduction of '
        + 'the spoke connection between a pad and a plane, and shows the geometric overlap margin as a pre-check.',
    }),

    spokeMode: {
      label: t({ tr: 'Spoke geometrisi', en: 'Spoke geometry' }),
      [SPOKE_UNIFORM]: t({ tr: 'Eşit genişlikli', en: 'Uniform width' }),
      [SPOKE_TAPER]: t({ tr: 'Doğrusal taper', en: 'Linear taper' }),
      [SPOKE_CUSTOM]: t({ tr: 'Özel spoke listesi', en: 'Custom spoke list' }),
    },

    fields: {
      current: { label: t({ tr: 'Toplam akım', en: 'Total current' }) },
      temperature: {
        label: t({ tr: 'Bakır sıcaklığı', en: 'Copper temperature' }),
        hint: t({
          tr: 'Bakır özdirenci bu sıcaklığa göre düzeltilir.',
          en: 'The copper resistivity is corrected to this temperature.',
        }),
      },
      copperThickness: { label: t({ tr: 'Bakır kalınlığı', en: 'Copper thickness' }) },
      spokeCount: {
        label: t({ tr: 'Spoke sayısı', en: 'Spoke count' }),
        hint: t({
          tr: 'Pozitif tam sayı. Yaygın aralık 2–8’dir ama motor her geçerli tam sayıyı işler.',
          en: 'A positive whole number. 2–8 is the common range, but the engine handles any valid whole number.',
        }),
      },
      spokeLength: {
        label: t({ tr: 'Spoke uzunluğu', en: 'Spoke length' }),
        hint: t({
          tr: 'Boş bırakılırsa thermal gap kullanılır ve bu varsayım sonuçta yazılır.',
          en: 'If left empty the thermal gap is used, and that assumption is stated in the result.',
        }),
      },
      innerWidth: { label: t({ tr: 'İç spoke genişliği', en: 'Inner spoke width' }) },
      outerWidth: { label: t({ tr: 'Dış spoke genişliği', en: 'Outer spoke width' }) },
      padDiameter: { label: t({ tr: 'Pad çapı', en: 'Pad diameter' }) },
      thermalGap: { label: t({ tr: 'Thermal gap', en: 'Thermal gap' }) },
      clearanceDiameter: {
        label: t({ tr: 'Plane açıklık çapı', en: 'Plane clearance diameter' }),
        hint: t({
          tr: 'Gap ile açıklık çapından yalnızca birini girmeniz yeter; diğeri türetilir.',
          en: 'Entering either the gap or the clearance diameter is enough; the other is derived.',
        }),
      },
      deltaT: {
        label: t({ tr: 'Sıcaklık farkı (ΔT)', en: 'Temperature difference (ΔT)' }),
        hint: t({
          tr: 'Girilirse bu farkta iletilebilecek yaklaşık ısı hesaplanır.',
          en: 'If entered, the approximate heat conducted at this difference is computed.',
        }),
      },
      k: {
        label: t({ tr: 'Bakır termal iletkenliği', en: 'Copper thermal conductivity' }),
        hint: t({
          tr: 'Literatür 385–400 W/(m·K) veriyor. Varsayılan alt uçtur (konservatif); iki uç arasındaki fark termal dirençte doğrudan görünür.',
          en: 'The literature gives 385–400 W/(m·K). The default is the lower end (conservative); the difference between the two ends shows directly in the thermal resistance.',
        }),
      },
      maxVoltageDrop: { label: t({ tr: 'İzin verilen gerilim düşümü', en: 'Allowed voltage drop' }) },
      maxPowerLoss: { label: t({ tr: 'İzin verilen güç kaybı', en: 'Allowed power loss' }) },
      maxCurrentDensity: { label: t({ tr: 'İzin verilen akım yoğunluğu', en: 'Allowed current density' }) },
      maxThermalResistance: { label: t({ tr: 'Hedef maksimum termal direnç', en: 'Target maximum thermal resistance' }) },
    },

    fieldLabels: {
      current: t({ tr: 'Toplam akım', en: 'Total current' }),
      temperature: t({ tr: 'Bakır sıcaklığı', en: 'Copper temperature' }),
      copperThickness: t({ tr: 'Bakır kalınlığı', en: 'Copper thickness' }),
      spokeCount: t({ tr: 'Spoke sayısı', en: 'Spoke count' }),
      spokeLength: t({ tr: 'Spoke uzunluğu', en: 'Spoke length' }),
      innerWidth: t({ tr: 'İç spoke genişliği', en: 'Inner spoke width' }),
      outerWidth: t({ tr: 'Dış spoke genişliği', en: 'Outer spoke width' }),
      padDiameter: t({ tr: 'Pad çapı', en: 'Pad diameter' }),
      thermalGap: t({ tr: 'Thermal gap', en: 'Thermal gap' }),
      clearanceDiameter: t({ tr: 'Plane açıklık çapı', en: 'Plane clearance diameter' }),
      deltaT: t({ tr: 'Sıcaklık farkı', en: 'Temperature difference' }),
      k: t({ tr: 'Bakır termal iletkenliği', en: 'Copper thermal conductivity' }),
      maxVoltageDrop: t({ tr: 'İzin verilen gerilim düşümü', en: 'Allowed voltage drop' }),
      maxPowerLoss: t({ tr: 'İzin verilen güç kaybı', en: 'Allowed power loss' }),
      maxCurrentDensity: t({ tr: 'İzin verilen akım yoğunluğu', en: 'Allowed current density' }),
      maxThermalResistance: t({ tr: 'Hedef maksimum termal direnç', en: 'Target maximum thermal resistance' }),
      warnPercent: t({ tr: 'Uyarı marjı', en: 'Warning margin' }),
      rowLabel: t({ tr: 'Spoke', en: 'Spoke' }),
    },

    countUnit: t({ tr: 'adet', en: 'pcs' }),

    customList: {
      label: t({ tr: 'Spoke listesi', en: 'Spoke list' }),
      add: t({ tr: 'Spoke ekle', en: 'Add spoke' }),
      rowLabel: t({ tr: 'Spoke', en: 'Spoke' }),
      hint: t({
        tr: 'Uzunluk ve genişlik mm, kalınlık µm olarak girilir. Boş bırakılan alan üstteki ortak değeri alır.',
        en: 'Lengths and widths are entered in mm, thickness in µm. An empty field takes the shared value above.',
      }),
      columns: {
        innerWidth: t({ tr: 'İç genişlik (mm)', en: 'Inner width (mm)' }),
        outerWidth: t({ tr: 'Dış genişlik (mm)', en: 'Outer width (mm)' }),
        length: t({ tr: 'Uzunluk (mm)', en: 'Length (mm)' }),
        thickness: t({ tr: 'Kalınlık (µm)', en: 'Thickness (µm)' }),
      },
    },

    bigResult: {
      label: t({ tr: 'Paralel eşdeğer direnç', en: 'Parallel equivalent resistance' }),
      drop: t({ tr: 'gerilim düşümü', en: 'voltage drop' }),
      thermal: t({ tr: 'spoke termal direnci', en: 'spoke thermal resistance' }),
    },

    table: {
      singleResistance: t({ tr: 'Tek spoke direnci', en: 'Single-spoke resistance' }),
      parallelResistance: t({ tr: 'Paralel eşdeğer direnç', en: 'Parallel equivalent resistance' }),
      spokeCurrent: t({ tr: 'Spoke başına akım', en: 'Current per spoke' }),
      maxSpokeCurrent: t({ tr: 'En yüksek spoke akımı', en: 'Highest spoke current' }),
      voltageDrop: t({ tr: 'Gerilim düşümü', en: 'Voltage drop' }),
      powerTotal: t({ tr: 'Toplam güç kaybı', en: 'Total power loss' }),
      powerCheck: t({ tr: 'Çapraz kontrol: I²·R_eq', en: 'Cross-check: I²·R_eq' }),
      totalArea: t({ tr: 'Toplam bakır kesiti', en: 'Total copper cross-section' }),
      averageDensity: t({ tr: 'Ortalama akım yoğunluğu', en: 'Average current density' }),
      maxDensity: t({ tr: 'Maksimum yerel akım yoğunluğu', en: 'Maximum local current density' }),
      singleThermal: t({ tr: 'Tek spoke termal direnci', en: 'Single-spoke thermal resistance' }),
      thermalResistance: t({ tr: 'Spoke termal direnci (paralel)', en: 'Spoke thermal resistance (parallel)' }),
      thermalConductance: t({ tr: 'Termal iletkenlik (G_th)', en: 'Thermal conductance (G_th)' }),
      heatFlow: t({ tr: 'Bu farkta iletilen yaklaşık ısı', en: 'Approximate heat conducted at this difference' }),
      clearanceDiameter: t({ tr: 'Plane açıklık çapı', en: 'Plane clearance diameter' }),
      thermalGap: t({ tr: 'Thermal gap', en: 'Thermal gap' }),
      spokeLength: t({ tr: 'Kullanılan spoke uzunluğu', en: 'Spoke length used' }),
      overlapLimit: t({ tr: 'Örtüşmesiz en büyük iç genişlik', en: 'Largest non-overlapping inner width' }),
      bridgeFraction: t({ tr: 'Çevre doluluk göstergesi', en: 'Perimeter coverage indicator' }),
      rho: t({ tr: 'Bakır özdirenci', en: 'Copper resistivity' }),
      k: t({ tr: 'Bakır termal iletkenliği (k)', en: 'Copper thermal conductivity (k)' }),
      notEntered: t({ tr: 'girilmedi', en: 'not entered' }),
    },

    spokeTable: {
      title: t({ tr: 'Spoke başına değerler', en: 'Per-spoke values' }),
      index: t({ tr: 'Spoke', en: 'Spoke' }),
      width: t({ tr: 'en dar genişlik', en: 'narrowest width' }),
      current: t({ tr: 'akım', en: 'current' }),
      power: t({ tr: 'güç', en: 'power' }),
      density: t({ tr: 'yoğunluk', en: 'density' }),
    },

    checkLabel: (id) => checkLabels[id] ?? id,
    warningText: (code) => warningText[code] ?? '',
    assumptionText: (code) => assumptionText[code] ?? '',

    formula: {
      title: t({ tr: 'Thermal relief bağıntıları', en: 'Thermal relief relations' }),
      body: t({
        tr: `ρ(T) = ρ_20·[1 + α·(T − 20)]
R_s = ρ(T)·L_s / (W_s·t)
R_s = ρ(T)·L / [t·(W_2 − W_1)]·ln(W_2 / W_1)
R_relief = ρ(T)·L_s / (N·W_s·t)
1/R_eq = Σ(1/R_i)     I_i = I·(1/R_i) / Σ(1/R_j)
V_düşüm = I·R_relief    P_toplam = I²·R_relief = Σ(I_i²·R_i)
A_toplam = N·W_s·t      J_s = I_s / (W_s·t)
R_th,s = L_s / (k_Cu·W_s·t)
R_th,relief = L_s / (k_Cu·N·W_s·t)
G_th = 1 / R_th        Q = ΔT / R_th
D_açıklık = D_pad + 2·G_thermal
W_örtüşme = D_pad·sin(π / N)
F_bridge = N·W_iç / (π·D_pad)`,
        en: `ρ(T) = ρ_20·[1 + α·(T − 20)]
R_s = ρ(T)·L_s / (W_s·t)
R_s = ρ(T)·L / [t·(W_2 − W_1)]·ln(W_2 / W_1)
R_relief = ρ(T)·L_s / (N·W_s·t)
1/R_eq = Σ(1/R_i)     I_i = I·(1/R_i) / Σ(1/R_j)
V_drop = I·R_relief    P_total = I²·R_relief = Σ(I_i²·R_i)
A_total = N·W_s·t      J_s = I_s / (W_s·t)
R_th,s = L_s / (k_Cu·W_s·t)
R_th,relief = L_s / (k_Cu·N·W_s·t)
G_th = 1 / R_th        Q = ΔT / R_th
D_clear = D_pad + 2·G_thermal
W_overlap = D_pad·sin(π / N)
F_bridge = N·W_inner / (π·D_pad)`,
      }),
    },

    detail: {
      constantsFromUnits: t({
        tr: 'Bakır özdirenci ve termal iletkenlik ortak sabit dosyasından gelir; araç dosyasında yeniden tanımlanmaz.',
        en: 'The copper resistivity and thermal conductivity come from the shared constants file; they are not redefined in the tool.',
      }),
      taperLimit: t({
        tr: 'Taper kapalı formu W₂ → W₁ limitinde 0/0 kararsızlığına düşer; genişlikler birbirine çok yakınsa doğrudan dikdörtgen bağıntı kullanılır ve sonuç eşikte sürekli kalır.',
        en: 'The taper closed form degenerates to 0/0 in the W₂ → W₁ limit; when the widths are very close the rectangular relation is used directly and the result stays continuous at the threshold.',
      }),
      widestIsWorst: t({
        tr: 'Taper spokede en yüksek yerel akım yoğunluğu en dar kesittedir; belirleyici olan odur.',
        en: 'In a tapered spoke the highest local current density is at the narrowest section; that is the deciding one.',
      }),
      notTotalArea: t({
        tr: 'Akım kapasitesi, N × W toplam genişliği tek geniş bir yol kabul edilerek hesaplanmaz; her spoke kendi en dar kesiti üzerinden değerlendirilir.',
        en: 'Current capacity is not computed by treating the total N × W width as one wide trace; each spoke is evaluated on its own narrowest section.',
      }),
      crossCheck: t({
        tr: 'Toplam güç iki ayrı yoldan hesaplanır (Σ I_i²R_i ve I²R_eq) ve ikisi de gösterilir; tutarsızlık görünür kalsın diye.',
        en: 'The total power is computed two separate ways (Σ I_i²R_i and I²R_eq) and both are shown, so any inconsistency stays visible.',
      }),
      noRounding: t({
        tr: 'Ara değerlerde yuvarlama yapılmaz; yuvarlama yalnızca ekrana yazarken uygulanır.',
        en: 'No rounding is applied to intermediate values; rounding happens only when writing to the screen.',
      }),
    },

    validity: [
      t({
        tr: 'Buradaki termal direnç yalnızca spoke bakırının bir boyutlu iletimidir. Pad içindeki ısı yayılımı, plane spreading direnci, via etkisi, lehim ve komponent termal direnci, konveksiyon, radyasyon ve PCB malzemesi üzerinden üç boyutlu yayılım kapsam dışıdır.',
        en: 'The thermal resistance here is one-dimensional conduction through the spoke copper alone. Heat spreading inside the pad, plane spreading resistance, via effects, solder and component thermal resistance, convection, radiation and three-dimensional spreading through the board material are all out of scope.',
      }),
      t({
        tr: 'Bu yüzden sonuç “sistemin toplam termal direnci” değildir ve tek başına bir junction sıcaklığı tahmini vermez.',
        en: 'For that reason the result is not the system’s total thermal resistance and does not on its own give a junction temperature estimate.',
      }),
      t({
        tr: 'Akım kapasitesi değerlendirmesi eşit akım paylaşımı ve bağımsız spoke ısınması varsayımına dayanan yaklaşık bir değerlendirmedir.',
        en: 'The current capacity evaluation is an approximate assessment resting on equal current sharing and independent spoke heating.',
      }),
      t({
        tr: 'Örtüşme ve çevre doluluk göstergeleri geometrik ön kontroldür; gerçek bakır polygon çözümü ya da lehimlenebilirlik ölçütü değildir.',
        en: 'The overlap and perimeter coverage indicators are geometric pre-checks; they are neither a real copper polygon solve nor a solderability criterion.',
      }),
      t({
        tr: 'Uygulama “lehimlenebilir”, “lehimlenemez” ya da “güvenlidir” gibi sınıflandırmalar üretmez. Elektriksel ve termal limitleri siz girersiniz; girmezseniz o konu değerlendirilmez.',
        en: 'The application produces no “solderable”, “not solderable” or “safe” classifications. You enter the electrical and thermal limits; without them that topic is not evaluated.',
      }),
    ],

    chart: {
      sweepLabel: t({ tr: 'Süpürülen değişken', en: 'Swept variable' }),
      metricLabel: t({ tr: 'Çizilecek ölçü', en: 'Metric to plot' }),
      metricHint: t({
        tr: 'Farklı birimdeki büyüklükler aynı eksene konmaz; her seferinde bir ölçü çizilir.',
        en: 'Quantities in different units are not put on one axis; one metric is plotted at a time.',
      }),
      sweeps: {
        [SWEEP_WIDTH]: t({ tr: 'Spoke genişliği', en: 'Spoke width' }),
        [SWEEP_COUNT]: t({ tr: 'Spoke sayısı', en: 'Spoke count' }),
        [SWEEP_LENGTH]: t({ tr: 'Spoke uzunluğu', en: 'Spoke length' }),
        [SWEEP_THICKNESS]: t({ tr: 'Bakır kalınlığı', en: 'Copper thickness' }),
      },
      metrics: {
        [METRIC_RESISTANCE]: t({ tr: 'Elektriksel direnç', en: 'Electrical resistance' }),
        [METRIC_VOLTAGE]: t({ tr: 'Gerilim düşümü', en: 'Voltage drop' }),
        [METRIC_THERMAL]: t({ tr: 'Termal direnç', en: 'Thermal resistance' }),
        [METRIC_DENSITY]: t({ tr: 'Akım yoğunluğu', en: 'Current density' }),
      },
      axis: {
        [SWEEP_WIDTH]: t({ tr: 'Spoke genişliği (mm)', en: 'Spoke width (mm)' }),
        [SWEEP_COUNT]: t({ tr: 'Spoke sayısı', en: 'Spoke count' }),
        [SWEEP_LENGTH]: t({ tr: 'Spoke uzunluğu (mm)', en: 'Spoke length (mm)' }),
        [SWEEP_THICKNESS]: t({ tr: 'Bakır kalınlığı (µm)', en: 'Copper thickness (µm)' }),
      },
      yAxis: {
        [METRIC_RESISTANCE]: t({ tr: 'Direnç (mΩ)', en: 'Resistance (mΩ)' }),
        [METRIC_VOLTAGE]: t({ tr: 'Gerilim düşümü (mV)', en: 'Voltage drop (mV)' }),
        [METRIC_THERMAL]: t({ tr: 'Termal direnç (K/W)', en: 'Thermal resistance (K/W)' }),
        [METRIC_DENSITY]: t({ tr: 'Akım yoğunluğu (A/mm²)', en: 'Current density (A/mm²)' }),
      },
      caption: t({
        tr: 'Seçilen değişken süpürülürken diğer bütün girdiler sabit tutulur.',
        en: 'While the selected variable is swept, every other input is held constant.',
      }),
    },

    schematic: {
      title: t({ tr: 'Thermal relief geometrisi', en: 'Thermal relief geometry' }),
      pad: t({ tr: 'pad', en: 'pad' }),
      plane: t({ tr: 'plane', en: 'plane' }),
      clearance: t({ tr: 'plane açıklığı', en: 'plane clearance' }),
      spoke: t({ tr: 'spoke', en: 'spoke' }),
      gap: t({ tr: 'thermal gap', en: 'thermal gap' }),
      width: t({ tr: 'spoke genişliği', en: 'spoke width' }),
      current: t({ tr: 'akım yönü', en: 'current direction' }),
      caption: t({
        tr: 'Spoke sayısı ve genişliği girilen değerlere göre çizilir; ölçü etiketleri gerçek değeri gösterir.',
        en: 'The spoke count and width are drawn from the values entered; the dimension labels show the real values.',
      }),
    },

    reasonText: (reason, detail, code, index) => {
      if (reason === REASON_INCOMPLETE) {
        return t({
          tr: `Hesap için gerekli alanlar eksik veya geçersiz: ${(detail ?? []).join(', ')}.`,
          en: `Fields required for the calculation are missing or invalid: ${(detail ?? []).join(', ')}.`,
        })
      }
      if (reason === REASON_ENGINE) {
        if (code === TR_ERR_GEOMETRY) {
          return t({
            tr: 'Plane açıklık çapı pad çapından büyük olmalıdır.',
            en: 'The plane clearance diameter must be larger than the pad diameter.',
          })
        }
        if (code === TR_ERR_NOT_INTEGER) {
          return t({
            tr: 'Spoke sayısı pozitif bir tam sayı olmalıdır.',
            en: 'The spoke count must be a positive whole number.',
          })
        }
        if (code === TR_ERR_NO_SPOKES) {
          return t({
            tr: 'Özel spoke listesi boş. En az bir spoke girin.',
            en: 'The custom spoke list is empty. Enter at least one spoke.',
          })
        }
        if (code === TR_ERR_REQUIRED) {
          return t({
            tr: 'Spoke uzunluğu ya da thermal gap değerlerinden en az biri gereklidir.',
            en: 'At least one of the spoke length or the thermal gap is required.',
          })
        }
        const row = index === undefined ? '' : ` (${index + 1}. spoke)`
        return t({
          tr: `Girilen geometri geçerli değil${row}.`,
          en: `The geometry entered is not valid${row}.`,
        })
      }
      return t({ tr: 'Sonuç üretilemedi.', en: 'No result could be produced.' })
    },

    commentary: (r) => {
      if (!r.ok) return []
      const out = []

      out.push({
        level: 'ok',
        text: t({
          tr: `${r.results.spokeCount} spoke paralelde ${fmtEng(r.results.parallelResistance, 'Ω', 4)} direnç veriyor; tek spoke ${fmtEng(r.results.singleResistance, 'Ω', 4)}.`,
          en: `${r.results.spokeCount} spokes in parallel give ${fmtEng(r.results.parallelResistance, 'Ω', 4)}; a single spoke is ${fmtEng(r.results.singleResistance, 'Ω', 4)}.`,
        }),
      })

      out.push({
        level: 'ok',
        text: t({
          tr: `Gerilim düşümü ${fmtEng(r.results.voltageDrop, 'V', 4)}, toplam güç kaybı ${fmtEng(r.results.powerTotal, 'W', 4)}.`,
          en: `The voltage drop is ${fmtEng(r.results.voltageDrop, 'V', 4)} and the total power loss ${fmtEng(r.results.powerTotal, 'W', 4)}.`,
        }),
      })

      out.push({
        level: 'ok',
        text: t({
          tr: `Spoke bakırının bir boyutlu termal direnci ${fmt(r.results.thermalResistance, 4)} K/W (k = ${fmt(r.results.k, 3)} W/(m·K)). Bu, sistemin toplam termal direnci değildir.`,
          en: `The one-dimensional thermal resistance of the spoke copper is ${fmt(r.results.thermalResistance, 4)} K/W (k = ${fmt(r.results.k, 3)} W/(m·K)). This is not the system’s total thermal resistance.`,
        }),
      })

      if (r.results.heatFlow !== null) {
        out.push({
          level: 'ok',
          text: t({
            tr: `${fmt(r.results.deltaT, 3)} °C fark altında bu spokelerden yaklaşık ${fmtEng(r.results.heatFlow, 'W', 4)} ısı iletilir.`,
            en: `Under a ${fmt(r.results.deltaT, 3)} °C difference these spokes conduct roughly ${fmtEng(r.results.heatFlow, 'W', 4)}.`,
          }),
        })
      }

      if (r.results.bridgeFraction !== null) {
        out.push({
          level: 'ok',
          text: t({
            tr: `Pad çevresinin yaklaşık ${pct(fmt(r.results.bridgeFraction * 100, 3))}’i spoke bakırıyla köprülenmiş görünüyor — gösterge, lehimlenebilirlik ölçütü değil.`,
            en: `About ${pct(fmt(r.results.bridgeFraction * 100, 3))} of the pad perimeter appears bridged by spoke copper — an indicator, not a solderability criterion.`,
          }),
        })
      }

      for (const w of r.warnings) {
        out.push({ level: 'warn', text: warningText[w.code] ?? '' })
      }
      return out.filter((n) => n.text !== '')
    },

    pct,
  }
}
