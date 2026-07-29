import { forwardRef } from 'react'
import Schematic, { Node } from '../../../components/Schematic'
import { fmtEng } from '../../../lib/num'
import { MODE_MIN } from './model'

// Bir kapasitör kolu: düzlemden aşağı seri ESL, seri ESR ve kapasitör.
// `ideal` kolda ESL/ESR kutuları sönük ve kesikli çizilir — minimum kapasite
// modelinin bu iki terimi içermediğini şemada da gösterir.
//
// Yerleşim kuralı: her etiket kutusu, çizim elemanlarının ÇİZİLİ KENARINDAN
// (tel kalınlığının yarısı düşülerek) en az 3 px ve başka bir yazı kutusundan
// en az 2 px uzakta durur. Kutu ölçüleri theme.css'ten gelir: .sch-label 11 px,
// .sch-value 10 px, tek aralıklı yazıda karakter genişliği ≈ 0.62·fs, kutu =
// [y − 0.78·fs , y + 0.22·fs]; tel kalınlığı 2 px → yarım kalınlık 1 px.
// En uzun makul kapasite yazısı dokuz hanedir ("0.0001 pF" → 55.8 px), bu yüzden
// kollar düzleme 60 px arayla oturur: komşu değer yazıları arasında 4.2 px kalır.
// Değer yazısı kolun telini kestiği için tel o hizada iki parça çizilir; yazı
// kutusu [106.2, 116.2] olduğundan parçalar 101'de biter ve 122'de başlar.
function CapBranch({ x, ideal, label, showTags }) {
  const railTop = 32
  const railBottom = 140

  return (
    <g>
      <g className="sch-wire">
        <line x1={x} x2={x} y1={railTop} y2={44} />
        <line x1={x} x2={x} y1={58} y2={66} />
        <line x1={x} x2={x} y1={80} y2={92} />
        {/* Değer yazısı için tel iki parçaya ayrılır: yazı kutusu [106.2, 116.2] */}
        <line x1={x} x2={x} y1={98} y2={label ? 101 : railBottom} />
        {label && <line x1={x} x2={x} y1={122} y2={railBottom} />}
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
          {/* Kutular x−11'de başlıyor; etiket 16 px solda bitince kenara 4 px kalır */}
          <text className="sch-label dim" x={x - 16} y={55} textAnchor="end">ESL</text>
          <text className="sch-label dim" x={x - 16} y={77} textAnchor="end">ESR</text>
        </>
      )}

      {label && (
        <text className="sch-value" x={x} y={114} textAnchor="middle">{label}</text>
      )}
    </g>
  )
}

// `ref` yalnızca rapor üretimi için Schematic'e iletilir — bkz. report.js.
const DecouplingSchematic = forwardRef(function DecouplingSchematic({ r, mode, text }, ref) {
  const isMin = mode === MODE_MIN

  // Ağ modunda en çok üç kol çizilir; sayısal sonuç tabloda tamdır.
  const items = r.ok && !isMin ? r.items.slice(0, 3) : []
  const shown = isMin ? 1 : (items.length || 2)
  // Kol aralığı 60 px: dokuz haneli değer yazıları yan yana 4.2 px açıklıkla
  // sığar ve en sağdaki yazı yük kutusunun kenarına 5.1 px mesafede kalır.
  const xs = (isMin ? [104] : [42, 102, 162]).slice(0, shown)

  return (
    <Schematic
      ref={ref}
      viewBox="0 0 260 170"
      title={isMin ? text.titleMin : text.titleNet}
      caption={isMin ? text.captionMin : text.captionNet}
    >
      {/* Güç ve toprak düzlemleri */}
      <rect className="sch-copper" x={20} y={26} width={220} height={6} />
      <rect className="sch-copper" x={20} y={140} width={220} height={6} />
      {/* Yazı kutusu [10.4, 21.4]; düzlemin çizili üst kenarına 3.6 px kalır */}
      <text className="sch-label dim" x={20} y={19}>{text.powerPlane}</text>
      <text className="sch-label dim" x={20} y={162}>{text.groundPlane}</text>

      {/* Yük — anlık akımı çeken komponent */}
      <rect className="sch-part" x={196} y={58} width={44} height={54} rx={3} />
      <text className="sch-label" x={218} y={90} textAnchor="middle">{text.load}</text>
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

      {/* Çizilmeyen kollar: son kolun telinden ve yük kutusundan uzakta,
          değer yazılarının bir satır altında durur */}
      {r.ok && !isMin && r.items.length > 3 && (
        <text className="sch-value" x={190} y={132} textAnchor="middle">+{r.items.length - 3}</text>
      )}
    </Schematic>
  )
})

export default DecouplingSchematic
