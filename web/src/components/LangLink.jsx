// Dil bilen bağlantı — `react-router`ın `Link`ini sarar.
//
// KURAL: `to` her zaman KANONİK (Türkçe) yol olarak yazılır; çeviri burada,
// render anında yapılır. Böylece 34 dosyaya ikinci bir yol sözlüğü ya da
// `lang === 'en' ? … : …` koşulu dağılmaz ve yeni bir ekran yanlışlıkla tek
// dilli bağlantı üretemez.
//
//   <LangLink to="/kategori/sinyal-butunlugu">   → /en/category/signal-integrity
//   <LangLink to={`/proje/${id}`}>               → /en/project/<id>
//
// Sorgu ve `#` parçası korunur — `?hesap=<id>` bağı iki dil ağacında da aynı
// adı taşır (docs/en-url-karari.md §2). Dış adres (`mailto:`, `https://`)
// olduğu gibi geçer.
//
// Bileşen `useLang()`i doğrudan okuyan istisnalardandır ve gerekçesi
// diğerlerinden farklıdır: taşıdığı şey metin değil, adrestir — prop olarak
// dil geçirmek her çağrı yerine aynı iki satırı kopyalamak olurdu.

import { Link } from 'react-router-dom'
import { useLang } from '../hooks/useLang'
import { translatePath } from '../lib/routes'

export default function LangLink({ to, ...rest }) {
  const { lang } = useLang()
  return <Link to={translatePath(to, lang)} {...rest} />
}
