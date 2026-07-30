// Bakır kalınlığı dönüştürücü ekranının hesap modeli (spec §4.1.2, §4.1.3, §4.3).
// Saf: React, DOM ve gösterim bilmez.

import { readForm, fieldsFor, when } from '../../../lib/fields'
import { LENGTH } from '../../../lib/units'
import {
  nominalThickness, derivedThickness, allUnits,
  finishedThickness, crossSection, trapezoidArea,
  nearestNominalWeight, nominalRow, thicknessFromWeight, toleranceCorners,
  OZ_NOMINAL_ROWS, METHOD_NOMINAL, METHOD_DERIVED,
} from '../../../lib/copper'
import { sheetResistance } from '../../../lib/plane'

// Kaynak anahtarları: hesabın üç giriş yolu.
export const SOURCE_WEIGHT = 'weight'
export const SOURCE_THICKNESS = 'thickness'
// Ölçülen bitmiş kalınlık yolu (spec §4.3): bitmiş değer türetilmez, girilir;
// kaplama bu yolda geriye doğru çözülür.
export const SOURCE_FINISHED = 'finished'
export const SOURCES = [SOURCE_WEIGHT, SOURCE_THICKNESS, SOURCE_FINISHED]

export const REASON_INCOMPLETE = 'incomplete'
export const REASON_ETCH = 'etch'
// Ölçülen bitmiş kalınlık folyodan küçükse kaplama negatif çıkar
export const REASON_FINISHED = 'finished'

// Nominal tablo (spec §4.1.2) hazır seçenek olarak sunulur; "özel değer"
// yolu korunur, çünkü §4.1.2 kullanıcının kendi kalınlığını girebilmesini şart
// koşar.
export const OZ_CUSTOM = 'custom'
export const OZ_ROWS = OZ_NOMINAL_ROWS
export const OZ_OPTIONS = OZ_NOMINAL_ROWS.map((row) => row.oz)

export const INITIAL_FORM = {
  source: SOURCE_WEIGHT,
  // Varsayılan seçim nominal tablonun 1 oz satırıdır — bugünkü sonucun aynısı
  ozPick: '1',
  oz: '1',
  thickness: '35', thicknessu: 'µm',
  // Ölçülen bitmiş kalınlık yolunun varsayılanı, varsayılan formun bitmiş
  // sonucudur (35 µm folyo + 25 µm kaplama); yola geçildiğinde sonuç değişmez.
  finished: '60', finishedu: 'µm',
  method: METHOD_NOMINAL,

  layer: 'external',
  plating: '25',

  W: '0.25', Wu: 'mm',
  etch: '0',

  T: '20',

  // Tolerans alanları (spec §3.4) isteğe bağlıdır ve boş başlar. Üçü de boşken
  // tolerans taraması hiç çalışmaz, sonuç bugünküyle birebir aynıdır.
  tolStart: '', tolPlate: '', tolEtch: '',

  // Kalınlık kaydının adı (spec §4.3). Hesaba hiç girmez; alan tanımı
  // olmadığı için readForm bu anahtarı görmez.
}

const TEMP = { '°C': 1 }
const PCT = { '%': 1 }
const WIDTH = { mm: LENGTH.mm, mil: LENGTH.mil }
// 'µm' ekranda gösterilen etikettir; 'um' eski ASCII yazımı olarak kabul
// edilmeye devam eder. units.js'te ikisinin de çarpanı 1e-6, hesap etkilenmez.
const THICK = { 'µm': LENGTH['µm'], um: LENGTH.um, mm: LENGTH.mm, mil: LENGTH.mil, inch: LENGTH.inch }

