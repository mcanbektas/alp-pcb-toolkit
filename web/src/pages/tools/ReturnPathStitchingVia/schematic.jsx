import { forwardRef } from 'react'
import Schematic from '../../../components/Schematic'
import { fmtEng } from '../../../lib/num'
import { PLANE_GND, PLANE_SPLIT } from './model'

// Dönüş yolu kesiti: üst ve alt sinyal izi, aralarında sinyal via'sı ve iki
// referans düzlemi (başlangıç/hedef). Sinyal via'nın yanında dönüş akımına
// süreklilik veren bir ya da iki stitching via, opsiyonel olarak alternatif
// bir stitching kondansatörü çizilir. Ölçüler orantılı değildir.
//
// Bölünmüş düzlem seçiliyse hedef düzlem via kümesinin altında kesilir —
// gerçek yapıda tam bu noktaya stitching via konamayacağını gösterir, o
// yüzden bu modda stitching via glifleri hiç çizilmez.
//
// `ref` yalnızca rapor üretimi için Schematic'e iletilir — bkz. report.js.
const ReturnPathSchematic = forwardRef(function ReturnPathSchematic({ r, text }, ref) {
  const live = r.ok
  const plane = live ? r.planeType : PLANE_GND
  const split = plane === PLANE_SPLIT
  const n = live ? r.stitchingViaCount : 1
  const hasCap = live && r.hasCapacitor && !!r.capacitor

  const boardL = 20
  const boardR = 280
  const cx = 130 // sinyal via merkezi
  const stitchX = [168, 200].slice(0, split ? 0 : Math.min(n, 2))
  const capX = hasCap ? (split ? 226 : 240) : null

  const topY = 22
  const bottomY = 198
  const planeAY = 60
  const planeAH = 12
  const planeBY = 144
  const planeBH = 12
  const gapL = 92
  const gapR = 176

  const via = (x) => <rect key={x} className="sch-copper" x={x - 3} y={topY} width={6} height={bottomY - topY} />
  const pad = (x, y) => <rect key={`${x}-${y}`} className="sch-copper" x={x - 7} y={y - 2} width={14} height={4} />

  return (
    <Schematic
      ref={ref}
      viewBox="0 -20 300 250"
      title={text.title}
      caption={text.caption(hasCap, plane)}
    >
      {/* Kart gövdesi */}
      <rect className="sch-dielectric" x={boardL} y={topY} width={boardR - boardL} height={bottomY - topY} />

      {/* Başlangıç referans düzlemi — sürekli */}
      <rect className="sch-copper" x={boardL} y={planeAY} width={boardR - boardL} height={planeAH} />

      {/* Hedef referans düzlemi — bölünmüşse via kümesinin altında kesilir */}
      {split ? (
        <>
          <rect className="sch-copper" x={boardL} y={planeBY} width={gapL - boardL} height={planeBH} />
          <rect className="sch-copper" x={gapR} y={planeBY} width={boardR - gapR} height={planeBH} />
          <rect
            className="sch-dielectric sch-dash"
            x={gapL} y={planeBY - 3} width={gapR - gapL} height={planeBH + 6}
          />
        </>
      ) : (
        <rect className="sch-copper" x={boardL} y={planeBY} width={boardR - boardL} height={planeBH} />
      )}

      {/* Üst ve alt sinyal izi */}
      <rect className="sch-copper" x={boardL} y={topY - 2} width={cx - boardL - 6} height={4} />
      <rect className="sch-copper" x={cx + 6} y={bottomY - 2} width={boardR - cx - 6} height={4} />

      {/* Sinyal via'sı ve padleri */}
      {via(cx)}
      {pad(cx, topY)}
      {pad(cx, bottomY)}

      {/* Stitching via(lar) ve padleri */}
      {stitchX.map((x) => (
        <g key={x}>
          {via(x)}
          {pad(x, topY)}
          {pad(x, bottomY)}
        </g>
      ))}

      {/* Alternatif stitching kondansatörü — yüzeyde, iki kısa via ile
          başlangıç ve hedef düzlemine iner */}
      {hasCap && (
        <>
          <rect className="sch-copper" x={capX - 3} y={2} width={6} height={planeAY - 2} />
          <rect className="sch-copper" x={capX - 3} y={planeBY} width={6} height={bottomY - planeBY} />
          <rect className="sch-part" x={capX - 12} y={10} width={24} height={12} rx={2} />
          <text className="sch-label" x={capX} y={topY - 26} textAnchor="middle">{text.capacitor}</text>
        </>
      )}

      {/* Stitching aralığı ölçüsü — sinyal via ile en yakın stitching via
          arasında */}
      {stitchX.length > 0 && (
        <g className="sch-dim">
          <line x1={cx} x2={stitchX[0]} y1={210} y2={210} />
          <line x1={cx} x2={cx} y1={204} y2={216} />
          <line x1={stitchX[0]} x2={stitchX[0]} y1={204} y2={216} />
        </g>
      )}
      {stitchX.length > 0 && (
        <text className="sch-value" x={(cx + stitchX[0]) / 2} y={222} textAnchor="middle">
          {live && r.actualSpacing != null ? fmtEng(r.actualSpacing, 'm', 3) : 's'}
        </text>
      )}

      {/* Etiketler — üstteki şerit İKİ satırdır (26 ve 8 px kart üstünde).
          Tek satırda "sinyal via" (cx = 130) ile "stitching via" (küme
          ortası ≈ 184) kutuları çakışıyordu: aralık 54 px, kutular ~88 px.
          Alt satırda ikisi de dış hizaya çekildi, üst satır sinyal via'ya
          ve (varsa) kondansatöre kaldı. Stitching etiketi via BAŞINA değil
          küme başına bir kez yazılır — iki via'da iki kopya üst üste
          biniyordu. */}
      <text className="sch-label" x={cx} y={topY - 26} textAnchor="middle">{text.signalVia}</text>
      <text className="sch-label" x={boardL + 4} y={topY - 8}>{text.signalTrace}</text>
      {stitchX.length > 0 && (
        <text className="sch-label" x={hasCap ? capX - 20 : boardR - 4} y={topY - 8} textAnchor="end">
          {text.stitchingVia}
        </text>
      )}
      <text className="sch-label" x={boardL + 4} y={planeAY - 4}>{text.planeStart}</text>
      <text className="sch-label" x={boardL + 4} y={planeBY + planeBH + 14}>{text.planeTarget}</text>
      {/* Bölünme etiketi sinyal via'sının SOLUNDA: boşluğun ortası tam
          via çubuğunun üstüne denk geliyordu. */}
      {split && (
        <text className="sch-label dim" x={cx - 10} y={planeBY + planeBH + 30} textAnchor="end">
          {text.planeSplitGap}
        </text>
      )}
      {n > 2 && (
        <text className="sch-value" x={296} y={bottomY + 26} textAnchor="end">{text.countNote(n)}</text>
      )}
    </Schematic>
  )
})

export default ReturnPathSchematic
