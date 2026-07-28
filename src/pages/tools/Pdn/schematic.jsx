import Schematic, { Node } from '../../../components/Schematic'
import { fmtEng, fmtRes } from '../../../lib/num'

// Güç dağıtım ağının blok görünümü: VRM → düzlem çifti → kapasitör bankası →
// yük. Hedef empedans yükün besleme düğümünde tanımlıdır, o düğüm işaretlidir.
//
// Yerleşim kuralı: her etiket kutusu ile çizim elemanı arasında en az 3 px,
// iki yazı kutusu arasında en az 2 px açıklık bırakılır. Kutu ölçüleri
// theme.css'ten gelir: .sch-label 11 px, .sch-value 10 px, tek aralıklı yazıda
// karakter genişliği ≈ 0.62·fs, kutu = [y − 0.78·fs , y + 0.22·fs].
//
// Alt açıklama bloğu iki satırlı bir ızgaradır: üstte kolon etiketi, altında o
// kolonun denklemi. Önceki yerleşimde etiket satırı ile denklem satırı arasında
// yalnızca 2.78 px, "C_düzlem" ile "kapasitörler" kutuları arasında ise 6.8 px
// kalıyordu; "kapasitörler" hem 'p' kuyruğu olan uzun bir etiket hem de sağdaki
// en geniş kutu olduğu için ekranda bu iki açıklık kapanıp yazılar üst üste
// biniyordu. Düzeltme: düzlem kolonunun etiketi ve denklemi x = 95'e çekildi
// (kutular 12.8 px ayrıldı), denklem satırı y = 157'ye indi (satır açıklığı
// 7.78 px) ve sonuç satırları y = 173 / 188'e kaydı. Artan yer için viewBox
// yüksekliği 186 → 196; genişlik değişmedi, yani çizimin ölçeği aynı kaldı.
// Sıraların yeri: etiketler y = 139, denklemler y = 157, sonuçlar y = 173 ve 188.
export default function PdnSchematic({ r, text }) {
  const top = 48
  const bot = 122
  const capXs = [160, 192]

  return (
    <Schematic
      viewBox="0 0 260 196"
      title={text.title}
      caption={text.caption}
    >
      {/* Besleme ve dönüş rayları */}
      <g className="sch-wire">
        <line x1={32} x2={226} y1={top} y2={top} />
        <line x1={32} x2={226} y1={bot} y2={bot} />
        <line x1={32} x2={32} y1={top} y2={64} />
        <line x1={32} x2={32} y1={106} y2={bot} />
        <line x1={226} x2={226} y1={top} y2={64} />
        <line x1={226} x2={226} y1={106} y2={bot} />
      </g>

      {/* VRM ve yük blokları */}
      <rect className="sch-part" x={12} y={64} width={40} height={42} rx={2} />
      <rect className="sch-part" x={206} y={64} width={40} height={42} rx={2} />
      <text className="sch-label" x={32} y={89} textAnchor="middle">VRM</text>
      <text className="sch-label" x={226} y={89} textAnchor="middle">{text.load}</text>

      {/* Düzlem çifti — örtüşen bakır alan bir kapasitör oluşturur */}
      <rect className="sch-copper" x={72} y={top - 4} width={58} height={6} />
      <rect className="sch-copper" x={72} y={bot - 2} width={58} height={6} />
      <g className="sch-wire sch-dash">
        <line x1={101} x2={101} y1={top + 2} y2={80} />
        <line x1={101} x2={101} y1={88} y2={bot - 2} />
      </g>
      <g className="sch-wire">
        <line x1={89} x2={113} y1={80} y2={80} />
        <line x1={89} x2={113} y1={88} y2={88} />
      </g>
      {/* Düzlem kolonunun etiketi kolon ortasının 6 px soluna alındı: sağdaki
          "kapasitörler" kutusuyla arasındaki açıklık 6.8 → 12.8 px. */}
      <text className="sch-label" x={95} y={139} textAnchor="middle">{text.cPlane}</text>

      {/* Kapasitör bankası */}
      {capXs.map((x) => (
        <g key={x}>
          <g className="sch-wire">
            <line x1={x} x2={x} y1={top} y2={80} />
            <line x1={x - 11} x2={x + 11} y1={80} y2={80} />
            <line x1={x - 11} x2={x + 11} y1={88} y2={88} />
            <line x1={x} x2={x} y1={88} y2={bot} />
          </g>
          <Node x={x} y={top} r={2.5} />
          <Node x={x} y={bot} r={2.5} />
        </g>
      ))}
      <text className="sch-label" x={176} y={139} textAnchor="middle">{text.caps}</text>

      {/* Hedef empedansın tanımlı olduğu düğüm */}
      <Node x={226} y={top} />
      <text className="sch-label" x={226} y={37} textAnchor="middle">{text.zTarget}</text>

      {/* Blok açıklamaları */}
      <text className="sch-value" x={34} y={39}>{text.vRail}</text>
      <text className="sch-value" x={32} y={157} textAnchor="middle">R + jωL</text>
      <text className="sch-value" x={95} y={157} textAnchor="middle">ε₀·εr·A/d</text>
      <text className="sch-value" x={176} y={157} textAnchor="middle">ESR, ESL</text>
      <text className="sch-value" x={226} y={157} textAnchor="middle">ΔI</text>

      {r.ok && (
        <>
          <text className="sch-value" x={12} y={173}>
            {text.zTarget} = {fmtRes(r.Ztarget, 4)}
          </text>
          {r.curve && (
            <text className="sch-value" x={12} y={188}>
              |Z_PDN| @ {fmtEng(r.curve.fOp, 'Hz', 3)} = {fmtRes(r.curve.z.mag, 4)}
            </text>
          )}
        </>
      )}
    </Schematic>
  )
}
