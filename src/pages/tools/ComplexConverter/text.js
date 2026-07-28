// Kompleks sayı dönüştürücü ekranının kullanıcıya görünen metinleri.
// Hesap kodlarını (REASON_*, KIND_*) Türkçeye çeviren tek yer burasıdır.

import { fmt, fmtOhm } from '../../../lib/num'
import { KIND_INDUCTIVE, KIND_CAPACITIVE, KIND_RESISTIVE } from '../../../lib/convertComplex'
import {
  MODE_RECT, MODE_POLAR, SWEEP_MAG, SWEEP_PHASE,
  REASON_UNDEFINED_PHASE, REASON_NEGATIVE_MAGNITUDE, REASON_INVALID,
  PHASE_LIMIT_DEG, PHASE_LIMIT_RAD, PHASE_LIMIT_TURNS,
} from './model'

export const MODE_LABEL = {
  [MODE_RECT]: 'Dikdörtgensel → polar',
  [MODE_POLAR]: 'Polar → dikdörtgensel',
}

export const KIND_LABEL = {
  [KIND_INDUCTIVE]: 'endüktif',
  [KIND_CAPACITIVE]: 'kapasitif',
  [KIND_RESISTIVE]: 'saf dirençli',
}

export const QUADRANT_LABEL = {
  0: 'eksen üzerinde',
  1: '1. çeyrek (R > 0, X > 0)',
  2: '2. çeyrek (R < 0, X > 0)',
  3: '3. çeyrek (R < 0, X < 0)',
  4: '4. çeyrek (R > 0, X < 0)',
}

export const CHART = { x: 'Sanal bileşen X (Ω)' }

export const SWEEP_LABEL = {
  [SWEEP_MAG]: '|Z| taraması',
  [SWEEP_PHASE]: 'φ taraması',
}

export const SWEEP_AXIS = {
  [SWEEP_MAG]: 'Büyüklük |Z| (Ω)',
  [SWEEP_PHASE]: 'Faz φ (°)',
}

export const SWEEP_SERIES = {
  [SWEEP_MAG]: '|Z| = √(R² + X²)',
  [SWEEP_PHASE]: 'φ = atan2(X, R)',
}

export const SWEEP_CAPTION = {
  [SWEEP_MAG]: 'R sabit tutulup X taranıyor. Büyüklük X = 0 noktasında en küçük değerine (|R|) iner ve reaktans büyüdükçe |X|’e yaklaşır; eğri hiçbir zaman |R| altına inmez.',
  [SWEEP_PHASE]: 'R sabit tutulup X taranıyor. Faz, X = 0 çevresinde işaret değiştirir ve X büyüdükçe ±90°’ye yaklaşır. R negatifse eğri X = 0’da ±180° arasında sıçrar: ana değer aralığı (−180°, +180°] olduğu için bu sıçrama gerçek bir süreksizlik değil, gösterim sınırıdır.',
}

export const REF_LABEL = {
  minMag: (y) => `X = 0’da |Z| = ${fmtOhm(y)}`,
  resistive: () => 'φ = 0° — saf direnç',
}

// Gösterim yardımcıları — R + jX ve |Z| ∠ φ dizeleri
export const rectText = (R, X) => `${fmtOhm(R)} ${X < 0 ? '−' : '+'} j${fmtOhm(Math.abs(X))}`
export const polarText = (mag, phaseDeg) => `${fmtOhm(mag)} ∠ ${fmt(phaseDeg, 4)}°`

// --- Sağ panel: geçerlilik aralığı (spec §12) ---
// Liste KOŞULSUZDUR: sarma olsun olmasın, hatta girdi geçersizken bile
// kullanıcı kabul edilen sınırları sayı olarak görür.

