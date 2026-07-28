// Bakır kalınlığı dönüştürücü ekranının kullanıcıya görünen metinleri.

import { fmt, fmtEng, fmtOhm, fmtPct } from '../../../lib/num'
import { REASON_ETCH, REASON_FINISHED, OZ_ROWS, OZ_CUSTOM } from './model'
import { METHOD_NOMINAL, METHOD_DERIVED, COPPER_ERR_TOLERANCE } from '../../../lib/copper'
import {
  NAME_MAX, RECORD_MAX,
  THICKNESS_ERR_SCHEMA, THICKNESS_ERR_VERSION, THICKNESS_ERR_NAME,
  THICKNESS_ERR_SOURCE, THICKNESS_ERR_LAYER, THICKNESS_ERR_UNIT,
  THICKNESS_ERR_FIELD, THICKNESS_ERR_CONSISTENCY, THICKNESS_ERR_STORAGE,
  THICKNESS_ERR_LIMIT,
} from '../../../lib/thicknessRecords'

// Kaynak seçicisinin kısa etiketleri — üç düğme aynı şeride sığmalı.
export const SOURCE_LABEL = {
  weight: 'Bakır ağırlığından',
  thickness: 'Kalınlıktan',
  finished: 'Bitmiş (ölçülen)',
}

// Tablo ve listelerde kullanılan uzun ad.
export const SOURCE_LONG = {
  weight: 'Bakır ağırlığı',
  thickness: 'Başlangıç (folyo) kalınlığı',
  finished: 'Bitmiş kalınlık (ölçülen)',
}

export const LAYER_LABEL = {
  external: 'Dış katman',
  internal: 'İç katman',
}

// Nominal tablo basamakları hazır seçenek olarak; son satır serbest giriş yolu
// (spec §4.1.2: "Kullanıcı mutlaka özel kalınlık girebilmelidir").
export const OZ_PICK_OPTIONS = [
  ...OZ_ROWS.map((row) => ({
    value: String(row.oz),
    label: `${fmt(row.oz, 3)} oz/ft² — ${fmt(row.um, 4)} µm`,
  })),
  { value: OZ_CUSTOM, label: 'Özel değer…' },
]

export const METHOD_LABEL = {
  [METHOD_NOMINAL]: 'Endüstri nominal tablosu',
  [METHOD_DERIVED]: 'Bakır yoğunluğundan türetilen',
}

export const METHOD_OPTIONS = [
  // "(varsayılan)" eki seçicinin dar kutusuna sığmıyor, alan ipucunda yazıyor.
  { value: METHOD_NOMINAL, label: METHOD_LABEL[METHOD_NOMINAL] },
  { value: METHOD_DERIVED, label: METHOD_LABEL[METHOD_DERIVED] },
]

export const OZ_TABLE_CAPTION = 'Nominal bakır ağırlığı tablosu'

export const TOLERANCE_CAPTION = 'Üretim toleransı — minimum · nominal · maksimum'
export const TOLERANCE_BAND_LABEL = 'tolerans bandı'

export const CHART = {
  x: 'Bakır ağırlığı (oz/ft²)', y: 'Kare direnci (Ω/□)',
  caption: 'Kare direnci kalınlıkla ters orantılıdır: bakırı iki katına çıkarmak direnci yarıya indirir. Eğri nominal kurala (1 oz = 35 µm) göre çizilir; çalışma noktası bitmiş kalınlığın (folyo + kaplama) eşdeğer bakır ağırlığına konur, bu yüzden dış katmanda imleç girilen folyo ağırlığının sağına düşer ama her zaman eğrinin üstündedir. Tarama aralığı çalışma noktasını kapsayacak biçimde genişletilir.',
  bandNote: 'Taralı bant, çalışma noktasında bulunan worst-case kalınlık aralığının bağıl genişliğini eğri boyunca sabit kabul ederek çizilir; kalınlığın üst ucu direncin alt kenarını verir. Sayısal karşılığı orta paneldeki min · nominal · maks üçlüsüdür.',
}

