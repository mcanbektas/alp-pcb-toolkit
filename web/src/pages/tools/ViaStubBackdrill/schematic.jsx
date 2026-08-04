import { forwardRef } from 'react'
import Schematic from '../../../components/Schematic'
import { fmtEng } from '../../../lib/num'

// Via kesiti: üstte kullanılan (fonksiyonel) bölüm, altında açık uçlu stub.
// Backdrill uygulandıysa alttan kaldırılan derinlik boşluk olarak, kalan
// residual stub ayrı bir bölüm olarak çizilir.
//
// Bölüm YÜKSEKLİKLERİ sabit/illüstratiftir (ReturnPathStitchingVia'daki gibi
// gerçek boyla ORANTILI değildir) — via toplam uzunluğu geniş bir aralıkta
// değiştiği için gerçek oranla çizilse çok kısa ya da çok uzun stub'larda
// diyagram okunaksızlaşırdı. Gerçek uzunluklar sayı olarak etiketlenir.
//
// `ref` yalnızca rapor üretimi için Schematic'e iletilir — bkz. report.js.
const USED_FRAC = 0.32
const RESIDUAL_FRAC = 0.16

const ViaStubSchematic = forwardRef(function ViaStubSchematic({ r, text }, ref) {
  const live = r.ok
  const hasBackdrill = live && r.hasBackdrill && r.residual != null

  const boardL = 80
  const boardR = 160
  const topY = 20
  const bottomY = 220
  const boardH = bottomY - topY
  const breakY = topY + USED_FRAC * boardH
  const cutY = hasBackdrill ? breakY + RESIDUAL_FRAC * boardH : bottomY

  const cx = (boardL + boardR) / 2
  const dimX = boardR + 6
  const labelX = boardR + 14

  return (
    <Schematic
      ref={ref}
      viewBox="0 0 240 240"
      title={text.title}
      caption={text.caption(hasBackdrill)}
    >
      {/* Kart gövdesi */}
      <rect className="sch-dielectric" x={boardL} y={topY} width={boardR - boardL} height={boardH} />

      {/* Üstten gelen sinyal izi ve kullanılan (fonksiyonel) via bölümü */}
      <rect className="sch-copper" x={boardL} y={topY - 2} width={cx - boardL - 6} height={4} />
      <rect className="sch-copper" x={cx - 4} y={topY} width={8} height={breakY - topY} />
      <rect className="sch-copper" x={cx - 7} y={topY - 2} width={14} height={4} />

      {/* Stub / residual bölüm — kesikli, "kullanılmayan" bölümü vurgular */}
      <rect className="sch-copper sch-dash" x={cx - 4} y={breakY} width={8} height={cutY - breakY} />

      {/* Backdrill ile kaldırılan bölüm — boşluk (yalnız dielektrik) */}
      {hasBackdrill ? (
        <rect className="sch-dielectric sch-dash" x={cx - 10} y={cutY} width={20} height={bottomY - cutY} />
      ) : (
        <rect className="sch-copper sch-dash" x={cx - 7} y={bottomY - 2} width={14} height={4} />
      )}

      {/* Kullanılan bölüm ölçüsü */}
      <g className="sch-dim">
        <line x1={dimX} x2={dimX} y1={topY} y2={breakY} />
        <line x1={dimX - 4} x2={dimX + 4} y1={topY} y2={topY} />
        <line x1={dimX - 4} x2={dimX + 4} y1={breakY} y2={breakY} />
      </g>
      <text className="sch-label" x={labelX} y={(topY + breakY) / 2} dominantBaseline="middle">
        {text.used}
      </text>
      {live && (
        <text className="sch-value" x={labelX} y={(topY + breakY) / 2 + 12} dominantBaseline="middle">
          {fmtEng(r.usedInput, 'm', 3)}
        </text>
      )}

      {/* Stub / residual ölçüsü */}
      <g className="sch-dim">
        <line x1={dimX} x2={dimX} y1={breakY} y2={cutY} />
        <line x1={dimX - 4} x2={dimX + 4} y1={breakY} y2={breakY} />
        <line x1={dimX - 4} x2={dimX + 4} y1={cutY} y2={cutY} />
      </g>
      <text className="sch-label" x={labelX} y={(breakY + cutY) / 2} dominantBaseline="middle">
        {hasBackdrill ? text.residual : text.stub}
      </text>
      {live && (
        <text className="sch-value" x={labelX} y={(breakY + cutY) / 2 + 12} dominantBaseline="middle">
          {fmtEng(hasBackdrill ? r.residual.nominal : r.stub, 'm', 3)}
        </text>
      )}

      {/* Backdrill ile kaldırılan bölümün ölçüsü */}
      {hasBackdrill && (
        <>
          <g className="sch-dim">
            <line x1={dimX} x2={dimX} y1={cutY} y2={bottomY} />
            <line x1={dimX - 4} x2={dimX + 4} y1={cutY} y2={cutY} />
            <line x1={dimX - 4} x2={dimX + 4} y1={bottomY} y2={bottomY} />
          </g>
          <text className="sch-label dim" x={labelX} y={(cutY + bottomY) / 2} dominantBaseline="middle">
            {text.removed}
          </text>
          {r.removedInput != null && (
            <text className="sch-value" x={labelX} y={(cutY + bottomY) / 2 + 12} dominantBaseline="middle">
              {fmtEng(r.removedInput, 'm', 3)}
            </text>
          )}
        </>
      )}
    </Schematic>
  )
})

export default ViaStubSchematic