export const RANGE_NOTES = [
  `Faz girişinin sayısal geçerlilik aralığı: −${fmt(PHASE_LIMIT_DEG, 4)}° ≤ φ ≤ +${fmt(PHASE_LIMIT_DEG, 4)}°, radyan karşılığı ±${fmt(PHASE_LIMIT_RAD, 8)} rad, yani ±${fmt(PHASE_LIMIT_TURNS, 3)} tam tur. Bu aralığın dışındaki açı hesaplanmaz: daha büyük açılarda cos ve sin argüman indirgemesi anlamlı basamak kaybettirir ve sonuç sayısal olarak güvenilmez olur.`,
  'Gösterilen faz her zaman ana değer aralığındadır: (−180°, +180°] — alt uç dışlanır, üst uç dahildir. Giriş bu aralığın dışında olabilir; sonuç eşdeğer ana değere indirgenir, vektörün kendisi değişmez.',
  'Büyüklük aralığı: |Z| > 0. Negatif |Z| kabul edilmez; yön bilgisi büyüklükte değil faz açısında taşınır. Alt uç olan |Z| = 0 de dışlanır, çünkü o noktada faz tanımsızdır.',
  'R ve X için işaret ya da büyüklük sınırı yoktur; sonlu her değer kabul edilir. Tek yasak ikisinin birden sıfır olmasıdır.',
]

// --- Sağ panel: kullanılan tanımların kaynağı (spec §1) ---

export const SOURCE_NOTES = [
  'Kaynak tanımın kendisidir; ölçüm ya da ampirik uyarlama yoktur. Dikdörtgensel ve polar gösterim aynı kompleks sayının iki yazımıdır: |Z| = √(R² + X²) Pisagor bağıntısı, R = |Z|·cos φ ile X = |Z|·sin φ ise Euler bağıntısının Z = |Z|·e^(jφ) = |Z|·(cos φ + j·sin φ) açılımındaki gerçel ve sanal parçalardır. Bu yüzden dönüşüm iki yönde de bilgi kaybı olmadan tersinirdir.',
  'Faz, tek argümanlı tan⁻¹(X/R) ile değil iki argümanlı atan2(X, R) ile hesaplanır. Tek argümanlı ters tanjant yalnızca (−90°, +90°) döndürebildiği için R < 0 olan çeyreklerde açıyı 180° yanlış verir ve R = 0’da sıfıra bölünür; atan2 iki bileşenin işaretini ayrı ayrı gördüğünden doğru çeyreği seçer ve sonucu doğrudan ana değer aralığında verir.',
  'Açının işaret yönü: φ gerçel eksenden başlar ve saat yönünün tersine dönüş pozitif sayılır (matematiksel pozitif yön). Buna göre X > 0 iken φ > 0, X < 0 iken φ < 0 olur. Empedans bağlamında pozitif faz endüktif davranıştır ve akımın gerilimin gerisinde kaldığını söyler; negatif faz kapasitiftir, akım gerilimin önündedir.',
]

export function reasonText(reason) {
  switch (reason) {
    case REASON_UNDEFINED_PHASE:
      return 'R = 0 ve X = 0 iken vektörün bir yönü yoktur; faz açısı tanımsızdır. Bileşenlerden en az biri sıfırdan farklı olmalı. Polar modda |Z| = 0 için de aynısı geçerlidir.'
    case REASON_NEGATIVE_MAGNITUDE:
      return 'Büyüklük |Z| negatif olamaz; yön bilgisi faz açısında taşınır. Negatif gerçel eksen için |Z| pozitif bırakılıp faza 180° girilir.'
    case REASON_INVALID:
      return 'Girilen değerlerle dönüşüm yapılamadı. Alanları sonlu sayısal değerlerle doldurun.'
    default:
      return `Tüm zorunlu alanlara sayısal değer girin. Ondalık için nokta veya virgül kullanabilirsiniz (0.25 = 0,25). Faz açısı ±${PHASE_LIMIT_DEG}° aralığında olmalıdır.`
  }
}

