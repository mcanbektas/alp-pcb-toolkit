// Proje detayındaki kaydedilmiş hesap listesi — sunum bileşeni.
//
// `Project.jsx`'ten ayrıldı: sayfa yükleme + ad/açıklama düzenleme + liste +
// sıralama + rapor indirmeyi tek dosyada tutuyordu (SRP ihlali, ~370 satır).
// Bu bileşen yalnızca listeyi çizer; veri türevlerini (`rows`) ve eylemi
// (`onDelete`) prop olarak alır, kendi state'i ya da ağ çağrısı yoktur.
//
// Sıralama elle YAPILMAZ: satırlar güncelleme tarihine göre yeniden eskiye
// dizilir ve sıra `Project.jsx`'te kurulur. Yukarı/aşağı düğmeleri buradan
// kaldırıldı — 60 satırlık bir listede tek satırı taşımak için düzinelerce
// tıklama gerekiyordu ve satırda zaten tarih yazıyordu.
//
// GÜVENLİK (Project.jsx'ten taşınan kural): hiçbir satırda ham `reportJson`
// DOM'a yazılmaz — `rows` içindeki `preview` sunucunun türettiği düz
// etiket/değer/birim dizeleridir; ham bölüm (ve içindeki satır içi SVG)
// istemciye hiç gelmez.

// `LangLink` DEĞİL düz `Link`: `openHref` çağıran taraftan (Project.jsx →
// toolLinkFor) zaten geçerli dilin yolu olarak gelir, çevrilecek kanonik bir
// yol yok.
import { Link } from 'react-router-dom'
import { reportDateTimeStamp } from '../../data/reportText'

export default function CalculationList({ rows, pt, calcStatus, onDelete }) {
  return (
    <section className="panel">
      <h2>{pt.calcsHeading}</h2>

      {calcStatus && <p className="field-hint danger">{calcStatus.text}</p>}

      {rows.length === 0 ? (
        <p className="empty-note">{pt.calcsEmpty}</p>
      ) : (
        <div className="tool-list">
          {rows.map(({ calc, label, preview, mode, stale, openHref }) => (
            <div key={calc.id} className="tool-row">
              <span className="name">
                {label}
                {mode && <span className="sub"> · {mode}</span>}
                <span className="sub"> — <strong>{reportDateTimeStamp(new Date(calc.updatedAt))}</strong></span>
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
