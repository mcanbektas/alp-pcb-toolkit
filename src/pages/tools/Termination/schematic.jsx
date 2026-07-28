import Schematic, { ResistorV, Node, Ground, Terminal } from '../../../components/Schematic'
import { fmtRes, fmtVolt } from '../../../lib/num'
import { TERM_SERIES, TERM_PARALLEL, TERM_THEVENIN } from './model'

// Tek SVG, terminasyon tipine göre dallanır.
//   seri     — sürücü → R_s → hat → alıcı
//   paralel  — hat → R_T → toprak
//   Thevenin — hat → R_top (V_cc) + R_bottom (toprak)
//
// Yerleşim kuralı: her etiket kutusu ile çizim elemanı arasında en az 3 px,
// iki yazı kutusu arasında en az 2 px açıklık bırakılır. Kutu ölçüleri
// theme.css'ten gelir: .sch-label 11 px, .sch-value 10 px, tek aralıklı yazıda
// karakter genişliği ≈ 0.62·fs, kutu = [y − 0.78·fs , y + 0.22·fs].
// "sürücü" yazısı 42 px'lik kutuya kenarına değecek kadar sığıyordu; kutu
// merkezi sabit kalacak biçimde genişletildi. Thevenin'de bias satırı R_bot
// etiketinin altına indirildi, ikisi üst üste geliyordu.
const CAPTION = {
  [TERM_SERIES]: 'Seri terminasyon — direnç sürücünün hemen çıkışında',
  [TERM_PARALLEL]: 'Paralel terminasyon — direnç hattın uç yükünde',
  [TERM_THEVENIN]: 'Thevenin terminasyonu — bölücü hem eşler hem bias verir',
}

const TITLE = {
  [TERM_SERIES]: 'Seri terminasyon devresi',
  [TERM_PARALLEL]: 'Paralel terminasyon devresi',
  [TERM_THEVENIN]: 'Thevenin terminasyon devresi',
}

export default function TerminationSchematic({ r }) {
  const type = r.type ?? TERM_SERIES
  const show = r.ok

  return (
    <Schematic viewBox="0 0 260 160" title={TITLE[type]} caption={CAPTION[type]}>
      {/* Sürücü ve dönüş yolu — üç tipte de ortak */}
      <rect className="sch-part" x={9} y={60} width={48} height={34} rx={2} />
      <text className="sch-value" x={33} y={81} textAnchor="middle">sürücü</text>

      <g className="sch-wire">
        <line x1={33} x2={33} y1={94} y2={140} />
        <line x1={33} x2={236} y1={140} y2={140} />
      </g>
      <Ground x={124} y={140} />

      {type === TERM_SERIES && (
        <>
          <g className="sch-wire">
            <line x1={57} x2={80} y1={77} y2={77} />
            <line x1={116} x2={142} y1={77} y2={77} />
          </g>

          <rect className="sch-part" x={80} y={66} width={36} height={22} rx={2} />
          <text className="sch-label" x={98} y={59} textAnchor="middle">R_s</text>

          {/* Hat */}
          <rect className="sch-copper" x={142} y={74} width={84} height={6} />
          <text className="sch-label" x={184} y={67} textAnchor="middle">Z₀</text>
          <Terminal x={232} y={77} />

          {show && (
            <>
              <text className="sch-value" x={98} y={104} textAnchor="middle">
                {fmtRes(r.Rs, 3)}
              </text>
              <text className="sch-value" x={184} y={94} textAnchor="middle">
                {fmtRes(r.Z0, 3)}
              </text>
            </>
          )}
        </>
      )}

      {type === TERM_PARALLEL && (
        <>
          <g className="sch-wire">
            <line x1={57} x2={96} y1={77} y2={77} />
            <line x1={172} x2={232} y1={77} y2={77} />
            <line x1={196} x2={196} y1={77} y2={90} />
            <line x1={196} x2={196} y1={124} y2={140} />
          </g>

          <rect className="sch-copper" x={96} y={74} width={76} height={6} />
          <text className="sch-label" x={134} y={67} textAnchor="middle">Z₀</text>

          <Node x={196} y={77} />
          <ResistorV x={185} y={90} w={22} h={34} />
          <text className="sch-label" x={212} y={104}>R_T</text>
          <Terminal x={232} y={77} />

          {show && (
            <>
              <text className="sch-value" x={212} y={118}>{fmtRes(r.RT, 3)}</text>
              <text className="sch-value" x={134} y={94} textAnchor="middle">
                {fmtRes(r.Z0, 3)}
              </text>
            </>
          )}
        </>
      )}

      {type === TERM_THEVENIN && (
        <>
          {/* Besleme rayı */}
          <g className="sch-wire">
            <line x1={150} x2={236} y1={26} y2={26} />
            <line x1={196} x2={196} y1={26} y2={40} />
            <line x1={196} x2={196} y1={72} y2={88} />
            <line x1={196} x2={196} y1={120} y2={140} />
            <line x1={57} x2={96} y1={77} y2={77} />
            <line x1={172} x2={232} y1={77} y2={77} />
          </g>
          <text className="sch-label" x={236} y={19} textAnchor="end">V_cc</text>

          <rect className="sch-copper" x={96} y={74} width={76} height={6} />
          <text className="sch-label" x={134} y={67} textAnchor="middle">Z₀</text>

          <ResistorV x={185} y={40} w={22} h={32} />
          <ResistorV x={185} y={88} w={22} h={32} />
          <Node x={196} y={77} />
          <Terminal x={232} y={77} />

          <text className="sch-label" x={180} y={58} textAnchor="end">R_top</text>
          <text className="sch-label" x={180} y={108} textAnchor="end">R_bot</text>

          {show && (
            <>
              <text className="sch-value" x={212} y={58}>{fmtRes(r.standard.Rtop, 3)}</text>
              <text className="sch-value" x={212} y={108}>{fmtRes(r.standard.Rbottom, 3)}</text>
              <text className="sch-value" x={134} y={94} textAnchor="middle">
                {fmtRes(r.Z0, 3)}
              </text>
              <text className="sch-value" x={134} y={126} textAnchor="middle">
                bias {fmtVolt(r.standard.bias)}
              </text>
            </>
          )}
        </>
      )}
    </Schematic>
  )
}
