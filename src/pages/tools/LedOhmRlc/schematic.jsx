import Schematic, { ResistorV, Node, Ground, Terminal, CurrentArrow } from '../../../components/Schematic'
import { fmtRes, fmtVolt, fmtAmp, fmtEng } from '../../../lib/num'
import { TOOL_OHM, TOOL_LED, TOOL_RLC, COMBO_SERIES } from './model'

// Yerleşim kuralı: her yazı kutusu ile çizim elemanı arasında en az 3 px, iki
// yazı kutusu arasında en az 2 px açıklık kalır. Kutu ölçüleri theme.css'ten
// gelir: .sch-label 11 px, .sch-value 10 px, tek aralıklı yazıda karakter
// genişliği ≈ 0.62·fs, kutu = [y − 0.78·fs , y + 0.22·fs]. Yerleşim, biçimlenen
// değerlerin en uzun hâline göre ölçüldü: fmtRes/fmtVolt/fmtAmp en fazla
// "1.00e+3 mΩ" = 10 karakter ≈ 62 px, "f₀ = " + fmtEng(…,'Hz',4) = 17 karakter
// ≈ 105 px.

// Tek dirençli çevrim — Ohm kanunu
// Sağ kol 186'ya alındı: gerilim değeri en uzun hâlinde (ör. "1.000e+6 V")
// eski yerinde viewBox'ın dışına taşıyordu. Akım oku üst iletkenin 6 px
// üstünde durur, etiketi ok başının soluna yazılır.
function OhmCircuit({ r }) {
  return (
    <>
      <g className="sch-wire">
        <line x1={40} x2={40} y1={40} y2={54} />
        <line x1={40} x2={40} y1={98} y2={120} />
        <line x1={40} x2={186} y1={120} y2={120} />
        <line x1={186} x2={186} y1={40} y2={120} />
        <line x1={40} x2={186} y1={40} y2={40} />
      </g>
      <ResistorV x={29} y={54} w={22} h={44} />
      <Terminal x={186} y={40} />
      <Ground x={113} y={120} />
      <CurrentArrow
        x={113} y={34} dir="right" len={20} labelSide="left"
        label={r.ok ? fmtAmp(r.I, 3) : 'I'}
      />
      <text className="sch-label" x={58} y={72}>R</text>
      {r.ok && <text className="sch-value" x={58} y={86}>{fmtRes(r.R, 3)}</text>}
      <text className="sch-label" x={196} y={44}>V</text>
      {r.ok && <text className="sch-value" x={196} y={58}>{fmtVolt(r.V)}</text>}
    </>
  )
}

// LED + seri direnç
// R kolunun sağ iletkeni 110'dan 124'e alındı: direnç değeri en uzun hâlinde
// (62 px) 48–110 aralığını kaplıyor ve eski iletkenin tam üstüne biniyordu.
// Sağ iletken 124'e gidince yazı ile arasında 13 px kalır; toprak sembolü de
// alt rayın yeni başlangıcının içinde kalması için 142'ye kaydı.
function LedCircuit({ r }) {
  const n = r.ok ? Math.min(r.n, 3) : 1
  return (
    <>
      <g className="sch-wire">
        <line x1={30} x2={30} y1={40} y2={54} />
        <line x1={30} x2={30} y1={98} y2={128} />
        <line x1={30} x2={124} y1={128} y2={128} />
        <line x1={124} x2={124} y1={40} y2={128} />
        <line x1={30} x2={124} y1={40} y2={40} />
      </g>
      <ResistorV x={19} y={54} w={22} h={44} />
      <text className="sch-label" x={48} y={72}>R</text>
      {r.ok && <text className="sch-value" x={48} y={86}>{fmtRes(r.R, 3)}</text>}

      {/* LED üçgenleri — seri sayısı üçe kadar gösterilir */}
      {Array.from({ length: n }).map((_, i) => (
        <g key={i} transform={`translate(${140 + i * 34}, 62)`}>
          <polygon className="sch-part" points="0,0 0,20 16,10" />
          <line className="sch-wire" x1={16} y1={0} x2={16} y2={20} />
        </g>
      ))}
      <g className="sch-wire">
        <line x1={124} x2={140} y1={72} y2={72} />
        <line x1={124} x2={124} y1={40} y2={72} />
        <line x1={140 + n * 34 - 18} x2={230} y1={72} y2={72} />
        <line x1={230} x2={230} y1={72} y2={128} />
        <line x1={124} x2={230} y1={128} y2={128} />
      </g>
      <Ground x={142} y={128} />
      <text className="sch-label" x={150} y={50}>{r.ok && r.n > 3 ? `${r.n} × LED` : 'LED'}</text>
      {r.ok && <text className="sch-value" x={150} y={104}>{fmtVolt(r.Vled)}</text>}
      {/* Ok üst iletkenin 6 px üstünde; etiketi sağ kola ve ok başına binmesin
          diye ok başının soluna yazılır */}
      <CurrentArrow
        x={92} y={34} dir="right" len={18} labelSide="left"
        label={r.ok ? fmtAmp(r.targetI, 3) : 'I'}
      />
    </>
  )
}

