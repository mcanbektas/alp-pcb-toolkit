// Kompleks sayı dönüştürücü ekranının kullanıcıya görünen metinleri —
// iki dilli (tr/en).
//
// Hesap katmanı yalnızca kod ve sayı üretir (REASON_*, KIND_*); dile çeviri
// burada yapılır. Ekran `getText(lang)` çağırır ve çözülmüş metin nesnesini
// kullanır; koşullu metin üreten yerler (yorum, hata nedeni, geçerlilik notu)
// fonksiyon olarak döner ki mantık tek kopya kalsın, yalnızca dizeler dile
// göre seçilsin.

import { fmt, fmtOhm } from '../../../lib/num'
import { pick } from '../../../lib/i18n'
import { KIND_INDUCTIVE, KIND_CAPACITIVE, KIND_RESISTIVE } from '../../../lib/convertComplex'
import {
  MODE_RECT, MODE_POLAR, SWEEP_MAG, SWEEP_PHASE,
  REASON_UNDEFINED_PHASE, REASON_NEGATIVE_MAGNITUDE, REASON_INVALID,
  PHASE_LIMIT_DEG, PHASE_LIMIT_RAD, PHASE_LIMIT_TURNS,
} from './model'

export function getText(lang) {
  const t = (dict) => pick(dict, lang)

  // Teknik detayda da kullanıldığı için önce ayrı tutulur.
  const modeLabel = {
    [MODE_RECT]: t({ tr: 'Dikdörtgensel → polar', en: 'Rectangular → polar' }),
    [MODE_POLAR]: t({ tr: 'Polar → dikdörtgensel', en: 'Polar → rectangular' }),
  }

  return {
    backlink: t({
      tr: '← Dönüştürücüler',
      en: '← Converters',
    }),
    title: t({ tr: 'Kompleks Sayı Dönüştürücü', en: 'Complex Number Converter' }),
    intro: t({
      tr: 'Kompleks sayıyı dikdörtgensel (R + jX) ve polar (|Z| ∠ φ) gösterimler arasında çevirir; '
        + 'faz açısını hem derece hem radyan verir, empedans bağlamında reaktansın endüktif mi '
        + 'kapasitif mi olduğunu ve vektörün hangi çeyrekte durduğunu birlikte gösterir.',
      en: 'Converts a complex number between the rectangular (R + jX) and polar (|Z| ∠ φ) '
        + 'representations; it gives the phase angle in both degrees and radians and shows, in an '
        + 'impedance context, whether the reactance is inductive or capacitive and which quadrant '
        + 'the vector lies in.',
    }),

    modeLabel,

    kindLabel: {
      [KIND_INDUCTIVE]: t({ tr: 'endüktif', en: 'inductive' }),
      [KIND_CAPACITIVE]: t({ tr: 'kapasitif', en: 'capacitive' }),
      [KIND_RESISTIVE]: t({ tr: 'saf dirençli', en: 'purely resistive' }),
    },

    quadrantLabel: {
      0: t({ tr: 'eksen üzerinde', en: 'on an axis' }),
      1: t({ tr: '1. çeyrek (R > 0, X > 0)', en: 'quadrant 1 (R > 0, X > 0)' }),
      2: t({ tr: '2. çeyrek (R < 0, X > 0)', en: 'quadrant 2 (R < 0, X > 0)' }),
      3: t({ tr: '3. çeyrek (R < 0, X < 0)', en: 'quadrant 3 (R < 0, X < 0)' }),
      4: t({ tr: '4. çeyrek (R > 0, X < 0)', en: 'quadrant 4 (R > 0, X < 0)' }),
    },

    fields: {
      R: {
        label: t({ tr: 'Gerçel bileşen (R)', en: 'Real part (R)' }),
        hint: t({
          tr: 'Empedansta direnç bileşeni. Sıfır girilebilir; negatif değer pasif bir empedansta '
            + 'görülmez',
          en: 'The resistive part of the impedance. Zero may be entered; a negative value is not '
            + 'seen in a passive impedance',
        }),
      },
      X: {
        label: t({ tr: 'Sanal bileşen (X)', en: 'Imaginary part (X)' }),
        hint: t({
          tr: 'Reaktans. Pozitif değer endüktif, negatif değer kapasitif davranış demektir',
          en: 'The reactance. A positive value means inductive, a negative value capacitive '
            + 'behaviour',
        }),
      },
      mag: {
        label: t({ tr: 'Büyüklük (|Z|)', en: 'Magnitude (|Z|)' }),
        hint: t({
          tr: 'Vektörün boyu; negatif olamaz, yön bilgisi faz açısında taşınır',
          en: 'The length of the vector; it cannot be negative — the direction is carried by the '
            + 'phase angle',
        }),
      },
      phase: {
        label: t({ tr: 'Faz açısı (φ)', en: 'Phase angle (φ)' }),
        hint: t({
          tr: `Gerçel eksenden ölçülür. Ana değer aralığı (−180°, +180°]; giriş sınırı `
            + `±${PHASE_LIMIT_DEG}°`,
          en: `Measured from the real axis. The principal value range is (−180°, +180°]; the input `
            + `limit is ±${PHASE_LIMIT_DEG}°`,
        }),
      },
    },

    // Hata mesajında alan adı olarak görünen etiketler; model.js'e verilir.
    fieldLabels: {
      R: t({ tr: 'Gerçel bileşen (R)', en: 'Real part (R)' }),
      X: t({ tr: 'Sanal bileşen (X)', en: 'Imaginary part (X)' }),
      mag: t({ tr: 'Büyüklük (|Z|)', en: 'Magnitude (|Z|)' }),
      phase: t({ tr: 'Faz açısı (φ)', en: 'Phase angle (φ)' }),
    },

    // Büyük sonuç kutusunun etiketi: girilen biçim değil, ÜRETİLEN biçim yazılır.
    bigLabel: {
      [MODE_RECT]: t({ tr: 'Polar biçim', en: 'Polar form' }),
      [MODE_POLAR]: t({ tr: 'Dikdörtgensel biçim', en: 'Rectangular form' }),
    },

    table: {
      rect: t({ tr: 'Dikdörtgensel', en: 'Rectangular' }),
      rectSub: 'Z = R + jX',
      real: t({ tr: 'Gerçel bileşen R', en: 'Real part R' }),
      imag: t({ tr: 'Sanal bileşen X', en: 'Imaginary part X' }),
      notation: t({ tr: 'Yazım', en: 'Notation' }),
      polar: t({ tr: 'Polar', en: 'Polar' }),
      polarSub: 'Z = |Z| ∠ φ',
      magnitude: t({ tr: 'Büyüklük |Z|', en: 'Magnitude |Z|' }),
      phaseDeg: t({ tr: 'Faz φ (derece)', en: 'Phase φ (degrees)' }),
      phaseRad: t({ tr: 'Faz φ (radyan)', en: 'Phase φ (radians)' }),
      position: t({ tr: 'Konum', en: 'Position' }),
      positionSub: t({ tr: 'kompleks düzlem', en: 'complex plane' }),
      quadrant: t({ tr: 'Çeyrek', en: 'Quadrant' }),
      entered: t({ tr: 'Girilen açı', en: 'Entered angle' }),
      enteredSub: t({
        tr: '(ana değere indirgendi)',
        en: '(reduced to the principal value)',
      }),
    },

    checkHeading: t({ tr: 'Ters dönüşüm kontrolü', en: 'Inverse conversion check' }),

    // Gösterim yardımcıları — R + jX ve |Z| ∠ φ dizeleri.
    // Yalnızca sembol ve sayı taşırlar; iki dilde de aynı yazılır.
    rectText: (R, X) => `${fmtOhm(R)} ${X < 0 ? '−' : '+'} j${fmtOhm(Math.abs(X))}`,
    polarText: (mag, phaseDeg) => `${fmtOhm(mag)} ∠ ${fmt(phaseDeg, 4)}°`,

    formula: t({
      tr: `Dikdörtgensel:
  Z = R + jX
Büyüklük:
  |Z| = √(R² + X²)
Faz:
  φ = tan⁻¹(X / R)
Polar biçim:
  Z = |Z| ∠ φ

Ters dönüşüm:
  R = |Z|·cos φ
  X = |Z|·sin φ

Derece–radyan:
  φ[°] = φ[rad]·180/π

Kodda faz DAİMA atan2(X, R)
  ile bulunur.`,
      en: `Rectangular:
  Z = R + jX
Magnitude:
  |Z| = √(R² + X²)
Phase:
  φ = tan⁻¹(X / R)
Polar form:
  Z = |Z| ∠ φ

Inverse conversion:
  R = |Z|·cos φ
  X = |Z|·sin φ

Degrees–radians:
  φ[°] = φ[rad]·180/π

In the code the phase is ALWAYS
  found with atan2(X, R).`,
    }),

    detail: {
      input: (r) => t({
        tr: `Girilen biçim: ${modeLabel[r.mode]}. Bileşenler R = ${fmtOhm(r.R)}, `
          + `X = ${fmtOhm(r.X)}; büyüklük ${fmtOhm(r.magnitude)}, faz ${fmt(r.phaseDeg, 5)}° = `
          + `${fmt(r.phase, 5)} rad.`,
        en: `Entered form: ${modeLabel[r.mode]}. Components R = ${fmtOhm(r.R)}, `
          + `X = ${fmtOhm(r.X)}; magnitude ${fmtOhm(r.magnitude)}, phase ${fmt(r.phaseDeg, 5)}° = `
          + `${fmt(r.phase, 5)} rad.`,
      }),
      atan2: t({
        tr: 'Faz açısı tan⁻¹(X/R) yerine atan2(X, R) ile hesaplanır. tan⁻¹ yalnızca (−90°, +90°) '
          + 'döndürebildiği için R < 0 olan ikinci ve üçüncü çeyrekte açıyı 180° yanlış verir ve '
          + 'R = 0’da sıfıra bölünür; atan2 iki bileşenin işaretini ayrı ayrı gördüğünden doğru '
          + 'çeyreği seçer.',
        en: 'The phase angle is computed with atan2(X, R) rather than tan⁻¹(X/R). Because tan⁻¹ '
          + 'can return only (−90°, +90°), it gives the angle 180° wrong in the second and third '
          + 'quadrants where R < 0 and divides by zero at R = 0; atan2 sees the sign of each '
          + 'component separately, so it picks the correct quadrant.',
      }),
      hypot: t({
        tr: 'Büyüklük Math.hypot ile alınır: √(R² + X²) ile aynı sonucu verir, ancak ara karelerde '
          + 'taşma ve alt taşma üretmez.',
        en: 'The magnitude is taken with Math.hypot: it gives the same result as √(R² + X²) but '
          + 'produces no overflow or underflow in the intermediate squares.',
      }),
      threshold: t({
        tr: 'Sınıflandırmada (endüktif/kapasitif/saf dirençli) büyüklüğün 10⁻¹² katından küçük '
          + 'bileşen sayısal artık sayılır; bu eşik yalnızca sınıflandırma içindir, gösterilen '
          + 'sayılar kırpılmaz.',
        en: 'In the classification (inductive/capacitive/purely resistive) a component smaller '
          + 'than 10⁻¹² times the magnitude is counted as numerical residue; this threshold is '
          + 'used only for the classification, the displayed numbers are never clipped.',
      }),
      noRounding: t({
        tr: 'Ara değerlerde yuvarlama yapılmaz; yalnızca gösterim yuvarlanır.',
        en: 'Intermediate values are never rounded; only the display is rounded.',
      }),
    },

    // --- Sağ panel: geçerlilik aralığı (spec §12) ---
    // Liste KOŞULSUZDUR: sarma olsun olmasın, hatta girdi geçersizken bile
    // kullanıcı kabul edilen sınırları sayı olarak görür.
    rangeNotes: [
      t({
        tr: `Faz girişinin sayısal geçerlilik aralığı: −${fmt(PHASE_LIMIT_DEG, 4)}° ≤ φ ≤ `
          + `+${fmt(PHASE_LIMIT_DEG, 4)}°, radyan karşılığı ±${fmt(PHASE_LIMIT_RAD, 8)} rad, yani `
          + `±${fmt(PHASE_LIMIT_TURNS, 3)} tam tur. Bu aralığın dışındaki açı hesaplanmaz: daha `
          + 'büyük açılarda cos ve sin argüman indirgemesi anlamlı basamak kaybettirir ve sonuç '
          + 'sayısal olarak güvenilmez olur.',
        en: `The numerical validity range of the phase input: −${fmt(PHASE_LIMIT_DEG, 4)}° ≤ φ ≤ `
          + `+${fmt(PHASE_LIMIT_DEG, 4)}°, in radians ±${fmt(PHASE_LIMIT_RAD, 8)} rad, that is `
          + `±${fmt(PHASE_LIMIT_TURNS, 3)} full turns. An angle outside this range is not `
          + 'computed: at larger angles the argument reduction of cos and sin loses significant '
          + 'digits and the result becomes numerically unreliable.',
      }),
      t({
        tr: 'Gösterilen faz her zaman ana değer aralığındadır: (−180°, +180°] — alt uç dışlanır, '
          + 'üst uç dahildir. Giriş bu aralığın dışında olabilir; sonuç eşdeğer ana değere '
          + 'indirgenir, vektörün kendisi değişmez.',
        en: 'The displayed phase is always in the principal value range: (−180°, +180°] — the '
          + 'lower end is excluded, the upper end is included. The input may lie outside this '
          + 'range; the result is reduced to the equivalent principal value and the vector itself '
          + 'does not change.',
      }),
      t({
        tr: 'Büyüklük aralığı: |Z| > 0. Negatif |Z| kabul edilmez; yön bilgisi büyüklükte değil '
          + 'faz açısında taşınır. Alt uç olan |Z| = 0 de dışlanır, çünkü o noktada faz '
          + 'tanımsızdır.',
        en: 'Magnitude range: |Z| > 0. A negative |Z| is not accepted; the direction is carried by '
          + 'the phase angle, not by the magnitude. The lower end |Z| = 0 is excluded as well, '
          + 'because the phase is undefined at that point.',
      }),
      t({
        tr: 'R ve X için işaret ya da büyüklük sınırı yoktur; sonlu her değer kabul edilir. Tek '
          + 'yasak ikisinin birden sıfır olmasıdır.',
        en: 'There is no sign or magnitude limit on R and X; every finite value is accepted. The '
          + 'only forbidden case is both being zero at the same time.',
      }),
    ],

    // --- Sağ panel: kullanılan tanımların kaynağı (spec §1) ---
    sourceNotes: [
      t({
        tr: 'Kaynak tanımın kendisidir; ölçüm ya da ampirik uyarlama yoktur. Dikdörtgensel ve '
          + 'polar gösterim aynı kompleks sayının iki yazımıdır: |Z| = √(R² + X²) Pisagor '
          + 'bağıntısı, R = |Z|·cos φ ile X = |Z|·sin φ ise Euler bağıntısının '
          + 'Z = |Z|·e^(jφ) = |Z|·(cos φ + j·sin φ) açılımındaki gerçel ve sanal parçalardır. Bu '
          + 'yüzden dönüşüm iki yönde de bilgi kaybı olmadan tersinirdir.',
        en: 'The source is the definition itself; there is no measurement and no empirical fit. '
          + 'The rectangular and polar representations are two notations for the same complex '
          + 'number: |Z| = √(R² + X²) is the Pythagorean relation, while R = |Z|·cos φ and '
          + 'X = |Z|·sin φ are the real and imaginary parts of Euler’s relation expanded as '
          + 'Z = |Z|·e^(jφ) = |Z|·(cos φ + j·sin φ). This is why the conversion is reversible in '
          + 'both directions without loss of information.',
      }),
      t({
        tr: 'Faz, tek argümanlı tan⁻¹(X/R) ile değil iki argümanlı atan2(X, R) ile hesaplanır. '
          + 'Tek argümanlı ters tanjant yalnızca (−90°, +90°) döndürebildiği için R < 0 olan '
          + 'çeyreklerde açıyı 180° yanlış verir ve R = 0’da sıfıra bölünür; atan2 iki bileşenin '
          + 'işaretini ayrı ayrı gördüğünden doğru çeyreği seçer ve sonucu doğrudan ana değer '
          + 'aralığında verir.',
        en: 'The phase is computed with the two-argument atan2(X, R), not with the '
          + 'single-argument tan⁻¹(X/R). Because the single-argument arctangent can return only '
          + '(−90°, +90°), it gives the angle 180° wrong in the quadrants where R < 0 and divides '
          + 'by zero at R = 0; atan2 sees the sign of each component separately, so it picks the '
          + 'correct quadrant and returns the result directly in the principal value range.',
      }),
      t({
        tr: 'Açının işaret yönü: φ gerçel eksenden başlar ve saat yönünün tersine dönüş pozitif '
          + 'sayılır (matematiksel pozitif yön). Buna göre X > 0 iken φ > 0, X < 0 iken φ < 0 '
          + 'olur. Empedans bağlamında pozitif faz endüktif davranıştır ve akımın gerilimin '
          + 'gerisinde kaldığını söyler; negatif faz kapasitiftir, akım gerilimin önündedir.',
        en: 'Sign convention of the angle: φ starts from the real axis and counter-clockwise '
          + 'rotation is taken as positive (the mathematically positive direction). Accordingly '
          + 'φ > 0 when X > 0 and φ < 0 when X < 0. In an impedance context a positive phase is '
          + 'inductive behaviour and says that the current lags the voltage; a negative phase is '
          + 'capacitive, the current leads the voltage.',
      }),
    ],

    // Duruma bağlı olmayan geçerlilik satırları
    validity: [
      t({
        tr: 'Dönüşüm cebirsel olarak tamdır; yaklaşım içermez. Sonuçtaki tek sapma çift duyarlıklı '
          + 'kayan nokta aritmetiğinden gelir.',
        en: 'The conversion is algebraically exact; it contains no approximation. The only '
          + 'deviation in the result comes from double-precision floating-point arithmetic.',
      }),
      t({
        tr: 'R ve X aynı frekans için geçerli fazör bileşenleridir. Reaktans frekansa bağlıdır '
          + '(X_L = 2πfL, X_C = −1/(2πfC)); başka bir frekansta bu sayı geçerli değildir.',
        en: 'R and X are phasor components valid for one and the same frequency. Reactance depends '
          + 'on frequency (X_L = 2πfL, X_C = −1/(2πfC)); at another frequency this number is not '
          + 'valid.',
      }),
      t({
        tr: 'Birim Ω olarak sunulur çünkü kullanım bağlamı empedanstır. Saf matematiksel dönüşüm '
          + 'için birim seçicileri Ω’da bırakıp değerler boyutsuz okunabilir.',
        en: 'The unit is presented as Ω because the context of use is impedance. For a purely '
          + 'mathematical conversion, leave the unit selectors at Ω and read the values as '
          + 'dimensionless.',
      }),
      t({
        tr: 'R = 0 ve X = 0 noktasında faz tanımsızdır ve hesap yapılmaz; atan2(0, 0) dilde sıfır '
          + 'döndürse de bu bir açı değildir.',
        en: 'At the point R = 0 and X = 0 the phase is undefined and no calculation is done; '
          + 'although atan2(0, 0) returns zero in the programming language, that is not an angle.',
      }),
      t({
        tr: 'Sapma yalnızca gösterim yuvarlamasından gelir; hesap tam değerle yapılır, yuvarlama '
          + 'son adımda uygulanır.',
        en: 'Any deviation comes only from display rounding; the calculation is done with the '
          + 'exact value and rounding is applied in the last step.',
      }),
    ],

    chart: {
      x: t({ tr: 'Sanal bileşen X (Ω)', en: 'Imaginary part X (Ω)' }),
      marker: t({ tr: 'seçilen', en: 'selected' }),

      sweepLabel: {
        [SWEEP_MAG]: t({ tr: '|Z| taraması', en: '|Z| sweep' }),
        [SWEEP_PHASE]: t({ tr: 'φ taraması', en: 'φ sweep' }),
      },

      axis: {
        [SWEEP_MAG]: t({ tr: 'Büyüklük |Z| (Ω)', en: 'Magnitude |Z| (Ω)' }),
        [SWEEP_PHASE]: t({ tr: 'Faz φ (°)', en: 'Phase φ (°)' }),
      },

      // Seri adları yalnızca sembol taşır; iki dilde de aynı yazılır.
      series: {
        [SWEEP_MAG]: '|Z| = √(R² + X²)',
        [SWEEP_PHASE]: 'φ = atan2(X, R)',
      },

      caption: {
        [SWEEP_MAG]: t({
          tr: 'R sabit tutulup X taranıyor. Büyüklük X = 0 noktasında en küçük değerine (|R|) iner '
            + 've reaktans büyüdükçe |X|’e yaklaşır; eğri hiçbir zaman |R| altına inmez.',
          en: 'R is held constant while X is swept. The magnitude falls to its smallest value '
            + '(|R|) at X = 0 and approaches |X| as the reactance grows; the curve never drops '
            + 'below |R|.',
        }),
        [SWEEP_PHASE]: t({
          tr: 'R sabit tutulup X taranıyor. Faz, X = 0 çevresinde işaret değiştirir ve X büyüdükçe '
            + '±90°’ye yaklaşır. R negatifse eğri X = 0’da ±180° arasında sıçrar: ana '
            + 'değer aralığı (−180°, +180°] olduğu için bu sıçrama gerçek bir süreksizlik değil, '
            + 'gösterim sınırıdır.',
          en: 'R is held constant while X is swept. The phase changes sign around X = 0 and '
            + 'approaches ±90° as X grows. If R is negative the curve jumps between ±180° at '
            + 'X = 0: because the principal value range is (−180°, +180°], this jump is not a real '
            + 'discontinuity but a limit of the representation.',
        }),
      },

      refLabel: {
        minMag: (y) => t({
          tr: `X = 0’da |Z| = ${fmtOhm(y)}`,
          en: `|Z| = ${fmtOhm(y)} at X = 0`,
        }),
        resistive: () => t({
          tr: 'φ = 0° — saf direnç',
          en: 'φ = 0° — pure resistance',
        }),
      },
    },

    schematic: {
      title: t({
        tr: 'Kompleks düzlemde Z vektörü',
        en: 'The vector Z in the complex plane',
      }),
      captionInductive: t({
        tr: 'Vektör gerçel eksenin üstünde — endüktif bölge',
        en: 'The vector is above the real axis — inductive region',
      }),
      captionCapacitive: t({
        tr: 'Vektör gerçel eksenin altında — kapasitif bölge',
        en: 'The vector is below the real axis — capacitive region',
      }),
      captionResistive: t({
        tr: 'Vektör gerçel eksen üzerinde — saf direnç',
        en: 'The vector lies on the real axis — pure resistance',
      }),
      captionIdle: t({
        tr: 'Kompleks düzlemde Z = R + jX',
        en: 'Z = R + jX in the complex plane',
      }),
    },

    reasonText: (reason) => {
      switch (reason) {
        case REASON_UNDEFINED_PHASE:
          return t({
            tr: 'R = 0 ve X = 0 iken vektörün bir yönü yoktur; faz açısı tanımsızdır. '
              + 'Bileşenlerden en az biri sıfırdan farklı olmalı. Polar modda |Z| = 0 için de '
              + 'aynısı geçerlidir.',
            en: 'When R = 0 and X = 0 the vector has no direction; the phase angle is undefined. '
              + 'At least one of the components must be non-zero. The same holds for |Z| = 0 in '
              + 'polar mode.',
          })
        case REASON_NEGATIVE_MAGNITUDE:
          return t({
            tr: 'Büyüklük |Z| negatif olamaz; yön bilgisi faz açısında taşınır. Negatif gerçel '
              + 'eksen için |Z| pozitif bırakılıp faza 180° girilir.',
            en: 'The magnitude |Z| cannot be negative; the direction is carried by the phase '
              + 'angle. For the negative real axis, leave |Z| positive and enter 180° as the '
              + 'phase.',
          })
        case REASON_INVALID:
          return t({
            tr: 'Girilen değerlerle dönüşüm yapılamadı. Alanları sonlu sayısal değerlerle '
              + 'doldurun.',
            en: 'The conversion could not be carried out with the values entered. Fill the fields '
              + 'with finite numeric values.',
          })
        default:
          return t({
            tr: 'Tüm zorunlu alanlara sayısal değer girin. Ondalık için nokta veya virgül '
              + `kullanabilirsiniz (0.25 = 0,25). Faz açısı ±${PHASE_LIMIT_DEG}° aralığında `
              + 'olmalıdır.',
            en: 'Enter a numeric value in every required field. Use a point or a comma for '
              + `decimals (0.25 = 0,25). The phase angle must lie within ±${PHASE_LIMIT_DEG}°.`,
          })
      }
    },

    // Mühendislik yorumu — empedans bağlamı burada kurulur.
    commentary: (r) => {
      if (!r.ok) return []
      const out = []

      // 1) Reaktansın işareti: endüktif / kapasitif / saf dirençli
      if (r.kind === KIND_INDUCTIVE) {
        out.push({
          level: 'ok',
          text: t({
            tr: `X = ${fmtOhm(r.X)} > 0 olduğu için empedans endüktiftir: akım gerilimin `
              + `${fmt(Math.abs(r.phaseDeg), 4)}° gerisinde kalır. Endüktif reaktans frekansla `
              + 'büyür (X_L = 2πfL), bu yüzden sonuç yalnızca hesabın yapıldığı frekans için '
              + 'geçerlidir.',
            en: `Because X = ${fmtOhm(r.X)} > 0 the impedance is inductive: the current lags the `
              + `voltage by ${fmt(Math.abs(r.phaseDeg), 4)}°. Inductive reactance grows with `
              + 'frequency (X_L = 2πfL), so the result is valid only for the frequency at which it '
              + 'was computed.',
          }),
        })
      } else if (r.kind === KIND_CAPACITIVE) {
        out.push({
          level: 'ok',
          text: t({
            tr: `X = ${fmtOhm(r.X)} < 0 olduğu için empedans kapasitiftir: akım gerilimin `
              + `${fmt(Math.abs(r.phaseDeg), 4)}° önündedir. Kapasitif reaktans frekansla küçülür `
              + '(X_C = 1/(2πfC)), bu yüzden sonuç yalnızca hesabın yapıldığı frekans için '
              + 'geçerlidir.',
            en: `Because X = ${fmtOhm(r.X)} < 0 the impedance is capacitive: the current leads the `
              + `voltage by ${fmt(Math.abs(r.phaseDeg), 4)}°. Capacitive reactance falls with `
              + 'frequency (X_C = 1/(2πfC)), so the result is valid only for the frequency at '
              + 'which it was computed.',
          }),
        })
      } else {
        out.push({
          level: 'ok',
          text: t({
            tr: `X = 0 olduğu için empedans saf dirençlidir; gerilim ile akım aynı fazdadır ve faz `
              + `açısı ${fmt(r.phaseDeg, 4)}° çıkar.`,
            en: `Because X = 0 the impedance is purely resistive; the voltage and the current are `
              + `in phase and the phase angle comes out as ${fmt(r.phaseDeg, 4)}°.`,
          }),
        })
      }

      // 2) Hangi bileşen baskın
      const ratio = Math.abs(r.R) > 0 ? Math.abs(r.X) / Math.abs(r.R) : Infinity
      if (Number.isFinite(ratio)) {
        out.push({
          level: 'ok',
          text: ratio > 1
            ? t({
              tr: `|X| / |R| = ${fmt(ratio, 3)} — reaktif bileşen baskın; büyüklük çoğunlukla `
                + 'reaktanstan geliyor ve faz ±90°’ye yakın.',
              en: `|X| / |R| = ${fmt(ratio, 3)} — the reactive part dominates; the magnitude comes `
                + 'mostly from the reactance and the phase is close to ±90°.',
            })
            : t({
              tr: `|X| / |R| = ${fmt(ratio, 3)} — dirençli bileşen baskın; büyüklük çoğunlukla `
                + 'R’den geliyor ve faz 0°’a yakın.',
              en: `|X| / |R| = ${fmt(ratio, 3)} — the resistive part dominates; the magnitude `
                + 'comes mostly from R and the phase is close to 0°.',
            }),
        })
      } else {
        out.push({
          level: 'ok',
          text: t({
            tr: 'R = 0 — saf reaktans. Büyüklük tümüyle |X|’e eşit, faz tam ±90°.',
            en: 'R = 0 — pure reactance. The magnitude equals |X| exactly and the phase is exactly '
              + '±90°.',
          }),
        })
      }

      // 3) Negatif gerçel kısım: atan2'nin asıl ayrıştığı yer
      if (r.flags.negativeReal) {
        out.push({
          level: 'warn',
          text: t({
            tr: `Gerçel bileşen negatif (R = ${fmtOhm(r.R)}). Pasif bir empedansta R ≥ 0’dır; `
              + 'negatif gerçel kısım ancak aktif ya da yansıma katsayısı gibi genel bir kompleks '
              + `büyüklük için anlamlıdır. Faz bu çeyrekte ${fmt(r.phaseDeg, 4)}° olup `
              + `tan⁻¹(X/R) tek başına `
              + `${fmt(r.phaseDeg - Math.sign(r.phaseDeg) * 180, 4)}° derdi.`,
            en: `The real part is negative (R = ${fmtOhm(r.R)}). In a passive impedance R ≥ 0; a `
              + 'negative real part is meaningful only for an active element or for a general '
              + 'complex quantity such as a reflection coefficient. In this quadrant the phase is '
              + `${fmt(r.phaseDeg, 4)}°, whereas tan⁻¹(X/R) on its own would say `
              + `${fmt(r.phaseDeg - Math.sign(r.phaseDeg) * 180, 4)}°.`,
          }),
        })
      }

      // 4) Ana değer dışına çıkan giriş açısı
      if (r.wrapped) {
        out.push({
          level: 'warn',
          text: t({
            tr: `Girilen ${fmt(r.phaseEnteredDeg, 5)}° açısı ana değer aralığının dışında; aynı `
              + `vektörün ana değeri ${fmt(r.phaseDeg, 4)}°. Bileşenler her iki gösterimde de `
              + 'aynıdır.',
            en: `The entered angle ${fmt(r.phaseEnteredDeg, 5)}° lies outside the principal value `
              + `range; the principal value of the same vector is ${fmt(r.phaseDeg, 4)}°. The `
              + 'components are identical in both representations.',
          }),
        })
      }

      // 5) Ters bağıntılarla tutarlılık
      if (r.check) {
        out.push({
          level: 'ok',
          text: t({
            tr: `Ters dönüşüm aynı noktayı veriyor: |Z|·cos φ = ${fmtOhm(r.check.R)}, `
              + `|Z|·sin φ = ${fmtOhm(r.check.X)}. İki gösterim aynı sayının farklı yazımıdır, `
              + 'bilgi kaybı yoktur.',
            en: `The inverse conversion gives the same point: |Z|·cos φ = ${fmtOhm(r.check.R)}, `
              + `|Z|·sin φ = ${fmtOhm(r.check.X)}. The two representations are different notations `
              + 'for the same number; there is no loss of information.',
          }),
        })
      }

      return out
    },

    // "Geçerlilik ve varsayımlar" listesinin duruma bağlı satırları
    validityNotes: (r) => {
      if (!r.ok) return []
      const out = []
      if (r.flags.negativeReal) {
        out.push(t({
          tr: 'Negatif gerçel bileşen pasif bir empedansta görülmez; sonuç genel bir kompleks sayı '
            + 'olarak yorumlanmalıdır.',
          en: 'A negative real part is not seen in a passive impedance; the result must be '
            + 'interpreted as a general complex number.',
        }))
      }
      if (r.flags.wrapped) {
        // Kabul edilen giriş sınırı aynı listede rangeNotes ile koşulsuz yazılır;
        // burada tekrarlanmaz.
        out.push(t({
          tr: 'Girilen faz ana değer aralığının (−180°, +180°] dışında; gösterilen açı eşdeğer ana '
            + 'değerdir.',
          en: 'The entered phase is outside the principal value range (−180°, +180°]; the angle '
            + 'shown is the equivalent principal value.',
        }))
      }
      if (r.flags.polarInput) {
        out.push(t({
          tr: 'Polar girişte bileşenler cos/sin ile üretilir; tam 90°’nin katlarında sıfır '
            + 'olması gereken bileşen kayan noktada 1e-16 mertebesinde artık taşır ve '
            + 'sınıflandırmada sıfır sayılır.',
          en: 'With polar input the components are produced with cos/sin; at exact multiples of '
            + '90° the component that should be zero carries a floating-point residue of the '
            + 'order of 1e-16 and is counted as zero in the classification.',
        }))
      }
      return out
    },
  }
}
