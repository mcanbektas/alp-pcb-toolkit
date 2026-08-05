// Stack-up planlayıcı ekranının kullanıcıya görünen metinleri — iki dilli.
//
// Ortak DFM metinleri `data/dfmText.js` içindedir ve burada tekrarlanmaz.

import { pick } from '../../../lib/i18n'
import { fmt } from '../../../lib/num'
import { commonText } from '../../../data/uiText'
import {
  CHECK_LAYER_COUNT, CHECK_TOTAL_THICKNESS, CHECK_TOTAL_THICKNESS_MAX,
  CHECK_ASPECT_RATIO, CHECK_SYMMETRY, CHECK_COPPER_BALANCE, CHECK_REFERENCES,
  STACKUP_WARN_NO_REFERENCE, STACKUP_WARN_OUTER_DIELECTRIC,
  STACKUP_WARN_ODD_COPPER_SPLIT, STACKUP_WARN_NO_COVERAGE,
  ASSUMPTION_WORST_CASE_SAME_DIRECTION, ASSUMPTION_SYMMETRY_HEURISTIC,
  ASSUMPTION_COPPER_PROXY, ASSUMPTION_DK_WEIGHTED,
  ASSUMPTION_MIXED_PLANE_AS_REFERENCE, ASSUMPTION_NO_FAB_PROFILE,
  STACKUP_ERR_INVALID_ORDER, STACKUP_ERR_NON_POSITIVE, STACKUP_ERR_NEGATIVE,
  STACKUP_ERR_TOLERANCE_ORDER, STACKUP_ERR_EMPTY,
  LAYER_COPPER, LAYER_CORE, LAYER_PREPREG, LAYER_SOLDERMASK, LAYER_COATING, LAYER_ADHESIVE,
  ROLE_SIGNAL, ROLE_GROUND, ROLE_POWER, ROLE_MIXED_PLANE, ROLE_DIELECTRIC, ROLE_COATING,
  TOL_ABSOLUTE, TOL_PERCENT, TOL_MINMAX,
} from '../../../lib/stackup'
import { REASON_INCOMPLETE, REASON_ENGINE } from './model'

