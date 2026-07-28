import Schematic from '../../../components/Schematic'
import { fmtEng } from '../../../lib/num'
import { STRUCT_STRIPLINE } from './model'

// Kenar bağlı diferansiyel çift kesiti. İki hat aynı katmanda, aralarında S.
export default function DiffPairSchematic({ r, form }) {
  const structure = r.ok ? r.structure : form.structure
  const isStripline = structure === STRUCT_STRIPLINE

  const cx = 130
  const half = 26
  const gap = 26
  const traceY = isStripline ? 72 : 54
  const traceH = isStripline ? 8 : 10

  const leftX = cx - gap / 2 - half * 2
  const rightX = cx + gap / 2

  // Yazı yerleşimi. Stripline'da hat ile üst düzlem arasında 31 px kalıyor;
  // W değeri oraya sığmadığı için üst düzlemin üstüne, W etiketiyle aynı
  // eksende yazılıyor. S değeri de stripline'da düzlemlerin altına düşüyor.
  const wLabelY = traceY - 18
  const wValueY = isStripline ? 26 : traceY - 32
  const sLabelY = traceY + traceH + 24
  const sValueY = isStripline ? 131 : traceY + traceH + 38
  // H ölçüsü sağda: etiket ve değer ölçü çizgisinin solunda kalıyor, aksi
  // hâlde dielektrik sağ kenarını ve viewBox'ı aşıyorlar.
  const dimX = 228
  const hTextX = 218
  const hLabelY = isStripline ? 92 : 76
  const hValueY = isStripline ? 107 : 92
  const refBottom = isStripline ? 113 : 108

  return (
    <Schematic
      viewBox="0 0 260 160"
      title="Diferansiyel çift kesiti"
      caption={isStripline
        ? 'Edge-coupled stripline — çift iki düzlem arasında'
        : 'Edge-coupled microstrip — çift üst yüzeyde, altta tek düzlem'}
    >
      {isStripline ? (
        <>
          <rect className="sch-copper" x={20} y={34} width={220} height={7} />
          <rect className="sch-dielectric" x={20} y={41} width={220} height={72} />
          <rect className="sch-copper" x={20} y={113} width={220} height={7} />
        </>
      ) : (
        <>
          <rect className="sch-dielectric" x={20} y={64} width={220} height={44} />
          <rect className="sch-copper" x={20} y={108} width={220} height={7} />
        </>
      )}

      {/* İki hat */}
      <rect className="sch-copper" x={leftX} y={traceY} width={half * 2} height={traceH} />
      <rect className="sch-copper" x={rightX} y={traceY} width={half * 2} height={traceH} />

      {/* Genişlik ve aralık ölçüleri */}
      <g className="sch-dim">
        <line x1={leftX} x2={leftX + half * 2} y1={traceY - 10} y2={traceY - 10} />
        <line x1={leftX} x2={leftX} y1={traceY - 15} y2={traceY - 5} />
        <line x1={leftX + half * 2} x2={leftX + half * 2} y1={traceY - 15} y2={traceY - 5} />

        <line x1={leftX + half * 2} x2={rightX} y1={traceY + traceH + 12} y2={traceY + traceH + 12} />
        <line x1={leftX + half * 2} x2={leftX + half * 2} y1={traceY + traceH + 7} y2={traceY + traceH + 17} />
        <line x1={rightX} x2={rightX} y1={traceY + traceH + 7} y2={rightX ? traceY + traceH + 17 : 0} />
      </g>
      <text className="sch-label" x={leftX + half} y={wLabelY} textAnchor="middle">W</text>
      <text className="sch-label" x={cx} y={sLabelY} textAnchor="middle">S</text>

      {/* Referans mesafesi */}
      <g className="sch-dim">
        <line x1={dimX} x2={dimX} y1={traceY} y2={refBottom} />
        <line x1={dimX - 6} x2={dimX + 6} y1={traceY} y2={traceY} />
        <line x1={dimX - 6} x2={dimX + 6} y1={refBottom} y2={refBottom} />
      </g>
      <text className="sch-label" x={hTextX} y={hLabelY} textAnchor="end">H</text>

      {r.ok && (
        <>
          <text className="sch-value" x={leftX + half} y={wValueY} textAnchor="middle">
            {fmtEng(r.W, 'm', 3)}
          </text>
          <text className="sch-value" x={cx} y={sValueY} textAnchor="middle">
            {fmtEng(r.S, 'm', 3)}
          </text>
          <text className="sch-value" x={hTextX} y={hValueY} textAnchor="end">
            {fmtEng(r.H, 'm', 3)}
          </text>
          <text className="sch-value" x={24} y={152}>
            Z_diff = {fmtEng(r.Zdiff, 'Ω', 4)}
          </text>
        </>
      )}
    </Schematic>
  )
}