// Tolerans taramasının reddettiği girdiler. Ana sonuç bundan etkilenmez;
// yalnızca tolerans bölümü hesaplanamaz.
export function toleranceReason(code) {
  if (code === COPPER_ERR_TOLERANCE) {
    return 'Her tolerans %0 ile %100 arasında olmalı (100 hariç) ve aşındırma oranının üst ucu %100’e ulaşmamalı. %100 tolerans kalınlığı sıfırlar, kare direncini tanımsız yapar.'
  }
  return 'Tolerans taraması için geçerli bir geometri gerekli.'
}

/**
 * Toleransın hangi büyüklüğü ne kadar oynattığını anlatan tek cümle
 * (spec §1 "üretim toleransı etkisi"). Sağ panelde gösterilir.
 */
export function toleranceNote(r) {
  const t = r.ok ? r.tolerance : null
  if (!t || t.error || !t.active) return null

  const widest = [
    { at: 'bitmiş kalınlıkta', span: t.finished },
    { at: 'kesit alanında', span: t.area },
    { at: 'kare direncinde', span: t.Rsheet },
  ].reduce((a, b) => (b.span.spreadPct > a.span.spreadPct ? b : a))

  // Aşındırma toleransı kalınlığa hiç dokunmaz; yalnız girildiğinde bunu
  // açıkça söylemek gerekir, yoksa "kalınlık neden oynamadı" sorusu kalır.
  const etchOnly = t.tol.starting === 0 && t.tol.plating === 0 && t.tol.etch > 0

  return `Girilen toleranslar bitmiş kalınlığı ${fmtPct(t.finished.minPct)} / ${fmtPct(t.finished.maxPct)}, kesit alanını ${fmtPct(t.area.minPct)} / ${fmtPct(t.area.maxPct)}, kare direncini ${fmtPct(t.Rsheet.minPct)} / ${fmtPct(t.Rsheet.maxPct)} oynatıyor; en geniş bant %${fmt(widest.span.spreadPct, 3)} ile ${widest.at}${etchOnly ? ', çünkü aşındırma toleransı yalnızca kesiti daraltır, kalınlığa ve kare direncine dokunmaz' : ''}.`
}

export function reasonText(reason) {
  if (reason === REASON_ETCH) {
    return 'Aşındırma oranı 0 ile 100 % arasında olmalı. %100 üst genişliğin sıfıra inmesi demektir.'
  }
  if (reason === REASON_FINISHED) {
    return 'Ölçülen bitmiş kalınlık, başlangıç (folyo) kalınlığından küçük olamaz — kaplama negatif çıkar. Ya ölçümü ya da folyo kalınlığını düzeltin; kaplaması olmayan bir katman için "İç katman" seçin.'
  }
  return 'Tüm zorunlu alanlara pozitif sayısal değer girin. Ondalık için nokta veya virgül kullanabilirsiniz (0.25 = 0,25).'
}

// --- Kalınlık kayıtları (spec §4.3) ---

export const SAVED = {
  caption: 'Kayıtlı kalınlıklar',
  nameLabel: 'Kayıt adı',
  namePlaceholder: 'ör. 1 oz dış katman',
  nameHint: `Aynı ad yeniden kaydedilirse kayıt güncellenir; en fazla ${RECORD_MAX} kayıt, ad en fazla ${NAME_MAX} karakter. Kayıtlar yalnızca bu tarayıcıda saklanır, sunucuya gönderilmez.`,
  saveLabel: 'Bu kalınlığı kaydet',
  restoreLabel: 'Geri yükle',
  removeLabel: 'Sil',
  headName: 'Ad',
  headSummary: 'başlangıç · bitmiş',
  empty: 'Henüz kayıt yok. Hesabı istediğiniz gibi kurun, bir ad verip kaydedin; kayıt bu tarayıcıda kalır ve sayfa yenilenince listede durur.',
  tableNote: 'Kalınlıklar µm. Bir satıra tıklayınca (ya da Enter/Boşluk ile) kayıt forma geri yüklenir.',
  unavailable: 'Tarayıcı depolaması kullanılamıyor (gizli sekme ya da kapalı site verisi olabilir). Kayıt saklanamaz; hesap ve tüm sonuçlar normal çalışmaya devam eder.',
  needResult: 'Kaydetmek için önce geçerli bir sonuç gerekir.',
  needName: 'Kaydetmek için bir ad girin.',
}

