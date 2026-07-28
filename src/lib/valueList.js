// Ölçekli sayı listesi ayrıştırma — "10k; 22k; 4,7M" gibi bir metni sayı dizisine çevirir.
// Saf: React, DOM ve kullanıcıya görünen metin bilmez; hata durumunda kod döner.
//
// AYIRICI KARARI — virgül ayırıcı DEĞİLDİR.
// Türkçe yazımda "4,7k" bir ondalıktır (4.7 kΩ). Virgül aynı anda liste ayırıcısı da
// olursa "4,7k" iki parçaya bölünür ve 4 ile 7000 olarak okunur; paralel bağlamada bu
// ~1000× sessiz hataya yol açar. Bu yüzden ondalık ayracı kazanır: liste ayırıcısı
// yalnızca noktalı virgül, satır sonu ve boşluktur. Virgülün ayırıcı olarak kullanıldığı
// yazım (", " ya da satır sonundaki ",") sessizce yorumlanmaz, ayrı hata koduyla reddedilir.
//
// Her parça src/lib/num.js içindeki parseNumResult ile ayrıştırılır; böylece belirsiz
// binlik ayırıcı ("1.000") burada da geçersizdir ve ekranın diğer alanlarıyla aynı
// davranış elde edilir.

import { parseNumResult, NUM_ERR_THOUSANDS, NUM_ERR_EMPTY } from './num'

export const VALUE_LIST_ERR_EMPTY = 'empty'
export const VALUE_LIST_ERR_INVALID = 'invalid'
export const VALUE_LIST_ERR_THOUSANDS = 'thousands'
export const VALUE_LIST_ERR_COMMA_SEPARATOR = 'comma-separator'
export const VALUE_LIST_ERR_NEGATIVE = 'negative'

// Liste ayırıcıları: noktalı virgül, satır sonu, boşluk (\s satır sonunu da kapsar).
const SEPARATORS = /[;\s]+/

// Virgülün ardından boşluk ya da metin sonu gelmesi, virgülün ondalık değil ayırıcı
// olarak yazıldığını gösterir — "10, 22" ve "4,7k," bu kalıba girer, "4,7k" girmez.
const COMMA_AS_SEPARATOR = /,(\s|$)/

// Mantis + isteğe bağlı çarpan soneki. Sonek sayıya yapışık yazılır; boşluk artık
// ayırıcı olduğu için "10 k" iki parça sayılır.
const PART_SHAPE = /^(-?[\d.,]+)([kKmMgGtT])?$/

// Sonek büyük/küçük harf duyarsızdır ve küçük "m" de mega demektir: aynı harf hem mili
// hem mega anlamına gelemez, bu ekranın listeleri (direnç birleşimi) mega tarafını
// kullanır. Mili değerini sonekle değil doğrudan yazın — 0,05 gibi.
const SUFFIX_SCALE = {
  k: 1e3, K: 1e3,
  m: 1e6, M: 1e6,
  g: 1e9, G: 1e9,
  t: 1e12, T: 1e12,
}

/**
 * Ölçekli sayı listesini ayrıştırır.
 *
 * Geçersiz parça sessizce düşmez: ilk hatalı parçada durur ve parçayı `at` ile bildirir,
 * böylece çağıran hangi girdinin düzeltileceğini söyleyebilir.
 *
 * @param {string} text ham girdi
 * @returns {{ values: number[] } | { error: string, at?: string }}
 */
export function parseValueList(text) {
  const raw = String(text ?? '').trim()
  if (raw === '') return { error: VALUE_LIST_ERR_EMPTY }
  if (COMMA_AS_SEPARATOR.test(raw)) return { error: VALUE_LIST_ERR_COMMA_SEPARATOR }

  const parts = raw.split(SEPARATORS).filter(Boolean)
  if (parts.length === 0) return { error: VALUE_LIST_ERR_EMPTY }

  const values = []
  for (const part of parts) {
    const m = PART_SHAPE.exec(part)
    if (!m) return { error: VALUE_LIST_ERR_INVALID, at: part }

    const parsed = parseNumResult(m[1])
    if (parsed.error === NUM_ERR_THOUSANDS) {
      return { error: VALUE_LIST_ERR_THOUSANDS, at: part }
    }
    if (parsed.error === NUM_ERR_EMPTY || parsed.error) {
      return { error: VALUE_LIST_ERR_INVALID, at: part }
    }
    if (parsed.value < 0) return { error: VALUE_LIST_ERR_NEGATIVE, at: part }

    values.push(parsed.value * (SUFFIX_SCALE[m[2]] ?? 1))
  }

  return { values }
}
