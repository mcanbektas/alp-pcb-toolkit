import Schematic, { Terminal } from '../../../components/Schematic'
import { fmtEng } from '../../../lib/num'

// Sürücü → hat → alıcı. Altta iki ölçü çubuğu: kritik uzunluk eşiği ve
// (girildiyse) gerçek hat uzunluğu. İkisi aynı ölçeğe göre çizilir, böylece
// hangisinin uzun olduğu doğrudan görülür. Renk yazılmaz; sınıflar theme.css'ten.
export default function CriticalLengthSchematic({ r, text }) {
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
        ? text.captionAbove
        : text.captionBelow
      : text.captionThresholdOnly
    : text.captionIdle

  return (
    <Schematic
      viewBox="0 0 260 152"
      title={text.title}
      caption={caption}
    >
      {/* Sürücü ve alıcı — kutu genişliği 40, etiket ile uç terminali arasında
          3 px'ten fazla açıklık kalsın diye */}
      <rect className="sch-part" x={6} y={20} width={40} height={22} rx={2} />
      <rect className="sch-part" x={214} y={20} width={40} height={22} rx={2} />
      <text className="sch-label dim" x={26} y={34} textAnchor="middle">{text.driver}</text>
      <text className="sch-label dim" x={234} y={34} textAnchor="middle">{text.receiver}</text>

      {/* Hat ve dönüş yolu — şerit, kutuların altına iner: SÜR/ALC etiketleri
          dielektrik şeridin üstüne binmesin */}
      <g className="sch-wire">
        <line x1={46} x2={214} y1={31} y2={31} />
      </g>
      <rect className="sch-dielectric" x={x0} y={46} width={span} height={9} />
      <rect className="sch-copper" x={x0} y={55} width={span} height={4} />

      <Terminal x={46} y={31} r={3} />
      <Terminal x={214} y={31} r={3} />

      {r.ok && (
        <>
          <text className="sch-value" x={130} y={14} textAnchor="middle">
            {r.hasLength
              ? `t_d = ${fmtEng(r.delay, 's', 3)} · t_r = ${fmtEng(r.tr, 's', 3)}`
              : `t_r = ${fmtEng(r.tr, 's', 3)}`}
          </text>

          {/* Eşik çubuğu — etiket satırı çubuğun 8 px üstünde durur */}
          <text className="sch-value" x={x0} y={70}>L_crit</text>
          <rect className="sch-copper-fill" x={x0} y={78} width={critW} height={10} />
          <text className="sch-value" x={x1} y={70} textAnchor="end">
            {fmtEng(r.critical, 'm', 3)}
          </text>

          {/* Hat uzunluğu çubuğu */}
          {length > 0 && (
            <>
              <text className="sch-value" x={x0} y={101}>L</text>
              <rect className="sch-copper" x={x0} y={108} width={lenW} height={10} />
              <text className="sch-value" x={x1} y={101} textAnchor="end">
                {fmtEng(length, 'm', 3)}
              </text>
              {/* Eşiğin bittiği yeri gösteren kesikli dikey çizgi. İki parça:
                  arada duran L etiketi ve değerinin üstünden geçmemesi için
                  yalnızca çubukların bulunduğu satırlarda çizilir */}
              <line
                className="sch-wire sch-dash"
                x1={x0 + critW} x2={x0 + critW} y1={78} y2={88}
              />
              <line
                className="sch-wire sch-dash"
                x1={x0 + critW} x2={x0 + critW} y1={108} y2={118}
              />
            </>
          )}

          {/* Ölçü tabanı */}
          <g className="sch-dim">
            <line x1={x0} x2={x1} y1={130} y2={130} />
            <line x1={x0} x2={x0} y1={126} y2={134} />
            <line x1={x1} x2={x1} y1={126} y2={134} />
          </g>
          {/* Ölçü çizgisinin altına yazılır; üstüne yazıldığında çizgiyle ve
              uzunluk çubuğuyla çakışıyordu */}
          <text className="sch-value" x={130} y={144} textAnchor="middle">
            {text.scale} {fmtEng(scale, 'm', 3)}
          </text>
        </>
      )}
    </Schematic>
  )
}