// Mühendislik yorumu — empedans bağlamı burada kurulur.
export function commentary(r) {
  if (!r.ok) return []
  const out = []

  // 1) Reaktansın işareti: endüktif / kapasitif / saf dirençli
  if (r.kind === KIND_INDUCTIVE) {
    out.push({
      level: 'ok',
      text: `X = ${fmtOhm(r.X)} > 0 olduğu için empedans endüktiftir: akım gerilimin ${fmt(Math.abs(r.phaseDeg), 4)}° gerisinde kalır. Endüktif reaktans frekansla büyür (X_L = 2πfL), bu yüzden sonuç yalnızca hesabın yapıldığı frekans için geçerlidir.`,
    })
  } else if (r.kind === KIND_CAPACITIVE) {
    out.push({
      level: 'ok',
      text: `X = ${fmtOhm(r.X)} < 0 olduğu için empedans kapasitiftir: akım gerilimin ${fmt(Math.abs(r.phaseDeg), 4)}° önündedir. Kapasitif reaktans frekansla küçülür (X_C = 1/(2πfC)), bu yüzden sonuç yalnızca hesabın yapıldığı frekans için geçerlidir.`,
    })
  } else {
    out.push({
      level: 'ok',
      text: `X = 0 olduğu için empedans saf dirençlidir; gerilim ile akım aynı fazdadır ve faz açısı ${fmt(r.phaseDeg, 4)}° çıkar.`,
    })
  }

  // 2) Hangi bileşen baskın
  const ratio = Math.abs(r.R) > 0 ? Math.abs(r.X) / Math.abs(r.R) : Infinity
  if (Number.isFinite(ratio)) {
    out.push({
      level: 'ok',
      text: ratio > 1
        ? `|X| / |R| = ${fmt(ratio, 3)} — reaktif bileşen baskın; büyüklük çoğunlukla reaktanstan geliyor ve faz ±90°’ye yakın.`
        : `|X| / |R| = ${fmt(ratio, 3)} — dirençli bileşen baskın; büyüklük çoğunlukla R’den geliyor ve faz 0°’a yakın.`,
    })
  } else {
    out.push({
      level: 'ok',
      text: 'R = 0 — saf reaktans. Büyüklük tümüyle |X|’e eşit, faz tam ±90°.',
    })
  }

  // 3) Negatif gerçel kısım: atan2'nin asıl ayrıştığı yer
  if (r.flags.negativeReal) {
    out.push({
      level: 'warn',
      text: `Gerçel bileşen negatif (R = ${fmtOhm(r.R)}). Pasif bir empedansta R ≥ 0’dır; negatif gerçel kısım ancak aktif ya da yansıma katsayısı gibi genel bir kompleks büyüklük için anlamlıdır. Faz bu çeyrekte ${fmt(r.phaseDeg, 4)}° olup tan⁻¹(X/R) tek başına ${fmt(r.phaseDeg - Math.sign(r.phaseDeg) * 180, 4)}° derdi.`,
    })
  }

  // 4) Ana değer dışına çıkan giriş açısı
  if (r.wrapped) {
    out.push({
      level: 'warn',
      text: `Girilen ${fmt(r.phaseEnteredDeg, 5)}° açısı ana değer aralığının dışında; aynı vektörün ana değeri ${fmt(r.phaseDeg, 4)}°. Bileşenler her iki gösterimde de aynıdır.`,
    })
  }

  // 5) Ters bağıntılarla tutarlılık
  if (r.check) {
    out.push({
      level: 'ok',
      text: `Ters dönüşüm aynı noktayı veriyor: |Z|·cos φ = ${fmtOhm(r.check.R)}, |Z|·sin φ = ${fmtOhm(r.check.X)}. İki gösterim aynı sayının farklı yazımıdır, bilgi kaybı yoktur.`,
    })
  }

  return out
}

// "Geçerlilik ve varsayımlar" listesinin duruma bağlı satırları
export function validityNotes(r) {
  if (!r.ok) return []
  const out = []
  if (r.flags.negativeReal) {
    out.push('Negatif gerçel bileşen pasif bir empedansta görülmez; sonuç genel bir kompleks sayı olarak yorumlanmalıdır.')
  }
  if (r.flags.wrapped) {
    // Kabul edilen giriş sınırı aynı listede RANGE_NOTES ile koşulsuz yazılır;
    // burada tekrarlanmaz.
    out.push('Girilen faz ana değer aralığının (−180°, +180°] dışında; gösterilen açı eşdeğer ana değerdir.')
  }
  if (r.flags.polarInput) {
    out.push('Polar girişte bileşenler cos/sin ile üretilir; tam 90°’nin katlarında sıfır olması gereken bileşen kayan noktada 1e-16 mertebesinde artık taşır ve sınıflandırmada sıfır sayılır.')
  }
  return out
}
