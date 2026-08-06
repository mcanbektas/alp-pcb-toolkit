// Üç yasal sayfanın ORTAK ekranı. Her belge için ayrı bileşen yazılmadı:
// düzen üçünde birebir aynı, farklı olan yalnız `legalText(lang).docs[key]`
// altındaki içerik. Üç kopya, birinde düzeltilen bir boşluk hatasının
// diğer ikisinde kalması demekti.
//
// Metin `data/legalText.js`ten gelir; burada çıplak dize YOKTUR.

import { useLang } from '../hooks/useLang'
import { commonText } from '../data/uiText'
import { legalDoc } from '../data/legalPages'
import { CONTROLLER, isControllerPlaceholder, legalText } from '../data/legalText'
import { pick } from '../lib/i18n'
import LangLink from '../components/LangLink'

// Kimlik bloğunun satır sırası — sabit tutulur ki iki dilde de aynı okunsun.
const CONTROLLER_ROWS = ['legalName', 'address', 'taxOffice', 'taxNumber', 'mersis', 'kep', 'contactEmail']

export default function LegalPage({ docKey }) {
  const { lang } = useLang()
  const ui = commonText(lang)
  const text = legalText(lang)
  const meta = legalDoc(docKey)
  const doc = text.docs[docKey]

  // Kayıt ile metin ayrışmışsa sessiz boş sayfa yerine bilinen hata sayfası.
  if (!meta || !doc) {
    return (
      <div className="tool-header">
        <h1>{ui.notFoundTitle}</h1>
        <LangLink className="backlink" to="/">{ui.backHome}</LangLink>
      </div>
    )
  }

  return (
    <>
      <div className="tool-header">
        <h1>{pick(meta.title, lang)}</h1>
        <p>{doc.lead}</p>
      </div>

      <article className="legal-doc">
        {/* Kimlik bilgisi doldurulmadan sayfa yayına girerse görünür olsun —
            sessiz bir `[DOLDURULACAK]` satırı gözden kaçardı. */}
        {isControllerPlaceholder() && (
          <p className="legal-warn" role="status">{text.placeholderWarning}</p>
        )}

        {doc.sections.map((section) => (
          <section className="panel" key={section.heading}>
            <h2>{section.heading}</h2>
            {section.body?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            {section.list && (
              <ul className="legal-list">
                {section.list.map((item) => <li key={item}>{item}</li>)}
              </ul>
            )}
            {section.note && <p className="legal-note">{section.note}</p>}
          </section>
        ))}

        <section className="panel">
          <h2>{text.controllerLine}</h2>
          <dl className="legal-meta">
            {CONTROLLER_ROWS.map((row) => (
              <div className="legal-meta-row" key={row}>
                <dt>{text.controllerLabels[row]}</dt>
                <dd>{CONTROLLER[row]}</dd>
              </div>
            ))}
          </dl>
        </section>

        <p className="legal-updated">{text.updatedLabel}: {text.updated}</p>
      </article>

      <LangLink className="backlink" to="/">{ui.backHome}</LangLink>
    </>
  )
}
