// Clearance, creepage ve padstack ekranının kullanıcıya görünen metinleri —
// iki dilli (tr/en).
//
// Hesap katmanı yalnızca kod ve sayı üretir; dile çeviri burada yapılır.
// Ekran `getText(lang)` çağırır ve çözülmüş metin nesnesini kullanır.
//
// Ortak DFM metinleri (profil paneli, kontrol tablosu başlıkları, özet
// başlıkları) `data/dfmText.js` içindedir ve burada tekrarlanmaz.

import { pick } from '../../../lib/i18n'
import { fmt } from '../../../lib/num'
import { commonText } from '../../../data/uiText'
import { SOURCE_FAB_PROFILE, SOURCE_STANDARD_PROFILE } from '../../../lib/dfmCheck'
import {
  CHECK_DRILL_MIN, CHECK_FINISHED_HOLE_MIN, CHECK_RING_NOMINAL, CHECK_RING_WORST,
  CHECK_ASPECT_RATIO, CHECK_PLANE_CLEARANCE, CHECK_MASK_WEB, CHECK_COPPER_GAP,
  CHECK_HOLE_GAP,
  WARN_WORST_RING_NEGATIVE, WARN_NOMINAL_OK_WORST_FAIL, WARN_MASK_WEB_NEGATIVE,
  WARN_COPPER_GAP_NEGATIVE,
  ASSUMPTION_PLATING_RADIAL, ASSUMPTION_TOLERANCE_ONE_SIDED,
  ASSUMPTION_WORST_CASE_STACKED, ASSUMPTION_EQUAL_NEIGHBOUR, ASSUMPTION_NO_FAB_PROFILE,
  ASPECT_BASIS_DRILL,
} from '../../../lib/padstack'
import {
  CHECK_CLEARANCE, CHECK_CREEPAGE,
  CC_WARN_NO_PROFILE, CC_WARN_NO_MATCHING_RULE, CC_WARN_RANGE_EXCEEDED,
  CC_WARN_NO_ALTITUDE_DATA, CC_WARN_ALTITUDE_DOUBLE_COUNT, CC_WARN_NO_CTI_MATCH,
  CC_WARN_ONLY_FAB_USER,
  ASSUMPTION_CONSERVATIVE_MAX, ASSUMPTION_NO_EXTRAPOLATION,
  ASSUMPTION_ALTITUDE_CLEARANCE_ONLY, ASSUMPTION_COATING_FROM_PROFILE,
  METHOD_TABLE_PROFILE, METHOD_FAB_USER_ONLY, METHOD_NO_LIMIT,
} from '../../../lib/clearanceCreepage'
import { REASON_INCOMPLETE, REASON_ENGINE, TAB_PADSTACK } from './model'