// Seri RLC kolu
function RlcCircuit({ r }) {
  return (
    <>
      <g className="sch-wire">
        <line x1={14} x2={44} y1={70} y2={70} />
        <line x1={66} x2={96} y1={70} y2={70} />
        <line x1={140} x2={166} y1={70} y2={70} />
        <line x1={190} x2={246} y1={70} y2={70} />
      </g>

      {/* R */}
      <rect className="sch-part" x={44} y={60} width={22} height={20} rx={2} />
      <text className="sch-label" x={50} y={52}>R</text>

      {/* L — üç yay */}
      <path className="sch-part" fill="none" d="M96 70 q11 -16 22 0 q11 -16 22 0" />
      <text className="sch-label" x={112} y={48}>L</text>

      {/* C — iki plaka */}
      <g className="sch-part">
        <line x1={166} y1={56} x2={166} y2={84} />
        <line x1={178} y1={56} x2={178} y2={84} />
      </g>
      <line className="sch-wire" x1={178} x2={190} y1={70} y2={70} />
      <text className="sch-label" x={166} y={48}>C</text>

      <Terminal x={14} y={70} />
      <Terminal x={246} y={70} />

      {/* Değer satırı: üç değer en uzun hâlinde 62 px'e çıkıyor ve eski
          yerlerinde (44 / 100 / 158) birbirinin üstüne biniyordu. R değeri
          direncin ortasına (55) hizalandı, L değeri bobinin başladığı 96'ya,
          C değeri plakanın başladığı 166'ya alındı; en kötü hâlde aralarında
          10 ve 8 px açıklık kalır, sağdaki 228'de biter. */}
      {r.ok && (
        <>
          <text className="sch-value" x={55} y={98} textAnchor="middle">{fmtRes(r.R, 3)}</text>
          <text className="sch-value" x={96} y={98}>{fmtEng(r.L, 'H', 3)}</text>
          <text className="sch-value" x={166} y={98}>{fmtEng(r.C, 'F', 3)}</text>
          <text className="sch-value" x={130} y={120} textAnchor="middle">
            f₀ = {fmtEng(r.f0, 'Hz', 4)}
          </text>
        </>
      )}
    </>
  )
}

// Seri veya paralel direnç dizisi
function ComboCircuit({ r, form }) {
  const isSeries = (r.ok ? r.combo : form.combo) === COMBO_SERIES
  const values = r.ok ? r.values.slice(0, 4) : []
  const n = Math.max(values.length, 2)

  if (isSeries) {
    return (
      <>
        <g className="sch-wire">
          <line x1={14} x2={246} y1={70} y2={70} />
        </g>
        {/* Dirençler 54 px arayla dizili, en uzun değer 62 px. Aynı satırda
            komşu değerler bindiği için değerler iki satıra bölündü: çift
            sıradakiler 96, tek sıradakiler 112'de. Aynı satırdaki komşular
            arasında 46 px, alt/üst satır arasında 6 px açıklık kalır. */}
        {Array.from({ length: n }).map((_, i) => (
          <g key={i}>
            <rect className="sch-part" x={30 + i * 54} y={60} width={30} height={20} rx={2} />
            {values[i] != null && (
              <text className="sch-value" x={30 + i * 54} y={96 + (i % 2) * 16}>
                {fmtRes(values[i], 3)}
              </text>
            )}
          </g>
        ))}
        <Terminal x={14} y={70} />
        <Terminal x={246} y={70} />
      </>
    )
  }

  // Paralel ağ sola toplandı: değerler eskiden kolun sağ iletkeninin tam
  // üstünde duruyordu. Ağ 12–188 aralığına sığdırılıp değerler sağ raydan
  // 34 px sağa, kendi kollarının hizasına alındı; en uzun değer (10 karakter
  // ≈ 62 px) x = 258'de biter — viewBox'ın içinde, çıkış terminaline en yakın
  // noktada 5,5 px açıklık kalır. Satır aralığı 27 px, kutu yüksekliği 10 px:
  // değerler dikeyde 17 px ayrık.
  return (
    <>
      <g className="sch-wire">
        <line x1={12} x2={38} y1={70} y2={70} />
        <line x1={38} x2={38} y1={30} y2={110} />
        <line x1={162} x2={162} y1={30} y2={110} />
        <line x1={162} x2={188} y1={70} y2={70} />
        {Array.from({ length: n }).map((_, i) => (
          <g key={i}>
            <line x1={38} x2={70} y1={30 + i * 27} y2={30 + i * 27} />
            <line x1={130} x2={162} y1={30 + i * 27} y2={30 + i * 27} />
          </g>
        ))}
      </g>
      {Array.from({ length: n }).map((_, i) => (
        <g key={i}>
          <rect className="sch-part" x={70} y={30 + i * 27 - 8} width={60} height={16} rx={2} />
          {values[i] != null && (
            <text className="sch-value" x={196} y={34 + i * 27}>{fmtRes(values[i], 3)}</text>
          )}
        </g>
      ))}
      <Node x={38} y={70} />
      <Node x={162} y={70} />
      <Terminal x={12} y={70} />
      <Terminal x={188} y={70} />
    </>
  )
}

const CAPTION = {
  [TOOL_OHM]: 'Tek dirençli çevrim',
  [TOOL_LED]: 'LED kolu — akımı seri direnç sınırlar',
  [TOOL_RLC]: 'Seri RLC kolu',
}

export default function CircuitSchematic({ r, form }) {
  const tool = r.ok ? r.tool : form.tool
  const height = tool === TOOL_LED ? 150 : tool === 'combo' ? 140 : 140

  return (
    <Schematic
      viewBox={`0 0 260 ${height}`}
      title="Devre şeması"
      caption={CAPTION[tool] ?? (form.combo === COMBO_SERIES ? 'Seri bağlı dirençler' : 'Paralel bağlı dirençler')}
    >
      {tool === TOOL_OHM && <OhmCircuit r={r} />}
      {tool === TOOL_LED && <LedCircuit r={r} />}
      {tool === TOOL_RLC && <RlcCircuit r={r} />}
      {tool === 'combo' && <ComboCircuit r={r} form={form} />}
    </Schematic>
  )
}
