import Schematic, { Terminal } from '../../../components/Schematic'
import { fmtEng } from '../../../lib/num'

// Aggressor ve victim hatlarının üstten görünümü.
// Sinyal aggressor üzerinde soldan sağa ilerler: near-end (NE) solda,
// far-end (FE) sağdadır. NEXT victim'in near-end ucunda, FEXT far-end
// ucunda görünür. W ve S ölçüleri 3W geometrik kontrolünün girdileridir.
//
// Yerleşim kuralı: her etiket kutusu ile çizim elemanı arasında en az 3 px,
// iki yazı kutusu arasında en az 2 px açıklık bırakılır. Kutu ölçüleri
// theme.css'ten gelir: .sch-label 11 px, .sch-value 10 px, tek aralıklı yazıda
// karakter genişliği ≈ 0.62·fs, kutu = [y − 0.78·fs , y + 0.22·fs].
// Yayılma oku uç adlarının arasına alındı, "paralel uzunluk L" başlığı ölçü
// çizgisinin üstüne oturduğu için çizgi etiketin geçtiği yerde iki parça
// çizilir ve sonuç satırları alt alta bölündü — en uzun değer (9 karakter)
// tek satıra sığmıyordu.
export default function CrosstalkSchematic({ r, text }) {
  const x0 = 52
  const x1 = 218
  const span = x1 - x0

  const traceH = 9
  const aggY = 40
  const gap = 27
  const vicY = aggY + traceH + gap // 76

  const aggMid = aggY + traceH / 2
  const vicMid = vicY + traceH / 2

  return (
    <Schematic
      viewBox="0 0 260 172"
      title={text.title}
      caption={text.caption}
    >
      {/* Uç adları */}
      <text className="sch-label dim" x={x0} y={16} textAnchor="middle">{text.nearEnd}</text>
      <text className="sch-label dim" x={x1} y={16} textAnchor="middle">{text.farEnd}</text>

      {/* Yayılma yönü — uç adlarının arasındaki boşlukta */}
      <g>
        <line className="sch-arrow" x1={112} y1={15} x2={162} y2={15} />
        <polygon className="sch-arrow-head" points="168,15 159,11.5 159,18.5" />
      </g>

      {/* Aggressor hattı */}
      <rect className="sch-copper" x={x0} y={aggY} width={span} height={traceH} />
      <text className="sch-label" x={135} y={33} textAnchor="middle">{text.aggressor}</text>
      <Terminal x={x0} y={aggMid} r={3} />
      <Terminal x={x1} y={aggMid} r={3} />

      {/* Victim hattı */}
      <rect className="sch-copper" x={x0} y={vicY} width={span} height={traceH} />
      <text className="sch-label" x={135} y={101} textAnchor="middle">{text.victim}</text>
      <Terminal x={x0} y={vicMid} r={3} />
      <Terminal x={x1} y={vicMid} r={3} />

      <text className="sch-value" x={x0} y={101} textAnchor="middle">V_NEXT</text>
      <text className="sch-value" x={x1} y={101} textAnchor="middle">V_FEXT</text>

      {/* W ölçüsü — hat genişliği */}
      <g className="sch-dim">
        <line x1={40} x2={40} y1={aggY} y2={aggY + traceH} />
        <line x1={35} x2={45} y1={aggY} y2={aggY} />
        <line x1={35} x2={45} y1={aggY + traceH} y2={aggY + traceH} />
      </g>
      <text className="sch-label" x={30} y={aggY + traceH} textAnchor="end">W</text>

      {/* S ölçüsü — hatlar arası boşluk */}
      <g className="sch-dim">
        <line x1={78} x2={78} y1={aggY + traceH} y2={vicY} />
        <line x1={73} x2={83} y1={aggY + traceH} y2={aggY + traceH} />
        <line x1={73} x2={83} y1={vicY} y2={vicY} />
      </g>
      <text className="sch-label" x={87} y={aggY + traceH + gap / 2 + 4}>S</text>

      {/* Paralel uzunluk ölçüsü — çizgi başlığın geçtiği yerde iki parça */}
      <g className="sch-dim">
        <line x1={x0} x2={72} y1={122} y2={122} />
        <line x1={198} x2={x1} y1={122} y2={122} />
        <line x1={x0} x2={x0} y1={117} y2={127} />
        <line x1={x1} x2={x1} y1={117} y2={127} />
      </g>
      <text className="sch-label" x={135} y={126} textAnchor="middle">{text.parallelLength}</text>

      {r.ok && (
        <>
          <text className="sch-value" x={16} y={140}>
            W = {fmtEng(r.W, 'm', 3)} · S = {fmtEng(r.S, 'm', 3)}
          </text>
          <text className="sch-value" x={16} y={153}>
            L = {fmtEng(r.coupledLength, 'm', 3)}
          </text>
          <text className="sch-value" x={244} y={153} textAnchor="end">
            V_NEXT = {fmtEng(r.Vnext, 'V', 3)}
          </text>
          <text className="sch-value" x={16} y={166}>
            V_FEXT = {r.fext.available ? fmtEng(r.fext.Vfext, 'V', 3) : text.notComputed}
          </text>
        </>
      )}
    </Schematic>
  )
}
