import { forwardRef } from 'react'
import Schematic, { Ground, Node, CurrentArrow } from '../../../components/Schematic'
import { fmtVolt, fmtAmp } from '../../../lib/num'

// TVS/ESD koruma yerleşimi: konnektörden gelen sinyal hattı, TVS'nin şönt
// bağlantısı ve dönüş yolu endüktansı (L_path) üzerinden dönüş düzlemine
// inişi. REV2 §14.7: TVS konnektöre yakın, dönüş yolu kısa ve geniş olmalı —
// aksi halde L_path üzerindeki ek gerilim (V_L) korunan IC'ye clamp
// geriliminin üzerinde bir overshoot olarak ulaşır. Ölçüler orantılı değildir.
//
// `ref` yalnızca rapor üretimi için Schematic'e iletilir — bkz. report.js.
const TvsEsdSchematic = forwardRef(function TvsEsdSchematic({ r, text }, ref) {
  const live = r.ok
  const hasOvershoot = live && !!r.overshoot

  const connX = 16
  const connY = 56
  const connW = 40
  const connH = 28
  const icX = 254
  const icY = 56
  const icW = 44
  const icH = 28
  const nodeX = 150
  const lineY = 70
  const tvsY = 95
  const tvsH = 26
  const lpathY = 140
  const lpathH = 22
  const groundY = 172
  const planeY = 188
  const planeX1 = 16
  const planeX2 = 324

  return (
    <Schematic ref={ref} viewBox="0 0 340 216" title={text.title} caption={text.caption}>
      {/* Konnektör ve korunan IC gövdeleri */}
      <rect className="sch-part" x={connX} y={connY} width={connW} height={connH} rx={2} />
      <rect className="sch-part" x={icX} y={icY} width={icW} height={icH} rx={2} />
      <text className="sch-label" x={connX + connW / 2} y={connY - 8} textAnchor="middle">
        {text.connector}
      </text>
      <text className="sch-label" x={icX + icW / 2} y={icY - 8} textAnchor="middle">
        {text.protectedIc}
      </text>
      {hasOvershoot && (
        <text className="sch-value" x={icX + icW / 2} y={icY - 20} textAnchor="middle">
          {fmtVolt(r.overshoot.icPeak)}
        </text>
      )}

      {/* Sinyal hattı: konnektör — TVS düğümü — korunan IC, ve düğümden inen
          TVS + L_path + dönüş düzlemi dalı */}
      <g className="sch-wire">
        <line x1={connX + connW} y1={lineY} x2={nodeX} y2={lineY} />
        <line x1={nodeX} y1={lineY} x2={icX} y2={lineY} />
        <line x1={nodeX} y1={lineY} x2={nodeX} y2={tvsY} />
        <line x1={nodeX} y1={tvsY + tvsH} x2={nodeX} y2={lpathY} />
        <line x1={nodeX} y1={lpathY + lpathH} x2={nodeX} y2={groundY} />
        <line x1={connX + connW / 2} y1={connY + connH} x2={connX + connW / 2} y2={planeY + 2} />
        <line x1={icX + icW / 2} y1={icY + icH} x2={icX + icW / 2} y2={planeY + 2} />
      </g>
      <Node x={nodeX} y={lineY} />

      {live && (
        <CurrentArrow x={122} y={lineY} dir="right" len={18} label={fmtAmp(r.solver.current)} />
      )}
      {/* V_clamp bir satır yukarıda: akım oku etiketi de hattın üstünde
          (lineY − 6) duruyor ve uzun akım değerlerinde iki kutu çakışıyordu. */}
      {live && (
        <text className="sch-value" x={nodeX + 4} y={lineY - 22} textAnchor="start">
          {fmtVolt(r.vClamp)}
        </text>
      )}

      {/* TVS şönt elemanı */}
      <rect className="sch-part" x={nodeX - 12} y={tvsY} width={24} height={tvsH} rx={2} />
      {/* Etiketler telin SOLUNDA: düğümden toprağa inen dikey tel nodeX'te
          ve ortalanmış etiketler telin üstüne biniyordu. Sağ kolon V_L
          değerine ayrılmış durumda. */}
      <text className="sch-label" x={nodeX - 16} y={tvsY + 8} textAnchor="end">{text.tvs}</text>

      {/* Dönüş yolu endüktansı L_path — REV2 §14.7 kısa/geniş tutulmalı */}
      <rect className="sch-part" x={nodeX - 12} y={lpathY} width={24} height={lpathH} rx={2} />
      <text className="sch-label" x={nodeX - 16} y={lpathY + 8} textAnchor="end">{text.lpath}</text>
      {hasOvershoot && (
        <text className="sch-value" x={nodeX + 20} y={lpathY + lpathH / 2 + 4} textAnchor="start">
          {fmtVolt(r.overshoot.vL)}
        </text>
      )}

      <Ground x={nodeX} y={groundY} />

      {/* Dönüş düzlemi — geniş ve sürekli */}
      <rect className="sch-copper" x={planeX1} y={planeY} width={planeX2 - planeX1} height={5} />
    </Schematic>
  )
})

export default TvsEsdSchematic