export function getText(lang) {
  const t = (dict) => pick(dict, lang)
  const { pct } = commonText(lang)

  const checkLabels = {
    [CHECK_CLEARANCE]: t({ tr: 'Clearance mesafesi', en: 'Clearance distance' }),
    [CHECK_CREEPAGE]: t({ tr: 'Creepage mesafesi', en: 'Creepage distance' }),
    [CHECK_DRILL_MIN]: t({ tr: 'Matkap çapı minimumu', en: 'Minimum drill diameter' }),
    [CHECK_FINISHED_HOLE_MIN]: t({ tr: 'Bitmiş delik minimumu', en: 'Minimum finished hole' }),
    [CHECK_RING_NOMINAL]: t({ tr: 'Nominal annular ring', en: 'Nominal annular ring' }),
    [CHECK_RING_WORST]: t({ tr: 'Worst-case annular ring', en: 'Worst-case annular ring' }),
    [CHECK_ASPECT_RATIO]: t({ tr: 'Aspect ratio', en: 'Aspect ratio' }),
    [CHECK_PLANE_CLEARANCE]: t({ tr: 'Plane açıklığı', en: 'Plane clearance' }),
    [CHECK_MASK_WEB]: t({ tr: 'Solder mask web', en: 'Solder mask web' }),
    [CHECK_COPPER_GAP]: t({ tr: 'Komşu bakır aralığı', en: 'Neighbouring copper gap' }),
    [CHECK_HOLE_GAP]: t({ tr: 'Delik kenar mesafesi', en: 'Hole edge spacing' }),
  }

  const warningText = {
    [WARN_WORST_RING_NEGATIVE]: t({
      tr: 'Worst-case annular ring negatif: toleranslar aynı yönde gerçekleşirse delik pad kenarını kırar.',
      en: 'The worst-case annular ring is negative: if the tolerances land in the same direction the hole breaks out of the pad.',
    }),
    [WARN_NOMINAL_OK_WORST_FAIL]: t({
      tr: 'Nominal ring sınırı sağlıyor ama worst-case ring sağlamıyor. Belirleyici olan worst-case değeridir.',
      en: 'The nominal ring meets the limit but the worst-case ring does not. The worst-case value is the deciding one.',
    }),
    [WARN_MASK_WEB_NEGATIVE]: t({
      tr: 'Mask açıklıkları üst üste geliyor. Bu tek başına elektriksel bir hata değildir; seçilen mask tanımını üreticinizle doğrulayın.',
      en: 'The mask openings overlap. This alone is not an electrical fault; confirm the chosen mask definition with your fabricator.',
    }),
    [WARN_COPPER_GAP_NEGATIVE]: t({
      tr: 'Komşu padler seçilen adımda üst üste biniyor.',
      en: 'The neighbouring pads overlap at the chosen pitch.',
    }),
    [CC_WARN_NO_PROFILE]: t({
      tr: 'Karar profili yüklü değil; tablo tabanlı uygunluk değerlendirilmedi.',
      en: 'No decision profile is loaded; table-based conformity has not been evaluated.',
    }),
    [CC_WARN_NO_MATCHING_RULE]: t({
      tr: 'Girilen koşullarla eşleşen kural bulunamadı. Tahmini bir mesafe üretilmedi.',
      en: 'No rule matches the conditions entered. No estimated distance was produced.',
    }),
    [CC_WARN_RANGE_EXCEEDED]: t({
      tr: 'Girilen rakım profilin kapsadığı bantların dışında. Son bandın katsayısı ileriye taşınmadı.',
      en: 'The altitude entered is outside the bands the profile covers. The last band’s factor was not carried forward.',
    }),
    [CC_WARN_NO_ALTITUDE_DATA]: t({
      tr: 'Rakım girildi ama profil bir rakım düzeltmesi tanımlamıyor; katsayı 1 kabul edildi.',
      en: 'An altitude was entered but the profile defines no altitude correction; the factor was taken as 1.',
    }),
    [CC_WARN_ALTITUDE_DOUBLE_COUNT]: t({
      tr: 'Eşleşen kural rakımı zaten kısıtlıyor ve ayrıca bir rakım katsayısı uygulandı — düzeltme iki kez sayılmış olabilir.',
      en: 'The matching rule already constrains altitude and an altitude factor was applied on top — the correction may be counted twice.',
    }),
    [CC_WARN_NO_CTI_MATCH]: t({
      tr: 'Girilen CTI değeri profildeki hiçbir malzeme grubu bandına düşmüyor; en yakın gruba yuvarlanmadı.',
      en: 'The CTI value entered falls into none of the profile’s material group bands; it was not rounded to the nearest group.',
    }),
    [CC_WARN_ONLY_FAB_USER]: t({
      tr: 'Gerekli mesafe yalnızca üretici ve kullanıcı kurallarından geldi.',
      en: 'The required distance comes from the fabricator and user rules alone.',
    }),
  }

  const assumptionText = {
    [ASSUMPTION_PLATING_RADIAL]: t({
      tr: 'Kaplama kalınlığı radyaldir; matkap çapına iki katı olarak eklenir.',
      en: 'The plating thickness is radial; it is added to the drill diameter twice over.',
    }),
    [ASSUMPTION_TOLERANCE_ONE_SIDED]: t({
      tr: 'Bütün tolerans alanları tek yönlü değerlerdir, toplam aralık değildir.',
      en: 'All tolerance fields are one-sided values, not total ranges.',
    }),
    [ASSUMPTION_WORST_CASE_STACKED]: t({
      tr: 'Worst-case ring, bütün toleransların aynı yönde gerçekleştiği konservatif senaryodur; istatistiksel bir toplam değildir.',
      en: 'The worst-case ring is the conservative scenario in which every tolerance lands in the same direction; it is not a statistical sum.',
    }),
    [ASSUMPTION_EQUAL_NEIGHBOUR]: t({
      tr: 'Komşu pad çapı girilmediği için eşit kabul edildi.',
      en: 'The neighbouring pad diameter was not entered, so it is taken as equal.',
    }),
    [ASSUMPTION_NO_FAB_PROFILE]: t({
      tr: 'Üretici yetenek profili seçilmedi; profile bağlı kontroller değerlendirilmedi.',
      en: 'No fabricator capability profile is selected; the checks that depend on it were not evaluated.',
    }),
    [ASSUMPTION_CONSERVATIVE_MAX]: t({
      tr: 'Birden çok kural eşleşirse en büyük mesafe seçilir.',
      en: 'When several rules match, the largest distance is selected.',
    }),
    [ASSUMPTION_NO_EXTRAPOLATION]: t({
      tr: 'Profilin kapsamadığı aralıkta dışdeğerleme yapılmaz.',
      en: 'No extrapolation is done outside the range the profile covers.',
    }),
    [ASSUMPTION_ALTITUDE_CLEARANCE_ONLY]: t({
      tr: 'Rakım katsayısı creepage değerine otomatik uygulanmaz.',
      en: 'The altitude factor is not applied to the creepage value automatically.',
    }),
    [ASSUMPTION_COATING_FROM_PROFILE]: t({
      tr: 'Kaplanmış yüzey için sabit bir çarpan kullanılmaz; etkisi profil kuralından gelir.',
      en: 'No fixed multiplier is used for a coated surface; its effect comes from the profile rule.',
    }),
  }

  const methodText = {
    [METHOD_TABLE_PROFILE]: t({
      tr: 'Kullanıcı tarafından yüklenen karar profilinden okunan tablo tabanlı sonuç.',
      en: 'Table-based result read from the decision profile loaded by the user.',
    }),
    [METHOD_FAB_USER_ONLY]: t({
      tr: 'Yalnızca üretici ve kullanıcı kuralı kontrolü — tablo tabanlı değerlendirme yapılmadı.',
      en: 'Fabricator and user rule check only — no table-based evaluation was performed.',
    }),
    [METHOD_NO_LIMIT]: t({
      tr: 'Karşılaştırılacak hiçbir sınır girilmedi.',
      en: 'No limit was entered to compare against.',
    }),
  }

  return {
    backlink: t({ tr: '← PCB Üretim ve DFM', en: '← PCB Manufacturing and DFM' }),
    title: t({ tr: 'Clearance, Creepage ve Padstack', en: 'Clearance, Creepage & Padstack' }),
    intro: t({
      tr: 'İletkenler arası hava ve yüzey mesafelerini yüklediğiniz karar profiline göre değerlendirir; '
        + 'padstack tarafında matkap, pad, antipad ve worst-case annular ring geometrisini hesaplar.',
      en: 'Evaluates conductor-to-conductor air and surface distances against the decision profile you load, '
        + 'and computes drill, pad, antipad and worst-case annular ring geometry on the padstack side.',
    }),

    tabs: {
      clearance: t({ tr: 'Clearance', en: 'Clearance' }),
      creepage: t({ tr: 'Creepage', en: 'Creepage' }),
      padstack: t({ tr: 'Padstack', en: 'Padstack' }),
    },

    modeAnalysis: t({ tr: 'Analiz — ringi bul', en: 'Analysis — find the ring' }),
    modeSynthesis: t({ tr: 'Sentez — padi bul', en: 'Synthesis — find the pad' }),

    holeType: {
      label: t({ tr: 'Delik türü', en: 'Hole type' }),
      pth: t({ tr: 'Kaplanmış (PTH)', en: 'Plated (PTH)' }),
      npth: t({ tr: 'Kaplanmamış (NPTH)', en: 'Non-plated (NPTH)' }),
    },

    aspectBasis: {
      label: t({ tr: 'Aspect ratio tanımı', en: 'Aspect ratio definition' }),
      drill: t({ tr: 'Kart kalınlığı / matkap çapı', en: 'Board thickness / drill diameter' }),
      finished: t({ tr: 'Kart kalınlığı / bitmiş delik', en: 'Board thickness / finished hole' }),
      hint: t({
        tr: 'Üreticiler iki farklı tanım kullanır; sonuçta hangisinin kullanıldığı yazılır.',
        en: 'Fabricators use two different definitions; the result states which one was used.',
      }),
    },

    fields: {
      workingVoltage: { label: t({ tr: 'RMS çalışma gerilimi', en: 'RMS working voltage' }) },
      peakVoltage: { label: t({ tr: 'Tepe gerilimi', en: 'Peak voltage' }) },
      impulseVoltage: { label: t({ tr: 'Darbe gerilimi', en: 'Impulse voltage' }) },
      altitude: {
        label: t({ tr: 'Rakım', en: 'Altitude' }),
        hint: t({
          tr: 'Düzeltme katsayısı yalnızca profilden gelir ve yalnızca clearance değerine uygulanır.',
          en: 'The correction factor comes from the profile only and applies to the clearance value only.',
        }),
      },
      pollutionDegree: {
        label: t({ tr: 'Kirlilik derecesi', en: 'Pollution degree' }),
        hint: t({
          tr: 'Seçenekler yüklediğiniz profildeki kurallardan gelir.',
          en: 'The options come from the rules in the profile you loaded.',
        }),
      },
      insulationType: { label: t({ tr: 'İzolasyon türü', en: 'Insulation type' }) },
      coating: { label: t({ tr: 'Yüzey kaplaması', en: 'Surface coating' }) },
      materialGroup: {
        label: t({ tr: 'Malzeme grubu', en: 'Material group' }),
        hint: t({
          tr: 'Seçmezseniz CTI değerinden profildeki bantlara göre türetilir.',
          en: 'If you do not choose one it is derived from the CTI value using the profile’s bands.',
        }),
      },
      cti: { label: t({ tr: 'CTI değeri', en: 'CTI value' }) },
      creepVoltage: { label: t({ tr: 'Çalışma gerilimi', en: 'Working voltage' }) },
      clearFab: { label: t({ tr: 'Üretici minimum clearance', en: 'Fabricator minimum clearance' }) },
      clearUser: { label: t({ tr: 'Kullanıcı minimum clearance', en: 'User minimum clearance' }) },
      clearActual: { label: t({ tr: 'Karttaki gerçek clearance', en: 'Actual clearance on the board' }) },
      creepFab: { label: t({ tr: 'Üretici minimum creepage', en: 'Fabricator minimum creepage' }) },
      creepUser: { label: t({ tr: 'Kullanıcı minimum creepage', en: 'User minimum creepage' }) },
      creepActual: { label: t({ tr: 'Karttaki gerçek creepage', en: 'Actual creepage on the board' }) },

      Dfinished: { label: t({ tr: 'Bitmiş delik çapı', en: 'Finished hole diameter' }) },
      tPlating: {
        label: t({ tr: 'Kaplama kalınlığı (radyal)', en: 'Plating thickness (radial)' }),
      },
      Aprocess: {
        label: t({ tr: 'Üretici proses payı', en: 'Fabricator process allowance' }),
        hint: t({
          tr: 'Üreticiye göre değişir; sabit bir değer varsayılmaz.',
          en: 'Varies by fabricator; no fixed value is assumed.',
        }),
      },
      targetRing: { label: t({ tr: 'Hedef annular ring', en: 'Target annular ring' }) },
      Ddrill: { label: t({ tr: 'Matkap çapı (nominal)', en: 'Drill diameter (nominal)' }) },
      Dpad: { label: t({ tr: 'Pad çapı (nominal)', en: 'Pad diameter (nominal)' }) },
      drillTolPlus: { label: t({ tr: 'Matkap toleransı (+)', en: 'Drill tolerance (+)' }) },
      drillTolMinus: { label: t({ tr: 'Matkap toleransı (−)', en: 'Drill tolerance (−)' }) },
      padTolPlus: { label: t({ tr: 'Pad çapı toleransı (+)', en: 'Pad diameter tolerance (+)' }) },
      padTolMinus: { label: t({ tr: 'Pad çapı toleransı (−)', en: 'Pad diameter tolerance (−)' }) },
      registrationTol: { label: t({ tr: 'Kayıt (registration) toleransı', en: 'Registration tolerance' }) },
      planeClearance: { label: t({ tr: 'Plane radyal açıklığı', en: 'Plane radial clearance' }) },
      maskExpansion: {
        label: t({ tr: 'Solder mask genişlemesi', en: 'Solder mask expansion' }),
        hint: t({
          tr: 'Mask ile tanımlı padde negatif girilebilir.',
          en: 'May be negative for a mask-defined pad.',
        }),
      },
      padPitch: { label: t({ tr: 'Komşu pad merkez mesafesi', en: 'Neighbouring pad centre spacing' }) },
      neighbourPad: {
        label: t({ tr: 'Komşu pad çapı', en: 'Neighbouring pad diameter' }),
        hint: t({ tr: 'Boş bırakılırsa eşit kabul edilir.', en: 'Taken as equal if left empty.' }),
      },
      holePitch: { label: t({ tr: 'Komşu delik merkez mesafesi', en: 'Neighbouring hole centre spacing' }) },
      neighbourDrill: { label: t({ tr: 'Komşu matkap çapı', en: 'Neighbouring drill diameter' }) },
      boardThickness: { label: t({ tr: 'Kart kalınlığı', en: 'Board thickness' }) },
    },

    // Hata mesajında alan adı olarak görünen etiketler; model.js'e verilir.
    fieldLabels: {
      workingVoltage: t({ tr: 'RMS çalışma gerilimi', en: 'RMS working voltage' }),
      peakVoltage: t({ tr: 'Tepe gerilimi', en: 'Peak voltage' }),
      impulseVoltage: t({ tr: 'Darbe gerilimi', en: 'Impulse voltage' }),
      altitude: t({ tr: 'Rakım', en: 'Altitude' }),
      clearFab: t({ tr: 'Üretici minimum clearance', en: 'Fabricator minimum clearance' }),
      clearUser: t({ tr: 'Kullanıcı minimum clearance', en: 'User minimum clearance' }),
      clearActual: t({ tr: 'Karttaki gerçek clearance', en: 'Actual clearance on the board' }),
      creepVoltage: t({ tr: 'Çalışma gerilimi', en: 'Working voltage' }),
      cti: t({ tr: 'CTI değeri', en: 'CTI value' }),
      creepFab: t({ tr: 'Üretici minimum creepage', en: 'Fabricator minimum creepage' }),
      creepUser: t({ tr: 'Kullanıcı minimum creepage', en: 'User minimum creepage' }),
      creepActual: t({ tr: 'Karttaki gerçek creepage', en: 'Actual creepage on the board' }),
      Dfinished: t({ tr: 'Bitmiş delik çapı', en: 'Finished hole diameter' }),
      tPlating: t({ tr: 'Kaplama kalınlığı', en: 'Plating thickness' }),
      Aprocess: t({ tr: 'Üretici proses payı', en: 'Fabricator process allowance' }),
      targetRing: t({ tr: 'Hedef annular ring', en: 'Target annular ring' }),
      Ddrill: t({ tr: 'Matkap çapı', en: 'Drill diameter' }),
      Dpad: t({ tr: 'Pad çapı', en: 'Pad diameter' }),
      drillTolPlus: t({ tr: 'Matkap toleransı (+)', en: 'Drill tolerance (+)' }),
      drillTolMinus: t({ tr: 'Matkap toleransı (−)', en: 'Drill tolerance (−)' }),
      padTolPlus: t({ tr: 'Pad çapı toleransı (+)', en: 'Pad diameter tolerance (+)' }),
      padTolMinus: t({ tr: 'Pad çapı toleransı (−)', en: 'Pad diameter tolerance (−)' }),
      registrationTol: t({ tr: 'Kayıt toleransı', en: 'Registration tolerance' }),
      planeClearance: t({ tr: 'Plane radyal açıklığı', en: 'Plane radial clearance' }),
      maskExpansion: t({ tr: 'Solder mask genişlemesi', en: 'Solder mask expansion' }),
      padPitch: t({ tr: 'Komşu pad merkez mesafesi', en: 'Neighbouring pad centre spacing' }),
      neighbourPad: t({ tr: 'Komşu pad çapı', en: 'Neighbouring pad diameter' }),
      holePitch: t({ tr: 'Komşu delik merkez mesafesi', en: 'Neighbouring hole centre spacing' }),
      neighbourDrill: t({ tr: 'Komşu matkap çapı', en: 'Neighbouring drill diameter' }),
      boardThickness: t({ tr: 'Kart kalınlığı', en: 'Board thickness' }),
      warnPercent: t({ tr: 'Uyarı marjı', en: 'Warning margin' }),
    },

    noneOption: t({ tr: '(seçilmedi)', en: '(not selected)' }),

    bigResult: {
      clearance: t({ tr: 'Gerekli clearance', en: 'Required clearance' }),
      creepage: t({ tr: 'Gerekli creepage', en: 'Required creepage' }),
      padstackSynthesis: t({ tr: 'Önerilen pad çapı', en: 'Recommended pad diameter' }),
      padstackAnalysis: t({ tr: 'Worst-case annular ring', en: 'Worst-case annular ring' }),
      noLimit: t({ tr: 'sınır girilmedi', en: 'no limit entered' }),
      deciding: t({ tr: 'belirleyici', en: 'deciding' }),
      drill: t({ tr: 'matkap', en: 'drill' }),
      ring: t({ tr: 'nominal ring', en: 'nominal ring' }),
    },

    table: {
      base: t({ tr: 'Profil temel mesafesi', en: 'Profile base distance' }),
      factor: t({ tr: 'Rakım düzeltme katsayısı', en: 'Altitude correction factor' }),
      corrected: t({ tr: 'Düzeltilmiş profil mesafesi', en: 'Corrected profile distance' }),
      fab: t({ tr: 'Üretici minimumu', en: 'Fabricator minimum' }),
      user: t({ tr: 'Kullanıcı minimumu', en: 'User minimum' }),
      required: t({ tr: 'Nihai gerekli mesafe', en: 'Final required distance' }),
      actual: t({ tr: 'Karttaki gerçek mesafe', en: 'Actual distance on the board' }),
      margin: t({ tr: 'Mutlak marj', en: 'Absolute margin' }),
      marginPct: t({ tr: 'Yüzdesel marj', en: 'Percent margin' }),
      deciding: t({ tr: 'Belirleyici kaynak', en: 'Deciding source' }),
      matched: t({ tr: 'Eşleşen kural sayısı', en: 'Matching rules' }),
      materialGroup: t({ tr: 'Malzeme grubu', en: 'Material group' }),

      Ddrill: t({ tr: 'Nominal matkap çapı', en: 'Nominal drill diameter' }),
      drillRange: t({ tr: 'Matkap tolerans aralığı', en: 'Drill tolerance range' }),
      Dfinished: t({ tr: 'Bitmiş delik çapı', en: 'Finished hole diameter' }),
      Dpad: t({ tr: 'Pad çapı', en: 'Pad diameter' }),
      padRange: t({ tr: 'Pad tolerans aralığı', en: 'Pad tolerance range' }),
      ringNominal: t({ tr: 'Nominal annular ring', en: 'Nominal annular ring' }),
      ringWorst: t({ tr: 'Worst-case annular ring', en: 'Worst-case annular ring' }),
      Dantipad: t({ tr: 'Antipad çapı', en: 'Antipad diameter' }),
      planeClearance: t({ tr: 'Plane açıklığı', en: 'Plane clearance' }),
      Dmask: t({ tr: 'Solder mask açıklığı', en: 'Solder mask opening' }),
      maskWeb: t({ tr: 'Solder mask web', en: 'Solder mask web' }),
      copperGap: t({ tr: 'Komşu bakır aralığı', en: 'Neighbouring copper gap' }),
      holeGap: t({ tr: 'Delik kenar mesafesi', en: 'Hole edge spacing' }),
      aspectRatio: t({ tr: 'Aspect ratio', en: 'Aspect ratio' }),
      notEntered: t({ tr: 'girilmedi', en: 'not entered' }),
    },

    checkLabel: (id) => checkLabels[id] ?? id,
    warningText: (code) => warningText[code] ?? '',
    assumptionText: (code) => assumptionText[code] ?? '',
    methodText: (code) => methodText[code] ?? '',

    formulas: {
      clearance: {
        title: t({ tr: 'Clearance kararı', en: 'Clearance decision' }),
        body: `S_profile,altitude = S_profile,base × k_altitude
S_required = max(S_profile,altitude, S_fab, S_user)
M_absolute = S_actual − S_required
M_percent = 100 × (S_actual − S_required) / S_required`,
      },
      creepage: {
        title: t({ tr: 'Creepage kararı', en: 'Creepage decision' }),
        body: `S_required = max(S_profile, S_fab, S_user)
M_absolute = S_actual − S_required
M_percent = 100 × (S_actual − S_required) / S_required`,
      },
      padstack: {
        title: t({ tr: 'Padstack geometrisi', en: 'Padstack geometry' }),
        body: `D_drill = D_finished + 2·t_plating + A_process
D_pad = D_drill + 2·A_R
A_R,nominal = (D_pad − D_drill) / 2
A_R,min = (D_pad,min − D_drill,max) / 2 − E_registration
D_antipad = D_pad + 2·C_plane
D_mask = D_pad + 2·E_mask
G_copper = P − (D_pad1 + D_pad2) / 2
W_mask,web = P − (D_mask1 + D_mask2) / 2
G_hole = P_hole − (D_drill1 + D_drill2) / 2
AR = T_board / D_drill`,
      },
    },

    detail: {
      toleranceOneSided: t({
        tr: 'Tolerans alanları tek yönlüdür: “+0.025 mm”, nominalin 0.025 mm üstüne çıkabilir demektir, toplam aralık 0.025 mm demek değildir.',
        en: 'The tolerance fields are one-sided: “+0.025 mm” means the value may rise 0.025 mm above nominal, not that the total range is 0.025 mm.',
      }),
      worstCaseUses: t({
        tr: 'Worst-case ring yalnızca pad eksi toleransını ve matkap artı toleransını kullanır; diğer iki yön ringi büyütür.',
        en: 'The worst-case ring uses only the pad minus tolerance and the drill plus tolerance; the other two directions enlarge the ring.',
      }),
      npthNote: t({
        tr: 'Kaplanmamış delikte kaplama payı hiç eklenmez; girilen kaplama değeri kullanılmaz.',
        en: 'No plating allowance is added for a non-plated hole; the plating value entered is not used.',
      }),
      aspectUsed: (label) => t({
        tr: `Aspect ratio ${label} tanımıyla hesaplandı.`,
        en: `The aspect ratio was computed with the ${label} definition.`,
      }),
      noRounding: t({
        tr: 'Ara değerlerde yuvarlama yapılmaz; yuvarlama yalnızca ekrana yazarken uygulanır.',
        en: 'No rounding is applied to intermediate values; rounding happens only when writing to the screen.',
      }),
      profileMm: t({
        tr: 'Profil zarfı mm ile yazılır, hesap SI (m) ile yapılır; dönüşüm tek noktadadır.',
        en: 'The profile envelope is written in mm and the computation runs in SI (m); the conversion happens at a single point.',
      }),
    },

    validity: [
      t({
        tr: 'Clearance ve creepage için sürekli, evrensel bir fiziksel denklem yoktur. Bu ekran yalnızca yüklediğiniz karar profilinden okur; profil yokken tablo tabanlı hiçbir uygunluk iddiası üretmez.',
        en: 'There is no continuous, universal physical equation for clearance and creepage. This screen only reads the decision profile you load; with no profile it makes no table-based conformity claim at all.',
      }),
      t({
        tr: 'Mesafe karar tabloları lisanslıdır ve uygulamaya gömülmemiştir. Profilin doğruluğu ve güncelliği sizin sorumluluğunuzdadır.',
        en: 'Distance decision tables are licensed and are not embedded in the application. The accuracy and currency of the profile are your responsibility.',
      }),
      t({
        tr: 'Padstack tarafı tam geometrik bağıntıdır: bakır aşındırma profili, delik konikliği, kaplama kalınlığı dağılımı ve panel üstü konum bağımlılığı modellenmez.',
        en: 'The padstack side is an exact geometric relation: copper etch profile, hole taper, plating thickness distribution and position dependence across the panel are not modelled.',
      }),
      t({
        tr: 'Worst-case toplam, bütün toleransların aynı yönde gerçekleştiği konservatif senaryodur. Gerçek üretimde toleranslar istatistiksel dağılır; bu ekran istatistiksel toplam vermez.',
        en: 'The worst-case stack is the conservative scenario in which every tolerance lands in the same direction. In real production tolerances are distributed statistically; this screen does not give a statistical sum.',
      }),
      t({
        tr: 'Bu ekran bir güvenlik onayı üretmez. Elektriksel güvenlik kararı, geçerli kaynaklar ve üreticinizle doğrulanmadan verilmemelidir.',
        en: 'This screen does not produce a safety approval. Electrical safety decisions should not be made without confirming them against the applicable sources and with your fabricator.',
      }),
    ],

    chart: {
      sweepLabel: t({ tr: 'Süpürülen değişken', en: 'Swept variable' }),
      altitude: t({ tr: 'Rakım', en: 'Altitude' }),
      voltage: t({ tr: 'Çalışma gerilimi', en: 'Working voltage' }),
      registration: t({ tr: 'Kayıt toleransı', en: 'Registration tolerance' }),
      drillTol: t({ tr: 'Matkap toleransı (+)', en: 'Drill tolerance (+)' }),
      xAltitude: t({ tr: 'Rakım (m)', en: 'Altitude (m)' }),
      xVoltage: t({ tr: 'Çalışma gerilimi (V)', en: 'Working voltage (V)' }),
      xTolerance: t({ tr: 'Tolerans (mm)', en: 'Tolerance (mm)' }),
      yDistance: t({ tr: 'Gerekli mesafe (mm)', en: 'Required distance (mm)' }),
      yRing: t({ tr: 'Worst-case annular ring (mm)', en: 'Worst-case annular ring (mm)' }),
      seriesDistance: t({ tr: 'Gerekli mesafe', en: 'Required distance' }),
      seriesRing: t({ tr: 'Worst-case ring', en: 'Worst-case ring' }),
      minLegend: t({ tr: 'Üretici minimumu', en: 'Fabricator minimum' }),
      refMin: (v) => t({ tr: `üretici minimumu ${v}`, en: `fabricator minimum ${v}` }),
      captionStep: t({
        tr: 'Karar profili basamaklıdır; eğri sürekli bir fiziksel bağıntı değil, tablo adımlarıdır. Profilin kapsamadığı aralıkta nokta üretilmez.',
        en: 'The decision profile is stepped; the curve shows table steps, not a continuous physical relation. No point is produced outside the range the profile covers.',
      }),
      captionRing: t({
        tr: 'Tolerans büyüdükçe worst-case annular ring marjının nasıl düştüğünü gösterir.',
        en: 'Shows how the worst-case annular ring margin falls as the tolerance grows.',
      }),
    },

    schematic: {
      clearanceTitle: t({ tr: 'Clearance ve creepage kesiti', en: 'Clearance and creepage cross-section' }),
      padstackTitle: t({ tr: 'Padstack kesiti', en: 'Padstack cross-section' }),
      conductor: t({ tr: 'iletken', en: 'conductor' }),
      clearancePath: t({ tr: 'clearance (hava)', en: 'clearance (air)' }),
      creepagePath: t({ tr: 'creepage (yüzey)', en: 'creepage (surface)' }),
      substrate: t({ tr: 'yalıtkan', en: 'insulator' }),
      hole: t({ tr: 'delik', en: 'hole' }),
      plating: t({ tr: 'kaplama', en: 'plating' }),
      pad: t({ tr: 'pad', en: 'pad' }),
      ring: t({ tr: 'annular ring', en: 'annular ring' }),
      antipad: t({ tr: 'antipad', en: 'antipad' }),
      mask: t({ tr: 'mask açıklığı', en: 'mask opening' }),
      caption: t({
        tr: 'Ölçüler girilen değerlere göre orantılı çizilir; etiketler gerçek değeri gösterir.',
        en: 'The drawing is scaled to the values entered; the labels show the real values.',
      }),
    },

    reasonText: (reason, detail) => {
      if (reason === REASON_INCOMPLETE) {
        return t({
          tr: `Hesap için gerekli alanlar eksik veya geçersiz: ${(detail ?? []).join(', ')}.`,
          en: `Fields required for the calculation are missing or invalid: ${(detail ?? []).join(', ')}.`,
        })
      }
      if (reason === REASON_ENGINE) {
        return t({
          tr: 'Girilen geometri fiziksel olarak mümkün değil. Pad çapı matkap çapından büyük olmalı ve mask açıklığı kapanmamalıdır.',
          en: 'The geometry entered is not physically possible. The pad diameter must exceed the drill diameter and the mask opening must not close.',
        })
      }
      return t({ tr: 'Sonuç üretilemedi.', en: 'No result could be produced.' })
    },

    commentary: (r, fmtLen) => {
      if (!r.ok) return []
      const out = []

      if (r.tab === TAB_PADSTACK) {
        out.push({
          level: r.results.ringWorst < 0 ? 'danger' : 'ok',
          text: t({
            tr: `Nominal annular ring ${fmtLen(r.results.ringNominal)}; worst-case ${fmtLen(r.results.ringWorst)}. Aradaki fark tolerans ve kayıt payından gelir.`,
            en: `The nominal annular ring is ${fmtLen(r.results.ringNominal)}; worst-case ${fmtLen(r.results.ringWorst)}. The difference comes from the tolerance and registration allowance.`,
          }),
        })
        if (r.results.aspectRatio !== null) {
          out.push({
            level: 'ok',
            text: t({
              tr: `Aspect ratio ${fmt(r.results.aspectRatio, 3)} — ${r.results.aspectBasis === ASPECT_BASIS_DRILL ? 'matkap çapı' : 'bitmiş delik'} tanımıyla.`,
              en: `Aspect ratio ${fmt(r.results.aspectRatio, 3)} — with the ${r.results.aspectBasis === ASPECT_BASIS_DRILL ? 'drill diameter' : 'finished hole'} definition.`,
            }),
          })
        }
        for (const w of r.warnings) {
          out.push({ level: 'warn', text: warningText[w.code] ?? '' })
        }
        return out.filter((n) => n.text !== '')
      }

      if (r.required === null) {
        out.push({
          level: 'unknown',
          text: t({
            tr: 'Karşılaştırılacak hiçbir sınır girilmedi; mesafe değerlendirmesi yapılamadı.',
            en: 'No limit was entered to compare against; the distance could not be evaluated.',
          }),
        })
      } else {
        out.push({
          level: 'ok',
          text: t({
            tr: `Gerekli mesafe ${fmtLen(r.required)}; bu değer ${r.decidingSource === SOURCE_STANDARD_PROFILE ? 'karar profilinden' : r.decidingSource === SOURCE_FAB_PROFILE ? 'üretici sınırından' : 'kullanıcı kuralından'} geldi.`,
            en: `The required distance is ${fmtLen(r.required)}; this value came from the ${r.decidingSource === SOURCE_STANDARD_PROFILE ? 'decision profile' : r.decidingSource === SOURCE_FAB_PROFILE ? 'fabricator limit' : 'user rule'}.`,
          }),
        })
      }

      if (r.actual !== null && r.required !== null) {
        const under = r.margin < 0
        out.push({
          level: under ? 'danger' : 'ok',
          text: t({
            tr: `Karttaki mesafe ${fmtLen(r.actual)}; marj ${fmtLen(r.margin)} (${pct(fmt(r.marginPercent, 3))}).`,
            en: `The distance on the board is ${fmtLen(r.actual)}; the margin is ${fmtLen(r.margin)} (${pct(fmt(r.marginPercent, 3))}).`,
          }),
        })
      }

      for (const w of r.warnings) {
        out.push({ level: 'warn', text: warningText[w.code] ?? '' })
      }
      return out.filter((n) => n.text !== '')
    },
  }
}
