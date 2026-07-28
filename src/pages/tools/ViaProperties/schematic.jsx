import Schematic, { CurrentArrow } from '../../../components/Schematic'
import { fmtEng } from '../../../lib/num'

// Via kesiti: kart içinden geçen kaplanmış delik, üstte ve altta pad,
// pad çevresinde antipad boşluğu. Ölçüler orantılı değildir.
//
// Yerleşim kuralı: hiçbir yazı bakır ya da dielektrik dolgunun üstüne düşmez.
// Yazılar üç ayrı bölgede durur — üstte pad/antipad etiket şeridi, sağda kart
// kalınlığı sütunu, altta değer satırları. Kesit bu yüzden sola alındı
// (cx = 100): kart kalınlığı değeri eskiden sağda viewBox'ı aşıyordu.
export default function ViaSchematic({ r }) {
  const live = r.ok
  const cx = 100
  const top = 36
  const bottom = 112
  const holeHalf = 16
  const wallW = 6
  const padHalf = 30
  const antiHalf = 46

  const boardL = 10
  const boardR = 190
  const wallIn = cx + holeHalf // sağ duvarın delik tarafı kenarı
  const wallOut = cx + holeHalf + wallW // sağ duvarın dielektrik tarafı kenarı
  const holeDimY = (top + bottom) / 2 // delik ölçüsü kesitin ortasında

  // t_p ölçüsü pad'in altında, duvar kenarlarından inen uzatma çizgileriyle
  const tpExtTop = bottom + 9
  const tpExtBottom = 142
  const tpDimY = 138

  // Kart kalınlığı ölçüsü kartın sağ dışında; etiket ve değer kendi sütununda
  const hDimX = 197
  const hTickL = boardR
  const hTickR = 204
  const colX = 210

  // Boş girdi hâlinde alt değer satırları çizilmiyor; viewBox da kısalıyor
  const vbH = live ? 182 : 150

  return (
    <Schematic
      viewBox={`0 0 280 ${vbH}`}
      title="Via kesiti"
      caption="Kaplanmış delik kesiti — akım yalnızca duvar bakırından geçer"
    >
      {/* Kart gövdesi, delik boşluğu iki parça olarak çizilir */}
      <rect
        className="sch-dielectric"
        x={boardL}
        y={top}
        width={cx - holeHalf - wallW - boardL}
        height={bottom - top}
      />
      <rect
        className="sch-dielectric"
        x={wallOut}
        y={top}
        width={boardR - wallOut}
        height={bottom - top}
      />

      {/* Antipad boşluğu — iç katman bakırının çekildiği bölge.
          Çizgiler kartın üstünde 8 px devam ediyor ki "antipad" etiketi
          dolgunun üstüne inmeden çizgiye bağlanabilsin. */}
      <g className="sch-dim">
        <line x1={cx - antiHalf} x2={cx - antiHalf} y1={top - 8} y2={bottom} />
        <line x1={cx + antiHalf} x2={cx + antiHalf} y1={top - 8} y2={bottom} />
      </g>

      {/* Barrel duvarları */}
      <rect className="sch-copper" x={cx - holeHalf - wallW} y={top} width={wallW} height={bottom - top} />
      <rect className="sch-copper" x={wallIn} y={top} width={wallW} height={bottom - top} />

      {/* Padler */}
      <rect className="sch-copper" x={cx - padHalf} y={top - 6} width={padHalf * 2} height={6} />
      <rect className="sch-copper" x={cx - padHalf} y={bottom} width={padHalf * 2} height={6} />

      {/* Akım yönü — duvarlardan aşağı */}
      <CurrentArrow x={cx - holeHalf - wallW / 2} y={bottom - 8} dir="down" len={26} label={null} />
      <CurrentArrow x={cx + holeHalf + wallW / 2} y={bottom - 8} dir="down" len={26} label={null} />

      {/* Delik çapı ölçüsü — kesitin ortasında, delik boşluğunun içinde */}
      <g className="sch-dim">
        <line x1={cx - holeHalf} x2={cx + holeHalf} y1={holeDimY} y2={holeDimY} />
        <line x1={cx - holeHalf} x2={cx - holeHalf} y1={holeDimY - 6} y2={holeDimY + 6} />
        <line x1={cx + holeHalf} x2={cx + holeHalf} y1={holeDimY - 6} y2={holeDimY + 6} />
      </g>
      {/* Etiket ölçü çizgisinin üstünde, delik boşluğunda: iki yandaki duvar
          bakırına 5.8 px, ölçü çizgisine 7.1 px açıklık kalıyor. */}
      <text className="sch-label" x={cx} y={holeDimY - 10} textAnchor="middle">D_f</text>
      {/* Değer kartın altındaki ilk satırda, deliğin ekseninde ortalı */}
      {live && <text className="sch-value" x={cx} y={158} textAnchor="middle">{fmtEng(r.Df, 'm', 3)}</text>}

      {/* Kaplama kalınlığı — duvar kenarlarından pad'in altına inen uzatma
          çizgileri, aralarındaki kısa ölçü çizgisi ve sağa çekilen kuyruk.
          Etiketle değer duvarın sağında; 6 px'lik duvar bakırının üstünde
          yazı bırakılmıyor, orada okunmuyordu. */}
      <g className="sch-dim">
        <line x1={wallIn} x2={wallIn} y1={tpExtTop} y2={tpExtBottom} />
        <line x1={wallOut} x2={wallOut} y1={tpExtTop} y2={tpExtBottom} />
        <line x1={wallOut} x2={136} y1={tpDimY} y2={tpDimY} />
      </g>
      <text className="sch-label" x={144} y={tpExtBottom}>t_p</text>
      {live && (
        <text className="sch-value" x={144} y={158}>
          {fmtEng(r.tp, 'm', 3)}
        </text>
      )}

      {/* Kart kalınlığı — ölçü kartın sağ dışına alındı, etiket ve değer
          dielektrik dolgunun dışında kendi sütununda alt alta duruyor. */}
      <g className="sch-dim">
        <line x1={hDimX} x2={hDimX} y1={top} y2={bottom} />
        <line x1={hTickL} x2={hTickR} y1={top} y2={top} />
        <line x1={hTickL} x2={hTickR} y1={bottom} y2={bottom} />
      </g>
      <text className="sch-label" x={colX} y={70}>H</text>
      {live && <text className="sch-value" x={colX} y={86}>{fmtEng(r.H, 'm', 3)}</text>}

      {/* Pad ve antipad etiketleri kartın üstündeki şeritte: pad yazısı pad'in
          üstünde, antipad yazısı antipad çizgisinin ekseninde. Aralarında 12 px
          açıklık var — 4 px'te iki etiket tek ifade gibi ("pad antipad") okunuyordu. */}
      <text className="sch-label dim" x={110} y={20} textAnchor="end">pad</text>
      <text className="sch-label dim" x={cx + antiHalf} y={20} textAnchor="middle">antipad</text>

      {live && (
        <text className="sch-value" x={140} y={174} textAnchor="middle">
          barrel kesiti {fmtEng(r.area, 'm²', 3)}
        </text>
      )}
    </Schematic>
  )
}
