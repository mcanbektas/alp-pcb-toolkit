import { forwardRef } from 'react'
import Schematic, { ResistorV, Node, Ground, Terminal, CurrentArrow } from '../../../components/Schematic'
import { fmtRes, fmtVolt, fmtAmp } from '../../../lib/num'
import { TOOL_OHM, TOOL_COMBO, COMBO_SERIES } from './model'

// Yerleşim kuralı: her yazı kutusu ile çizim elemanı arasında en az 3 px, iki
// yazı kutusu arasında en az 2 px açıklık kalır. Kutu ölçüleri theme.css'ten
// gelir: .sch-label 11 px, .sch-value 10 px, tek aralıklı yazıda karakter
// genişliği ≈ 0.62·fs, kutu = [y − 0.78·fs , y + 0.22·fs].
//
// Yerleşim, biçimlenen değerlerin en uzun hâline göre ölçüldü:
//   • fmtRes/fmtAmp ön ek ölçeklidir, |x| < 1e16 için en fazla
//     "1.00e+4 GΩ" = 10 karakter; uç girdide (1e16 ve üstü) "1.000e+7 GΩ" =
//     11 karakter ≈ 68 px — sınır 11 karakter alındı.
//   • fmtVolt ön ek kullanmaz, 1e7 V'tan sonra üsse geçer: "1.000e+100 V" =
//     12 karakter ≈ 74 px. Gerilim yazıları bu sınıra göre yerleşti.
//
// Bileşen değeri hiçbir varyantta telin üstüne ya da hizasına yazılmaz: değer
// daima kendi sembolünün altında (seri) veya üstünde (paralel) ve o sembolle
// aynı eksende ortalı durur. Böylece hangi değerin hangi elemana ait olduğu
// okunur, tel de açıkta kalır.

// .sch-value karakter genişliği: 0.62 × 10 px
const VALUE_CW = 6.2

// Tek dirençli çevrim — Ohm kanunu
// Sağ kol 186'dan 170'e çekildi: gerilim değeri x = 196'da soldan başlıyordu ve
// en uzun hâlinde ("1.000e+15 V" ve ötesi) 264 px'e, viewBox'ın dışına taşıyordu.
// Kol 170'e gelince gerilim kolonu 180'de başlar ve 12 karakterde 254,4'te
// biter; terminale 5 px, sağ kola 9 px açıklık kalır. Toprak ve akım oku yeni
// çevrim ortasına (105) hizalandı. Akım oku üst iletkenin 6 px üstünde durur,
// etiketi ok başının soluna yazılır.
function OhmCircuit({ r }) {
  return (
    <>
      <g className="sch-wire">
        <line x1={40} x2={40} y1={40} y2={54} />
        <line x1={40} x2={40} y1={98} y2={120} />
        <line x1={40} x2={170} y1={120} y2={120} />
        <line x1={170} x2={170} y1={40} y2={120} />
        <line x1={40} x2={170} y1={40} y2={40} />
      </g>
      <ResistorV x={29} y={54} w={22} h={44} />
      <Terminal x={170} y={40} />
      <Ground x={105} y={120} />
      <CurrentArrow
        x={115} y={34} dir="right" len={20} labelSide="left"
        label={r.ok ? fmtAmp(r.I, 3) : 'I'}
      />
      <text className="sch-label" x={58} y={72}>R</text>
      {r.ok && <text className="sch-value" x={58} y={86}>{fmtRes(r.R, 3)}</text>}
      <text className="sch-label" x={180} y={44}>V</text>
      {r.ok && <text className="sch-value" x={180} y={58}>{fmtVolt(r.V)}</text>}
    </>
  )
}

