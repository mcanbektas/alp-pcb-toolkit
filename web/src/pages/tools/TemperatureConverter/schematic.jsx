import { forwardRef } from 'react'
import Schematic from '../../../components/Schematic'
import { fmt } from '../../../lib/num'
import { MODE_DELTA } from './model'

// Sıcaklık ölçeği. Şema oran değil, hangi büyüklüğün ne olduğunu gösterir:
// mutlak modda ölçek üzerinde tek bir nokta, fark modunda iki nokta arasındaki
// açıklık işaretlenir. İki büyüklüğün aynı şemada karışmaması bilinçlidir.
//
// Yerleşim satır ızgarasına oturur: eksen → ölçek uçları → nokta etiketleri →
// sayısal satırlar. Her etiket kendi genişliğine göre yerleştirilir; iki etiket
// aynı satırda sığmazsa simetrik olarak açılır. Böylece ölçek penceresi hangi
// değerde açılırsa açılsın yazılar ne birbirine ne de çizgilere değer.

const SIG = 6
const X0 = 26
const X1 = 234
const AXIS_Y = 52
const MID = 130

// Çizim alanı ve iç pay — hiçbir yazı kutusu bu payın dışına taşmaz
const VB_W = 260
const VB_H = 152
const PAD = 3

// Satır ızgarası (eksene göre)
const ROW_DIM = AXIS_Y - 35    // fark ölçüsünün etiketi, ölçü çizgisinin üstünde
const ROW_MARK = AXIS_Y - 26   // mutlak modda çalışma noktası etiketi
const ROW_ENDS = AXIS_Y + 20   // ölçek penceresinin uçları
const ROW_POINTS = AXIS_Y + 35 // eksen üzerindeki noktaların adları
const ROW_V1 = AXIS_Y + 50
const ROW_V2 = AXIS_Y + 64
const ROW_V3 = AXIS_Y + 78
const ROW_V4 = AXIS_Y + 92

// Yazı kutusu modeli. Tek aralıklı yazıda kalın ağırlık aynı genişlikte
// ilerler; ilerleme yalnızca karakter sayısına ve punto boyuna bağlıdır.
const LABEL_FS = 11
const VALUE_FS = 10
const CH_ADVANCE = 0.62
const textW = (s, fs) => String(s).length * CH_ADVANCE * fs

// Ortalı bir yazıyı çizim alanının içinde tutan merkez
const centerIn = (x, w) => Math.min(VB_W - PAD - w / 2, Math.max(PAD + w / 2, x))

// Soldan hizalı bir bloğu ortaya yerleştirir, taşarsa içeri çeker
const blockLeft = (w) => Math.min(VB_W - PAD - w, Math.max(PAD, MID - w / 2))

// Aynı satırdaki iki etiketi çakışmadan yerleştirir: kutular arasında en az
// GAP kalacak biçimde simetrik olarak açılır, sonra çift birlikte içeri çekilir.
const GAP = 3
function spreadPair(xa, wa, xb, wb) {
  const need = (wa + wb) / 2 + GAP
  let a = xa
  let b = xb
  if (Math.abs(b - a) < need) {
    const mid = (a + b) / 2
    const dir = b < a ? -1 : 1
    a = mid - (dir * need) / 2
    b = mid + (dir * need) / 2
  }
  const left = Math.min(a - wa / 2, b - wb / 2)
  const right = Math.max(a + wa / 2, b + wb / 2)
  let shift = 0
  if (left < PAD) shift = PAD - left
  if (right + shift > VB_W - PAD) shift = VB_W - PAD - right
  return [a + shift, b + shift]
}

