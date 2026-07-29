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

export default function DfmSummaryBox({ text }) {
  const { lang } = useLang()
  const dfm = dfmText(lang)
  const { copy, state } = useClipboard()

  if (typeof text !== 'string' || text === '') return null

  return (
    <div>
      <h2 className="section">{dfm.summary.title}</h2>

      <div className="report-actions">
        <button type="button" className="row-add" onClick={() => copy(text)}>
          {state === COPY_DONE ? dfm.summary.copied : dfm.summary.copy}
        </button>
      </div>

      {state === COPY_FAILED && <p className="empty-note warn">{dfm.profile.copyFailed}</p>}

      <pre className="formula summary-box">{text}</pre>
    </div>
  )
}