// Seri veya paralel direnç dizisi
function ComboCircuit({ r, form }) {
  // Birleşim türü, viewBox yüksekliğini seçen CircuitSchematic ile aynı
  // ifadeden okunur; ikisi ayrışırsa paralel ağ 140 px'lik alana çizilirdi.
  const isSeries = (r.ok && r.tool === TOOL_COMBO ? r.combo : form.combo) === COMBO_SERIES
  const values = r.ok ? r.values.slice(0, 4) : []
  const n = Math.max(values.length, 2)

  if (isSeries) {
    // Dirençler 54 px arayla dizili; kutu ortası x = 45 + 54·i.
    // Değerler eskiden direncin SOL kenarından başlıyordu ve 62 px'e kadar
    // uzayarak komşu direncin altına taşıyordu — hangi değer hangi dirence ait,
    // okunmuyordu. Artık her değer kendi direncinin orta ekseninde ortalı.
    const labels = values.map((v) => fmtRes(v, 3))
    const cx = (i) => 45 + i * 54
    const half = (i) => (labels[i].length * VALUE_CW) / 2

    // Ölçülen genişliklerle tek satıra sığıyorsa tek satır (komşular arasında
    // en az 3 px, kutular viewBox içinde); sığmıyorsa iki satıra bölünür.
    // İki satırlı hâlde en kötü durumda aynı satırda 46 px, satırlar arasında
    // 6 px açıklık kalır.
    const oneRow = labels.every((_, i) => (
      cx(i) - half(i) >= 2 && cx(i) + half(i) <= 258
      && (i === 0 || cx(i - 1) + half(i - 1) + 3 <= cx(i) - half(i))
    ))

    return (
      <>
        <g className="sch-wire">
          <line x1={14} x2={246} y1={70} y2={70} />
        </g>
        {Array.from({ length: n }).map((_, i) => (
          <g key={i}>
            <rect className="sch-part" x={30 + i * 54} y={60} width={30} height={20} rx={2} />
            {labels[i] != null && (
              <text
                className="sch-value"
                x={cx(i)} y={oneRow ? 96 : 96 + (i % 2) * 16}
                textAnchor="middle"
              >
                {labels[i]}
              </text>
            )}
          </g>
        ))}
        <Terminal x={14} y={70} />
        <Terminal x={246} y={70} />
      </>
    )
  }

  // Paralel ağ. Değerler eskiden sağ rayın dışında tek bir kolondaydı (x = 196):
  // kol tellerinin ve çıkış terminalinin tam hizasına düşüyor (terminale
  // 5,5 px), kendi direncinden 66 px uzakta kalıyordu. Artık her değer kendi
  // direncinin 15 px üstünde, kutuyla aynı eksende (x = 100) ortalı; yazı
  // kutusu (10 px) kendi direncinden 3,8 px, üstteki dirençten 4,2 px açık.
  // Bunun için kol aralığı 27 → 36 px açıldı ve viewBox 140 → 160 px yükseldi.
  // Giriş/çıkış ekseni her eleman sayısında y = 87'de kalır (ağ dikeyde
  // ortalanır), böylece 2/3/4 eleman arasında terminaller yerinde durur.
  // Raylar ilk koldan son kola çekilir — eskiden 30–110 sabitti ve dördüncü kol
  // (y = 111) rayın dışında, kopuk kalıyordu.
  const pitch = 36
  const y0 = 87 - ((n - 1) * pitch) / 2
  const by = (i) => y0 + i * pitch

  return (
    <>
      <g className="sch-wire">
        <line x1={12} x2={38} y1={87} y2={87} />
        <line x1={38} x2={38} y1={y0} y2={by(n - 1)} />
        <line x1={162} x2={162} y1={y0} y2={by(n - 1)} />
        <line x1={162} x2={188} y1={87} y2={87} />
        {Array.from({ length: n }).map((_, i) => (
          <g key={i}>
            <line x1={38} x2={70} y1={by(i)} y2={by(i)} />
            <line x1={130} x2={162} y1={by(i)} y2={by(i)} />
          </g>
        ))}
      </g>
      {Array.from({ length: n }).map((_, i) => (
        <g key={i}>
          <rect className="sch-part" x={70} y={by(i) - 8} width={60} height={16} rx={2} />
          {values[i] != null && (
            <text className="sch-value" x={100} y={by(i) - 15} textAnchor="middle">
              {fmtRes(values[i], 3)}
            </text>
          )}
        </g>
      ))}
      <Node x={38} y={87} />
      <Node x={162} y={87} />
      <Terminal x={12} y={87} />
      <Terminal x={188} y={87} />
    </>
  )
}

// `ref` yalnızca rapor üretimi için Schematic'e iletilir — bkz. report.js.
const CircuitSchematic = forwardRef(function CircuitSchematic({ r, form, text }, ref) {
  const tool = r.ok ? r.tool : form.tool
  const combo = r.ok && r.tool === TOOL_COMBO ? r.combo : form.combo
  const isParallel = tool === TOOL_COMBO && combo !== COMBO_SERIES

  // viewBox genişliği 260'ta sabit: ölçek genişlikten gelir (.schematic svg
  // width:100%; height:auto), genişletmek bütün yazıyı küçültürdü. Yükseklik
  // serbest — paralel ağ dört kolda 36 px aralıkla 160 px'e ihtiyaç duyar.
  const height = isParallel ? 160 : 140

  // Başlık ve alt yazı dile göre gelir; SVG içindeki yerleşim yalnızca
  // biçimlenmiş sayı genişliklerine bakar, bu yüzden dilden etkilenmez.
  const caption = text.caption[tool]
    ?? (combo === COMBO_SERIES ? text.captionSeries : text.captionParallel)

  return (
    <Schematic
      ref={ref}
      viewBox={`0 0 260 ${height}`}
      title={text.title}
      caption={caption}
    >
      {tool === TOOL_OHM && <OhmCircuit r={r} />}
      {tool === TOOL_COMBO && <ComboCircuit r={r} form={form} />}
    </Schematic>
  )
})

export default CircuitSchematic