// Alan etiketleri dışarıdan gelir; model dili bilmez. Etiket verilmezse alan
// anahtarı görünür — sessiz boşluk yerine teşhis edilebilir bir ad.
export function formFields(f, labels = {}) {
  const L = (key) => labels[key] ?? key

  return fieldsFor([
    // Serbest ağırlık alanı yalnızca "özel değer" seçildiğinde okunur;
    // tablo basamağı seçiliyken sayı seçimden gelir, ayrıştırılacak metin yok.
    when(f.source === SOURCE_WEIGHT && f.ozPick === OZ_CUSTOM, [
      { key: 'oz', label: L('oz'), unit: 'oz', table: { oz: 1 }, min: 0 },
    ]),
    // Başlangıç (folyo) kalınlığı iki yolda okunur: doğrudan kalınlık yolunda
    // sonucun kendisidir, ölçülen bitmiş yolunda ise kaplamayı geriye çözmek
    // için gereken referanstır. İç katmanda kaplama olmadığından ölçülen değer
    // folyonun kendisidir; orada bu alan hiç istenmez.
    when(f.source === SOURCE_THICKNESS
      || (f.source === SOURCE_FINISHED && f.layer === 'external'), [
      { key: 'thickness', label: L('thickness'), unitKey: 'thicknessu', table: THICK, min: 0 },
    ]),
    when(f.source === SOURCE_FINISHED, [
      { key: 'finished', label: L('finished'), unitKey: 'finishedu', table: THICK, min: 0 },
    ]),
    // Kaplama yalnızca girdi olduğu yollarda okunur; ölçülen bitmiş kalınlık
    // yolunda kaplama bir sonuçtur, girdi değil.
    when(f.source !== SOURCE_FINISHED, [
      { key: 'plating', label: L('plating'), unit: 'µm', table: LENGTH, min: 0, allowZero: true },
    ]),
    [
      { key: 'W', label: L('W'), unitKey: 'Wu', table: WIDTH, min: 0 },
      { key: 'etch', label: L('etch'), unit: '%', table: PCT, min: 0, allowZero: true },
      { key: 'T', label: L('T'), unit: '°C', table: TEMP, allowZero: true },
      // Toleransların üst sınırı burada değil, toleranceCorners() içinde
      // denetlenir — sınırı tek yerde tutmak için. Burada yalnızca negatif
      // tolerans elenir.
      { key: 'tolStart', label: L('tolStart'), unit: '%', table: PCT, min: 0, allowZero: true, optional: true },
      { key: 'tolPlate', label: L('tolPlate'), unit: '%', table: PCT, min: 0, allowZero: true, optional: true },
      { key: 'tolEtch', label: L('tolEtch'), unit: '%', table: PCT, min: 0, allowZero: true, optional: true },
    ],
  ])
}

