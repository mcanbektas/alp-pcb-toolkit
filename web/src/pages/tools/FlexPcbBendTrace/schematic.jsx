import { forwardRef } from 'react'
import Schematic from '../../../components/Schematic'
import { fmtEng } from '../../../lib/num'

// Flex bükülme kesiti: yatay düz bölge (stiffener/via/pad'in bulunduğu bend
// öncesi alan) rijit bir dönüşle (görsel olarak hep 90°, gerçek θ etikette
// yazılır) dikey bölgeye geçer. Kalınlık iç ve dış yüzey olarak İKİ ayrı
// kavisle çizilir; ikisi arasındaki fark REV2 §15\'in l_outer/l_inner
// ayrımıyla aynı kavramdır. Ölçüler orantılı DEĞİLDİR — bkz. text.schematic.caption.
//
// Merkez (cx, cy) = (150, 90); dış yüzey yarıçapı 60, iç yüzey yarıçapı 52
// (görsel kalınlık 8 px, gerçek t_total etiketle yazılır). Düz bölgede
// (θ=0) dış yüzey y=cy+60=150, iç yüzey y=cy+52=142; dikey bölgede (θ=90°)
// dış yüzey x=cx+60=210, iç yüzey x=cx+52=202.
//
// `ref` yalnızca rapor üretimi için Schematic'e iletilir — bkz. report.js.
const FlexBendSchematic = forwardRef(function FlexBendSchematic({ r, text }, ref) {
  const live = r.ok

  const cx = 150
  const cy = 90
  const rOuter = 60
  const rInner = 52
  const rNeutral = 56
  const rTrace = 58
  const bendStartX = cx // düz bölgenin bend'e değdiği x — dış/iç yüzey burada ortaktır

  const bandPath = `M 40,${cy + rOuter} L ${cx},${cy + rOuter} `
    + `A ${rOuter} ${rOuter} 0 0 1 ${cx + rOuter},${cy} L ${cx + rOuter},30 `
    + `L ${cx + rInner},30 L ${cx + rInner},${cy} `
    + `A ${rInner} ${rInner} 0 0 0 ${cx},${cy + rInner} L 40,${cy + rInner} Z`

  const neutralPath = `M 40,${cy + rNeutral} L ${cx},${cy + rNeutral} `
    + `A ${rNeutral} ${rNeutral} 0 0 1 ${cx + rNeutral},${cy} L ${cx + rNeutral},30`

  const tracePath = `M 40,${cy + rTrace} L ${cx},${cy + rTrace} `
    + `A ${rTrace} ${rTrace} 0 0 1 ${cx + rTrace},${cy} L ${cx + rTrace},30`

  const stiffenerRight = 66
  const viaX = 92
  const padX = 116

  return (
    <Schematic ref={ref} viewBox="0 0 300 210" title={text.title} caption={text.caption}>
      {/* Flex şeridi — düz bölgeden bükülüp dikey bölgeye geçer */}
      <path className="sch-dielectric" d={bandPath} />
      {/* Nötr eksen — dış/iç yüzey arasının ortası */}
      <path className="sch-dim sch-dash" d={neutralPath} fill="none" />
      {/* Bakır iz — dış yüzeye yakın */}
      <path className="sch-copper" d={tracePath} fill="none" />

      {/* Bend başlangıcı referans çizgisi */}
      <line className="sch-dim sch-dash" x1={bendStartX} y1={cy + rOuter + 2} x2={bendStartX} y2={196} />

      {/* Stiffener — düz bölgenin sol ucunda */}
      <rect className="sch-part" x={40} y={cy + rOuter + 6} width={stiffenerRight - 40} height={10} />
      {/* Via ve pad — bend öncesi düz bölgede, izin üzerinde */}
      <circle className="sch-part" cx={viaX} cy={cy + rTrace} r={4.5} />
      <rect className="sch-part" x={padX - 6} y={cy + rTrace - 2} width={12} height={4} />

      {/* Ölçü çizgileri — stiffener/via/pad'in bend başlangıcına mesafesi,
          üst üste binmesin diye farklı yüksekliklerde (VoltageDivider
          şematiğindeki aynı gerekçe). */}
      <g className="sch-dim">
        <line x1={stiffenerRight} x2={bendStartX} y1={168} y2={168} />
        <line x1={stiffenerRight} x2={stiffenerRight} y1={164} y2={172} />
        <line x1={bendStartX} x2={bendStartX} y1={164} y2={172} />

        <line x1={viaX} x2={bendStartX} y1={178} y2={178} />
        <line x1={viaX} x2={viaX} y1={174} y2={182} />

        <line x1={padX} x2={bendStartX} y1={188} y2={188} />
        <line x1={padX} x2={padX} y1={184} y2={192} />
      </g>

      {/* Kalınlık göstergesi — sol uçta iç/dış yüzey arası */}
      <g className="sch-dim">
        <line x1={26} x2={26} y1={cy + rInner} y2={cy + rOuter} />
        <line x1={22} x2={30} y1={cy + rInner} y2={cy + rInner} />
        <line x1={22} x2={30} y1={cy + rOuter} y2={cy + rOuter} />
      </g>

      {/* R ölçüsü — merkezden 45°'lik noktaya */}
      <line
        className="sch-dim"
        x1={cx} y1={cy}
        x2={cx + rNeutral * Math.SQRT1_2} y2={cy + rNeutral * Math.SQRT1_2}
      />

      {/* Etiketler */}
      <text className="sch-label" x={4} y={(cy + rInner + cy + rOuter) / 2 + 3}>{text.totalThickness}</text>
      <text className="sch-label" x={(40 + stiffenerRight) / 2} y={cy + rOuter + 24} textAnchor="middle">
        {text.stiffener}
      </text>
      <text className="sch-label" x={viaX} y={cy + rTrace - 10} textAnchor="middle">{text.via}</text>
      <text className="sch-label" x={padX} y={cy + rTrace - 10} textAnchor="middle">{text.pad}</text>
      <text className="sch-label" x={bendStartX + 4} y={202}>{text.bendStart}</text>
      <text className="sch-label" x={cx + 30} y={cy + 8}>R</text>
      <text className="sch-label dim" x={(cx + cx + rOuter) / 2} y={cy + rOuter + 34} textAnchor="middle">
        {text.bendRegion}
      </text>
      <text className="sch-label dim" x={cx + rTrace + 6} y={26}>{text.copperTrace}</text>
      <text className="sch-label dim" x={cx + rNeutral + 6} y={44}>{text.neutralAxis}</text>

      {live && (
        <>
          <text className="sch-value" x={4} y={(cy + rInner + cy + rOuter) / 2 + 16}>{fmtEng(r.tTotal, 'm', 3)}</text>
          <text className="sch-value" x={cx + 30} y={cy + 22}>{fmtEng(r.R, 'm', 3)}</text>
          {r.thetaDeg !== null && (
            <text className="sch-value" x={cx + 14} y={cy - 8}>{`θ=${r.thetaDeg}°`}</text>
          )}
          <text className="sch-value" x={(stiffenerRight + bendStartX) / 2} y={162} textAnchor="middle">
            {r.stiffenerDistance !== null ? fmtEng(r.stiffenerDistance, 'm', 3) : '—'}
          </text>
          <text className="sch-value" x={(viaX + bendStartX) / 2} y={192} textAnchor="middle">
            {r.viaDistance !== null ? fmtEng(r.viaDistance, 'm', 3) : '—'}
          </text>
          <text className="sch-value" x={(padX + bendStartX) / 2} y={186} textAnchor="middle">
            {r.padDistance !== null ? fmtEng(r.padDistance, 'm', 3) : '—'}
          </text>
        </>
      )}
    </Schematic>
  )
})

export default FlexBendSchematic
