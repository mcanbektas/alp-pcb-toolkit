// Ekranın çıktısını BAŞKA bir dilde yakalamak.
//
// Sorun: rapor bölümü (`report.js`) ekranın `getText(lang)`'inden kurulur ve
// şema/grafik SVG'si canlı DOM'dan okunur — ikisi de "ekranda hangi dil varsa"
// o dilde. Belge dili ayrı seçilebildiği için Türkçe ekrandan İngilizce rapor
// istendiğinde bölüm de şema da Türkçe çıkıyordu.
//
// Ucuz olmayan çözüm, her araç ekranının bölümü iki dilde kurması ve şemayı
// ikinci kez gizli çizmesiydi: 29 ekranda değişiklik. Bunun yerine dil
// KISA SÜRELİĞİNE çevrilir, çıktı okunur ve geri alınır.
//
// Kullanıcı bu çevrilmeyi GÖRMEZ, çünkü iki `flushSync` arasında tarayıcı
// boyama yapamaz: `flushSync` React'i eşzamanlı olarak DOM'a yazmaya zorlar,
// arada bizim eşzamanlı kodumuz çalışır (okuma) ve ikinci `flushSync` DOM'u
// eski hâline döndürür. Hepsi tek bir olay işleyicisinin içinde, tek karede.
//
// İki uyarı, ikisi de bilinçli:
//   - Çevirme ADRES ÇUBUĞUNA DOKUNMAZ. Dil normalde URL'den okunur
//     (docs/en-url-karari.md §3) ama burada gezinme YOKTUR: kullanıcı bir
//     rapor indiriyor, form durumu ve `?hesap=` bağı yerinde kalmalı. Bu
//     yüzden `LangProvider` geçici bir geçersiz kılma taşır
//     (`setLangOverride`) ve geri alma `null` yazar — yani her zaman URL'in
//     dili geri gelir, ikinci bir "doğru dil" değişkeni tutulmaz.
//   - Geri alma `finally` içindedir: okuma sırasında hata çıksa bile dil geri
//     döner.
//   - `flushSync` render/lifecycle İÇİNDE çağrılamaz. Buradaki kullanım her
//     zaman bir olay işleyicisinden (indirme/kaydetme düğmesi) gelir.
import { useCallback } from 'react'
import { flushSync } from 'react-dom'
import { useLang } from './useLang'

export default function useLangCapture() {
  const { lang, setLangOverride } = useLang()

  // `read` SENKRON olmalı: dil geri alınmadan önce okumanın bitmesi gerekiyor.
  // İçinde `await` olan bir okuma, dil çoktan geri dönmüşken çalışırdı.
  return useCallback((target, read) => {
    if (target === lang) return read()

    flushSync(() => setLangOverride(target))
    try {
      return read()
    } finally {
      flushSync(() => setLangOverride(null))
    }
  }, [lang, setLangOverride])
}