export function compute(f, labels = {}) {
  const read = readForm(f, formFields(f, labels))
  if (read.ambiguous.length) return { ok: false, ambiguous: read.ambiguous }
  if (!read.ok) return { ok: false, reason: REASON_INCOMPLETE, invalid: read.invalid }

  const v = read.values
  if (v.etch >= 100) return { ok: false, reason: REASON_ETCH }

  // Yöntem seçimi (spec §12). Tanınmayan değer sessizce varsayılana düşer;
  // varsayılan nominal tablodur, yani bugünkü sonuç değişmez.
  const method = f.method === METHOD_DERIVED ? METHOD_DERIVED : METHOD_NOMINAL

  // Kaynak: bakır ağırlığı, folyo kalınlığı ya da ölçülen bitmiş kalınlık
  let oz = null
  if (f.source === SOURCE_WEIGHT) {
    if (f.ozPick === OZ_CUSTOM) {
      oz = v.oz
    } else {
      const row = nominalRow(f.ozPick)
      if (!row) return { ok: false, reason: REASON_INCOMPLETE }
      oz = row.oz
    }
  }

  // Ölçülen bitmiş kalınlık yolunda kaplama geriye doğru çözülür (spec §4.3):
  //   dış katman: t_kaplama = t_bitmiş − t_folyo
  //   iç katman : kaplama yoktur, ölçülen değer folyonun kendisidir
  // Diğer iki yolda kaplama girdidir ve bitmiş kalınlık ondan türetilir.
  let starting
  let plating
  if (f.source === SOURCE_FINISHED) {
    if (f.layer === 'external') {
      starting = v.thickness
      plating = v.finished - starting
      if (!(plating >= 0)) return { ok: false, reason: REASON_FINISHED }
    } else {
      starting = v.finished
      plating = 0
    }
  } else {
    // v.plating readForm tarafından µm'den metreye çevrilmiş olarak gelir
    starting = oz != null ? thicknessFromWeight(oz, method) : v.thickness
    plating = v.plating
  }

  if (!(starting > 0)) return { ok: false, reason: REASON_INCOMPLETE }
  const finished = finishedThickness({ starting, plating, layer: f.layer })
  if (finished.error) return { ok: false, reason: REASON_INCOMPLETE }

  const rect = crossSection({ t: finished.finished, W: v.W })
  const trap = trapezoidArea({ t: finished.finished, Wbottom: v.W, etchFactor: v.etch / 100 })
  if (trap.error) return { ok: false, reason: REASON_ETCH }

  // Tolerans analizi (spec §3.4) yalnızca en az bir alan doldurulduğunda
  // çalışır. Alanlar boşken readForm null döner ve `tolerance` null kalır;
  // sonuç panelinde tolerans bölümü hiç görünmez.
  const tolGiven = v.tolStart != null || v.tolPlate != null || v.tolEtch != null
  const tolerance = tolGiven
    ? toleranceCorners({
      starting,
      plating,
      layer: f.layer,
      W: v.W,
      etchFactor: v.etch / 100,
      T: v.T,
      tol: {
        starting: (v.tolStart ?? 0) / 100,
        plating: (v.tolPlate ?? 0) / 100,
        etch: (v.tolEtch ?? 0) / 100,
      },
    })
    : null

  return {
    ok: true,
    source: f.source,
    // Kaplamanın girdi değil, ölçülen bitmiş kalınlıktan geriye çözülen bir
    // sonuç olduğu yol. Ekran etiketi buna bakar.
    platingSolved: f.source === SOURCE_FINISHED,
    oz,
    // Başlangıç kalınlığını hangi yöntemin verdiği. Doğrudan kalınlık
    // girildiğinde çevrim yapılmadığı için yöntem bilgisi yoktur.
    method: oz != null ? method : null,
    layer: f.layer,
    starting,
    plating: finished.plating,
    finished: finished.finished,
    platingShare: finished.platingShare,
    // Nominal tablo ile yoğunluktan türetilen değer birlikte sunulur
    nominal: oz != null ? nominalThickness(oz) : null,
    derived: oz != null ? derivedThickness(oz) : null,
    // Üretim için önerilen değer (spec §12): bitmiş kalınlığa en yakın
    // sipariş edilebilir nominal ağırlık basamağı.
    recommended: nearestNominalWeight(finished.finished),
    units: {
      starting: allUnits(starting),
      finished: allUnits(finished.finished),
    },
    W: v.W,
    rect,
    trap,
    etch: v.etch,
    T: v.T,
    // Worst-case köşe taraması: min · nominal · maks üçlüleri (spec §3.4)
    tolerance,
    Rsheet: sheetResistance(finished.finished, v.T),
    // Trapez kesitin dirence etkisi — alan azaldıkça direnç artar
    RsheetTrap: rect.area > 0 ? sheetResistance(finished.finished, v.T) * (rect.area / trap.area) : NaN,
  }
}

// --- Kalınlık kaydı (spec §4.3) ---
//
// Saf çeviri: hesabın SI çıktısını kayıt şemasının zarfına, zarfı da form
// alanlarına dönüştürür. Depolama, React ve tarayıcı API'si burada yoktur.

// SI metreden kaydın kanonik birimine (µm). Alan okunurken µm çarpanıyla
// çarpıldığı için tersi bölmedir: `x · 1e-6 / 1e-6` girilen sayıyı birebir
// geri verir, `x · 1e-6 · 1e6` ise son bitte kaydırır (60 → 59.99999999999999).
// Yuvarlama yok — yalnızca çarpanın kendisiyle bölünüyor.
const toUm = (t_m) => t_m / LENGTH['µm']

/**
 * Sonuçtan saklanabilir kalınlık kaydı üretir. Hesap geçersizse null döner —
 * yarım bir kayıt yazılmaz.
 */

/**
 * Kayıttan form yaması. Kayıt kanonik olarak µm tuttuğu için geri yüklenen
 * alanların birim seçicileri de µm'ye ayarlanır.
 */

