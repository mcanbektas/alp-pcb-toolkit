import Schematic, { Node } from '../../../components/Schematic'
import { fmtEng } from '../../../lib/num'
import { MODE_MIN } from './model'

// Bir kapasitör kolu: düzlemden aşağı seri ESL, seri ESR ve kapasitör.
// `ideal` kolda ESL/ESR kutuları sönük ve kesikli çizilir — minimum kapasite
// modelinin bu iki terimi içermediğini şemada da gösterir.
function CapBranch({ x, ideal, label, showTags }) {
  const railTop = 32
  const railBottom = 140

  return (
    <g>
      <g className="sch-wire">
        <line x1={x} x2={x} y1={railTop} y2={44} />
        <line x1={x} x2={x} y1={58} y2={66} />
        <line x1={x} x2={x} y1={80} y2={92} />
        {/* Değer yazısı için tel iki parçaya ayrılır */}
        <line x1={x} x2={x} y1={98} y2={label ? 104 : railBottom} />
        {label && <line x1={x} x2={x} y1={118} y2={railBottom} />}
      </g>

      <rect className={`sch-part${ideal ? ' off sch-dash' : ''}`} x={x - 11} y={44} width={22} height={14} rx={2} />
      <rect className={`sch-part${ideal ? ' off sch-dash' : ''}`} x={x - 11} y={66} width={22} height={14} rx={2} />

      {/* Kapasitör plakaları */}
      <g className="sch-wire">
        <line x1={x - 12} x2={x + 12} y1={92} y2={92} />
        <line x1={x - 12} x2={x + 12} y1={98} y2={98} />
      </g>

      <Node x={x} y={railTop} />
      <Node x={x} y={railBottom} />

      {showTags && (
        <>
          <text className="sch-label dim" x={x - 15} y={55} textAnchor="end">ESL</text>
          <text className="sch-label dim" x={x - 15} y={77} textAnchor="end">ESR</text>
        </>
      )}

      {label && (
        <text className="sch-value" x={x} y={114} textAnchor="middle">{label}</text>
      )}
    </g>
  )
}

export default function DecouplingSchematic({ r, mode }) {
  const isMin = mode === MODE_MIN

  // Ağ modunda en çok üç kol çizilir; sayısal sonuç tabloda tamdır.
  const items = r.ok && !isMin ? r.items.slice(0, 3) : []
  const shown = isMin ? 1 : (items.length || 2)
  const xs = (isMin ? [104] : [58, 110, 162]).slice(0, shown)

  return (
    <Schematic
      viewBox="0 0 260 170"
      title={isMin ? 'İdeal decoupling kapasitörü' : 'Paralel decoupling ağı'}
      caption={isMin
        ? 'Minimum kapasite modeli ideal kapasitördür — ESL ve ESR kesikli, çünkü hesaba girmez'
        : 'Her kapasitör seri ESL ve ESR ile modellenir; montaj ve via endüktansı bu modelde yoktur'}
    >
      {/* Güç ve toprak düzlemleri */}
      <rect className="sch-copper" x={20} y={26} width={220} height={6} />
      <rect className="sch-copper" x={20} y={140} width={220} height={6} />
      <text className="sch-label dim" x={20} y={20}>güç düzlemi</text>
      <text className="sch-label dim" x={20} y={162}>toprak düzlemi</text>

      {/* Yük — anlık akımı çeken komponent */}
      <rect className="sch-part" x={196} y={58} width={44} height={54} rx={3} />
      <text className="sch-label" x={218} y={90} textAnchor="middle">yük</text>
      <g className="sch-wire">
        <line x1={218} x2={218} y1={32} y2={58} />
        <line x1={218} x2={218} y1={112} y2={140} />
      </g>
      <Node x={218} y={32} />
      <Node x={218} y={140} />

      {xs.map((x, i) => (
        <CapBranch
          key={x}
          x={x}
          ideal={isMin}
          showTags={i === 0}
          label={
            isMin
              ? (r.ok ? fmtEng(r.C, 'F', 3) : null)
              : (items[i] ? fmtEng(items[i].C, 'F', 3) : null)
          }
        />
      ))}

      {r.ok && !isMin && r.items.length > 3 && (
        <text className="sch-value" x={22} y={114}>+{r.items.length - 3}</text>
      )}
    </Schematic>
  )
}
