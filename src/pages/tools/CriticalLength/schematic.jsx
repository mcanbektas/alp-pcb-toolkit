import Schematic, { Terminal } from '../../../components/Schematic'
import { fmtEng } from '../../../lib/num'

// Sürücü → hat → alıcı. Altta iki ölçü çubuğu: kritik uzunluk eşiği ve
// (girildiyse) gerçek hat uzunluğu. İkisi aynı ölçeğe göre çizilir, böylece
// hangisinin uzun olduğu doğrudan görülür. Renk yazılmaz; sınıflar theme.css'ten.
export default function CriticalLengthSchematic({ r }) {
  const x0 = 24
  const x1 = 236
  const span = x1 - x0

  const critical = r.ok ? r.critical : null
  const length = r.ok && r.hasLength ? r.length : null

  // Ortak ölçek: uzun olan çubuk tam genişliği kaplar
  const scale = critical > 0 ? Math.max(critical, length ?? 0) : 0
  const critW = scale > 0 ? (critical / scale) * span : 0
  const lenW = scale > 0 && length > 0 ? (length / scale) * span : 0

  const caption = r.ok
    ? length > 0
      ? r.transmissionLine
        ? 'Hat kritik uzunluğun üstünde — iletim hattı değerlendirmesi gerekir'
        : 'Hat kritik uzunluğun altında — seçilen kriterde toplu eleman'
      : 'Yalnızca eşik gösteriliyor; hat uzunluğu girilmedi'
    : 'Sürücü, hat ve alıcı'

  return (
    <Schematic
      viewBox="0 0 260 140"
      title="Sürücü, hat ve kritik uzunluk karşılaştırması"
      caption={caption}
    >
      {/* Sürücü ve alıcı */}
      <rect className="sch-part" x={10} y={18} width={34} height={26} rx={2} />
      <rect className="sch-part" x={216} y={18} width={34} height={26} rx={2} />
      <text className="sch-label dim" x={27} y={35} textAnchor="middle">SÜR</text>
      <text className="sch-label dim" x={233} y={35} textAnchor="middle">ALC</text>

      {/* Hat ve dönüş yolu */}
      <g className="sch-wire">
        <line x1={44} x2={216} y1={31} y2={31} />
      </g>
      <rect className="sch-dielectric" x={x0} y={38} width={span} height={9} />
      <rect className="sch-copper" x={x0} y={47} width={span} height={4} />

      <Terminal x={44} y={31} r={3} />
      <Terminal x={216} y={31} r={3} />

      {r.ok && (
        <>
          <text className="sch-value" x={130} y={16} textAnchor="middle">
            {r.hasLength
              ? `t_d = ${fmtEng(r.delay, 's', 3)} · t_r = ${fmtEng(r.tr, 's', 3)}`
              : `t_r = ${fmtEng(r.tr, 's', 3)}`}
          </text>

          {/* Eşik çubuğu */}
          <text className="sch-value" x={x0} y={70}>L_crit</text>
          <rect className="sch-copper-fill" x={x0} y={74} width={critW} height={10} />
          <text className="sch-value" x={x1} y={70} textAnchor="end">
            {fmtEng(r.critical, 'm', 3)}
          </text>

          {/* Hat uzunluğu çubuğu */}
          {length > 0 && (
            <>
              <text className="sch-value" x={x0} y={102}>L</text>
              <rect className="sch-copper" x={x0} y={106} width={lenW} height={10} />
              <text className="sch-value" x={x1} y={102} textAnchor="end">
                {fmtEng(length, 'm', 3)}
              </text>
              {/* Eşiğin bittiği yeri gösteren kesikli dikey çizgi */}
              <line
                className="sch-wire sch-dash"
                x1={x0 + critW} x2={x0 + critW} y1={74} y2={118}
              />
            </>
          )}

          {/* Ölçü tabanı */}
          <g className="sch-dim">
            <line x1={x0} x2={x1} y1={130} y2={130} />
            <line x1={x0} x2={x0} y1={126} y2={134} />
            <line x1={x1} x2={x1} y1={126} y2={134} />
          </g>
          <text className="sch-value" x={130} y={126} textAnchor="middle">
            ölçek: {fmtEng(scale, 'm', 3)}
          </text>
        </>
      )}
    </Schematic>
  )
}