// Kayıt deposunun hata kodlarını Türkçeleştirir. Depolama hatasında tarayıcının
// kendi nedeni (kota, izin) ek cümle olarak korunur.
export function savedErrorText(code, detail) {
  switch (code) {
    case THICKNESS_ERR_NAME:
      return `Kayıt adı boş olamaz ve en fazla ${NAME_MAX} karakter olabilir.`
    case THICKNESS_ERR_LIMIT:
      return `En fazla ${RECORD_MAX} kayıt saklanabilir. Yeni kayıt için önce listeden bir kaydı silin.`
    case THICKNESS_ERR_STORAGE:
      return `Kayıt tarayıcı depolamasına yazılamadı. ${detail ?? ''}`.trim()
    case THICKNESS_ERR_VERSION:
      return 'Kayıt farklı bir şema sürümüyle yazılmış; bu sürümle okunamaz ve yüklenmedi.'
    case THICKNESS_ERR_SCHEMA:
    case THICKNESS_ERR_SOURCE:
    case THICKNESS_ERR_LAYER:
    case THICKNESS_ERR_UNIT:
    case THICKNESS_ERR_FIELD:
    case THICKNESS_ERR_CONSISTENCY:
      return 'Kayıt şemaya uymuyor, yazılmadı. Sonucu yeniden hesaplayıp tekrar deneyin.'
    default:
      return 'Kayıt işlemi tamamlanamadı.'
  }
}

// Son eylemin ekranda gösterilecek tek satırlık sonucu.
// Döner: { level: 'ok' | 'warn', text } | null
export function savedNotice(action, res) {
  if (!res) return null
  if (res.error) return { level: 'warn', text: savedErrorText(res.error, res.message) }
  if (action === 'save') {
    return { level: 'ok', text: `"${res.record.name}" kaydedildi: başlangıç ${fmt(res.record.starting, 4)} µm, bitmiş ${fmt(res.record.finished, 4)} µm.` }
  }
  if (action === 'remove') return { level: 'ok', text: 'Kayıt silindi.' }
  if (action === 'restore') return { level: 'ok', text: 'Kayıt forma geri yüklendi.' }
  return null
}

