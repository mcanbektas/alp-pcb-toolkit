// Durum çipi — 29 araç ekranının ortak son adımı.
//
// Her ekran kendi bulgularının (yorum notları / bulgular / DFM kontrolleri) en
// kötü seviyesini bulur ve o seviyeye ait bir çip gösterir: yeşil "geçti",
// sarı "sınıra yakın", kırmızı "sınırın dışında", gri "veri yok". Eskiden bu
// eşleme (seviye → CSS sınıfı + metin) 29 ekranda birebir kopyaydı ve dört
// varyanta ayrışmıştı; CLAUDE.md "durum çipi tek kurala bağlıdır" dediği hâlde
// kural 29 kopya hâlinde yaşıyordu. Artık tek yerde.
//
// İKİ TARİHSEL SÖZ VARLIĞI köprülenir — bilinçli:
//   Genel araçlar (25):  'ok' | 'warn' | 'danger'                 (3 seviye)
//   DFM araçları (4):    'ok' | 'warning' | 'danger' | 'unknown'  (4 seviye)
// `'warn'` ile `'warning'` aynı sınıfa (`warn`) düşer. Bu ikisini tek dizeye
// indirmek 25 motorun `level` çıktısını ya da `dfmCheck.js`'in STATUS_* kümesini
// migrate etmek demekti (yüksek çalkantı, sıfır katma değer); onun yerine
// normalizasyon burada, tek noktada yapılır. Böylece hangi ekran hangi sözü
// kullanırsa kullansın doğru çip çıkar — eski `'warn'`/`'warning'` uyuşmazlığı
// (sessizce yanlış karşılaştırma) yapısal olarak biter.
//
// Saf: React, DOM, dil bilmez. Çip metnini `commonText(lang)`'ten gelen `ui`
// nesnesi taşır; bu modül yalnızca hangi metnin seçileceğine karar verir.

// En kötüden en iyiye rütbe. `danger` en yüksek. `unknown` (karar verecek
// veri yok) `ok`'un üstünde ama `warn`'ın altındadır: veri yokluğunu ölçülmüş
// bir yakınlık gibi göstermez ama "her şey yolunda" da demez.
const RANK = { danger: 3, warn: 2, warning: 2, unknown: 1, ok: 0 }

function rank(level) {
  return RANK[level] ?? 0
}

/**
 * Seviye dizisindeki en kötü seviyeyi döndürür. Boş dizide `'ok'`.
 * Tanınmayan seviye `'ok'` gibi (en düşük) sayılır — sessiz `undefined` yerine
 * güvenli taban.
 */
export function worstLevel(levels) {
  let worst = 'ok'
  for (const level of levels) {
    if (rank(level) > rank(worst)) worst = level
  }
  return worst
}

/** Verilen seviyeye tam eşit kaç öğe var. Çip metnindeki sayı budur. */
export function countAtLevel(levels, level) {
  return levels.filter((l) => l === level).length
}

/**
 * En kötü seviye + o seviyedeki adet → `{ cls, text }`.
 * `cls` her zaman CSS sınıfıdır (`ok`/`warn`/`danger`/`unknown`); `text` ise
 * `ui` (commonText) sözlüğünden seçilen iki dilli çip metni.
 */
export function statusChip(worst, count, ui) {
  switch (worst) {
    case 'ok':
      return { cls: 'ok', text: ui.statusOk }
    case 'warn':
    case 'warning':
      return { cls: 'warn', text: ui.statusWarn(count) }
    case 'unknown':
      return { cls: 'unknown', text: ui.statusUnknown(count) }
    case 'danger':
    default:
      return { cls: 'danger', text: ui.statusDanger(count) }
  }
}