// `ref` yalnızca rapor üretimi için Schematic'e iletilir — bkz. report.js.
const TemperatureSchematic = forwardRef(function TemperatureSchematic({ r, text }, ref) {
  const live = r.ok
  const delta = live && r.mode === MODE_DELTA
  const hasFinal = delta && !!r.final

  // Ölçek penceresi (santigrat). Fark modunda başlangıç ve varış noktalarını,
  // mutlak modda çalışma noktasını içine alacak biçimde açılır.
  let lo
  let hi
  let startC = 0
  let endC = 0

  if (delta) {
    startC = r.final ? r.final.ambient.C : 0
    endC = startC + r.delta.dC
    const margin = Math.max(5, Math.abs(r.delta.dC) * 0.35)
    lo = Math.min(startC, endC) - margin
    hi = Math.max(startC, endC) + margin
  } else {
    const C = live ? r.temp.C : 25
    lo = Math.min(-60, C - 20)
    hi = Math.max(160, C + 20)
  }

  const span = hi - lo || 1
  const px = (v) => X0 + ((v - lo) / span) * (X1 - X0)

  const markC = live && !delta ? r.temp.C : 0
  const xStart = px(startC)
  const xEnd = px(endC)

  // --- Fark modu yazıları ---
  // ΔT'nin üç ölçekteki karşılığı tek satıra sığmıyor (büyük değerlerde
  // çizim alanını aşıyordu); eşitlik satırlara bölünür, "=" sütunu hizalanır
  // ve sayılar alt alta okunur. İçerik aynı: ΔT_C = ΔT_K = ΔT_F.
  const dRowC = delta ? `${fmt(r.delta.dC, SIG)} °C` : ''
  const dRowK = delta ? `= ${fmt(r.delta.dK, SIG)} K` : ''
  const dRowF = delta ? `= ${fmt(r.delta.dF, SIG)} °F` : ''
  const eqW = textW('= ', VALUE_FS)
  const dBlockX = blockLeft(Math.max(
    eqW + textW(dRowC, VALUE_FS),
    textW(dRowK, VALUE_FS),
    textW(dRowF, VALUE_FS),
  ))

  const startLabel = hasFinal ? text.ambient : text.start
  const wStartLabel = textW(startLabel, LABEL_FS)
  const [xStartLabel, xEndLabel] = hasFinal
    ? spreadPair(xStart, wStartLabel, xEnd, textW(text.end, LABEL_FS))
    : [centerIn(xStart, wStartLabel), 0]

  const finalRow = hasFinal ? `${fmt(startC, SIG)} °C → ${fmt(endC, SIG)} °C` : ''

  // --- Mutlak mod yazıları: üç ölçek, işaretin altında ortak eksende ---
  const tRowC = live && !delta ? `${fmt(r.temp.C, SIG)} °C` : ''
  const tRowF = live && !delta ? `${fmt(r.temp.F, SIG)} °F` : ''
  const tRowK = live && !delta ? `${fmt(r.temp.K, SIG)} K` : ''
  const xTemp = centerIn(px(markC), Math.max(
    textW(tRowC, VALUE_FS),
    textW(tRowF, VALUE_FS),
    textW(tRowK, VALUE_FS),
  ))

  return (
    <Schematic
      ref={ref}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      title={delta ? text.titleDelta : text.titleAbs}
      caption={delta ? text.captionDelta : text.captionAbs}
    >
      {/* Ölçek ekseni */}
      <g className="sch-wire">
        <line x1={X0} x2={X1} y1={AXIS_Y} y2={AXIS_Y} />
        <line x1={X0} x2={X0} y1={AXIS_Y - 6} y2={AXIS_Y + 6} />
        <line x1={X1} x2={X1} y1={AXIS_Y - 6} y2={AXIS_Y + 6} />
      </g>

      <text className="sch-label dim" x={X0} y={ROW_ENDS} textAnchor="start">
        {fmt(lo, 4)} °C
      </text>
      <text className="sch-label dim" x={X1} y={ROW_ENDS} textAnchor="end">
        {fmt(hi, 4)} °C
      </text>

      {delta ? (
        <>
          {/* Fark açıklığı — eksenin üstünde ölçü çizgisi */}
          <g className="sch-dim">
            <line x1={xStart} x2={xEnd} y1={AXIS_Y - 22} y2={AXIS_Y - 22} />
            <line x1={xStart} x2={xStart} y1={AXIS_Y - 28} y2={AXIS_Y - 16} />
            <line x1={xEnd} x2={xEnd} y1={AXIS_Y - 28} y2={AXIS_Y - 16} />
          </g>
          <text
            className="sch-label"
            x={centerIn((xStart + xEnd) / 2, textW('ΔT', LABEL_FS))}
            y={ROW_DIM}
            textAnchor="middle"
          >
            ΔT
          </text>

          <circle className="sch-node" cx={xStart} cy={AXIS_Y} r={3.5} />
          <circle className="sch-node" cx={xEnd} cy={AXIS_Y} r={3.5} />

          <text className="sch-label" x={xStartLabel} y={ROW_POINTS} textAnchor="middle">
            {startLabel}
          </text>
          {hasFinal && (
            <text className="sch-label" x={xEndLabel} y={ROW_POINTS} textAnchor="middle">
              {text.end}
            </text>
          )}

          <text className="sch-value" x={dBlockX + eqW} y={ROW_V1} textAnchor="start">
            {dRowC}
          </text>
          <text className="sch-value" x={dBlockX} y={ROW_V2} textAnchor="start">
            {dRowK}
          </text>
          <text className="sch-value" x={dBlockX} y={ROW_V3} textAnchor="start">
            {dRowF}
          </text>

          {hasFinal && (
            <text
              className="sch-value"
              x={centerIn(MID, textW(finalRow, VALUE_FS))}
              y={ROW_V4}
              textAnchor="middle"
            >
              {finalRow}
            </text>
          )}
        </>
      ) : (
        <>
          {live && <circle className="sch-node" cx={px(markC)} cy={AXIS_Y} r={3.5} />}
          {live && (
            <>
              <g className="sch-dim">
                <line x1={px(markC)} x2={px(markC)} y1={AXIS_Y - 18} y2={AXIS_Y - 4} />
              </g>
              <text
                className="sch-label"
                x={centerIn(px(markC), textW('T', LABEL_FS))}
                y={ROW_MARK}
                textAnchor="middle"
              >
                T
              </text>
              <text className="sch-value" x={xTemp} y={ROW_V1} textAnchor="middle">
                {tRowC}
              </text>
              <text className="sch-value" x={xTemp} y={ROW_V2} textAnchor="middle">
                {tRowF}
              </text>
              <text className="sch-value" x={xTemp} y={ROW_V3} textAnchor="middle">
                {tRowK}
              </text>
            </>
          )}
        </>
      )}
    </Schematic>
  )
})

export default TemperatureSchematic
