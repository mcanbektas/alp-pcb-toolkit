// Mühendislik yorumu listesi — başlık + işaretli satırlar. 28 ekranda aynı
// blok ve aynı MARK tablosu kopyalanıyordu; işaret seti ekranlar arası
// tutarlılık kuralının parçası olduğu için tek yerde durmalı.
//
// `useLang()` istisnası: başlık (`ui.commentary`) her ekranda birebir aynı
// çerçeve metnidir — prop olarak geçirmek aynı sözlüğü 28 ekrana kopyalamak
// olurdu (bkz. CLAUDE.md bileşen istisnaları).
//
// `items`: `{ key, level, text }` dizisi. Ekran kendi bulgularını bu şekle
// çevirir (kimi hazır not listesi, kimi findingText süzgeci kullanıyor) —
// süzme/çeviri ekranda kalır, bileşen yalnızca çizer.
import { useLang } from '../hooks/useLang'
import { commonText } from '../data/uiText'

// `warn`/`warning` iki tarihsel söz varlığı (bkz. statusChip.js), aynı işarete
// düşer. `unknown` işareti DfmChecks'teki MARK ile birebir aynı tutulur —
// aynı sayfada kontrol listesi `·` gösterirken yorumun `?` göstermesi
// tutarlılık kuralını bozardı.
const MARK = { ok: '✓', warn: '!', danger: '×', warning: '!', unknown: '·' }

export default function Commentary({ items }) {
  const { lang } = useLang()
  const ui = commonText(lang)
  return (
    <>
      <h2 className="section">{ui.commentary}</h2>
      <ul className="commentary">
        {items.map((n) => (
          // Kod taşıyan bulgular kodu anahtar verir; hazır not listeleri
          // metnin kendisiyle yetinir (eski ekran davranışıyla birebir).
          <li key={n.key ?? n.text} className={n.level}>
            <span className="mark" aria-hidden="true">{MARK[n.level]}</span>
            <span>{n.text}</span>
          </li>
        ))}
      </ul>
    </>
  )
}