export function getText(lang) {
  const t = (dict) => pick(dict, lang)
  const { pct } = commonText(lang)

  const layerTypes = {
    [LAYER_COPPER]: t({ tr: 'Bakır', en: 'Copper' }),
    [LAYER_CORE]: t({ tr: 'Core', en: 'Core' }),
    [LAYER_PREPREG]: t({ tr: 'Prepreg', en: 'Prepreg' }),
    [LAYER_SOLDERMASK]: t({ tr: 'Solder mask', en: 'Solder mask' }),
    [LAYER_COATING]: t({ tr: 'Kaplama', en: 'Coating' }),
    [LAYER_ADHESIVE]: t({ tr: 'Yapıştırıcı', en: 'Adhesive' }),
  }

  const layerRoles = {
    [ROLE_SIGNAL]: t({ tr: 'Sinyal', en: 'Signal' }),
    [ROLE_GROUND]: t({ tr: 'Toprak', en: 'Ground' }),
    [ROLE_POWER]: t({ tr: 'Güç', en: 'Power' }),
    [ROLE_MIXED_PLANE]: t({ tr: 'Karışık düzlem', en: 'Mixed plane' }),
    [ROLE_DIELECTRIC]: t({ tr: 'Dielektrik', en: 'Dielectric' }),
    [ROLE_COATING]: t({ tr: 'Kaplama', en: 'Coating' }),
  }

  const tolModes = {
    [TOL_ABSOLUTE]: t({ tr: 'Mutlak', en: 'Absolute' }),
    [TOL_PERCENT]: t({ tr: 'Yüzde', en: 'Percent' }),
    [TOL_MINMAX]: t({ tr: 'Min/Max', en: 'Min/Max' }),
  }

  const checkLabels = {
    [CHECK_LAYER_COUNT]: t({ tr: 'Bakır katman sayısı', en: 'Copper layer count' }),
    [CHECK_TOTAL_THICKNESS]: t({ tr: 'Toplam kalınlık alt sınırı', en: 'Total thickness lower limit' }),
    [CHECK_TOTAL_THICKNESS_MAX]: t({ tr: 'Toplam kalınlık üst sınırı', en: 'Total thickness upper limit' }),
    [CHECK_ASPECT_RATIO]: t({ tr: 'PTH aspect ratio', en: 'PTH aspect ratio' }),
    [CHECK_SYMMETRY]: t({ tr: 'Katman simetrisi', en: 'Layer symmetry' }),
    [CHECK_COPPER_BALANCE]: t({ tr: 'Bakır dağılımı', en: 'Copper distribution' }),
    [CHECK_REFERENCES]: t({ tr: 'Sinyal katmanı referansları', en: 'Signal layer references' }),
  }

  const warningText = {
    [STACKUP_WARN_NO_REFERENCE]: t({
      tr: 'En az bir sinyal katmanının geçerli referans düzlemi yok. Araya giren bakır katman, o ikiliyi doğrudan referans çifti olmaktan çıkarır.',
      en: 'At least one signal layer has no valid reference plane. An intervening copper layer stops that pair from being a direct reference pair.',
    }),
    [STACKUP_WARN_OUTER_DIELECTRIC]: t({
      tr: 'Dizilimin dış yüzeyinde core ya da prepreg duruyor. Dizilim genelde bakır ya da yüzey kaplamasıyla biter.',
      en: 'A core or prepreg sits on the outer surface of the stack. A stack usually ends with copper or a surface finish.',
    }),
    [STACKUP_WARN_ODD_COPPER_SPLIT]: t({
      tr: 'Bakır katman sayısı tek; ortadaki katman iki yarıya da yazılmadı. Onu bir tarafa saymak göstergeyi sessizce kaydırırdı.',
      en: 'The copper layer count is odd; the middle layer was written to neither half. Counting it on one side would silently skew the indicator.',
    }),
    [STACKUP_WARN_NO_COVERAGE]: t({
      tr: 'Bakır doluluk yüzdesi girilmediği için dağılım göstergesi hesaplanmadı.',
      en: 'No copper coverage percentage was entered, so the distribution indicator was not computed.',
    }),
  }

  const assumptionText = {
    [ASSUMPTION_WORST_CASE_SAME_DIRECTION]: t({
      tr: 'Toplam uçlar, bütün toleransların aynı yönde gerçekleştiği konservatif senaryodur; istatistiksel bir toplam değildir.',
      en: 'The total bounds are the conservative scenario in which every tolerance lands in the same direction; not a statistical sum.',
    }),
    [ASSUMPTION_SYMMETRY_HEURISTIC]: t({
      tr: 'Simetri göstergesi geometrik bir ön kontroldür: presleme davranışını, reçine akışını ya da warpage miktarını temsil etmez.',
      en: 'The symmetry indicator is a geometric pre-check: it does not represent lamination behaviour, resin flow or warpage.',
    }),
    [ASSUMPTION_COPPER_PROXY]: t({
      tr: 'Bakır dağılımı göstergesi kalınlık × doluluk çarpımına dayanan göreli bir orandır; mekanik gerilme değildir.',
      en: 'The copper distribution indicator is a relative ratio from thickness × coverage; it is not mechanical stress.',
    }),
    [ASSUMPTION_DK_WEIGHTED]: t({
      tr: 'Kalınlık ağırlıklı dielektrik sabiti yalnızca kaba bir göstergedir; gerçek elektromanyetik etkin değer değildir.',
      en: 'The thickness-weighted dielectric constant is only a rough indicator; it is not the true electromagnetic effective value.',
    }),
    [ASSUMPTION_MIXED_PLANE_AS_REFERENCE]: t({
      tr: 'Karışık düzlem referans sayıldı. Bölünmüş bir düzlem dönüş yolunu kesebilir; bu araç bölünmeyi görmez.',
      en: 'A mixed plane was taken as a reference. A split plane can break the return path; this tool does not see splits.',
    }),
    [ASSUMPTION_NO_FAB_PROFILE]: t({
      tr: 'Üretici yetenek profili seçilmedi; profile bağlı kontroller değerlendirilmedi.',
      en: 'No fabricator capability profile is selected; the checks that depend on it were not evaluated.',
    }),
  }

  return {
    backlink: t({ tr: '← PCB Üretim ve DFM', en: '← PCB Manufacturing and DFM' }),
    title: t({ tr: 'Stack-Up Planlayıcı', en: 'Stack-Up Planner' }),
    intro: t({
      tr: 'Katman dizilimini üstten alta kurar; nominal ve worst-case toplam kalınlığı, sinyal '
        + 'katmanlarının referans mesafelerini ve geometrik simetri göstergelerini hesaplar.',
      en: 'Builds the layer stack from top to bottom and computes the nominal and worst-case total '
        + 'thickness, the reference distances of the signal layers and the geometric symmetry indicators.',
    }),

    layerTypeLabel: (type) => layerTypes[type] ?? type,
    layerRoleLabel: (role) => layerRoles[role] ?? role,
    tolModeLabel: (mode) => tolModes[mode] ?? mode,
    layerTypeOptions: Object.entries(layerTypes).map(([value, label]) => ({ value, label })),
    layerRoleOptions: Object.entries(layerRoles).map(([value, label]) => ({ value, label })),
    tolModeOptions: Object.entries(tolModes).map(([value, label]) => ({ value, label })),

    layers: {
      label: t({ tr: 'Katmanlar (üstten alta)', en: 'Layers (top to bottom)' }),
      add: t({ tr: 'Katman ekle', en: 'Add layer' }),
      rowLabel: t({ tr: 'Katman', en: 'Layer' }),
      hint: t({
        tr: 'Tolerans sütunları kipe göre anlam değiştirir: mutlak ve yüzde kipinde eksi/artı payı, '
          + 'min/max kipinde alt ve üst uçtur. Mutlak ve min/max kipinde birim satırın kendi birimidir; '
          + 'yüzde kipinde değer boyutsuzdur.',
        en: 'The tolerance columns change meaning with the mode: minus/plus allowance in absolute and '
          + 'percent mode, lower and upper bound in min/max mode. In absolute and min/max mode the unit is '
          + 'the row’s own unit; in percent mode the value is dimensionless.',
      }),
      columns: {
        type: t({ tr: 'Tür', en: 'Type' }),
        role: t({ tr: 'Rol', en: 'Role' }),
        name: t({ tr: 'Ad', en: 'Name' }),
        thickness: t({ tr: 'Kalınlık', en: 'Thickness' }),
        tolMode: t({ tr: 'Tolerans kipi', en: 'Tolerance mode' }),
        tolA: t({ tr: '− / min', en: '− / min' }),
        tolB: t({ tr: '+ / max', en: '+ / max' }),
        dk: t({ tr: 'Dk', en: 'Dk' }),
        coverage: t({ tr: 'Bakır %', en: 'Copper %' }),
      },
    },

    fields: {
      drillDiameter: {
        label: t({ tr: 'Aspect ratio için matkap çapı', en: 'Drill diameter for the aspect ratio' }),
        hint: t({
          tr: 'Boş bırakılırsa üretici profilindeki en küçük mekanik matkap kullanılır.',
          en: 'If left empty the smallest mechanical drill in the fabricator profile is used.',
        }),
      },
      symmetryLimit: {
        label: t({ tr: 'Simetri uyarı sınırı', en: 'Symmetry warning limit' }),
        hint: t({
          tr: 'Sizin sınırınız — uygulama gizli bir eşik taşımaz. Boş bırakılırsa kontrol değerlendirilmez.',
          en: 'Your own limit — the application carries no hidden threshold. Left empty, the check is not evaluated.',
        }),
      },
      copperBalanceLimit: {
        label: t({ tr: 'Bakır dağılımı uyarı sınırı', en: 'Copper distribution warning limit' }),
        hint: t({
          tr: 'Yalnızca bakır doluluk yüzdesi girilen katmanlarda hesaplanır.',
          en: 'Computed only when a copper coverage percentage is entered for the layers.',
        }),
      },
      saveName: { label: t({ tr: 'Kayıt adı', en: 'Record name' }) },
    },

    fieldLabels: {
      drillDiameter: t({ tr: 'Matkap çapı', en: 'Drill diameter' }),
      symmetryLimit: t({ tr: 'Simetri uyarı sınırı', en: 'Symmetry warning limit' }),
      copperBalanceLimit: t({ tr: 'Bakır dağılımı uyarı sınırı', en: 'Copper distribution warning limit' }),
      warnPercent: t({ tr: 'Uyarı marjı', en: 'Warning margin' }),
      thickness: t({ tr: 'Kalınlık', en: 'Thickness' }),
      tolA: t({ tr: 'Tolerans (− / min)', en: 'Tolerance (− / min)' }),
      tolB: t({ tr: 'Tolerans (+ / max)', en: 'Tolerance (+ / max)' }),
      dk: t({ tr: 'Dielektrik sabiti', en: 'Dielectric constant' }),
      coverage: t({ tr: 'Bakır doluluk yüzdesi', en: 'Copper coverage percentage' }),
      rowLabel: t({ tr: 'Katman', en: 'Layer' }),
    },

    bigResult: {
      label: t({ tr: 'Bitmiş toplam kalınlık', en: 'Finished total thickness' }),
      range: t({ tr: 'worst-case aralık', en: 'worst-case range' }),
      layers: t({ tr: 'bakır katman', en: 'copper layers' }),
    },

    table: {
      dielectricTotal: t({ tr: 'Dielektrik toplamı', en: 'Dielectric total' }),
      copperTotal: t({ tr: 'Bakır toplamı', en: 'Copper total' }),
      surfaceTotal: t({ tr: 'Kaplama ve mask toplamı', en: 'Coating and mask total' }),
      finishedTotal: t({ tr: 'Bitmiş toplam kalınlık', en: 'Finished total thickness' }),
      totalMin: t({ tr: 'Worst-case minimum toplam', en: 'Worst-case minimum total' }),
      totalNominal: t({ tr: 'Nominal toplam', en: 'Nominal total' }),
      totalMax: t({ tr: 'Worst-case maksimum toplam', en: 'Worst-case maximum total' }),
      copperCount: t({ tr: 'Bakır katman sayısı', en: 'Copper layer count' }),
      layerCount: t({ tr: 'Toplam katman sayısı', en: 'Total layer count' }),
      symmetryMax: t({ tr: 'En büyük simetri farkı', en: 'Largest symmetry difference' }),
      symmetryWeighted: t({ tr: 'Ağırlıklı simetri farkı', en: 'Weighted symmetry difference' }),
      copperBalance: t({ tr: 'Bakır dağılımı göstergesi', en: 'Copper distribution indicator' }),
      achievableAspect: t({ tr: 'Ulaşılabilir aspect ratio', en: 'Achievable aspect ratio' }),
      notEntered: t({ tr: 'girilmedi', en: 'not entered' }),
    },

    signals: {
      title: t({ tr: 'Sinyal katmanları ve referansları', en: 'Signal layers and their references' }),
      layer: t({ tr: 'Katman', en: 'Layer' }),
      outer: t({ tr: 'dış katman', en: 'outer layer' }),
      inner: t({ tr: 'iç katman', en: 'inner layer' }),
      H: t({ tr: 'H', en: 'H' }),
      H1: t({ tr: 'H1 (üst referansa)', en: 'H1 (to upper reference)' }),
      H2: t({ tr: 'H2 (alt referansa)', en: 'H2 (to lower reference)' }),
      dk: t({ tr: 'Dk (yaklaşık etkin)', en: 'Dk (approximate effective)' }),
      none: t({ tr: 'referans yok', en: 'no reference' }),
      copperThickness: t({ tr: 'Bakır kalınlığı', en: 'Copper thickness' }),
    },

    transfer: {
      title: t({ tr: 'Empedans aracına aktar', en: 'Transfer to the impedance tool' }),
      selectLabel: t({ tr: 'Aktarılacak sinyal katmanı', en: 'Signal layer to transfer' }),
      hint: t({
        tr: 'Aşağıdaki JSON kopyalanabilir. Değerler SI (metre) cinsindendir; kontrollü empedans '
          + 'ekranına elle girilirken birim seçicisini buna göre ayarlayın.',
        en: 'The JSON below can be copied. Values are in SI (metres); set the unit selector accordingly '
          + 'when entering them into the controlled impedance screen.',
      }),
      none: t({ tr: 'Aktarılacak sinyal katmanı yok.', en: 'There is no signal layer to transfer.' }),
    },

    records: {
      title: t({ tr: 'Kayıtlı stack-up’lar', en: 'Saved stack-ups' }),
      save: t({ tr: 'Kaydet', en: 'Save' }),
      load: t({ tr: 'Yükle', en: 'Load' }),
      remove: t({ tr: 'Sil', en: 'Delete' }),
      exportButton: t({ tr: 'Dışa aktar', en: 'Export' }),
      importPaste: t({ tr: 'Stack-up JSON metnini yapıştırın', en: 'Paste the stack-up JSON here' }),
      importButton: t({ tr: 'İçe aktar', en: 'Import' }),
      none: t({ tr: 'Kayıt yok', en: 'No records' }),
      select: t({ tr: 'Kayıt seç', en: 'Select a record' }),
      saved: t({ tr: 'Kaydedildi.', en: 'Saved.' }),
      loaded: t({ tr: 'Kayıt yüklendi.', en: 'The record was loaded.' }),
      nameRequired: t({ tr: 'Kaydetmek için bir ad girin.', en: 'Enter a name to save.' }),
      storageUnavailable: t({
        tr: 'Tarayıcı depolaması kapalı. Hesaplar çalışır ama kayıt saklanmaz.',
        en: 'Browser storage is unavailable. Calculations still work but records are not stored.',
      }),
      failed: t({ tr: 'Kayıt işlemi tamamlanamadı.', en: 'The record operation could not be completed.' }),
    },

    checkLabel: (id) => checkLabels[id] ?? id,
    warningText: (code) => warningText[code] ?? '',
    assumptionText: (code) => assumptionText[code] ?? '',

    formula: {
      title: t({ tr: 'Stack-up bağıntıları', en: 'Stack-up relations' }),
      body: t({
        tr: `T_dielektrik = ΣH_core + ΣH_prepreg
T_bitmiş = T_dielektrik + Σt_bakır + Σt_kaplama + Σt_mask
h_min = h_nominal − tol_minus       h_max = h_nominal + tol_plus
h_min = h_nominal·(1 − p_minus/100)  h_max = h_nominal·(1 + p_plus/100)
T_min = Σh_i,min    T_nominal = Σh_i,nominal    T_max = Σh_i,max
E_i = |h_i − h_ayna| / max((h_i + h_ayna)/2, ε)
E_simetri,ağırlıklı = Σ|h_i − h_ayna| / Σ((h_i + h_ayna)/2)
Dk_ağırlıklı = Σ(Dk_i·h_i) / Σh_i
M_üst = Σ(t_bakır,i·doluluk_i)     M_alt = Σ(t_bakır,j·doluluk_j)
B_bakır = 100·|M_üst − M_alt| / (M_üst + M_alt)
AR = T_bitmiş / D_matkap`,
        en: `T_dielectric = ΣH_core + ΣH_prepreg
T_finished = T_dielectric + Σt_copper + Σt_coating + Σt_mask
h_min = h_nominal − tol_minus       h_max = h_nominal + tol_plus
h_min = h_nominal·(1 − p_minus/100)  h_max = h_nominal·(1 + p_plus/100)
T_min = Σh_i,min    T_nominal = Σh_i,nominal    T_max = Σh_i,max
E_i = |h_i − h_mirror| / max((h_i + h_mirror)/2, ε)
E_sym,weighted = Σ|h_i − h_mirror| / Σ((h_i + h_mirror)/2)
Dk_weighted = Σ(Dk_i·h_i) / Σh_i
M_top = Σ(t_copper,i·coverage_i)     M_bottom = Σ(t_copper,j·coverage_j)
B_copper = 100·|M_top − M_bottom| / (M_top + M_bottom)
AR = T_finished / D_drill`,
      }),
    },

    detail: {
      twoTotals: t({
        tr: 'Üretici toplam kalınlığı bakır dâhil ya da hariç tarif edebildiği için iki toplam ayrı gösterilir.',
        en: 'Because a fabricator may define total thickness with or without copper, both totals are shown separately.',
      }),
      hNotTotal: t({
        tr: 'Empedans hesabındaki H, kartın toplam kalınlığı değildir: sinyal bakırı ile en yakın geçerli referans düzlemi arasındaki dielektrik mesafedir.',
        en: 'The H in an impedance calculation is not the board’s total thickness: it is the dielectric distance between the signal copper and the nearest valid reference plane.',
      }),
      interveningCopper: t({
        tr: 'Sinyal ile referans arasında başka bir bakır katman varsa o ikili doğrudan referans çifti sayılmaz.',
        en: 'If another copper layer sits between the signal and the reference, that pair is not treated as a direct reference pair.',
      }),
      striplineTwoDistances: t({
        tr: 'İç katmanda üst ve alt mesafe ayrı tutulur; tek bir sayıya indirgenmez.',
        en: 'For an inner layer the upper and lower distances are kept apart; they are not reduced to a single number.',
      }),
      dkApproximate: t({
        tr: 'Seri duran farklı malzemeler için kalınlık ağırlıklı Dk yalnızca yaklaşık bir göstergedir.',
        en: 'For different materials in series the thickness-weighted Dk is only an approximate indicator.',
      }),
      noRounding: t({
        tr: 'Ara değerlerde yuvarlama yapılmaz; yuvarlama yalnızca ekrana yazarken uygulanır.',
        en: 'No rounding is applied to intermediate values; rounding happens only when writing to the screen.',
      }),
    },

    validity: [
      t({
        tr: 'Bu araç bir presleme, reçine akışı ya da warpage benzetimi değildir. Simetri ve bakır dağılımı yalnızca geometrik ön kontrollerdir.',
        en: 'This tool is not a lamination, resin flow or warpage simulation. Symmetry and copper distribution are geometric pre-checks only.',
      }),
      t({
        tr: 'Uygulama sabit bir “şu yüzdenin üstü tehlikelidir” eşiği taşımaz. Simetri ve bakır dağılımı sınırlarını siz girersiniz; girilmezse o kontroller değerlendirilmez.',
        en: 'The application carries no fixed “above this percentage is dangerous” threshold. You enter the symmetry and copper distribution limits; without them those checks are not evaluated.',
      }),
      t({
        tr: 'Worst-case toplam, bütün toleransların aynı yönde gerçekleştiği konservatif senaryodur; gerçek üretimde toleranslar istatistiksel dağılır.',
        en: 'The worst-case total is the conservative scenario in which every tolerance lands in the same direction; in real production tolerances are distributed statistically.',
      }),
      t({
        tr: 'Referans bulma yalnızca dizilim sırasına bakar. Bölünmüş düzlem, kesikli bakır ve dönüş yolu süreksizlikleri görünmez.',
        en: 'Reference finding only looks at the stack order. Split planes, interrupted copper and return path discontinuities are invisible to it.',
      }),
      t({
        tr: 'Kalınlık ağırlıklı Dk gerçek elektromanyetik etkin dielektrik sabiti değildir; kontrollü empedans için alan çözücü ya da üretici ölçümü gerekir.',
        en: 'The thickness-weighted Dk is not the true electromagnetic effective dielectric constant; controlled impedance needs a field solver or fabricator measurement.',
      }),
    ],

    chart: {
      sweepLabel: t({ tr: 'Süpürülen değişken', en: 'Swept variable' }),
      layer: t({ tr: 'Katman kalınlığı', en: 'Layer thickness' }),
      tolerance: t({ tr: 'Tolerans yüzdesi', en: 'Tolerance percentage' }),
      layerSelect: t({ tr: 'Süpürülecek katman', en: 'Layer to sweep' }),
      xLayer: t({ tr: 'Katman kalınlığı (mm)', en: 'Layer thickness (mm)' }),
      xTolerance: t({ tr: 'Tolerans (%)', en: 'Tolerance (%)' }),
      yTotal: t({ tr: 'Toplam kart kalınlığı (mm)', en: 'Total board thickness (mm)' }),
      seriesNominal: t({ tr: 'Nominal toplam', en: 'Nominal total' }),
      seriesMin: t({ tr: 'Worst-case minimum', en: 'Worst-case minimum' }),
      seriesMax: t({ tr: 'Worst-case maksimum', en: 'Worst-case maximum' }),
      captionLayer: t({
        tr: 'Seçilen katmanın kalınlığı değiştikçe toplam bitmiş kalınlık.',
        en: 'The finished total thickness as the selected layer’s thickness changes.',
      }),
      captionTolerance: t({
        tr: 'Bütün katmanlara aynı yüzdesel tolerans uygulandığında worst-case minimum ve maksimum toplam.',
        en: 'The worst-case minimum and maximum totals when the same percentage tolerance is applied to every layer.',
      }),
    },

    schematic: {
      title: t({ tr: 'Stack-up kesiti', en: 'Stack-up cross-section' }),
      total: t({ tr: 'toplam', en: 'total' }),
      // Adı girilmemiş katman kendi türüyle etiketlenir; SVG içinde çıplak
      // dize bulunmasın diye çözücü buradan geçirilir.
      typeLabel: (type) => layerTypes[type] ?? type,
      hLabel: t({ tr: 'H', en: 'H' }),
      h1Label: t({ tr: 'H1', en: 'H1' }),
      h2Label: t({ tr: 'H2', en: 'H2' }),
      caption: t({
        tr: 'Katmanlar üstten alta çizilir. Çok ince katmanlar görünür kalsın diye asgari bir çizim '
          + 'yüksekliği uygulanır; ölçü etiketleri gerçek değeri gösterir.',
        en: 'Layers are drawn from top to bottom. A minimum drawing height keeps very thin layers visible; '
          + 'the dimension labels show the real values.',
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
        const row = index === undefined ? '' : ` (${index + 1}. ${pick({ tr: 'katman', en: 'layer' }, lang)})`
        if (code === STACKUP_ERR_INVALID_ORDER) {
          return t({
            tr: `İki bakır katman arada dielektrik olmadan arka arkaya duramaz${row}.`,
            en: `Two copper layers cannot sit back to back without a dielectric between them${row}.`,
          })
        }
        if (code === STACKUP_ERR_NON_POSITIVE) {
          return t({
            tr: `Katman kalınlığı sıfır ya da negatif olamaz${row}.`,
            en: `A layer thickness cannot be zero or negative${row}.`,
          })
        }
        if (code === STACKUP_ERR_NEGATIVE) {
          return t({
            tr: `Tolerans değeri geçersiz: eksi tolerans nominal kalınlığı aşamaz${row}.`,
            en: `The tolerance value is not valid: the minus tolerance cannot exceed the nominal thickness${row}.`,
          })
        }
        if (code === STACKUP_ERR_TOLERANCE_ORDER) {
          return t({
            tr: `Alt uç üst uçtan büyük olamaz${row}.`,
            en: `The lower bound cannot exceed the upper bound${row}.`,
          })
        }
        if (code === STACKUP_ERR_EMPTY) {
          return t({ tr: 'Dizilimde hiç katman yok.', en: 'The stack has no layers.' })
        }
        return t({
          tr: `Dizilim geçerli değil${row}.`,
          en: `The stack is not valid${row}.`,
        })
      }
      return t({ tr: 'Sonuç üretilemedi.', en: 'No result could be produced.' })
    },

    commentary: (r, fmtLen) => {
      if (!r.ok) return []
      const out = []

      out.push({
        level: 'ok',
        text: t({
          tr: `Bitmiş toplam kalınlık ${fmtLen(r.results.finishedTotal)}; bunun ${fmtLen(r.results.dielectricTotal)} kadarı dielektrik, ${fmtLen(r.results.copperTotal)} kadarı bakır.`,
          en: `The finished total thickness is ${fmtLen(r.results.finishedTotal)}, of which ${fmtLen(r.results.dielectricTotal)} is dielectric and ${fmtLen(r.results.copperTotal)} copper.`,
        }),
      })

      if (r.results.totalMin !== r.results.totalMax) {
        out.push({
          level: 'ok',
          text: t({
            tr: `Worst-case aralık ${fmtLen(r.results.totalMin)} … ${fmtLen(r.results.totalMax)}; bütün toleransların aynı yönde gerçekleştiği senaryodur.`,
            en: `The worst-case range is ${fmtLen(r.results.totalMin)} … ${fmtLen(r.results.totalMax)}; the scenario in which every tolerance lands in the same direction.`,
          }),
        })
      }

      out.push({
        level: r.results.symmetryMax > 0 ? 'warn' : 'ok',
        text: t({
          tr: `En büyük simetri farkı ${pct(fmt(r.results.symmetryMax * 100, 3))} — geometrik ön kontroldür, warpage tahmini değildir.`,
          en: `The largest symmetry difference is ${pct(fmt(r.results.symmetryMax * 100, 3))} — a geometric pre-check, not a warpage prediction.`,
        }),
      })

      if (r.results.copperBalance !== null) {
        out.push({
          level: 'ok',
          text: t({
            tr: `Bakır dağılımı göstergesi ${pct(fmt(r.results.copperBalance, 3))}.`,
            en: `The copper distribution indicator is ${pct(fmt(r.results.copperBalance, 3))}.`,
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
