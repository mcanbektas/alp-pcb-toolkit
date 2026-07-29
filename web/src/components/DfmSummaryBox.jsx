// Kopyalanabilir DFM özeti kutusu — dört üretim/DFM ekranının paylaştığı
// sunum. Metni saf katman (`lib/dfmSummary.js`) üretir; burada yalnızca
// gösterim ve pano erişimi vardır.
//
// Pano çalışmasa da metin her zaman <pre> içinde görünür: kullanıcı elle
// seçip kopyalayabilir, özet erişilemez hâle gelmez.
//
// Kendi çerçeve metnini `dfmText(lang)`'ten okur — `ProfilePanel` ve
// `DfmChecks` ile aynı gerekçe.

import { useLang } from '../hooks/useLang'
import { dfmText } from '../data/dfmText'
import useClipboard, { COPY_DONE, COPY_FAILED } from '../hooks/useClipboard'

// Kopyalama simgesi — kod bloklarının alışıldık işareti. Renk `currentColor`
// üzerinden gelir (SVG'ye literal renk yazılmaz), boyut tema sınıfından.
function CopyIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <rect
        x="5.75" y="5.75" width="7.5" height="8.5" rx="1.5"
        fill="none" stroke="currentColor" strokeWidth="1.3"
      />
      <path
        d="M10.25 3.25H3.75a1 1 0 0 0-1 1v6.5"
        fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"
      />
    </svg>
  )
}

function DoneIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M3 8.5 6.4 12 13 4.6"
        fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  )
}

export default function DfmSummaryBox({ text }) {
  const { lang } = useLang()
  const dfm = dfmText(lang)
  const { copy, state } = useClipboard()

  if (typeof text !== 'string' || text === '') return null

  const done = state === COPY_DONE
  // Düğmenin görünen yüzü simge; cümle ipucuna ve ekran okuyucuya gider.
  const label = done ? dfm.summary.copied : dfm.summary.copy

  return (
    <div>
      <h2 className="section">{dfm.summary.title}</h2>

      {/* Düğme kutunun SAĞ ÜST köşesine oturur (kod bloğu deseni). Konumlandırma
          <pre>'ye değil sarmalayıcıya bağlanır: <pre> kendi içinde kayabiliyor
          (max-height + overflow) ve düğme onun içinde olsaydı metinle birlikte
          yukarı kayıp gözden kaybolurdu. */}
      <div className="copy-box">
        <button
          type="button"
          className={`copy-btn${done ? ' done' : ''}`}
          onClick={() => copy(text)}
          title={label}
          aria-label={label}
        >
          {done ? <DoneIcon /> : <CopyIcon />}
          {done && <span>{dfm.summary.copied}</span>}
        </button>

        <pre className="formula summary-box">{text}</pre>
      </div>

      {state === COPY_FAILED && <p className="empty-note warn">{dfm.profile.copyFailed}</p>}
    </div>
  )
}