// Grafik: bakır ağırlığına göre kare direnci
export function buildSweep(r) {
  if (!r.ok) return null

  // İmlecin x'i koşulsuz olarak BİTMİŞ kalınlıktan türetilir.
  //
  // Eğri y = R_□(nominalThickness(oz)) bağıntısından çizilir, imlecin y'si ise
  // R_□(bitmiş kalınlık)'tır. Ağırlık kaynağında x olarak ham `r.oz` girişi
  // kullanılınca bu iki kalınlık farklı oluyordu: `r.oz` yalnızca folyoyu
  // anlatır, kaplamayı içermez. Varsayılan formda (1 oz folyo + 25 µm kaplama)
  // imleç eğrinin belirgin biçimde altına düşüyordu.
  //
  // `units.finished.ozNominal = t_bitmiş / (35 µm)` nominal kuralın tersidir ve
  // nominal tablo değerleri tam olarak 35·oz olduğundan
  //   nominalThickness(markerOz) === t_bitmiş
  // olur; yani imleç her iki kaynakta da eğrinin tam üstüne oturur.
  const markerOz = r.units.finished?.ozNominal ?? NaN

  // Tarama aralığı çalışma noktasını her zaman kapsar. LineChart x eksenini
  // yalnızca seri noktalarından türettiği için, sabit 0.25–6 oz aralığının
  // dışında kalan bir çalışma noktası (ör. 10 oz ağır bakır) grafiğin dışına
  // düşüp görünmez oluyordu.
  const spans = Number.isFinite(markerOz) && markerOz > 0
  const from = spans ? Math.min(0.25, markerOz * 0.8) : 0.25
  const to = spans ? Math.max(6, markerOz * 1.2) : 6

  const steps = 60
  const xs = []
  for (let i = 0; i < steps; i++) xs.push(from + ((to - from) * i) / (steps - 1))

  // Çalışma noktasının x'i örnek noktalardan biri yapılır. Eğri 1/t biçiminde
  // olduğu için düzgün aralıklı örnekleme sol uçta kabadır; iki örnek arasını
  // birleştiren doğru parçası eğrinin altında kalır ve imleç ince bakırda
  // çizgiden ayrık görünürdü. Tam bu x'te bir örnek olunca imleç çizilen
  // poligonun üstünde durur.
  if (spans && !xs.some((x) => Math.abs(x - markerOz) <= 1e-12 * Math.max(1, markerOz))) {
    // Aralık tanımı gereği from < markerOz < to, yani ekleme yeri her zaman var;
    // yine de bulunamazsa dizi sıralı kalsın diye ekleme yapılmaz.
    const at = xs.findIndex((x) => x > markerOz)
    if (at > 0) xs.splice(at, 0, markerOz)
  }

  const rows = xs.map((oz) => ({ x: oz, y: sheetResistance(nominalThickness(oz), r.T) }))

  // Tolerans bandı (spec §3.4). Çalışma noktasındaki BAĞIL kalınlık toleransı
  // eğri boyunca sabit kabul edilir; band bu yüzden eğriyi sabit bir oranla
  // sarar. Gerçekte kaplama payı ağırlıkla değiştiği için bağıl tolerans da
  // eğri boyunca değişir — grafik bir kestirimdir, sayısal karşılığı orta
  // paneldeki üçlüdür.
  //
  // R_□ = ρ/t ters orantılı olduğu için kalınlığın ÜST ucu direncin ALT ucunu
  // verir; band noktaları [x, yAlt, yÜst] sırasıyla yazılır.
  const t = r.tolerance
  let band = null
  if (t && !t.error && t.active && t.finished.nom > 0) {
    const lo = t.finished.min / t.finished.nom
    const hi = t.finished.max / t.finished.nom
    band = rows.map((p) => [p.x, p.y / hi, p.y / lo])
  }

  return {
    rows,
    points: rows.map((p) => [p.x, p.y]),
    band,
    marker: { x: markerOz, y: sheetResistance(r.finished, r.T) },
    refs: [],
  }
}
