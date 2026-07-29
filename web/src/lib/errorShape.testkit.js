// Saf katman hata sözleşmesinin ortak doğrulaması (CLAUDE.md §Mimari-1).
//
// `src/lib/` kullanıcıya görünen metin bilmez: hata durumunda `{ error: <kod> }`
// döner, isterse koda eşlik eden simgesel/sayısal alanları da taşır. Kodu ve
// alanlarını cümleye çeviren taraf ekranın text.js dosyasıdır.
//
// Bu dosya bir test değil, testlerin paylaştığı yardımcıdır — adı `.test.js`
// ile bitmediği için vitest onu ayrı bir süit olarak toplamaz. Aynı iddiayı
// yirmiye yakın test dosyasına kopyalamak yerine tek yerde durur; sözleşme
// değişirse tek yer güncellenir.

import { expect } from 'vitest'

// Cümleyi ele veren iki iz: sözcük arası boşluk ve Türkçeye özgü harfler.
// Hata alanlarındaki dizeler tek parça anahtardır (`'thin-plating'`, `'gold'`,
// `'Q'`), bu yüzden ikisini de taşımazlar.
const WHITESPACE = /\s/
const TURKISH_LETTER = /[ğışçöüİĞŞÇÖÜ]/

// Yükün her katmanını gezer: üst düzey alanlar ve `detail` gibi iç içe nesneler.
function walk(value, path, seen) {
  if (typeof value === 'string') {
    expect(value, `${path} bir cümle taşıyor (boşluk)`).not.toMatch(WHITESPACE)
    expect(value, `${path} bir cümle taşıyor (Türkçe harf)`).not.toMatch(TURKISH_LETTER)
    return
  }
  if (value && typeof value === 'object') {
    if (seen.has(value)) return
    seen.add(value)
    for (const [key, v] of Object.entries(value)) walk(v, `${path}.${key}`, seen)
  }
}

/**
 * Bir hata sonucunun saf katman sözleşmesine uyduğunu doğrular:
 * kod bir dizedir, `message` alanı yoktur ve hiçbir alan cümle taşımaz.
 *
 * @param {object} result motorun döndürdüğü hata nesnesi
 * @param {string} [label] hangi çağrının sonucu olduğu — hata çıktısını okunur kılar
 */
export function expectErrorShape(result, label = 'error') {
  expect(typeof result?.error, `${label}: kod dize olmalı`).toBe('string')
  expect(result, `${label}: message alanı bulunmaz`).not.toHaveProperty('message')
  walk(result, label, new Set())
}

/**
 * Bir dizi hata sonucunu topluca doğrular.
 *
 * @param {object[]} results
 */
export function expectErrorShapes(results) {
  results.forEach((r, i) => expectErrorShape(r, `[${i}]`))
}
