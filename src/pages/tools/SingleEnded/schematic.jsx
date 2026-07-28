import Schematic from '../../../components/Schematic'
import { fmtEng } from '../../../lib/num'
import { STRUCT_MICROSTRIP, STRUCT_STRIPLINE, STRUCT_CPW } from './model'

const cx = 130

function Microstrip({ r }) {
  return (
    <>
      <rect className="sch-dielectric" x={20} y={64} width={220} height={40} />
      <rect className="sch-copper" x={20} y={104} width={220} height={7} />
      <rect className="sch-copper" x={cx - 34} y={54} width={68} height={10} />

      <text className="sch-label" x={cx} y={48} textAnchor="middle">W</text>
      <text className="sch-label dim" x={24} y={125}>referans düzlem</text>

      <g className="sch-dim">
        <line x1={206} x2={206} y1={64} y2={104} />
        <line x1={200} x2={212} y1={64} y2={64} />
        <line x1={200} x2={212} y1={104} y2={104} />
      </g>
      {/* H etiketi ve değeri ölçü çizgisinin solunda: sağda kalan 34 px
          şeridi değeri almıyor, yazı hem dielektrik kenarını hem viewBox'ı aşıyordu. */}
      <text className="sch-label" x={200} y={82} textAnchor="end">H</text>

      {r.ok && (
        <>
          <text className="sch-value" x={cx} y={34} textAnchor="middle">{fmtEng(r.W, 'm', 3)}</text>
          <text className="sch-value" x={200} y={96} textAnchor="end">{fmtEng(r.height, 'm', 3)}</text>
        </>
      )}
    </>
  )
}

function Stripline({ r }) {
  return (
    <>
      <rect className="sch-copper" x={20} y={34} width={220} height={7} />
      <rect className="sch-dielectric" x={20} y={41} width={220} height={72} />
      <rect className="sch-copper" x={20} y={113} width={220} height={7} />
      <rect className="sch-copper" x={cx - 34} y={73} width={68} height={8} />

      {/* Dielektrik üstü (41) ile hat üstü (73) arasındaki 32 px'e W değeri ve
          W etiketi sırayla yerleşiyor; 66/52 ikilisinde değer dielektrik
          kenarına 2.7 px kalıyordu, ikisi de 1 px aşağı alındı. */}
      <text className="sch-label" x={cx} y={67} textAnchor="middle">W</text>
      <text className="sch-label dim" x={24} y={27}>üst düzlem</text>
      <text className="sch-label dim" x={24} y={133}>alt düzlem</text>

      <g className="sch-dim">
        <line x1={206} x2={206} y1={41} y2={113} />
        <line x1={200} x2={212} y1={41} y2={41} />
        <line x1={200} x2={212} y1={113} y2={113} />
      </g>
      {/* b etiketi ve değeri ölçü çizgisinin solunda; hat şeridinin altına düşüyor. */}
      <text className="sch-label" x={200} y={82} textAnchor="end">b</text>

      {r.ok && (
        <>
          <text className="sch-value" x={cx} y={53} textAnchor="middle">{fmtEng(r.W, 'm', 3)}</text>
          <text className="sch-value" x={200} y={96} textAnchor="end">{fmtEng(r.height, 'm', 3)}</text>
        </>
      )}
    </>
  )
}

function Cpw({ r }) {
  const half = 30
  const gap = 22
  return (
    <>
      <rect className="sch-dielectric" x={20} y={70} width={220} height={44} />
      {/* Yan toprak düzlemleri ve orta hat aynı katmanda */}
      <rect className="sch-copper" x={20} y={60} width={cx - half - gap - 20} height={10} />
      <rect className="sch-copper" x={cx - half} y={60} width={half * 2} height={10} />
      <rect className="sch-copper" x={cx + half + gap} y={60} width={240 - (cx + half + gap)} height={10} />

      <text className="sch-label" x={cx} y={54} textAnchor="middle">W</text>
      <text className="sch-label" x={cx - half - gap / 2} y={90} textAnchor="middle">S</text>
      <text className="sch-label" x={cx + half + gap / 2} y={90} textAnchor="middle">S</text>
      {/* Etiket 20'den başlıyor: 24'te W etiketinin kutusuna 0.3 px kalıyordu. */}
      <text className="sch-label dim" x={20} y={48}>coplanar toprak</text>
      <text className="sch-label dim" x={24} y={128}>alt düzlem yok</text>

      {r.ok && (
        <>
          <text className="sch-value" x={cx} y={34} textAnchor="middle">{fmtEng(r.W, 'm', 3)}</text>
          <text className="sch-value" x={cx} y={106} textAnchor="middle">S = {fmtEng(r.S, 'm', 3)}</text>
        </>
      )}
    </>
  )
}

const CAPTION = {
  [STRUCT_MICROSTRIP]: 'Yüzey microstrip — tek referans düzlemi altta',
  [STRUCT_STRIPLINE]: 'Simetrik stripline — hat iki düzlem arasında ortada',
  [STRUCT_CPW]: 'İdeal coplanar waveguide — altında referans düzlem yok',
}

export default function ImpedanceSchematic({ r, form }) {
  const structure = r.ok ? r.structure : form.structure

  return (
    <Schematic viewBox="0 0 260 140" title="Hat kesiti" caption={CAPTION[structure]}>
      {structure === STRUCT_MICROSTRIP && <Microstrip r={r} />}
      {structure === STRUCT_STRIPLINE && <Stripline r={r} />}
      {structure === STRUCT_CPW && <Cpw r={r} />}
    </Schematic>
  )
}
