// DFM kontrol tablosu — dört üretim/DFM ekranının paylaştığı sunum.
//
// Bileşen hesap yapmaz ve birim bilmez: satırlar ekran tarafından **hazır
// biçimlenmiş dize** olarak gelir (`{ id, label, actual, required, margin,
// status, source, reason }`). Yuvarlama ve birim seçimi ekranın işidir, o
// yüzden burada `fmt` çağrısı yoktur.
//
// Kendi çerçeve metnini (`Kontrol`, `Tasarım`, `Sınır`, `Marj`, durum adları)
// `dfmText(lang)`'ten okur — dört ekranda birebir aynı olduğu için prop olarak
// geçirilmez; `ProfilePanel` ile aynı gerekçe.
//
// Değerlendirilemeyen kontrol gizlenmez. Bir kontrolü listeden düşürmek,
// "hepsi geçti" görünümü üretir ve ölçülmemiş olanı ölçülmüş gibi gösterirdi.

import { useLang } from '../hooks/useLang'
import { dfmText } from '../data/dfmText'
import { STATUS_UNKNOWN } from '../lib/dfmCheck'

const MARK = { ok: '✓', warning: '!', danger: '×', unknown: '·' }

export default function DfmChecks({ rows = [] }) {
  const { lang } = useLang()
  const dfm = dfmText(lang)

  if (rows.length === 0) {
    return <p className="empty-note">{dfm.checks.none}</p>
  }

  return (
    <table className="result-table">
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <td>
              <span className={`mark ${row.status}`} aria-hidden="true">{MARK[row.status]}</span>
              {' '}
              {row.label}
              <span className="sub-line">
                {row.status === STATUS_UNKNOWN
                  ? (row.reason || dfm.statusLabel(row.status))
                  : `${dfm.checks.source}: ${row.source}`}
              </span>
            </td>
            <td>
              {row.status === STATUS_UNKNOWN ? (
                <span className="sub-line">{dfm.statusLabel(row.status)}</span>
              ) : (
                <>
                  {row.actual}
                  <span className="sub-line">
                    {dfm.checks.required} {row.required} · {dfm.checks.margin} {row.margin}
                  </span>
                </>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