export function commentary(r) {
  if (!r.ok) return []
  const out = []

  if (r.nominal != null && r.derived != null) {
    const diffPct = (100 * (r.nominal - r.derived)) / r.derived
    out.push({
      level: 'ok',
      text: `Nominal tablo ${fmtEng(r.nominal, 'm', 4)} veriyor; bakır yoğunluğundan türetilen değer ${fmtEng(r.derived, 'm', 4)}. Aradaki %${fmt(diffPct, 3)} fark folyo tanımı, yuvarlama ve üretim sürecinden gelir.`,
    })
    out.push({
      level: 'warn',
      text: r.method === METHOD_DERIVED
        ? `Başlangıç kalınlığı ${METHOD_LABEL[METHOD_DERIVED].toLocaleLowerCase('tr')} yöntemiyle bulundu (${fmtEng(r.starting, 'm', 4)}). Üretici sipariş kalınlıklarını nominal tabloya göre verir; bu yöntem fiziksel kütleyi doğru, sipariş karşılığını eksik anlatır.`
        : `Hesaplarda nominal tablo değeri kullanıldı. Kritik bir kesit hesabı yapıyorsanız üreticinin kendi kalınlık toleransını sorun.`,
    })
  }

  if (r.recommended) {
    const rec = r.recommended
    if (rec.outOfRange) {
      out.push({
        level: 'warn',
        text: `Bitmiş kalınlık ${fmtEng(r.finished, 'm', 4)}, nominal tablonun ${fmt(OZ_ROWS[0].oz, 3)}–${fmt(OZ_ROWS[OZ_ROWS.length - 1].oz, 3)} oz/ft² aralığının dışında. En yakın basamak ${fmt(rec.oz, 3)} oz/ft² (${fmt(rec.um, 4)} µm) ama fark ${fmtPct(rec.deltaPct)}; bu kalınlık standart sipariş dışıdır, üreticiye ayrıca sorun.`,
      })
    } else if (rec.exact) {
      out.push({
        level: 'ok',
        text: `Bitmiş kalınlık ${fmt(rec.oz, 3)} oz/ft² basamağına tam oturuyor (${fmt(rec.um, 4)} µm). Sipariş için ek yuvarlama gerekmiyor.`,
      })
    } else {
      out.push({
        level: 'ok',
        text: `Üretim için önerilen sipariş basamağı ${fmt(rec.oz, 3)} oz/ft² (nominal ${fmt(rec.um, 4)} µm); bitmiş kalınlığa göre fark ${fmtPct(rec.deltaPct)}. Sipariş ara kalınlıktan değil bu basamaklardan verilir.`,
      })
    }
  }

  // İç katmanda kaplama zaten yok; oradaki notu aşağıdaki mevcut madde veriyor.
  if (r.platingSolved && r.layer === 'external') {
    out.push({
      level: 'warn',
      text: `Bitmiş kalınlık ölçümden geldi (${fmtEng(r.finished, 'm', 4)}); kaplama geriye çözüldü: ${fmtEng(r.plating, 'm', 4)} = bitmiş − folyo (${fmtEng(r.starting, 'm', 4)}). Çözülen kaplama, girilen folyo kalınlığı kadar doğrudur; folyo kalınlığı da kendi toleransını taşır.`,
    })
  }

  if (r.plating > 0) {
    out.push({
      level: 'ok',
      text: `Dış katmanda kaplama ${fmtEng(r.plating, 'm', 3)} ekliyor; bitmiş kalınlık ${fmtEng(r.finished, 'm', 4)} ve kaplamanın kesitteki payı %${fmt(r.platingShare * 100, 3)}.`,
    })
    if (r.platingShare > 0.4) {
      out.push({
        level: 'warn',
        text: 'Kesitin büyük kısmı kaplamadan geliyor. Kaplama kalınlığı folyodan daha değişkendir; gerçek kesit tahmin edilenden belirgin biçimde sapabilir.',
      })
    }
  } else if (r.layer === 'internal') {
    out.push({
      level: 'ok',
      text: 'İç katmanda delik kaplaması yüzeye bakır eklemez; bitmiş kalınlık folyo kalınlığına eşittir.',
    })
  }

  out.push({
    level: 'ok',
    text: `${fmtEng(r.W, 'm', 3)} genişliğinde dikdörtgen kesit ${fmtEng(r.rect.area, 'm²', 4)}; kare direnci ${fmtOhm(r.Rsheet)}/□ @ ${fmt(r.T, 3)} °C.`,
  })

  if (r.tolerance) {
    const t = r.tolerance
    if (t.error) {
      out.push({ level: 'warn', text: `Tolerans analizi yapılamadı. ${toleranceReason(t.error)}` })
    } else if (!t.active) {
      out.push({
        level: 'ok',
        text: 'Tolerans alanlarına sıfır girildi; worst-case üçlüsü nominal değerin kendisidir. Üretim sapmasını görmek için en az bir alana yüzde girin.',
      })
    } else {
      out.push({
        level: 'ok',
        text: `Worst-case köşe taramasında bitmiş kalınlık ${fmtEng(t.finished.min, 'm', 4)} … ${fmtEng(t.finished.max, 'm', 4)}, kare direnci ${fmtOhm(t.Rsheet.min)}/□ … ${fmtOhm(t.Rsheet.max)}/□ arasında. Akım kapasitesi ve gerilim düşümü marjını nominale değil bu uçlara göre kontrol edin.`,
      })
    }
  }

  if (r.etch > 0) {
    out.push({
      level: r.trap.lossPct > 15 ? 'warn' : 'ok',
      text: `Aşındırma üst genişliği ${fmtEng(r.trap.Wtop, 'm', 3)}'e indiriyor; gerçek kesit dikdörtgen varsayımından %${fmt(r.trap.lossPct, 3)} küçük. Dikdörtgen varsayımı her zaman iyimserdir.`,
    })
  } else {
    out.push({
      level: 'warn',
      text: 'Aşındırma oranı sıfır girildi, yani kesit dikdörtgen kabul edildi. Dar RF hatlarında ve ince geometrilerde gerçek kesit trapezdir ve bu varsayımdan küçüktür.',
    })
  }

  return out
}
