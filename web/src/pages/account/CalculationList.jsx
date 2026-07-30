// Proje detayındaki kaydedilmiş hesap listesi — sunum bileşeni.
//
// `Project.jsx`'ten ayrıldı: sayfa yükleme + ad/açıklama düzenleme + liste +
// sıralama + rapor indirmeyi tek dosyada tutuyordu (SRP ihlali, ~370 satır).
// Bu bileşen yalnızca listeyi çizer; veri türevlerini (`rows`) ve eylemleri
// (`onMove`/`onDelete`) prop olarak alır, kendi state'i ya da ağ çağrısı yoktur.
//
// GÜVENLİK (Project.jsx'ten taşınan kural): hiçbir satırda ham `reportJson`
// DOM'a yazılmaz — `rows` içindeki `preview` sunucunun türettiği düz
// etiket/değer/birim dizeleridir; ham bölüm (ve içindeki satır içi SVG)
// istemciye hiç gelmez.

import { Link } from 'react-router-dom'
import { reportDateStamp } from '../../data/reportText'

export default function CalculationList({ rows, count, pt, calcStatus, onMove, onDelete }) {
  return (
    <section className="panel">
      <h2>{pt.calcsHeading}</h2>

      {calcStatus && <p className="field-hint danger">{calcStatus.text}</p>}

      {rows.length === 0 ? (
        <p className="empty-note">{pt.calcsEmpty}</p>
      ) : (
        <div className="tool-list">
          {rows.map(({ calc, label, preview, mode, stale, openHref }, i) => (
            <div key={calc.id} className="tool-row">
              <span className="name">
                {label}
                {mode && <span className="sub"> · {mode}</span>}
                <span className="sub"> — {reportDateStamp(new Date(calc.updatedAt))}</span>
                {preview.map((row, ri) => (
                  // Etiket benzersiz olmak zorunda değil — anahtar sırayla kurulur.
                  // eslint-disable-next-line react/no-array-index-key
                  <span key={`${ri}-${row.label}`} className="sub">
                    {' · '}{row.label} {row.value}{row.unit ? ` ${row.unit}` : ''}
                  </span>
                ))}
                {!calc.hasReport && <span className="chip"> {pt.noReportTag}</span>}
                {stale && <span className="chip"> {pt.staleTag}</span>}
              </span>
              <span className="report-actions">
                {openHref && (
                  <Link className="row-add" to={openHref} aria-label={pt.openAria(label)}>
                    {pt.openLabel}
                  </Link>
                )}
                <button
                  type="button"
                  className="row-add"
                  disabled={i === 0}
                  onClick={() => onMove(calc, -1)}
                  aria-label={pt.moveUpAria(label)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="row-add"
                  disabled={i === count - 1}
                  onClick={() => onMove(calc, 1)}
                  aria-label={pt.moveDownAria(label)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="row-add"
                  onClick={() => onDelete(calc)}
                  aria-label={pt.deleteAria(label)}
                >
                  {pt.deleteLabel}
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
